import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, CheckCircle2, AlertCircle, FileText, ArrowRightLeft,
  RefreshCw, CreditCard, Layers, DollarSign, ChevronDown, ChevronRight,
  Brain, Info, Eye, Search, X, Link2, Loader2,
  Files, Trash2, ChevronRight as Arrow, CircleDot, Building2, FileSpreadsheet,
  BookOpen, Pencil
} from 'lucide-react';
import { PJUser, Invoice } from '../types';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface ConciliacaoViewProps {
  user: PJUser;
}

type WizardStep = 'upload_nf' | 'upload_ofx' | 'result';

interface RawOfxTransaction {
  fitid: string;
  date: Date;
  amount: number;
  memo: string;
  trntype: 'DEBIT' | 'CREDIT' | 'OTHER';
}

interface ProcessedTransaction {
  id: string;
  date: Date;
  totalAmount: number;
  iofAmount: number;
  grossAmount: number;
  memo: string;
  isCredit: boolean;
  isPayment: boolean;
  isParcela: boolean;
  parcelaNumero: number | null;
  parcelaTotalParcelas: number | null;
  parcelaBaseDescription: string | null;
  isForeign: boolean;
  iofChildren: RawOfxTransaction[];
}

export interface NotaFiscal {
  id: string;
  numero: string;
  date: Date;
  competencia: Date;
  amount: number;
  prestador: string;
  cnpjPrestador: string;
  tomador: string;
  descricao: string;
  status: 'open' | 'conciliada' | 'cancelada';
  nomeHospede?: string;
  reserva?: string;
  keywords?: string[];
  invoiceRef?: Invoice;
  fileName?: string;
  extractionStatus?: 'pending' | 'extracting' | 'done' | 'error';
}

type MatchStatus =
  | 'matched_exact' | 'matched_date' | 'matched_fuzzy'
  | 'matched_parcela' | 'matched_aggregate'
  | 'ai_suggested' | 'pending' | 'ignored';

interface MatchResult {
  transaction: ProcessedTransaction;
  notasFiscais: NotaFiscal[];
  status: MatchStatus;
  confidence: number;
  reason: string;
  aggregatedGroup?: ProcessedTransaction[];
  validated?: boolean;
  contaContabil?: ContaContabil;
  contaConfidence?: number;
  contaReason?: string;
}

interface ContaContabil {
  codigo: string;
  classificacao: string;
  nome: string;
  grau: number;
  sintetica: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRAÇÃO DETERMINÍSTICA DE NFS-e
// ─────────────────────────────────────────────────────────────────────────────

function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseDateBR(s: string): Date {
  const [d, m, y] = s.trim().split('/');
  return new Date(`${y}-${m}-${d}T12:00:00`);
}

function buildKeywords(prestador: string, descricao: string): string[] {
  const text = (prestador + ' ' + descricao).toLowerCase();
  const kw = new Set<string>();
  const map: Record<string, string[]> = {
    google: ['google', 'gsuite', 'workspace'],
    facebook: ['facebk', 'facebook', 'meta'],
    intercity: ['intercity', 'ich'],
    microsoft: ['microsoft', 'ms365'],
    amazon: ['amazon', 'aws'],
    openai: ['openai', 'chatgpt'],
    linkedin: ['linkedin'],
    zoom: ['zoom'],
    slack: ['slack'],
    uber: ['uber'],
    zoho: ['zoho'],
    ifood: ['ifood'],
  };
  for (const [key, vals] of Object.entries(map)) {
    if (text.includes(key)) vals.forEach(v => kw.add(v));
  }
  const first = prestador.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  if (first.length > 3) kw.add(first);
  return [...kw].sort();
}

function parseNFSe(text: string): Partial<NotaFiscal> {
  const numeroMatch = text.match(/Número da Nota\n.+?\n(\d+)/);
  const numero = (numeroMatch?.[1] ?? '').replace(/^0+/, '');

  const issueMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/);
  const issueDate = issueMatch ? parseDateBR(issueMatch[1]) : new Date();

  const cnpjMatch = text.match(/CPF\/CNPJ:\s*([\d.\/\-]+)/);
  const cnpjPrestador = cnpjMatch?.[1]?.trim() ?? '';

  const allNomes = [...text.matchAll(/Nome\/Razão Social:\s*(.+?)(?:\n|CPF)/g)];
  const prestador = (allNomes[0]?.[1] ?? '').trim().replace(/\.$/, '');
  const tomador = (allNomes[1]?.[1] ?? '').trim();

  const discMatch = text.match(/DISCRIMINAÇÃO DE SERVIÇOS\s*\n([\s\S]*?)VALOR TOTAL/);
  const discLines = (discMatch?.[1] ?? '').split('\n')
    .map(l => l.trim()).filter(l => l && l !== '-' && !l.startsWith('VERSAO'));
  const descricao = discLines.slice(0, 2).join(' | ').slice(0, 120);

  const valorMatch = text.match(/VALOR TOTAL DO SERVI[ÇC]O\s*=\s*R\$\s*([\d.,]+)/);
  const amount = valorMatch ? parseBRL(valorMatch[1]) : 0;

  const hospedeMatch = text.match(/HOSPEDE:\s*(.+)/);
  const reservaMatch = text.match(/RESERVA:\s*(\S+)/);
  const checkinMatch = text.match(/CHECKIN:\s*(\d{2}\/\d{2}\/\d{4})/);
  const nomeHospede = hospedeMatch?.[1]?.trim() || undefined;
  const reserva = reservaMatch?.[1]?.trim() || undefined;
  const checkin = checkinMatch ? parseDateBR(checkinMatch[1]) : undefined;

  let competencia = issueDate;
  if (checkin) {
    competencia = checkin;
  } else {
    const months: Record<string, string> = {
      janeiro: '01', fevereiro: '02', 'março': '03', marco: '03', abril: '04',
      maio: '05', junho: '06', julho: '07', agosto: '08',
      setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
    };
    const mc = text.match(
      /(?:durante o m[eê]s|compet[eê]ncia|referente a|m[eê]s de)\s+(\w+)(?:\s+de\s+(\d{4}))?/i
    );
    if (mc) {
      const mn = mc[1].toLowerCase();
      const yr = mc[2] ?? String(issueDate.getFullYear());
      competencia = new Date(`${yr}-${months[mn] ?? '01'}-01T12:00:00`);
    }
  }

  return {
    numero, date: issueDate, competencia, amount,
    prestador, cnpjPrestador, tomador, descricao,
    nomeHospede, reserva, status: 'open',
    keywords: buildKeywords(prestador, descricao),
  };
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = (window as any).pdfjsLib ?? (window as any)['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) throw new Error('pdfjs-dist não encontrado — adicione ao index.html');
  if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lineMap = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x: item.transform[4], text: item.str });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const lines = sortedYs.map(y =>
      lineMap.get(y)!
        .sort((a, b) => a.x - b.x)
        .map(w => w.text)
        .join(' ')
        .trim()
    ).filter(Boolean);

    pageTexts.push(lines.join('\n'));
  }

  return pageTexts.join('\n');
}

