import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("signups.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/signup", (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    try {
      const stmt = db.prepare("INSERT INTO signups (email) VALUES (?)");
      stmt.run(email);
      res.json({ success: true, message: "Signed up successfully!" });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT") {
        return res.json({ success: true, message: "You're already on the list!" });
      }
      console.error("Signup error:", err);
      res.status(500).json({ error: "Failed to sign up" });
    }
  });

  // Admin route to view logs (Simple for developer)
  app.get("/api/admin/logs", (req, res) => {
    // In a real app, this would be protected by auth
    const rows = db.prepare("SELECT * FROM signups ORDER BY created_at DESC").all();
    res.json(rows);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
