export const RELEASES_HUB_REPO = 'Hackers-lab/releases';

export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  download_url?: string;
  download_count: number;
}

export interface ReleaseItemData {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  assets: ReleaseAsset[];
}

export interface RepoRecord {
  id: string;
  repoName: string;
  title: string;
  description?: string;
  createdAt?: number;
  webAppUrl?: string;
}

export const DEFAULT_REPOS: RepoRecord[] = [
  {
    id: 'hackers-lab_spotimageviewer',
    repoName: 'Hackers-lab/spotimageviewer',
    title: 'Spot Image Viewer',
    description:
      'Search meter images within a fraction of a second using consumer ID, name, meter number, or mobile number. Includes utilities like a theft bill calculator.',
    createdAt: 1,
  },
  {
    id: 'hackers-lab_estimator',
    repoName: 'Hackers-lab/estimator',
    title: 'Estimator',
    description:
      'Draw electrical lines on a canvas and automatically generate estimates. Features LT/HT lines, DTR structures, and allows exporting drawings and estimates to PDF and Excel.',
    createdAt: 2,
    webAppUrl: '/estimator/',
  },
];

// Offline fallback releases pointing to the central releases hub
export const REAL_FALLBACK_RELEASES: Record<string, ReleaseItemData[]> = {
  'Hackers-lab/spotimageviewer': [
    {
      id: 2056,
      name: 'Spot Image Viewer v20.56',
      tag_name: 'v20.56',
      published_at: '2026-03-20T00:00:00Z',
      body: '### Spot Image Viewer v20.56\n- High-speed consumer photo query engine & image caching.\n- Direct consumer ID, meter, phone search with offline support.\n- Bill calculation and inspection studio utilities.',
      assets: [
        {
          name: 'SpotImageViewer_Setup_v20.56.exe',
          size: 52 * 1024 * 1024,
          browser_download_url:
            'https://github.com/Hackers-lab/releases/releases/download/spotimageviewer-v20.56/SpotImageViewer_Setup_v20.56.exe',
          download_count: 0,
        },
      ],
    },
  ],
  'Hackers-lab/estimator': [
    {
      id: 940,
      name: 'Estimator v9.4',
      tag_name: 'v9.4',
      published_at: '2026-03-18T00:00:00Z',
      body: '### Estimator Suite v9.4\n- Electrical distribution canvas tool for LT/HT line rendering.\n- Automatic bill of materials & export to PDF/Excel format.\n- DTR structure & hardware calculation module.',
      assets: [
        {
          name: 'ERP_Estimate_Setup_v9.4.exe',
          size: 56 * 1024 * 1024,
          browser_download_url:
            'https://github.com/Hackers-lab/releases/releases/download/estimator-v9.4/ERP_Estimate_Setup_v9.4.exe',
          download_count: 0,
        },
      ],
    },
  ],
};

const HUB_RELEASES_STORAGE_KEY = 'wbtools_hub_releases_v2';
const REPOS_STORAGE_KEY = 'wbtools_repos_v2';
const DOC_STORAGE_PREFIX = 'wbtools_doc_v2_';

function hasBackendProxy(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('run.app'))
  );
}

/**
 * Returns a same-origin download URL when running with the WBTools backend so
 * external repository URLs are not exposed in the UI.
 */
export function getAssetDownloadUrl(rawUrl: string, fileName?: string): string {
  if (!rawUrl) return '#';
  if (hasBackendProxy()) {
    const params = new URLSearchParams({ url: rawUrl });
    if (fileName) params.set('name', fileName);
    return `/api/download?${params.toString()}`;
  }
  return rawUrl;
}

// --- Instant Repos Cache (avoids waiting on Firestore cold start) ---
let memoryRepos: RepoRecord[] | null = null;

export function getCachedRepos(): RepoRecord[] {
  if (memoryRepos && memoryRepos.length > 0) return memoryRepos;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(REPOS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryRepos = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_REPOS;
}

export function setCachedRepos(repos: RepoRecord[]) {
  if (!Array.isArray(repos) || repos.length === 0) return;
  memoryRepos = repos;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(repos));
    }
  } catch {
    // ignore
  }
}

// --- Instant Memory + localStorage + SSE Real-Time Hub Releases Store ---
let memoryHubReleases: ReleaseItemData[] | null = null;
let hubFetchPromise: Promise<ReleaseItemData[]> | null = null;
let sseSource: EventSource | null = null;
const releaseListeners = new Set<(releases: ReleaseItemData[]) => void>();

export function getCachedHubReleases(): ReleaseItemData[] | null {
  if (memoryHubReleases) return memoryHubReleases;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(HUB_RELEASES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.releases) && parsed.releases.length > 0) {
          memoryHubReleases = parsed.releases;
          return memoryHubReleases;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function updateHubReleasesState(releases: ReleaseItemData[]) {
  if (!Array.isArray(releases) || releases.length === 0) return;
  memoryHubReleases = releases;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(
        HUB_RELEASES_STORAGE_KEY,
        JSON.stringify({ releases, timestamp: Date.now() })
      );
    }
  } catch {
    // ignore
  }
  for (const listener of releaseListeners) {
    listener(releases);
  }
}

