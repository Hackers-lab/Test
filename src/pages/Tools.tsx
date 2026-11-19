import {
  getAssetDownloadUrl,
  getCachedHubReleases,
  getCachedRepos,
  setCachedRepos,
  subscribeToHubReleases,
  fetchHubReleases,
  matchLatestReleaseForRepo,
  getCachedToolDoc,
  fetchToolDoc,
  DEFAULT_REPOS,
  RELEASES_HUB_REPO,
  type ReleaseItemData,
  type RepoRecord,
} from '../lib/github';
import { useState, useEffect, useMemo } from 'react';
import { Download, PlayCircle, BookOpen, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeedbackWidget } from '../components/FeedbackWidget';
import { maskWbsedcl } from '../lib/censor';

// Exact download count from release asset data
const getDownloadCount = (_idOrName: string, actualCount?: number) => {
  return typeof actualCount === 'number' ? actualCount : 0;
};

function resolveInitialSlug(repos: RepoRecord[], appParam: string): string {
  if (repos.length === 0) return '';
  if (appParam) {
    const match = repos.find(
      (r) =>
        r.repoName.toLowerCase() === appParam.toLowerCase() ||
        r.repoName.toLowerCase().endsWith(`/${appParam.toLowerCase()}`)
    );
    if (match) return match.repoName;
  }
  return repos[0].repoName;
}

