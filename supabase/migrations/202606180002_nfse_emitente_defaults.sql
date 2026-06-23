begin;

alter table public.nfse_emitentes
  add column if not exists simples_regime_apuracao text
    check (simples_regime_apuracao is null or simples_regime_apuracao in ('1', '2', '3')),
  add column if not exists codigo_tributacao_nacional_padrao text,
  add column if not exists codigo_tributacao_municipal_padrao text;

comment on column public.nfse_emitentes.simples_regime_apuracao is
  'regApTribSN: 1=SN federal e municipal; 2=federal no SN e ISS fora; 3=tributos fora do SN.';
comment on column public.nfse_emitentes.regime_tributario is
  'regEspTrib do padrão nacional: 0=nenhum, 1=cooperativa, 2=estimativa, 3=ME municipal, 4=notário, 5=autônomo, 6=sociedade de profissionais, 9=outros.';

commit;
