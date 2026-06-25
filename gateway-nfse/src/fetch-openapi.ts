import fs from 'node:fs/promises';
import https from 'node:https';
import { loadCertificate } from './supabase.js';

const storagePath = process.argv[2];
const secretId = process.argv[3];
const url = process.argv[4];
const output = process.argv[5] || 'openapi.json';
if (!storagePath || !secretId || !url) throw new Error('Informe storagePath, secretId, URL e saída.');

const certificate = await loadCertificate(storagePath, secretId);
const target = new URL(url);
const response = await new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
  const request = https.request({
    hostname: target.hostname,
    path: `${target.pathname}${target.search}`,
    method: 'GET',
    key: certificate.privateKeyPem,
    cert: certificate.certificatePem,
    headers: { Accept: 'application/json' },
  }, (result) => {
    const chunks: Buffer[] = [];
    result.on('data', chunk => chunks.push(Buffer.from(chunk)));
    result.on('end', () => resolve({ status: result.statusCode || 500, body: Buffer.concat(chunks) }));
  });
  request.on('error', reject);
  request.end();
});
if (response.status < 200 || response.status >= 300) {
  throw new Error(`HTTP ${response.status}: ${response.body.toString('utf8').slice(0, 1000)}`);
}
await fs.writeFile(output, response.body);
console.log(`${output} (${response.body.length} bytes)`);
