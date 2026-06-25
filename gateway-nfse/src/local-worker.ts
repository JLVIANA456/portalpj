import { supabase } from './supabase.js';
import { processJob } from './processor.js';

const pollInterval = Math.max(5, Number(process.env.NFSE_LOCAL_POLL_SECONDS || 10)) * 1000;
const workerId = `local-${process.env.COMPUTERNAME || 'windows'}-${crypto.randomUUID()}`;
let running = false;

async function cycle() {
  if (running) return;
  running = true;
  try {
    const { data: jobs, error } = await supabase.rpc('nfse_claim_jobs', {
      p_worker: workerId,
      p_limit: 10,
    });
    if (error) throw error;

    for (const job of jobs || []) {
      try {
        const result = await processJob(job);
        await supabase.from('nfse_jobs').update({
          status: 'concluido',
          concluido_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          ultimo_erro: null,
        }).eq('id', job.id);
        console.log(`[OK] ${job.tipo} ${job.id} -> ${result?.id || 'concluído'}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        const terminal = job.tentativas >= job.max_tentativas;
        await supabase.from('nfse_jobs').update({
          status: terminal ? 'cancelado' : 'erro',
          ultimo_erro: message,
          executar_apos: new Date(Date.now() + Math.min(60, 2 ** job.tentativas) * 60_000).toISOString(),
          atualizado_em: new Date().toISOString(),
        }).eq('id', job.id);
        console.error(`[ERRO] ${job.tipo} ${job.id}: ${message}`);
      }
    }
  } catch (error) {
    console.error('[WORKER]', error);
  } finally {
    running = false;
  }
}

console.log(`Worker local NFS-e ativo: ${workerId}. Consulta a cada ${pollInterval / 1000}s.`);
await cycle();
setInterval(cycle, pollInterval);
