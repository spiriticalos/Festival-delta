import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const auth = new google.auth.GoogleAuth({
  keyFile: env.GSC_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const sc = google.searchconsole({ version: 'v1', auth });

const res = await sc.sites.list();
console.log('Sites visible to this service account:');
console.log(JSON.stringify(res.data, null, 2));
