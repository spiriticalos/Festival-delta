require('dotenv').config();
const express      = require('express');
const path         = require('path');
const fs           = require('fs');
const crypto       = require('crypto');
const session      = require('express-session');
const bcrypt       = require('bcryptjs');
const multer       = require('multer');
const sharp        = require('sharp');
const compression  = require('compression');
const nodemailer   = require('nodemailer');
const helmet       = require('helmet');
const db           = require('./db');
const i18n         = require('./i18n');
const llms         = require('./llms');

const app         = express();
const PORT        = process.env.PORT || 3000;
const IS_PROD     = process.env.NODE_ENV === 'production';
const EMAILS_FILE = IS_PROD ? '/data/emails.txt'   : path.join(__dirname, 'emails.txt');
const UPLOADS_DIR = IS_PROD ? '/data/uploads'      : path.join(__dirname, 'public/images/uploads');

// ── Mailer (optional — only active when SMTP_HOST is set) ───
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (IS_PROD) {
    const initial = path.join(__dirname, 'public/images/uploads');
    if (fs.existsSync(initial)) {
      fs.readdirSync(initial).forEach(f => {
        const dest = path.join(UPLOADS_DIR, f);
        if (!fs.existsSync(dest)) fs.copyFileSync(path.join(initial, f), dest);
      });
    }
  }
}

// Hash admin password once at startup
const ADMIN_USER      = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = bcrypt.hashSync(process.env.ADMIN_PASS || 'changeme123', 10);

// ── Multer ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  // SEO-friendly names from the form fields sent before the file (gallery caption / artist name)
  filename: (req, file, cb) => {
    const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    const label = slug(req.body.caption || (req.body.name && 'artist ' + req.body.name) || req.body.section);
    const unique = Date.now().toString(36);
    cb(null, ['bohemians-festival', label, unique].filter(Boolean).join('-') + path.extname(file.originalname).toLowerCase());
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// ── Convert upload to WebP ──────────────────────────────────
async function processUpload(file) {
  const ext = path.extname(file.filename).toLowerCase();
  if (ext === '.webp') return `/images/uploads/${file.filename}`;
  const webpName = file.filename.replace(/\.[^.]+$/, '.webp');
  const webpPath = path.join(UPLOADS_DIR, webpName);
  try {
    await sharp(file.path).webp({ quality: 82 }).toFile(webpPath);
    try { fs.unlinkSync(file.path); } catch (_) {}
    return `/images/uploads/${webpName}`;
  } catch (_) {
    return `/images/uploads/${file.filename}`;
  }
}

// ── Rate limit (login) ──────────────────────────────────────
const loginAttempts     = new Map();
const subscribeAttempts = new Map();

function subscribeLimit(req, res, next) {
  const ip  = req.ip;
  const now = Date.now();
  const rec = subscribeAttempts.get(ip) || { count: 0, first: now };
  if (now - rec.first > 60 * 60 * 1000) {
    subscribeAttempts.set(ip, { count: 1, first: now });
    return next();
  }
  if (rec.count >= 5) {
    return res.status(429).json({ success: false, error: 'Too many requests.' });
  }
  rec.count++;
  subscribeAttempts.set(ip, rec);
  next();
}
function rateLimit(req, res, next) {
  const ip  = req.ip;
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, first: now };
  if (now - rec.first > 10 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, first: now });
    return next();
  }
  if (rec.count >= 5) {
    return res.status(429).send('Prea multe încercări. Revino în 10 minute.');
  }
  rec.count++;
  loginAttempts.set(ip, rec);
  next();
}

// ── www → non-www redirect ──────────────────────────────────
if (IS_PROD) {
  app.use((req, res, next) => {
    if (req.hostname.startsWith('www.')) {
      return res.redirect(301, `https://thebohemiansociety.ro${req.url}`);
    }
    next();
  });
}

// ── Permissions-Policy (applied to all routes) ─────────────
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'interest-cohort=()',
  ].join(', '));
  next();
});

// ── CSP (custom per-route — Helmet's default CSP is disabled above) ─
app.use((req, res, next) => {
  // Admin panel has inline scripts — no CSP (already protected by auth)
  if (req.path.startsWith('/admin')) return next();

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://img.youtube.com https://www.google-analytics.com https://stats.g.doubleclick.net",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  next();
});

// ── Gzip compression ────────────────────────────────────────
app.use(compression());

// ── Security headers (Helmet) ───────────────────────────────
app.use(helmet({
  contentSecurityPolicy:      false, // set manually per-route below
  crossOriginEmbedderPolicy:  false, // required for YouTube / Google Maps iframes
}));

