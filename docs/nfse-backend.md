# Backend NFS-e Nacional

## Arquitetura

O Supabase é o sistema de registro, autenticação, autorização, armazenamento e
orquestração do emissor:

1. O React autentica pelo Supabase Auth.
2. `nfse-api` valida o JWT e aplica o tenant do perfil autenticado.
3. DPS e eventos são gravados e transformados em jobs idempotentes.
4. `nfse-worker` reserva jobs com lock e `skip locked`.
5. O worker chama um gateway fiscal privado.
6. O gateway obtém o A1 cifrado, recupera a senha pelo Vault, monta e valida o
   XML no XSD oficial, assina o XML e realiza a conexão mTLS.
7. XML, eventos e DANFSe retornam para buckets privados no Supabase.

O gateway fiscal é separado das Edge Functions porque a comunicação oficial
exige certificado cliente na conexão TLS e manipulação completa de PKCS#12/XMLDSig.
Ele pode ser executado em Cloud Run, Fly.io, AWS ECS/Fargate ou VPS privada.

## Segurança

- Nunca use `SUPABASE_SERVICE_ROLE_KEY` no Vite.
- Certificados são cifrados com AES-256-GCM antes de entrar no Storage.
- Senhas são armazenadas no Supabase Vault.
- Buckets `nfse-certificados` e `nfse-documentos` são privados.
- O navegador nunca recebe PFX, senha, XML assinado não autorizado ou chave de serviço.
- Todas as tabelas fiscais usam RLS por `tenant_id`.
- Emissão e cancelamento usam chaves de idempotência.
- Toda operação sensível gera registro em `nfse_auditoria`.

## Aplicar banco

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

## Configurar secrets das Edge Functions

Gere a chave de criptografia localmente:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Depois configure:

```powershell
npx supabase secrets set NFSE_CERTIFICATE_ENCRYPTION_KEY="BASE64_32_BYTES"
npx supabase secrets set NFSE_FISCAL_GATEWAY_URL="https://gateway-interno.example.com"
npx supabase secrets set NFSE_FISCAL_GATEWAY_TOKEN="TOKEN_FORTE"
npx supabase secrets set NFSE_WORKER_SECRET="TOKEN_FORTE_DIFERENTE"
```

## Publicar funções

```powershell
npx supabase functions deploy nfse-api
npx supabase functions deploy nfse-certificate
npx supabase functions deploy nfse-worker --no-verify-jwt
```

## Agendar worker

O endpoint `nfse-worker` deve ser chamado a cada minuto por Supabase Cron ou
outro agendador, enviando `x-worker-secret`. O worker processa no máximo dez
jobs por chamada e calcula retentativas com atraso exponencial.

## Contrato do gateway fiscal

Endpoint privado:

```text
POST /v1/nfse/execute
Authorization: Bearer <NFSE_FISCAL_GATEWAY_TOKEN>
```

Operações:

- `emitir`: montar, validar e assinar DPS; enviar `POST /nfse`.
- `consultar`: consultar `GET /nfse/{chaveAcesso}`.
- `cancelar`: montar e assinar pedido de evento; enviar
  `POST /nfse/{chaveAcesso}/eventos`.
- `sincronizar_adn`: consumir distribuição por NSU no ADN.

O gateway deve usar os XSD e anexos oficiais correspondentes ao ambiente e
recusar produção quando a versão configurada divergir da versão homologada.

## Arquivos criados

- `supabase/migrations/202606180001_nfse_backend.sql`
- `supabase/functions/nfse-api`
- `supabase/functions/nfse-certificate`
- `supabase/functions/nfse-worker`
- `src/lib/nfse.ts`
