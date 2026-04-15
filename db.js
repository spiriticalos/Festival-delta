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
  [1,  'escape',   '/images/uploads/bohemians-festival-main-stage-floral-night.jpg',    'Main stage'],
  [2,  'nature',   '/images/uploads/bohemians-festival-delta-bikes-sunset.jpg',          'Delta at sunset'],
  [3,  'escape',   '/images/uploads/bohemians-festival-dj-red-lights-night.jpg',         'Red lights'],
  [4,  'nature',   '/images/uploads/bohemians-festival-kayak-danube-sunset.jpg',         'Kayak on the Danube'],
  [5,  'escape',   '/images/uploads/bohemians-festival-crowd-hands-blue-lights.jpg',     'Hands up'],
  [6,  'community','/images/uploads/bohemians-festival-friends-boat-arrival.jpg',        'Arriving by boat'],
  [7,  'escape',   '/images/uploads/bohemians-festival-dj-inside-red-venue.jpg',         'Inside the venue'],
  [8,  'community','/images/uploads/bohemians-festival-fans-waiting-port.jpg',           'At the port'],
  [9,  'escape',   '/images/uploads/bohemians-festival-blue-laser-show.jpg',             'Laser show'],
  [10, 'nature',   '/images/uploads/bohemians-festival-wooden-deck-river.jpg',           'River deck'],
  [11, 'escape',   '/images/uploads/bohemians-festival-dj-crowd-warm-light.jpg',         'DJ set'],
  [12, 'nature',   '/images/uploads/bohemians-festival-outdoor-dj-grass.jpg',            'Outdoor stage'],
  [13, 'escape',   '/images/uploads/bohemians-festival-wooden-venue-crowd-night.jpg',    'Night crowd'],
  [14, 'nature',   '/images/uploads/bohemians-festival-speedboat-danube.jpg',            'Speedboat on the Danube'],
  [15, 'escape',   '/images/uploads/bohemians-festival-thatched-roof-venue-night.jpg',   'Under the moon'],
  [16, 'nature',   '/images/uploads/bohemians-festival-danube-sunset-boat.jpg',          'Danube sunset'],
  [17, 'community','/images/uploads/bohemians-festival-dj-stage-crowd-red.jpg',          'Stage energy'],
  [18, 'community','/images/uploads/bohemians-festival-aperol-good-vibes-night.jpg',     'Good Vibes'],
  [19, 'community','/images/uploads/bohemians-festival-dancing-girls-blackwhite.jpg',    'Moving together'],
  [20, 'community','/images/uploads/bohemians-festival-couple-kiss-red-light.jpg',       'Good night'],
  [21, 'community','/images/uploads/bohemians-festival-hands-up-red-glow.jpg',           'Hands up'],
  [22, 'community','/images/uploads/bohemians-festival-woman-dancing-hat.jpg',           'Free spirit'],
  [23, 'community','/images/uploads/bohemians-festival-bohemian-woman-red.jpg',          'Bohemian soul'],
].forEach(([id, section, image_path, caption]) => insertGallery.run(id, section, image_path, caption));

module.exports = db;
