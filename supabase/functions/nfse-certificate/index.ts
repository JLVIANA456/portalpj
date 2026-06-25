import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { encryptCertificate } from '../_shared/crypto.ts';
import { getRequestContext, requireTenantAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  try {
    const context = await getRequestContext(req);
    requireTenantAdmin(context);

    const form = await req.formData();
    const certificate = form.get('certificate');
    const password = String(form.get('password') || '');
    const emitterId = String(form.get('emitterId') || '');

    if (!(certificate instanceof File) || !password || !emitterId) {
      return jsonResponse({ error: 'Certificado, senha e emitente são obrigatórios.' }, 400);
    }
    if (certificate.size > 10 * 1024 * 1024) {
      return jsonResponse({ error: 'O certificado excede o limite de 10 MB.' }, 413);
    }

    const { data: emitter, error: emitterError } = await context.adminClient
      .from('nfse_emitentes')
      .select('id,tenant_id,cnpj')
      .eq('id', emitterId)
      .eq('tenant_id', context.tenantId)
      .single();
    if (emitterError || !emitter) {
      return jsonResponse({ error: 'Emitente não encontrado.' }, 404);
    }

    const encrypted = await encryptCertificate(
      new Uint8Array(await certificate.arrayBuffer()),
    );
    const certificateId = crypto.randomUUID();
    const storagePath = `${context.tenantId}/${emitterId}/${certificateId}.pfx.enc`;

    const { error: uploadError } = await context.adminClient.storage
      .from('nfse-certificados')
      .upload(storagePath, encrypted, {
        contentType: 'application/octet-stream',
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const secretName = `nfse-cert-${context.tenantId}-${certificateId}`;
    const { data: secretId, error: secretError } = await context.adminClient.rpc(
      'nfse_store_secret',
      {
        p_secret: password,
        p_name: secretName,
        p_description: `Senha do certificado A1 do emitente ${emitterId}`,
      },
    );
    if (secretError || !secretId) {
      await context.adminClient.storage.from('nfse-certificados').remove([storagePath]);
      throw secretError || new Error('Não foi possível proteger a senha.');
    }

    const { data, error } = await context.adminClient
      .from('nfse_certificados')
      .insert({
        id: certificateId,
        tenant_id: context.tenantId,
        emitente_id: emitterId,
        criado_por: context.user.id,
        nome_arquivo: certificate.name,
        storage_path: storagePath,
        senha_secret_id: secretId,
      })
      .select('id,emitente_id,nome_arquivo,valido_de,valido_ate,ativo,criado_em')
      .single();

    if (error) {
      await context.adminClient.storage.from('nfse-certificados').remove([storagePath]);
      await context.adminClient.rpc('nfse_delete_secret', { p_secret_id: secretId });
      throw error;
    }

    await context.adminClient.from('nfse_auditoria').insert({
      tenant_id: context.tenantId,
      usuario_id: context.user.id,
      entidade: 'certificado',
      entidade_id: certificateId,
      acao: 'upload_criptografado',
      dados: { emitterId, fileName: certificate.name, size: certificate.size },
    });

    return jsonResponse({ certificate: data }, 201);
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      500,
    );
  }
});
