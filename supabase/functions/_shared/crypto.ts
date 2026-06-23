function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encryptCertificate(bytes: Uint8Array): Promise<Uint8Array> {
  const encodedKey = Deno.env.get('NFSE_CERTIFICATE_ENCRYPTION_KEY');
  if (!encodedKey) throw new Error('Chave de criptografia do certificado não configurada.');

  const rawKey = decodeBase64(encodedKey);
  if (rawKey.byteLength !== 32) {
    throw new Error('NFSE_CERTIFICATE_ENCRYPTION_KEY deve conter exatamente 32 bytes em Base64.');
  }

  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes),
  );

  const result = new Uint8Array(1 + iv.byteLength + encrypted.byteLength);
  result[0] = 1;
  result.set(iv, 1);
  result.set(encrypted, 1 + iv.byteLength);
  return result;
}
