require('dotenv').config();
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const session  = require('express-session');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const sharp    = require('sharp');
const db       = require('./db');

const app         = express();
const PORT        = process.env.PORT || 3000;
const EMAILS_FILE = path.join(__dirname, 'emails.txt');
const UPLOADS_DIR = path.join(__dirname, 'public/images/uploads');

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
const loginAttempts = new Map();
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
  },
}));
app.use(express.static(path.join(__dirname, 'public')));

// ── isAdmin middleware ──────────────────────────────────────
function isAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin');
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
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin?error=1');
});

app.get('/admin/dashboard', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin/dashboard.html'));
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

// ══════════════════════════════════════════════════════════
// PUBLIC API ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/artists', (req, res) => {
  res.json(db.prepare('SELECT * FROM artists ORDER BY created_at DESC').all());
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

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email invalid.' });
  }
  fs.appendFile(EMAILS_FILE, email + '\n', err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// ══════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ══════════════════════════════════════════════════════════

// Artists
app.post('/api/artists', isAdmin, upload.single('image'), async (req, res) => {
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

app.delete('/api/artists/:id', isAdmin, (req, res) => {
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(req.params.id);
  if (!artist) return res.status(404).json({ error: 'Not found' });
  if (artist.image_path) {
    try { fs.unlinkSync(path.join(__dirname, 'public', artist.image_path)); } catch (_) {}
  }
  db.prepare('DELETE FROM artists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Gallery
app.post('/api/gallery', isAdmin, upload.single('image'), async (req, res) => {
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

app.delete('/api/gallery/:id', isAdmin, (req, res) => {
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

app.post('/api/announcements', isAdmin, (req, res) => {
  const { title, body } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  try {
    const r = db.prepare('INSERT INTO announcements (title, body, active) VALUES (?, ?, 1)').run(title.trim(), body || null);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Database error.' });
  }
});

app.delete('/api/announcements/:id', isAdmin, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/announcements/:id/toggle', isAdmin, (req, res) => {
  db.prepare('UPDATE announcements SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id));
});

// Settings
app.patch('/api/settings/:key', isAdmin, (req, res) => {
  const { value } = req.body;
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, req.params.key);
  res.json({ success: true });
});

// ── Email export ────────────────────────────────────────────
app.get('/api/emails/export', isAdmin, (req, res) => {
  if (!fs.existsSync(EMAILS_FILE)) return res.status(404).json({ error: 'No emails yet.' });
  res.download(EMAILS_FILE, 'emails-bohemians.txt');
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
