import { supabase, loadCertificate } from './supabase.js';
import { buildCancellationXml, buildDpsXml, makeDpsId, signXml, validateXml } from './xml.js';
import { consultNfse, gunzipBase64, issueNfse, registerEvent } from './national-client.js';
import {
  buildPaulistanaBatchXml,
  callPaulistana,
  extractPaulistanaReturn,
} from './sao-paulo.js';

async function saveBase64(path: string, value?: string, contentType = 'application/octet-stream') {
  if (!value) return null;
  const bytes = Buffer.from(value, 'base64');
  const { error } = await supabase.storage.from('nfse-documentos').upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function processIssue(job: Record<string, any>) {
  const { data: dps, error } = await supabase
    .from('nfse_dps')
    .select('*,nfse_emitentes(*),nfse_clientes(*)')
    .eq('id', job.entidade_id)
    .single();
  if (error || !dps) throw error || new Error('DPS não encontrada.');

  const { data: certificateReference } = await supabase
    .from('nfse_certificados')
    .select('*')
    .eq('emitente_id', dps.emitente_id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  if (!certificateReference) throw new Error('Emitente sem certificado A1 ativo.');

  const certificate = await loadCertificate(
    certificateReference.storage_path,
    certificateReference.senha_secret_id,
  );
  if (dps.nfse_emitentes?.provedor_nfse === 'sao_paulo') {
    const batchXml = buildPaulistanaBatchXml(dps, certificate);
    const testOnly = !dps.nfse_emitentes.habilitado_producao || dps.payload?.homologacao;
    const response = await callPaulistana(
      testOnly ? 'TesteEnvioLoteRPS' : 'EnvioLoteRPS',
      batchXml,
      certificate,
    );
    const municipalReturn = extractPaulistanaReturn(response.body);
    const hasError = response.statusCode < 200 ||
      response.statusCode >= 300 ||
      /<Erro\b|<CodigoErro\b|<Fault\b/i.test(municipalReturn);
    await supabase.from('nfse_dps').update({
      status: hasError ? 'rejeitada' : (testOnly ? 'rascunho' : 'autorizada'),
      erro_codigo: hasError ? 'SP_NFSE' : null,
      erro_mensagem: hasError ? municipalReturn.slice(0, 2000) : null,
      payload: {
        ...dps.payload,
        provedor: 'sao_paulo',
        operacao: testOnly ? 'TesteEnvioLoteRPS' : 'EnvioLoteRPS',
        retornoMunicipal: municipalReturn,
      },
    }).eq('id', dps.id);
    if (hasError) {
      throw new Error(`NFS-e São Paulo rejeitada (HTTP ${response.statusCode}): ${municipalReturn}`);
    }
    return { id: dps.id, testOnly, response: municipalReturn };
  }
  const xml = buildDpsXml(dps);
  const signedXml = signXml(xml, makeDpsId(dps), certificate);
  validateXml(signedXml, 'DPS_v1.01.xsd');
  const response = await issueNfse(dps.ambiente, signedXml, certificate);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    const responseText = typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body);
    await supabase.from('nfse_dps').update({
      status: 'rejeitada',
      erro_codigo: response.body.codigo || response.body.erros?.[0]?.codigo,
      erro_mensagem: response.body.mensagem || response.body.erros?.[0]?.descricao || responseText.slice(0, 2000),
    }).eq('id', dps.id);
    throw new Error(
      response.body.mensagem ||
      response.body.erros?.[0]?.descricao ||
      `DPS rejeitada (HTTP ${response.statusCode}): ${responseText}`,
    );
  }

  const accessKey = response.body.chaveAcesso || response.body.chaveAcessoNfse;
  if (!accessKey) throw new Error('Resposta de autorização sem chave de acesso.');
  const xmlText = gunzipBase64(response.body.nfseXmlGZipB64);
  const base = `${dps.tenant_id}/${dps.emitente_id}/${accessKey}`;
  const xmlPath = await saveBase64(
    `${base}/nfse.xml`,
    xmlText ? Buffer.from(xmlText).toString('base64') : undefined,
    'application/xml',
  );

  const { data: note, error: noteError } = await supabase.from('nfse_notas').insert({
    tenant_id: dps.tenant_id,
    dps_id: dps.id,
    emitente_id: dps.emitente_id,
    cliente_id: dps.cliente_id,
    ambiente: dps.ambiente,
    chave_acesso: accessKey,
    numero_nfse: response.body.numeroNfse,
    codigo_verificacao: response.body.codigoVerificacao,
    data_emissao: response.body.dataEmissao,
    valor_servico: dps.valor_servico,
    xml_nfse_path: xmlPath,
    resposta_autorizacao: response.body,
  }).select().single();
  if (noteError) throw noteError;
  await supabase.from('nfse_dps').update({ status: 'autorizada' }).eq('id', dps.id);
  return note;
}

export async function processConsult(job: Record<string, any>) {
  const { data: note } = await supabase
    .from('nfse_notas')
    .select('*,nfse_emitentes(*)')
    .eq('id', job.entidade_id)
    .single();
  if (!note) throw new Error('Nota não encontrada.');
  const { data: reference } = await supabase
    .from('nfse_certificados')
    .select('*')
    .eq('emitente_id', note.emitente_id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  if (!reference) throw new Error('Certificado ativo não encontrado.');
  const certificate = await loadCertificate(reference.storage_path, reference.senha_secret_id);
  return consultNfse(note.ambiente, note.chave_acesso, certificate);
}

export async function processCancel(job: Record<string, any>) {
  const { data: event } = await supabase
    .from('nfse_eventos')
    .select('*,nfse_notas(*)')
    .eq('id', job.entidade_id)
    .single();
  if (!event?.nfse_notas) throw new Error('Evento ou nota não encontrado.');
  const note = event.nfse_notas;
  const { data: reference } = await supabase
    .from('nfse_certificados')
    .select('*')
    .eq('emitente_id', note.emitente_id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  if (!reference) throw new Error('Certificado ativo não encontrado.');
  const certificate = await loadCertificate(reference.storage_path, reference.senha_secret_id);
  const xml = buildCancellationXml({
    environment: note.ambiente,
    accessKey: note.chave_acesso,
    authorDocument: certificate.subject.match(/\d{14}/)?.[0],
    justification: event.justificativa,
    reasonCode: event.resposta?.reasonCode || '9',
  });
  const id = xml.match(/<infPedReg Id="([^"]+)"/)?.[1];
  if (!id) throw new Error('Id do evento não encontrado.');
  const signedXml = signXml(xml, id, certificate);
  validateXml(signedXml, 'pedRegEvento_v1.01.xsd');
  const response = await registerEvent(note.ambiente, note.chave_acesso, signedXml, certificate);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(response.body.mensagem || response.body.erros?.[0]?.descricao || 'Cancelamento rejeitado.');
  }
  await supabase.from('nfse_eventos').update({ status: 'registrado', resposta: response.body }).eq('id', event.id);
  await supabase.from('nfse_notas').update({ status: 'cancelada' }).eq('id', note.id);
  return event;
}

export async function processJob(job: Record<string, any>) {
  if (job.tipo === 'emitir') return processIssue(job);
  if (job.tipo === 'consultar') return processConsult(job);
  if (job.tipo === 'cancelar') return processCancel(job);
  throw new Error(`Operação não implementada no worker local: ${job.tipo}`);
}
