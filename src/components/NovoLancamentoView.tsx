import React, { useEffect, useState } from 'react';
import { AlertCircle, BanknoteArrowDown, CheckCircle2, Eye, Loader2, Pencil, Trash2, UploadCloud, X } from 'lucide-react';
import { PJUser, ContaPagar } from '../types';
import { addContaPagar, deleteContaPagar, getCategorias, getCentrosCusto, getContasPagar, updateContaPagar } from '../lib/db';
import ConfirmDialog from './ConfirmDialog';

interface NovoLancamentoViewProps {
  user: PJUser;
}

type StatusConta = 'aberto' | 'vencido' | 'pago' | 'aprovacao' | 'aprovado' | 'programado';

type FormState = {
  fornecedor: string;
  categoria: string;
  descricao: string;
  valor: string;
  dataVencimento: string;
  observacoes: string;
  competencia: string;
  centroCusto: string;
  numeroDocumento: string;
  dataEmissao: string;
  formaPagamento: string;
  status: StatusConta;
};

const PRIMARY = '#4F39F6';

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

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const toBRDate = (date?: string) => {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const EMPTY_FORM: FormState = {
  fornecedor: '', categoria: 'Outros', descricao: '', valor: '',
  dataVencimento: todayISO(), observacoes: '', competencia: monthISO(),
  centroCusto: 'Administrativo', numeroDocumento: '', dataEmissao: todayISO(),
  formaPagamento: 'Boleto', status: 'aberto'
};

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto', vencido: 'Vencido', pago: 'Pago',
  aprovacao: 'Em aprovação', aprovado: 'Aprovado', programado: 'Programado'
};

