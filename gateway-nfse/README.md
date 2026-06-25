# Gateway fiscal NFS-e

Serviço privado responsável por:

- descriptografar o certificado A1;
- extrair chave e certificado do PKCS#12;
- montar e assinar XMLDSig enveloped;
- validar DPS e eventos nos XSD oficiais;
- abrir conexão mTLS com SEFIN/ADN;
- compactar e descompactar os documentos no formato GZip + Base64.

Produção fica bloqueada até `NFSE_ENABLE_PRODUCTION=true`.

## Executar

```powershell
Copy-Item .env.example .env
npm install
npm run local-worker
```

O modo `local-worker` não abre portas e não exige túnel. Ele consulta a fila no
Supabase e se conecta diretamente ao Portal Nacional usando o certificado A1.
O computador precisa permanecer ligado, conectado à internet e sem suspensão.

## Serviço HTTP opcional

```powershell
npm run dev
```

Esse modo é usado somente quando houver hospedagem externa.

## Implantar no Cloud Run (opcional)

```powershell
gcloud builds submit --tag REGION-docker.pkg.dev/PROJETO/REPOSITORIO/nfse-gateway
gcloud run deploy nfse-gateway `
  --image REGION-docker.pkg.dev/PROJETO/REPOSITORIO/nfse-gateway `
  --region southamerica-east1 `
  --no-allow-unauthenticated
```

Também é possível protegê-lo com o token interno definido em
`NFSE_FISCAL_GATEWAY_TOKEN`. Não exponha a URL diretamente no frontend.
