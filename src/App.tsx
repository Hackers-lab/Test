import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Download, Monitor, Plus, BookOpen, Loader2, Zap, ExternalLink } from "lucide-react";
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
    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col shadow-2xl transition-transform hover:scale-[1.02]">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
      
      <div className="relative flex items-center gap-3 mb-4">
        <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] uppercase tracking-widest font-bold text-cyan-400">
          Official Release
        </div>
      </div>
      
      <h2 className="text-3xl font-extrabold text-white mb-3">
        {title}
      </h2>
      
      <p className="text-slate-400 text-lg mb-8 max-w-md flex-1">
        {description}
      </p>
      
      <div className="mt-auto flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to={to} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold text-center shadow-[0_10px_25px_-5px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all">
          Explore App
        </Link>
        {webAppUrl && (
          <a href={webAppUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-center shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all">
            Open Web App
          </a>
        )}
        <div className="flex gap-4 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Updated</span>
            <span className="text-white font-mono text-sm">{release ? new Date(release.published_at).toLocaleDateString() : "--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const EstimatorWebCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 }}
    className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-teal-950/60 shadow-2xl p-8 flex flex-col md:flex-row md:items-center gap-6"
  >
    {/* glow blobs */}
    <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-[80px] pointer-events-none" />
    <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

    {/* icon */}
    <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg">
      <Zap className="w-8 h-8 text-emerald-400" />
    </div>

    {/* text */}
    <div className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] uppercase tracking-widest font-bold text-emerald-400">
          Web App · Live
        </span>
      </div>
      <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-1">
        ERP Field Companion — <span className="text-emerald-400">Estimator</span>
      </h2>
      <p className="text-slate-400 text-sm md:text-base max-w-xl">
        Draw LT/HT electrical lines on an interactive canvas and instantly generate itemised estimates. Export drawings and bills to PDF or Excel — runs entirely in your browser, no install needed.
      </p>
    </div>

    {/* button */}
    <div className="relative shrink-0">
      <a
        href="/estimator/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-[0_10px_30px_-5px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        Open Estimator <ExternalLink className="w-4 h-4" />
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
        <div className="py-6 md:py-10 text-center relative flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-cyan-500/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          
          <div className="flex flex-row items-center justify-center gap-4 md:gap-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-slate-900 border border-white/10 p-1 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)] shrink-0 flex items-center justify-center"
            >
              <img 
                src={logo} 
                alt="WBSEDCL Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-xl font-black text-cyan-500">WT</span>';
                  }
                }}
              />
            </motion.div>
            <div className="flex flex-col items-start text-left">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none">
                WBSEDCL <span className="text-cyan-400">TOOLS</span>
              </h1>
              <p className="text-xs md:text-base text-slate-400 font-medium mt-0.5">Advanced Utility Solutions</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 mb-6">
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
            <div className="mb-10">
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