// ── Core middleware ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   4 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}));
// Images renamed for SEO — old URLs keep working
const RENAMED_IMAGES = {
  '/images/hero-bg.webp':               '/images/bohemians-festival-crowd-sunflower-stage-night.webp',
  '/images/hero-bg-mobile.webp':        '/images/bohemians-festival-crowd-sunflower-stage-night-mobile.webp',
  '/images/baza-5-transparent.webp':    '/images/the-bohemians-festival-logo.webp',
  '/images/baza-5-transparent.png':     '/images/the-bohemians-festival-logo.png',
};
app.use((req, res, next) => RENAMED_IMAGES[req.path] ? res.redirect(301, RENAMED_IMAGES[req.path]) : next());

// Images cached 30 days, JS/CSS 7 days, HTML no-cache
if (IS_PROD) {
  app.use('/images/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', immutable: true }));
}
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '30d', immutable: true,
}));
app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: '7d' }));
app.use('/js',  express.static(path.join(__dirname, 'public/js'),  { maxAge: '7d' }));
// Homepage in EN (/) and RO (/ro/) from views/index.html + lang/*.json.
// Lineup is server-rendered so crawlers that don't run JS (AI bots) see artist names.
const escHtml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function lineupHtml(lang) {
  try {
    const artists = db.prepare('SELECT name, image_path FROM artists ORDER BY name ASC').all();
    if (!artists.length) return null;
    const altSuffix = i18n.STRINGS[lang]['js.artistAlt'];
    return artists.map(a => `
          <div class="lineup-card lineup-card--artist">
            ${a.image_path
              ? `<img src="${escHtml(a.image_path)}" alt="${escHtml(a.name + ' — ' + altSuffix)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
              : `<div style="width:100%;height:100%;background:var(--bg-card);"></div>`}
            <div class="lineup-card-name"><span class="lineup-card-title">${escHtml(a.name)}</span></div>
          </div>`).join('');
  } catch (e) {
    return null; // DB unavailable — serve placeholders, JS will retry
  }
}

const sendPage = lang => (req, res) =>
  res.set('Cache-Control', 'public, max-age=0').type('html').send(i18n.render(lang, lineupHtml(lang)));

app.use((req, res, next) => {
  if (req.path === '/ro') return res.redirect(301, '/ro/' + req.url.slice(3));
  next();
});
app.get(['/', '/index.html'], sendPage('en'));
app.get(['/ro/', '/ro/index.html'], sendPage('ro'));

// llms.txt / llms-full.txt for AI crawlers, generated from the same texts as the pages
function artistNames() {
  try { return db.prepare('SELECT name FROM artists ORDER BY name ASC').all().map(a => a.name); }
  catch (e) { return []; }
}
const sendText = build => (req, res) =>
  res.set('Cache-Control', 'public, max-age=0').type('text/plain; charset=utf-8').send(build());

app.get('/llms.txt',          sendText(() => llms.summary('en', artistNames())));
app.get('/ro/llms.txt',       sendText(() => llms.summary('ro', artistNames())));
app.get('/llms-full.txt',     sendText(() => llms.full('en', lineupHtml('en'))));
app.get('/ro/llms-full.txt',  sendText(() => llms.full('ro', lineupHtml('ro'))));

// Sitemap with hreflang alternates and every image (page images + gallery + artists from the DB)
const SITE = 'https://thebohemiansociety.ro';
const SITEMAP_LASTMOD = new Date().toISOString().slice(0, 10);

app.get('/sitemap.xml', (req, res) => {
  const pageImages = i18n.TEMPLATE.match(/\/images\/[\w\-/.]+\.(?:webp|jpg|png)/g) || [];
  let dbImages = [];
  try {
    dbImages = [
      ...db.prepare('SELECT image_path FROM gallery WHERE image_path IS NOT NULL').all(),
      ...db.prepare('SELECT image_path FROM artists WHERE image_path IS NOT NULL').all(),
    ].map(r => r.image_path);
  } catch (e) {}
  const images = [...new Set([...pageImages, ...dbImages])]
    .filter(p => !/-600\.webp$|pwa-icon/.test(p))
    .map(p => `    <image:image><image:loc>${SITE}${escHtml(p)}</image:loc></image:image>`)
    .join('\n');
  const alternates = [['en', '/'], ['ro', '/ro/'], ['x-default', '/']]
    .map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${p}" />`)
    .join('\n');
  const page = loc => `  <url>\n    <loc>${SITE}${loc}</loc>\n${alternates}\n    <lastmod>${SITEMAP_LASTMOD}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n${images}\n  </url>`;

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${page('/')}
${page('/ro/')}
  <url>
    <loc>${SITE}/cookie-policy.html</loc>
    <lastmod>2026-04-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
`);
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));

// ── isAdmin middleware ──────────────────────────────────────
function isAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin');
}

// ── CSRF middleware ─────────────────────────────────────────
function csrfProtect(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }
  next();
}

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

app.get('/admin', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, 'admin/index.html'));
});

app.post('/admin/login', rateLimit, async (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && await bcrypt.compare(password, ADMIN_PASS_HASH)) {
    req.session.admin = true;
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin?error=1');
});

app.get('/api/csrf-token', isAdmin, (req, res) => {
  res.json({ token: req.session.csrfToken });
});

app.get('/admin/dashboard', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin/dashboard.html'));
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()), ts: Date.now() });
});

// ══════════════════════════════════════════════════════════
// PUBLIC API ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/artists', (req, res) => {
  res.json(db.prepare('SELECT * FROM artists ORDER BY name ASC').all());
});

app.get('/api/gallery', (req, res) => {
  res.json(db.prepare('SELECT * FROM gallery ORDER BY created_at DESC').all());
});

app.get('/api/gallery/:section', (req, res) => {
  res.json(db.prepare('SELECT * FROM gallery WHERE section = ? ORDER BY created_at DESC').all(req.params.section));
});

app.get('/api/announcements/active', (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC').all());
});

let reviewsCache = { data: null, ts: 0 };
const REVIEWS_CACHE_MS = 24 * 60 * 60 * 1000;

app.get('/api/reviews', async (req, res) => {
  const { GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID } = process.env;
  if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) {
    return res.json({ rating: null, total: 0, reviews: [] });
  }

  if (reviewsCache.data && Date.now() - reviewsCache.ts < REVIEWS_CACHE_MS) {
    return res.json(reviewsCache.data);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${GOOGLE_PLACE_ID}&fields=rating,user_ratings_total,reviews&key=${GOOGLE_PLACES_API_KEY}`;
    const json = await fetch(url).then(r => r.json());
    const result = json.result || {};
    const data = {
      rating: result.rating || null,
      total: result.user_ratings_total || 0,
      reviews: (result.reviews || []).map(rv => ({
        author: rv.author_name,
        rating: rv.rating,
        text: rv.text,
        time: rv.relative_time_description
      }))
    };
    reviewsCache = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    res.json(reviewsCache.data || { rating: null, total: 0, reviews: [] });
  }
});

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const obj  = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

