import React, { useState } from 'react';
import { AlertCircle, BanknoteArrowUp, CheckCircle2, X } from 'lucide-react';
import { PJUser } from '../types';
import { addContaReceber } from '../lib/db';

interface NovoRecebimentoViewProps {
  user: PJUser;
  onSuccess: () => void;
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

const PRIMARY = '#4F39F6';

const CENTROS_RECEITA = [
  'Contabilidade', 'Fiscal', 'Departamento Pessoal', 'BPO Financeiro',
  'Consultoria', 'IRPF', 'Legalização', 'Outros'
];

const FORMAS_RECEBIMENTO = ['PIX', 'Boleto', 'Transferência', 'Cartão', 'Dinheiro', 'OFX', 'Outros'];

const todayISO = () => new Date().toISOString().slice(0, 10);

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

export default function NovoRecebimentoView({ user, onSuccess }: NovoRecebimentoViewProps) {
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
    if (!form.clienteNome.trim()) return setError('Informe o nome do cliente.');
    if (!Number.isFinite(valor) || valor <= 0) return setError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setError('Informe a data de vencimento.');
    setError(''); setSaving(true);
    try {
      await addContaReceber(user, {
        clienteNome: form.clienteNome.trim(), clienteEmail: form.clienteEmail.trim(), clienteDocumento: form.clienteDocumento.trim(),
        descricao: form.descricao.trim(), valor, dataEmissao: form.dataEmissao, dataVencimento: form.dataVencimento,
        status: form.dataVencimento < todayISO() ? 'vencido' : 'pendente',
        observacoes: form.observacoes.trim(), numeroNF: form.numeroNF.trim(), serieNF: form.serieNF.trim(),
        competencia: form.competencia, centroReceita: form.centroReceita, formaRecebimento: form.formaRecebimento, origem: form.origem.trim()
      } as any);
      setForm(EMPTY_FORM);
      setSuccess('Recebimento cadastrado com sucesso.');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta a receber.');
    } finally {
      setSaving(false);
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
    </div>
  );
}
