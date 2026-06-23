import https from 'node:https';
import zlib from 'node:zlib';
import { config } from './config.js';
import type { CertificateMaterial } from './certificate.js';

type Environment = 'homologacao' | 'producao';

function request(
  url: string,
  certificate: CertificateMaterial,
  options: { method: string; body?: unknown },
) {
  return new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
    const target = new URL(url);
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const req = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: options.method,
      key: certificate.privateKeyPem,
      cert: certificate.certificatePem,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      headers: {
        Accept: 'application/json',
        ...(body ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        } : {}),
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed: any = text;
        try { parsed = text ? JSON.parse(text) : {}; } catch {}
        resolve({ statusCode: response.statusCode || 500, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export function gzipBase64(value: string) {
  return zlib.gzipSync(Buffer.from(value, 'utf8')).toString('base64');
}

export function gunzipBase64(value?: string) {
  if (!value) return undefined;
  return zlib.gunzipSync(Buffer.from(value, 'base64')).toString('utf8');
}

export async function issueNfse(environment: Environment, signedXml: string, certificate: CertificateMaterial) {
  const baseUrl = config.endpoints[environment].sefin.replace(/\/$/, '');
  return request(`${baseUrl}/nfse`, certificate, {
    method: 'POST',
    body: { dpsXmlGZipB64: gzipBase64(signedXml) },
  });
}

export async function consultNfse(environment: Environment, accessKey: string, certificate: CertificateMaterial) {
  const baseUrl = config.endpoints[environment].sefin.replace(/\/$/, '');
  return request(`${baseUrl}/nfse/${encodeURIComponent(accessKey)}`, certificate, { method: 'GET' });
}

export async function registerEvent(
  environment: Environment,
  accessKey: string,
  signedXml: string,
  certificate: CertificateMaterial,
) {
  const baseUrl = config.endpoints[environment].sefin.replace(/\/$/, '');
  return request(`${baseUrl}/nfse/${encodeURIComponent(accessKey)}/eventos`, certificate, {
    method: 'POST',
    body: { pedidoRegistroEventoXmlGZipB64: gzipBase64(signedXml) },
  });
}
