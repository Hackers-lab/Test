import { useState, useEffect } from 'react';
import { Download, AlertCircle, FileBox } from 'lucide-react';
import { motion } from 'motion/react';
import { PageTransition } from '../App';

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
            const res = await fetch(`https://api.github.com/repos/${app.repo}/releases`);
            if (res.ok) {
              const releases = await res.json();
              return { ...app, releases: releases.slice(0, 5) }; // Get top 5 releases
            }
            return { ...app, releases: [] };
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
      <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col gap-8">
        <div className="text-center relative py-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Downloads Center</h1>
          <p className="text-lg text-slate-400">Get the latest builds and legacy binaries for all our official tools.</p>
        </div>

        {loading ? (
           <div className="flex-1 border border-white/5 rounded-3xl flex items-center justify-center p-12">
             <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin"></div>
           </div>
        ) : error ? (
           <div className="flex-1 bg-slate-900/40 border border-red-500/20 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
             <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
             <h3 className="text-xl font-bold text-white mb-2">Error Fetching Downloads</h3>
             <p className="text-slate-400">{error}</p>
           </div>
        ) : (
          <div className="flex flex-col gap-12">
            {data.map((app, index) => (
              <motion.div 
                key={app.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <FileBox className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-2xl font-bold text-white tracking-tight">{app.title}</h2>
                </div>

                {app.releases.length === 0 ? (
                  <div className="bg-slate-900/40 border border-dashed border-white/10 rounded-2xl p-8 text-center text-slate-500">
                    No public binaries available for this tool yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {app.releases.map((release, rIdx) => (
                       <div key={release.id} className="bg-slate-900/60 border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all group flex flex-col">
                         <div className="flex justify-between items-start mb-4">
                           <h3 className="text-xl font-black text-white">{release.tag_name}</h3>
                           {rIdx === 0 && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">Latest</span>}
                         </div>
                         <div className="text-sm text-slate-400 mb-6 flex-1">
                           Released on {new Date(release.published_at).toLocaleDateString()}
                         </div>
                         <div className="flex flex-col gap-2">
                           {release.assets.length > 0 ? (
                             release.assets.map(asset => (
                               <a 
                                 key={asset.name}
                                 href={asset.browser_download_url} 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors text-sm font-medium text-slate-300"
                               >
                                 <span className="truncate mr-2">{asset.name}</span>
                                 <Download className="w-4 h-4 shrink-0" />
                               </a>
                             ))
                           ) : (
                             <span className="text-xs text-slate-600 italic">No assets attached...</span>
                           )}
                         </div>
                       </div>
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
