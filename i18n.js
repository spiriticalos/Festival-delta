// Fills templates in one language from lang/<lang>.json.
// Placeholders: {{key}} raw HTML · {{a:key}} attribute value · {{j:key}} inside a JSON-LD string
//               {{m:key}} plain text (tags stripped, for llms.txt) · {{active:en}} → "is-active" on that language's page
//               {{i18nJson}} → js.* strings for main.js
const fs   = require('fs');
const path = require('path');

const LANGS    = ['en', 'ro'];
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'views/index.html'), 'utf8');
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

function fill(template, lang, extra = {}) {
  const t = STRINGS[lang];
  if (!t) throw new Error('Unknown language: ' + lang);

  return template.replace(PLACEHOLDER, (m, mode, key) => {
    if (mode === 'active') return key === lang ? 'is-active' : '';
    if (key in extra) return extra[key];
    if (key === 'i18nJson') {
      const js = Object.fromEntries(Object.entries(t).filter(([k]) => k.startsWith('js.')));
      return JSON.stringify(js).replace(/</g, '\\u003c');
    }
    if (!(key in t)) throw new Error(`Missing "${key}" in lang/${lang}.json`);
    const v = t[key];
    if (mode === 'a') return v.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (mode === 'j') return JSON.stringify(v).slice(1, -1).replace(/</g, '\\u003c');
    if (mode === 'm') return toText(v);
    return v;
  });
}

function render(lang, lineupHtml) {
  let html = fill(TEMPLATE, lang);
  if (lineupHtml) html = html.replace(/<!--lineup:start-->[\s\S]*?<!--lineup:end-->/, lineupHtml);
  return html;
}

module.exports = { LANGS, STRINGS, TEMPLATE, PLACEHOLDER, fill, toText, render };
