import { useState, useEffect } from 'react';
import { Download, AlertCircle, FileBox, ChevronDown, ChevronUp, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const ReleaseItem = ({ release, isLatest, repo }: { release: Release, isLatest: boolean, repo: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 mb-4">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white">{release.tag_name}</h3>
              {isLatest && (
                <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  Latest
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">Released on {new Date(release.published_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-2">
            {release.assets.slice(0, 2).map(asset => (
              <a 
                key={asset.name}
                href={asset.browser_download_url}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs font-bold"
              >
                <Download className="w-3 h-3" />
                {asset.name}
              </a>
            ))}
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
                      {release.body || "_No detailed release notes provided._"}
                    </ReactMarkdown>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-5 border border-white/5 h-fit">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">All Assets</h4>
                  <div className="flex flex-col gap-2">
                    {release.assets.length > 0 ? (
                      release.assets.map(asset => (
                        <a 
                          key={asset.name}
                          href={asset.browser_download_url} 
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors text-sm font-medium text-slate-300"
                        >
                          <span className="truncate mr-2">{asset.name}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-slate-600">{(asset.size / 1024 / 1024).toFixed(1)} MB</span>
                            <Download className="w-4 h-4" />
                          </div>
                        </a>
                      ))
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
        const apps = [
          { title: "Spot Image Viewer", repo: "Hackers-lab/spotimageviewer" },
          { title: "Estimator", repo: "Hackers-lab/estimator" }
        ];

        const results = await Promise.all(
          apps.map(async (app) => {
            try {
              let res = await fetch(`/api/github/repos/${app.repo}/releases`);
              
              if (res.status === 404 || res.status === 403 || res.status === 500) {
                 res = await fetch(`https://api.github.com/repos/${app.repo}/releases`);
              }

              if (res.ok) {
                const releases = await res.json();
                return { ...app, releases: Array.isArray(releases) ? releases.slice(0, 10) : [] }; 
              }
              
              console.warn(`Could not fetch releases for ${app.repo}. Status: ${res.status}`);
              
              return { ...app, releases: [] };
            } catch (e) {
              console.error(`Fetch error for ${app.repo}:`, e);
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
            Browse official releases and older versions of Wbsedcl tools fetched directly from our source repositories.
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
                  <h2 className="text-3xl font-black text-white tracking-tight">{app.title}</h2>
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
