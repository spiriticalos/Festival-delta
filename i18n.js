// Fills templates in one language from lang/<lang>.json.
// Placeholders: {{key}} raw HTML · {{a:key}} attribute value · {{j:key}} inside a JSON-LD string
//               {{m:key}} plain text (tags stripped, for llms.txt) · {{active:en}} → "is-active" on that language's page
//               {{i18nJson}} → js.* strings for main.js
// Edition tokens ({{year}}, {{edition}}, ... — see edition.js) work in templates and inside lang values.
const fs      = require('fs');
const path    = require('path');
const edition = require('./edition');

const LANGS    = ['en', 'ro'];
const TEMPLATES = Object.fromEntries(['index', 'cookie-policy', '404'].map(name =>
  [name, fs.readFileSync(path.join(__dirname, `views/${name}.html`), 'utf8')]
));
const TEMPLATE = TEMPLATES.index;
const STRINGS  = Object.fromEntries(LANGS.map(l =>
  [l, JSON.parse(fs.readFileSync(path.join(__dirname, 'lang', l + '.json'), 'utf8'))]
));

const PLACEHOLDER = /\{\{(?:(a|j|m|active):)?([\w.]+)\}\}/g;

const toText = s => String(s)
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

function editionVars(lang) {
  const v = edition.vars(lang);
  v.datesLabel = v.currentDates || expand(STRINGS[lang]['hero.datesSoon'], v);
  return v;
}

function expand(s, vars) {
  return s.replace(PLACEHOLDER, (m, mode, key) => {
    if (mode || !(key in vars)) throw new Error(`Unknown token ${m} in a lang value`);
    return vars[key];
  });
}

// One lang value with its edition tokens filled in (for server.js / llms.js)
const text = (lang, key) => expand(STRINGS[lang][key], editionVars(lang));

function fill(template, lang, extra = {}) {
  const t = STRINGS[lang];
  if (!t) throw new Error('Unknown language: ' + lang);
  const vars = editionVars(lang);

  return template.replace(PLACEHOLDER, (m, mode, key) => {
    if (mode === 'active') return key === lang ? 'is-active' : '';
    if (key in extra) return extra[key];
    if (key in vars) return vars[key];
    if (key === 'i18nJson') {
      const js = Object.fromEntries(Object.entries(t).filter(([k]) => k.startsWith('js.')).map(([k, v]) => [k, expand(v, vars)]));
      return JSON.stringify(js).replace(/</g, '\\u003c');
    }
    if (!(key in t)) throw new Error(`Missing "${key}" in lang/${lang}.json`);
    const v = expand(t[key], vars);
    if (mode === 'a') return v.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (mode === 'j') return JSON.stringify(v).slice(1, -1).replace(/</g, '\\u003c');
    if (mode === 'm') return toText(v);
    return v;
  });
}

function render(lang, lineupHtml) {
  let html = fill(TEMPLATE, lang);
  // A past-dated MusicEvent tells bots the festival already happened; skip it until the next edition is dated
  if (!edition.vars(lang).currentDates) html = html.replace(/<!--event:start-->[\s\S]*?<!--event:end-->/, '');
  if (lineupHtml) html = html.replace(/<!--lineup:start-->[\s\S]*?<!--lineup:end-->/, lineupHtml);
  return html;
}

const renderPage = (name, lang) => fill(TEMPLATES[name], lang);

module.exports = { LANGS, STRINGS, TEMPLATE, TEMPLATES, PLACEHOLDER, fill, text, toText, render, renderPage };
