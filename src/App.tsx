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
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
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
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 md:p-6 relative overflow-hidden flex flex-col shadow-xl transition-all hover:scale-[1.01] hover:border-white/10">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px]"></div>
      
      <div className="relative flex items-center gap-2 mb-3">
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-[9px] uppercase tracking-widest font-bold text-cyan-400">
          Official Release
        </span>
      </div>
      
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">
        {maskWbsedcl(title)}
      </h2>
      
      <p className="text-slate-400 text-xs md:text-sm mb-5 line-clamp-2 flex-1 leading-relaxed">
        {maskWbsedcl(description)}
      </p>
      
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Link to={to} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all">
            Explore
          </Link>
          {webAppUrl && (
            <a href={webAppUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all">
              Launch Web
            </a>
          )}
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Updated</span>
          <span className="text-slate-300 font-mono text-xs">{release ? new Date(release.published_at).toLocaleDateString() : "--"}</span>
        </div>
      </div>
    </div>
  );
};

const DisconnectionWebCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.05 }}
    className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/50 via-slate-900/80 to-amber-950/30 shadow-xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
  >
    {/* glow blobs */}
    <div className="absolute -top-16 -left-16 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none" />

    <div className="flex items-start sm:items-center gap-4 min-w-0">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
        <PowerOff className="w-5 h-5 text-rose-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[9px] uppercase tracking-widest font-bold text-rose-400">
            Cloud Web App
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
          Disconnection <span className="text-rose-400">Management</span>
        </h2>
        <p className="text-slate-400 text-xs md:text-sm line-clamp-1 max-w-xl">
          Automated workflow to track consumer status, notices, and field execution.
        </p>
      </div>
    </div>

    <div className="shrink-0 pt-2 sm:pt-0">
      <a
        href="https://disconnection.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        Open App <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </motion.div>
);

const EstimatorWebCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.1 }}
    className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-slate-900/80 to-teal-950/40 shadow-xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
  >
    {/* glow blobs */}
    <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

    <div className="flex items-start sm:items-center gap-4 min-w-0">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
        <Zap className="w-5 h-5 text-emerald-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] uppercase tracking-widest font-bold text-emerald-400">
            Interactive Tool
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
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
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        Open Estimator <ExternalLink className="w-3.5 h-3.5" />
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
