import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  ArrowLeft,
  BarChart3,
  BanknoteArrowUp,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FileUp,
  Filter,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
  X,
  XCircle
} from 'lucide-react';
import { ContaReceber, PJUser } from '../types';
import { addContaReceber, deleteContaReceber, getContasReceber, updateContaReceber } from '../lib/db';

// ─────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────

interface ContasReceberViewProps {
  user: PJUser;
}

interface OfxEntry {
  fitid: string;
  date: string;
  amount: number;
  memo: string;
}

type Screen = 'home' | 'recebimentos' | 'cobrancas' | 'fluxo' | 'relatorios';
type ViewMode = 'lista' | 'kanban';
type StatusReceber = 'pendente' | 'enviado' | 'vencido' | 'recebido' | string;

type ContaReceberExtra = ContaReceber & {
  numeroNF?: string;
  serieNF?: string;
  competencia?: string;
  centroReceita?: string;
  formaRecebimento?: string;
  origem?: string;
  dataRecebimento?: string;
  ofxFitid?: string;
  ofxData?: string;
  ofxDescricao?: string;
};

type FormState = {
  clienteNome: string;
  clienteEmail: string;
  clienteDocumento: string;
  descricao: string;
  valor: string;
  dataEmissao: string;
  dataVencimento: string;
  numeroNF: string;
  serieNF: string;
  competencia: string;
  centroReceita: string;
  formaRecebimento: string;
  origem: string;
  observacoes: string;
};

// ─────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────

const PRIMARY = '#4F39F6';

const CENTROS_RECEITA = [
  'Contabilidade', 'Fiscal', 'Departamento Pessoal', 'BPO Financeiro',
  'Consultoria', 'IRPF', 'Legalização', 'Outros'
];

const FORMAS_RECEBIMENTO = ['PIX', 'Boleto', 'Transferência', 'Cartão', 'Dinheiro', 'OFX', 'Outros'];

const KANBAN_COLUMNS = [
  { key: 'pendente', title: 'Pendente' },
  { key: 'enviado', title: 'Cobrança enviada' },
  { key: 'vencido', title: 'Vencido' },
  { key: 'recebido', title: 'Recebido' }
] as const;

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);

const toBRDate = (date?: string) => {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const monthKey = (date?: string) => {
  if (!date || date.length < 7) return 'Sem data';
  const [y, m] = date.split('-');
  return `${m}/${y}`;
};

const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86400000);