function ensureSSEConnection() {
  if (typeof window === 'undefined' || !hasBackendProxy() || sseSource) return;
  try {
    const es = new EventSource('/api/releases/stream');
    sseSource = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (Array.isArray(payload?.releases) && payload.releases.length > 0) {
          updateHubReleasesState(payload.releases);
        }
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      es.close();
      if (sseSource === es) sseSource = null;
      // Reconnect quietly after 10s if listeners are still active
      if (releaseListeners.size > 0) {
        setTimeout(() => {
          if (releaseListeners.size > 0) ensureSSEConnection();
        }, 10_000);
      }
    };
  } catch {
    // ignore SSE unsupported environments
  }
}

/**
 * Fetches the centralized releases list with request deduplication.
 * Uses the ultra-fast server RAM endpoint (/api/releases) when available.
 */
export async function fetchHubReleases(force = false): Promise<ReleaseItemData[]> {
  if (!force && hubFetchPromise) return hubFetchPromise;

  hubFetchPromise = (async () => {
    try {
      if (hasBackendProxy()) {
        const res = await fetch(force ? '/api/releases?refresh=1' : '/api/releases');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.releases) && json.releases.length > 0) {
            updateHubReleasesState(json.releases);
            return json.releases;
          }
        }
      }

      // Direct public releases hub fallback for static hosts
      const res = await fetch(
        `https://api.github.com/repos/${RELEASES_HUB_REPO}/releases?per_page=100`,
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const slimmed: ReleaseItemData[] = data.map((r: any) => ({
            id: r.id,
            name: r.name || r.tag_name || '',
            tag_name: r.tag_name || '',
            published_at: r.published_at || r.created_at || '',
            body: r.body || '',
            assets: Array.isArray(r.assets)
              ? r.assets.map((a: any) => ({
                  name: a.name || '',
                  size: typeof a.size === 'number' ? a.size : 0,
                  browser_download_url: a.browser_download_url || '',
                  download_count: typeof a.download_count === 'number' ? a.download_count : 0,
                }))
              : [],
          }));
          updateHubReleasesState(slimmed);
          return slimmed;
        }
      }
    } catch {
      // keep existing cache on transient network error
    } finally {
      hubFetchPromise = null;
    }
    return memoryHubReleases || [];
  })();

  return hubFetchPromise;
}

/**
 * Subscribe to real-time release updates (instant cache + SWR fetch + live SSE push).
 */
export function subscribeToHubReleases(
  listener: (releases: ReleaseItemData[]) => void
): () => void {
  releaseListeners.add(listener);

  const cached = getCachedHubReleases();
  if (cached) {
    listener(cached);
  }

  ensureSSEConnection();
  void fetchHubReleases(false);

  return () => {
    releaseListeners.delete(listener);
  };
}

/**
 * Warms up releases and SSE connection immediately when the app boots.
 */
export function preloadHubData() {
  ensureSSEConnection();
  void fetchHubReleases(false);
}

/**
 * Synchronously match all releases for a given repository slug from the hub list.
 */
export function matchReleasesForRepo(
  hubReleases: ReleaseItemData[] | null,
  repoName: string,
  limit = 10
): ReleaseItemData[] {
  const shortName = (repoName.split('/')[1] || repoName || '').toLowerCase();
  if (hubReleases && hubReleases.length > 0 && shortName) {
    const matched = hubReleases
      .filter((r) => r.tag_name.toLowerCase().startsWith(shortName + '-'))
      .map((r) => ({
        ...r,
        tag_name: r.tag_name.replace(new RegExp(`^${shortName}-`, 'i'), ''),
      }));
    if (matched.length > 0) {
      return matched.slice(0, limit);
    }
  }
  return REAL_FALLBACK_RELEASES[repoName]?.slice(0, limit) || [];
}

export function matchLatestReleaseForRepo(
  hubReleases: ReleaseItemData[] | null,
  repoName: string
): ReleaseItemData | null {
  const all = matchReleasesForRepo(hubReleases, repoName, 1);
  return all[0] || null;
}

// --- Instant Memory + localStorage Docs Cache ---
const memoryDocs = new Map<string, string>();
const docInFlight = new Map<string, Promise<string>>();

export function getCachedToolDoc(shortName: string): string | null {
  const key = shortName.toLowerCase();
  if (memoryDocs.has(key)) return memoryDocs.get(key) || null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(DOC_STORAGE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.content === 'string') {
          memoryDocs.set(key, parsed.content);
          return parsed.content;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function fetchToolDoc(shortName: string, force = false): Promise<string> {
  const key = shortName.toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  if (!key) return '';

  if (!force && docInFlight.has(key)) {
    return docInFlight.get(key)!;
  }

  const promise = (async () => {
    try {
      let content = '';
      if (hasBackendProxy()) {
        const res = await fetch(force ? `/api/docs/${key}?refresh=1` : `/api/docs/${key}`);
        if (res.ok) {
          const json = await res.json();
          content = typeof json?.content === 'string' ? json.content : '';
        }
      } else {
        const res = await fetch(
          `https://raw.githubusercontent.com/${RELEASES_HUB_REPO}/main/docs/${key}.md`
        );
        if (res.ok) {
          content = await res.text();
        }
      }

      if (content) {
        memoryDocs.set(key, content);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(
              DOC_STORAGE_PREFIX + key,
              JSON.stringify({ content, timestamp: Date.now() })
            );
          }
        } catch {
          // ignore
        }
      }
      return content;
    } catch {
      return memoryDocs.get(key) || '';
    } finally {
      docInFlight.delete(key);
    }
  })();

  docInFlight.set(key, promise);
  return promise;
}
