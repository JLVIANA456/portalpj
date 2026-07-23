import React, { useEffect, useState } from 'react';
import { AlertCircle, BanknoteArrowUp, CheckCircle2, Eye, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { PJUser, ContaReceber } from '../types';
import { addContaReceber, deleteContaReceber, getContasReceber, updateContaReceber } from '../lib/db';
import ConfirmDialog from './ConfirmDialog';

interface NovoRecebimentoViewProps {
  user: PJUser;
}

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

type ContaReceberExtra = ContaReceber & {
  numeroNF?: string;
  serieNF?: string;
  competencia?: string;
  centroReceita?: string;
  formaRecebimento?: string;
  origem?: string;
};

const PRIMARY = '#4F39F6';

const CENTROS_RECEITA = [
  'Contabilidade', 'Fiscal', 'Departamento Pessoal', 'BPO Financeiro',
  'Consultoria', 'IRPF', 'Legalização', 'Outros'
];

const FORMAS_RECEBIMENTO = ['PIX', 'Boleto', 'Transferência', 'Cartão', 'Dinheiro', 'OFX', 'Outros'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const toBRDate = (date?: string) => {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const EMPTY_FORM: FormState = {
  clienteNome: '', clienteEmail: '', clienteDocumento: '', descricao: '', valor: '',
  dataEmissao: todayISO(), dataVencimento: todayISO(),
  numeroNF: '', serieNF: '', competencia: todayISO().slice(0, 7),
  centroReceita: 'Contabilidade', formaRecebimento: 'PIX', origem: 'Honorários', observacoes: ''
};

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#4F39F6] focus:ring-2 focus:ring-[#4F39F6]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

function statusClasses(s: string) {
  if (s === 'recebido') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'vencido') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (s === 'enviado') return 'bg-violet-50 text-violet-700 border-violet-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function statusLabel(s: string) {
  return ({ pendente: 'Pendente', enviado: 'Cobrança enviada', vencido: 'Vencido', recebido: 'Recebido' } as Record<string, string>)[s] || s;
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
  item: ContaReceberExtra | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ContaReceberExtra>) => Promise<void>;
  onDelete: (id: string) => void;
}

function DetalheModal({ item, onClose, onSave, onDelete }: DetalheModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        clienteNome: item.clienteNome,
        clienteEmail: item.clienteEmail || '',
        clienteDocumento: item.clienteDocumento || '',
        descricao: item.descricao || '',
        valor: String(item.valor),
        dataEmissao: (item.dataEmissao || '').slice(0, 10),
        dataVencimento: (item.dataVencimento || '').slice(0, 10),
        numeroNF: item.numeroNF || '',
        serieNF: item.serieNF || '',
        competencia: item.competencia || '',
        centroReceita: item.centroReceita || 'Contabilidade',
        formaRecebimento: item.formaRecebimento || 'PIX',
        origem: item.origem || '',
        observacoes: item.observacoes || ''
      });
      setEditing(false);
      setError('');
    }
  }, [item]);

  if (!item || !form) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!form.clienteNome.trim()) return setError('Informe o nome do cliente.');
    if (!Number.isFinite(valor) || valor <= 0) return setError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setError('Informe a data de vencimento.');
    setError(''); setSaving(true);
    try {
      await onSave(item.id, {
        clienteNome: form.clienteNome.trim(), clienteEmail: form.clienteEmail.trim(), clienteDocumento: form.clienteDocumento.trim(),
        descricao: form.descricao.trim(), valor, dataEmissao: form.dataEmissao, dataVencimento: form.dataVencimento,
        numeroNF: form.numeroNF.trim(), serieNF: form.serieNF.trim(), competencia: form.competencia,
        centroReceita: form.centroReceita, formaRecebimento: form.formaRecebimento, origem: form.origem.trim(),
        observacoes: form.observacoes.trim()
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
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{editing ? 'Editar recebimento' : item.clienteNome}</h2>
            {!editing && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
                {item.numeroNF && <span className="text-sm text-slate-500">NF {item.numeroNF}</span>}
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
                <label className="mb-1 block text-xs font-bold text-slate-500">Nome do cliente *</label>
                <input value={form.clienteNome} onChange={set('clienteNome')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Valor *</label>
                <input type="number" step="0.01" min="0.01" value={form.valor} onChange={set('valor')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">E-mail</label>
                <input type="email" value={form.clienteEmail} onChange={set('clienteEmail')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">CPF / CNPJ</label>
                <input value={form.clienteDocumento} onChange={set('clienteDocumento')} className={inputCls} />
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
                <label className="mb-1 block text-xs font-bold text-slate-500">Número NF</label>
                <input value={form.numeroNF} onChange={set('numeroNF')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Série NF</label>
                <input value={form.serieNF} onChange={set('serieNF')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Centro de receita</label>
                <select value={form.centroReceita} onChange={set('centroReceita')} className={inputCls}>
                  {CENTROS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Forma de recebimento</label>
                <select value={form.formaRecebimento} onChange={set('formaRecebimento')} className={inputCls}>
                  {FORMAS_RECEBIMENTO.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Competência</label>
                <input type="month" value={form.competencia} onChange={set('competencia')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Origem</label>
                <input value={form.origem} onChange={set('origem')} className={inputCls} />
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
            <Detail label="Centro de receita" value={item.centroReceita || 'Outros'} />
            <Detail label="Vencimento" value={toBRDate(item.dataVencimento)} />
            <Detail label="Emissão" value={item.dataEmissao ? toBRDate(item.dataEmissao) : '—'} />
            <Detail label="Forma de recebimento" value={item.formaRecebimento || '—'} />
            <Detail label="Competência" value={item.competencia || '—'} />
            {item.clienteEmail && <Detail label="E-mail" value={item.clienteEmail} />}
            {item.origem && <Detail label="Origem" value={item.origem} />}
            {item.descricao && <Detail label="Descrição" value={item.descricao} wide />}
            {item.observacoes && <Detail label="Observações" value={item.observacoes} wide />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export default function NovoRecebimentoView({ user }: NovoRecebimentoViewProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [items, setItems] = useState<ContaReceberExtra[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContaReceberExtra | null>(null);

  const load = async () => {
    setLoadingList(true);
    try {
      const data = await getContasReceber(user);
      setItems((data || []) as ContaReceberExtra[]);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar recebimentos.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { load(); }, [user.id, user.tenantId]);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!form.clienteNome.trim()) return setError('Informe o nome do cliente.');
    if (!Number.isFinite(valor) || valor <= 0) return setError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setError('Informe a data de vencimento.');
    setError(''); setSaving(true);
    try {
      const created = await addContaReceber(user, {
        clienteNome: form.clienteNome.trim(), clienteEmail: form.clienteEmail.trim(), clienteDocumento: form.clienteDocumento.trim(),
        descricao: form.descricao.trim(), valor, dataEmissao: form.dataEmissao, dataVencimento: form.dataVencimento,
        status: form.dataVencimento < todayISO() ? 'vencido' : 'pendente',
        observacoes: form.observacoes.trim(), numeroNF: form.numeroNF.trim(), serieNF: form.serieNF.trim(),
        competencia: form.competencia, centroReceita: form.centroReceita, formaRecebimento: form.formaRecebimento, origem: form.origem.trim()
      } as any);
      setItems(prev => [created as ContaReceberExtra, ...prev]);
      setForm(EMPTY_FORM);
      setSuccess('Recebimento cadastrado com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta a receber.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (id: string, updates: Partial<ContaReceberExtra>) => {
    const updated = await updateContaReceber(id, updates as any);
    setItems(prev => prev.map(x => x.id === id ? (updated as ContaReceberExtra) : x));
    setSelectedItem(updated as ContaReceberExtra);
    setSuccess('Recebimento atualizado com sucesso.');
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const doDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    try {
      await deleteContaReceber(id);
      setItems(prev => prev.filter(x => x.id !== id));
      setSuccess('Recebimento excluído com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir.');
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-3" style={{ background: PRIMARY }}>
          <BanknoteArrowUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Novo Recebimento</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cadastre honorários, NFs, consultorias e receitas recorrentes.</p>
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
        <form onSubmit={handleSubmit} className="space-y-8">
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
                <input required value={form.clienteNome} onChange={set('clienteNome')} placeholder="Razão social ou nome" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">E-mail</label>
                <input type="email" value={form.clienteEmail} onChange={set('clienteEmail')} placeholder="cliente@email.com" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">CPF / CNPJ</label>
                <input value={form.clienteDocumento} onChange={set('clienteDocumento')} placeholder="000.000.000-00" className={inputCls} />
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
                <input value={form.descricao} onChange={set('descricao')} placeholder="Honorários contábeis, NF, etc." className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Valor *</label>
                <input required type="number" step="0.01" min="0.01" value={form.valor} onChange={set('valor')} placeholder="0,00" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Origem</label>
                <input value={form.origem} onChange={set('origem')} placeholder="Honorários, BPO, etc." className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Número NF</label>
                <input value={form.numeroNF} onChange={set('numeroNF')} placeholder="00001" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Série NF</label>
                <input value={form.serieNF} onChange={set('serieNF')} placeholder="A" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Centro de receita</label>
                <select value={form.centroReceita} onChange={set('centroReceita')} className={inputCls}>
                  {CENTROS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Forma de recebimento</label>
                <select value={form.formaRecebimento} onChange={set('formaRecebimento')} className={inputCls}>
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
                <input type="date" value={form.dataEmissao} onChange={set('dataEmissao')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Vencimento *</label>
                <input required type="date" value={form.dataVencimento} onChange={set('dataVencimento')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Competência</label>
                <input type="month" value={form.competencia} onChange={set('competencia')} className={inputCls} />
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
              value={form.observacoes}
              onChange={set('observacoes')}
              rows={4}
              placeholder="Notas internas, instruções para cobrança, etc."
              className={inputCls}
            />
          </section>

          {/* CTA footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setError(''); }} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 transition">
              Limpar
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
      </Card>

      {/* Lista de recebimentos já cadastrados */}
      <div className="pt-2">
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">Recebimentos cadastrados</h2>
        {loadingList ? (
          <Card className="flex items-center justify-center p-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ color: PRIMARY }} /> Carregando...
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">Nenhum recebimento cadastrado ainda.</Card>
        ) : (
          <div className="space-y-2.5">
            {items.map(item => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900 dark:text-white truncate">{item.clienteNome}</p>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.descricao || 'Sem descrição'} · Venc. {toBRDate(item.dataVencimento)}</p>
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
            ))}
          </div>
        )}
      </div>

      <DetalheModal item={selectedItem} onClose={() => setSelectedItem(null)} onSave={handleEditSave} onDelete={handleDelete} />

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Deseja excluir este recebimento?"
        onConfirm={doDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
