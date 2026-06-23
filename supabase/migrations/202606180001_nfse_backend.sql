begin;

create extension if not exists pgcrypto;
create extension if not exists supabase_vault with schema vault;

do $$ begin
  create type public.nfse_ambiente as enum ('homologacao', 'producao');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.nfse_job_tipo as enum ('emitir', 'consultar', 'cancelar', 'sincronizar_adn');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.nfse_job_status as enum ('pendente', 'processando', 'concluido', 'erro', 'cancelado');
exception when duplicate_object then null;
end $$;

create or replace function public.nfse_current_tenant_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.perfis_pj
  where id = auth.uid()
$$;

create or replace function public.nfse_is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select cargo in ('admin_tenant', 'super_admin')
     from public.perfis_pj
     where id = auth.uid()),
    false
  )
$$;

create table if not exists public.nfse_emitentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  criado_por uuid not null references auth.users(id),
  cnpj text not null,
  razao_social text not null,
  nome_fantasia text,
  inscricao_municipal text,
  codigo_municipio_ibge text not null,
  regime_tributario text,
  optante_simples boolean not null default false,
  email text,
  telefone text,
  endereco jsonb not null default '{}'::jsonb,
  ambiente public.nfse_ambiente not null default 'homologacao',
  serie_dps text not null default '1',
  proximo_numero_dps bigint not null default 1 check (proximo_numero_dps > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, cnpj, inscricao_municipal)
);

create table if not exists public.nfse_clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  criado_por uuid not null references auth.users(id),
  tipo_pessoa text not null default 'juridica' check (tipo_pessoa in ('fisica', 'juridica', 'estrangeira')),
  cpf_cnpj text,
  nif text,
  razao_social text not null,
  email text,
  telefone text,
  endereco jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.nfse_certificados (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  emitente_id uuid not null references public.nfse_emitentes(id) on delete cascade,
  criado_por uuid not null references auth.users(id),
  nome_arquivo text not null,
  storage_path text not null unique,
  senha_secret_id uuid,
  certificado_serial text,
  certificado_subject text,
  valido_de timestamptz,
  valido_ate timestamptz,
  thumbprint_sha256 text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.nfse_dps (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  emitente_id uuid not null references public.nfse_emitentes(id),
  cliente_id uuid references public.nfse_clientes(id),
  criado_por uuid not null references auth.users(id),
  ambiente public.nfse_ambiente not null default 'homologacao',
  serie text not null,
  numero bigint not null,
  competencia date not null,
  data_emissao timestamptz not null default now(),
  codigo_servico_nacional text not null,
  codigo_servico_municipal text,
  municipio_incidencia_ibge text not null,
  descricao_servico text not null,
  valor_servico numeric(15,2) not null check (valor_servico >= 0),
  valores jsonb not null default '{}'::jsonb,
  tributacao jsonb not null default '{}'::jsonb,
  tomador_snapshot jsonb not null default '{}'::jsonb,
  prestador_snapshot jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  xml_dps_path text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'fila', 'processando', 'autorizada', 'rejeitada', 'erro')),
  erro_codigo text,
  erro_mensagem text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (emitente_id, ambiente, serie, numero)
);

create table if not exists public.nfse_notas (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  dps_id uuid not null unique references public.nfse_dps(id),
  emitente_id uuid not null references public.nfse_emitentes(id),
  cliente_id uuid references public.nfse_clientes(id),
  ambiente public.nfse_ambiente not null,
  chave_acesso text not null unique,
  numero_nfse text,
  codigo_verificacao text,
  data_emissao timestamptz,
  valor_servico numeric(15,2),
  status text not null default 'autorizada'
    check (status in ('autorizada', 'cancelada', 'substituida')),
  xml_nfse_path text,
  danfse_path text,
  resposta_autorizacao jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.nfse_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  nota_id uuid not null references public.nfse_notas(id) on delete cascade,
  criado_por uuid not null references auth.users(id),
  tipo_evento text not null,
  sequencial integer not null default 1,
  justificativa text,
  status text not null default 'fila'
    check (status in ('fila', 'processando', 'registrado', 'rejeitado', 'erro')),
  xml_pedido_path text,
  xml_evento_path text,
  resposta jsonb not null default '{}'::jsonb,
  erro_codigo text,
  erro_mensagem text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (nota_id, tipo_evento, sequencial)
);

