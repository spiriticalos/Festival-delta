// Renders the homepage template (views/index.html) in one language from lang/<lang>.json.
// Placeholders: {{key}} raw HTML · {{a:key}} attribute value · {{j:key}} inside a JSON-LD string
//               {{active:en}} → "is-active" on that language's page · {{i18nJson}} → js.* strings for main.js
const fs   = require('fs');
const path = require('path');

const LANGS    = ['en', 'ro'];
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'views/index.html'), 'utf8');
const STRINGS  = Object.fromEntries(LANGS.map(l =>
  [l, JSON.parse(fs.readFileSync(path.join(__dirname, 'lang', l + '.json'), 'utf8'))]
));

const PLACEHOLDER = /\{\{(?:(a|j|active):)?([\w.]+)\}\}/g;

function render(lang, lineupHtml) {
  const t = STRINGS[lang];
  if (!t) throw new Error('Unknown language: ' + lang);

  let html = TEMPLATE.replace(PLACEHOLDER, (m, mode, key) => {
    if (mode === 'active') return key === lang ? 'is-active' : '';
    if (key === 'i18nJson') {
      const js = Object.fromEntries(Object.entries(t).filter(([k]) => k.startsWith('js.')));
      return JSON.stringify(js).replace(/</g, '\\u003c');
    }
    if (!(key in t)) throw new Error(`Missing "${key}" in lang/${lang}.json`);
    const v = t[key];
    if (mode === 'a') return v.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (mode === 'j') return JSON.stringify(v).slice(1, -1).replace(/</g, '\\u003c');
    return v;
  });

  if (lineupHtml) html = html.replace(/<!--lineup:start-->[\s\S]*?<!--lineup:end-->/, lineupHtml);
  return html;
}

module.exports = { LANGS, STRINGS, TEMPLATE, PLACEHOLDER, render };
