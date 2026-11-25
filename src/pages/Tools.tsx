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
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  PlayCircle,
  BookOpen,
  RefreshCw,
  ExternalLink,
  Tag,
  Calendar,
  ArrowDownToLine,
} from 'lucide-react';
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

  const currentRepo = repos.find((r) => r.repoName === selectedRepoSlug);
  const currentRepoTitle = maskWbsedcl(
    currentRepo?.title || selectedRepoSlug.split('/').pop()
  );
  const currentRepoDesc = currentRepo?.description ? maskWbsedcl(currentRepo.description) : '';

  const totalDownloads = release
    ? release.assets.reduce(
        (sum, a) => sum + getDownloadCount(a.name + release.tag_name, a.download_count),
        0
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-16">
      {/* Sidebar Navigation */}
      <aside className="col-span-1 lg:col-span-3 lg:sticky lg:top-20">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between px-2 mb-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Available Tools
            </h2>
            <span className="text-[11px] font-mono font-medium text-slate-400">
              {repos.length}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {repos.map((repo) => {
              const isSelected = selectedRepoSlug === repo.repoName;
              const repoRelease = matchLatestReleaseForRepo(hubReleases, repo.repoName);
              return (
                <motion.button
                  key={repo.id}
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => {
                    setSelectedRepoSlug(repo.repoName);
                    navigate(`/tools?app=${repo.repoName.split('/')[1]}`, { replace: true });
                  }}
                  className={`relative text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-tool-pill"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                      className="absolute inset-0 rounded-lg bg-blue-50/95 border border-blue-200/80 shadow-2xs -z-0"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                        isSelected ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                    <span className="truncate">{maskWbsedcl(repo.title)}</span>
                  </span>
                  {repoRelease && (
                    <span
                      className={`relative z-10 font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-blue-100/90 text-blue-700 font-semibold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {maskWbsedcl(repoRelease.tag_name)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <section className="col-span-1 lg:col-span-9 flex flex-col gap-5 min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedRepoSlug || 'empty'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col gap-5"
          >
          {/* Compact Release Header */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                    {release ? 'Stable Release' : 'Desktop Utility'}
                  </span>
                  {release && (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {maskWbsedcl(release.tag_name)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(release.published_at).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700">
                        <ArrowDownToLine className="w-3 h-3" />
                        {totalDownloads.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>

                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                  {currentRepoTitle}
                </h1>

                {currentRepoDesc && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {currentRepoDesc}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {release?.assets.slice(0, 1).map((asset) => (
                  <a
                    href={getAssetDownloadUrl(asset.browser_download_url, asset.name)}
                    key={asset.name}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download {maskWbsedcl(asset.name)}
                  </a>
                ))}

                {currentRepo?.webAppUrl && (
                  <a
                    href={currentRepo.webAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    Open Web App
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  title="Refresh latest release"
                  aria-label="Refresh latest release"
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors duration-150 disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-700' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Syncing' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {!release && hubReleases === null && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 animate-pulse">
                <div className="h-6 w-24 bg-slate-100 rounded-md" />
                <div className="h-6 w-28 bg-slate-100 rounded-md" />
                <div className="h-6 w-20 bg-slate-100 rounded-md" />
              </div>
            )}

            {!release && hubReleases !== null && (
              <div className="mt-3 px-3.5 py-2.5 border border-dashed border-slate-300 rounded-lg bg-slate-50/80 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">No public installers found yet.</span>{' '}
                  Check back later or contact support if you need assistance.
                </p>
              </div>
            )}
          </div>

          {/* Video Tutorial */}
          {ytLink && (
            <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2">
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
            <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-700" />
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Documentation
                </h2>
              </div>
              <div className="p-5 md:p-6 markdown-body max-w-none">
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
            <div className="bg-white border border-slate-200/90 rounded-xl p-6 space-y-3 animate-pulse shadow-xs">
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
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
