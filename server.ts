import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

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
    const githubPath = req.params[0];
    const cacheKey = githubPath;
    const now = Date.now();

    const cached = githubCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      return res.json(cached.data);
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'WBSEDCL-Tools-App'
      };

      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(`https://api.github.com/${githubPath}`, { headers });
      
      if (!response.ok) {
        // If GitHub returns an error, don't cache it but return it
        return res.status(response.status).json({ error: `GitHub error: ${response.status}` });
      }

      const data = await response.json();
      githubCache.set(cacheKey, { data, timestamp: now });
      res.json(data);
    } catch (error) {
      console.error(`Error proxying to GitHub:`, error);
      res.status(500).json({ error: 'Failed to fetch from GitHub' });
    }
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
