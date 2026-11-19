import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUB_REPO = "Hackers-lab/releases";
const RELEASES_REFRESH_INTERVAL_MS = 45 * 1000; // 45s ETag conditional polling (304 doesn't count against rate limit)
const DOC_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes SWR for docs
const GENERIC_CACHE_TTL_MS = 5 * 60 * 1000;

interface SlimAsset {
  name: string;
  size: number;
  browser_download_url: string;
  download_count: number;
}

interface SlimRelease {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  assets: SlimAsset[];
}

// Track whether GITHUB_TOKEN failed with 401 so we never waste a second round-trip
let tokenDisabled = false;

function getGitHubHeaders(extra: Record<string, string> = {}, skipAuth = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Utility-Tools-App",
    ...extra,
  };
  const token = !skipAuth && !tokenDisabled ? process.env.GITHUB_TOKEN?.trim() : "";
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
}

async function fetchGitHubSmart(url: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
  let response = await fetch(url, { headers: getGitHubHeaders(extraHeaders, false) });
  if (response.status === 401 && !tokenDisabled && process.env.GITHUB_TOKEN?.trim()) {
    tokenDisabled = true;
    console.warn("[GitHub] Token returned 401; disabling token for subsequent requests.");
    response = await fetch(url, { headers: getGitHubHeaders(extraHeaders, true) });
  }
  return response;
}

function slimReleases(raw: any[]): SlimRelease[] {
  return raw.map((r) => ({
    id: r.id,
    name: r.name || r.tag_name || "",
    tag_name: r.tag_name || "",
    published_at: r.published_at || r.created_at || "",
    body: r.body || "",
    assets: Array.isArray(r.assets)
      ? r.assets.map((a: any) => ({
          name: a.name || "",
          size: typeof a.size === "number" ? a.size : 0,
          browser_download_url: a.browser_download_url || "",
          download_count: typeof a.download_count === "number" ? a.download_count : 0,
        }))
      : [],
  }));
}

// --- Centralized Real-Time Releases Hub Store ---
let hubReleasesCache: {
  releases: SlimRelease[];
  etag: string | null;
  updatedAt: number;
  lastCheckedAt: number;
} = {
  releases: [],
  etag: null,
  updatedAt: 0,
  lastCheckedAt: 0,
};

let hubInFlight: Promise<SlimRelease[]> | null = null;
const sseClients = new Set<express.Response>();

function broadcastReleases() {
  if (sseClients.size === 0 || hubReleasesCache.releases.length === 0) return;
  const payload = `data: ${JSON.stringify({
    releases: hubReleasesCache.releases,
    updatedAt: hubReleasesCache.updatedAt,
  })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function refreshHubReleases(force = false): Promise<SlimRelease[]> {
  if (hubInFlight) return hubInFlight;

  const now = Date.now();
  if (!force && hubReleasesCache.releases.length > 0 && now - hubReleasesCache.lastCheckedAt < 15_000) {
    return hubReleasesCache.releases;
  }

  hubInFlight = (async () => {
    try {
      const extra: Record<string, string> = {};
      if (hubReleasesCache.etag && !force) {
        extra["If-None-Match"] = hubReleasesCache.etag;
      }

      const response = await fetchGitHubSmart(
        `https://api.github.com/repos/${HUB_REPO}/releases?per_page=100`,
        extra
      );

      hubReleasesCache.lastCheckedAt = Date.now();

      if (response.status === 304) {
        return hubReleasesCache.releases;
      }

      if (response.ok) {
        const raw = await response.json();
        if (Array.isArray(raw)) {
          const slimmed = slimReleases(raw);
          const prevHash = JSON.stringify(hubReleasesCache.releases);
          const nextHash = JSON.stringify(slimmed);

          hubReleasesCache.releases = slimmed;
          hubReleasesCache.etag = response.headers.get("etag") || hubReleasesCache.etag;
          hubReleasesCache.updatedAt = Date.now();

          if (prevHash !== nextHash) {
            broadcastReleases();
          }
        }
      }
    } catch (error) {
      console.warn("[Releases Hub] Refresh failed:", error);
    } finally {
      hubInFlight = null;
    }
    return hubReleasesCache.releases;
  })();

  return hubInFlight;
}

// --- Centralized Docs Cache (Stale-While-Revalidate + Pre-Warm) ---
const docsCache = new Map<
  string,
  { content: string | null; etag: string | null; updatedAt: number; lastCheckedAt: number }
