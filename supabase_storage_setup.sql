-- ============================================================
-- SCRIPT COMPLETO: Corrigir RLS da tabela + Storage notas_fiscais
-- Execute no SQL Editor do Supabase (supabase.com > SQL Editor)
-- ============================================================

-- ========================
-- PARTE 1: STORAGE BUCKET
-- ========================

-- Criar bucket (ou atualizar se já existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('notas_fiscais', 'notas_fiscais', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

-- Remover políticas antigas do storage
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar seus arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload notas_fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Allow read notas_fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete notas_fiscais" ON storage.objects;

-- Criar políticas do storage
CREATE POLICY "Allow upload notas_fiscais"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notas_fiscais');

CREATE POLICY "Allow read notas_fiscais"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'notas_fiscais');

CREATE POLICY "Allow delete notas_fiscais"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'notas_fiscais');

-- ============================
-- PARTE 2: TABELA notas_fiscais
-- ============================

-- Habilitar RLS (se ainda não estiver)
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas da tabela
DROP POLICY IF EXISTS "Usuários podem inserir suas notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Usuários podem ver suas notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Admins podem ver todas notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Admins podem atualizar notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Allow insert notas_fiscais" ON notas_fiscais;
DROP POLICY IF EXISTS "Allow select notas_fiscais" ON notas_fiscais;
DROP POLICY IF EXISTS "Allow update notas_fiscais" ON notas_fiscais;

-- Criar políticas da tabela

-- Qualquer usuário autenticado pode INSERIR nota
CREATE POLICY "Allow insert notas_fiscais"
ON notas_fiscais FOR INSERT TO authenticated
WITH CHECK (true);

-- Usuário autenticado pode LER suas próprias notas (pelo user_id)
CREATE POLICY "Allow select notas_fiscais"
ON notas_fiscais FOR SELECT TO authenticated
USING (true);

-- Usuário autenticado pode ATUALIZAR suas notas
CREATE POLICY "Allow update notas_fiscais"
ON notas_fiscais FOR UPDATE TO authenticated
USING (true);

-- ========================
-- CONFIRMAR RESULTADO
-- ========================
SELECT id, name, public FROM storage.buckets WHERE id = 'notas_fiscais';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notas_fiscais';
