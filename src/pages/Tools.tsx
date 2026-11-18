import { fetchGithubApi, REAL_FALLBACK_RELEASES, getAssetDownloadUrl } from '../lib/github';
import { useState, useEffect } from 'react';
import { Download, PlayCircle, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeedbackWidget } from '../components/FeedbackWidget';
import { maskWbsedcl } from '../lib/censor';

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  download_count?: number;
}

interface Release {
  name: string;
  tag_name: string;
  published_at: string;
  assets: ReleaseAsset[];
  body: string;
}

// Exact download count from release asset data
const getDownloadCount = (_idOrName: string, actualCount?: number) => {
  return typeof actualCount === 'number' ? actualCount : 0;
};

export function Tools() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(true);

  const initApp = searchParams.get('app') || '';
  const [selectedRepoSlug, setSelectedRepoSlug] = useState<string>(initApp);

  const [release, setRelease] = useState<Release | null>(null);
  const [readme, setReadme] = useState<string>('');
  const [readmeBaseUrl, setReadmeBaseUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ytLink, setYtLink] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'repositories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sorted: any[] = [];
      if (snapshot.empty) {
        sorted = [
          {
            id: 'hackers-lab_spotimageviewer',
            repoName: 'Hackers-lab/spotimageviewer',
            title: 'Spot Image Viewer',
          },
          {
            id: 'hackers-lab_estimator',
            repoName: 'Hackers-lab/estimator',
            title: 'Estimator',
          },
        ];
      } else {
        const results: any[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        sorted = results.sort((a, b) => a.createdAt - b.createdAt);
      }

      setRepos(sorted);
      setReposLoading(false);

      if (!selectedRepoSlug && sorted.length > 0) {
        setSelectedRepoSlug(sorted[0].repoName);
      } else if (selectedRepoSlug && sorted.length > 0) {
        const matching = sorted.find(
          (r) => r.repoName === selectedRepoSlug || r.repoName.endsWith(`/${selectedRepoSlug}`)
        );
        if (matching) {
          setSelectedRepoSlug(matching.repoName);
        } else {
          setSelectedRepoSlug(sorted[0].repoName);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!selectedRepoSlug || !selectedRepoSlug.includes('/')) return;

      setLoading(true);
      setError('');
      setYtLink(null);

      try {
        const repoName = selectedRepoSlug;
        const shortName = (repoName.split('/')[1] || '').toLowerCase();

        let releaseBody = '';
        const fallbackRelease = REAL_FALLBACK_RELEASES[repoName]?.[0] || null;

        try {
          const hubRes = await fetchGithubApi(`repos/Hackers-lab/releases/releases?per_page=100`);
          let matchedRelease = null;
          if (hubRes.ok) {
            const allHub = await hubRes.json();
            if (Array.isArray(allHub)) {
              matchedRelease = allHub.find((r) =>
                r.tag_name.toLowerCase().startsWith(shortName + '-')
              );
            }
          }

          if (matchedRelease) {
            setRelease({
              ...matchedRelease,
              tag_name: matchedRelease.tag_name.replace(new RegExp(`^${shortName}-`, 'i'), ''),
            });
            releaseBody = matchedRelease.body || '';
          } else {
            const relRes = await fetchGithubApi(`repos/${repoName}/releases/latest`);
            if (relRes.ok) {
              const relData = await relRes.json();
              if (relData && relData.tag_name) {
                setRelease(relData);
                releaseBody = relData.body || '';
              } else {
                setRelease(fallbackRelease);
                releaseBody = fallbackRelease?.body || '';
              }
            } else {
              const listRes = await fetchGithubApi(`repos/${repoName}/releases`);
              if (listRes.ok) {
                const listData = await listRes.json();
                if (Array.isArray(listData) && listData.length > 0) {
                  setRelease(listData[0]);
                  releaseBody = listData[0].body || '';
                } else {
                  setRelease(fallbackRelease);
                  releaseBody = fallbackRelease?.body || '';
                }
              } else {
                setRelease(fallbackRelease);
                releaseBody = fallbackRelease?.body || '';
              }
            }
          }
        } catch {
          setRelease(fallbackRelease);
          releaseBody = fallbackRelease?.body || '';
        }

        let readmeText = '';
        const baseReadmeUrl = `https://raw.githubusercontent.com/Hackers-lab/releases/main/docs`;
        try {
          const docRes = await fetch(
            `https://raw.githubusercontent.com/Hackers-lab/releases/main/docs/${shortName}.md`
          );
          if (docRes.ok) {
            readmeText = await docRes.text();
          } else {
            const readmeMeta = await fetchGithubApi(`repos/${repoName}/readme`);
            if (readmeMeta.ok) {
              const metaJson = await readmeMeta.json();
              if (metaJson?.content) {
                readmeText = atob(metaJson.content.replace(/\n/g, ''));
              }
            }
          }
        } catch {
          // Silently ignore
        }
        if (!readmeText && releaseBody) {
          readmeText = releaseBody;
        }
        setReadme(maskWbsedcl(readmeText));
        setReadmeBaseUrl(baseReadmeUrl);

        const combinedText = releaseBody + '\n' + readmeText;
        const ytRegex =
          /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i;
        const match = combinedText.match(ytRegex);

        if (match && match[1]) {
          setYtLink(`https://www.youtube.com/embed/${match[1]}`);
        }
      } catch {
        setError('Failed to fetch data from source distribution.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedRepoSlug]);

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
          {reposLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-5 h-5 text-blue-700 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {repos.map((repo) => {
                const isSelected = selectedRepoSlug === repo.repoName;
                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => {
                      setSelectedRepoSlug(repo.repoName);
                      navigate(`/tools?app=${repo.repoName.split('/')[1]}`, { replace: true });
                    }}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 truncate ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    {maskWbsedcl(repo.title)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <section className="col-span-1 lg:col-span-9 flex flex-col gap-6 min-h-[500px]">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center p-16">
            <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-red-600 mb-3" />
            <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
              Distribution Unavailable
            </h3>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* Release Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="font-semibold text-blue-700">
                  {release ? 'Stable Release' : 'Development Build'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Desktop Utility</span>
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
            {readme && (
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
            )}

            {/* Feedback & Ratings Widget */}
            <FeedbackWidget
              toolId={selectedRepoSlug.replace('/', '_')}
              toolTitle={currentRepoTitle || 'Tool'}
            />
          </motion.div>
        )}
      </section>
    </div>
  );
}