export function Tools() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialRepos = useMemo(() => getCachedRepos(), []);
  const [repos, setRepos] = useState<RepoRecord[]>(initialRepos);
  const [selectedRepoSlug, setSelectedRepoSlug] = useState<string>(() =>
    resolveInitialSlug(initialRepos, searchParams.get('app') || '')
  );

  const [hubReleases, setHubReleases] = useState<ReleaseItemData[] | null>(() =>
    getCachedHubReleases()
  );

  const shortName = useMemo(
    () => (selectedRepoSlug.split('/')[1] || selectedRepoSlug || '').toLowerCase(),
    [selectedRepoSlug]
  );

  const [docContent, setDocContent] = useState<string>(() =>
    shortName ? getCachedToolDoc(shortName) || '' : ''
  );
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Real-time Firestore repositories subscription
  useEffect(() => {
    const q = query(collection(db, 'repositories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sorted: RepoRecord[] = [];
      if (snapshot.empty) {
        sorted = DEFAULT_REPOS;
      } else {
        const results: RepoRecord[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as Omit<RepoRecord, 'id'>) });
        });
        sorted = results.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      }

      setRepos(sorted);
      setCachedRepos(sorted);

      setSelectedRepoSlug((prev) => {
        const param = searchParams.get('app') || prev;
        return resolveInitialSlug(sorted, param);
      });
    });
    return () => unsubscribe();
  }, [searchParams]);

  // Real-time SSE + SWR hub releases subscription
  useEffect(() => {
    return subscribeToHubReleases((releases) => {
      setHubReleases(releases);
    });
  }, []);

  // Derive the active release instantaneously from hubReleases (0ms when switching tools!)
  const release = useMemo(
    () => (selectedRepoSlug ? matchLatestReleaseForRepo(hubReleases, selectedRepoSlug) : null),
    [hubReleases, selectedRepoSlug]
  );

  // Instant cached doc + background refresh when switching tools
  useEffect(() => {
    if (!shortName) return;

    let cancelled = false;
    const cached = getCachedToolDoc(shortName);
    if (cached !== null) {
      setDocContent(cached);
      setDocLoading(false);
    } else {
      setDocContent('');
      setDocLoading(true);
    }

    fetchToolDoc(shortName).then((fresh) => {
      if (cancelled) return;
      if (fresh) {
        setDocContent(fresh);
      }
      setDocLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [shortName]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const [freshReleases, freshDoc] = await Promise.all([
        fetchHubReleases(true),
        shortName ? fetchToolDoc(shortName, true) : Promise.resolve(''),
      ]);
      if (freshReleases.length > 0) setHubReleases(freshReleases);
      if (freshDoc) setDocContent(freshDoc);
    } finally {
      setRefreshing(false);
    }
  };

  const readme = useMemo(() => {
    const raw = docContent || release?.body || '';
    return maskWbsedcl(raw);
  }, [docContent, release?.body]);

  const ytLink = useMemo(() => {
    const combined = `${release?.body || ''}\n${docContent || ''}`;
    const ytRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i;
    const match = combined.match(ytRegex);
    return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
  }, [release?.body, docContent]);

  const readmeBaseUrl = `https://raw.githubusercontent.com/${RELEASES_HUB_REPO}/main/docs`;

  const currentRepoTitle = maskWbsedcl(
    repos.find((r) => r.repoName === selectedRepoSlug)?.title ||
      selectedRepoSlug.split('/').pop()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20">
      {/* Sidebar Navigation */}
      <aside className="col-span-1 lg:col-span-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-500 px-2.5 mb-3">
            Available Tools
          </h2>
          <div className="flex flex-col gap-1">
            {repos.map((repo) => {
              const isSelected = selectedRepoSlug === repo.repoName;
              const repoRelease = matchLatestReleaseForRepo(hubReleases, repo.repoName);
              return (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => {
                    setSelectedRepoSlug(repo.repoName);
                    navigate(`/tools?app=${repo.repoName.split('/')[1]}`, { replace: true });
                  }}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <span className="truncate">{maskWbsedcl(repo.title)}</span>
                  {repoRelease && (
                    <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                      {maskWbsedcl(repoRelease.tag_name)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <section className="col-span-1 lg:col-span-9 flex flex-col gap-6 min-h-[500px]">
        <div className="flex flex-col gap-6">
          {/* Release Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-700">
                  {release ? 'Stable Release' : 'Desktop Build'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Desktop Utility</span>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                aria-label="Refresh latest release"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors duration-150 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-700' : ''}`} />
                {refreshing ? 'Syncing' : 'Refresh'}
              </button>
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
              {currentRepoTitle}
            </h1>

            {release ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  {release.assets.slice(0, 1).map((asset) => (
                    <a
                      href={getAssetDownloadUrl(asset.browser_download_url, asset.name)}
                      key={asset.name}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors duration-150 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      Download {maskWbsedcl(asset.name)}
                    </a>
                  ))}
                </div>

                <div className="grid grid-cols-3 border-t border-slate-200 pt-5 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">Version</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                      {maskWbsedcl(release.tag_name)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">Updated</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                      {new Date(release.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">Downloads</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-emerald-700">
                      {release.assets
                        .reduce(
                          (sum, a) =>
                            sum + getDownloadCount(a.name + release.tag_name, a.download_count),
                          0
                        )
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : hubReleases === null ? (
              <div className="grid grid-cols-3 border-t border-slate-200 pt-5 gap-4 animate-pulse">
                <div className="h-9 bg-slate-100 rounded-md" />
                <div className="h-9 bg-slate-100 rounded-md" />
                <div className="h-9 bg-slate-100 rounded-md" />
              </div>
            ) : (
              <div className="p-5 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col gap-1.5">
                <p className="text-slate-800 text-sm font-semibold">
                  No official installers found for this tool.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No public builds have been published for this utility yet. Please check back
                  later or contact support if you need assistance.
                </p>
              </div>
            )}
          </div>

          {/* Video Tutorial */}
          {ytLink && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-blue-700" />
                <h2 className="font-display text-sm font-bold text-slate-900">Video Walkthrough</h2>
              </div>
              <div className="aspect-video w-full bg-slate-950">
                <iframe
                  className="w-full h-full"
                  src={ytLink}
                  title="Tool video walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* README Content */}
          {readme ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
              <h2 className="font-display text-base font-bold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-200">
                <BookOpen className="w-4 h-4 text-blue-700" />
                Documentation
              </h2>
              <div className="markdown-body max-w-none">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={(uri) => {
                    if (
                      !uri.startsWith('http') &&
                      !uri.startsWith('mailto:') &&
                      !uri.startsWith('#')
                    ) {
                      return `${readmeBaseUrl}/${uri.replace(/^\//, '')}`;
                    }
                    return uri;
                  }}
                >
                  {readme}
                </Markdown>
              </div>
            </div>
          ) : docLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-slate-100 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-5/6 bg-slate-100 rounded" />
              <div className="h-4 w-2/3 bg-slate-100 rounded" />
            </div>
          ) : null}

          {/* Feedback & Ratings Widget */}
          {selectedRepoSlug && (
            <FeedbackWidget
              toolId={selectedRepoSlug.replace('/', '_')}
              toolTitle={currentRepoTitle || 'Tool'}
            />
          )}
        </div>
      </section>
    </div>
  );
}
