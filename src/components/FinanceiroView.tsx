import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  TrendingDown,
  TrendingUp,
  WalletCards
} from 'lucide-react';
import { PJUser } from '../types';
import ContasPagarView from './ContasPagarView';
import ContasReceberView from './ContasReceberView';
import { getContasPagar, getContasReceber } from '../lib/db';

// ─────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────

interface FinanceiroViewProps {
  user: PJUser;
}

type ActiveView = 'hub' | 'receber' | 'pagar';

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

const PRIMARY = '#4F39F6';

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export default function FinanceiroView({ user }: FinanceiroViewProps) {
  const [activeView, setActiveView] = useState<ActiveView>('hub');

  // Summary data loaded on hub
  const [receberItems, setReceberItems] = useState<any[]>([]);
  const [pagarItems, setPagarItems] = useState<any[]>([]);
  const [loadingHub, setLoadingHub] = useState(true);

  useEffect(() => {
    if (activeView !== 'hub') return;
    setLoadingHub(true);
    Promise.all([
      getContasReceber(user).catch(() => []),
      getContasPagar(user).catch(() => [])
    ]).then(([receber, pagar]) => {
      setReceberItems(receber || []);
      setPagarItems(pagar || []);
    }).finally(() => setLoadingHub(false));
  }, [user.id, user.tenantId, activeView]);

  // ── Derived summary — Receber ─────────────────────────
  const receberStats = useMemo(() => {
    const today = todayISO();
    const open = receberItems.filter(i => i.status !== 'recebido');
    const overdue = open.filter(i => i.dataVencimento < today);
    const received = receberItems.filter(i => i.status === 'recebido');
    return {
      openValue: open.reduce((s: number, i: any) => s + i.valor, 0),
      overdueValue: overdue.reduce((s: number, i: any) => s + i.valor, 0),
      overdueCount: overdue.length,
      receivedValue: received.reduce((s: number, i: any) => s + i.valor, 0),
      openCount: open.length
    };
  }, [receberItems]);

  // ── Derived summary — Pagar ───────────────────────────
  const pagarStats = useMemo(() => {
    const today = todayISO();
    const open = pagarItems.filter((i: any) => i.status !== 'pago');
    const overdue = open.filter((i: any) => (i.dataVencimento || '') < today);
    const paid = pagarItems.filter((i: any) => i.status === 'pago');
    const dueToday = open.filter((i: any) => i.dataVencimento === today);
    return {
      openValue: open.reduce((s: number, i: any) => s + i.valor, 0),
      overdueValue: overdue.reduce((s: number, i: any) => s + i.valor, 0),
      overdueCount: overdue.length,
      paidValue: paid.reduce((s: number, i: any) => s + i.valor, 0),
      dueTodayCount: dueToday.length,
      openCount: open.length
    };
  }, [pagarItems]);

  // ── Saldo projetado ───────────────────────────────────
  const saldoProjetado = receberStats.openValue - pagarStats.openValue;

  // ── Sub-views ─────────────────────────────────────────
  if (activeView === 'receber') {
    return (
      <div className="space-y-4">
        <BackBar label="Contas a Receber" onBack={() => setActiveView('hub')} />
        <ContasReceberView user={user} />
      </div>
    );
  }

  if (activeView === 'pagar') {
    return (
      <div className="space-y-4">
        <BackBar label="Contas a Pagar" onBack={() => setActiveView('hub')} />
        <ContasPagarView user={user} />
      </div>
    );
  }

  // ── Hub ───────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1440px] space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-3" style={{ background: PRIMARY }}>
          <CircleDollarSign className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Financeiro</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie entradas, saídas, conciliação OFX e fluxo de caixa projetado.
          </p>
        </div>
      </div>

      {/* ── Saldo consolidado ── */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #3B28D9 100%)` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">Saldo projetado em aberto</p>
        <p className={`mt-2 text-4xl font-black tracking-tight ${saldoProjetado >= 0 ? 'text-white' : 'text-rose-200'}`}>
          {loadingHub ? '—' : money(saldoProjetado)}
        </p>
        <p className="mt-1 text-sm opacity-60">
          Diferença entre o que há a receber e o que há a pagar (contas em aberto)
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="A receber" value={loadingHub ? '—' : money(receberStats.openValue)} icon={TrendingUp} />
          <MiniStat label="A pagar" value={loadingHub ? '—' : money(pagarStats.openValue)} icon={TrendingDown} />
          <MiniStat label="Recebido" value={loadingHub ? '—' : money(receberStats.receivedValue)} icon={CheckCircle2} />
          <MiniStat label="Pago" value={loadingHub ? '—' : money(pagarStats.paidValue)} icon={WalletCards} />
        </div>
      </div>

      {/* ── Alertas rápidos ── */}
      {!loadingHub && (receberStats.overdueCount > 0 || pagarStats.overdueCount > 0 || pagarStats.dueTodayCount > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {receberStats.overdueCount > 0 && (
            <AlertPill
              icon={AlertCircle}
              color="rose"
              label={`${receberStats.overdueCount} recebimento(s) vencido(s)`}
              value={money(receberStats.overdueValue)}
              onClick={() => setActiveView('receber')}
            />
          )}
          {pagarStats.overdueCount > 0 && (
            <AlertPill
              icon={AlertCircle}
              color="amber"
              label={`${pagarStats.overdueCount} pagamento(s) vencido(s)`}
              value={money(pagarStats.overdueValue)}
              onClick={() => setActiveView('pagar')}
            />
          )}
          {pagarStats.dueTodayCount > 0 && (
            <AlertPill
              icon={Clock3}
              color="blue"
              label={`${pagarStats.dueTodayCount} vence(m) hoje`}
              value=""
              onClick={() => setActiveView('pagar')}
            />
          )}
        </div>
      )}

      {/* ── Module cards ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Contas a Receber */}
        <ModuleCard
          icon={BanknoteArrowUp}
          title="Contas a Receber"
          description="Gerencie títulos, honorários e NFs emitidas. Envie cobranças, acompanhe inadimplência e concilie créditos pelo OFX."
          accentBg="#059669"
          loading={loadingHub}
          stats={[
            { label: 'Em aberto', value: money(receberStats.openValue), highlight: false },
            { label: 'Vencido', value: money(receberStats.overdueValue), highlight: receberStats.overdueCount > 0 },
            { label: 'Recebido', value: money(receberStats.receivedValue), highlight: false }
          ]}
          features={['Cobrança por e-mail', 'Conciliação OFX', 'Aging de inadimplência', 'Centro de receita']}
          onClick={() => setActiveView('receber')}
        />

        {/* Contas a Pagar */}
        <ModuleCard
          icon={BanknoteArrowDown}
          title="Contas a Pagar"
          description="Lance despesas, aprove pagamentos, programe saídas e concilie débitos pelo OFX. Controle por centro de custo e categoria."
          accentBg="#e11d48"
          loading={loadingHub}
          stats={[
            { label: 'Em aberto', value: money(pagarStats.openValue), highlight: false },
            { label: 'Vencido', value: money(pagarStats.overdueValue), highlight: pagarStats.overdueCount > 0 },
            { label: 'Pago', value: money(pagarStats.paidValue), highlight: false }
          ]}
          features={['Fluxo de aprovação', 'Conciliação OFX', 'Centro de custo', 'Exportar CSV']}
          onClick={() => setActiveView('pagar')}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao Financeiro
    </button>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 opacity-70" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">{label}</p>
      </div>
      <p className="text-base font-black">{value}</p>
    </div>
  );
}

