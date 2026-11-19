import {
  getAssetDownloadUrl,
  getCachedHubReleases,
  getCachedRepos,
  setCachedRepos,
  subscribeToHubReleases,
  fetchHubReleases,
  matchReleasesForRepo,
  DEFAULT_REPOS,
  RELEASES_HUB_REPO,
  type ReleaseItemData,
  type RepoRecord,
} from '../lib/github';
import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  FileBox,
  ChevronDown,
  ChevronUp,
  History,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeedbackWidget } from '../components/FeedbackWidget';
import { maskWbsedcl } from '../lib/censor';

// Exact download count from release asset data
const getDownloadCount = (_idOrName: string, actualCount?: number) => {
  return typeof actualCount === 'number' ? actualCount : 0;
};

const ReleaseItem = ({
  release,
  isLatest,
}: {
  release: ReleaseItemData;
  isLatest: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalDownloads = (release.assets || []).reduce(
    (sum, a) => sum + getDownloadCount(a.name + release.tag_name, a.download_count),
    0
  );

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden transition-colors duration-150 mb-3">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="p-5 flex items-center justify-between gap-4 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
      >
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-display text-lg font-bold text-slate-900 font-mono tabular-nums">
              {maskWbsedcl(release.tag_name)}
            </h3>
            {isLatest && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-emerald-700">Latest Release</span>
              </>
            )}
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {totalDownloads.toLocaleString()} downloads
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Released {new Date(release.published_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            {release.assets.slice(0, 2).map((asset) => {
              const assetCount = getDownloadCount(
                asset.name + release.tag_name,
                asset.download_count
              );
              return (
                <a
                  key={asset.name}
                  href={getAssetDownloadUrl(asset.browser_download_url, asset.name)}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 transition-colors duration-150 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="max-w-[200px] truncate">{maskWbsedcl(asset.name)}</span>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    ({assetCount.toLocaleString()})
                  </span>
                </a>
              );
            })}
          </div>
          <div className="text-slate-400 group-hover:text-slate-700 transition-colors">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200 bg-slate-50 overflow-hidden"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Release Notes
                  </h4>
                  <div className="markdown-body text-sm overflow-x-auto pb-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      urlTransform={(uri) => {
                        if (
                          !uri.startsWith('http') &&
                          !uri.startsWith('mailto:') &&
                          !uri.startsWith('#')
                        ) {
                          return `https://raw.githubusercontent.com/${RELEASES_HUB_REPO}/main/docs/${uri.replace(/^\//, '')}`;
                        }
                        return uri;
                      }}
                    >
                      {maskWbsedcl(release.body) || '_No detailed release notes provided._'}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-slate-200 h-fit">
                  <h4 className="text-xs font-semibold text-slate-500 mb-3">Release Assets</h4>
                  <div className="flex flex-col gap-2">
                    {release.assets.length > 0 ? (
                      release.assets.map((asset) => {
                        const assetCount = getDownloadCount(
                          asset.name + release.tag_name,
                          asset.download_count
                        );
                        return (
                          <a
                            key={asset.name}
                            href={getAssetDownloadUrl(asset.browser_download_url, asset.name)}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150 text-xs font-medium text-slate-800"
                          >
                            <div className="flex flex-col truncate mr-2">
                              <span className="truncate font-semibold">{maskWbsedcl(asset.name)}</span>
                              <span className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                                {assetCount.toLocaleString()} downloads
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                {(asset.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                              <Download className="w-4 h-4 text-blue-700" />
                            </div>
                          </a>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500">No assets available.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function Downloads() {
  const [repos, setRepos] = useState<RepoRecord[]>(() => getCachedRepos());
  const [hubReleases, setHubReleases] = useState<ReleaseItemData[] | null>(() =>
    getCachedHubReleases()
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubReleases = subscribeToHubReleases((releases) => {
      setHubReleases(releases);
    });

    const q = query(collection(db, 'repositories'));
    const unsubRepos = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setRepos(DEFAULT_REPOS);
        setCachedRepos(DEFAULT_REPOS);
      } else {
        const results: RepoRecord[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as Omit<RepoRecord, 'id'>) });
        });
        const sorted = results.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setRepos(sorted);
        setCachedRepos(sorted);
      }
    });

    return () => {
      unsubReleases();
      unsubRepos();
    };
  }, []);

  const appReleasesList = useMemo(
    () =>
      repos.map((app) => ({
        title: app.title,
        repo: app.repoName,
        releases: matchReleasesForRepo(hubReleases, app.repoName, 10),
      })),
    [repos, hubReleases]
  );

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchHubReleases(true);
      if (fresh.length > 0) setHubReleases(fresh);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-8">
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-2">Release Archive</p>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              Downloads Center
            </h1>
            <p className="text-base text-slate-600 max-w-2xl">
              Browse official installers and archived versions directly from the WBTools release hub.
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors duration-150 disabled:opacity-60 whitespace-nowrap shrink-0 self-start sm:self-end"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-700' : ''}`} />
            {refreshing ? 'Syncing' : 'Refresh Releases'}
          </button>
        </div>

        <div className="flex flex-col gap-14">
          {appReleasesList.map((app) => (
            <section key={app.repo} className="flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <FileBox className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                      {maskWbsedcl(app.title)}
                    </h2>
                    <p className="text-xs text-slate-500">Official Desktop Release</p>
                  </div>
                </div>
                <Link
                  to={`/tools?app=${app.repo.split('/')[1]}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  View Documentation
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {app.releases.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 flex flex-col items-center gap-2">
                  <History className="w-6 h-6 text-slate-400" />
                  <span className="text-sm">
                    No public binaries found in this distribution branch.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col">
                  {app.releases.map((release, rIdx) => (
                    <ReleaseItem key={release.id} release={release} isLatest={rIdx === 0} />
                  ))}
                </div>
              )}

              <div className="mt-4">
                <FeedbackWidget
                  toolId={app.repo.replace('/', '_')}
                  toolTitle={maskWbsedcl(app.title)}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
