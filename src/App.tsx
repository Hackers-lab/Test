import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Download, Monitor, Plus, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Forum } from "./pages/Forum";
import { Tools } from "./pages/Tools";

// Placeholder data for github releases
interface Release {
  name: string;
  tag_name: string;
  published_at: string;
  assets: { name: string; size: number; download_url: string }[];
}

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const Home = () => {
  const [release, setRelease] = useState<Release | null>(null);

  // In a real app, this would fetch from GitHub API
  useEffect(() => {
    // Simulated fetch
    setTimeout(() => {
      setRelease({
        name: "Pro Toolkit Manager",
        tag_name: "v2.4.1",
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        assets: [{ name: "Installer.exe", size: 142.8 * 1024 * 1024, download_url: "#" }]
      });
    }, 1000);
  }, []);

  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
        <section className="col-span-1 lg:col-span-7 flex flex-col gap-6">
          {/* Hero Card */}
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col min-h-[400px] shadow-2xl">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
            
            <div className="relative flex items-center gap-3 mb-6">
              <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] uppercase tracking-widest font-bold text-cyan-400">Latest GitHub Release</div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {release ? release.name : "Fetching Release..."} 
              {release && <span className="text-cyan-400 text-2xl md:text-3xl align-top ml-2">{release.tag_name}</span>}
            </h1>
            
            <p className="text-slate-400 text-lg mb-8 max-w-md">
              The ultimate Swiss-army knife for system automation. Fetched directly from our production repository with hash verification.
            </p>
            
            <div className="mt-auto flex flex-col md:flex-row md:items-center gap-6">
              <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold text-lg shadow-[0_10px_25px_-5px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all w-full md:w-auto">
                Download Installer
              </button>
              <div className="flex gap-6 mt-4 md:mt-0 justify-center md:justify-start">
                 <div className="flex flex-col">
                   <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Build Size</span>
                   <span className="text-white font-mono">{release ? "142.8 MB" : "--"}</span>
                 </div>
                 <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                 <div className="flex flex-col">
                   <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Updated</span>
                   <span className="text-white font-mono">{release ? "2h ago" : "--"}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* App Showcase */}
          <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-500" />
                App Showcase
              </h3>
              <button className="text-xs text-cyan-400 font-medium flex items-center gap-1 hover:text-cyan-300">
                Add Screenshot <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-40">
              <div className="rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden h-40">
                 <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-slate-500 text-xs italic">Dashboard.png</div>
              </div>
              <div className="rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden h-40">
                 <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-slate-500 text-xs italic">Settings.png</div>
              </div>
              <button className="rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden border-dashed hover:bg-slate-800/50 transition-colors h-40">
                 <div className="flex flex-col items-center text-slate-600 gap-1">
                   <Download className="w-6 h-6 rotate-180" />
                   <span className="text-[10px] font-bold">UPLOAD</span>
                 </div>
              </button>
            </div>
          </div>
        </section>

        <aside className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          {/* Quick Tutorial */}
          <div className="bg-slate-900/60 border border-cyan-500/20 rounded-3xl p-6 flex-1 shadow-[0_0_40px_rgba(6,182,212,0.05)]">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-500" />
              Quick Tutorial
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">01</div>
                <p className="text-sm text-slate-400">Run the downloaded executable from the Tools page.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">02</div>
                <p className="text-sm text-slate-400">Grant administrator privileges when prompted for core functions.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">03</div>
                <p className="text-sm text-slate-400">Link your GitHub API key in settings to enable auto-sync.</p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                 <button className="w-full py-3 rounded-xl border border-cyan-500/50 text-cyan-400 text-sm font-bold hover:bg-cyan-500/10 transition-colors">View Full Video Guide</button>
              </div>
            </div>
          </div>

          {/* Deployment Info */}
          <div className="bg-[#0f172a] border border-white/5 rounded-3xl p-6">
            <h3 className="text-white font-bold mb-4">Deployment Info</h3>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="text-xs font-mono text-cyan-500/80 mb-2 underline tracking-tighter">wbtools.co.in CONFIGURATION</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                To link your domain: Point your DNS A Records to our edge nodes. Use CNAME for the 'www' subdomain. Follow regular hosting guidelines.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </PageTransition>
  );
};

const GenericPage = ({ title, desc }: { title: string, desc: string }) => (
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

const Downloads = () => <GenericPage title="Downloads Archives" desc="Release binaries and legacy assets will appear here via GitHub." />;
const Support = () => <GenericPage title="Support & Resources" desc="Get help, read documentation, and find answers." />;
const About = () => <GenericPage title="About WBTools" desc="Building the ultimate tools integration ecosystem." />;

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
