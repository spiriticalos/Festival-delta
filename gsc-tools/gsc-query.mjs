import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  const raw = readFileSync(join(__dirname, '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

async function authorize() {
  const cred = JSON.parse(readFileSync(env.GSC_OAUTH_CLIENT, 'utf8'));
  const { client_id, client_secret } = cred.installed ?? cred.web;

  const oauth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');

  if (existsSync(env.GSC_OAUTH_TOKEN)) {
    const tok = JSON.parse(readFileSync(env.GSC_OAUTH_TOKEN, 'utf8'));
    oauth2.setCredentials(tok);
    return oauth2;
  }

  console.log('\nFirst-run authorization required.');
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const redirectUri = `http://localhost:${port}`;
  oauth2.redirectUri_ = redirectUri;

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    redirect_uri: redirectUri,
  });

  console.log('Opening browser for consent…');
  console.log('If it does not open, paste this URL manually:\n  ' + authUrl + '\n');
  exec(`start "" "${authUrl}"`);

  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url, redirectUri);
      const c = url.searchParams.get('code');
      const err = url.searchParams.get('error');
      res.end(c ? 'OK. You can close this tab and return to the terminal.' : 'Error: ' + err);
      server.close();
      c ? resolve(c) : reject(new Error(err || 'no code'));
    });
  });

  const { tokens } = await oauth2.getToken({ code, redirect_uri: redirectUri });
  oauth2.setCredentials(tokens);
  mkdirSync(dirname(env.GSC_OAUTH_TOKEN), { recursive: true });
  writeFileSync(env.GSC_OAUTH_TOKEN, JSON.stringify(tokens, null, 2), 'utf8');
  console.log('Token saved to', env.GSC_OAUTH_TOKEN, '\n');
  return oauth2;
}

const auth = await authorize();
const sc = google.searchconsole({ version: 'v1', auth });
const SITE = env.GSC_SITE;

function isoDate(d) { return d.toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); }

async function query({ dimensions, startDate, endDate, rowLimit = 100 }) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  });
  return res.data.rows ?? [];
}

function pct(n) { return (n * 100).toFixed(2) + '%'; }
function num(n) { return Math.round(n * 100) / 100; }

function printTable(rows, dimName) {
  if (!rows.length) { console.log('  (no data)'); return; }
  const w = Math.max(dimName.length, ...rows.map(r => r.keys[0].length));
  console.log(`  ${dimName.padEnd(w)}  | clicks | impres |   CTR   |  pos`);
  console.log(`  ${'-'.repeat(w)}--+--------+--------+---------+------`);
  for (const r of rows) {
    console.log(
      `  ${r.keys[0].padEnd(w)}  | ${String(r.clicks).padStart(6)} | ${String(r.impressions).padStart(6)} | ${pct(r.ctr).padStart(7)} | ${num(r.position).toFixed(1).padStart(5)}`
    );
  }
}

function saveCsv(name, rows, dimName) {
  const outDir = join(__dirname, 'output');
  mkdirSync(outDir, { recursive: true });
  const lines = [`${dimName},clicks,impressions,ctr,position`];
  for (const r of rows) {
    const k = r.keys[0].replace(/"/g, '""');
    lines.push(`"${k}",${r.clicks},${r.impressions},${r.ctr},${r.position}`);
  }
  const path = join(outDir, `${name}-${isoDate(new Date())}.csv`);
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log(`  → saved ${path}`);
}

const cmd = process.argv[2] || 'summary';
const days = parseInt(process.argv[3] || '28', 10);
const startDate = daysAgo(days);
const endDate = daysAgo(2);

console.log(`\nSite: ${SITE}`);
console.log(`Range: ${startDate} → ${endDate} (last ${days} days)\n`);

try {
  if (cmd === 'sites') {
    const r = await sc.sites.list();
    console.log('Sites:');
    for (const s of r.data.siteEntry ?? []) console.log(`  ${s.permissionLevel.padEnd(12)} ${s.siteUrl}`);
  } else if (cmd === 'queries') {
    console.log('Top search queries:');
    const rows = await query({ dimensions: ['query'], startDate, endDate, rowLimit: 50 });
    printTable(rows, 'query');
    saveCsv('queries', rows, 'query');
  } else if (cmd === 'pages') {
    console.log('Top pages:');
    const rows = await query({ dimensions: ['page'], startDate, endDate, rowLimit: 50 });
    printTable(rows, 'page');
    saveCsv('pages', rows, 'page');
  } else if (cmd === 'countries') {
    console.log('Top countries:');
    const rows = await query({ dimensions: ['country'], startDate, endDate, rowLimit: 20 });
    printTable(rows, 'country');
  } else if (cmd === 'devices') {
    console.log('Devices:');
    const rows = await query({ dimensions: ['device'], startDate, endDate, rowLimit: 10 });
    printTable(rows, 'device');
  } else if (cmd === 'daily') {
    console.log('Daily breakdown:');
    const rows = await query({ dimensions: ['date'], startDate, endDate, rowLimit: 500 });
    printTable(rows, 'date');
    saveCsv('daily', rows, 'date');
  } else if (cmd === 'summary') {
    const totals = await query({ dimensions: [], startDate, endDate });
    const t = totals[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    console.log('Totals:');
    console.log(`  clicks      : ${t.clicks}`);
    console.log(`  impressions : ${t.impressions}`);
    console.log(`  CTR         : ${pct(t.ctr)}`);
    console.log(`  avg position: ${num(t.position).toFixed(2)}`);
    console.log('\nTop 10 queries:');
    printTable(await query({ dimensions: ['query'], startDate, endDate, rowLimit: 10 }), 'query');
    console.log('\nTop 10 pages:');
    printTable(await query({ dimensions: ['page'], startDate, endDate, rowLimit: 10 }), 'page');
    console.log('\nDevices:');
    printTable(await query({ dimensions: ['device'], startDate, endDate, rowLimit: 10 }), 'device');
  } else {
    console.log(`Unknown command: ${cmd}`);
    console.log('Usage: node gsc-query.mjs <sites|summary|queries|pages|countries|devices|daily> [days=28]');
    process.exit(1);
  }
} catch (e) {
  console.error('\nERROR:', e.message);
  if (e.message.includes('access_denied') || e.message.includes('not in test users')) {
    console.error('\n→ Add your Gmail as a test user in OAuth consent screen.');
  }
  process.exit(1);
}
