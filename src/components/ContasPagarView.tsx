import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  BanknoteArrowDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  FileUp,
  Filter,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  WalletCards,
  X
} from 'lucide-react';
import { ContaPagar, PJUser } from '../types';
import { deleteContaPagar, getCategorias, getCentrosCusto, getContasPagar, updateContaPagar } from '../lib/db';
import ConfirmDialog from './ConfirmDialog';

// ─────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────

interface ContasPagarViewProps {
  user: PJUser;
  onNavigate?: (tab: string) => void;
}

interface OfxEntry {
  fitid: string;
  date: string;
  amount: number;
  memo: string;
}

type TabKey = 'dashboard' | 'contas' | 'kanban' | 'fluxo' | 'relatorios';
type StatusConta = 'aberto' | 'vencido' | 'pago' | 'aprovacao' | 'aprovado' | 'programado';

// ─────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────

// Listas padrão usadas como fallback até os cadastros (Categoria/Centro de Custo) carregarem do Supabase.
const DEFAULT_CATEGORIAS = [
  'Administrativo', 'Aluguel', 'Banco e Tarifas', 'Contabilidade', 'Energia',
  'Fornecedor', 'Impostos', 'Marketing', 'Materiais', 'Pró-labore',
  'Salários', 'Sistema / Software', 'Telefonia / Internet', 'Terceiros', 'Outros'
];

const DEFAULT_CENTROS_CUSTO = [
  'Administrativo', 'Comercial', 'Contábil', 'Departamento Pessoal', 'Diretoria',
  'Financeiro', 'Fiscal', 'Operacional', 'Qualidade', 'Tecnologia'
];

const FORMAS_PAGAMENTO = [
  'Boleto', 'PIX', 'TED/DOC', 'Cartão de crédito', 'Débito automático', 'Dinheiro', 'OFX', 'Outro'
];

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  vencido: 'Vencido',
  pago: 'Pago',
  aprovacao: 'Em aprovação',
  aprovado: 'Aprovado',
  programado: 'Programado'
};

