#!/usr/bin/env node
// Fails (exit 1) when the English and Romanian site texts are out of sync.
// Runs in CI before every deploy — see .github/workflows/fly-deploy.yml and CLAUDE.md.
const fs   = require('fs');
const path = require('path');
const { LANGS, STRINGS, TEMPLATES, PLACEHOLDER, render, renderPage } = require('../i18n');
const llms    = require('../llms');
const edition = require('../edition');

const ROOT   = path.join(__dirname, '..');
const read   = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const sameOk = JSON.parse(read('lang/same-ok.json'));
const { en, ro } = STRINGS;
const errors = [];

// 1. Both files have exactly the same keys, none empty
for (const k of Object.keys(en)) if (!(k in ro)) errors.push(`Missing in lang/ro.json: "${k}"`);
for (const k of Object.keys(ro)) if (!(k in en)) errors.push(`Missing in lang/en.json: "${k}"`);
for (const l of LANGS) {
  for (const [k, v] of Object.entries(STRINGS[l])) {
    if (typeof v !== 'string' || !v.trim()) errors.push(`Empty value in lang/${l}.json: "${k}"`);
  }
}

// 2. Romanian text that is still identical to English = forgotten translation
for (const k of Object.keys(en)) {
  if (k in ro && ro[k].trim() === en[k].trim() && !sameOk.keys.includes(k)) {
    errors.push(`Not translated (same in EN and RO): "${k}" = "${en[k]}"`);
  }
}

// 3. Every key used by a template exists; every key is used somewhere
const llmsTemplate = l => read(`views/llms.${l}.md`);
const used = new Set([...Object.values(TEMPLATES), llmsTemplate('en'), llmsTemplate('ro')]
  .flatMap(tpl => [...tpl.matchAll(PLACEHOLDER)].filter(m => m[1] !== 'active').map(m => m[2])));
used.delete('i18nJson');
used.delete('lineupList');
edition.NAMES.forEach(n => used.delete(n));
for (const k of used) if (!(k in en)) errors.push(`A template uses unknown key "${k}"`);
const code = read('public/js/main.js') + read('server.js') + read('i18n.js');
for (const k of Object.keys(en)) {
  if (!used.has(k) && !code.includes(`'${k}'`)) errors.push(`Unused key "${k}" (remove it from both lang files)`);
}

// 4. No visible text hardcoded in the HTML templates (it would show in English on /ro/)
const allowed = [...sameOk.text].sort((a, b) => b.length - a.length);
const stripAllowed = s => allowed.reduce((acc, phrase) => acc.split(phrase).join(' '), s);
const hasWords = s => /[A-Za-zĂÂÎȘȚăâîșț]{2,}/.test(s);
const attrRe = /\s(alt|aria-label|title|placeholder)="([^"]*)"|<meta\s+(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"\s+content="([^"]*)"/gi;

for (const [name, tpl] of Object.entries(TEMPLATES)) {
  const markup = tpl
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  for (const chunk of markup.split(/<[^>]*>/)) {
    const text = stripAllowed(chunk.replace(PLACEHOLDER, ' ').replace(/&[a-z#0-9]+;/gi, ' ')).trim();
    if (hasWords(text)) errors.push(`Hardcoded text in views/${name}.html: "${text.replace(/\s+/g, ' ').slice(0, 80)}"`);
  }
  for (const m of markup.matchAll(attrRe)) {
    const value = stripAllowed((m[2] ?? m[3]).replace(PLACEHOLDER, ' ')).trim();
    if (hasWords(value)) errors.push(`Hardcoded attribute text in views/${name}.html: ${m[1] || 'meta content'}="${value.slice(0, 80)}"`);
  }
}

// 5. Every page renders in both languages
for (const l of LANGS) {
  for (const name of Object.keys(TEMPLATES)) {
    try {
      const html = name === 'index' ? render(l) : renderPage(name, l);
      if (html.includes('{{')) errors.push(`Unrendered placeholder left in views/${name}.html (${l})`);
      if (!html.includes(`<html lang="${l}">`)) errors.push(`views/${name}.html (${l}) does not declare <html lang="${l}">`);
    } catch (e) {
      errors.push(`Rendering views/${name}.html (${l}) failed: ${e.message}`);
    }
  }
}

// 6. llms.txt summaries: EN and RO templates have the same placeholders and the same shape
const placeholders = s => [...s.matchAll(PLACEHOLDER)].map(m => m[0]).sort().join(' ');
const shape = s => s.split('\n').map(l => (l.match(/^(#+ |- |> )/) || [''])[0]).join('');
if (placeholders(llmsTemplate('en')) !== placeholders(llmsTemplate('ro'))) {
  errors.push('views/llms.en.md and views/llms.ro.md use different placeholders');
}
if (shape(llmsTemplate('en')) !== shape(llmsTemplate('ro'))) {
  errors.push('views/llms.en.md and views/llms.ro.md have a different structure (headings / bullets)');
}
for (const l of LANGS) {
  try {
    const s = llms.summary(l, ['Test Artist']);
    const f = llms.full(l);
    if (s.includes('{{') || f.includes('{{')) errors.push(`Unrendered placeholder left in the ${l} llms files`);
    if ((f.match(/^### /gm) || []).length < 6) errors.push(`llms-full (${l}) lost its FAQ — check htmlToMarkdown in llms.js`);
  } catch (e) {
    errors.push(`Rendering the ${l} llms files failed: ${e.message}`);
  }
}

// 7. Years and edition numbers are tokens from edition.js ({{year}}, {{edition}}, {{recapYear}}, ...),
//    never typed into texts — otherwise the site mixes editions again after the next rollover.
const YEAR_OK  = ['cookiePage.subtitle']; // a real "last updated" date, not an edition
const HARDCODED_EDITION = /\b20[2-9]\d\b|\b\d{1,2}(?:st|nd|rd|th)\b|\ba [IVX]+-a\b|EDIȚIA [IVX]+\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten) editions\b|\b(?:două|trei|patru|cinci|șase|șapte|opt|nouă|zece) ediții\b/i;
for (const l of LANGS) {
  for (const [k, v] of Object.entries(STRINGS[l])) {
    const m = !YEAR_OK.includes(k) && v.replace(PLACEHOLDER, ' ').match(HARDCODED_EDITION);
    if (m) errors.push(`Hardcoded year/edition "${m[0]}" in lang/${l}.json "${k}" — use an edition token (see edition.js)`);
  }
}
for (const [name, tpl] of Object.entries([...Object.entries(TEMPLATES), ['llms.en.md', llmsTemplate('en')], ['llms.ro.md', llmsTemplate('ro')]]
  .reduce((o, [n, s]) => ({ ...o, [n]: s }), {}))) {
  const m = tpl.replace(PLACEHOLDER, ' ').replace(/\?v=\w+/g, ' ').match(HARDCODED_EDITION);
  if (m) errors.push(`Hardcoded year/edition "${m[0]}" in views/${name} — use an edition token (see edition.js)`);
}

if (errors.length) {
  console.error(`✗ EN/RO check failed (${errors.length}):\n` + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ EN/RO in sync — ${Object.keys(en).length} strings, ${Object.keys(TEMPLATES).length} pages + llms`);
