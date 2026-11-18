// Cache duration in milliseconds (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

export const RELEASES_HUB_REPO = 'Hackers-lab/releases';

// Verified fallback releases pointing to the central releases hub
export const REAL_FALLBACK_RELEASES: Record<string, any[]> = {
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
    {
      id: 2055,
      name: 'Spot Image Viewer v20.55',
      tag_name: 'v20.55',
      published_at: '2026-03-12T00:00:00Z',
      body: '### Spot Image Viewer v20.55\n- Performance improvements and UI responsiveness enhancements.',
      assets: [
        {
          name: 'SpotImageViewer_Setup_v20.55.exe',
          size: 51 * 1024 * 1024,
          browser_download_url:
            'https://github.com/Hackers-lab/releases/releases/download/spotimageviewer-v20.55/SpotImageViewer_Setup_v20.55.exe',
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
    {
      id: 930,
      name: 'Estimator v9.3',
      tag_name: 'v9.3',
      published_at: '2026-03-05T00:00:00Z',
      body: '### Estimator Suite v9.3\n- Updated schedule of rates & pole specification presets.',
      assets: [
        {
          name: 'ERP_Estimate_Setup_v9.3.exe',
          size: 55 * 1024 * 1024,
          browser_download_url:
            'https://github.com/Hackers-lab/releases/releases/download/estimator-v9.3/ERP_Estimate_Setup_v9.3.exe',
          download_count: 0,
        },
      ],
    },
  ],
};

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

/**
 * Fetch release metadata with client-side localStorage caching.
 * Private repositories are only queried via the server-side proxy so
 * private repo names are never queried directly from the browser.
 */
export const fetchGithubApi = async (
  path: string,
  options: { allowDirectBrowserFallback?: boolean } = {}
): Promise<Response> => {
  const isHubPath = path.startsWith(`repos/${RELEASES_HUB_REPO}/`);
  const allowDirect = options.allowDirectBrowserFallback ?? isHubPath;

  const cacheKey = `gh_cache_${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && data) {
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }

  if (hasBackendProxy()) {
    try {
      const res = await fetch(`/api/github/${path}`);
      if (res.ok) {
        const data = await res.json();
        saveToCache(cacheKey, data);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // ignore
    }
  }

  if (!allowDirect) {
    return new Response(JSON.stringify({ error: 'Private repository' }), { status: 404 });
  }

  try {
    const res = await fetch(`https://api.github.com/${path}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.message && !data.error) {
        saveToCache(cacheKey, data);
      }
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return res;
  } catch {
    return new Response(JSON.stringify({ error: 'Network error' }), { status: 503 });
  }
};

function saveToCache(key: string, data: any) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && data) {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    }
  } catch {
    // Ignore storage quota errors
  }
}
