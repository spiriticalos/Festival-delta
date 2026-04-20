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

const app         = express();
const PORT        = process.env.PORT || 3000;
const EMAILS_FILE = path.join(__dirname, 'emails.txt');
const UPLOADS_DIR = path.join(__dirname, 'public/images/uploads');

// ── Mailer (optional — only active when SMTP_HOST is set) ───
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Hash admin password once at startup
const ADMIN_USER      = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = bcrypt.hashSync(process.env.ADMIN_PASS || 'changeme123', 10);

// ── Multer ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
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

// ── CSP (custom per-route — Helmet's default CSP is disabled above) ─
app.use((req, res, next) => {
  // Admin panel has inline scripts — no CSP (already protected by auth)
  if (req.path.startsWith('/admin')) return next();

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://img.youtube.com",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com",
    "connect-src 'self'",
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
// Images cached 30 days, JS/CSS 7 days, HTML no-cache
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '30d', immutable: true,
}));
app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: '7d' }));
app.use('/js',  express.static(path.join(__dirname, 'public/js'),  { maxAge: '7d' }));
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

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const obj  = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

app.post('/api/subscribe', subscribeLimit, (req, res) => {
  const { email } = req.body;
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
        subject: 'You\'re on the list — The Bohemians Festival 2026',
        text:    'Thank you for subscribing. You\'ll be the first to know when we announce the artists.\n\nSee you at the Delta,\nThe Bohemians Team',
        html:    `<p>Thank you for subscribing.</p><p>You'll be the first to know when we announce the artists.</p><p>See you at the Delta,<br><strong>The Bohemians Team</strong></p>`,
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
    try { fs.unlinkSync(path.join(__dirname, 'public', artist.image_path)); } catch (_) {}
  }
  db.prepare('DELETE FROM artists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Gallery
app.post('/api/gallery', isAdmin, csrfProtect, upload.single('image'), async (req, res) => {
  const { section, caption } = req.body;
  if (!section || !section.trim()) return res.status(400).json({ error: 'Section is required.' });
  const image_path = req.file ? await processUpload(req.file) : null;
  try {
    const r = db.prepare('INSERT INTO gallery (section, image_path, caption) VALUES (?, ?, ?)').run(section.trim(), image_path, caption || null);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Database error.' });
  }
});

app.delete('/api/gallery/:id', isAdmin, csrfProtect, (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.image_path) {
    try { fs.unlinkSync(path.join(__dirname, 'public', item.image_path)); } catch (_) {}
  }
  db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Announcements
app.get('/api/announcements', isAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all());
});

app.post('/api/announcements', isAdmin, csrfProtect, (req, res) => {
  const { title, body } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  try {
    const r = db.prepare('INSERT INTO announcements (title, body, active) VALUES (?, ?, 1)').run(title.trim(), body || null);
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
  const target = new Date('2026-06-18T18:00:00+03:00');
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