async function extractNotaFiscalFromPDF(arrayBuffer: ArrayBuffer, fileName: string): Promise<Partial<NotaFiscal>> {
  try {
    const text = await extractTextFromPDF(arrayBuffer);
    return parseNFSe(text);
  } catch (err) {
    console.warn('[parseNFSe] falhou:', err);
    return { descricao: fileName, status: 'open' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: notas do Supabase
// ─────────────────────────────────────────────────────────────────────────────

function useNotasFiscais(user: PJUser) {
  const [supabaseNotas, setSupabaseNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('invoices').select('*').eq('status', 'pendente').order('issueDate', { ascending: false });
      if (user.tenantId) q = q.eq('tenantId', user.tenantId);
      else q = q.eq('userId', user.id);
      const { data } = await q;
      if (data) setSupabaseNotas((data as Invoice[]).map(invoiceToNota));
    } finally {
      setLoading(false);
    }
  }, [user.id, user.tenantId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { supabaseNotas, loading, refetch: fetch };
}

function invoiceToNota(inv: Invoice): NotaFiscal {
  const monthMap: Record<string, string> = {
    janeiro: '01', fevereiro: '02', 'março': '03', marco: '03', abril: '04', maio: '05',
    junho: '06', julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
  };
  return {
    id: inv.id, numero: inv.invoiceNumber,
    date: new Date(inv.issueDate),
    competencia: new Date(`${inv.competenciaYear}-${monthMap[inv.competenciaMonth?.toLowerCase()] ?? '01'}-01`),
    amount: inv.amount, prestador: inv.companyName, cnpjPrestador: inv.cnpj,
    tomador: '', descricao: inv.notes ?? '',
    status: inv.status === 'pendente' ? 'open' : inv.status === 'aprovado' ? 'conciliada' : 'cancelada',
    invoiceRef: inv,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE OFX
// ─────────────────────────────────────────────────────────────────────────────

function parseOFXRaw(ofxString: string): RawOfxTransaction[] {
  const transactions: RawOfxTransaction[] = [];
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let m;
  while ((m = re.exec(ofxString)) !== null) {
    const b = m[1];
    const get = (tag: string) => b.match(new RegExp(`<${tag}>(.*?)(?:\\r|\\n|<|\\[)`))?.[1]?.trim() ?? '';
    const ds = get('DTPOSTED');
    let date = new Date();
    if (ds.length >= 8) date = new Date(`${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}T12:00:00`);
    transactions.push({
      fitid: get('FITID') || crypto.randomUUID(),
      date, amount: parseFloat(get('TRNAMT').replace(',', '.')) || 0,
      memo: get('MEMO') || get('NAME') || '',
      trntype: (get('TRNTYPE') || 'DEBIT').toUpperCase() as RawOfxTransaction['trntype'],
    });
  }
  return transactions;
}

function extractIofBase(memo: string): string | null {
  return memo.match(/^IOF\s+de\s+"(.+)"$/i)?.[1] ?? null;
}

function detectParcela(memo: string) {
  const m = memo.match(/^(.+?)\s*-\s*Parcela\s+(\d+)\/(\d+)$/i);
  return m ? { base: m[1].trim(), num: parseInt(m[2]), total: parseInt(m[3]) } : null;
}

function preprocessOFX(raw: RawOfxTransaction[]): ProcessedTransaction[] {
  const iofMap = new Map<string, RawOfxTransaction[]>();
  for (const r of raw) {
    const base = extractIofBase(r.memo);
    if (base) { if (!iofMap.has(base)) iofMap.set(base, []); iofMap.get(base)!.push(r); }
  }
  return raw.filter(r => !extractIofBase(r.memo)).map(r => {
    const isCredit = r.amount > 0;
    const iofChildren = iofMap.get(r.memo) ?? [];
    const iofTotal = iofChildren.reduce((s, x) => s + Math.abs(x.amount), 0);
    const parcela = detectParcela(r.memo);
    return {
      id: r.fitid, date: r.date,
      totalAmount: Math.abs(r.amount), iofAmount: iofTotal,
      grossAmount: Math.abs(r.amount) + iofTotal,
      memo: r.memo, isCredit, isPayment: isCredit && /pagamento\s+recebido/i.test(r.memo),
      isParcela: !!parcela, parcelaNumero: parcela?.num ?? null,
      parcelaTotalParcelas: parcela?.total ?? null, parcelaBaseDescription: parcela?.base ?? null,
      isForeign: iofChildren.length > 0, iofChildren,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE CONCILIAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+(ltda|s\.?a\.?|eireli|me|epp)\.?\s*$/i, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function jaccard(a: string, b: string): number {
  const ta = new Set(normalize(a).split(' ').filter(t => t.length > 2));
  const tb = new Set(normalize(b).split(' ').filter(t => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let i = 0; ta.forEach(t => { if (tb.has(t)) i++; });
  return i / Math.max(ta.size, tb.size);
}

function parsePlanoContasWorkbook(arrayBuffer: ArrayBuffer): ContaContabil[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', WTF: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]] ?? (workbook as any).Preamble;
  if (!sheet) throw new Error('A planilha não possui uma aba de contas legível.');

  const ref = sheet['!ref'] ?? 'A1:V5000';
  const range = XLSX.utils.decode_range(ref);
  const contas: ContaContabil[] = [];

  for (let row = Math.max(7, range.s.r + 1); row <= range.e.r + 1; row++) {
    const value = (column: string) => sheet[`${column}${row}`]?.v;
    const codigo = value('A');
    const classificacao = value('H');
    const nome = ['P', 'O', 'N', 'M', 'L']
      .map(value)
      .find(v => typeof v === 'string' && v.trim());
    const grau = Number(value('U') ?? 0);
    if (codigo == null || !classificacao || !nome || !grau) continue;

    contas.push({
      codigo: String(codigo).trim(),
      classificacao: String(classificacao).trim(),
      nome: String(nome).trim(),
      grau,
      sintetica: String(value('D') ?? '').toUpperCase() === 'S',
    });
  }

  if (contas.length === 0) throw new Error('Nenhuma conta foi encontrada no relatório da Domínio.');
  return contas;
}

const ACCOUNT_CLASSIFICATION_RULES: Array<{ source: string[]; account: string[]; label: string }> = [
  { source: ['google ads', 'facebook', 'facebk', 'meta ads', 'instagram', 'publicidade', 'propaganda', 'marketing'], account: ['publicidade', 'propaganda'], label: 'publicidade e anúncios' },
  { source: ['google cloud', 'workspace', 'microsoft', 'office 365', 'aws', 'amazon web services', 'openai', 'chatgpt', 'software', 'sistema', 'cloud', 'saas'], account: ['sistema e software', 'sistemas e monitoramento', 'informatica', 'software'], label: 'sistemas e software' },
  { source: ['assinatura', 'anuidade', 'subscription'], account: ['despesas com assinaturas', 'assinaturas e anuidades'], label: 'assinaturas' },
  { source: ['hotel', 'intercity', 'hospedagem', 'pousada'], account: ['hospedagem'], label: 'hospedagem' },
  { source: ['uber', '99app', 'taxi', 'transporte'], account: ['viagens', 'transportes', 'locomocao'], label: 'transporte' },
  { source: ['telefone', 'telefonia', 'claro', 'vivo', 'tim ', 'oi '], account: ['telefone'], label: 'telefonia' },
  { source: ['internet', 'comunicacao'], account: ['internet comunicacoes'], label: 'internet e comunicação' },
  { source: ['contador', 'contabilidade', 'contabil'], account: ['servs de contabilidade'], label: 'serviços contábeis' },
  { source: ['consultoria', 'assessoria'], account: ['assessoria e consultoria'], label: 'consultoria' },
  { source: ['tarifa bancaria', 'tarifa banc', 'cesta bancaria'], account: ['tarifa bancaria'], label: 'tarifa bancária' },
  { source: ['material escritorio', 'papelaria'], account: ['material de escritorio'], label: 'material de escritório' },
  { source: ['combustivel', 'posto ', 'gasolina', 'etanol'], account: ['combustiveis e lubrificantes', 'combustivel'], label: 'combustível' },
];

function suggestContaContabil(
  transaction: ProcessedTransaction,
  nota: NotaFiscal | undefined,
  contas: ContaContabil[]
): { conta?: ContaContabil; confidence: number; reason: string } {
  if (contas.length === 0) return { confidence: 0, reason: 'Plano de contas não importado' };
  const source = normalize([transaction.memo, nota?.prestador, nota?.descricao].filter(Boolean).join(' '));
  const analiticas = contas.filter(c => c.grau === 5 && !c.sintetica);

  for (const rule of ACCOUNT_CLASSIFICATION_RULES) {
    const trigger = rule.source.find(term => source.includes(normalize(term)));
    if (!trigger) continue;
    const candidates = analiticas
      .map(conta => ({
        conta,
        score: Math.max(...rule.account.map(term =>
          normalize(conta.nome).includes(normalize(term)) ? normalize(term).length : 0
        )),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) {
      return {
        conta: candidates[0].conta,
        confidence: 95,
        reason: `Sugestão por ${rule.label}: "${trigger}"`,
      };
    }
  }

  const ranked = analiticas
    .map(conta => ({ conta, score: jaccard(source, conta.nome) }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score >= 0.28) {
    return {
      conta: ranked[0].conta,
      confidence: Math.min(88, Math.round(ranked[0].score * 100)),
      reason: 'Sugestão por semelhança entre o lançamento, a NF e o nome da conta',
    };
  }
  return { confidence: 0, reason: 'Selecione a conta contábil manualmente' };
}

function keywordMatch(memo: string, keywords: string[] = []): boolean {
  const m = normalize(memo);
  return keywords.some(k => m.includes(k.toLowerCase()));
}

function diffDays(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function conciliar(transactions: ProcessedTransaction[], notas: NotaFiscal[]): MatchResult[] {
  const pool = new Map(notas.map(n => [n.id, n]));
  const results: MatchResult[] = [];

  const byKeyword = new Map<string, { nota: NotaFiscal; txs: ProcessedTransaction[] }>();
  const parcelaGroups = new Map<string, ProcessedTransaction[]>();
  const simples: ProcessedTransaction[] = [];

  for (const t of transactions) {
    if (t.isCredit || t.isPayment) continue;

    let kmatched = false;
    for (const n of pool.values()) {
      if (keywordMatch(t.memo, n.keywords)) {
        if (!byKeyword.has(n.id)) byKeyword.set(n.id, { nota: n, txs: [] });
        byKeyword.get(n.id)!.txs.push(t);
        kmatched = true; break;
      }
    }
    if (kmatched) continue;

    if (t.isParcela && t.parcelaBaseDescription) {
      const key = normalize(t.parcelaBaseDescription);
      if (!parcelaGroups.has(key)) parcelaGroups.set(key, []);
      parcelaGroups.get(key)!.push(t);
    } else {
      simples.push(t);
    }
  }

  for (const [nId, { nota, txs }] of byKeyword) {
    if (!pool.has(nId)) continue;
    const total = txs.reduce((s, t) => s + t.totalAmount, 0);
    const diff = Math.abs(nota.amount - total);
    const diffPct = diff / (nota.amount || 1);
    const rep = txs.sort((a, b) => b.totalAmount - a.totalAmount)[0];
    const rest = txs.filter(t => t.id !== rep.id);
    pool.delete(nId);
    const conf = diffPct < 0.02 ? 97 : diffPct < 0.05 ? 85 : 70;
    results.push({
      transaction: rep, notasFiscais: [nota],
      status: diffPct < 0.05 ? 'matched_aggregate' : 'ai_suggested',
      confidence: conf,
      reason: `${txs.length} lançamentos agregados → R$ ${total.toFixed(2)} (NF R$ ${nota.amount.toFixed(2)}) Δ R$ ${diff.toFixed(2)}`,
      aggregatedGroup: txs,
    });
    for (const t of rest) {
      results.push({ transaction: t, notasFiscais: [nota], status: 'ignored', confidence: 100, reason: 'Agrupado' });
    }
  }

  for (const [, parcelas] of parcelaGroups) {
    parcelas.sort((a, b) => (a.parcelaNumero ?? 0) - (b.parcelaNumero ?? 0));
    const vp = parcelas[0].totalAmount;
    const total = (parcelas[0].parcelaTotalParcelas ?? 1);
    const estimado = vp * total;
    const base = parcelas[0].parcelaBaseDescription ?? '';
    let matched: NotaFiscal | undefined;
    let bestSim = 0;
    for (const n of pool.values()) {
      const sv = Math.abs(n.amount - estimado) / (estimado || 1);
      const sn = jaccard(base, n.prestador);
      if (sv < 0.05 && sn > 0.3 && sn - sv > bestSim) { bestSim = sn - sv; matched = n; }
    }
    if (!matched) {
      for (const n of pool.values()) {
        if (Math.abs(n.amount - vp) < 0.02 && jaccard(base, n.prestador) > 0.3) { matched = n; break; }
      }
    }
    if (matched) pool.delete(matched.id);
    const [rep, ...rest] = parcelas;
    results.push({
      transaction: rep, notasFiscais: matched ? [matched] : [],
      status: matched ? 'matched_parcela' : 'pending',
      confidence: matched ? Math.round(bestSim * 100) : 0,
      reason: matched ? `Parcelamento ${total}x ~R$ ${estimado.toFixed(2)}` : 'Parcelamento sem NF',
    });
    for (const p of rest) results.push({ transaction: p, notasFiscais: matched ? [matched] : [], status: 'ignored', confidence: 100, reason: `Parcela ${p.parcelaNumero}/${p.parcelaTotalParcelas}` });
  }

  for (const t of simples) {
    let matched: NotaFiscal | undefined;
    let status: MatchStatus = 'pending';
    let conf = 0; let reason = 'Nenhuma NF encontrada';

    for (const n of pool.values()) {
      if (Math.abs(n.amount - t.totalAmount) < 0.02 && diffDays(n.date, t.date) <= 3) { matched = n; status = 'matched_exact'; conf = 99; reason = `Valor exato · Δ${diffDays(n.date, t.date).toFixed(0)}d`; break; }
    }
    if (!matched) for (const n of pool.values()) {
      if (Math.abs(n.amount - t.totalAmount) < 0.02 && diffDays(n.date, t.date) <= 7) { matched = n; status = 'matched_date'; conf = 90; reason = `Valor exato · Δ${diffDays(n.date, t.date).toFixed(0)}d`; break; }
    }
    if (!matched) for (const n of pool.values()) {
      if (Math.abs(n.amount - t.totalAmount) < 0.02 && diffDays(n.date, t.date) <= 35) { matched = n; status = 'matched_date'; conf = 80; reason = `Valor exato · Δ${diffDays(n.date, t.date).toFixed(0)}d (janela 35d)`; break; }
    }
    if (!matched) {
      let best = 0;
      for (const n of pool.values()) {
        const sv = Math.abs(n.amount - t.totalAmount) / (t.totalAmount || 1);
        const sn = jaccard(t.memo, n.prestador);
        if (sv < 0.01 && sn >= 0.5 && sn > best) { best = sn; matched = n; }
      }
      if (matched) { status = 'matched_fuzzy'; conf = Math.round(best * 100); reason = `Nome similar ${conf}%`; }
    }
    if (!matched && t.iofAmount > 0) for (const n of pool.values()) {
      if (Math.abs(n.amount - t.grossAmount) < 0.02 && diffDays(n.date, t.date) <= 5) { matched = n; status = 'matched_exact'; conf = 97; reason = `Valor+IOF bate`; break; }
    }
    if (matched) pool.delete(matched.id);
    results.push({ transaction: t, notasFiscais: matched ? [matched] : [], status, confidence: conf, reason });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<MatchStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  matched_exact: { label: 'Conciliado', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
  matched_date: { label: 'Conciliado por data', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-500/10', border: 'border-teal-200 dark:border-teal-500/30', dot: 'bg-teal-500' },
  matched_fuzzy: { label: 'Conciliado aproximado', color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/10', border: 'border-sky-200 dark:border-sky-500/30', dot: 'bg-sky-500' },
  matched_parcela: { label: 'Conciliado em parcelas', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/30', dot: 'bg-violet-500' },
  matched_aggregate: { label: 'Conciliado em grupo', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/30', dot: 'bg-indigo-500' },
  ai_suggested: { label: 'Sugestão para revisar', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500' },
  pending: { label: 'Não conciliado', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30', dot: 'bg-rose-500' },
  ignored: { label: 'Agrupado', color: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-100 dark:border-slate-700', dot: 'bg-slate-300' },
};

function StatusPill({ status }: { status: MatchStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.color} ${c.bg} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT XLSX
// ─────────────────────────────────────────────────────────────────────────────

function exportConciliacaoXlsx(
  matches: MatchResult[],
  stats: { total: number; matched: number; pending: number; value: number },
  user: PJUser
) {
  const visible = matches.filter(m => m.status !== 'ignored');
  const matched = visible.filter(m => m.status.startsWith('matched'));
  const pending = visible.filter(m => m.status === 'pending' || m.notasFiscais.length === 0);
  const ignored = matches.filter(m => m.status === 'ignored');
  const statusLabel = (status: MatchStatus) => STATUS_CFG[status]?.label ?? status;
  const yesNo = (value: boolean) => value ? 'Sim' : 'Nao';
  const dateStamp = new Date().toISOString().slice(0, 10);

  const buildRow = (m: MatchResult, origem = 'Principal') => {
    const t = m.transaction;
    const nota = m.notasFiscais[0];
    const nfAmount = nota?.amount ?? null;
    const diferenca = nfAmount == null ? null : Number(Math.abs(t.totalAmount - nfAmount).toFixed(2));
    return {
      Origem: origem,
      Status: statusLabel(m.status),
      'Confianca (%)': m.confidence,
      'Validado pelo usuario': yesNo(!!m.validated),
      'Como conciliou': m.reason,
      'OFX Data': fmtDate(t.date),
      'OFX Descricao': t.memo,
      'OFX Valor': t.totalAmount,
      'OFX IOF': t.iofAmount,
      'OFX Valor Bruto': t.grossAmount,
      Parcela: t.isParcela ? `${t.parcelaNumero}/${t.parcelaTotalParcelas}` : '',
      Exterior: yesNo(t.isForeign),
      'NF Numero': nota?.numero ?? '',
      'NF Data': nota ? fmtDate(nota.date) : '',
      'NF Prestador': nota?.prestador ?? '',
      'NF CNPJ': nota?.cnpjPrestador ?? '',
      'NF Valor': nfAmount,
      'Diferenca OFX x NF': diferenca,
      'Conta Dominio - Codigo': m.contaContabil?.codigo ?? '',
      'Conta Dominio - Classificacao': m.contaContabil?.classificacao ?? '',
      'Conta Dominio - Nome': m.contaContabil?.nome ?? '',
      'Conta Dominio - Confianca (%)': m.contaConfidence ?? '',
      'Conta Dominio - Motivo': m.contaReason ?? '',
      Hospede: nota?.nomeHospede ?? '',
      Reserva: nota?.reserva ?? '',
    };
  };

  const detailRows = visible.map(m => buildRow(m));
  const matchedRows = matched.map(m => buildRow(m));
  const pendingRows = pending.map(m => buildRow(m));
  const groupedRows = [
    ...ignored.map(m => buildRow(m, 'Agrupado/oculto')),
    ...visible.flatMap(m => (m.aggregatedGroup ?? []).map(t => buildRow({ ...m, transaction: t }, 'Detalhe do agregado'))),
  ];

  const wb = XLSX.utils.book_new();
  const summaryRows = [
    ['Relatorio de Conciliacao'],
    ['Empresa', user.companyName ?? user.ownerName ?? ''],
    ['Usuario', user.ownerName ?? user.email ?? ''],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Indicador', 'Valor'],
    ['Lancamentos analisados', stats.total],
    ['Conciliados', stats.matched],
    ['Pendentes', stats.pending],
    ['Agrupados/ocultos', ignored.length],
    ['Volume OFX analisado', stats.value],
    ['Taxa de conciliacao', stats.total ? stats.matched / stats.total : 0],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 28 }, { wch: 36 }];
  if (summaryWs['B11']) summaryWs['B11'].z = 'R$ #,##0.00';
  if (summaryWs['B12']) summaryWs['B12'].z = '0.00%';
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');

  const addJsonSheet = (name: string, rows: Record<string, any>[]) => {
    const data = rows.length ? rows : [{ Aviso: 'Nenhum registro nesta aba.' }];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 34 }, { wch: 12 },
      { wch: 42 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
      { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 42 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 16 },
    ];
    ws['!autofilter'] = { ref: ws['!ref'] ?? 'A1:A1' };
    if (rows.length) {
      for (let rowIndex = 2; rowIndex <= rows.length + 1; rowIndex++) {
        ['G', 'H', 'I', 'P', 'Q'].forEach(col => {
          const cell = ws[`${col}${rowIndex}`];
          if (cell) cell.z = 'R$ #,##0.00';
        });
        const confidenceCell = ws[`C${rowIndex}`];
        if (confidenceCell) confidenceCell.z = '0';
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addJsonSheet('Todos os lancamentos', detailRows);
  addJsonSheet('Conciliados', matchedRows);
  addJsonSheet('Pendentes', pendingRows);
  addJsonSheet('Agrupados', groupedRows);

  XLSX.writeFile(wb, `Conciliacao_${dateStamp}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL VÍNCULO MANUAL
// ─────────────────────────────────────────────────────────────────────────────

function VincularModal({ transaction, allNotas, onConfirm, onClose }: {
  transaction: ProcessedTransaction;
  allNotas: NotaFiscal[];
  onConfirm: (n: NotaFiscal) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<NotaFiscal | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    const list = q
      ? allNotas.filter(n =>
        n.prestador.toLowerCase().includes(qq) ||
        n.numero.includes(qq) ||
        fmt(n.amount).includes(qq)
      )
      : allNotas;
    return [...list].sort((a, b) => jaccard(transaction.memo, b.prestador) - jaccard(transaction.memo, a.prestador));
  }, [q, allNotas, transaction.memo]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-500" />Vincular NF manualmente
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                {transaction.memo} · {fmt(transaction.totalAmount)} · {fmtDate(transaction.date)}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Prestador, número ou valor..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map(nota => {
            const sim = jaccard(transaction.memo, nota.prestador);
            const isSel = sel?.id === nota.id;
            const dv = Math.abs(nota.amount - transaction.totalAmount);
            return (
              <button
                key={nota.id}
                onClick={() => setSel(isSel ? null : nota)}
                className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10 ${isSel ? 'bg-indigo-50 dark:bg-indigo-500/15 border-l-2 border-indigo-500' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isSel ? 'bg-indigo-100 dark:bg-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <FileText className={`w-3.5 h-3.5 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{nota.prestador}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">NFS-e {nota.numero}</span>
                    <span className="text-xs text-slate-400">{fmtDate(nota.date)}</span>
                    {sim > 0.4 && (
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-500/20 text-sky-600 px-1.5 py-0.5 rounded font-semibold">
                        {Math.round(sim * 100)}% similar
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${isSel ? 'text-indigo-600' : 'text-slate-800 dark:text-slate-100'}`}>{fmt(nota.amount)}</p>
                  {dv < 0.01
                    ? <p className="text-[10px] text-emerald-500">Valor exato</p>
                    : <p className={`text-[10px] ${dv < nota.amount * 0.05 ? 'text-amber-500' : 'text-rose-400'}`}>Δ {fmt(dv)}</p>}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">Nenhuma nota encontrada</div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 justify-end bg-slate-50 dark:bg-slate-950">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50">
            Cancelar
          </button>
          <button
            disabled={!sel}
            onClick={() => sel && onConfirm(sel)}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5" />
            {sel ? `Vincular NF ${sel.numero}` : 'Selecione uma NF'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContaContabilModal({ contas, selected, onConfirm, onClose }: {
  contas: ContaContabil[];
  selected?: ContaContabil;
  onConfirm: (conta: ContaContabil) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    const term = normalize(query);
    const analiticas = contas.filter(conta => conta.grau === 5 && !conta.sintetica);
    if (!term) return analiticas.slice(0, 120);
    return analiticas.filter(conta =>
      normalize(conta.nome).includes(term) ||
      normalize(conta.classificacao).includes(term) ||
      normalize(conta.codigo).includes(term)
    ).slice(0, 120);
  }, [contas, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <BookOpen className="h-4 w-4 text-indigo-500" /> Selecionar conta contábil
              </h2>
              <p className="mt-1 text-xs text-slate-400">Contas analíticas do plano importado da Domínio.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar por código, classificação ou nome..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {filtered.map(conta => (
            <button
              key={`${conta.codigo}-${conta.classificacao}`}
              onClick={() => onConfirm(conta)}
              className={`flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 ${
                selected?.classificacao === conta.classificacao ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''
              }`}
            >
              <div className="mt-0.5 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                <BookOpen className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">{conta.nome}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Código {conta.codigo} · Classificação {conta.classificacao}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">Nenhuma conta encontrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAINEL FULLSCREEN — DETALHE DO GRUPO AGREGADO
// ─────────────────────────────────────────────────────────────────────────────

function GroupDetailPanel({ transaction, aggregatedGroup, nota, status, confidence, reason, onClose, onOpenLinkModal }: {
  transaction: ProcessedTransaction;
  aggregatedGroup: ProcessedTransaction[];
  nota?: NotaFiscal;
  status: MatchStatus;
  confidence: number;
  reason: string;
  onClose: () => void;
  onOpenLinkModal: () => void;
}) {
  const groupTotal = aggregatedGroup.reduce((s, x) => s + x.totalAmount, 0);
  const groupIof = aggregatedGroup.reduce((s, x) => s + x.iofAmount, 0);
  const delta = nota ? Math.abs(groupTotal - nota.amount) : null;

  // Monta a string de soma limitando a 3 itens para não estourar a linha
  const somaStr = (() => {
    const vals = aggregatedGroup.map(x => fmt(x.totalAmount));
    if (vals.length <= 3) return vals.join(' + ');
    return `${vals.slice(0, 3).join(' + ')} ... +${vals.length - 3} outros`;
  })();

  const statusDisplayLabel: Record<string, string> = {
    matched_aggregate: 'Conciliado — Agregado',
    matched_exact: 'Conciliado — Exato',
    matched_fuzzy: 'Conciliado — Aproximado',
    matched_date: 'Conciliado — Por data',
    matched_parcela: 'Conciliado — Parcelado',
    pending: 'Pendente',
    ai_suggested: 'Sugestão IA',
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-50 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* Top bar */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 px-6 py-4">
          <button
            onClick={onClose}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="shrink-0 rounded-xl bg-indigo-600 p-2">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                Detalhe — Lançamentos Agrupados
              </h2>
              <p className="text-xs text-slate-500 truncate">{transaction.memo}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300">
            {statusDisplayLabel[status] ?? status}
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">

          {/* O que é? */}
          <section className="rounded-2xl border border-indigo-100 dark:border-indigo-800/60 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-indigo-600 p-1.5"><Info className="h-4 w-4 text-white" /></div>
              <h3 className="font-black text-slate-900 dark:text-white">O que é uma conciliação agregada?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Uma <strong className="text-slate-800 dark:text-white">conciliação agregada</strong> ocorre quando
              o banco agrupa vários lançamentos individuais em um único débito no extrato OFX — prática comum
              em cartões de crédito, assinaturas e cobranças internacionais (ex.: Google Ads, Meta, Stripe).
              O sistema identificou <strong className="text-slate-800 dark:text-white">{aggregatedGroup.length} lançamentos</strong> com
              o mesmo padrão de descrição e os somou para encontrar a nota fiscal correspondente.
            </p>
          </section>

          {/* Por que foi feito? */}
          <section className="rounded-2xl border border-amber-100 dark:border-amber-800/40 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-amber-500 p-1.5"><AlertCircle className="h-4 w-4 text-white" /></div>
              <h3 className="font-black text-slate-900 dark:text-white">Por que foi necessário agregar?</h3>
            </div>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                Nenhum lançamento individual bateu sozinho com o valor da nota fiscal.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                A soma dos {aggregatedGroup.length} lançamentos ({fmt(groupTotal)}) se aproxima do valor da NF
                {nota ? ` (${fmt(nota.amount)})` : ''}.
              </li>
              {groupIof > 0 && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  Inclui IOF total de <strong>{fmt(groupIof)}</strong> distribuído entre os lançamentos.
                </li>
              )}
              {delta !== null && delta > 0 && (
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  Diferença residual de <strong>{fmt(delta)}</strong> pode indicar IOF, taxa cambial ou ajuste.
                </li>
              )}
            </ul>
          </section>

          {/* Como foi feito */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-slate-700 p-1.5"><CircleDot className="h-4 w-4 text-white" /></div>
              <h3 className="font-black text-slate-900 dark:text-white">Como o sistema conciliou</h3>
            </div>
            <div className="space-y-3">
              {[
                { n: 1, text: `Identificou ${aggregatedGroup.length} lançamentos com padrão de descrição similar no extrato OFX.` },
                { n: 2, text: `Somou os valores: ${somaStr} = ${fmt(groupTotal)}.` },
                {
                  n: 3, text: nota
                    ? `Buscou nota fiscal com valor próximo e encontrou a NFS-e ${nota.numero} de ${nota.prestador} (${fmt(nota.amount)}).`
                    : 'Buscou nota fiscal com valor próximo, mas não encontrou correspondência direta.'
                },
                { n: 4, text: `Confiança calculada: ${confidence}% com base na similaridade de valor${nota && delta !== null && delta < 1 ? ' e data' : ''}.` },
                { n: 5, text: `Motivo registrado: "${reason}"` },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">{n}</span>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pt-0.5 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tabela de lançamentos */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white">Lançamentos do grupo</h3>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300">
                {aggregatedGroup.length} lançamentos
              </span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-3">Descrição (OFX)</th>
                  <th className="px-6 py-3 text-center">Data</th>
                  <th className="px-6 py-3 text-right">Valor bruto</th>
                  <th className="px-6 py-3 text-right">IOF</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedGroup.map((x, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{x.memo}</td>
                    <td className="px-6 py-3 text-center tabular-nums text-slate-500">{fmtDate(x.date)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(x.grossAmount)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {x.iofAmount > 0 ? fmt(x.iofAmount) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-black text-slate-900 dark:text-white">{fmt(x.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-500/10">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                    Total agregado
                  </td>
                  <td className="px-6 py-3 text-right text-base font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                    {fmt(groupTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* NF conciliada ou pendente */}
          {nota ? (
            <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-500/5 p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-600 p-1.5"><FileText className="h-4 w-4 text-white" /></div>
                  <h3 className="font-black text-slate-900 dark:text-white">Nota Fiscal conciliada</h3>
                </div>
                <button
                  onClick={onOpenLinkModal}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" /> Trocar NF
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Prestador', value: nota.prestador },
                  { label: 'NFS-e', value: nota.numero },
                  { label: 'Data', value: fmtDate(nota.date) },
                  { label: 'Valor da NF', value: fmt(nota.amount) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              {delta !== null && (
                <div className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${delta < 0.01
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                  }`}>
                  {delta < 0.01
                    ? <><CheckCircle2 className="h-4 w-4" /> Valores idênticos — conciliação perfeita.</>
                    : <><AlertCircle className="h-4 w-4" /> Diferença de {fmt(delta)} entre o total OFX e o valor da NF.</>}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="rounded-lg bg-rose-500 p-1.5"><AlertCircle className="h-4 w-4 text-white" /></div>
                  <h3 className="font-black text-slate-900 dark:text-white">NF não encontrada</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  O sistema não conseguiu localizar automaticamente uma nota fiscal para este agrupamento.
                </p>
              </div>
              <button
                onClick={onOpenLinkModal}
                className="text-sm px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 transition-colors flex items-center gap-1.5 font-semibold shadow-sm shrink-0"
              >
                <Link2 className="w-4 h-4" /> Vincular Manualmente
              </button>
            </section>
          )}

          {/* Confiança */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="font-black text-slate-900 dark:text-white mb-4">Índice de confiança</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confidence >= 90 ? 'bg-emerald-500' : confidence >= 70 ? 'bg-sky-500' : 'bg-amber-500'}`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{confidence}%</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">{reason}</p>
          </section>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH ROW
// ─────────────────────────────────────────────────────────────────────────────

function MatchRow({ result, allNotas, contas, onManualLink, onManualStatus, onManualAccount, onValidate }: {
  result: MatchResult;
  allNotas: NotaFiscal[];
  contas: ContaContabil[];
  onManualLink: (txId: string, n: NotaFiscal) => void;
  onManualStatus: (txId: string, status: MatchStatus) => void;
  onManualAccount: (txId: string, conta: ContaContabil) => void;
  onValidate: (txId: string) => void;
}) {
  const [openModal, setOpenModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [noNF, setNoNF] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const {
    transaction: t, notasFiscais, status, confidence, reason, aggregatedGroup, validated,
    contaContabil, contaConfidence, contaReason,
  } = result;

  // ── Linha reduzida para itens agrupados (filhos) ──────────────────────────
  if (status === 'ignored') return (
    <div className="flex items-center gap-3 px-5 py-3 opacity-45 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
        <p className="text-sm text-slate-400 truncate">{t.memo}</p>
      </div>
      <StatusPill status="ignored" />
      <p className="hidden sm:block text-xs text-slate-400">{reason}</p>
    </div>
  );

  const nota = notasFiscais[0];
  const isMatched = ['matched_exact', 'matched_date', 'matched_fuzzy', 'matched_parcela', 'matched_aggregate'].includes(status);
  const statusTone = isMatched
    ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5'
    : noNF
      ? 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/30'
      : 'border-rose-200/80 bg-rose-50/30 dark:border-rose-500/20 dark:bg-rose-500/5';

  return (
    <>
      <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors">
        <div className={`rounded-2xl border ${statusTone} p-4`}>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] gap-4 items-stretch">

            {/* ── Coluna OFX ──────────────────────────────────────────────── */}
            <div className="min-w-0 rounded-xl bg-white/80 dark:bg-slate-950/30 border border-white dark:border-slate-800 p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {t.isForeign ? <DollarSign className="w-5 h-5 text-slate-500" />
                    : t.isParcela ? <Layers className="w-5 h-5 text-slate-500" />
                      : <CreditCard className="w-5 h-5 text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lancamento OFX</p>
                  <p className="mt-1 text-base font-bold text-slate-950 dark:text-white leading-snug break-words" title={t.memo}>
                    {t.memo}
                  </p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-black text-slate-900 dark:text-slate-50">{fmt(t.totalAmount)}</span>
                    <span className="text-sm text-slate-500">{fmtDate(t.date)}</span>
                    {t.iofAmount > 0 && (
                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                        IOF {fmt(t.iofAmount)}
                      </span>
                    )}
                    {t.isParcela && (
                      <span className="text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full font-semibold">
                        Parcela {t.parcelaNumero}/{t.parcelaTotalParcelas}
                      </span>
                    )}
                  </div>

                  {/* Botão de grupo — abre painel fullscreen */}
                  {aggregatedGroup && (
                    <button
                      onClick={() => setShowGroupPanel(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500/30 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {aggregatedGroup.length} lançamento{aggregatedGroup.length !== 1 ? 's' : ''} agrupado{aggregatedGroup.length !== 1 ? 's' : ''}
                      <span className="ml-1 font-black text-indigo-900 dark:text-indigo-100">
                        = {fmt(aggregatedGroup.reduce((s, x) => s + x.totalAmount, 0))}
                      </span>
                      <ChevronRight className="w-3 h-3 ml-0.5 opacity-60" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Coluna central (status / confiança) ─────────────────────── */}
            <div className="flex xl:flex-col items-center justify-between xl:justify-center gap-3 rounded-xl bg-white/70 dark:bg-slate-950/20 border border-white dark:border-slate-800 px-4 py-3">
              <div className="hidden xl:flex w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex xl:flex-col items-center gap-2">
                <StatusPill status={status} />
                {isMatched && confidence > 0 && (
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{confidence}%</span>
                )}
              </div>
              {isMatched && confidence > 0 && (
                <div className="w-28 xl:w-full flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${confidence >= 90 ? 'bg-emerald-500' : confidence >= 70 ? 'bg-sky-500' : 'bg-amber-500'}`}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex xl:flex-col gap-2 w-full">
                <button
                  onClick={() => setOpenStatusModal(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Alterar match
                </button>
                <button
                  onClick={() => onValidate(t.id)}
                  disabled={validated || (contas.length > 0 && !contaContabil)}
                  title={contas.length > 0 && !contaContabil ? 'Selecione uma conta contábil antes de validar' : undefined}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-default disabled:bg-emerald-100 disabled:text-emerald-700 dark:disabled:bg-emerald-500/20 dark:disabled:text-emerald-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validated ? 'Validado' : 'Validar'}
                </button>
              </div>
            </div>

            {/* ── Coluna NF ───────────────────────────────────────────────── */}
            <div className="min-w-0 rounded-xl bg-white/80 dark:bg-slate-950/30 border border-white dark:border-slate-800 p-4">
              {nota ? (
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {validated ? 'Nota fiscal validada' : 'Nota fiscal sugerida'}
                      </p>
                      {validated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Validado
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-950 dark:text-white leading-snug break-words" title={nota.prestador}>
                      {nota.prestador}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">NFS-e {nota.numero} · {fmtDate(nota.date)}</p>
                    {nota.nomeHospede && <p className="text-[10px] text-slate-500 mt-0.5">👤 {nota.nomeHospede}</p>}
                    <p className="text-xl font-black text-slate-900 dark:text-slate-50 mt-2">{fmt(nota.amount)}</p>
                  </div>
                </div>
              ) : noNF ? (
                <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700">
                  <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <span>Sem NF — justificativa pendente</span>
                  <button onClick={() => setNoNF(false)} className="ml-auto text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-rose-500 font-medium">NF não encontrada</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setOpenModal(true)}
                      className="text-sm px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 transition-colors flex items-center gap-1.5"
                    >
                      <Link2 className="w-4 h-4" />Vincular
                    </button>
                    <button
                      onClick={() => setNoNF(true)}
                      className="text-sm px-3 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Sem NF
                    </button>
                    <button className="text-sm px-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg flex items-center gap-1.5">
                      <Brain className="w-4 h-4" />IA
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Rodapé — como conciliou */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <Info className="w-4 h-4 text-slate-400" />
              Como conciliou:
            </span>
            <span className="leading-relaxed">{reason}</span>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-500/10">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classificação contábil · Domínio</p>
                  {contaContabil ? (
                    <>
                      <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{contaContabil.nome}</p>
                      <p className="text-xs text-slate-500">
                        Código {contaContabil.codigo} · {contaContabil.classificacao}
                        {contaConfidence ? ` · ${contaConfidence}% de confiança` : ''}
                      </p>
                      {contaReason && <p className="mt-1 text-[11px] text-slate-400">{contaReason}</p>}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-300">
                      {contas.length ? 'Conta não identificada — selecione manualmente.' : 'Importe o plano de contas da Domínio para classificar.'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpenAccountModal(true)}
                disabled={contas.length === 0}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <Pencil className="h-3.5 w-3.5" /> {contaContabil ? 'Alterar conta' : 'Selecionar conta'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      {openModal && (
        <VincularModal
          transaction={t}
          allNotas={allNotas}
          onConfirm={n => { onManualLink(t.id, n); setOpenModal(false); }}
          onClose={() => setOpenModal(false)}
        />
      )}

      {openStatusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setOpenStatusModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Alterar classificação do match</h2>
                <p className="mt-1 text-xs text-slate-400">Escolha como este lançamento deve ser classificado.</p>
              </div>
              <button onClick={() => setOpenStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['matched_exact', 'matched_date', 'matched_fuzzy', 'matched_parcela', 'matched_aggregate', 'pending'] as MatchStatus[]).map(option => (
                <button
                  key={option}
                  onClick={() => {
                    onManualStatus(t.id, option);
                    setOpenStatusModal(false);
                  }}
                  className={`rounded-xl border p-3 text-left transition hover:border-indigo-400 ${
                    status === option
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <StatusPill status={option} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {openAccountModal && (
        <ContaContabilModal
          contas={contas}
          selected={contaContabil}
          onConfirm={conta => {
            onManualAccount(t.id, conta);
            setOpenAccountModal(false);
          }}
          onClose={() => setOpenAccountModal(false)}
        />
      )}

      {showGroupPanel && aggregatedGroup && (
        <GroupDetailPanel
          transaction={t}
          aggregatedGroup={aggregatedGroup}
          nota={nota}
          status={status}
          confidence={confidence}
          reason={reason}
          onClose={() => setShowGroupPanel(false)}
          onOpenLinkModal={() => {
            setShowGroupPanel(false);
            setOpenModal(true);
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ConciliacaoView({ user }: ConciliacaoViewProps) {
  const [step, setStep] = useState<WizardStep>('upload_nf');
  const [localNotas, setLocalNotas] = useState<NotaFiscal[]>([]);
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [ofxFileName, setOfxFileName] = useState('');
  const [processingOFX, setProcessingOFX] = useState(false);
  const [manualLinks, setManualLinks] = useState<Map<string, NotaFiscal>>(new Map());
  const [manualStatuses, setManualStatuses] = useState<Map<string, MatchStatus>>(new Map());
  const [manualAccounts, setManualAccounts] = useState<Map<string, ContaContabil>>(new Map());
  const [validatedMatches, setValidatedMatches] = useState<Set<string>>(new Set());
  const [planoContas, setPlanoContas] = useState<ContaContabil[]>([]);
  const [planoContasFileName, setPlanoContasFileName] = useState('');
  const [planoContasError, setPlanoContasError] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MatchStatus | 'all'>('all');
  const nfInputRef = useRef<HTMLInputElement>(null);
  const ofxInputRef = useRef<HTMLInputElement>(null);
  const contasInputRef = useRef<HTMLInputElement>(null);

  const { supabaseNotas, loading: sbLoading } = useNotasFiscais(user);

  const allNotas = useMemo<NotaFiscal[]>(() => {
    const ids = new Set(localNotas.map(n => n.id));
    return [...localNotas, ...supabaseNotas.filter(n => !ids.has(n.id))];
  }, [localNotas, supabaseNotas]);

  // ── Upload NFs ────────────────────────────────────────────────────────────
  const handleNFUpload = useCallback(async (files: FileList) => {
    const arr = Array.from(files).filter(f => f.type === 'application/pdf');
    for (const file of arr) {
      const tempId = crypto.randomUUID();
      setLocalNotas(prev => [...prev, {
        id: tempId, numero: '...', date: new Date(), competencia: new Date(),
        amount: 0, prestador: file.name, cnpjPrestador: '', tomador: '',
        descricao: '', status: 'open', fileName: file.name, extractionStatus: 'extracting',
      }]);
      const arrayBuffer = await file.arrayBuffer();
      try {
        const extracted = await extractNotaFiscalFromPDF(arrayBuffer, file.name);
        setLocalNotas(prev => prev.map(n =>
          n.id === tempId
            ? { ...n, ...extracted, id: tempId, status: 'open', extractionStatus: 'done', fileName: file.name }
            : n
        ));
      } catch {
        setLocalNotas(prev => prev.map(n => n.id === tempId ? { ...n, extractionStatus: 'error' } : n));
      }
    }
  }, []);

  // ── Upload OFX ────────────────────────────────────────────────────────────
  const handleOFXUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOfxFileName(file.name);
    setProcessingOFX(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const raw = parseOFXRaw(ev.target?.result as string);
      const processed = preprocessOFX(raw);
      setTimeout(() => { setTransactions(processed); setProcessingOFX(false); setStep('result'); }, 700);
    };
    reader.readAsText(file, 'latin1');
  }, []);

  const handlePlanoContasUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlanoContasError('');
    try {
      const contas = parsePlanoContasWorkbook(await file.arrayBuffer());
      setPlanoContas(contas);
      setPlanoContasFileName(file.name);
      setManualAccounts(new Map());
      setValidatedMatches(new Set());
    } catch (error) {
      setPlanoContas([]);
      setPlanoContasFileName('');
      setPlanoContasError(error instanceof Error ? error.message : 'Não foi possível ler o plano de contas.');
    } finally {
      e.target.value = '';
    }
  }, []);

  // ── Conciliação ───────────────────────────────────────────────────────────
  const baseMatches = useMemo(
    () => transactions.length > 0 ? conciliar(transactions, allNotas) : [],
    [transactions, allNotas]
  );

  const matches = useMemo(() => {
    return baseMatches.map(m => {
      const ov = manualLinks.get(m.transaction.id);
      const match = ov
        ? { ...m, notasFiscais: [ov], status: 'matched_fuzzy' as MatchStatus, confidence: 100, reason: 'Vínculo manual' }
        : m;
      const manualStatus = manualStatuses.get(m.transaction.id);
      const suggestion = suggestContaContabil(m.transaction, match.notasFiscais[0], planoContas);
      const manualAccount = manualAccounts.get(m.transaction.id);
      return {
        ...match,
        status: manualStatus ?? match.status,
        confidence: manualStatus === 'pending' ? 0 : match.confidence,
        reason: manualStatus ? 'Classificação alterada manualmente pelo usuário' : match.reason,
        contaContabil: manualAccount ?? suggestion.conta,
        contaConfidence: manualAccount ? 100 : suggestion.confidence,
        contaReason: manualAccount ? 'Conta selecionada manualmente pelo usuário' : suggestion.reason,
        validated: validatedMatches.has(m.transaction.id),
      };
    });
  }, [baseMatches, manualLinks, manualStatuses, manualAccounts, planoContas, validatedMatches]);

  const stats = useMemo(() => {
    const vis = matches.filter(m => m.status !== 'ignored');
    return {
      total: vis.length,
      matched: vis.filter(m => m.validated).length,
      pending: vis.filter(m => !m.validated).length,
      value: vis.reduce((s, m) => s + m.transaction.totalAmount, 0),
    };
  }, [matches]);

  const filtered = useMemo(() => {
    let list = showIgnored ? matches : matches.filter(m => m.status !== 'ignored');
    if (filterStatus !== 'all') list = list.filter(m => m.status === filterStatus);
    return list;
  }, [matches, showIgnored, filterStatus]);

  const extractingCount = localNotas.filter(n => n.extractionStatus === 'extracting').length;

  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'upload_nf', label: 'Notas Fiscais', icon: <FileText className="w-4 h-4" /> },
    { key: 'upload_ofx', label: 'Extrato OFX', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'result', label: 'Conciliação', icon: <ArrowRightLeft className="w-4 h-4" /> },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      <input
        ref={contasInputRef}
        type="file"
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handlePlanoContasUpload}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ArrowRightLeft className="w-6 h-6 text-indigo-500" />
            Conciliação de Notas Fiscais
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Faça upload das NFs, importe o OFX e concilie automaticamente.
          </p>
        </div>
        {step === 'result' && (
          <button
            onClick={() => exportConciliacaoXlsx(matches, stats, user)}
            disabled={matches.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar XLSX
          </button>
        )}
      </div>

      {/* ── Wizard steps ── */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <React.Fragment key={s.key}>
              <button
                onClick={() => { if (done || active) setStep(s.key); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                    : done ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
                {s.label}
                {s.key === 'upload_nf' && localNotas.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                    {localNotas.length}
                  </span>
                )}
              </button>
              {i < steps.length - 1 && (
                <Arrow className={`w-4 h-4 mx-1 flex-shrink-0 ${i < stepIndex ? 'text-emerald-400' : 'text-slate-300'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: Upload NFs ── */}
      {step === 'upload_nf' && (
        <div className="space-y-4">
          <label className="block cursor-pointer">
            <input
              ref={nfInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden"
              onChange={e => e.target.files && handleNFUpload(e.target.files)}
            />
            <div
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center hover:border-indigo-400 transition-colors group bg-white dark:bg-slate-900"
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); handleNFUpload(e.dataTransfer.files); }}
            >
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Files className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Arraste as NFS-e em PDF</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                A IA extrai automaticamente: prestador, valor, data, CNPJ e período de competência.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl">
                <Upload className="w-4 h-4" /> Selecionar PDFs
              </div>
            </div>
          </label>

          {localNotas.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {localNotas.length} NF(s) carregada(s)
                  {extractingCount > 0 && <span className="ml-2 text-indigo-500 text-xs">· Extraindo {extractingCount}…</span>}
                </p>
                <button onClick={() => nfInputRef.current?.click()} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                  <Upload className="w-3 h-3" /> Adicionar mais
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {localNotas.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                      ${n.extractionStatus === 'done' ? 'bg-emerald-50 dark:bg-emerald-500/10'
                        : n.extractionStatus === 'error' ? 'bg-rose-50 dark:bg-rose-500/10'
                          : 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                      {n.extractionStatus === 'extracting' ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        : n.extractionStatus === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500" />
                          : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.extractionStatus === 'extracting' ? (
                        <>
                          <p className="text-sm font-medium text-slate-400 truncate">{n.fileName}</p>
                          <p className="text-xs text-indigo-400 mt-0.5">Extraindo dados com IA…</p>
                        </>
                      ) : n.extractionStatus === 'error' ? (
                        <>
                          <p className="text-sm font-medium text-rose-600 truncate">{n.fileName}</p>
                          <p className="text-xs text-rose-400 mt-0.5">Erro na extração — preencha manualmente</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{n.prestador}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-400">NFS-e {n.numero}</span>
                            <span className="text-xs text-slate-400">{fmtDate(n.date)}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmt(n.amount)}</span>
                            {n.nomeHospede && <span className="text-xs text-slate-400">👤 {n.nomeHospede}</span>}
                          </div>
                          {n.keywords && n.keywords.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {n.keywords.map(k => (
                                <span key={k} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{k}</span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setLocalNotas(prev => prev.filter(x => x.id !== n.id))}
                      className="text-slate-300 hover:text-rose-400 transition-colors mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sbLoading && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Buscando NFs do sistema…
            </p>
          )}
          {!sbLoading && supabaseNotas.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {supabaseNotas.length} NF(s) abertas no sistema também serão usadas na conciliação
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep('upload_ofx')}
              disabled={allNotas.filter(n => n.extractionStatus !== 'extracting').length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
            >
              Próximo: Importar OFX <Arrow className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Upload OFX ── */}
      {step === 'upload_ofx' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${
            planoContas.length
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
              : 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-500/30 dark:bg-indigo-500/5'
          }`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ${planoContas.length ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                  <BookOpen className={`h-5 w-5 ${planoContas.length ? 'text-emerald-600' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Plano de contas da Domínio</p>
                  {planoContas.length ? (
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                      {planoContasFileName} · {planoContas.length} contas carregadas · {planoContas.filter(c => c.grau === 5 && !c.sintetica).length} analíticas
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Importe o relatório para sugerir a classificação contábil de cada conciliação.
                    </p>
                  )}
                  {planoContasError && <p className="mt-1 text-xs font-medium text-rose-600">{planoContasError}</p>}
                </div>
              </div>
              <button
                onClick={() => contasInputRef.current?.click()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4" /> {planoContas.length ? 'Trocar plano' : 'Importar plano'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{allNotas.length} nota(s) fiscal(is) prontas</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {localNotas.filter(n => n.extractionStatus === 'done').map(n => n.prestador).join(' · ').slice(0, 80)}
                  {supabaseNotas.length > 0 && ` + ${supabaseNotas.length} do sistema`}
                </p>
              </div>
            </div>

            {!processingOFX ? (
              <label className="block cursor-pointer">
                <input ref={ofxInputRef} type="file" accept=".ofx" className="hidden" onChange={handleOFXUpload} />
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors group">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Importe o extrato OFX</p>
                  <p className="text-xs text-slate-400">
                    Fatura Nubank Business em <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.ofx</code>
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-xl">
                    <Upload className="w-4 h-4" /> Selecionar OFX
                  </div>
                </div>
              </label>
            ) : (
              <div className="flex flex-col items-center py-8 gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Processando {ofxFileName}…</p>
                <p className="text-xs text-slate-400">Agrupando IOF · detectando parcelamentos · aplicando regras</p>
              </div>
            )}
          </div>
          <button onClick={() => setStep('upload_nf')} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
            ← Voltar e editar NFs
          </button>
        </div>
      )}

      {/* ── STEP 3: Resultado ── */}
      {step === 'result' && (
        <div className="space-y-4">
          <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
            planoContas.length
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
              : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          }`}>
            <div className="flex items-center gap-2.5">
              <BookOpen className={`h-5 w-5 ${planoContas.length ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {planoContas.length ? 'Classificação contábil ativada' : 'Plano de contas não importado'}
                </p>
                <p className="text-xs text-slate-500">
                  {planoContas.length
                    ? `${planoContasFileName} · as contas sugeridas podem ser alteradas antes da validação`
                    : 'Importe o arquivo da Domínio para classificar os lançamentos.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => contasInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5" /> {planoContas.length ? 'Trocar plano' : 'Importar plano'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Lançamentos', value: stats.total, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-white dark:bg-slate-900' },
              { label: 'Validados', value: stats.matched, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'A validar', value: stats.pending, color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-500/10' },
              { label: 'Volume', value: fmt(stats.value), color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-2xl p-4 border border-slate-100 dark:border-slate-800`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2.5 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mr-1">Filtrar:</span>
            {(['matched_exact', 'matched_date', 'matched_fuzzy', 'matched_parcela', 'matched_aggregate', 'pending'] as MatchStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(f => f === s ? 'all' : s)}
                className={`transition-opacity ${filterStatus !== 'all' && filterStatus !== s ? 'opacity-30' : ''}`}
              >
                <StatusPill status={s} />
              </button>
            ))}
            {filterStatus !== 'all' && (
              <button onClick={() => setFilterStatus('all')} className="text-xs text-slate-400 ml-auto hover:underline">
                Limpar
              </button>
            )}
          </div>

          {/* Tabela de resultados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
              <div className="col-span-5 pl-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lançamento OFX</div>
              <div className="col-span-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Match</div>
              <div className="col-span-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nota Fiscal</div>
            </div>
            <div>
              {filtered.length === 0
                ? <div className="py-12 text-center text-sm text-slate-400">Nenhum lançamento para este filtro.</div>
                : filtered.map((m, i) => (
                  <React.Fragment key={m.transaction.id + i}>
                    <MatchRow
                      result={m}
                      allNotas={allNotas}
                      contas={planoContas}
                      onManualLink={(id, n) => {
                        setManualLinks(prev => new Map(prev).set(id, n));
                        setValidatedMatches(prev => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      }}
                      onManualStatus={(id, status) => {
                        setManualStatuses(prev => new Map(prev).set(id, status));
                        setValidatedMatches(prev => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      }}
                      onManualAccount={(id, conta) => {
                        setManualAccounts(prev => new Map(prev).set(id, conta));
                        setValidatedMatches(prev => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      }}
                      onValidate={id => setValidatedMatches(prev => new Set(prev).add(id))}
                    />
                  </React.Fragment>
                ))
              }
            </div>
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setShowIgnored(v => !v)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />{showIgnored ? 'Ocultar' : 'Mostrar'} agrupados
              </button>
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-400">{filtered.length} lançamento(s)</p>
                <button
                  onClick={() => {
                    setStep('upload_nf');
                    setTransactions([]);
                    setLocalNotas([]);
                    setManualLinks(new Map());
                    setManualStatuses(new Map());
                    setManualAccounts(new Map());
                    setValidatedMatches(new Set());
                  }}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />Nova conciliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
