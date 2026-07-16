/* ============================================================
   SUSAILUM — backend do site
   Express com camadas de segurança:
   - Helmet (headers de segurança + Content-Security-Policy)
   - Rate limiting (global e mais rígido no formulário)
   - Validação e sanitização de entrada
   - Honeypot anti-spam
   - Limite de tamanho de payload
   ============================================================ */
"use strict";

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const MSG_FILE = path.join(DATA_DIR, "messages.json");

app.disable("x-powered-by");
app.set("trust proxy", 1); // atrás de proxy (Render/Railway/Nginx)

/* ---------- Segurança: headers ---------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // scripts inline das páginas
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'", "https://formsubmit.co"],
        frameSrc: ["https://www.youtube-nocookie.com", "https://www.youtube.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

/* ---------- Segurança: rate limiting ---------- */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, // 300 requisições / 15 min / IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5, // 5 mensagens / hora / IP
  message: { error: "Muitas mensagens. Tente novamente mais tarde ou chame no WhatsApp." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ---------- Payload pequeno: formulário não precisa de mais ---------- */
app.use(express.json({ limit: "32kb" }));

/* ---------- Sanitização ---------- */
function clean(str, max) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\u0000-\u001F\u007F]/g, " ") // remove caracteres de controle
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- API: contato ---------- */
app.post("/api/contact", contactLimiter, (req, res) => {
  const b = req.body || {};

  // honeypot: bots preenchem, humanos não veem
  if (b.website) return res.status(200).json({ ok: true });

  const nome = clean(b.nome, 120);
  const email = clean(b.email, 160);
  const assunto = clean(b.assunto, 80);
  const mensagem = clean(b.mensagem, 3000);

  if (!nome || nome.length < 2) return res.status(400).json({ error: "Nome inválido." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "E-mail inválido." });
  if (!mensagem || mensagem.length < 5) return res.status(400).json({ error: "Mensagem muito curta." });

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    quando: new Date().toISOString(),
    nome,
    email,
    assunto,
    mensagem,
  };

  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let all = [];
    if (fs.existsSync(MSG_FILE)) {
      try { all = JSON.parse(fs.readFileSync(MSG_FILE, "utf8")); } catch { all = []; }
    }
    all.push(entry);
    fs.writeFileSync(MSG_FILE, JSON.stringify(all, null, 2));
  } catch (e) {
    console.error("Erro ao salvar mensagem:", e.message);
    return res.status(500).json({ error: "Erro interno. Tente o WhatsApp." });
  }

  // envio opcional por e-mail (configure SMTP_* no .env)
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = require("nodemailer");
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      t.sendMail({
        from: `"Site Susailum" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_TO || "susailumn@gmail.com",
        replyTo: email,
        subject: `[site] ${assunto} — ${nome}`,
        text: `${mensagem}\n\n— ${nome} (${email})`,
      }).catch((e) => console.error("SMTP:", e.message));
    } catch (e) {
      console.error("nodemailer indisponível:", e.message);
    }
  }

  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

/* ---------- URLs limpas: /trabalhos.html -> /trabalhos (301) ---------- */
app.use((req, res, next) => {
  if (req.method === "GET" && /\.html$/.test(req.path)) {
    const clean = req.path.replace(/index\.html$/, "").replace(/\.html$/, "") || "/";
    return res.redirect(301, clean);
  }
  next();
});

/* ---------- Arquivos estáticos do site ---------- */
app.use(
  express.static(SITE_DIR, {
    extensions: ["html"],
    maxAge: "7d",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      if (filePath.endsWith(".mp4")) res.setHeader("Cache-Control", "public, max-age=2592000");
    },
  })
);

/* 404 amigável */
app.use((_req, res) => {
  res.status(404).send('<meta charset="utf-8"><body style="background:#0c0d0d;color:#f4f2ee;font-family:sans-serif;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h1 style="font-size:64px;margin:0">404</h1><p>Essa página não existe.</p><a href="/" style="color:#ddc96d">← voltar pro início</a></div>');
});

app.listen(PORT, () => {
  console.log(`susailum no ar -> http://localhost:${PORT}`);
});
