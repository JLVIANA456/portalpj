import { supabase, loadCertificate } from './supabase.js';

const certificateId = process.argv[2];
if (!certificateId) {
  throw new Error('Informe o ID do certificado.');
}

const { data: reference, error } = await supabase
  .from('nfse_certificados')
  .select('*,nfse_emitentes(cnpj)')
  .eq('id', certificateId)
  .single();

if (error || !reference) throw error || new Error('Certificado não encontrado.');

const certificate = await loadCertificate(
  reference.storage_path,
  reference.senha_secret_id,
);
const emitterCnpj = String(reference.nfse_emitentes?.cnpj || '').replace(/\D/g, '');
const subjectDigits = certificate.subject.replace(/\D/g, '');
const subjectMatchesEmitter = !emitterCnpj || subjectDigits.includes(emitterCnpj);
const expired = certificate.validTo.getTime() <= Date.now();

if (!subjectMatchesEmitter) {
  throw new Error(`O certificado não pertence ao CNPJ do emitente ${emitterCnpj}. Titular: ${certificate.subject}`);
}
if (expired) {
  throw new Error(`O certificado expirou em ${certificate.validTo.toISOString()}.`);
}

const { error: updateError } = await supabase
  .from('nfse_certificados')
  .update({
    certificado_serial: certificate.serialNumber,
    certificado_subject: certificate.subject,
    valido_de: certificate.validFrom.toISOString(),
    valido_ate: certificate.validTo.toISOString(),
    thumbprint_sha256: certificate.thumbprintSha256,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  })
  .eq('id', certificateId);
if (updateError) throw updateError;

console.log(JSON.stringify({
  id: certificateId,
  subject: certificate.subject,
  serialNumber: certificate.serialNumber,
  validFrom: certificate.validFrom.toISOString(),
  validTo: certificate.validTo.toISOString(),
  thumbprintSha256: certificate.thumbprintSha256,
  emitterCnpj,
  valid: true,
}, null, 2));
