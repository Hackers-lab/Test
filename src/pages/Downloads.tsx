import { fetchGithubApi, REAL_FALLBACK_RELEASES, getAssetDownloadUrl } from '../lib/github';
import { useState, useEffect } from 'react';
import { Download, AlertCircle, FileBox, ChevronDown, ChevronUp, History, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeedbackWidget } from '../components/FeedbackWidget';
import { maskWbsedcl } from '../lib/censor';

interface Asset {
  name: string;
  size: number;
  browser_download_url: string;
  download_count: number;
}

interface Release {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  assets: Asset[];
  body: string;
}

interface AppReleases {
  title: string;
  repo: string;
  releases: Release[];
}

// Exact download count from release asset data
const getDownloadCount = (_idOrName: string, actualCount?: number) => {
  return typeof actualCount === 'number' ? actualCount : 0;
};

const ReleaseItem = ({
  release,
  isLatest,
  repo,
}: {
  release: Release;
  isLatest: boolean;
  repo: string;
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
                          return `https://raw.githubusercontent.com/${repo}/${release.tag_name}/${uri.replace(/^\//, '')}`;
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
  const [data, setData] = useState<AppReleases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAllReleases() {
      setLoading(true);
      try {
        const q = query(collection(db, 'repositories'));
        const qs = await getDocs(q);
        const apps: { title: string; repo: string }[] = [];
        qs.forEach((doc) => {
          const d = doc.data();
          apps.push({ title: d.title, repo: d.repoName });
        });

        if (apps.length === 0) {
          apps.push(
            { title: 'Spot Image Viewer', repo: 'Hackers-lab/spotimageviewer' },
            { title: 'Estimator', repo: 'Hackers-lab/estimator' }
          );
        }

        let hubReleases: Release[] = [];
        try {
          const hubRes = await fetchGithubApi(`repos/Hackers-lab/releases/releases?per_page=100`);
          if (hubRes.ok) {
            const parsed = await hubRes.json();
            if (Array.isArray(parsed)) {
              hubReleases = parsed;
            }
          }
        } catch {
          // ignore
        }

        const results = await Promise.all(
          apps.map(async (app) => {
            const shortName = (app.repo.split('/')[1] || '').toLowerCase();

            const matchedReleases = hubReleases
              .filter((r) => r.tag_name.toLowerCase().startsWith(shortName + '-'))
              .map((r) => ({
                ...r,
                tag_name: r.tag_name.replace(new RegExp(`^${shortName}-`, 'i'), ''),
              }));

            if (matchedReleases.length > 0) {
              return { ...app, releases: matchedReleases.slice(0, 10) };
            }

            try {
              const res = await fetchGithubApi(`repos/${app.repo}/releases`);
              if (res.ok) {
                const releases = await res.json();
                if (Array.isArray(releases) && releases.length > 0) {
                  return { ...app, releases: releases.slice(0, 10) };
                }
              }

              return { ...app, releases: REAL_FALLBACK_RELEASES[app.repo] || [] };
            } catch {
              return { ...app, releases: REAL_FALLBACK_RELEASES[app.repo] || [] };
            }
          })
        );
        setData(results);
      } catch {
        setError('Failed to fetch downloads from our distribution server.');
      } finally {
        setLoading(false);
      }
    }
    fetchAllReleases();
  }, []);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10 pb-20">
        <div className="border-b border-slate-200 pb-8">
          <p className="text-xs font-semibold text-blue-700 mb-2">Release Archive</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Downloads Center
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Browse official installers and archived versions directly from the WBTools release hub.
          </p>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center p-20">
            <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-red-600 mb-3" />
            <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
              Service Unavailable
            </h3>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            {data.map((app) => (
              <section key={app.title} className="flex flex-col">
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
                      <ReleaseItem
                        key={release.id}
                        release={release}
                        isLatest={rIdx === 0}
                        repo={app.repo}
                      />
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
        )}
      </div>
    </PageTransition>
  );
}