create table if not exists public.nfse_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.empresas_contratantes(id) on delete cascade,
  criado_por uuid references auth.users(id),
  tipo public.nfse_job_tipo not null,
  status public.nfse_job_status not null default 'pendente',
  entidade_id uuid not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  tentativas integer not null default 0,
  max_tentativas integer not null default 5,
  executar_apos timestamptz not null default now(),
  bloqueado_em timestamptz,
  bloqueado_por text,
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create table if not exists public.nfse_auditoria (
  id bigint generated always as identity primary key,
  tenant_id text not null,
  usuario_id uuid,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  request_id text,
  ip inet,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.nfse_configuracoes (
  tenant_id text primary key references public.empresas_contratantes(id) on delete cascade,
  ambiente_padrao public.nfse_ambiente not null default 'homologacao',
  gateway_ativo boolean not null default false,
  processar_automaticamente boolean not null default true,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

create index if not exists nfse_emitentes_tenant_idx on public.nfse_emitentes(tenant_id);
create index if not exists nfse_clientes_tenant_idx on public.nfse_clientes(tenant_id);
create index if not exists nfse_dps_tenant_status_idx on public.nfse_dps(tenant_id, status);
create index if not exists nfse_notas_tenant_emissao_idx on public.nfse_notas(tenant_id, data_emissao desc);
create index if not exists nfse_jobs_pending_idx on public.nfse_jobs(status, executar_apos, criado_em);

alter table public.nfse_emitentes enable row level security;
alter table public.nfse_clientes enable row level security;
alter table public.nfse_certificados enable row level security;
alter table public.nfse_dps enable row level security;
alter table public.nfse_notas enable row level security;
alter table public.nfse_eventos enable row level security;
alter table public.nfse_jobs enable row level security;
alter table public.nfse_auditoria enable row level security;
alter table public.nfse_configuracoes enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'nfse_emitentes', 'nfse_clientes', 'nfse_certificados', 'nfse_dps',
    'nfse_notas', 'nfse_eventos', 'nfse_jobs', 'nfse_auditoria',
    'nfse_configuracoes'
  ]
  loop
    execute format('drop policy if exists nfse_tenant_select on public.%I', tabela);
    execute format(
      'create policy nfse_tenant_select on public.%I for select to authenticated using (tenant_id = public.nfse_current_tenant_id() or public.nfse_is_tenant_admin() and tenant_id = public.nfse_current_tenant_id())',
      tabela
    );
  end loop;
end $$;

create policy nfse_emitentes_write on public.nfse_emitentes
for all to authenticated
using (tenant_id = public.nfse_current_tenant_id())
with check (tenant_id = public.nfse_current_tenant_id() and criado_por = auth.uid());

create policy nfse_clientes_write on public.nfse_clientes
for all to authenticated
using (tenant_id = public.nfse_current_tenant_id())
with check (tenant_id = public.nfse_current_tenant_id() and criado_por = auth.uid());

create policy nfse_certificados_admin_write on public.nfse_certificados
for all to authenticated
using (tenant_id = public.nfse_current_tenant_id() and public.nfse_is_tenant_admin())
with check (tenant_id = public.nfse_current_tenant_id() and public.nfse_is_tenant_admin());

create policy nfse_dps_insert on public.nfse_dps
for insert to authenticated
with check (tenant_id = public.nfse_current_tenant_id() and criado_por = auth.uid());

create policy nfse_eventos_insert on public.nfse_eventos
for insert to authenticated
with check (tenant_id = public.nfse_current_tenant_id() and criado_por = auth.uid());

create policy nfse_config_admin_write on public.nfse_configuracoes
for all to authenticated
using (tenant_id = public.nfse_current_tenant_id() and public.nfse_is_tenant_admin())
with check (tenant_id = public.nfse_current_tenant_id() and public.nfse_is_tenant_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('nfse-certificados', 'nfse-certificados', false, 10485760,
   array['application/x-pkcs12', 'application/pkcs12', 'application/octet-stream']),
  ('nfse-documentos', 'nfse-documentos', false, 20971520,
   array['application/xml', 'text/xml', 'application/json', 'application/pdf', 'application/octet-stream'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nfse_documentos_tenant_read on storage.objects;
create policy nfse_documentos_tenant_read on storage.objects
for select to authenticated
using (
  bucket_id = 'nfse-documentos'
  and (storage.foldername(name))[1] = public.nfse_current_tenant_id()
);

revoke all on vault.decrypted_secrets from public, anon, authenticated;

create or replace function public.nfse_store_secret(
  p_secret text,
  p_name text,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Acesso negado';
  end if;
  return vault.create_secret(p_secret, p_name, p_description);
end;
$$;

create or replace function public.nfse_read_secret(p_secret_id uuid)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select case
    when auth.role() = 'service_role'
      then (select decrypted_secret from vault.decrypted_secrets where id = p_secret_id)
    else null
  end
$$;

create or replace function public.nfse_delete_secret(p_secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Acesso negado';
  end if;
  delete from vault.secrets where id = p_secret_id;
end;
$$;

revoke all on function public.nfse_store_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.nfse_read_secret(uuid) from public, anon, authenticated;
revoke all on function public.nfse_delete_secret(uuid) from public, anon, authenticated;
grant execute on function public.nfse_store_secret(text, text, text) to service_role;
grant execute on function public.nfse_read_secret(uuid) to service_role;
grant execute on function public.nfse_delete_secret(uuid) to service_role;

create or replace function public.nfse_claim_jobs(p_worker text, p_limit integer default 10)
returns setof public.nfse_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Acesso negado';
  end if;

  return query
  with escolhidos as (
    select id
    from public.nfse_jobs
    where status in ('pendente', 'erro')
      and executar_apos <= now()
      and tentativas < max_tentativas
    order by criado_em
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  update public.nfse_jobs j
  set status = 'processando',
      tentativas = tentativas + 1,
      bloqueado_em = now(),
      bloqueado_por = p_worker,
      atualizado_em = now()
  from escolhidos
  where j.id = escolhidos.id
  returning j.*;
end;
$$;

revoke all on function public.nfse_claim_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.nfse_claim_jobs(text, integer) to service_role;

commit;