const KANBAN_COLUMNS: Array<{ key: StatusConta; title: string; text: string }> = [
  { key: 'aprovacao', title: 'Em aprovação', text: 'Despesas aguardando validação' },
  { key: 'aberto', title: 'A vencer', text: 'Contas lançadas e pendentes' },
  { key: 'programado', title: 'Programado', text: 'Pagamentos já programados' },
  { key: 'vencido', title: 'Vencidas', text: 'Itens que exigem ação imediata' },
  { key: 'pago', title: 'Pagas', text: 'Baixadas no financeiro' }
];

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const normalizeText = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function parseOFX(ofx: string): OfxEntry[] {
  const entries: OfxEntry[] = [];
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  while ((match = re.exec(ofx)) !== null) {
    const block = match[1];
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)(?:\\r|\\n|<|\\[)`))?.[1]?.trim() ?? '';
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

function daysBetween(iso: string) {
  return Math.ceil((new Date(iso.slice(0, 10)).getTime() - new Date(todayISO()).getTime()) / 86400000);
}

function getEffectiveStatus(item: ContaPagar): StatusConta {
  if (item.status === 'pago') return 'pago';
  if (item.status === 'aprovacao') return 'aprovacao';
  if (item.status === 'aprovado') return 'aprovado';
  if (item.status === 'programado') return 'programado';
  if (item.dataVencimento < todayISO()) return 'vencido';
  return 'aberto';
}

function statusClass(s: string) {
  if (s === 'pago') return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900';
  if (s === 'vencido') return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900';
  if (s === 'aprovacao') return 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900';
  if (s === 'aprovado') return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900';
  if (s === 'programado') return 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900';
  return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900';
}

function exportCsv(items: ContaPagar[]) {
  const rows = [
    ['Fornecedor', 'Categoria', 'Centro de Custo', 'Descrição', 'Documento', 'Valor', 'Vencimento', 'Pagamento', 'Status', 'Observações'],
    ...items.map((item: any) => [
      item.fornecedor, item.categoria, item.centroCusto || '', item.descricao || '', item.numeroDocumento || '',
      String(item.valor).replace('.', ','), formatDate(item.dataVencimento),
      item.dataPagamento ? formatDate(item.dataPagamento) : '',
      STATUS_LABEL[getEffectiveStatus(item)] || item.status, item.observacoes || ''
    ])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `contas-a-pagar-${todayISO()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────
//  SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────

/** Estilo input/select padrão */
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#4F39F6] focus:ring-2 focus:ring-[#4F39F6]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition';

function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {Icon && (
        <div className="rounded-xl p-2.5" style={{ background: '#4F39F6' }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      )}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, accent }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">{title}</p>
          <p className="mt-1.5 text-lg font-black text-slate-900 dark:text-white leading-tight break-words">{value}</p>
          {subtitle && <p className="mt-1 text-[11px] text-slate-500 leading-tight">{subtitle}</p>}
        </div>
        <div className="shrink-0 rounded-lg p-2" style={{ background: accent || '#4F39F6' }}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Card>
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

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-slate-50 p-4 dark:bg-slate-950 ${wide ? 'md:col-span-2' : ''}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ReportBox({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const total = rows.reduce((sum, [, v]) => sum + v, 0);
  return (
    <Card className="p-6">
      <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-0.5 text-sm text-slate-500">Total: {money(total)}</p>
      <div className="mt-4 space-y-2">
        {rows.length ? rows.map(([name, value]) => (
          <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{name}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{money(value)}</span>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Sem dados.
          </p>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
//  FILTERS BAR
// ─────────────────────────────────────────────────────────

interface FiltersBarProps {
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  categoriaFilter: string; setCategoriaFilter: (v: string) => void;
  centroFilter: string; setCentroFilter: (v: string) => void;
  monthFilter: string; setMonthFilter: (v: string) => void;
  categorias: string[];
  centrosCusto: string[];
}

function FiltersBar({ search, setSearch, statusFilter, setStatusFilter, categoriaFilter, setCategoriaFilter, centroFilter, setCentroFilter, monthFilter, setMonthFilter, categorias, centrosCusto }: FiltersBarProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filtros</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
        {/* Busca */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Fornecedor, NF, descrição..."
            className={`${inputCls} pl-9`}
          />
        </div>
        {/* Status */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {/* Categoria */}
        <select value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)} className={inputCls}>
          <option value="todos">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Centro de custo */}
        <select value={centroFilter} onChange={e => setCentroFilter(e.target.value)} className={inputCls}>
          <option value="todos">Todos centros</option>
          {centrosCusto.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Mês */}
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className={inputCls}
        />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
//  ACCOUNTS TABLE
// ─────────────────────────────────────────────────────────

interface AccountsTableProps {
  items: ContaPagar[];
  loading: boolean;
  onPaid: (item: ContaPagar) => void;
  onDelete: (id: string) => void;
  onView: (item: ContaPagar) => void;
  onStatus: (item: ContaPagar, status: StatusConta) => void;
  compact?: boolean;
}

function AccountsTable({ items, loading, onPaid, onDelete, onView, onStatus, compact = false }: AccountsTableProps) {
  if (loading) return (
    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ color: '#4F39F6' }} /> Carregando contas...
    </div>
  );

  if (!items.length) return (
    <EmptyState title="Nenhuma conta encontrada" text="Ajuste os filtros ou cadastre um novo lançamento." />
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-950">
            <tr>
              <th className="px-5 py-3.5">Fornecedor</th>
              <th className="px-5 py-3.5">Documento</th>
              <th className="px-5 py-3.5">Categoria</th>
              <th className="px-5 py-3.5">Centro</th>
              <th className="px-5 py-3.5">Vencimento</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Valor</th>
              <th className="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {items.map((item: any) => {
              const eff = getEffectiveStatus(item);
              return (
                <tr key={item.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{item.fornecedor}</p>
                    {!compact && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.descricao || 'Sem descrição'}</p>}
                  </td>
                  <td className="px-5 py-4 text-slate-500">{item.numeroDocumento || '—'}</td>
                  <td className="px-5 py-4 text-slate-500">{item.categoria}</td>
                  <td className="px-5 py-4 text-slate-500">{item.centroCusto || 'Administrativo'}</td>
                  <td className="px-5 py-4 text-slate-500 tabular-nums">{formatDate(item.dataVencimento)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(eff)}`}>
                      {STATUS_LABEL[eff] || eff}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">
                    {money(item.valor)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <ActionBtn onClick={() => onView(item)} title="Ver detalhes" color="slate">
                        <Eye className="h-3.5 w-3.5" />
                      </ActionBtn>
                      {eff !== 'pago' && (
                        <ActionBtn onClick={() => onPaid(item)} title="Marcar como pago" color="emerald">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                      )}
                      {eff === 'aprovacao' && (
                        <ActionBtn onClick={() => onStatus(item, 'aprovado')} title="Aprovar" color="blue">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </ActionBtn>
                      )}
                      {eff === 'aprovado' && (
                        <ActionBtn onClick={() => onStatus(item, 'programado')} title="Programar pagamento" color="cyan">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </ActionBtn>
                      )}
                      <ActionBtn onClick={() => onDelete(item.id)} title="Excluir" color="rose">
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title, color }: { children: React.ReactNode; onClick: () => void; title: string; color: string }) {
  const map: Record<string, string> = {
    slate: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800',
    emerald: 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    blue: 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30',
    cyan: 'text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30',
    rose: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30',
  };
  return (
    <button onClick={onClick} title={title} className={`rounded-lg p-1.5 transition ${map[color] || map.slate}`}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
//  OFX MATCH PANEL
// ─────────────────────────────────────────────────────────

function OfxMatchPanel({
  matches,
  onConfirm,
  onIgnore
}: {
  matches: Array<{ entry: OfxEntry; item: ContaPagar; score: number }>;
  onConfirm: (m: { entry: OfxEntry; item: ContaPagar; score: number }) => void;
  onIgnore: (fitid: string) => void;
}) {
  if (!matches.length) return null;
  return (
    <Card className="p-5 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
      <div className="flex items-center gap-2.5 mb-4">
        <ArrowDownUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-black text-blue-900 dark:text-blue-200">
          Conciliação OFX — {matches.length} correspondência(s) pendente(s)
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {matches.map(match => (
          <div key={match.entry.fitid} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">{match.item.fornecedor}</p>
                <p className="mt-0.5 text-sm text-slate-500 truncate">{match.entry.memo}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Data OFX: {formatDate(match.entry.date)} · Confiança: {Math.round(match.score * 100)}%
                </p>
              </div>
              <p className="shrink-0 text-base font-black text-slate-900 dark:text-white">
                {money(Math.abs(match.entry.amount))}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onIgnore(match.entry.fitid)}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Ignorar
              </button>
              <button
                onClick={() => onConfirm(match)}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white transition"
                style={{ background: '#4F39F6' }}
              >
                Confirmar baixa
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
//  MODAL — DETALHE
// ─────────────────────────────────────────────────────────

interface DetalheModalProps {
  item: ContaPagar | null;
  categorias: string[];
  centrosCusto: string[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<ContaPagar>) => Promise<void>;
  onDelete: (id: string) => void;
}

function DetalheModal({ item, categorias, centrosCusto, onClose, onSave, onDelete }: DetalheModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        fornecedor: item.fornecedor,
        categoria: item.categoria,
        centroCusto: (item as any).centroCusto || 'Administrativo',
        valor: String(item.valor),
        dataVencimento: (item.dataVencimento || '').slice(0, 10),
        dataEmissao: ((item as any).dataEmissao || '').slice(0, 10),
        numeroDocumento: (item as any).numeroDocumento || '',
        formaPagamento: (item as any).formaPagamento || 'Boleto',
        competencia: (item as any).competencia || '',
        descricao: item.descricao || '',
        observacoes: (item as any).observacoes || ''
      });
      setEditing(false);
      setError('');
    }
  }, [item]);

  if (!item || !form) return null;
  const eff = getEffectiveStatus(item);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!form.fornecedor.trim()) return setError('Informe o fornecedor.');
    if (!Number.isFinite(valor) || valor <= 0) return setError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setError('Informe a data de vencimento.');
    setError(''); setSaving(true);
    try {
      await onSave(item.id, {
        fornecedor: form.fornecedor.trim(), categoria: form.categoria, centroCusto: form.centroCusto,
        valor, dataVencimento: form.dataVencimento, dataEmissao: form.dataEmissao,
        numeroDocumento: form.numeroDocumento, formaPagamento: form.formaPagamento,
        competencia: form.competencia, descricao: form.descricao, observacoes: form.observacoes
      } as any);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{editing ? 'Editar lançamento' : item.fornecedor}</h2>
            {!editing && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(eff)}`}>
                  {STATUS_LABEL[eff] || eff}
                </span>
                <span className="text-sm text-slate-500">{item.categoria}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!editing && (
              <>
                <button onClick={() => setEditing(true)} title="Editar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => { onDelete(item.id); onClose(); }} title="Excluir" className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {editing ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Fornecedor *</label>
                <input value={form.fornecedor} onChange={set('fornecedor')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Valor *</label>
                <input type="number" step="0.01" min="0.01" value={form.valor} onChange={set('valor')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Categoria</label>
                <select value={form.categoria} onChange={set('categoria')} className={inputCls}>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Centro de custo</label>
                <select value={form.centroCusto} onChange={set('centroCusto')} className={inputCls}>
                  {centrosCusto.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Vencimento *</label>
                <input type="date" value={form.dataVencimento} onChange={set('dataVencimento')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Emissão</label>
                <input type="date" value={form.dataEmissao} onChange={set('dataEmissao')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Documento</label>
                <input value={form.numeroDocumento} onChange={set('numeroDocumento')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Forma de pagamento</label>
                <select value={form.formaPagamento} onChange={set('formaPagamento')} className={inputCls}>
                  {FORMAS_PAGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Competência</label>
                <input type="month" value={form.competencia} onChange={set('competencia')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Descrição</label>
              <textarea rows={2} value={form.descricao} onChange={set('descricao')} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Observações</label>
              <textarea rows={2} value={form.observacoes} onChange={set('observacoes')} className={inputCls} />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => { setEditing(false); setError(''); }} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Cancelar
              </button>
              <button
                type="button" onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
                style={{ background: '#4F39F6' }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Detail label="Valor" value={money(item.valor)} />
            <Detail label="Centro de custo" value={(item as any).centroCusto || 'Administrativo'} />
            <Detail label="Vencimento" value={formatDate(item.dataVencimento)} />
            <Detail label="Pagamento" value={(item as any).dataPagamento ? formatDate((item as any).dataPagamento) : '—'} />
            <Detail label="Documento" value={(item as any).numeroDocumento || '—'} />
            <Detail label="Forma de pagamento" value={(item as any).formaPagamento || '—'} />
            <Detail label="Emissão" value={(item as any).dataEmissao ? formatDate((item as any).dataEmissao) : '—'} />
            <Detail label="Competência" value={(item as any).competencia || '—'} />
            {item.descricao && <Detail label="Descrição" value={item.descricao} wide />}
            {(item as any).observacoes && <Detail label="Observações" value={(item as any).observacoes} wide />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  TAB VIEWS
// ─────────────────────────────────────────────────────────

function DashboardTab({
  stats, byCategory, filtered, loading,
  onPaid, onDelete, onView, onStatus, onNewConta, onGoKanban, onGoFluxo
}: any) {
  return (
    <div className="space-y-5">
      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Por categoria */}
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Resumo por categoria</h3>
              <p className="text-sm text-slate-500 mt-0.5">Somente contas em aberto.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-300" />
          </div>
          {byCategory.length ? (
            <div className="space-y-3.5">
              {byCategory.map(([name, value]: [string, number]) => {
                const pct = stats.openValue ? Math.min(100, (value / stats.openValue) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                      <span className="font-bold text-slate-500">{money(value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: '#4F39F6' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Sem dados" text="Cadastre contas em aberto." />
          )}
        </Card>

        {/* Ações rápidas */}
        <Card className="p-6">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Ações rápidas</h3>
          <div className="space-y-2">
            {[
              { label: 'Novo lançamento', icon: Plus, action: onNewConta },
              { label: 'Revisar aprovações', icon: ShieldCheck, action: onGoKanban },
              { label: 'Ver fluxo de caixa', icon: TrendingDown, action: onGoFluxo }
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-left text-sm font-bold text-slate-700 hover:border-[#4F39F6]/20 hover:bg-[#4F39F6]/5 hover:text-[#4F39F6] transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                {label} <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Próximos vencimentos */}
      <Card className="p-6">
        <h3 className="font-black text-slate-900 dark:text-white mb-4">Próximos vencimentos</h3>
        <AccountsTable
          items={filtered.slice(0, 8)} loading={loading}
          onPaid={onPaid} onDelete={onDelete} onView={onView} onStatus={onStatus}
        />
      </Card>
    </div>
  );
}

function KanbanTab({ filtered, onPaid, onStatus }: {
  filtered: ContaPagar[];
  onPaid: (item: ContaPagar) => void;
  onStatus: (item: ContaPagar, status: StatusConta) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      {KANBAN_COLUMNS.map(col => {
        const colItems = filtered.filter(i => getEffectiveStatus(i) === col.key);
        const total = colItems.reduce((s, i) => s + i.valor, 0);
        return (
          <div key={col.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            {/* Column header */}
            <div className="mb-4 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">{col.title}</h3>
                <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-black text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                  {colItems.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">{col.text}</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{money(total)}</p>
            </div>
            {/* Cards */}
            <div className="space-y-2.5">
              {colItems.map(item => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{item.fornecedor}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.descricao || 'Sem descrição'}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400 tabular-nums">{formatDate(item.dataVencimento)}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{money(item.valor)}</span>
                  </div>
                  {/* Actions */}
                  <div className="mt-3 flex gap-1.5">
                    {col.key === 'aprovacao' && (
                      <button
                        onClick={() => onStatus(item, 'aprovado')}
                        className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition"
                        style={{ background: '#4F39F6' }}
                      >Aprovar</button>
                    )}
                    {col.key === 'aprovado' && (
                      <button
                        onClick={() => onStatus(item, 'programado')}
                        className="flex-1 rounded-lg bg-cyan-600 py-2 text-xs font-bold text-white hover:bg-cyan-700 transition"
                      >Programar</button>
                    )}
                    {col.key !== 'pago' && (
                      <button
                        onClick={() => onPaid(item)}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                      >Pagar</button>
                    )}
                  </div>
                </div>
              ))}
              {!colItems.length && (
                <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-700">
                  Nenhum item.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FluxoTab({ cashFlow, stats }: { cashFlow: Array<{ item: ContaPagar; accumulated: number }>; stats: any }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white">Fluxo de caixa projetado</h3>
          <p className="text-sm text-slate-500 mt-0.5">Projeção dos próximos pagamentos em aberto.</p>
        </div>
        <div className="rounded-xl bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Próximos 30 dias</p>
          <p className="text-lg font-black text-slate-900 dark:text-white">{money(stats.next30Value)}</p>
        </div>
      </div>

      {cashFlow.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-400 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-3.5">Vencimento</th>
                <th className="px-5 py-3.5">Fornecedor</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5 text-right">Saída</th>
                <th className="px-5 py-3.5 text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {cashFlow.map(({ item, accumulated }) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 tabular-nums">{formatDate(item.dataVencimento)}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{item.fornecedor}</td>
                  <td className="px-5 py-3.5 text-slate-500">{item.categoria}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-rose-600 tabular-nums">
                    -{money(item.valor)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white tabular-nums">
                    -{money(accumulated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Sem fluxo projetado" text="Não há contas em aberto para montar a projeção de caixa." />
      )}
    </Card>
  );
}

function RelatoriosTab({ byCostCenter, byCategory, filtered, loading, onPaid, onDelete, onView, onStatus }: any) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReportBox title="Por centro de custo" rows={byCostCenter} />
        <ReportBox title="Por categoria" rows={byCategory} />
      </div>
      <Card className="p-6">
        <h3 className="font-black text-slate-900 dark:text-white mb-4">Base filtrada para conferência</h3>
        <AccountsTable
          items={filtered} loading={loading} compact
          onPaid={onPaid} onDelete={onDelete} onView={onView} onStatus={onStatus}
        />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  STEPPER — navegação em fluxo de etapas
// ─────────────────────────────────────────────────────────

const STEP_ORDER: TabKey[] = ['dashboard', 'contas', 'kanban', 'fluxo', 'relatorios'];

const STEP_META: Record<TabKey, { label: string; subtitle: string; icon: React.ElementType }> = {
  dashboard: { label: 'Dashboard', subtitle: 'Resumo por categoria e próximos vencimentos', icon: LayoutDashboard },
  contas: { label: 'Contas', subtitle: 'Todas as contas com filtros avançados', icon: ListChecks },
  kanban: { label: 'Aprovações', subtitle: 'Fluxo de aprovação por estágio', icon: ShieldCheck },
  fluxo: { label: 'Fluxo de Caixa', subtitle: 'Projeção de saídas por ordem de vencimento', icon: TrendingDown },
  relatorios: { label: 'Relatórios', subtitle: 'Por centro de custo e categoria, com exportação CSV', icon: BarChart3 }
};

function StepperNav({ current, onNavigate, visited, badgeCount }: {
  current: TabKey;
  onNavigate: (s: TabKey) => void;
  visited: Set<TabKey>;
  badgeCount: number;
}) {
  const currentIndex = STEP_ORDER.indexOf(current);
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center">
        {STEP_ORDER.map((key, i) => {
          const meta = STEP_META[key];
          const Icon = meta.icon;
          const isActive = key === current;
          const isVisited = visited.has(key);
          const isLast = i === STEP_ORDER.length - 1;
          return (
            <React.Fragment key={key}>
              <button
                type="button"
                onClick={() => onNavigate(key)}
                className="group flex flex-1 flex-col items-center gap-1.5 sm:flex-initial sm:min-w-[96px]"
              >
                <span
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition sm:h-10 sm:w-10 ${
                    isActive
                      ? 'border-transparent text-white shadow-md'
                      : isVisited
                        ? 'border-[#4F39F6] text-[#4F39F6] bg-white dark:bg-slate-900'
                        : 'border-slate-200 text-slate-400 bg-white group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                  style={isActive ? { background: '#4F39F6' } : {}}
                >
                  <Icon className="h-4 w-4" />
                  {key === 'kanban' && badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </span>
                <span className={`hidden text-center text-[11px] font-bold leading-tight sm:block ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                  {meta.label}
                </span>
              </button>
              {!isLast && (
                <div className={`mx-1 h-0.5 flex-1 rounded-full transition-colors sm:mx-2 ${i < currentIndex ? 'bg-[#4F39F6]' : 'bg-slate-200 dark:bg-slate-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}

function StepFooterNav({ current, onNavigate }: { current: TabKey; onNavigate: (s: TabKey) => void }) {
  const idx = STEP_ORDER.indexOf(current);
  const prev = idx > 0 ? STEP_ORDER[idx - 1] : null;
  const next = idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
      <button
        type="button"
        disabled={!prev}
        onClick={() => prev && onNavigate(prev)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <ChevronLeft className="h-4 w-4" /> {prev ? STEP_META[prev].label : 'Início'}
      </button>
      <button
        type="button"
        disabled={!next}
        onClick={() => next && onNavigate(next)}
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: '#4F39F6' }}
      >
        {next ? STEP_META[next].label : 'Fim'} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export default function ContasPagarView({ user, onNavigate }: ContasPagarViewProps) {
  const [items, setItems] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set(['dashboard']));

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoriaFilter, setCategoriaFilter] = useState('todos');
  const [centroFilter, setCentroFilter] = useState('todos');
  const [monthFilter, setMonthFilter] = useState(monthISO());

  // Modals
  const [selectedItem, setSelectedItem] = useState<ContaPagar | null>(null);

  // OFX
  const [ofxMatches, setOfxMatches] = useState<Array<{ entry: OfxEntry; item: ContaPagar; score: number }>>([]);

  // Cadastros (Categoria / Centro de Custo)
  const [categorias, setCategorias] = useState<string[]>(DEFAULT_CATEGORIAS);
  const [centrosCusto, setCentrosCusto] = useState<string[]>(DEFAULT_CENTROS_CUSTO);

  // ── Data loading ──────────────────────────────────────
  const load = async () => {
    setLoading(true); setError('');
    try { setItems(await getContasPagar(user)); }
    catch (err: any) { setError(err?.message || 'Erro ao carregar contas a pagar.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user.id, user.tenantId]);

  useEffect(() => {
    getCategorias(user).then(data => { if (data.length) setCategorias(data.map(c => c.nome)); }).catch(() => {});
    getCentrosCusto(user).then(data => { if (data.length) setCentrosCusto(data.map(c => c.nome)); }).catch(() => {});
  }, [user.id, user.tenantId]);

  // ── Derived data ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return items.filter(item => {
      const eff = getEffectiveStatus(item);
      const text = normalizeText(`${item.fornecedor} ${item.categoria} ${item.descricao || ''} ${(item as any).observacoes || ''} ${(item as any).numeroDocumento || ''} ${(item as any).centroCusto || ''}`);
      return (
        (!q || text.includes(q)) &&
        (statusFilter === 'todos' || eff === statusFilter) &&
        (categoriaFilter === 'todos' || item.categoria === categoriaFilter) &&
        (centroFilter === 'todos' || ((item as any).centroCusto || 'Administrativo') === centroFilter) &&
        (!monthFilter || String(item.dataVencimento || '').startsWith(monthFilter))
      );
    });
  }, [items, search, statusFilter, categoriaFilter, centroFilter, monthFilter]);

  const stats = useMemo(() => {
    const open = items.filter(i => ['aberto', 'vencido', 'aprovacao', 'aprovado', 'programado'].includes(getEffectiveStatus(i)));
    const paid = items.filter(i => getEffectiveStatus(i) === 'pago');
    const overdue = open.filter(i => getEffectiveStatus(i) === 'vencido');
    const dueToday = open.filter(i => i.dataVencimento === todayISO());
    const next7 = open.filter(i => { const d = daysBetween(i.dataVencimento); return d >= 0 && d <= 7; });
    const next30 = open.filter(i => { const d = daysBetween(i.dataVencimento); return d >= 0 && d <= 30; });
    return {
      openValue: open.reduce((s, i) => s + i.valor, 0),
      paidValue: paid.reduce((s, i) => s + i.valor, 0),
      overdueValue: overdue.reduce((s, i) => s + i.valor, 0),
      overdueCount: overdue.length,
      dueTodayValue: dueToday.reduce((s, i) => s + i.valor, 0),
      dueTodayCount: dueToday.length,
      next7Value: next7.reduce((s, i) => s + i.valor, 0),
      next30Value: next30.reduce((s, i) => s + i.valor, 0),
      totalCount: items.length
    };
  }, [items]);

  const pendingApprovalCount = useMemo(() =>
    items.filter(i => getEffectiveStatus(i) === 'aprovacao').length, [items]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => getEffectiveStatus(i) !== 'pago').forEach(i => {
      const k = i.categoria || 'Outros';
      map.set(k, (map.get(k) || 0) + i.valor);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [items]);

  const byCostCenter = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => getEffectiveStatus(i) !== 'pago').forEach(i => {
      const k = (i as any).centroCusto || 'Administrativo';
      map.set(k, (map.get(k) || 0) + i.valor);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [items]);

  const cashFlow = useMemo(() => {
    let acc = 0;
    return items
      .filter(i => getEffectiveStatus(i) !== 'pago')
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .slice(0, 20)
      .map(item => { acc += item.valor; return { item, accumulated: acc }; });
  }, [items]);

  // ── Handlers ──────────────────────────────────────────
  const goToStep = (s: TabKey) => {
    setTab(s);
    setVisited(prev => (prev.has(s) ? prev : new Set(prev).add(s)));
  };

  const updateStatus = async (item: ContaPagar, status: StatusConta, extra: any = {}) => {
    setError(''); setSuccess('');
    try {
      const updated = await updateContaPagar(item.id, {
        status,
        ...(status === 'pago' ? { dataPagamento: extra.dataPagamento || todayISO() } : {}),
        ...extra
      });
      setItems(prev => prev.map(x => x.id === item.id ? updated : x));
      setSuccess(status === 'pago' ? 'Conta baixada como paga.' : 'Status atualizado.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar conta.');
    }
  };

  const markPaid = async (item: ContaPagar, ofx?: OfxEntry) => {
    await updateStatus(item, 'pago', {
      dataPagamento: ofx?.date || todayISO(),
      formaPagamento: ofx ? 'OFX' : (item as any).formaPagamento,
      ofxFitid: ofx?.fitid, ofxData: ofx?.date, ofxDescricao: ofx?.memo
    });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const doDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    setError(''); setSuccess('');
    try {
      await deleteContaPagar(id);
      setItems(prev => prev.filter(x => x.id !== id));
      setSuccess('Conta excluída com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir conta.');
    }
  };

  const handleEditSave = async (id: string, updates: Partial<ContaPagar>) => {
    const updated = await updateContaPagar(id, updates);
    setItems(prev => prev.map(x => x.id === id ? updated : x));
    setSelectedItem(updated);
    setSuccess('Lançamento atualizado com sucesso.');
  };

  const handleOFX = async (file: File) => {
    setError(''); setSuccess(''); setOfxMatches([]);
    const entries = parseOFX(await file.text()).filter(e => e.amount < 0);
    const matches: typeof ofxMatches = [];
    for (const entry of entries) {
      const value = Math.abs(entry.amount);
      const candidates = items
        .filter(i => getEffectiveStatus(i) !== 'pago' && Math.abs(i.valor - value) < 0.02)
        .map(i => ({ item: i, score: textScore(entry.memo, `${i.fornecedor} ${i.descricao || ''} ${(i as any).numeroDocumento || ''}`) }))
        .sort((a, b) => b.score - a.score);
      if (candidates[0]) matches.push({ entry, item: candidates[0].item, score: candidates[0].score });
    }
    if (!matches.length) { setError('Nenhuma conta em aberto bateu com os débitos do OFX.'); return; }
    setOfxMatches(matches);
    setSuccess(`${matches.length} possível(is) conciliação(ões) encontrada(s). Revise antes de confirmar.`);
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1440px] space-y-4">

      {/* ── Page header ── */}
      <Card className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 rounded-xl p-2.5" style={{ background: '#4F39F6' }}>
              <BanknoteArrowDown className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Contas a Pagar</h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Aprovação · Conciliação OFX · Centro de custo · Relatórios
              </p>
            </div>
          </div>

          {/* Actions — always single row */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Utility group */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={load}
                title="Atualizar"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={() => exportCsv(filtered)}
                title="Exportar CSV"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
              <label
                title="Importar OFX"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-white hover:shadow-sm dark:hover:bg-slate-800"
                style={{ color: '#4F39F6' }}
              >
                <FileUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Importar OFX</span>
                <input type="file" accept=".ofx" className="hidden" onChange={e => e.target.files?.[0] && handleOFX(e.target.files[0])} />
              </label>
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => onNavigate?.('novo_lancamento')}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 shrink-0"
              style={{ background: '#4F39F6' }}
            >
              <Plus className="h-4 w-4" /> Nova Conta
            </button>
          </div>
        </div>
      </Card>

      {/* ── Toast / Alert ── */}
      {(error || success) && (
        <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}>
          <div className="flex items-center gap-2">
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {error || success}
          </div>
          <button onClick={() => { setError(''); setSuccess(''); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── OFX conciliation panel ── */}
      <OfxMatchPanel
        matches={ofxMatches}
        onConfirm={async match => {
          await markPaid(match.item, match.entry);
          setOfxMatches(prev => prev.filter(x => x.entry.fitid !== match.entry.fitid));
        }}
        onIgnore={fitid => setOfxMatches(prev => prev.filter(x => x.entry.fitid !== fitid))}
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
        <StatCard title="Em aberto" value={money(stats.openValue)} subtitle={`${stats.totalCount} lançamento(s)`} icon={WalletCards} />
        <StatCard title="Vencidas" value={money(stats.overdueValue)} subtitle={`${stats.overdueCount} conta(s)`} icon={AlertCircle} accent="#e11d48" />
        <StatCard title="Vence hoje" value={money(stats.dueTodayValue)} subtitle={`${stats.dueTodayCount} pagamento(s)`} icon={Clock3} accent="#d97706" />
        <StatCard title="Próx. 7 dias" value={money(stats.next7Value)} subtitle="Previsão curta" icon={Calendar} accent="#0891b2" />
        <StatCard title="Pago" value={money(stats.paidValue)} subtitle="Baixas realizadas" icon={CheckCircle2} accent="#059669" />
      </div>

      {/* ── Stepper: fluxo guiado ── */}
      <StepperNav current={tab} onNavigate={goToStep} visited={visited} badgeCount={pendingApprovalCount} />

      {/* ── Etapa atual ── */}
      <div className="flex items-center gap-2.5">
        <div className="rounded-xl p-2" style={{ background: '#4F39F6' }}>
          {(() => { const Icon = STEP_META[tab].icon; return <Icon className="h-4 w-4 text-white" />; })()}
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">{STEP_META[tab].label}</h2>
          <p className="text-xs text-slate-500">{STEP_META[tab].subtitle}</p>
        </div>
      </div>

      {/* ── Filters (todas as etapas) ── */}
      <FiltersBar
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        categoriaFilter={categoriaFilter} setCategoriaFilter={setCategoriaFilter}
        centroFilter={centroFilter} setCentroFilter={setCentroFilter}
        monthFilter={monthFilter} setMonthFilter={setMonthFilter}
        categorias={categorias} centrosCusto={centrosCusto}
      />

      {/* ── Tab content ── */}
      {tab === 'dashboard' && (
        <DashboardTab
          stats={stats} byCategory={byCategory} filtered={filtered} loading={loading}
          onPaid={markPaid} onDelete={handleDelete} onView={setSelectedItem} onStatus={updateStatus}
          onNewConta={() => onNavigate?.('novo_lancamento')}
          onGoKanban={() => goToStep('kanban')}
          onGoFluxo={() => goToStep('fluxo')}
        />
      )}

      {tab === 'contas' && (
        <AccountsTable
          items={filtered} loading={loading}
          onPaid={markPaid} onDelete={handleDelete} onView={setSelectedItem} onStatus={updateStatus}
        />
      )}

      {tab === 'kanban' && (
        <KanbanTab filtered={filtered} onPaid={markPaid} onStatus={updateStatus} />
      )}

      {tab === 'fluxo' && (
        <FluxoTab cashFlow={cashFlow} stats={stats} />
      )}

      {tab === 'relatorios' && (
        <RelatoriosTab
          byCostCenter={byCostCenter} byCategory={byCategory}
          filtered={filtered} loading={loading}
          onPaid={markPaid} onDelete={handleDelete} onView={setSelectedItem} onStatus={updateStatus}
        />
      )}

      {/* ── Navegação entre etapas ── */}
      <StepFooterNav current={tab} onNavigate={goToStep} />

      {/* ── Modais ── */}
      <DetalheModal item={selectedItem} categorias={categorias} centrosCusto={centrosCusto} onClose={() => setSelectedItem(null)} onSave={handleEditSave} onDelete={handleDelete} />

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Deseja excluir esta conta a pagar?"
        onConfirm={doDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}