-- Cadastros financeiros: Categoria e Centro de Custo (usados em Contas a Pagar / Novo Lançamento).
-- Rode este script UMA VEZ no SQL Editor do Supabase.

create table if not exists public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'tenant-1',
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'tenant-1',
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

alter table public.categorias_financeiras enable row level security;
alter table public.centros_custo enable row level security;

drop policy if exists categorias_financeiras_all on public.categorias_financeiras;
create policy categorias_financeiras_all on public.categorias_financeiras
  for all to authenticated using (true) with check (true);

drop policy if exists centros_custo_all on public.centros_custo;
create policy centros_custo_all on public.centros_custo
  for all to authenticated using (true) with check (true);

-- Semeia com a lista que hoje está fixa no código, para o tenant padrão (tenant-1).
-- Se você usa outro tenant_id em produção, ajuste o valor abaixo antes de rodar,
-- ou cadastre as categorias/centros manualmente pela tela "Cadastros" depois.
insert into public.categorias_financeiras (tenant_id, nome) values
  ('tenant-1', 'Administrativo'),
  ('tenant-1', 'Aluguel'),
  ('tenant-1', 'Banco e Tarifas'),
  ('tenant-1', 'Contabilidade'),
  ('tenant-1', 'Energia'),
  ('tenant-1', 'Fornecedor'),
  ('tenant-1', 'Impostos'),
  ('tenant-1', 'Marketing'),
  ('tenant-1', 'Materiais'),
  ('tenant-1', 'Pró-labore'),
  ('tenant-1', 'Salários'),
  ('tenant-1', 'Sistema / Software'),
  ('tenant-1', 'Telefonia / Internet'),
  ('tenant-1', 'Terceiros'),
  ('tenant-1', 'Outros')
on conflict (tenant_id, nome) do nothing;

insert into public.centros_custo (tenant_id, nome) values
  ('tenant-1', 'Administrativo'),
  ('tenant-1', 'Comercial'),
  ('tenant-1', 'Contábil'),
  ('tenant-1', 'Departamento Pessoal'),
  ('tenant-1', 'Diretoria'),
  ('tenant-1', 'Financeiro'),
  ('tenant-1', 'Fiscal'),
  ('tenant-1', 'Operacional'),
  ('tenant-1', 'Qualidade'),
  ('tenant-1', 'Tecnologia')
on conflict (tenant_id, nome) do nothing;