function AlertPill({
  icon: Icon, color, label, value, onClick
}: {
  icon: React.ElementType;
  color: 'rose' | 'amber' | 'blue';
  label: string;
  value: string;
  onClick: () => void;
}) {
  const cls = {
    rose: 'bg-rose-50  border-rose-200  text-rose-700  dark:bg-rose-950/30  dark:border-rose-900  dark:text-rose-300',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
    blue: 'bg-blue-50  border-blue-200  text-blue-700  dark:bg-blue-950/30  dark:border-blue-900  dark:text-blue-300'
  }[color];

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition hover:opacity-80 ${cls}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {value && <span className="text-sm font-black">{value}</span>}
        <ChevronRight className="h-4 w-4 opacity-60" />
      </div>
    </button>
  );
}

interface ModuleCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  accentBg: string;
  loading: boolean;
  stats: { label: string; value: string; highlight: boolean }[];
  features: string[];
  onClick: () => void;
}

function ModuleCard({ icon: Icon, title, description, accentBg, loading, stats, features, onClick }: ModuleCardProps) {
  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer overflow-hidden dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Accent strip */}
      <div className="h-1 w-full" style={{ background: accentBg }} />

      <div className="flex flex-col flex-1 p-6 gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5" style={{ background: accentBg }}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
              <p className="text-sm text-slate-500 mt-0.5 leading-snug">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 group-hover:translate-x-1 transition-transform mt-1" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map(stat => (
            <div
              key={stat.label}
              className={`rounded-xl px-3 py-3 ${stat.highlight ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-slate-950'}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
              {loading ? (
                <div className="mt-1.5 h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              ) : (
                <p className={`mt-1 text-sm font-black leading-tight ${stat.highlight ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                  {stat.value}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mt-auto">
          {features.map(f => (
            <span
              key={f}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}