-- Habilita a extensão HTTP no Supabase (Necessária para fazer chamadas de API externas)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Cria a função RPC que o seu Frontend está chamando
CREATE OR REPLACE FUNCTION public.send_email_with_resend(
  to_email text,
  subject text,
  html_content text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Chave da API do Resend
  resend_api_key text := 're_LKH1oeKs_BFV4KuoXshpPFBnCtEed5yvL'; 
  
  request_body json;
  response extensions.http_response;
BEGIN
  -- Monta o corpo da requisição que o Resend exige
  request_body := json_build_object(
    'from', 'JLVIANA Consultoria Contábil <comunicado@jlviana.com>', 
    'to', json_build_array(to_email),
    'subject', subject,
    'html', html_content
  );

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
