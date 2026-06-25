// Script para criar o bucket notas_fiscais e configurar policies via API
// Rode com: node setup_supabase.mjs

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY apenas no ambiente do servidor.');
}

const headers = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY
};

async function run() {
  console.log('🚀 Iniciando setup do Supabase...\n');

  // 1. Criar bucket
  console.log('📦 Criando bucket notas_fiscais...');
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: 'notas_fiscais', name: 'notas_fiscais', public: true })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('✅ Bucket criado com sucesso!');
    } else if (data.error === 'Duplicate') {
      console.log('ℹ️  Bucket já existe. Atualizando para público...');
      // Atualizar bucket existente
      const updateRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/notas_fiscais`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ public: true })
      });
      const updateData = await updateRes.json();
      console.log(updateRes.ok ? '✅ Bucket atualizado!' : `⚠️ ${JSON.stringify(updateData)}`);
    } else {
      console.log(`⚠️ Storage: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error('❌ Erro ao criar bucket:', err.message);
  }

  // 2. Criar policies via RPC (usando service_role que bypassa RLS)
  console.log('\n📋 Configurando policies da tabela notas_fiscais...');

  const sqlPolicies = `
    ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow insert notas_fiscais" ON notas_fiscais;
    DROP POLICY IF EXISTS "Allow select notas_fiscais" ON notas_fiscais;
    DROP POLICY IF EXISTS "Allow update notas_fiscais" ON notas_fiscais;

    CREATE POLICY "Allow insert notas_fiscais" ON notas_fiscais FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Allow select notas_fiscais" ON notas_fiscais FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow update notas_fiscais" ON notas_fiscais FOR UPDATE TO authenticated USING (true);
  `;

  // Executar SQL via endpoint de query do Supabase (Management API não disponível sem PAT)
  // Tentando via edge function ou rpc
  console.log('\n⚠️  Para as policies da tabela, você AINDA precisa rodar no SQL Editor:');
  console.log('-----------------------------------------------');
  console.log(sqlPolicies);
  console.log('-----------------------------------------------');
  console.log('\n✅ Bucket configurado! Cole o SQL acima no Editor SQL do Supabase.');
  console.log('   Link: https://supabase.com/dashboard/project/nitjribfgvlnndhberxg/sql/new');
}

run();
