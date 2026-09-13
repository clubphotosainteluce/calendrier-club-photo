// server.js
// Serveur minimal (aucune dépendance externe) qui :
//  - sert les fichiers du dossier public/ (la page d'abonnement)
//  - expose la clé publique VAPID à la page
//  - enregistre chaque nouvel abonnement dans subscriptions.json
//  - expose un point d'entrée sécurisé pour déclencher la vérification
//    quotidienne depuis un service externe gratuit (cron-job.org)
//
// À lancer avec : VAPID_PUBLIC_KEY=... node server.js

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const SUBSCRIPTIONS_FILE = path.join(__dirname, "subscriptions.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
};

function loadSubscriptions() {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveSubscription(sub) {
  const subs = loadSubscriptions();
  // Évite les doublons (un même appareil peut se réabonner)
  const filtered = subs.filter((s) => s.endpoint !== sub.endpoint);
  filtered.push(sub);
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(filtered, null, 2));
}

function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.url === "/" ? "index.html" : req.url);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Interdit");
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end("Introuvable");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/run-check")) {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const secret = reqUrl.searchParams.get("secret");

    if (!process.env.CHECK_SECRET || secret !== process.env.CHECK_SECRET) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "Clé secrète invalide" }));
    }

    const { runCheck } = require("./check-calendar");
    runCheck()
      .then((result) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, result }));
      })
      .catch((err) => {
        console.error("Erreur lors de la vérification :", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      });
    return;
  }

  if (req.method === "GET" && req.url === "/api/vapid-public-key") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ publicKey: process.env.VAPID_PUBLIC_KEY || "" }));
  }

  if (req.method === "POST" && req.url === "/api/subscribe") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const subscription = JSON.parse(body);
        saveSubscription(subscription);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn("⚠️  VAPID_PUBLIC_KEY n'est pas définie (voir generate-vapid-keys.js)");
  }
});
