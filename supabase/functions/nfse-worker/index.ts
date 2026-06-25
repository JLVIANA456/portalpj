import { createClient } from 'npm:@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/cors.ts';
import { callFiscalGateway } from '../_shared/nfse-gateway.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const workerSecret = Deno.env.get('NFSE_WORKER_SECRET');
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function saveBase64(
  bucket: string,
  path: string,
  value?: string,
  contentType = 'application/octet-stream',
) {
  if (!value) return null;
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  const { error } = await admin.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function processIssue(job: Record<string, any>) {
  const { data: dps, error: dpsError } = await admin
    .from('nfse_dps')
    .select('*,nfse_emitentes(*),nfse_clientes(*)')
    .eq('id', job.entidade_id)
    .single();
  if (dpsError || !dps) throw dpsError || new Error('DPS não encontrada.');

  const { data: certificate, error: certificateError } = await admin
    .from('nfse_certificados')
    .select('*')
    .eq('emitente_id', dps.emitente_id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  if (certificateError || !certificate) throw new Error('Emitente sem certificado A1 ativo.');

  await admin.from('nfse_dps').update({ status: 'processando' }).eq('id', dps.id);
  const result = await callFiscalGateway({
    operation: 'emitir',
    environment: dps.ambiente,
    tenantId: dps.tenant_id,
    emitterId: dps.emitente_id,
    certificate: {
      encryptedStoragePath: certificate.storage_path,
      passwordSecretId: certificate.senha_secret_id,
    },
    payload: { dps },
  });

  if (!result.success || !result.accessKey) {
    await admin.from('nfse_dps').update({
      status: 'rejeitada',
      erro_codigo: result.errorCode,
      erro_mensagem: result.errorMessage,
      atualizado_em: new Date().toISOString(),
    }).eq('id', dps.id);
    throw new Error(result.errorMessage || 'DPS rejeitada.');
  }

  const base = `${dps.tenant_id}/${dps.emitente_id}/${result.accessKey}`;
  const xmlPath = await saveBase64('nfse-documentos', `${base}/nfse.xml`, result.nfseXmlBase64, 'application/xml');
  const pdfPath = await saveBase64('nfse-documentos', `${base}/danfse.pdf`, result.danfsePdfBase64, 'application/pdf');

  const { data: note, error: noteError } = await admin.from('nfse_notas').insert({
    tenant_id: dps.tenant_id,
    dps_id: dps.id,
    emitente_id: dps.emitente_id,
    cliente_id: dps.cliente_id,
    ambiente: dps.ambiente,
    chave_acesso: result.accessKey,
    numero_nfse: result.nfseNumber,
    codigo_verificacao: result.verificationCode,
    data_emissao: result.issuedAt,
    valor_servico: dps.valor_servico,
    xml_nfse_path: xmlPath,
    danfse_path: pdfPath,
    resposta_autorizacao: result.raw || {},
  }).select().single();
  if (noteError) throw noteError;

  await admin.from('nfse_dps').update({
    status: 'autorizada',
    atualizado_em: new Date().toISOString(),
  }).eq('id', dps.id);
  return note;
}

async function processCancel(job: Record<string, any>) {
  const { data: event, error: eventError } = await admin
    .from('nfse_eventos')
    .select('*,nfse_notas(*,nfse_emitentes(*))')
    .eq('id', job.entidade_id)
    .single();
  if (eventError || !event) throw eventError || new Error('Evento não encontrado.');

  const note = event.nfse_notas;
  const { data: certificate } = await admin
    .from('nfse_certificados')
    .select('*')
    .eq('emitente_id', note.emitente_id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  if (!certificate) throw new Error('Emitente sem certificado A1 ativo.');

  await admin.from('nfse_eventos').update({ status: 'processando' }).eq('id', event.id);
  const result = await callFiscalGateway({
    operation: 'cancelar',
    environment: note.ambiente,
    tenantId: event.tenant_id,
    emitterId: note.emitente_id,
    certificate: {
      encryptedStoragePath: certificate.storage_path,
      passwordSecretId: certificate.senha_secret_id,
    },
    payload: {
      accessKey: note.chave_acesso,
      eventType: event.tipo_evento,
      sequence: event.sequencial,
      justification: event.justificativa,
    },
  });

  if (!result.success) {
    await admin.from('nfse_eventos').update({
      status: 'rejeitado',
      erro_codigo: result.errorCode,
      erro_mensagem: result.errorMessage,
      resposta: result.raw || {},
    }).eq('id', event.id);
    throw new Error(result.errorMessage || 'Cancelamento rejeitado.');
  }

  const path = await saveBase64(
    'nfse-documentos',
    `${event.tenant_id}/${note.emitente_id}/${note.chave_acesso}/evento-cancelamento-${event.sequencial}.xml`,
    result.eventXmlBase64,
    'application/xml',
  );
  await admin.from('nfse_eventos').update({
    status: 'registrado',
    xml_evento_path: path,
    resposta: result.raw || {},
  }).eq('id', event.id);
  await admin.from('nfse_notas').update({ status: 'cancelada' }).eq('id', note.id);
  return event;
}

Deno.serve(async (req) => {
  if (!workerSecret || req.headers.get('x-worker-secret') !== workerSecret) {
    return jsonResponse({ error: 'Não autorizado.' }, 401);
  }

  const workerId = `edge-${crypto.randomUUID()}`;
  const { data: jobs, error } = await admin.rpc('nfse_claim_jobs', {
    p_worker: workerId,
    p_limit: 10,
  });
  if (error) return jsonResponse({ error: error.message }, 500);

  const results = [];
  for (const job of jobs || []) {
    try {
      const result = job.tipo === 'emitir'
        ? await processIssue(job)
        : job.tipo === 'cancelar'
          ? await processCancel(job)
          : (() => { throw new Error(`Operação ${job.tipo} ainda não implementada.`); })();

      await admin.from('nfse_jobs').update({
        status: 'concluido',
        concluido_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        ultimo_erro: null,
      }).eq('id', job.id);
      results.push({ jobId: job.id, success: true, resultId: result?.id });
    } catch (jobError) {
      const message = jobError instanceof Error ? jobError.message : 'Erro desconhecido.';
      const retryAt = new Date(Date.now() + Math.min(60, 2 ** job.tentativas) * 60_000);
      await admin.from('nfse_jobs').update({
        status: 'erro',
        ultimo_erro: message,
        executar_apos: retryAt.toISOString(),
        atualizado_em: new Date().toISOString(),
      }).eq('id', job.id);
      results.push({ jobId: job.id, success: false, error: message });
    }
  }

  return jsonResponse({ workerId, processed: results.length, results });
});
