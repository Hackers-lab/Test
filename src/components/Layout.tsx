import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Settings, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import logo from "../assets/logo.png";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { trackSiteVisit, subscribeToSiteVisits } from "../lib/stats";
import { preloadHubData } from "../lib/github";

const navItems = [
  { name: "Tools", path: "/tools" },
  { name: "Downloads", path: "/downloads" },
  { name: "Forum", path: "/forum" },
  { name: "Support", path: "/support" },
  { name: "About", path: "/about" },
];

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    preloadHubData();
    trackSiteVisit();
    const unsub = subscribeToSiteVisits((count) => {
      setVisitorCount(count);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 font-sans selection:bg-blue-700 selection:text-white flex flex-col overflow-x-hidden relative">
      {/* Subtle architectural drafting grid */}
      <div className="fixed inset-0 bg-drafting-grid pointer-events-none -z-10" />

      {/* Top Navigation Bar — 3-Zone Contract */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 p-1 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={logo}
                alt="WBTools"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML =
                      '<span class="text-xs font-bold text-white font-display">WB</span>';
                  }
                }}
              />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              WBTools
            </span>
          </Link>

          {/* Zone 2: Clean Typography Nav Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "relative py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-sm",
                    isActive
                      ? "text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute -bottom-[19px] left-0 h-[2px] w-full bg-blue-700"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                </Link>
              );
            })}

            {userEmail === "pramod.theroxtar@gmail.com" && (
              <Link
                to="/settings"
                className={cn(
                  "relative py-1 text-sm font-medium flex items-center gap-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-sm",
                  location.pathname === "/settings"
                    ? "text-blue-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                Config
                {location.pathname === "/settings" && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute -bottom-[19px] left-0 h-[2px] w-full bg-blue-700"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
              </Link>
            )}
          </nav>

          {/* Zone 3: Single Primary Action + Mobile Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/estimator/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Launch Estimator
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2.5 min-w-[44px] min-h-[44px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden border-b border-slate-200 bg-white sticky top-16 left-0 right-0 z-40 shadow-sm"
          >
            <div className="flex flex-col px-4 py-4 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                Home
              </Link>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
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
                    "px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                    location.pathname === "/settings"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Settings className="w-4 h-4" /> Config
                </Link>
              )}
              <div className="pt-2 border-t border-slate-100">
                <a
                  href="/estimator/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold"
                >
                  Launch Estimator
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">WBTools</span>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} Field &amp; Utility Software Suite</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            <Link to="/tools" className="hover:text-slate-900 transition-colors">
              Tools
            </Link>
            <Link to="/downloads" className="hover:text-slate-900 transition-colors">
              Downloads
            </Link>
            <Link to="/support" className="hover:text-slate-900 transition-colors">
              Support
            </Link>
            <Link to="/about" className="hover:text-slate-900 transition-colors">
              About
            </Link>
            {visitorCount !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {visitorCount.toLocaleString()} visits
                </span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
