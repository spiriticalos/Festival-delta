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
  [1, 'Hraach',           'Electronic', '/images/uploads/artist-hraach.webp'],
  [2, 'Sabo',             'Electronic', '/images/uploads/artist-sabo.webp'],
  [3, 'Efi',              'Electronic', '/images/uploads/artist-efi.webp'],
  [4, 'Eleez',            'Electronic', '/images/uploads/artist-eleez.webp'],
  [5, 'Emotional Tourist','Electronic', '/images/uploads/artist-emotional-tourist.webp'],
  [7, 'Pascal Junior',    'Electronic', '/images/uploads/artist-pascal-junior.webp'],
].forEach(([id, name, genre, image_path]) => insertArtist.run(id, name, genre, image_path));

// Remove Oscar if still present from old seed
db.prepare('DELETE FROM artists WHERE name = ? AND image_path = ?').run('Oscar', '/images/uploads/artist-oscar.webp');

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
