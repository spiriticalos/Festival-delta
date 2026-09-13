// llms.txt (curated summary) and llms-full.txt (whole page as text) for AI crawlers, in EN and RO.
// Summaries come from views/llms.<lang>.md; full text is generated from the rendered homepage,
// so both always match what the site says.
const fs   = require('fs');
const path = require('path');
const { LANGS, STRINGS, fill, toText, render } = require('./i18n');

const SUMMARY = Object.fromEntries(LANGS.map(l =>
  [l, fs.readFileSync(path.join(__dirname, `views/llms.${l}.md`), 'utf8')]
));

function summary(lang, artistNames = []) {
  const lineupList = artistNames.length ? artistNames.map(n => `- ${n}`).join('\n') : '-';
  return fill(SUMMARY[lang], lang, { lineupList });
}

function htmlToMarkdown(html) {
  let s = html.replace(/^[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');

  [
    /<(script|style|svg|noscript|iframe)\b[\s\S]*?<\/\1>/gi,
    /<!--[\s\S]*?-->/g,
    /<nav class="navbar"[\s\S]*?<\/nav>/i,
    /<a href="#main" class="skip-to-main">[\s\S]*?<\/a>/i,
    /<div id="hero-early-bird"[\s\S]*?<\/div>/i,
    /<div class="cd-card">[\s\S]*?<\/div>/gi,
    /<div class="video-lightbox"[\s\S]*?<\/button>\s*<\/div>/i,
    /<button class="video-play-btn"[\s\S]*?<\/button>/i,
    /<button class="back-to-top"[\s\S]*?<\/button>/i,
    /<div class="sticky-bar">[\s\S]*?<\/div>/i,
    /<div id="cookie-banner"[\s\S]*$/i,
    /<nav class="footer-nav">[\s\S]*?<\/nav>/i,
    /<span class="faq-icon"[\s\S]*?<\/span>/gi,
  ].forEach(re => { s = s.replace(re, ' '); });

  s = s
    .replace(/<button class="faq-q"[^>]*>([\s\S]*?)<\/button>/gi, (m, q) => `\n\n### ${toText(q)}\n\n`)
    .replace(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi, (m, t) => `\n\n## ${toText(t)}\n\n`)
    .replace(/<h[3-5][^>]*>([\s\S]*?)<\/h[3-5]>/gi, (m, t) => `\n\n### ${toText(t)}\n\n`)
    .replace(/<span class="lineup-card-title">([\s\S]*?)<\/span>/gi, (m, t) => `\n- ${toText(t)}\n`)
    .replace(/<a\s[^>]*href="((?:https?|mailto):[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, t) => `[${toText(t)}](${href})`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|section|footer|main|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, '');

  return s.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function full(lang, lineupHtml) {
  const t = STRINGS[lang];
  return `# ${toText(t['meta.title'])}\n\n> ${toText(t['meta.description'])}\n\n${t['meta.canonical']}\n\n`
    + htmlToMarkdown(render(lang, lineupHtml)) + '\n';
}

module.exports = { summary, full };
