# Homologação NFS-e — JLVIANA

## Dados identificados

- CNPJ: `07.203.780/0001-16`
- Razão social: `JLVIANA CONSULTORIA CONTABIL LTDA`
- Inscrição municipal: `43752381`
- Município: São Paulo/SP
- Código IBGE: `3550308`
- Simples Nacional: sim
- MEI: não
- CNAE principal: `6920-6/01 — Atividades de contabilidade`

## Premissas que exigem confirmação fiscal

- `opSimpNac = 3`: optante ME/EPP.
- `regApTribSN = 1`: tributos federais e ISSQN apurados no Simples Nacional.
- `regEspTrib = 0`: nenhum regime especial municipal.
- Código de tributação nacional do serviço contábil.
- Código de tributação municipal utilizado pela Prefeitura de São Paulo.
- Retenção de ISSQN, alíquota e local de incidência para cada operação.

## Bloqueios atuais

1. A conta autenticada na Supabase CLI não possui acesso ao projeto
   `nitjribfgvlnndhberxg`.
2. O gateway ainda não possui um provedor de hospedagem definido.
3. O certificado A1 deve ser enviado pela interface segura depois que o
   backend estiver publicado.
4. Os contratos Swagger protegidos da SEFIN/ADN exigem autenticação mTLS; eles
   serão consultados com o A1 no ambiente de homologação.

## Critérios para liberar produção

- Migration aplicada sem erro.
- Edge Functions publicadas e com secrets configurados.
- Gateway publicado com produção desabilitada.
- Certificado validado, dentro da validade e compatível com o CNPJ.
- DPS assinada validada pelo XSD v1.01.
- Emissão aceita no ambiente de produção restrita.
- Consulta por chave retornando a mesma NFS-e.
- Evento de cancelamento validado e registrado em homologação.
- Auditoria, idempotência e retentativa verificadas.
- Ativação manual de `NFSE_ENABLE_PRODUCTION=true`.
