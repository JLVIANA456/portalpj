-- Habilita a extensão HTTP no Supabase (Necessária para fazer chamadas de API externas)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- IMPORTANTE: a chave da API do Resend NÃO fica neste arquivo (que é versionado no Git).
-- Ela é lida em tempo de execução do Supabase Vault. Para cadastrar/atualizar a chave,
-- rode o comando abaixo UMA VEZ no SQL Editor do painel do Supabase (nunca salve isso em arquivo):
--
--   select vault.create_secret('SUA_CHAVE_RESEND_AQUI', 'resend_api_key', 'Chave da API do Resend');
--
-- Se a chave já existir e precisar ser trocada (ex: rotação por vazamento), use vault.update_secret:
--
--   select vault.update_secret((select id from vault.secrets where name = 'resend_api_key'), 'NOVA_CHAVE_AQUI');

revoke all on vault.decrypted_secrets from public, anon, authenticated;

-- Remove QUALQUER versão anterior de send_email_with_resend, seja qual for a assinatura.
-- Isso é necessário porque CREATE OR REPLACE só substitui uma função com a MESMA assinatura;
-- versões antigas com número diferente de parâmetros (ex: sem reply_to/attachments) ficariam
-- "esquecidas" no banco e continuariam sendo chamadas com a chave antiga hardcoded.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'send_email_with_resend'
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

-- Cria a função RPC que o Frontend chama (ver src/lib/resend.ts)
CREATE FUNCTION public.send_email_with_resend(
  to_email text,
  subject text,
  html_content text,
  reply_to_email text DEFAULT NULL,
  attachments_data jsonb DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  -- Chave da API do Resend, lida do Supabase Vault (nunca hardcoded aqui)
  resend_api_key text := (
    select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key' limit 1
  );

  request_body json;
  response extensions.http_response;
BEGIN
  IF resend_api_key IS NULL THEN
    RAISE EXCEPTION 'Segredo "resend_api_key" não encontrado no Supabase Vault. Cadastre-o via SQL Editor antes de usar esta função.';
  END IF;

  -- Monta o corpo da requisição que o Resend exige (remove campos opcionais vazios/nulos)
  request_body := json_strip_nulls(json_build_object(
    'from', 'JLVIANA Consultoria Contábil <comunicado@jlviana.com>',
    'to', json_build_array(to_email),
    'subject', subject,
    'html', html_content,
    'reply_to', reply_to_email,
    'attachments', CASE WHEN attachments_data = '[]'::jsonb THEN NULL ELSE attachments_data END
  ));

  -- Faz a chamada HTTP (POST) para a API do Resend
  SELECT * INTO response FROM extensions.http((
    'POST',
    'https://api.resend.com/emails',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || resend_api_key),
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    request_body::text
  )::extensions.http_request);

  -- Retorna os dados se deu sucesso ou exibe o erro
  IF response.status >= 200 AND response.status < 300 THEN
    RETURN response.content::json;
  ELSE
    RAISE EXCEPTION 'Falha ao enviar e-mail via Resend: %', response.content;
  END IF;
END;
$$;
