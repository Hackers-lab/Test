import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Download, Monitor, Plus, BookOpen } from "lucide-react";
import { fetchGithubApi } from "./lib/github";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Forum } from "./pages/Forum";
import { Tools } from "./pages/Tools";
import { Downloads } from "./pages/Downloads";
import { Support } from "./pages/Support";
import { About } from "./pages/About";

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

const AppFeatureCard = ({ repoName, title, description, to }: { repoName: string, title: string, description: string, to: string }) => {
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

const Home = () => {
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
                src="/logo.png" 
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 mb-10">
          <AppFeatureCard 
            repoName="Hackers-lab/spotimageviewer"
            title="Spot Image Viewer"
            description="A specialized software tool for viewing, analyzing, and processing complex spot images."
            to="/tools?app=spotimageviewer"
          />
          <AppFeatureCard 
            repoName="Hackers-lab/estimator"
            title="Estimator"
            description="A robust estimation utility to calculate, manage, and overview project dimensions."
            to="/tools?app=estimator"
          />
        </div>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
