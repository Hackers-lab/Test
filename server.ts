import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory cache for GitHub API calls
const githubCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  // GitHub Proxy with Caching
  app.get("/api/github/*", async (req, res) => {
    const githubPath = req.originalUrl.replace(/^\/api\/github\//, "");
    const cacheKey = githubPath;
    const now = Date.now();

    const cached = githubCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      return res.json(cached.data);
    }

    try {
      const baseHeaders: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Utility-Tools-App'
      };

      const token = process.env.GITHUB_TOKEN?.trim();
      const authHeaders = token
        ? { ...baseHeaders, 'Authorization': `token ${token}` }
        : baseHeaders;

      let response = await fetch(`https://api.github.com/${githubPath}`, { headers: authHeaders });

      // If configured token is invalid or expired, fall back to unauthenticated request for public repos
      if (response.status === 401 && token) {
        response = await fetch(`https://api.github.com/${githubPath}`, { headers: baseHeaders });
      }

      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`[GitHub Proxy] Status ${response.status} for ${githubPath}`);
        }
        return res.status(response.status).json({
          error: `GitHub error: ${response.status}`,
          path: githubPath
        });
      }

      const data = await response.json();
      githubCache.set(cacheKey, { data, timestamp: now });
      res.json(data);
    } catch (error) {
      console.error(`[GitHub Proxy] Critical Error:`, error);
      res.status(500).json({ error: 'Failed to fetch from GitHub' });
    }
  });

  // Same-origin binary download proxy for WBTools releases
  app.get("/api/download", async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
    const fileName = typeof req.query.name === "string" ? req.query.name.replace(/[^\w.\-]/g, "_") : "download";

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
        "Accept": "application/octet-stream",
      };
      const token = process.env.GITHUB_TOKEN?.trim();
      const authHeaders = token
        ? { ...baseHeaders, "Authorization": `token ${token}` }
        : baseHeaders;

      let upstream = await fetch(rawUrl, { headers: authHeaders, redirect: "follow" });
      if (upstream.status === 401 && token) {
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
      hasToken: !!process.env.GITHUB_TOKEN,
      tokenPrefix: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 4) : null,
      timestamp: new Date().toISOString()
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
    
    // Add logging for production requests to debug 404s
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api')) {
        console.log(`[Prod] Request: ${req.method} ${req.path}`);
      }
      next();
    });

    // Serve logo explicitly to avoid any static serving issues
    app.get("/logo.png", (req, res) => {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      res.sendFile(logoPath, (err) => {
        if (err) {
          // Fallback to dist if public fails
          res.sendFile(path.join(process.cwd(), "dist", "logo.png"), (err2) => {
             if (err2) res.status(404).send("Logo not found");
          });
        }
      });
    });

    // Serve static files first
    app.use(express.static(distPath));

    // Handle SPA fallback for all other routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
