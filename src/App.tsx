import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Download, Monitor, Plus, BookOpen, Loader2, Zap, ExternalLink, PowerOff } from "lucide-react";
import { fetchGithubApi, REAL_FALLBACK_RELEASES } from "./lib/github";
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
  assets: { name: string; size: number; download_url?: string; browser_download_url?: string }[];
}

export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.995 }}
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
          if (data && data.tag_name) {
            setRelease(data);
            return;
          }
        }
        
        // Fallback to list of all releases if latest isn't found
        let listRes = await fetchGithubApi(`repos/${repoName}/releases`);
        
        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData) && listData.length > 0) {
            setRelease(listData[0]);
            return;
          }
        }

        // If rate limited or unreachable, fallback to verified releases
        if (REAL_FALLBACK_RELEASES[repoName]?.[0]) {
          setRelease(REAL_FALLBACK_RELEASES[repoName][0]);
        }
      } catch (e) {
        if (REAL_FALLBACK_RELEASES[repoName]?.[0]) {
          setRelease(REAL_FALLBACK_RELEASES[repoName][0]);
        }
      }
    };
    fetchReleaseInfo();
  }, [repoName]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4 }}
      className="glass-panel glass-panel-hover rounded-3xl p-6 relative overflow-hidden flex flex-col group border border-white/10 hover:border-cyan-400/40"
    >
      <div className="absolute -top-28 -right-28 w-60 h-60 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
      
      <div className="relative flex items-center justify-between gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          Official Release
        </span>
        {release && (
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Verified {maskWbsedcl(release.tag_name)}
          </span>
        )}
      </div>
      
      <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight group-hover:text-cyan-200 transition-colors flex items-center gap-2">
        {maskWbsedcl(title)}
      </h2>
      
      <p className="text-slate-400 text-xs md:text-sm mb-6 line-clamp-2 flex-1 leading-relaxed">
        {maskWbsedcl(description)}
      </p>
      
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Link to={to} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all">
            Explore Studio
          </Link>
          {webAppUrl && (
            <a href={webAppUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-1">
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
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    transition={{ duration: 0.4, delay: 0.05 }}
    className="glass-panel glass-panel-hover relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-amber-950/25 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
  >
    {/* glow blobs */}
    <div className="absolute -top-20 -left-20 w-60 h-60 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none group-hover:scale-125 transition-all duration-500" />

    <div className="flex items-start sm:items-center gap-4 min-w-0">
      <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/20 border border-rose-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.35)] group-hover:scale-110 group-hover:rotate-3 transition-transform">
        <PowerOff className="w-7 h-7 text-rose-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[9px] uppercase tracking-widest font-extrabold text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Cloud Web App · Live
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight group-hover:text-rose-200 transition-colors">
          Disconnection <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">Management</span>
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
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-bold text-xs shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        Launch App <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </motion.div>
);

const EstimatorWebCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    transition={{ duration: 0.4, delay: 0.1 }}
    className="glass-panel glass-panel-hover relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-teal-950/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
  >
    {/* glow blobs */}
    <div className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none group-hover:scale-125 transition-all duration-500" />

    <div className="flex items-start sm:items-center gap-4 min-w-0">
      <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:scale-110 group-hover:-rotate-3 transition-transform">
        <Zap className="w-7 h-7 text-emerald-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] uppercase tracking-widest font-extrabold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Interactive Tool · Live
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight group-hover:text-emerald-200 transition-colors">
          Field Companion — <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Estimator</span>
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
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
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
        {/* Hero Banner Setup */}
        <div className="py-8 md:py-12 text-center relative flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[220px] bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-blue-500/20 rounded-full blur-[110px] -z-10 pointer-events-none animate-pulse-glow"></div>
          
          {/* Top Pill Announcement */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 mb-6 text-xs font-semibold text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>WBTOOLS v2.0 • Ultra-Fast Engineering Ecosystem</span>
          </motion.div>

          <div className="flex flex-row items-center justify-center gap-4 md:gap-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ rotate: 5, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-cyan-500/30 via-slate-900 to-purple-600/30 border border-cyan-400/40 p-2 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.4)] shrink-0 flex items-center justify-center backdrop-blur-xl animate-border-shimmer"
            >
              <img 
                src={logo} 
                alt="Tools Logo" 
                className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-2xl font-black bg-gradient-to-br from-cyan-400 to-purple-400 bg-clip-text text-transparent">WB</span>';
                  }
                }}
              />
            </motion.div>
            <div className="flex flex-col items-start text-left">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.1)]">
                WB<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">TOOLS</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium mt-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Next-Generation Field & Utility Workspace • Verified Public Dist
              </p>
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