>();
const docsInFlight = new Map<string, Promise<string | null>>();

async function fetchDocCached(slug: string, force = false): Promise<string | null> {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_\-]/g, "");
  if (!cleanSlug) return null;

  const existing = docsCache.get(cleanSlug);
  const now = Date.now();

  if (!force && existing && now - existing.lastCheckedAt < DOC_CACHE_TTL_MS) {
    return existing.content;
  }

  // Stale-while-revalidate: return cached content immediately and refresh in background
  if (!force && existing && existing.content !== null) {
    if (!docsInFlight.has(cleanSlug)) {
      void fetchDocFromUpstream(cleanSlug, existing.etag);
    }
    return existing.content;
  }

  return fetchDocFromUpstream(cleanSlug, existing?.etag || null);
}

async function fetchDocFromUpstream(cleanSlug: string, etag: string | null): Promise<string | null> {
  const inflight = docsInFlight.get(cleanSlug);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const headers: Record<string, string> = { "User-Agent": "Utility-Tools-App" };
      if (etag) headers["If-None-Match"] = etag;

      const res = await fetch(
        `https://raw.githubusercontent.com/${HUB_REPO}/main/docs/${cleanSlug}.md`,
        { headers }
      );

      const now = Date.now();
      const prev = docsCache.get(cleanSlug);

      if (res.status === 304 && prev) {
        prev.lastCheckedAt = now;
        return prev.content;
      }

      if (res.ok) {
        const text = await res.text();
        docsCache.set(cleanSlug, {
          content: text,
          etag: res.headers.get("etag"),
          updatedAt: now,
          lastCheckedAt: now,
        });
        return text;
      }

      // Cache 404 briefly so repeated switches don't stall
      docsCache.set(cleanSlug, {
        content: prev?.content ?? null,
        etag: prev?.etag ?? null,
        updatedAt: prev?.updatedAt ?? now,
        lastCheckedAt: now,
      });
      return prev?.content ?? null;
    } catch {
      return docsCache.get(cleanSlug)?.content ?? null;
    } finally {
      docsInFlight.delete(cleanSlug);
    }
  })();

  docsInFlight.set(cleanSlug, promise);
  return promise;
}

async function prewarmDocs() {
  try {
    const res = await fetchGitHubSmart(`https://api.github.com/repos/${HUB_REPO}/contents/docs`);
    if (!res.ok) return;
    const files = await res.json();
    if (!Array.isArray(files)) return;
    const slugs = files
      .filter((f: any) => typeof f?.name === "string" && f.name.endsWith(".md"))
      .map((f: any) => f.name.replace(/\.md$/i, ""));

    await Promise.allSettled(slugs.map((slug: string) => fetchDocFromUpstream(slug.toLowerCase(), null)));
  } catch {
    // Non-fatal
  }
}