function statusClass(s: string) {
  if (s === 'pago') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'vencido') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (s === 'aprovacao') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (s === 'aprovado') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (s === 'programado') return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function getEffectiveStatus(item: ContaPagar): string {
  if (item.status === 'pago') return 'pago';
  if (['aprovacao', 'aprovado', 'programado'].includes(item.status)) return item.status;
  if (item.dataVencimento < todayISO()) return 'vencido';
  return 'aberto';
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#4F39F6] focus:ring-2 focus:ring-[#4F39F6]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
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

// ─────────────────────────────────────────────────────────
//  DETALHE MODAL (ver / editar / excluir)
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
                style={{ background: PRIMARY }}
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
            <Detail label="Vencimento" value={toBRDate(item.dataVencimento)} />
            <Detail label="Pagamento" value={(item as any).dataPagamento ? toBRDate((item as any).dataPagamento) : '—'} />
            <Detail label="Documento" value={(item as any).numeroDocumento || '—'} />
            <Detail label="Forma de pagamento" value={(item as any).formaPagamento || '—'} />
            <Detail label="Emissão" value={(item as any).dataEmissao ? toBRDate((item as any).dataEmissao) : '—'} />
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
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export default function NovoLancamentoView({ user }: NovoLancamentoViewProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [items, setItems] = useState<ContaPagar[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContaPagar | null>(null);

  const [categorias, setCategorias] = useState<string[]>(DEFAULT_CATEGORIAS);
  const [centrosCusto, setCentrosCusto] = useState<string[]>(DEFAULT_CENTROS_CUSTO);

  const load = async () => {
    setLoadingList(true);
    try {
      setItems(await getContasPagar(user));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar lançamentos.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { load(); }, [user.id, user.tenantId]);

  useEffect(() => {
    getCategorias(user).then(data => { if (data.length) setCategorias(data.map(c => c.nome)); }).catch(() => {});
    getCentrosCusto(user).then(data => { if (data.length) setCentrosCusto(data.map(c => c.nome)); }).catch(() => {});
  }, [user.id, user.tenantId]);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!form.fornecedor.trim()) return setError('Informe o fornecedor antes de adicionar.');
    if (!Number.isFinite(valor) || valor <= 0) return setError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setError('Informe a data de vencimento.');
    setError(''); setSaving(true);
    try {
      const status = form.status === 'aberto' && form.dataVencimento < todayISO() ? 'vencido' : form.status;
      const created = await addContaPagar(user, {
        fornecedor: form.fornecedor.trim(), categoria: form.categoria, descricao: form.descricao,
        valor, dataVencimento: form.dataVencimento, status, observacoes: form.observacoes,
        competencia: form.competencia, centroCusto: form.centroCusto,
        numeroDocumento: form.numeroDocumento, dataEmissao: form.dataEmissao,
        formaPagamento: form.formaPagamento
      });
      setItems(prev => [created, ...prev]);
      setForm(EMPTY_FORM);
      setSuccess('Conta a pagar adicionada com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta a pagar.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (id: string, updates: Partial<ContaPagar>) => {
    const updated = await updateContaPagar(id, updates);
    setItems(prev => prev.map(x => x.id === id ? updated : x));
    setSelectedItem(updated);
    setSuccess('Lançamento atualizado com sucesso.');
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const doDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    try {
      await deleteContaPagar(id);
      setItems(prev => prev.filter(x => x.id !== id));
      setSuccess('Lançamento excluído com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir.');
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-3" style={{ background: PRIMARY }}>
          <BanknoteArrowDown className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Novo Lançamento</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cadastre despesas, fornecedores e programe pagamentos.</p>
        </div>
      </div>

      {(error || success) && (
        <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}>
          <div className="flex items-center gap-2">
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {error || success}
          </div>
          <button onClick={() => { setError(''); setSuccess(''); }}><X className="h-4 w-4" /></button>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloco 1 — Fornecedor e valor */}
          <section>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Identificação</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-500">Fornecedor *</label>
                <input required value={form.fornecedor} onChange={set('fornecedor')} placeholder="Nome do fornecedor" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Valor *</label>
                <input required type="number" step="0.01" min="0.01" value={form.valor} onChange={set('valor')} placeholder="0,00" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">NF / Documento</label>
                <input value={form.numeroDocumento} onChange={set('numeroDocumento')} placeholder="Nº NF / boleto" className={inputCls} />
              </div>
            </div>
          </section>

          {/* Bloco 2 — Classificação */}
          <section>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Classificação</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                <label className="mb-1 block text-xs font-bold text-slate-500">Forma de pagamento</label>
                <select value={form.formaPagamento} onChange={set('formaPagamento')} className={inputCls}>
                  {FORMAS_PAGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Bloco 3 — Datas */}
          <section>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Datas</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Emissão</label>
                <input type="date" value={form.dataEmissao} onChange={set('dataEmissao')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Vencimento *</label>
                <input required type="date" value={form.dataVencimento} onChange={set('dataVencimento')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Competência</label>
                <input type="month" value={form.competencia} onChange={set('competencia')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Status inicial</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  <option value="aberto">Aberto</option>
                  <option value="aprovacao">Em aprovação</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="programado">Programado</option>
                </select>
              </div>
            </div>
          </section>

          {/* Bloco 4 — Descrição e observações */}
          <section>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Detalhes</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Descrição do serviço/produto</label>
                <textarea value={form.descricao} onChange={set('descricao')} rows={3} placeholder="Descreva o produto ou serviço..." className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Observações internas</label>
                <textarea value={form.observacoes} onChange={set('observacoes')} rows={3} placeholder="Notas internas, instruções, etc." className={inputCls} />
              </div>
            </div>
            <div className="mt-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 transition">
                <UploadCloud className="h-4 w-4" /> Anexar PDF / XML / imagem
                <input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg" className="hidden" />
              </label>
            </div>
          </section>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setError(''); }} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              Limpar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
              style={{ background: PRIMARY }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </div>
        </form>
      </Card>

      {/* Lista de lançamentos já cadastrados */}
      <div className="pt-2">
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">Lançamentos cadastrados</h2>
        {loadingList ? (
          <Card className="flex items-center justify-center p-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ color: PRIMARY }} /> Carregando...
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">Nenhum lançamento cadastrado ainda.</Card>
        ) : (
          <div className="space-y-2.5">
            {items.map(item => {
              const eff = getEffectiveStatus(item);
              return (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-900 dark:text-white truncate">{item.fornecedor}</p>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(eff)}`}>
                          {STATUS_LABEL[eff] || eff}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.categoria} · Venc. {toBRDate(item.dataVencimento)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-lg font-black text-slate-900 dark:text-white">{money(item.valor)}</p>
                      <button onClick={() => setSelectedItem(item)} title="Ver detalhes" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} title="Excluir" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DetalheModal item={selectedItem} categorias={categorias} centrosCusto={centrosCusto} onClose={() => setSelectedItem(null)} onSave={handleEditSave} onDelete={handleDelete} />

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Deseja excluir este lançamento?"
        onConfirm={doDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