app.post('/api/subscribe', subscribeLimit, (req, res) => {
  const { email } = req.body;
  const t = i18n.STRINGS[i18n.LANGS.includes(req.body.lang) ? req.body.lang : 'en'];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email invalid.' });
  }
  fs.appendFile(EMAILS_FILE, email + '\n', err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
    // Send confirmation email if SMTP is configured
    if (mailer) {
      mailer.sendMail({
        from:    `"The Bohemians Festival" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: t['email.subject'],
        text:    t['email.text'],
        html:    t['email.html'],
      }).catch(() => {}); // fire and forget — never block the response
    }
  });
});

// ══════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ══════════════════════════════════════════════════════════

// Artists
app.post('/api/artists', isAdmin, csrfProtect, upload.single('image'), async (req, res) => {
  const { name, genre } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  const image_path = req.file ? await processUpload(req.file) : null;
  try {
    const r = db.prepare('INSERT INTO artists (name, genre, image_path) VALUES (?, ?, ?)').run(name.trim(), genre || null, image_path);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Database error.' });
  }
});

app.delete('/api/artists/:id', isAdmin, csrfProtect, (req, res) => {
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(req.params.id);
  if (!artist) return res.status(404).json({ error: 'Not found' });
  if (artist.image_path) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(artist.image_path))); } catch (_) {}
  }
  db.prepare('DELETE FROM artists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Gallery
app.post('/api/gallery', isAdmin, csrfProtect, upload.single('image'), async (req, res) => {
  const { section, caption, caption_ro } = req.body;
  if (!section || !section.trim()) return res.status(400).json({ error: 'Section is required.' });
  const image_path = req.file ? await processUpload(req.file) : null;
  try {
    const r = db.prepare('INSERT INTO gallery (section, image_path, caption, caption_ro) VALUES (?, ?, ?, ?)').run(section.trim(), image_path, caption || null, caption_ro || null);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Database error.' });
  }
});

app.delete('/api/gallery/:id', isAdmin, csrfProtect, (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.image_path) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(item.image_path))); } catch (_) {}
  }
  db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Announcements
app.get('/api/announcements', isAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all());
});

app.post('/api/announcements', isAdmin, csrfProtect, (req, res) => {
  const { title, body, title_ro, body_ro } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!title_ro || !title_ro.trim()) return res.status(400).json({ error: 'Romanian title is required.' });
  try {
    const r = db.prepare('INSERT INTO announcements (title, body, title_ro, body_ro, active) VALUES (?, ?, ?, ?, 1)').run(title.trim(), body || null, title_ro.trim(), body_ro || null);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Database error.' });
  }
});

app.delete('/api/announcements/:id', isAdmin, csrfProtect, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/announcements/:id/toggle', isAdmin, csrfProtect, (req, res) => {
  db.prepare('UPDATE announcements SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id));
});

// Settings
app.patch('/api/settings/:key', isAdmin, csrfProtect, (req, res) => {
  const { value } = req.body;
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, req.params.key);
  res.json({ success: true });
});

// ── Email export ────────────────────────────────────────────
app.get('/api/emails/export', isAdmin, (req, res) => {
  if (!fs.existsSync(EMAILS_FILE)) return res.status(404).json({ error: 'No emails yet.' });
  res.download(EMAILS_FILE, 'emails-bohemians.txt');
});

// ── DB backup ───────────────────────────────────────────────
app.get('/api/db/backup', isAdmin, async (req, res) => {
  const backupPath = path.join(__dirname, `festival-backup-${Date.now()}.db`);
  try {
    await db.backup(backupPath);
    res.download(backupPath, 'festival-backup.db', err => {
      try { fs.unlinkSync(backupPath); } catch (_) {}
    });
  } catch (e) {
    res.status(500).json({ error: 'Backup failed.' });
  }
});

// ── Countdown image (used in newsletter emails) ─────────────
app.get('/countdown.png', async (req, res) => {
  const row    = db.prepare("SELECT value FROM settings WHERE key = 'festival_date'").get();
  const target = new Date(row ? row.value : 0);
  const diff   = Math.max(0, target - Date.now());
  const days   = Math.floor(diff / 86400000);
  const hours  = Math.floor((diff % 86400000) / 3600000);
  const mins   = Math.floor((diff % 3600000)  / 60000);

  const pad = n => String(n).padStart(2, '0');
  const W = 480, H = 110;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#2a1810"/>

    <!-- Days -->
    <text x="80"  y="58" font-family="Georgia,serif" font-size="46" font-weight="bold"
          fill="#f5ede3" text-anchor="middle">${pad(days)}</text>
    <text x="80"  y="88" font-family="Arial,sans-serif" font-size="11" letter-spacing="3"
          fill="#D4845A" text-anchor="middle">DAYS</text>

    <!-- separator -->
    <text x="160" y="56" font-family="Georgia,serif" font-size="40" fill="#D4845A" text-anchor="middle">·</text>

    <!-- Hours -->
    <text x="240" y="58" font-family="Georgia,serif" font-size="46" font-weight="bold"
          fill="#f5ede3" text-anchor="middle">${pad(hours)}</text>
    <text x="240" y="88" font-family="Arial,sans-serif" font-size="11" letter-spacing="3"
          fill="#D4845A" text-anchor="middle">HOURS</text>

    <!-- separator -->
    <text x="320" y="56" font-family="Georgia,serif" font-size="40" fill="#D4845A" text-anchor="middle">·</text>

    <!-- Minutes -->
    <text x="400" y="58" font-family="Georgia,serif" font-size="46" font-weight="bold"
          fill="#f5ede3" text-anchor="middle">${pad(mins)}</text>
    <text x="400" y="88" font-family="Arial,sans-serif" font-size="11" letter-spacing="3"
          fill="#D4845A" text-anchor="middle">MINS</text>
  </svg>`;

  try {
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    res.send(buf);
  } catch (e) {
    res.status(500).end();
  }
});

// ── 410 Gone pentru path-uri WordPress (deindexare mai rapida) ──
app.use((req, res, next) => {
  if (/^\/(wp-content|wp-admin|wp-includes|wp-login\.php)/.test(req.path)) {
    return res.status(410).end();
  }
  next();
});

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// ══════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`The Bohemians Festival → http://localhost:${PORT}`);
  console.log(`Admin panel           → http://localhost:${PORT}/admin`);
});

// ── Automated daily DB backup at 03:00 server time ─────────
function scheduleDailyBackup() {
  const now   = new Date();
  const next  = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const msUntil = next - now;

  setTimeout(async () => {
    const backupDir  = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    const backupFile = path.join(backupDir, `festival-${new Date().toISOString().slice(0, 10)}.db`);
    try {
      await db.backup(backupFile);
      // Keep only last 7 backups
      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .sort()
        .reverse();
      files.slice(7).forEach(f => { try { fs.unlinkSync(path.join(backupDir, f)); } catch (_) {} });
      console.log(`[backup] DB backed up → ${backupFile}`);
    } catch (e) {
      console.error('[backup] Failed:', e.message);
    }
    scheduleDailyBackup(); // schedule next day
  }, msUntil);
}
scheduleDailyBackup();
