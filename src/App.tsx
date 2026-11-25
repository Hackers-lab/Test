import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import {
  getAssetDownloadUrl,
  getCachedHubReleases,
  getCachedRepos,
  setCachedRepos,
  subscribeToHubReleases,
  matchLatestReleaseForRepo,
  DEFAULT_REPOS,
  type ReleaseItemData,
  type RepoRecord,
} from "./lib/github";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, Download, ExternalLink, PowerOff, Zap, Layers } from "lucide-react";
import { Layout } from "./components/Layout";
import { Forum } from "./pages/Forum";
import { Tools } from "./pages/Tools";
import { Downloads } from "./pages/Downloads";
import { Support } from "./pages/Support";
import { About } from "./pages/About";
import { Settings } from "./pages/Settings";
import heroWorkspaceImg from "./assets/images/hero_grid_workspace_1795019969346.jpg";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { maskWbsedcl } from "./lib/censor";

export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

const AppFeatureCard = ({
  title,
  description,
  to,
  webAppUrl,
  release,
  index = 0,
}: {
  title: string;
  description: string;
  to: string;
  webAppUrl?: string;
  release: ReleaseItemData | null;
  index?: number;
}) => {
  const primaryAsset = release?.assets?.[0];
  const assetUrl = primaryAsset?.browser_download_url || primaryAsset?.download_url;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.25), ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-6 flex flex-col transition-all duration-200"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
        <span className="font-medium text-blue-700">Official Release</span>
        {release && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-700 font-medium">
              {maskWbsedcl(release.tag_name)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {new Date(release.published_at).toLocaleDateString()}
            </span>
          </>
        )}
      </div>

      <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight mb-2">
        {maskWbsedcl(title)}
      </h3>

      <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
        {maskWbsedcl(description)}
      </p>

      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
        {primaryAsset && assetUrl ? (
          <a
            href={getAssetDownloadUrl(assetUrl, primaryAsset.name)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        ) : (
          <Link
            to="/downloads"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </Link>
        )}
        <Link
          to={to}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
        >
          Open Documentation
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {webAppUrl && (
          <a
            href={webAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Launch Web
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </motion.article>
  );
};

const DisconnectionWebCard = () => (
  <motion.article
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all duration-200"
  >
    <div className="flex items-start gap-4 min-w-0">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center">
        <PowerOff className="w-5 h-5 text-amber-700" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span className="font-medium text-amber-700">Browser Workspace</span>
          <span aria-hidden="true">·</span>
          <span>Field Execution</span>
        </div>
        <h3 className="font-display text-lg font-bold text-slate-900 tracking-tight mb-1">
          Disconnection Management
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Track consumer status, notice delivery, and field disconnection workflows in real time.
        </p>
      </div>
    </div>

    <div className="shrink-0">
      <a
        href="https://disconnection.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
      >
        Launch App
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </motion.article>
);

const EstimatorWebCard = () => (
  <motion.article
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.22, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
    className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all duration-200"
  >
    <div className="flex items-start gap-4 min-w-0">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center">
        <Zap className="w-5 h-5 text-blue-700" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span className="font-medium text-blue-700">Interactive Canvas</span>
          <span aria-hidden="true">·</span>
          <span>LT / HT Lines</span>
        </div>
        <h3 className="font-display text-lg font-bold text-slate-900 tracking-tight mb-1">
          Field Companion — Estimator
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Draw electrical lines on canvas, generate itemised bills of material, and export PDF or Excel.
        </p>
      </div>
    </div>

    <div className="shrink-0">
      <a
        href="/estimator/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
      >
        Launch Estimator
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </motion.article>
);

const Home = () => {
  const [repos, setRepos] = useState<RepoRecord[]>(() => getCachedRepos());
  const [hubReleases, setHubReleases] = useState<ReleaseItemData[] | null>(() =>
    getCachedHubReleases()
  );
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    const unsubReleases = subscribeToHubReleases((releases) => {
      setHubReleases(releases);
    });

    const q = query(collection(db, "repositories"));
    const unsubRepos = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setRepos(DEFAULT_REPOS);
          setCachedRepos(DEFAULT_REPOS);
        } else {
          const results: RepoRecord[] = [];
          snapshot.forEach((doc) => {
            results.push({ id: doc.id, ...(doc.data() as Omit<RepoRecord, "id">) });
          });
          const sorted = results.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          setRepos(sorted);
          setCachedRepos(sorted);
        }
      },
      (error) => {
        console.error(error);
      }
    );

    return () => {
      unsubReleases();
      unsubRepos();
    };
  }, []);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-12">
        {/* Hero Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center py-2">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs font-semibold text-blue-700 tracking-wide mb-3"
            >
              Utility Operations &amp; Field Engineering
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.08] mb-5 max-w-2xl"
            >
              Precision software for field inspections and line estimation.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8"
            >
              Access verified desktop releases, search consumer meter photography, draft LT/HT line
              layouts, and coordinate disconnection workflows from one unified portal.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-all duration-150 hover:shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                Explore Tools
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/downloads"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                Browse Releases
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div className="h-full min-h-[260px] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs group">
              {!heroImgError ? (
                <img
                  src={heroWorkspaceImg}
                  alt="Electrical power distribution engineering tablet and precision drafting calipers"
                  className="w-full h-full lg:h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                />
              ) : (
                <div className="w-full h-full min-h-[260px] bg-slate-100 flex flex-col items-center justify-center p-8 text-center">
                  <Layers className="w-10 h-10 text-blue-700 mb-3" />
                  <p className="font-display font-bold text-slate-900">WBTools Engineering Suite</p>
                  <p className="text-xs text-slate-500 mt-1">Desktop &amp; Web Utilities</p>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Full-Width 4-Column Specification Strip */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Platform capabilities overview"
          className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-xs"
        >
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-1">Desktop Suites</p>
            <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
              {repos.length}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-1">Browser Workspaces</p>
            <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">2</p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-1">Distribution</p>
            <p className="font-display text-2xl font-bold text-slate-900">Verified Builds</p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-1">Export Formats</p>
            <p className="font-display text-2xl font-bold text-slate-900">PDF &amp; Excel</p>
          </div>
        </motion.section>

        {/* Desktop & Repository Suites */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                Desktop Suites &amp; Documentation
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Verified desktop installers, release notes, and technical manuals in one place.
              </p>
            </div>
            <Link
              to="/downloads"
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              View all releases &rarr;
            </Link>
          </div>

          <div
            className={`grid grid-cols-1 gap-6 ${
              repos.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {repos.map((repo, idx) => (
              <AppFeatureCard
                key={repo.id}
                index={idx}
                title={repo.title}
                description={repo.description || ""}
                to={`/tools?app=${repo.repoName.split("/")[1]}`}
                webAppUrl={repo.webAppUrl}
                release={matchLatestReleaseForRepo(hubReleases, repo.repoName)}
              />
            ))}
          </div>
        </section>

        {/* Browser Web Applications */}
        <section className="pb-4">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Browser Workspaces
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Zero-install tools running directly in your browser for field execution and estimation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DisconnectionWebCard />
            <EstimatorWebCard />
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export const GenericPage = ({ title, desc }: { title: string; desc: string }) => (
  <PageTransition>
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
      <div className="bg-white border border-slate-200 rounded-xl p-10 w-full">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-3 tracking-tight">
          {title}
        </h1>
        <p className="text-base text-slate-600">{desc}</p>
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
