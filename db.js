const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'festival.db'));

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

// ── Seed artists ───────────────────────────────────────────
const insertArtist = db.prepare(
  'INSERT OR IGNORE INTO artists (id, name, genre, image_path) VALUES (?, ?, ?, ?)'
);
[
  [1, 'Hraach',           'Electronic', '/images/uploads/artist-hraach.jpg'],
  [2, 'Sabo',             'Electronic', '/images/uploads/artist-sabo.jpg'],
  [3, 'Efi',              'Electronic', '/images/uploads/artist-efi.jpg'],
  [4, 'Eleez',            'Electronic', '/images/uploads/artist-eleez.jpg'],
  [5, 'Emotional Tourist','Electronic', '/images/uploads/artist-emotional-tourist.jpg'],
  [6, 'Oscar',            'Electronic', null],
  [7, 'Pascal Junior',    'Electronic', '/images/uploads/artist-pascal-junior.jpg'],
].forEach(([id, name, genre, image_path]) => insertArtist.run(id, name, genre, image_path));

// ── Seed gallery ───────────────────────────────────────────
const insertGallery = db.prepare(
  'INSERT OR IGNORE INTO gallery (id, section, image_path, caption) VALUES (?, ?, ?, ?)'
);
[
  [1,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-sunrise.jpg',   'Sunrise over the Delta'],
  [2,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-landscape.jpg', 'Delta landscape'],
  [3,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-water.jpg',     'Delta waters'],
  [4,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-reeds.jpg',     'Reed beds'],
  [5,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-sunset.jpg',    'Delta sunset'],
  [6,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-birds.jpg',     'Wild birds'],
  [7,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-beach.jpg',     'River beach'],
  [8,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-river.jpg',     'The Danube'],
  [9,  'nature',   '/images/uploads/bohemians-festival-danube-delta-nature-forest.jpg',    'Delta forest'],
  [10, 'escape',   '/images/uploads/bohemians-festival-stage-art-installation-night.jpg',  'Art installation'],
  [11, 'escape',   '/images/uploads/bohemians-festival-dj-set-red-lights-night.jpg',       'DJ set'],
  [12, 'escape',   '/images/uploads/bohemians-festival-laser-lights-electronic-music.jpg', 'Laser lights'],
  [13, 'escape',   '/images/uploads/bohemians-festival-dj-crowd-dance-floor.jpg',          'Dance floor'],
  [14, 'escape',   '/images/uploads/bohemians-festival-main-stage-crowd-sunset.jpg',       'Main stage sunset'],
  [15, 'community','/images/uploads/bohemians-festival-boat-party-danube-dj.jpg',          'Boat party'],
  [16, 'community','/images/uploads/bohemians-festival-people-dancing-neon-lights.jpg',    'Dancing'],
  [17, 'community','/images/uploads/bohemians-festival-girls-dancing-black-white.jpg',     'Moving together'],
  [18, 'community','/images/uploads/bohemians-festival-crowd-hands-up-red-lights.jpg',     'Hands up'],
  [19, 'community','/images/uploads/bohemians-festival-woman-dancing-hat-smoke.jpg',       'Free spirit'],
  [24, 'community','/images/uploads/bohemians-festival-aperol-spritz-good-vibes-night.jpg','Good Vibes — Aperol Spritz'],
].forEach(([id, section, image_path, caption]) => insertGallery.run(id, section, image_path, caption));

module.exports = db;
