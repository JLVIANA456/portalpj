import React, { useState } from 'react';
import { AlertCircle, BanknoteArrowDown, CheckCircle2, Loader2, UploadCloud, X } from 'lucide-react';
import { PJUser } from '../types';
import { addContaPagar } from '../lib/db';

interface NovoLancamentoViewProps {
  user: PJUser;
  onSuccess: () => void;
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

const CATEGORIAS = [
  'Administrativo', 'Aluguel', 'Banco e Tarifas', 'Contabilidade', 'Energia',
  'Fornecedor', 'Impostos', 'Marketing', 'Materiais', 'Pró-labore',
  'Salários', 'Sistema / Software', 'Telefonia / Internet', 'Terceiros', 'Outros'
];

const CENTROS_CUSTO = [
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

const EMPTY_FORM: FormState = {
  fornecedor: '', categoria: 'Outros', descricao: '', valor: '',
  dataVencimento: todayISO(), observacoes: '', competencia: monthISO(),
  centroCusto: 'Administrativo', numeroDocumento: '', dataEmissao: todayISO(),
  formaPagamento: 'Boleto', status: 'aberto'
};

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#4F39F6] focus:ring-2 focus:ring-[#4F39F6]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

export default function NovoLancamentoView({ user, onSuccess }: NovoLancamentoViewProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      await addContaPagar(user, {
        fornecedor: form.fornecedor.trim(), categoria: form.categoria, descricao: form.descricao,
        valor, dataVencimento: form.dataVencimento, status, observacoes: form.observacoes,
        competencia: form.competencia, centroCusto: form.centroCusto,
        numeroDocumento: form.numeroDocumento, dataEmissao: form.dataEmissao,
        formaPagamento: form.formaPagamento
      });
      setForm(EMPTY_FORM);
      setSuccess('Conta a pagar adicionada com sucesso.');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta a pagar.');
    } finally {
      setSaving(false);
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
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Centro de custo</label>
                <select value={form.centroCusto} onChange={set('centroCusto')} className={inputCls}>
                  {CENTROS_CUSTO.map(c => <option key={c} value={c}>{c}</option>)}
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
    </div>
  );
}
