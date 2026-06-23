begin;

-- Habilita Realtime na tabela nfse_jobs para o frontend receber
-- atualizações de status em tempo real via Supabase Realtime.
alter publication supabase_realtime add table public.nfse_jobs;

-- Também habilita para nfse_notas (ControleTab live table)
alter publication supabase_realtime add table public.nfse_notas;

commit;
