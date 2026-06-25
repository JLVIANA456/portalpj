import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getRequestContext, requireTenantAdmin } from '../_shared/supabase.ts';

function route(req: Request) {
  const url = new URL(req.url);
  const marker = '/nfse-api';
  const index = url.pathname.indexOf(marker);
  const pathname = index >= 0 ? url.pathname.slice(index + marker.length) || '/' : url.pathname;
  return { url, parts: pathname.split('/').filter(Boolean) };
}

async function audit(
  context: Awaited<ReturnType<typeof getRequestContext>>,
  entity: string,
  entityId: string | null,
  action: string,
  data: Record<string, unknown> = {},
) {
  await context.adminClient.from('nfse_auditoria').insert({
    tenant_id: context.tenantId,
    usuario_id: context.user.id,
    entidade: entity,
    entidade_id: entityId,
    acao: action,
    dados: data,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const context = await getRequestContext(req);
    const { url, parts } = route(req);
    const resource = parts[0] || 'status';

    if (req.method === 'GET' && resource === 'status') {
      const [{ count: emitters }, { count: certificates }, { count: notes }, { count: errors }] =
        await Promise.all([
          context.userClient.from('nfse_emitentes').select('*', { count: 'exact', head: true }),
          context.userClient.from('nfse_certificados').select('*', { count: 'exact', head: true }).eq('ativo', true),
          context.userClient.from('nfse_notas').select('*', { count: 'exact', head: true }),
          context.userClient.from('nfse_jobs').select('*', { count: 'exact', head: true }).eq('status', 'erro'),
        ]);
      return jsonResponse({
        emitters: emitters || 0,
        certificates: certificates || 0,
        notes: notes || 0,
        errors: errors || 0,
        integration: certificates ? 'ready' : 'certificate_required',
      });
    }

    if (['emitentes', 'clientes'].includes(resource)) {
      const table = resource === 'emitentes' ? 'nfse_emitentes' : 'nfse_clientes';
      if (req.method === 'GET') {
        const { data, error } = await context.userClient
          .from(table)
          .select('*')
          .order('criado_em', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data });
      }
      if (req.method === 'POST') {
        const body = await req.json();
        const { data, error } = await context.userClient
          .from(table)
          .insert({
            ...body,
            tenant_id: context.tenantId,
            criado_por: context.user.id,
          })
          .select()
          .single();
        if (error) throw error;
        await audit(context, resource.slice(0, -1), data.id, 'criado');
        return jsonResponse({ data }, 201);
      }
    }

    if (resource === 'certificados' && req.method === 'GET') {
      requireTenantAdmin(context);
      const { data, error } = await context.userClient
        .from('nfse_certificados')
        .select('id,emitente_id,nome_arquivo,certificado_serial,certificado_subject,valido_de,valido_ate,thumbprint_sha256,ativo,criado_em')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return jsonResponse({ data });
    }

    if (resource === 'notas' && req.method === 'GET') {
      const id = parts[1];
      let query = context.userClient
        .from('nfse_notas')
        .select('*,nfse_dps(*)')
        .order('criado_em', { ascending: false });
      if (id) query = query.eq('id', id);
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ data: id ? data?.[0] || null : data });
    }

    if (resource === 'dps' && req.method === 'POST') {
      const body = await req.json();
      const required = [
        'emitente_id', 'serie', 'numero', 'competencia', 'codigo_servico_nacional',
        'municipio_incidencia_ibge', 'codigo_localidade_emissao', 'tipo_emitente',
        'descricao_servico', 'valor_servico',
      ];
      const missing = required.filter((field) => body[field] === undefined || body[field] === '');
      if (missing.length) {
        return jsonResponse({ error: 'Campos obrigatórios ausentes.', fields: missing }, 400);
      }
      if (!/^\d{6}$/.test(String(body.codigo_servico_nacional))) {
        return jsonResponse({ error: 'Código de Tributação Nacional (cTribNac) inválido.', fields: ['codigo_servico_nacional'] }, 400);
      }
      if (body.codigo_nbs != null && body.codigo_nbs !== '' && String(body.codigo_nbs).replace(/\D/g, '').length !== 9) {
        return jsonResponse({ error: 'Código NBS inválido.', fields: ['codigo_nbs'] }, 400);
      }
      if (body.codigo_servico_municipal != null &&
          body.codigo_servico_municipal !== '' &&
          !/^\d{3,5}$/.test(String(body.codigo_servico_municipal))) {
        return jsonResponse({
          error: 'Código Municipal do Serviço inválido (3 dígitos para Portal Nacional, 5 para São Paulo).',
          fields: ['codigo_servico_municipal'],
        }, 400);
      }

      const { data: emitter, error: emitterError } = await context.userClient
        .from('nfse_emitentes')
        .select('*')
        .eq('id', body.emitente_id)
        .single();
      if (emitterError || !emitter) return jsonResponse({ error: 'Emitente inválido.' }, 400);

      let customer = null;
      if (body.cliente_id) {
        const result = await context.userClient
          .from('nfse_clientes')
          .select('*')
          .eq('id', body.cliente_id)
          .single();
        if (result.error) return jsonResponse({ error: 'Cliente inválido.' }, 400);
        customer = result.data;
      }

      const idempotencyKey =
        req.headers.get('Idempotency-Key') ||
        `emitir:${body.emitente_id}:${body.serie}:${body.numero}:${emitter.ambiente}`;

      const { data: dps, error: dpsError } = await context.adminClient
        .from('nfse_dps')
        .insert({
          tenant_id: context.tenantId,
          emitente_id: body.emitente_id,
          cliente_id: body.cliente_id || null,
          criado_por: context.user.id,
          ambiente: body.ambiente || emitter.ambiente,
          serie: body.serie,
          numero: body.numero,
          competencia: body.competencia,
          data_emissao: body.data_emissao || new Date().toISOString(),
          codigo_servico_nacional: body.codigo_servico_nacional,
          codigo_servico_municipal: body.codigo_servico_municipal || null,
          municipio_incidencia_ibge: body.municipio_incidencia_ibge,
          descricao_servico: body.descricao_servico,
          valor_servico: body.valor_servico,
          valores: body.valores || {},
          tributacao: body.tributacao || {},
          tomador_snapshot: customer || body.tomador_snapshot || {},
          prestador_snapshot: emitter,
          payload: {
            observacao: body.observacao || null,
            opcoes_envio: body.opcoes_envio || null,
            codigo_localidade_emissao: body.codigo_localidade_emissao || null,
            tipo_emitente: body.tipo_emitente || null,
            tot_trib: body.tot_trib || null,
            cNBS: body.codigo_nbs || null,
          },
          status: 'fila',
        })
        .select()
        .single();
      if (dpsError) throw dpsError;

      const { data: job, error: jobError } = await context.adminClient
        .from('nfse_jobs')
        .insert({
          tenant_id: context.tenantId,
          criado_por: context.user.id,
          tipo: 'emitir',
          entidade_id: dps.id,
          idempotency_key: idempotencyKey,
          payload: { dpsId: dps.id },
        })
        .select()
        .single();
      if (jobError) throw jobError;

      await audit(context, 'dps', dps.id, 'enfileirada', { jobId: job.id });
      return jsonResponse({ dps, job }, 202);
    }

    if (resource === 'notas' && parts[1] && parts[2] === 'cancelamento' && req.method === 'POST') {
      const body = await req.json();
      if (!body.justificativa || body.justificativa.trim().length < 15) {
        return jsonResponse({ error: 'Informe uma justificativa com pelo menos 15 caracteres.' }, 400);
      }
      const { data: note, error: noteError } = await context.userClient
        .from('nfse_notas')
        .select('*')
        .eq('id', parts[1])
        .single();
      if (noteError || !note) return jsonResponse({ error: 'Nota não encontrada.' }, 404);

      const { data: event, error: eventError } = await context.userClient
        .from('nfse_eventos')
        .insert({
          tenant_id: context.tenantId,
          nota_id: note.id,
          criado_por: context.user.id,
          tipo_evento: 'cancelamento',
          justificativa: body.justificativa,
        })
        .select()
        .single();
      if (eventError) throw eventError;

      const idempotencyKey = req.headers.get('Idempotency-Key') || `cancelar:${note.chave_acesso}:1`;
      const { data: job, error: jobError } = await context.adminClient
        .from('nfse_jobs')
        .insert({
          tenant_id: context.tenantId,
          criado_por: context.user.id,
          tipo: 'cancelar',
          entidade_id: event.id,
          idempotency_key: idempotencyKey,
          payload: { eventId: event.id, noteId: note.id },
        })
        .select()
        .single();
      if (jobError) throw jobError;
      await audit(context, 'evento', event.id, 'cancelamento_enfileirado', { jobId: job.id });
      return jsonResponse({ event, job }, 202);
    }

    if (resource === 'jobs' && req.method === 'GET') {
      let query = context.userClient
        .from('nfse_jobs')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(Math.min(Number(url.searchParams.get('limit') || 50), 100));
      if (url.searchParams.get('status')) query = query.eq('status', url.searchParams.get('status'));
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ data });
    }

    return jsonResponse({ error: 'Rota não encontrada.' }, 404);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro interno.';
    const status = message.includes('autentic') || message.includes('Sessão') ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