const normalizeText = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function parseOFX(ofx: string): OfxEntry[] {
  const entries: OfxEntry[] = [];
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = re.exec(ofx)) !== null) {
    const block = match[1];
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)(?:\\r|\\n|<|\\[)`, 'i'))?.[1]?.trim() ?? '';
    const raw = get('DTPOSTED');
    const date = raw.length >= 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : todayISO();
    entries.push({ fitid: get('FITID') || `${date}-${entries.length}`, date, amount: Number(get('TRNAMT').replace(',', '.')) || 0, memo: get('MEMO') || get('NAME') || '' });
  }
  return entries;
}

function textScore(a: string, b: string) {
  const L = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
  const R = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
  if (!L.size || !R.size) return 0;
  return [...L].filter(x => R.has(x)).length / Math.max(L.size, R.size);
}

function isOpenStatus(s: StatusReceber) {
  return s === 'pendente' || s === 'enviado' || s === 'vencido';
}

function computedStatus(item: ContaReceberExtra): StatusReceber {
  if (item.status === 'recebido') return 'recebido';
  if (item.dataVencimento < todayISO()) return 'vencido';
  return item.status || 'pendente';
}

function statusClasses(s: StatusReceber) {
  if (s === 'recebido') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'vencido') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (s === 'enviado') return 'bg-violet-50 text-violet-700 border-violet-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function statusLabel(s: StatusReceber) {
  return ({ pendente: 'Pendente', enviado: 'Cobrança enviada', vencido: 'Vencido', recebido: 'Recebido' } as Record<string, string>)[s] || s;
}

const EMPTY_FORM: FormState = {
  clienteNome: '', clienteEmail: '', clienteDocumento: '', descricao: '', valor: '',
  dataEmissao: todayISO(), dataVencimento: todayISO(),
  numeroNF: '', serieNF: '', competencia: todayISO().slice(0, 7),
  centroReceita: 'Contabilidade', formaRecebimento: 'PIX', origem: 'Honorários', observacoes: ''
};

// ─────────────────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#4F39F6] focus:ring-2 focus:ring-[#4F39F6]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 font-black text-slate-800 dark:text-white">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, accentBg = PRIMARY }: {
  icon: React.ElementType; title: string; value: string | number; subtitle?: string; accentBg?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">{title}</p>
          <p className="mt-1.5 text-lg font-black text-slate-900 dark:text-white leading-tight break-words">{value}</p>
          {subtitle && <p className="mt-1 text-[11px] text-slate-500 leading-tight">{subtitle}</p>}
        </div>
        <div className="shrink-0 rounded-lg p-2" style={{ background: accentBg }}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Card>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: PRIMARY }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCREEN SHELL — fullscreen panel with back nav
// ─────────────────────────────────────────────────────────

function ScreenShell({
  title, subtitle, icon: Icon, onBack, actions, children, toast, onDismissToast
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  onBack: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  toast?: { type: 'error' | 'success'; message: string } | null;
  onDismissToast?: () => void;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1440px] flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="shrink-0 rounded-xl p-2" style={{ background: PRIMARY }}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
            </div>
          </div>

          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>

        {/* Toast inline in topbar area */}
        {toast && (
          <div className={`border-t px-4 py-2.5 flex items-center justify-between gap-3 text-sm ${toast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'error'
                ? <AlertCircle className="h-4 w-4 shrink-0" />
                : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {toast.message}
            </div>
            {onDismissToast && (
              <button onClick={onDismissToast}><X className="h-4 w-4" /></button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 mx-auto w-full max-w-[1440px] px-4 py-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  FULLSCREEN MODAL (Nova conta)
// ─────────────────────────────────────────────────────────

function FullscreenModal({
  open, title, subtitle, icon: Icon, onClose, children
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-50 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl flex items-center gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="h-3.5 w-3.5" /> Fechar
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="shrink-0 rounded-xl p-2" style={{ background: PRIMARY }}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  NOVO RECEBIMENTO FORM
// ─────────────────────────────────────────────────────────

interface NovoRecebimentoFormProps {
  saving: boolean;
  form: FormState;
  error: string;
  onChange: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function NovoRecebimentoForm({ saving, form, error, onChange, onSubmit, onClose }: NovoRecebimentoFormProps) {
  const f = form;
  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Bloco 1 — Cliente */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Dados do cliente</p>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Nome do cliente *</label>
            <input required value={f.clienteNome} onChange={set('clienteNome')} placeholder="Razão social ou nome" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">E-mail</label>
            <input type="email" value={f.clienteEmail} onChange={set('clienteEmail')} placeholder="cliente@email.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">CPF / CNPJ</label>
            <input value={f.clienteDocumento} onChange={set('clienteDocumento')} placeholder="000.000.000-00" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Bloco 2 — Recebimento */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Dados do recebimento</p>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Descrição</label>
            <input value={f.descricao} onChange={set('descricao')} placeholder="Honorários contábeis, NF, etc." className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Valor *</label>
            <input required type="number" step="0.01" min="0.01" value={f.valor} onChange={set('valor')} placeholder="0,00" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Origem</label>
            <input value={f.origem} onChange={set('origem')} placeholder="Honorários, BPO, etc." className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Número NF</label>
            <input value={f.numeroNF} onChange={set('numeroNF')} placeholder="00001" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Série NF</label>
            <input value={f.serieNF} onChange={set('serieNF')} placeholder="A" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Centro de receita</label>
            <select value={f.centroReceita} onChange={set('centroReceita')} className={inputCls}>
              {CENTROS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Forma de recebimento</label>
            <select value={f.formaRecebimento} onChange={set('formaRecebimento')} className={inputCls}>
              {FORMAS_RECEBIMENTO.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Bloco 3 — Datas */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Datas</p>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Emissão</label>
            <input type="date" value={f.dataEmissao} onChange={set('dataEmissao')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Vencimento *</label>
            <input required type="date" value={f.dataVencimento} onChange={set('dataVencimento')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Competência</label>
            <input type="month" value={f.competencia} onChange={set('competencia')} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Bloco 4 — Observações */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Observações</p>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        <textarea
          value={f.observacoes}
          onChange={set('observacoes')}
          rows={4}
          placeholder="Notas internas, instruções para cobrança, etc."
          className={inputCls}
        />
      </section>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* CTA footer */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 transition">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
          style={{ background: PRIMARY }}
        >
          <CheckCircle2 className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar recebimento'}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────
//  CONTA CARD
// ─────────────────────────────────────────────────────────

interface ContaCardProps {
  item: ContaReceberExtra;
  compact?: boolean;
  onMarkReceived: (item: ContaReceberExtra) => void;
  onMarkSent: (item: ContaReceberExtra) => void;
  onMarkPending: (item: ContaReceberExtra) => void;
  onDelete: (id: string) => void;
}

function ContaCard({ item, compact = false, onMarkReceived, onMarkSent, onMarkPending, onDelete }: ContaCardProps) {
  const status = computedStatus(item);
  const overdueDays = status === 'vencido' ? Math.abs(daysBetween(item.dataVencimento, todayISO())) : 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-900 dark:text-white truncate">{item.clienteNome}</p>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(status)}`}>
              {statusLabel(status)}
            </span>
            {item.numeroNF && (
              <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold text-white" style={{ background: PRIMARY, borderColor: PRIMARY }}>
                NF {item.numeroNF}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{item.descricao || 'Sem descrição'}</p>
          {!compact && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 lg:grid-cols-4">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY }} />Emissão: {toBRDate(item.dataEmissao)}</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY }} />Venc.: {toBRDate(item.dataVencimento)}</span>
              <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY }} />{item.centroReceita || 'Sem centro'}</span>
              <span className="flex items-center gap-1.5"><WalletCards className="h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY }} />{item.formaRecebimento || '—'}</span>
            </div>
          )}
          {item.clienteEmail && !compact && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY }} />{item.clienteEmail}
            </p>
          )}
          {status === 'vencido' && <p className="mt-2 text-xs font-semibold text-rose-600">Vencido há {overdueDays} dia(s)</p>}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <p className="text-xl font-black text-slate-900 dark:text-white">{money(item.valor)}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {status === 'pendente' && (
              <button onClick={() => onMarkSent(item)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition hover:opacity-80" style={{ borderColor: PRIMARY, color: PRIMARY }}>
                <Send className="h-3.5 w-3.5" /> Enviar cobrança
              </button>
            )}
            {status !== 'recebido' && (
              <button onClick={() => onMarkReceived(item)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition hover:opacity-90" style={{ background: PRIMARY }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Recebido
              </button>
            )}
            {status === 'recebido' && (
              <button onClick={() => onMarkPending(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                <RefreshCw className="h-3.5 w-3.5" /> Reabrir
              </button>
            )}
            <button onClick={() => onDelete(item.id)} title="Excluir" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
//  FILTERS BAR
// ─────────────────────────────────────────────────────────

function FiltersBar({
  search, setSearch, statusFilter, setStatusFilter,
  centroFilter, setCentroFilter, viewMode, setViewMode, showViewToggle
}: {
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  centroFilter: string; setCentroFilter: (v: string) => void;
  viewMode: ViewMode; setViewMode: (v: ViewMode) => void;
  showViewToggle: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filtros</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cliente, NF, descrição..." className={`${inputCls} pl-9`} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="enviado">Cobrança enviada</option>
          <option value="vencido">Vencido</option>
          <option value="recebido">Recebido</option>
        </select>
        <select value={centroFilter} onChange={e => setCentroFilter(e.target.value)} className={inputCls}>
          <option value="todos">Todos centros</option>
          {CENTROS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {showViewToggle ? (
          <button onClick={() => setViewMode(viewMode === 'lista' ? 'kanban' : 'lista')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            <ArrowDownUp className="h-4 w-4" />{viewMode === 'lista' ? 'Kanban' : 'Lista'}
          </button>
        ) : <div />}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
//  SCREENS
// ─────────────────────────────────────────────────────────

// HOME DASHBOARD
function HomeScreen({ stats, byMonth, byClient, onNavigate }: {
  stats: any;
  byMonth: [string, { previsto: number; recebido: number }][];
  byClient: [string, number][];
  onNavigate: (s: Screen) => void;
}) {
  const MENU: { screen: Screen; icon: React.ElementType; label: string; desc: string; count?: number; alert?: boolean }[] = [
    { screen: 'recebimentos', icon: Receipt, label: 'Recebimentos', desc: 'Todos os títulos e baixa manual' },
    { screen: 'cobrancas', icon: Mail, label: 'Cobranças', desc: 'Envio e acompanhamento de cobranças', count: stats.overdueCount, alert: stats.overdueCount > 0 },
    { screen: 'fluxo', icon: TrendingUp, label: 'Fluxo de caixa', desc: 'Entradas projetadas por vencimento' },
    { screen: 'relatorios', icon: BarChart3, label: 'Relatórios', desc: 'Receita por centro e aging' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={BanknoteArrowUp} title="A receber" value={money(stats.openValue)} subtitle={`${stats.openCount} título(s)`} />
        <StatCard icon={CheckCircle2} title="Recebido/mês" value={money(stats.receivedMonthValue)} subtitle={`${stats.receivedCount} recebidos`} accentBg="#059669" />
        <StatCard icon={AlertCircle} title="Vencido" value={money(stats.overdueValue)} subtitle={`${stats.overdueCount} título(s)`} accentBg="#e11d48" />
        <StatCard icon={CalendarDays} title="Prev. 30 dias" value={money(stats.next30Value)} subtitle="Entradas futuras próximas" accentBg="#0891b2" />
        <StatCard icon={Receipt} title="Ticket médio" value={money(stats.ticket)} subtitle="Média por recebimento" accentBg="#7c3aed" />
        <StatCard icon={XCircle} title="Inadimplência" value={`${stats.inadimplencia.toFixed(1)}%`} subtitle="Sobre saldo em aberto" accentBg="#d97706" />
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MENU.map(({ screen, icon: Icon, label, desc, count, alert }) => (
          <button
            key={screen}
            onClick={() => onNavigate(screen)}
            className="group relative flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-[#4F39F6]/30 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 rounded-xl p-2.5" style={{ background: PRIMARY }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-900 dark:text-white">{label}</p>
                  {count !== undefined && count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black text-white ${alert ? 'bg-rose-500' : 'bg-slate-400'}`}>
                      {count}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 truncate">{desc}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Evolução mensal</h3>
              <p className="text-sm text-slate-500 mt-0.5">Previsto x recebido por vencimento.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-300" />
          </div>
          {byMonth.length === 0 ? (
            <EmptyState title="Sem dados" text="Cadastre recebimentos para visualizar." />
          ) : (
            <div className="space-y-4">
              {byMonth.map(([label, data]) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                    <span className="text-slate-500">{money(data.recebido)} / {money(data.previsto)}</span>
                  </div>
                  <ProgressBar value={data.recebido} max={Math.max(data.previsto, data.recebido, 1)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Ranking de clientes</h3>
              <p className="text-sm text-slate-500 mt-0.5">Maiores valores registrados.</p>
            </div>
            <Users className="h-5 w-5 text-slate-300" />
          </div>
          {byClient.length === 0 ? (
            <EmptyState title="Sem clientes" text="Nenhum recebimento cadastrado." />
          ) : (
            <div className="space-y-2.5">
              {byClient.map(([client, value], index) => (
                <div key={client} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white" style={{ background: PRIMARY }}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{client}</p>
                    <p className="text-xs text-slate-400">Total faturado</p>
                  </div>
                  <p className="shrink-0 text-sm font-black" style={{ color: PRIMARY }}>{money(value)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// RECEBIMENTOS SCREEN
function RecebimentosScreen({ filtered, loading, viewMode, setViewMode, search, setSearch, statusFilter, setStatusFilter, centroFilter, setCentroFilter, ...cardProps }: any) {
  if (viewMode === 'kanban') {
    return (
      <>
        <FiltersBar search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} centroFilter={centroFilter} setCentroFilter={setCentroFilter} viewMode={viewMode} setViewMode={setViewMode} showViewToggle />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {KANBAN_COLUMNS.map(col => {
            const colItems = filtered.filter((item: ContaReceberExtra) => computedStatus(item) === col.key);
            const total = colItems.reduce((s: number, i: ContaReceberExtra) => s + i.valor, 0);
            return (
              <div key={col.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{col.title}</h3>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-slate-600 dark:bg-slate-900 dark:border-slate-700">{colItems.length}</span>
                  </div>
                  <p className="text-sm font-black" style={{ color: PRIMARY }}>{money(total)}</p>
                </div>
                <div className="space-y-2.5">
                  {colItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-700">Nenhum título.</p>
                  ) : colItems.map((item: ContaReceberExtra) => <ContaCard key={item.id} item={item} compact {...cardProps} />)}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <FiltersBar search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} centroFilter={centroFilter} setCentroFilter={setCentroFilter} viewMode={viewMode} setViewMode={setViewMode} showViewToggle />
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" style={{ color: PRIMARY }} /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhuma conta a receber" text="Ajuste os filtros ou cadastre um novo recebimento." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item: ContaReceberExtra) => <ContaCard key={item.id} item={item} {...cardProps} />)}
        </div>
      )}
    </>
  );
}

// COBRANÇAS SCREEN
function CobrancasScreen({ filtered, ...cardProps }: any) {
  const open = filtered.filter((i: any) => i.status !== 'recebido');
  const sent = open.filter((i: any) => i.status === 'enviado');
  const pending = open.filter((i: any) => i.status === 'pendente');
  const overdue = open.filter((i: any) => i.status === 'vencido');

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="p-6 xl:col-span-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-xl p-2" style={{ background: PRIMARY }}><Mail className="h-5 w-5 text-white" /></div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Central de cobrança</h3>
            <p className="text-sm text-slate-500">Pendentes, enviadas e vencidas.</p>
          </div>
        </div>
        {open.length === 0 ? (
          <EmptyState title="Sem cobranças em aberto" text="Todas as contas foram recebidas." />
        ) : (
          <div className="space-y-3">{open.map((item: ContaReceberExtra) => <ContaCard key={item.id} item={item} {...cardProps} />)}</div>
        )}
      </Card>
      <div className="space-y-3">
        <StatCard icon={Clock3} title="Pendentes" value={pending.length} subtitle={money(pending.reduce((s: number, i: any) => s + i.valor, 0))} accentBg="#d97706" />
        <StatCard icon={Send} title="Enviadas" value={sent.length} subtitle={money(sent.reduce((s: number, i: any) => s + i.valor, 0))} />
        <StatCard icon={AlertCircle} title="Vencidas" value={overdue.length} subtitle={money(overdue.reduce((s: number, i: any) => s + i.valor, 0))} accentBg="#e11d48" />
      </div>
    </div>
  );
}

// FLUXO SCREEN
function FluxoScreen({ filtered, stats }: { filtered: ContaReceberExtra[]; stats: any }) {
  const future = filtered.filter(i => i.status !== 'recebido').sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  let accumulated = 0;
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="p-6 xl:col-span-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-xl p-2" style={{ background: PRIMARY }}><TrendingUp className="h-5 w-5 text-white" /></div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Fluxo de recebimentos</h3>
            <p className="text-sm text-slate-500">Entradas previstas por ordem de vencimento.</p>
          </div>
        </div>
        {future.length === 0 ? <EmptyState title="Sem recebimentos futuros" text="Não há contas em aberto." /> : (
          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-400 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3.5">Vencimento</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Valor</th>
                  <th className="px-5 py-3.5 text-right">Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {future.map(item => {
                  accumulated += item.valor;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-colors">
                      <td className="px-5 py-3.5 tabular-nums text-slate-500">{toBRDate(item.dataVencimento)}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{item.clienteNome}</td>
                      <td className="px-5 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(item.status)}`}>{statusLabel(item.status)}</span></td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums">{money(item.valor)}</td>
                      <td className="px-5 py-3.5 text-right font-black tabular-nums" style={{ color: PRIMARY }}>{money(accumulated)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="p-6">
        <h3 className="font-black text-slate-900 dark:text-white">Resumo projetado</h3>
        <p className="mt-0.5 text-sm text-slate-500">Visão consolidada das entradas.</p>
        <div className="mt-5 space-y-3">
          <div className="rounded-xl p-4 text-white" style={{ background: PRIMARY }}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Em aberto</p>
            <p className="mt-1 text-2xl font-black">{money(stats.openValue)}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-4 dark:bg-rose-950/30">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Risco vencido</p>
            <p className="mt-1 text-2xl font-black text-rose-700">{money(stats.overdueValue)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Recebido total</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{money(stats.receivedValue)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// RELATÓRIOS SCREEN
function RelatoriosScreen({ byCentro, aging }: { byCentro: [string, number][]; aging: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Receita por centro</h3>
            <p className="text-sm text-slate-500">Separação gerencial por área.</p>
          </div>
          <Target className="h-5 w-5 text-slate-300" />
        </div>
        {byCentro.length === 0 ? <EmptyState title="Sem dados" text="Cadastre recebimentos para visualizar." /> : (
          <div className="space-y-4">
            {byCentro.map(([label, value]) => (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                  <span className="font-black" style={{ color: PRIMARY }}>{money(value)}</span>
                </div>
                <ProgressBar value={value} max={byCentro[0]?.[1] || value} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Aging de inadimplência</h3>
            <p className="text-sm text-slate-500">Valores vencidos por faixa.</p>
          </div>
          <AlertCircle className="h-5 w-5 text-slate-300" />
        </div>
        <div className="space-y-3">
          {aging.map(row => (
            <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{row.label}</p>
              <p className="text-sm font-black text-rose-600">{money(row.value)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCREEN CONFIG
// ─────────────────────────────────────────────────────────

const SCREEN_META: Record<Exclude<Screen, 'home'>, { title: string; subtitle: string; icon: React.ElementType }> = {
  recebimentos: { title: 'Recebimentos', subtitle: 'Todos os títulos, baixa manual e conciliação OFX', icon: Receipt },
  cobrancas: { title: 'Cobranças', subtitle: 'Acompanhe envios, inadimplência e cobranças vencidas', icon: Mail },
  fluxo: { title: 'Fluxo de caixa', subtitle: 'Entradas projetadas por ordem de vencimento', icon: TrendingUp },
  relatorios: { title: 'Relatórios', subtitle: 'Receita por centro de receita e aging de inadimplência', icon: BarChart3 }
};

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export default function ContasReceberView({ user }: ContasReceberViewProps) {
  const [items, setItems] = useState<ContaReceberExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [screen, setScreen] = useState<Screen>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('lista');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [centroFilter, setCentroFilter] = useState('todos');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const toast = error ? { type: 'error' as const, message: error } : success ? { type: 'success' as const, message: success } : null;
  const dismissToast = () => { setError(''); setSuccess(''); };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await getContasReceber(user);
      setItems((data || []) as ContaReceberExtra[]);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar contas a receber.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id, user.tenantId]);

  const normalizedItems = useMemo(() =>
    items.map(item => ({ ...item, status: computedStatus(item) })), [items]);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return normalizedItems.filter(item => {
      const text = normalizeText([item.clienteNome, item.clienteEmail || '', item.clienteDocumento || '', item.descricao || '', item.numeroNF || '', item.centroReceita || '', item.origem || ''].join(' '));
      return (!q || text.includes(q)) && (statusFilter === 'todos' || item.status === statusFilter) && (centroFilter === 'todos' || (item.centroReceita || 'Outros') === centroFilter);
    });
  }, [normalizedItems, search, statusFilter, centroFilter]);

  const stats = useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    const open = normalizedItems.filter(i => isOpenStatus(i.status));
    const received = normalizedItems.filter(i => i.status === 'recebido');
    const overdue = open.filter(i => i.dataVencimento < today);
    const dueToday = open.filter(i => i.dataVencimento === today);
    const next30 = open.filter(i => { const d = daysBetween(i.dataVencimento, today); return d >= 0 && d <= 30; });
    const receivedMonth = received.filter(i => (i.dataRecebimento || i.dataVencimento || '').slice(0, 7) === month);
    const openValue = open.reduce((s, i) => s + i.valor, 0);
    const overdueValue = overdue.reduce((s, i) => s + i.valor, 0);
    return {
      openValue, overdueValue,
      receivedValue: received.reduce((s, i) => s + i.valor, 0),
      receivedMonthValue: receivedMonth.reduce((s, i) => s + i.valor, 0),
      next30Value: next30.reduce((s, i) => s + i.valor, 0),
      dueTodayValue: dueToday.reduce((s, i) => s + i.valor, 0),
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      openCount: open.length,
      receivedCount: received.length,
      ticket: normalizedItems.length ? normalizedItems.reduce((s, i) => s + i.valor, 0) / normalizedItems.length : 0,
      inadimplencia: openValue ? (overdueValue / openValue) * 100 : 0
    };
  }, [normalizedItems]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { previsto: number; recebido: number }>();
    normalizedItems.forEach(item => {
      const k = monthKey(item.dataVencimento);
      const cur = map.get(k) || { previsto: 0, recebido: 0 };
      cur.previsto += item.valor;
      if (item.status === 'recebido') cur.recebido += item.valor;
      map.set(k, cur);
    });
    return [...map.entries()].slice(-8);
  }, [normalizedItems]);

  const byClient = useMemo(() => {
    const map = new Map<string, number>();
    normalizedItems.forEach(i => map.set(i.clienteNome, (map.get(i.clienteNome) || 0) + i.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [normalizedItems]);

  const byCentro = useMemo(() => {
    const map = new Map<string, number>();
    normalizedItems.forEach(i => { const k = i.centroReceita || 'Outros'; map.set(k, (map.get(k) || 0) + i.valor); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [normalizedItems]);

  const aging = useMemo(() => {
    const today = todayISO();
    const buckets = [
      { label: 'Até 30 dias', min: 1, max: 30, value: 0 },
      { label: '31 a 60 dias', min: 31, max: 60, value: 0 },
      { label: '61 a 90 dias', min: 61, max: 90, value: 0 },
      { label: 'Acima de 90 dias', min: 91, max: Infinity, value: 0 }
    ];
    normalizedItems.filter(i => i.status !== 'recebido' && i.dataVencimento < today).forEach(i => {
      const days = Math.abs(daysBetween(i.dataVencimento, today));
      const b = buckets.find(b => days >= b.min && days <= b.max);
      if (b) b.value += i.valor;
    });
    return buckets;
  }, [normalizedItems]);

  const updateLocalItem = (updated: ContaReceberExtra) =>
    setItems(prev => prev.map(x => x.id === updated.id ? updated : x));

  const markReceived = async (item: ContaReceberExtra, ofx?: OfxEntry) => {
    setError(''); setSuccess('');
    try {
      const updated = await updateContaReceber(item.id, { status: 'recebido', dataRecebimento: ofx?.date || todayISO(), formaRecebimento: ofx ? 'OFX' : item.formaRecebimento, ofxFitid: ofx?.fitid, ofxData: ofx?.date, ofxDescricao: ofx?.memo } as any);
      updateLocalItem(updated as ContaReceberExtra);
      setSuccess('Recebimento baixado com sucesso.');
    } catch (err: any) { setError(err?.message || 'Erro ao baixar recebimento.'); }
  };

  const markSent = async (item: ContaReceberExtra) => {
    setError(''); setSuccess('');
    try {
      const updated = await updateContaReceber(item.id, { status: 'enviado' } as any);
      updateLocalItem(updated as ContaReceberExtra);
      setSuccess('Cobrança marcada como enviada.');
    } catch (err: any) { setError(err?.message || 'Erro ao atualizar cobrança.'); }
  };

  const markPending = async (item: ContaReceberExtra) => {
    setError(''); setSuccess('');
    try {
      const updated = await updateContaReceber(item.id, { status: 'pendente' } as any);
      updateLocalItem(updated as ContaReceberExtra);
    } catch (err: any) { setError(err?.message || 'Erro ao reabrir cobrança.'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir esta conta a receber?')) return;
    setError(''); setSuccess('');
    try {
      await deleteContaReceber(id);
      setItems(prev => prev.filter(x => x.id !== id));
      setSuccess('Recebimento excluído com sucesso.');
    } catch (err: any) { setError(err?.message || 'Erro ao excluir.'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!form.clienteNome.trim()) return setFormError('Informe o nome do cliente.');
    if (!Number.isFinite(valor) || valor <= 0) return setFormError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setFormError('Informe a data de vencimento.');
    setFormError(''); setSaving(true);
    try {
      const created = await addContaReceber(user, {
        clienteNome: form.clienteNome.trim(), clienteEmail: form.clienteEmail.trim(), clienteDocumento: form.clienteDocumento.trim(),
        descricao: form.descricao.trim(), valor, dataEmissao: form.dataEmissao, dataVencimento: form.dataVencimento,
        status: form.dataVencimento < todayISO() ? 'vencido' : 'pendente',
        observacoes: form.observacoes.trim(), numeroNF: form.numeroNF.trim(), serieNF: form.serieNF.trim(),
        competencia: form.competencia, centroReceita: form.centroReceita, formaRecebimento: form.formaRecebimento, origem: form.origem.trim()
      } as any);
      setItems(prev => [created as ContaReceberExtra, ...prev]);
      setForm(EMPTY_FORM); setShowForm(false);
      setSuccess('Recebimento cadastrado com sucesso.');
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao criar conta a receber.');
    } finally { setSaving(false); }
  };

  const handleOFX = async (file: File) => {
    setError(''); setSuccess('');
    const entries = parseOFX(await file.text()).filter(e => e.amount > 0);
    let count = 0;
    for (const entry of entries) {
      const candidate = normalizedItems
        .filter(i => i.status !== 'recebido' && Math.abs(i.valor - entry.amount) < 0.02)
        .sort((a, b) => textScore(entry.memo, `${b.clienteNome} ${b.descricao}`) - textScore(entry.memo, `${a.clienteNome} ${a.descricao}`))[0];
      if (candidate) { await markReceived(candidate, entry); count++; }
    }
    if (!count) setError('Nenhuma conta em aberto bateu com os créditos do OFX.');
    else setSuccess(`${count} recebimento(s) conciliado(s) pelo OFX.`);
  };

  const cardProps = { onMarkReceived: markReceived, onMarkSent: markSent, onMarkPending: markPending, onDelete: handleDelete };

  // ── HOME ──────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3" style={{ background: PRIMARY }}>
              <BanknoteArrowUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Contas a Receber</h1>
              <p className="text-sm text-slate-500 mt-0.5">Recebimentos, cobrança, inadimplência e fluxo de caixa.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
              <button onClick={load} title="Atualizar" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm transition dark:text-slate-300 dark:hover:bg-slate-800">
                <RefreshCw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Atualizar</span>
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
              <label title="Importar OFX" className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-white hover:shadow-sm dark:hover:bg-slate-800" style={{ color: PRIMARY }}>
                <FileUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Importar OFX</span>
                <input type="file" accept=".ofx" className="hidden" onChange={e => e.target.files?.[0] && handleOFX(e.target.files[0])} />
              </label>
            </div>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 shrink-0" style={{ background: PRIMARY }}>
              <Plus className="h-4 w-4" /> Novo recebimento
            </button>
          </div>
        </div>

        {toast && (
          <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <div className="flex items-center gap-2">{toast.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}{toast.message}</div>
            <button onClick={dismissToast}><X className="h-4 w-4" /></button>
          </div>
        )}

        <HomeScreen stats={stats} byMonth={byMonth} byClient={byClient} onNavigate={setScreen} />

        {/* Fullscreen form */}
        <FullscreenModal open={showForm} title="Novo recebimento" subtitle="Honorários, NFs, consultorias e receitas recorrentes" icon={BanknoteArrowUp} onClose={() => { setShowForm(false); setFormError(''); }}>
          <NovoRecebimentoForm saving={saving} form={form} error={formError} onChange={setForm} onSubmit={handleCreate} onClose={() => { setShowForm(false); setFormError(''); }} />
        </FullscreenModal>
      </div>
    );
  }

  // ── SUB-SCREENS ───────────────────────────────────────
  const meta = SCREEN_META[screen as Exclude<Screen, 'home'>];

  const screenActions = (
    <>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
        <button onClick={load} title="Atualizar" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm transition dark:text-slate-300 dark:hover:bg-slate-800">
          <RefreshCw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Atualizar</span>
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
        <label title="Importar OFX" className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-white hover:shadow-sm dark:hover:bg-slate-800" style={{ color: PRIMARY }}>
          <FileUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Importar OFX</span>
          <input type="file" accept=".ofx" className="hidden" onChange={e => e.target.files?.[0] && handleOFX(e.target.files[0])} />
        </label>
      </div>
      <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90" style={{ background: PRIMARY }}>
        <Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo recebimento</span>
      </button>
    </>
  );

  return (
    <>
      <ScreenShell title={meta.title} subtitle={meta.subtitle} icon={meta.icon} onBack={() => setScreen('home')} actions={screenActions} toast={toast} onDismissToast={dismissToast}>
        {screen === 'recebimentos' && (
          <RecebimentosScreen
            filtered={filtered} loading={loading} viewMode={viewMode} setViewMode={setViewMode}
            search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            centroFilter={centroFilter} setCentroFilter={setCentroFilter}
            {...cardProps}
          />
        )}
        {screen === 'cobrancas' && <CobrancasScreen filtered={filtered} {...cardProps} />}
        {screen === 'fluxo' && <FluxoScreen filtered={filtered} stats={stats} />}
        {screen === 'relatorios' && <RelatoriosScreen byCentro={byCentro} aging={aging} />}
      </ScreenShell>

      <FullscreenModal open={showForm} title="Novo recebimento" subtitle="Honorários, NFs, consultorias e receitas recorrentes" icon={BanknoteArrowUp} onClose={() => { setShowForm(false); setFormError(''); }}>
        <NovoRecebimentoForm saving={saving} form={form} error={formError} onChange={setForm} onSubmit={handleCreate} onClose={() => { setShowForm(false); setFormError(''); }} />
      </FullscreenModal>
    </>
  );
}