// Which edition is "current", which one the lineup / recap video belong to, and the event dates.
// Values come from the admin settings table (server.js calls use()), so the yearly rollover is a few
// fields in admin instead of editing texts. Lang strings use them as {{year}}, {{edition}}, ... tokens.
const fs   = require('fs');
const path = require('path');

const FIRST_YEAR = 2023;
const DEFAULTS = {
  edition_year:   '2027',                 // the next / upcoming edition
  edition_number: '5',
  lineup_year:    '2026',                 // year of the artists currently in the DB
  recap_year:     '2025',                 // year of the aftermovie in "How It Was"
  recap_video_id: 'BAnWvS4GAW8',
  festival_date:  '2026-06-18T12:00:00',  // start of the most recent dated edition (4 days long)
};
const KEYS = Object.keys(DEFAULTS);

let source = () => ({});
const use = fn => { source = fn; };

const ROMAN   = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const WORDS   = { en: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
                  ro: ['', 'o', 'două', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece'] };
const LOCALE  = { en: 'en-GB', ro: 'ro-RO' };

const ordinal = (n, lang) => {
  if (lang === 'ro') return n === 1 ? 'I' : `a ${ROMAN[n]}-a`;
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return n + s;
};

const month = (d, lang) => new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', timeZone: 'UTC' }).format(d);
function dateRange(start, end, lang) {
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${month(end, lang)} ${end.getUTCFullYear()}`;
  }
  return `${start.getUTCDate()} ${month(start, lang)} – ${end.getUTCDate()} ${month(end, lang)} ${end.getUTCFullYear()}`;
}
const isoDay = d => d.toISOString().slice(0, 10);

function settings() {
  const s = { ...DEFAULTS };
  const raw = source() || {};
  for (const k of KEYS) if (raw[k] != null && String(raw[k]).trim()) s[k] = String(raw[k]).trim();
  const int = (k, min, max) => { const n = parseInt(s[k], 10); return n >= min && n <= max ? n : parseInt(DEFAULTS[k], 10); };
  const start = new Date(s.festival_date.slice(0, 10) + 'T00:00:00Z');
  return {
    year:    int('edition_year', FIRST_YEAR, 2100),
    number:  int('edition_number', 1, ROMAN.length - 1),
    lineup:  int('lineup_year', FIRST_YEAR, 2100),
    recap:   int('recap_year', FIRST_YEAR, 2100),
    videoId: /^[\w-]{11}$/.test(s.recap_video_id) ? s.recap_video_id : DEFAULTS.recap_video_id,
    start:   isNaN(start) ? new Date(DEFAULTS.festival_date.slice(0, 10) + 'T00:00:00Z') : start,
    artists: Array.isArray(raw.artists) ? raw.artists : [],
  };
}

// Tokens available in lang strings and templates. Everything is plain text / safe for attributes and JSON.
function vars(lang) {
  const s = settings();
  const numberOf = y => s.number - (s.year - y);
  const end = new Date(s.start.getTime() + 3 * 86400000);
  const datedYear = s.start.getUTCFullYear();
  const current = datedYear === s.year;           // dates for the upcoming edition are set
  const eventYear = current ? s.year : datedYear; // JSON-LD event: upcoming if dated, else the last one
  const thumb = `aftermovie-${s.recap}-thumbnail`;
  const localThumb = fs.existsSync(path.join(__dirname, 'public/images', thumb + '.jpg'));

  return {
    year:            String(s.year),
    edition:         ordinal(s.number, lang),
    editionRoman:    ROMAN[s.number],
    prevYear:        String(s.year - 1),
    prevEdition:     ordinal(s.number - 1, lang),
    pastCount:       WORDS[lang][s.number - 1] || String(s.number - 1),
    pastYears:       Array.from({ length: s.year - FIRST_YEAR }, (_, i) => FIRST_YEAR + i).join(', '),
    lineupYear:      String(s.lineup),
    lineupEdition:   ordinal(numberOf(s.lineup), lang),
    recapYear:       String(s.recap),
    recapEdition:    ordinal(numberOf(s.recap), lang),
    recapVideoId:    s.videoId,
    recapThumbJpg:   localThumb ? `/images/${thumb}.jpg`  : `https://img.youtube.com/vi/${s.videoId}/maxresdefault.jpg`,
    recapThumbWebp:  localThumb ? `/images/${thumb}.webp` : `https://img.youtube.com/vi_webp/${s.videoId}/maxresdefault.webp`,
    currentDates:    current ? dateRange(s.start, end, lang) : '',
    prevDates:       !current && datedYear === s.year - 1 ? dateRange(s.start, end, lang) : String(s.year - 1),
    eventYear:       String(eventYear),
    eventStart:      isoDay(s.start),
    eventEnd:        isoDay(end),
    eventDates:      dateRange(s.start, end, lang),
    eventPerformers: JSON.stringify(s.lineup === eventYear
      ? s.artists.map(name => ({ '@type': 'MusicGroup', name })) : []).replace(/</g, '\\u003c'),
    copyrightYear:   String(new Date().getUTCFullYear()),
  };
}

const NAMES = [...Object.keys(vars('en')), 'datesLabel'];

module.exports = { DEFAULTS, KEYS, NAMES, use, vars };
