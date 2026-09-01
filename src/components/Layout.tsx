import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, MessageSquare, Settings, Users, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import logo from "../assets/logo.png";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { trackSiteVisit, subscribeToSiteVisits } from "../lib/stats";

const navItems = [
  { name: "Home", path: "/" },
  { name: "Tools", path: "/tools" },
  { name: "Downloads", path: "/downloads" },
  { name: "Support", path: "/support", isSpecial: true },
  { name: "About", path: "/about" },
  { name: "Forum", path: "/forum" },
];

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    trackSiteVisit();
    const unsub = subscribeToSiteVisits((count) => {
      setVisitorCount(count);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const hasInteracted = localStorage.getItem("whatsapp_joined");
    if (!hasInteracted) {
      const timer = setTimeout(() => setShowWhatsApp(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  const handleWhatsAppClick = () => {
    localStorage.setItem("whatsapp_joined", "true");
    setShowWhatsApp(false);
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-sans selection:bg-cyan-500 selection:text-white flex flex-col overflow-x-hidden">
      {/* WhatsApp Popup */}
      <AnimatePresence>
        {showWhatsApp && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-6 right-6 z-[100] max-w-[300px] w-full"
          >
            <div className="bg-[#121b22] border border-green-500/30 rounded-2xl p-5 shadow-[0_20px_50px_rgba(34,197,94,0.15)] relative overflow-hidden group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setShowWhatsApp(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Official Support</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Join our WhatsApp community for real-time updates and direct tool support.
                  </p>
                  <a 
                    href="https://chat.whatsapp.com/LZKLg40n8FxCLdnAIO9HGE"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                    className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg"
                  >
                    Join the Group
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-xl shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 p-1 overflow-hidden group-hover:border-cyan-500/50 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center">
              <img 
                src={logo} 
                alt="WBSEDCL Tools Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-xs font-black text-cyan-500">WT</span>';
                  }
                }}
              />
            </div>
            <span className="text-xl font-black tracking-tighter text-white hidden sm:block">
              WBSEDCL <span className="text-cyan-400">TOOLS</span>
            </span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            if (item.isSpecial) {
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-400/10 px-3 py-1 rounded-full"
                >
                  {item.name}
                </Link>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "relative text-sm font-medium transition-colors",
                  isActive ? "text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute -bottom-[22px] left-0 h-[2px] w-full bg-cyan-500"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
          
          {userEmail === "pramod.theroxtar@gmail.com" && (
            <Link
              to="/settings"
              className={cn(
                "relative text-sm font-bold flex items-center gap-1 transition-colors",
                location.pathname === "/settings" ? "text-cyan-400" : "text-slate-400 hover:text-cyan-400"
              )}
            >
              <Settings className="w-4 h-4" /> Config
              {location.pathname === "/settings" && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute -bottom-[22px] left-0 h-[2px] w-full bg-cyan-500"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/10 bg-slate-900 absolute top-16 left-0 right-0 z-40 shadow-xl overflow-hidden"
          >
            <div className="flex flex-col px-4 py-4 space-y-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "text-sm font-medium block",
                      isActive ? "text-cyan-400" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              {userEmail === "pramod.theroxtar@gmail.com" && (
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "text-sm font-bold flex items-center gap-2",
                      location.pathname === "/settings" ? "text-cyan-400" : "text-slate-400 hover:text-cyan-400"
                    )}
                  >
                    <Settings className="w-4 h-4" /> Config
                  </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="h-min md:h-12 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 bg-slate-950 py-4 md:py-0 shrink-0 gap-3 md:gap-0">
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center md:text-left">
          © {new Date().getFullYear()} WBSEDCL TOOLS INTEGRATED ECOSYSTEM
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-6">
          {visitorCount !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-mono font-bold">
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>{visitorCount.toLocaleString()} VISITS</span>
            </div>
          )}
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            STATUS: <span className="text-green-500 font-bold">ALL SYSTEMS OPERATIONAL</span>
          </span>
          <span className="text-[10px] text-slate-500">UPTIME: 99.9%</span>
        </div>
      </footer>
    </div>
  );
}
