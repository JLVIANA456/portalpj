/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PJUser, Invoice } from '../types';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Building,
  CalendarCheck
} from 'lucide-react';

interface DashboardViewProps {
  user: PJUser;
  invoices: Invoice[];
  onChangeTab: (tab: string) => void;
}

const ALL_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DashboardView({ user, invoices, onChangeTab }: DashboardViewProps) {
  const isAdmin = user.role === 'admin_tenant' || user.role === 'super_admin';

  const filteredInvoices = invoices.filter(inv => {
    if (user.role === 'pj' && inv.userId !== user.id) return false;
    if (user.role === 'admin_tenant' && inv.tenantId !== user.tenantId) return false;
    return true;
  });

  // 2. Otimização O(N): Único loop para calcular todas as estatísticas
  let totalApprovedCount = 0;
  let totalPendingCount = 0;
  let totalRejectedCount = 0;
  let totalAmountApproved = 0;
  let totalAmountPending = 0;
  let totalAmountCombined = 0;

  const monthlyStats: Record<string, { amount: number; count: number }> = {};

  filteredInvoices.forEach(inv => {
    totalAmountCombined += inv.amount;

    // Contagem e soma por status
    if (inv.status === 'aprovado') {
      totalApprovedCount++;
      totalAmountApproved += inv.amount;
    } else if (inv.status === 'pendente') {
      totalPendingCount++;
      totalAmountPending += inv.amount;
    } else if (inv.status === 'rejeitado') {
      totalRejectedCount++;
    }

    // Agrupamento mensal para o gráfico
    if (!monthlyStats[inv.competenciaMonth]) {
      monthlyStats[inv.competenciaMonth] = { amount: 0, count: 0 };
    }
    monthlyStats[inv.competenciaMonth].amount += inv.amount;
    monthlyStats[inv.competenciaMonth].count += 1;
  });

  const totalInvoicesCount = filteredInvoices.length;

  // 3. Ordenação correta para garantir que são os mais recentes
  const recentInvoices = [...filteredInvoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // 4. Mapeamento dinâmico dos meses com dados para o gráfico
  const monthlyData = ALL_MONTHS
    .map(month => ({
      month,
      amount: monthlyStats[month]?.amount || 0,
      count: monthlyStats[month]?.count || 0
    }))
    // Filtra para exibir apenas meses que possuem notas cadastradas
    // (remova o .filter se quiser exibir todos os 12 meses mesmo zerados)
    .filter(data => data.count > 0);

  const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1);

  // Formatador de moeda
  const formatValue = (num: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
            Olá, {user.ownerName}!
          </h2>
          <p className="text-indigo-200/80 text-sm mt-1 max-w-xl">
            {isAdmin
              ? 'Bem-vindo ao painel administrativo. Aqui você gerencia os envios de notas fiscais, analisa competências e autoriza pagamentos.'
              : `Bem-vindo ao seu portal. Envie suas notas para garantir o ciclo de fechamento.`}
          </p>
        </div>

        {!isAdmin && (
          <button
            onClick={() => onChangeTab('enviar_nota')}
            id="quick-upload-btn"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm rounded-xl text-white shadow-lg shadow-indigo-600/35 self-start md:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>Emitir/Enviar Nota</span>
          </button>
        )}
      </div>

      {/* Info Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Stats Card */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wider block">Notas Aprovadas</span>
            <h3 className="text-xl md:text-2xl font-bold font-sans text-slate-900 dark:text-slate-100 transition-colors ">{formatValue(totalAmountApproved)}</h3>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{totalApprovedCount} nota(s) prontas para pagamento</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Stats Card */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wider block">Notas em Análise</span>
            <h3 className="text-xl md:text-2xl font-bold font-sans text-slate-900 dark:text-slate-100 transition-colors ">{formatValue(totalAmountPending)}</h3>
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{totalPendingCount} pendente(s) de validação</span>
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Rejected Stats Card */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wider block">Recusadas / Retorno</span>
            <h3 className="text-xl md:text-2xl font-bold font-sans text-slate-900 dark:text-slate-100 transition-colors ">
              {totalRejectedCount} <span className="text-sm text-slate-400 dark:text-slate-500 transition-colors font-medium">arquivos</span>
            </h3>
            {totalRejectedCount > 0 ? (
              <span className="flex items-center gap-1 text-xs text-rose-600 font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Exige atenção ou reenvio</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 transition-colors ">Nenhuma nota rejeitada no momento</span>
            )}
          </div>
          <div className={`p-3 rounded-xl ${totalRejectedCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 dark:bg-slate-950 transition-colors text-slate-400 dark:text-slate-500 transition-colors '}`}>
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total stats */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wider block">Volume Total (Geral)</span>
            <h3 className="text-xl md:text-2xl font-bold font-sans text-slate-900 dark:text-slate-100 transition-colors ">{formatValue(totalAmountCombined)}</h3>
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
              <FileText className="w-3.5 h-3.5" />
              <span>Total de {totalInvoicesCount} notas submetidas no ano</span>
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Layout Block: Graphic & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Performance Charts Bar */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors ">Fechamentos Mensais</h3>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Faturamento / Mês</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors mb-6">Gráfico demonstrando faturamento acumulado por mês.</p>
          </div>

          <div className="space-y-4 pt-2">
            {monthlyData.length > 0 ? (
              monthlyData.map((data) => {
                const widthPct = maxAmount > 1 ? (data.amount / maxAmount) * 100 : 0;
                return (
                  <div key={data.month} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 transition-colors ">{data.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500 transition-colors font-medium">({data.count} notas)</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 transition-colors ">{formatValue(data.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 transition-colors rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-700 rounded-full transition-all duration-1000 hover:bg-indigo-600"
                        style={{ width: `${Math.max(widthPct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 transition-colors text-sm">
                Nenhum dado mensal disponível no momento.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
            <span>Exercício Fiscal Corrente</span>
            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 transition-colors ">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Atualizado em {new Date().toLocaleDateString('pt-BR')}</span>
            </span>
          </div>
        </div>

        {/* Process Tracker Timeline or Information Panel */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors mb-1">Status de Fechamento</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors mb-4">Etapas de recebimento de Notas Fiscais e pagamentos.</p>

            <div className="relative border-l-2 border-slate-200 dark:border-slate-700 transition-colors ml-3 pl-5 space-y-5 text-sm my-4">
              <div className="relative">
                <span className="absolute -left-[27px] top-1 px-1.5 bg-slate-100 dark:bg-slate-800 transition-colors text-indigo-600 ring-2 ring-white rounded-full font-bold text-[10px]">1</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 transition-colors ">Emissão da Nota</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">A nota fiscal é emitida através do portal e cadastrada com os dados corretos.</span>
              </div>
              <div className="relative animate-pulse">
                <span className="absolute -left-[27px] top-1 px-1.5 bg-amber-100 text-amber-700 ring-2 ring-white rounded-full font-bold text-[10px]">2</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 transition-colors ">Análise pelo Financeiro</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">Nossa equipe valida a nota fiscal, a competência, os dados bancários e o CNPJ informado.</span>
              </div>
              <div className="relative">
                <span className="absolute -left-[27px] top-1 px-1.5 bg-emerald-100 text-emerald-800 ring-2 ring-white rounded-full font-bold text-[10px]">3</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 transition-colors ">Aprovada para Pagamento</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">Status atualiza para aprovado. O pagamento é agendado e compensado na conta da empresa PJ.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors ">
            <button
              onClick={() => onChangeTab('historico')}
              id="view-all-history-btn"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 transition-colors hover:bg-slate-100 dark:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 transition-colors font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ver portfólio completo de notas</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-colors " />
            </button>
          </div>
        </div>
      </div>

      {/* Recent submissions block table */}
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors ">Atividades Recentes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">Últimas Notas Fiscais cadastradas no portal de controle.</p>
          </div>
          <button
            onClick={() => onChangeTab('historico')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Ver tudo
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 transition-colors text-sm">
            Nenhuma atividade cadastrada ainda. Use a opção de Enviar Nota para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 transition-colors text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors text-xs uppercase font-bold">
                  <th className="py-3 px-1">Número NF</th>
                  {isAdmin && <th className="py-3 px-2">Empresa</th>}
                  <th className="py-3 px-2">Competência</th>
                  <th className="py-3 px-2">Data de Envio</th>
                  <th className="py-3 px-2 text-right">Valor</th>
                  <th className="py-3 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => {
                  // Otimização: Instancia a data apenas uma vez por nota
                  const dateObj = new Date(inv.createdAt);

                  return (
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-1 font-mono text-xs font-bold text-indigo-600">{inv.invoiceNumber}</td>
                      {isAdmin && (
                        <td className="py-3.5 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 transition-colors text-xs truncate max-w-[200px]">{inv.companyName}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors font-mono">{inv.cnpj}</span>
                          </div>
                        </td>
                      )}
                      <td className="py-3.5 px-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors ">
                        {inv.competenciaMonth} / {inv.competenciaYear}
                      </td>
                      <td className="py-3.5 px-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
                        {dateObj.toLocaleDateString('pt-BR')} às {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-2 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors text-right">
                        {formatValue(inv.amount)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${inv.status === 'aprovado'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.status === 'rejeitado'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {inv.status === 'aprovado' && 'Aprovado'}
                          {inv.status === 'rejeitado' && 'Rejeitado'}
                          {inv.status === 'pendente' && 'Em Análise'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}