import { google } from 'googleapis';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function authorize() {
  const cred = JSON.parse(readFileSync(env.GSC_OAUTH_CLIENT, 'utf8'));
  const { client_id, client_secret } = cred.installed ?? cred.web;
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');
  const tok = JSON.parse(readFileSync(env.GSC_OAUTH_TOKEN, 'utf8'));
  oauth2.setCredentials(tok);
  return oauth2;
}

const auth = await authorize();
const sc = google.searchconsole({ version: 'v1', auth });

const urls = [
  'https://thebohemiansociety.ro/',
  'https://thebohemiansociety.ro/cookie-policy.html',
  'https://thebohemiansociety.ro/sitemap.xml',
  'https://thebohemiansociety.ro/robots.txt',
  'https://thebohemiansociety.ro/wp-admin/',
  'https://thebohemiansociety.ro/wp-content/',
];

console.log('URL Inspection Results\n');

for (const url of urls) {
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url,
        siteUrl: env.GSC_SITE,
      },
    });
    const r = res.data.inspectionResult;
    const idx = r.indexStatusResult;
    console.log(`── ${url}`);
    console.log(`   Verdict:     ${idx.verdict}`);
    console.log(`   Coverage:    ${idx.coverageState}`);
    console.log(`   Robotstxt:   ${idx.robotsTxtState}`);
    console.log(`   Indexing:    ${idx.indexingState}`);
    console.log(`   Last crawl:  ${idx.lastCrawlTime ?? 'never'}`);
    console.log(`   Crawled as:  ${idx.crawledAs ?? '-'}`);
    if (idx.pageFetchState) console.log(`   Fetch state: ${idx.pageFetchState}`);
    console.log();
  } catch (e) {
    console.log(`── ${url}`);
    console.log(`   ERROR: ${e.message}\n`);
  }
}
