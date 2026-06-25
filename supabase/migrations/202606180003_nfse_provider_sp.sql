begin;

alter table public.nfse_emitentes
  add column if not exists provedor_nfse text not null default 'nacional'
    check (provedor_nfse in ('nacional', 'sao_paulo')),
  add column if not exists codigo_servico_municipal_padrao text,
  add column if not exists habilitado_producao boolean not null default false;

update public.nfse_emitentes
set provedor_nfse = 'sao_paulo',
    codigo_servico_municipal_padrao = coalesce(codigo_servico_municipal_padrao, '03158'),
    habilitado_producao = false
where codigo_municipio_ibge = '3550308'
  and cnpj = '07203780000116';

comment on column public.nfse_emitentes.provedor_nfse is
  'Roteador fiscal: nacional=SEFIN Nacional; sao_paulo=Nota Fiscal Paulistana/Nota do Milhao.';
comment on column public.nfse_emitentes.habilitado_producao is
  'Somente habilitar depois da homologacao/teste do provedor correspondente.';

commit;
