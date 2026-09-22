import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Download, Monitor, Plus, BookOpen, Loader2, Zap, ExternalLink, PowerOff } from "lucide-react";
import { fetchGithubApi } from "./lib/github";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Forum } from "./pages/Forum";
import { Tools } from "./pages/Tools";
import { Downloads } from "./pages/Downloads";
import { Support } from "./pages/Support";
import { About } from "./pages/About";
import { Settings } from "./pages/Settings";
import logo from "./assets/logo.png";
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { maskWbsedcl } from "./lib/censor";

// Placeholder data for github releases
interface Release {
  name: string;
  tag_name: string;
  published_at: string;
  assets: { name: string; size: number; download_url: string }[];
}

export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.995 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.995 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

const AppFeatureCard = ({ repoName, title, description, to, webAppUrl }: { repoName: string, title: string, description: string, to: string, webAppUrl?: string }) => {
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    const fetchReleaseInfo = async () => {
      try {
        let res = await fetchGithubApi(`repos/${repoName}/releases/latest`);
        let data = null;

        if (res.ok) {
          data = await res.json();
          setRelease(data);
        } else {
          // Fallback to list of all releases if latest isn't found
          let listRes = await fetchGithubApi(`repos/${repoName}/releases`);
          
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData) && listData.length > 0) {
              setRelease(listData[0]);
            }
          }
        }
      } catch (e) {
        // Silently fail if completely unreachable
      }
    };
    fetchReleaseInfo();
  }, [repoName]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel glass-panel-hover rounded-2xl p-5 md:p-6 relative overflow-hidden flex flex-col group"
    >
      <div className="absolute -top-24 -right-24 w-52 h-52 bg-cyan-500/10 rounded-full blur-[70px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500"></div>
      
      <div className="relative flex items-center justify-between gap-2 mb-3">
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[9px] uppercase tracking-widest font-extrabold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          Official Release
        </span>
        {release && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Verified
          </span>
        )}
      </div>
      
      <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight group-hover:text-cyan-200 transition-colors">
        {maskWbsedcl(title)}
      </h2>
      
      <p className="text-slate-400 text-xs md:text-sm mb-5 line-clamp-2 flex-1 leading-relaxed">
        {maskWbsedcl(description)}
      </p>
      
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Link to={to} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all">
            Explore
          </Link>
          {webAppUrl && (
            <a href={webAppUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-1">
              Launch Web <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Updated</span>
          <span className="text-slate-300 font-mono text-xs">{release ? new Date(release.published_at).toLocaleDateString() : "--"}</span>
        </div>
      </div>
    </motion.div>
  );
};

const DisconnectionWebCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.05 }}
    className="glass-panel glass-panel-hover relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-amber-950/25 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
  >
    {/* glow blobs */}
    <div className="absolute -top-16 -left-16 w-52 h-52 bg-rose-500/15 rounded-full blur-[70px] pointer-events-none group-hover:bg-rose-500/25 transition-all duration-500" />

    <div className="flex items-start sm:items-center gap-4 min-w-0">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.25)] group-hover:scale-110 transition-transform">
        <PowerOff className="w-6 h-6 text-rose-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[9px] uppercase tracking-widest font-extrabold text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            Cloud Web App · Live
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight group-hover:text-rose-200 transition-colors">
          Disconnection <span className="text-rose-400">Management</span>
        </h2>
        <p className="text-slate-400 text-xs md:text-sm line-clamp-1 max-w-xl">
          Automated workflow to track consumer status, notice delivery, and field execution in real time.
        </p>
      </div>
    </div>

    <div className="shrink-0 pt-2 sm:pt-0">
      <a
        href="https://disconnection.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        Launch App <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </motion.div>
);

const EstimatorWebCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 }}
    className="glass-panel glass-panel-hover relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-teal-950/30 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
  >
    {/* glow blobs */}
    <div className="absolute -top-16 -left-16 w-52 h-52 bg-emerald-500/15 rounded-full blur-[70px] pointer-events-none group-hover:bg-emerald-500/25 transition-all duration-500" />

    <div className="flex items-start sm:items-center gap-4 min-w-0">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:scale-110 transition-transform">
        <Zap className="w-6 h-6 text-emerald-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] uppercase tracking-widest font-extrabold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            Interactive Tool · Live
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight group-hover:text-emerald-200 transition-colors">
          ERP Field Companion — <span className="text-emerald-400">Estimator</span>
        </h2>
        <p className="text-slate-400 text-xs md:text-sm line-clamp-1 max-w-xl">
          Draw LT/HT electrical lines on canvas, generate itemised estimates & export PDF/Excel.
        </p>
      </div>
    </div>

    <div className="shrink-0 pt-2 sm:pt-0">
      <a
        href="/estimator/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        Launch Estimator <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </motion.div>
);

const Home = () => {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'repositories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Fallback to initial apps locally if db is empty
        const initialApps = [
          {
            id: 'hackers-lab_spotimageviewer',
            repoName: "Hackers-lab/spotimageviewer",
            title: "Spot Image Viewer",
            description: "Search meter images within a fraction of a second using consumer ID, name, meter number, or mobile number. Includes utilities like a theft bill calculator.",
            createdAt: 1
          },
          {
            id: 'hackers-lab_estimator',
            repoName: "Hackers-lab/estimator",
            title: "Estimator",
            description: "Draw electrical lines on a canvas and automatically generate estimates. Features LT/HT lines, DTR structures, and allows exporting drawings and estimates to PDF and Excel.",
            createdAt: 2,
            webAppUrl: "/estimator/"
          }
        ];
        
        setRepos(initialApps);
        setLoading(false);
      } else {
        const results: any[] = [];
        snapshot.forEach(doc => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setRepos(results.sort((a, b) => a.createdAt - b.createdAt));
        setLoading(false);
      }
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
        {/* Header Setup */}
        <div className="py-4 md:py-6 text-center relative flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[150px] bg-cyan-500/5 rounded-full blur-[90px] -z-10 pointer-events-none"></div>
          
          <div className="flex flex-row items-center justify-center gap-3 md:gap-5">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 border border-white/10 p-1 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)] shrink-0 flex items-center justify-center"
            >
              <img 
                src={logo} 
                alt="Tools Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-lg font-black text-cyan-500">WB</span>';
                  }
                }}
              />
            </motion.div>
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
                WB<span className="text-cyan-400">TOOLS</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium mt-0.5">Advanced Utility Solutions</p>
            </div>
          </div>
        </div>

        {/* Featured Apps Showcase */}
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2 mb-4">
              {repos.map((repo) => (
                <AppFeatureCard
                  key={repo.id}
                  repoName={repo.repoName}
                  title={repo.title}
                  description={repo.description}
                  to={`/tools?app=${repo.repoName.split('/')[1]}`}
                  webAppUrl={repo.webAppUrl}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <DisconnectionWebCard />
              <EstimatorWebCard />
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
};

export const GenericPage = ({ title, desc }: { title: string, desc: string }) => (
  <PageTransition>
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col items-center justify-center text-center">
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 rounded-full blur-[80px]"></div>
         <h1 className="text-4xl font-black text-white mb-4 tracking-tight">{title}</h1>
         <p className="text-lg text-slate-400">{desc}</p>
      </div>
    </div>
  </PageTransition>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tools" element={<Tools />} />
          <Route path="downloads" element={<Downloads />} />
          <Route path="support" element={<Support />} />
          <Route path="forum" element={<Forum />} />
          <Route path="about" element={<About />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
