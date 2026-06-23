import { supabase } from './supabase.js';
import { processJob } from './processor.js';

const jobId = process.argv[2];
if (!jobId) throw new Error('Informe o ID do job.');

const { data: job, error } = await supabase
  .from('nfse_jobs')
  .select('*')
  .eq('id', jobId)
  .single();
if (error || !job) throw error || new Error('Job não encontrado.');

const result = await processJob(job);
await supabase.from('nfse_jobs').update({
  status: 'concluido',
  concluido_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
  ultimo_erro: null,
}).eq('id', job.id);

console.log(JSON.stringify({ jobId, result }, null, 2));
