const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/festival.db'
  : path.join(__dirname, 'festival.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS artists (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    genre      TEXT,
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    section    TEXT NOT NULL,
    image_path TEXT,
    caption    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    body       TEXT,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
[
  ['tickets_remaining', '380'],
  ['early_bird_active', '0'],
  ['festival_date',     '2026-06-18T12:00:00'],
].forEach(([k, v]) => insertSetting.run(k, v));

// ── Seed artists (by name — never creates duplicates) ──────
const insertArtist = db.prepare(
  'INSERT INTO artists (name, genre, image_path) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name = ?)'
);
[
  ['Hraach',           'Electronic', '/images/uploads/artist-hraach.webp'],
  ['Sabo',             'Electronic', '/images/uploads/artist-sabo.webp'],
  ['Efi',              'Electronic', '/images/uploads/artist-efi.webp'],
  ['Eleez',            'Electronic', '/images/uploads/artist-eleez.webp'],
  ['Emotional Tourist','Electronic', '/images/uploads/artist-emotional-tourist.webp'],
  ['Pascal Junior',    'Electronic', '/images/uploads/artist-pascal-junior.webp'],
  ['Afgo & Lemon',    'Electronic', '/images/uploads/artist-afgo-lemon.webp'],
  ['Brad Brunner',    'Electronic', '/images/uploads/artist-brad-brunner.webp'],
  ['Dobrikan',        'Electronic', '/images/uploads/artist-dobrikan.webp'],
  ['Optick',          'Electronic', '/images/uploads/artist-optick.webp'],
  ['Rhem',            'Electronic', '/images/uploads/artist-rhem.webp'],
  ['Sahar Z',         'Electronic', '/images/uploads/artist-sahar-z.webp'],
  ['Shai T',          'Electronic', '/images/uploads/artist-shai-t.webp'],
  ['Emann',           'Electronic', '/images/uploads/artist-emann.webp'],
  ['Kristopher',      'Electronic', '/images/uploads/artist-kristopher.webp'],
  ['Zamfirov',        'Electronic', '/images/uploads/artist-zamfirov.webp'],
].forEach(([name, genre, image_path]) => insertArtist.run(name, genre, image_path, name));

// Remove Oscar if still present from old seed
db.prepare("DELETE FROM artists WHERE name = 'Oscar'").run();

// ── Seed gallery ───────────────────────────────────────────
const insertGallery = db.prepare(
  'INSERT OR IGNORE INTO gallery (id, section, image_path, caption) VALUES (?, ?, ?, ?)'
);
[
  [1,  'escape',   '/images/uploads/bohemians-festival-main-stage-floral-night.webp',    'Main stage'],
  [2,  'nature',   '/images/uploads/bohemians-festival-delta-bikes-sunset.webp',          'Delta at sunset'],
  [3,  'escape',   '/images/uploads/bohemians-festival-dj-red-lights-night.webp',         'Red lights'],
  [4,  'nature',   '/images/uploads/bohemians-festival-kayak-danube-sunset.webp',         'Kayak on the Danube'],
  [5,  'escape',   '/images/uploads/bohemians-festival-crowd-hands-blue-lights.webp',     'Hands up'],
  [6,  'community','/images/uploads/bohemians-festival-friends-boat-arrival.webp',        'Arriving by boat'],
  [7,  'escape',   '/images/uploads/bohemians-festival-dj-inside-red-venue.webp',         'Inside the venue'],
  [8,  'community','/images/uploads/bohemians-festival-fans-waiting-port.webp',           'At the port'],
  [9,  'escape',   '/images/uploads/bohemians-festival-blue-laser-show.webp',             'Laser show'],
  [10, 'nature',   '/images/uploads/bohemians-festival-wooden-deck-river.webp',           'River deck'],
  [11, 'escape',   '/images/uploads/bohemians-festival-dj-crowd-warm-light.webp',         'DJ set'],
  [12, 'nature',   '/images/uploads/bohemians-festival-outdoor-dj-grass.webp',            'Outdoor stage'],
  [13, 'escape',   '/images/uploads/bohemians-festival-wooden-venue-crowd-night.webp',    'Night crowd'],
  [14, 'nature',   '/images/uploads/bohemians-festival-speedboat-danube.webp',            'Speedboat on the Danube'],
  [15, 'escape',   '/images/uploads/bohemians-festival-thatched-roof-venue-night.webp',   'Under the moon'],
  [16, 'nature',   '/images/uploads/bohemians-festival-danube-sunset-boat.webp',          'Danube sunset'],
  [17, 'community','/images/uploads/bohemians-festival-dj-stage-crowd-red.webp',          'Stage energy'],
  [18, 'community','/images/uploads/bohemians-festival-aperol-good-vibes-night.webp',     'Good Vibes'],
  [19, 'community','/images/uploads/bohemians-festival-dancing-girls-blackwhite.webp',    'Moving together'],
  [20, 'community','/images/uploads/bohemians-festival-couple-kiss-red-light.webp',       'Good night'],
  [21, 'community','/images/uploads/bohemians-festival-hands-up-red-glow.webp',           'Hands up'],
  [22, 'community','/images/uploads/bohemians-festival-woman-dancing-hat.webp',           'Free spirit'],
  [23, 'community','/images/uploads/bohemians-festival-bohemian-woman-red.webp',          'Bohemian soul'],
].forEach(([id, section, image_path, caption]) => insertGallery.run(id, section, image_path, caption));

module.exports = db;
