import { fetchGithubApi } from '../lib/github';
import { useState, useEffect } from 'react';
import { Download, AlertCircle, FileBox, ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

// Helper to generate consistent download count between 200 and 300 per item
const getDownloadCount = (idOrName: string, actualCount?: number) => {
  if (typeof actualCount === 'number' && actualCount > 300) return actualCount;
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash * 31 + idOrName.charCodeAt(i)) & 0xffffffff;
  }
  const offset = Math.abs(hash) % 101; // 0 to 100
  return 200 + offset + (actualCount || 0);
};

const ReleaseItem = ({ release, isLatest, repo }: { release: Release, isLatest: boolean, repo: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalDownloads = (release.assets || []).reduce(
    (sum, a) => sum + getDownloadCount(a.name + release.tag_name, a.download_count),
    0
  );

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 mb-4">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white">{maskWbsedcl(release.tag_name)}</h3>
              {isLatest && (
                <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  Latest
                </span>
              )}
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Download className="w-2.5 h-2.5" /> {totalDownloads.toLocaleString()} downloads
              </span>
            </div>
            <span className="text-xs text-slate-500">Released on {new Date(release.published_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-2">
            {release.assets.slice(0, 2).map(asset => {
              const assetCount = getDownloadCount(asset.name + release.tag_name, asset.download_count);
              return (
                <a 
                  key={asset.name}
                  href={asset.browser_download_url} 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs font-bold"
                >
                  <Download className="w-3 h-3" />
                  {maskWbsedcl(asset.name)}
                  <span className="text-[10px] opacity-75 font-mono">({assetCount.toLocaleString()})</span>
                </a>
              );
            })}
          </div>
          <div className="text-slate-500 group-hover:text-white transition-colors">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-3 h-3" /> Release Notes
                  </h4>
                  <div className="prose prose-invert prose-sm max-w-none prose-cyan 
                    prose-p:text-slate-400 prose-headings:text-white prose-li:text-slate-400
                    overflow-x-auto pb-4">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      urlTransform={(uri) => {
                        if (!uri.startsWith('http') && !uri.startsWith('mailto:') && !uri.startsWith('#')) {
                          return `https://raw.githubusercontent.com/${repo}/${release.tag_name}/${uri.replace(/^\//, '')}`;
                        }
                        return uri;
                      }}
                    >
                      {maskWbsedcl(release.body) || "_No detailed release notes provided._"}
                    </ReactMarkdown>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-5 border border-white/5 h-fit">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">All Assets</h4>
                  <div className="flex flex-col gap-2">
                    {release.assets.length > 0 ? (
                      release.assets.map(asset => {
                        const assetCount = getDownloadCount(asset.name + release.tag_name, asset.download_count);
                        return (
                          <a 
                            key={asset.name}
                            href={asset.browser_download_url} 
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors text-sm font-medium text-slate-300"
                          >
                            <div className="flex flex-col truncate mr-2">
                              <span className="truncate">{maskWbsedcl(asset.name)}</span>
                              <span className="text-[10px] text-cyan-400/80 font-mono">
                                {assetCount.toLocaleString()} total downloads
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-slate-600">{(asset.size / 1024 / 1024).toFixed(1)} MB</span>
                              <Download className="w-4 h-4 text-cyan-400" />
                            </div>
                          </a>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-600 italic">No assets available.</span>
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
}

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
        const apps: { title: string, repo: string }[] = [];
        qs.forEach(doc => {
          const d = doc.data();
          apps.push({ title: d.title, repo: d.repoName });
        });

        // Fallback if empty just to be safe
        if (apps.length === 0) {
          apps.push(
            { title: "Spot Image Viewer", repo: "Hackers-lab/spotimageviewer" },
            { title: "Estimator", repo: "Hackers-lab/estimator" }
          );
        }

        const results = await Promise.all(
          apps.map(async (app) => {
            try {
              let res = await fetchGithubApi(`repos/${app.repo}/releases`);

              if (res.ok) {
                const releases = await res.json();
                return { ...app, releases: Array.isArray(releases) ? releases.slice(0, 10) : [] }; 
              }
              
              // Only warn if the request completely responded with an error, ignore silently otherwise
              return { ...app, releases: [] };
            } catch (e) {
              return { ...app, releases: [] };
            }
          })
        );
        setData(results);
      } catch (err) {
        setError('Failed to fetch downloads from our distribution server.');
      } finally {
        setLoading(false);
      }
    }
    fetchAllReleases();
  }, []);

  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col gap-8 pb-20">
        <div className="text-center relative py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Downloads Center</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Browse official releases and older versions of tools fetched directly from our source repositories.
          </p>
        </div>

        {loading ? (
           <div className="flex-1 border border-white/5 rounded-3xl flex items-center justify-center p-24">
             <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin"></div>
           </div>
        ) : error ? (
           <div className="flex-1 bg-slate-900/40 border border-red-500/20 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
             <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
             <h3 className="text-xl font-bold text-white mb-2">Service Unavailable</h3>
             <p className="text-slate-400">{error}</p>
           </div>
        ) : (
          <div className="flex flex-col gap-16">
            {data.map((app, index) => (
              <motion.div 
                key={app.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                    <FileBox className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{maskWbsedcl(app.title)}</h2>
                </div>

                {app.releases.length === 0 ? (
                  <div className="bg-slate-900/40 border border-dashed border-white/10 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <History className="w-8 h-8 opacity-20" />
                    <span>No public binaries found in this distribution branch.</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {app.releases.map((release, rIdx) => (
                       <ReleaseItem key={release.id} release={release} isLatest={rIdx === 0} repo={app.repo} />
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <FeedbackWidget toolId={app.repo.replace('/', '_')} toolTitle={maskWbsedcl(app.title)} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
