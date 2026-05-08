import { fetchGithubApi } from '../lib/github';
import { useState, useEffect } from 'react';
import { Download, PlayCircle, BookOpen, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearchParams } from 'react-router-dom';

interface Release {
  name: string;
  tag_name: string;
  published_at: string;
  assets: { name: string; size: number; browser_download_url: string }[];
  body: string;
}

export function Tools() {
  const [searchParams] = useSearchParams();
  const initApp = searchParams.get('app') === 'estimator' ? 'estimator' : 'spotimageviewer';
  
  const [selectedRepo, setSelectedRepo] = useState<'spotimageviewer' | 'estimator'>(initApp);
  const [release, setRelease] = useState<Release | null>(null);
  const [readme, setReadme] = useState<string>('');
  const [readmeBaseUrl, setReadmeBaseUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ytLink, setYtLink] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      setYtLink(null);
      
      try {
        const repoName = `Hackers-lab/${selectedRepo}`;
        
        let releaseBody = '';
        try {
          let relRes = await fetchGithubApi(`repos/${repoName}/releases/latest`);

          if (relRes.ok) {
             const relData = await relRes.json();
             setRelease(relData);
             releaseBody = relData.body || '';
          } else {
             // Fallback to all releases
             let listRes = await fetchGithubApi(`repos/${repoName}/releases`);
             
             if (listRes.ok) {
                const listData = await listRes.json();
                if (Array.isArray(listData) && listData.length > 0) {
                  setRelease(listData[0]);
                  releaseBody = listData[0].body || '';
                } else {
                  setRelease(null);
                }
             } else {
                setRelease(null);
             }
          }
        } catch (e) {
          // Keep silent failure when completely unreachable
          setRelease(null);
        }

        let readmeText = '';
        let baseReadmeUrl = `https://raw.githubusercontent.com/${repoName}/main`;
        try {
          // Try to get README metadata to find the correct download URL (handles main vs master automatically)
          const readmeMetaRes = await fetchGithubApi(`repos/${repoName}/readme`);
          if (readmeMetaRes.ok) {
            const readmeMeta = await readmeMetaRes.json();
            const readmeRes = await fetch(readmeMeta.download_url);
            if (readmeRes.ok) {
              readmeText = await readmeRes.text();
              const dUrl = new URL(readmeMeta.download_url);
              // Strip out the filename at the end
              const pathParts = dUrl.pathname.split('/');
              pathParts.pop();
              baseReadmeUrl = `${dUrl.origin}${pathParts.join('/')}`;
            }
          }
        } catch (e) {
           // Silently ignore if failed
        }
        setReadme(readmeText);
        setReadmeBaseUrl(baseReadmeUrl);

        // Try to extract YouTube URL from README or Release Body
        const combinedText = releaseBody + "\n" + readmeText;
        const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i;
        const match = combinedText.match(ytRegex);
        
        if (match && match[1]) {
           setYtLink(`https://www.youtube.com/embed/${match[1]}`);
        }

      } catch (err) {
        setError('Failed to fetch data from source distribution.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedRepo]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full pb-20">
      
      {/* Sidebar Navigation */}
      <aside className="col-span-1 lg:col-span-3 flex flex-col gap-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 shadow-xl">
           <h3 className="text-white font-bold mb-4 px-2 uppercase tracking-tight text-xs text-slate-500">Available Tools</h3>
           <div className="flex flex-col gap-2">
             <button 
                onClick={() => setSelectedRepo('spotimageviewer')}
                className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedRepo === 'spotimageviewer' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'}`}
             >
                Spot Image Viewer
             </button>
             <button 
                onClick={() => setSelectedRepo('estimator')}
                className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedRepo === 'estimator' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'}`}
             >
                Estimator
             </button>
           </div>
        </div>
      </aside>

      {/* Main Panel */}
      <section className="col-span-1 lg:col-span-9 flex flex-col gap-6 min-h-[500px]">
        {loading ? (
           <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-center p-12">
             <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin"></div>
           </div>
        ) : error ? (
           <div className="flex-1 bg-slate-900/40 border border-red-500/20 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
             <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
             <h3 className="text-xl font-bold text-white mb-2">System Outage</h3>
             <p className="text-slate-400">{error}</p>
           </div>
        ) : (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="flex flex-col gap-6">
            
            {/* Release Header */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
              
              <div className="relative flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                   <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] uppercase tracking-widest font-bold text-cyan-400">
                     {release ? 'Stable Release' : 'Development Build'}
                   </div>
                   {release && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
                </div>
              </div>
              
              <h1 className="text-4xl font-black text-white mb-2 leading-tight">
                {selectedRepo === 'spotimageviewer' ? 'Spot Image Viewer' : 'Estimator'}
              </h1>
              
              {release ? (
                 <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                   {release.assets.slice(0,1).map(asset => (
                     <a href={asset.browser_download_url} target="_blank" rel="noreferrer" key={asset.name} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto text-center flex items-center justify-center gap-2">
                       <Download className="w-4 h-4" /> Download {asset.name}
                     </a>
                   ))}
                   <div className="flex gap-6 mt-4 sm:mt-0 justify-center w-full sm:w-auto px-4">
                     <div className="flex flex-col">
                       <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Version</span>
                       <span className="text-cyan-400 font-mono text-sm">{release.tag_name}</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Updated</span>
                       <span className="text-white font-mono text-sm">{new Date(release.published_at).toLocaleDateString()}</span>
                     </div>
                   </div>
                 </div>
              ) : (
                 <div className="mt-4 p-6 border border-dashed border-white/10 rounded-2xl bg-black/20 flex flex-col gap-2">
                   <p className="text-slate-400 font-medium">No official binaries found for this tool.</p>
                   <p className="text-xs text-slate-600">
                     This may happen if the repository is private or no public releases have been tagged yet. 
                     Please check back later or contact support if you believe this is an error.
                   </p>
                 </div>
              )}
            </div>

            {/* Video Tutorial (Dynamic) */}
            {ytLink && (
              <div className="bg-slate-900/60 border border-cyan-500/20 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.05)] overflow-hidden">
                 <div className="p-4 border-b border-white/5 bg-slate-900/80 flex items-center gap-2">
                   <PlayCircle className="w-4 h-4 text-cyan-400" />
                   <h3 className="text-sm font-bold text-white uppercase tracking-wider">Video Tutorial</h3>
                 </div>
                 <div className="aspect-video w-full bg-black">
                   <iframe 
                     className="w-full h-full" 
                     src={ytLink} 
                     title="YouTube video player" 
                     frameBorder="0" 
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                     allowFullScreen
                   ></iframe>
                 </div>
              </div>
            )}

            {/* README Content */}
            {readme && (
                <div className="bg-[#0f172a] border border-white/5 rounded-3xl p-6 md:p-10">
                  <h3 className="text-white font-bold mb-6 flex items-center gap-2 pb-4 border-b border-white/5">
                    <BookOpen className="w-4 h-4 text-cyan-500" />
                    Documentation
                  </h3>
                  <div className="markdown-body prose prose-invert prose-cyan max-w-none 
                    prose-headings:font-bold prose-headings:tracking-tight 
                    prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                    prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10
                    prose-img:rounded-xl prose-img:border prose-img:border-white/10"
                  >
                    <Markdown 
                      remarkPlugins={[remarkGfm]}
                      urlTransform={(uri) => {
                        if (!uri.startsWith('http') && !uri.startsWith('mailto:') && !uri.startsWith('#')) {
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
            
          </motion.div>
        )}
      </section>
    </div>
  );
}
