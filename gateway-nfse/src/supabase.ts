import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { decryptCertificate, parsePkcs12 } from './certificate.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function loadCertificate(storagePath: string, passwordSecretId: string) {
  const [{ data: file, error: downloadError }, { data: password, error: secretError }] =
    await Promise.all([
      supabase.storage.from('nfse-certificados').download(storagePath),
      supabase.rpc('nfse_read_secret', { p_secret_id: passwordSecretId }),
    ]);

  if (downloadError || !file) throw downloadError || new Error('Certificado não encontrado.');
  if (secretError || !password) throw secretError || new Error('Senha do certificado não encontrada.');

  const encrypted = Buffer.from(await file.arrayBuffer());
  const pfx = decryptCertificate(encrypted, config.encryptionKey);
  return parsePkcs12(pfx, password);
}