// Generic GitHub Proxy cache
const githubCache = new Map<string, { data: any; etag: string | null; timestamp: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Immediately pre-warm releases & docs on boot so first user request is < 2ms
  void refreshHubReleases(true);
  void prewarmDocs();

  // Keep releases fresh in real time with ETag polling (304 costs 0 rate limit)
  setInterval(() => {
    void refreshHubReleases(false);
  }, RELEASES_REFRESH_INTERVAL_MS);

  // Fast slimmed releases endpoint (< 2ms from RAM, SWR + optional force refresh)
  app.get("/api/releases", async (req, res) => {
    const force = req.query.refresh === "1";

    if (force) {
      await refreshHubReleases(true);
    } else if (hubReleasesCache.releases.length === 0) {
      await refreshHubReleases(true);
    } else if (Date.now() - hubReleasesCache.lastCheckedAt > 30_000) {
      // Stale-while-revalidate in background
      void refreshHubReleases(false);
    }

    res.setHeader("Cache-Control", "no-cache");
    res.json({
      releases: hubReleasesCache.releases,
      updatedAt: hubReleasesCache.updatedAt,
    });
  });

  // Real-time Server-Sent Events stream for instant release & download count updates
  app.get("/api/releases/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    sseClients.add(res);

    // Send current cache immediately upon connect
    if (hubReleasesCache.releases.length > 0) {
      res.write(
        `data: ${JSON.stringify({
          releases: hubReleasesCache.releases,
          updatedAt: hubReleasesCache.updatedAt,
        })}\n\n`
      );
    }

    // Keep-alive heartbeat every 25s
    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Fast cached documentation endpoint (< 2ms from RAM)
  app.get("/api/docs/:slug", async (req, res) => {
    const slug = req.params.slug;
    const force = req.query.refresh === "1";
    const content = await fetchDocCached(slug, force);

    if (content === null) {
      return res.status(404).json({ content: "" });
    }

    res.setHeader("Cache-Control", "no-cache");
    res.json({
      content,
      updatedAt: docsCache.get(slug.toLowerCase().replace(/[^a-z0-9_\-]/g, ""))?.updatedAt || Date.now(),
    });
  });

  // Legacy GitHub Proxy with Caching & ETag support
  app.get("/api/github/*", async (req, res) => {
    const githubPath = req.originalUrl.replace(/^\/api\/github\//, "");

    // Fast path: serve hub releases from the pre-warmed slimmed store
    if (githubPath.startsWith(`repos/${HUB_REPO}/releases`)) {
      if (hubReleasesCache.releases.length === 0) {
        await refreshHubReleases(true);
      }
      return res.json(hubReleasesCache.releases);
    }

    const cacheKey = githubPath;
    const now = Date.now();
    const cached = githubCache.get(cacheKey);
    if (cached && now - cached.timestamp < GENERIC_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    try {
      const extra: Record<string, string> = {};
      if (cached?.etag) extra["If-None-Match"] = cached.etag;

      const response = await fetchGitHubSmart(`https://api.github.com/${githubPath}`, extra);

      if (response.status === 304 && cached) {
        cached.timestamp = now;
        return res.json(cached.data);
      }

      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`[GitHub Proxy] Status ${response.status} for ${githubPath}`);
        }
        return res.status(response.status).json({
          error: `GitHub error: ${response.status}`,
          path: githubPath,
        });
      }

      const data = await response.json();
      githubCache.set(cacheKey, {
        data,
        etag: response.headers.get("etag"),
        timestamp: now,
      });
      res.json(data);
    } catch (error) {
      console.error(`[GitHub Proxy] Critical Error:`, error);
      res.status(500).json({ error: "Failed to fetch from GitHub" });
    }
  });

  // Same-origin binary download proxy for WBTools releases
  app.get("/api/download", async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
    const fileName =
      typeof req.query.name === "string"
        ? req.query.name.replace(/[^\w.\-]/g, "_")
        : "download";

    const isAllowed =
      rawUrl.startsWith("https://github.com/Hackers-lab/") ||
      rawUrl.startsWith("https://api.github.com/repos/Hackers-lab/") ||
      rawUrl.startsWith("https://objects.githubusercontent.com/");

    if (!isAllowed) {
      return res.status(400).json({ error: "Invalid download source" });
    }

    try {
      const baseHeaders: Record<string, string> = {
        "User-Agent": "Utility-Tools-App",
        Accept: "application/octet-stream",
      };
      const token = !tokenDisabled ? process.env.GITHUB_TOKEN?.trim() : "";
      const authHeaders = token
        ? { ...baseHeaders, Authorization: `token ${token}` }
        : baseHeaders;

      let upstream = await fetch(rawUrl, { headers: authHeaders, redirect: "follow" });
      if (upstream.status === 401 && token) {
        tokenDisabled = true;
        upstream = await fetch(rawUrl, { headers: baseHeaders, redirect: "follow" });
      }

      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status || 502).json({ error: "Download unavailable" });
      }

      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      const contentType = upstream.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      const contentLength = upstream.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const { Readable } = await import("stream");
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (error) {
      console.error("[Download Proxy] Error:", error);
      res.status(500).json({ error: "Failed to stream download" });
    }
  });

  // Diagnostic endpoint
  app.get("/api/diag", (req, res) => {
    res.json({
      env: process.env.NODE_ENV,
      cachedReleases: hubReleasesCache.releases.length,
      cachedDocs: docsCache.size,
      sseClients: sseClients.size,
      lastUpdatedAt: hubReleasesCache.updatedAt
        ? new Date(hubReleasesCache.updatedAt).toISOString()
        : null,
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("Starting server in development mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode");
    const distPath = path.join(process.cwd(), "dist");

    app.get("/logo.png", (req, res) => {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      res.sendFile(logoPath, (err) => {
        if (err) {
          res.sendFile(path.join(process.cwd(), "dist", "logo.png"), (err2) => {
            if (err2) res.status(404).send("Logo not found");
          });
        }
      });
    });

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
