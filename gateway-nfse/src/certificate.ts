import crypto from 'node:crypto';
import forge from 'node-forge';

export interface CertificateMaterial {
  pfx: Buffer;
  passphrase: string;
  privateKeyPem: string;
  certificatePem: string;
  certificateBase64: string;
  subject: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  thumbprintSha256: string;
}

export function decryptCertificate(encrypted: Buffer, encodedKey: string): Buffer {
  if (encrypted[0] !== 1) throw new Error('Versão do envelope criptográfico não suportada.');
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('Chave AES deve ter 32 bytes.');

  const iv = encrypted.subarray(1, 13);
  const payload = encrypted.subarray(13);
  const ciphertext = payload.subarray(0, -16);
  const authTag = payload.subarray(-16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function parsePkcs12(pfx: Buffer, passphrase: string): CertificateMaterial {
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')));
  const store = forge.pkcs12.pkcs12FromAsn1(asn1, false, passphrase);
  const keyBag = store.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ]?.[0] || store.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  const certBag = store.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ]?.[0];

  if (!keyBag?.key || !certBag?.cert) {
    throw new Error('O arquivo PKCS#12 não contém chave privada e certificado.');
  }

  const certificatePem = forge.pki.certificateToPem(certBag.cert);
  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  const certificateDer = Buffer.from(
    forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert)).getBytes(),
    'binary',
  );

  return {
    pfx,
    passphrase,
    privateKeyPem,
    certificatePem,
    certificateBase64: certificateDer.toString('base64'),
    subject: certBag.cert.subject.attributes
      .map((attribute) => `${attribute.shortName || attribute.name}=${attribute.value}`)
      .join(', '),
    serialNumber: certBag.cert.serialNumber,
    validFrom: certBag.cert.validity.notBefore,
    validTo: certBag.cert.validity.notAfter,
    thumbprintSha256: crypto.createHash('sha256').update(certificateDer).digest('hex'),
  };
}
