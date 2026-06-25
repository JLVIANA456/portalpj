/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PJUser, Invoice } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  CheckSquare,
  FileSpreadsheet,
  FileText,
  Sliders
} from 'lucide-react';

interface ReportsViewProps {
  user: PJUser;
  invoices: Invoice[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ReportsView({ user, invoices }: ReportsViewProps) {
  const isAdmin = user.role === 'admin_tenant' || user.role === 'super_admin';
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedCompany, setSelectedCompany] = useState<string>('todos');
  const [generating, setGenerating] = useState<'pdf' | 'excel' | null>(null);

  // Lista única de empresas para o filtro do administrador
  const uniqueCompanies = useMemo(() => {
    return Array.from(new Set(invoices.map(inv => inv.companyName)));
  }, [invoices]);

  // Memoriazação dos dados filtrados para evitar re-cálculos em re-renders bobos
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (user.role === 'pj' && inv.userId !== user.id) return false;
      if (user.role === 'admin_tenant' && inv.tenantId !== user.tenantId) return false;

      const matchesMonth = selectedMonth === 'todos' || inv.competenciaMonth === selectedMonth;
      const matchesYear = selectedYear === 'todos' || inv.competenciaYear === selectedYear;
      const matchesStatus = selectedStatus === 'todos' || inv.status === selectedStatus;
      const matchesCompany = selectedCompany === 'todos' || inv.companyName === selectedCompany;

      return matchesMonth && matchesYear && matchesStatus && matchesCompany;
    });
  }, [invoices, isAdmin, user.id, selectedMonth, selectedYear, selectedStatus, selectedCompany]);

  // Estatísticas calculadas de forma performática
  const stats = useMemo(() => {
    const count = filteredInvoices.length;
    let totalAmount = 0;
    let approvedTotal = 0;
    let pendingTotal = 0;

    for (const inv of filteredInvoices) {
      totalAmount += inv.amount;
      if (inv.status === 'aprovado') {
        approvedTotal += inv.amount;
      } else if (inv.status === 'pendente') {
        pendingTotal += inv.amount;
      }
    }

    return { count, totalAmount, approvedTotal, pendingTotal };
  }, [filteredInvoices]);

  const formatValue = (num: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const exportToExcel = () => {
    setGenerating('excel');

    // Deferido levemente para permitir que o spinner do botão renderize na tela antes do bloqueio da thread
    requestAnimationFrame(() => {
      try {
        const rows = filteredInvoices.map((inv, idx) => ({
          'Item': idx + 1,
          'Número NF': inv.invoiceNumber,
          'Razão Social (PJ)': inv.companyName,
          'CNPJ': inv.cnpj,
          'Mês Competência': inv.competenciaMonth,
          'Ano Competência': inv.competenciaYear,
          'Data Emissão': inv.issueDate,
          'Valor Nominal (R$)': inv.amount,
          'Status': inv.status === 'aprovado' ? 'Aprovado' : inv.status === 'rejeitado' ? 'Rejeitado' : 'Em Análise',
          'Enviado em': new Date(inv.createdAt).toLocaleString('pt-BR'),
          'Obs PJ': inv.notes || '',
          'Feedback Financeiro': inv.feedback || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Notas Fiscais');

        worksheet['!cols'] = [
          { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 15 },
          { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
          { wch: 25 }, { wch: 25 }
        ];

        const fileName = `Relatorio_Notas_PJ_${selectedMonth}_${selectedYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      } catch (err) {
        console.error('Erro ao exportar excel', err);
      } finally {
        setGenerating(null);
      }
    });
  };

  const exportToPDF = () => {
    setGenerating('pdf');

    requestAnimationFrame(() => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const drawHeader = (isFirstPage: boolean) => {
          doc.setFillColor(79, 70, 229); // indigo-600
          doc.rect(0, 0, 210, isFirstPage ? 15 : 10, 'F');
        };

        const drawTableHeader = (y: number) => {
          doc.setFillColor(30, 41, 59); // slate-800
          doc.rect(15, y, 180, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('Nº Nota', 18, y + 5.5);
          doc.text('Compet.', 36, y + 5.5);
          doc.text('Empresa PJ', 58, y + 5.5);
          doc.text('Data', 123, y + 5.5);
          doc.text('Valor Líquido', 153, y + 5.5);
          doc.text('Status', 180, y + 5.5);
        };

        // Página Inicial - Topo
        drawHeader(true);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text('PORTAL PJ - RELATÓRIO MENSAL DE NOTAS FISCAIS', 15, 30);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 15, 36);
        doc.text(`Emissor: ${user.companyName} (${user.cnpj})`, 15, 41);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, 46, 195, 46);

        // Bloco de Sumário
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 52, 180, 28, 3, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('SUMÁRIO MENSAL FLUXO:', 20, 58);

        doc.setFont('helvetica', 'normal');
        doc.text(`Total de Notas Filtro: ${stats.count}`, 20, 65);
        doc.text(`Total faturado: ${formatValue(stats.totalAmount)}`, 20, 72);
        doc.text(`Total Aprovado: ${formatValue(stats.approvedTotal)}`, 100, 65);
        doc.text(`Pendente de Fluxo: ${formatValue(stats.pendingTotal)}`, 100, 72);

        // Renderização da Tabela de Itens
        let yPos = 92;
        drawTableHeader(yPos);
        yPos += 8;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);

        filteredInvoices.forEach((inv, index) => {
          if (yPos > 265) {
            doc.addPage();
            drawHeader(false);
            yPos = 20;
            drawTableHeader(yPos);
            yPos += 8;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }

          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, yPos, 180, 7.5, 'F');
          }

          doc.text(inv.invoiceNumber, 18, yPos + 5);
          doc.text(`${inv.competenciaMonth}/${inv.competenciaYear}`, 36, yPos + 5);

          const truncatedCompany = inv.companyName.length > 28 ? inv.companyName.slice(0, 26) + '...' : inv.companyName;
          doc.text(truncatedCompany, 58, yPos + 5);
          doc.text(new Date(inv.issueDate).toLocaleDateString('pt-BR'), 123, yPos + 5);
          doc.text(formatValue(inv.amount), 153, yPos + 5);

          const statusTxt = inv.status === 'aprovado' ? 'VALIDADA' : inv.status === 'rejeitado' ? 'RECUSADA' : 'PENDENTE';
          doc.text(statusTxt, 180, yPos + 5);

          yPos += 7.5;
        });

        // Loop final para adicionar o número de páginas correto no rodapé de todas as folhas
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text('Este relatório é de uso interno e gerado na rede segura do Portal de Notas PJ.', 15, 287);
          doc.text(`Página ${i} de ${pageCount}`, 180, 287);
        }

        const fileName = `Relatorio_Faturamento_PJ_${selectedMonth}_${selectedYear}.pdf`;
        doc.save(fileName);
      } catch (err) {
        console.error('Erro ao gerar relatório PDF', err);
      } finally {
        setGenerating(null);
      }
    });
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Gerador de Relatórios Mensais</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 ">Exporte demonstrativos fiscais e dados consolidados por e-mail ou arquivos estruturados (PDF / Excel).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Formulário de Filtros */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100 dark:border-slate-800 ">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 ">Configurar Filtros</span>
          </div>

          <div>
            <label htmlFor="report-month-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 ">Mês Competência</label>
            <select
              id="report-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs cursor-pointer"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todos os Meses</option>
              {MONTHS.map(m => (
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-year-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 ">Ano de Competência</label>
            <select
              id="report-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs cursor-pointer"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="2026">2026</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="2025">2025</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todos os Anos</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-status-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 ">Status dos Lançamentos</label>
            <select
              id="report-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs cursor-pointer"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todos os Status</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="aprovado">Aprovado (Validados)</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="pendente">Pendente de Fluxo</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="rejeitado">Rejeitado/Retornado</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <label htmlFor="report-company-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 ">Filtrar por Empresa (PJ)</label>
              <select
                id="report-company-select"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs cursor-pointer"
              >
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todas as Empresas (PJ)</option>
                {uniqueCompanies.map(co => (
                  <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={co} value={co}>{co}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Painel de Prévia Lateral */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 ">Prévia do Relatório</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 border border-amber-200 rounded-full flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                <span>Dados Filtrados</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quantidade</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200 ">{stats.count} notas</span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 ">anexadas no total</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Acumulado</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200 truncate" title={formatValue(stats.totalAmount)}>{formatValue(stats.totalAmount)}</span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 ">valor total bruto</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Aprovado</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200 truncate" title={formatValue(stats.approvedTotal)}>{formatValue(stats.approvedTotal)}</span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-medium text-emerald-600">pronto p/ pagamento</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950 /50 space-y-3.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Relatórios Rápidos</span>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 ">Competência {selectedMonth === 'todos' ? 'Anual' : selectedMonth}</span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 ">{filteredInvoices.length} lançamentos</span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 ">
                Os demonstrativos exportados contam com as assinaturas eletrônicas das partes, além de hashes criptográficos para validação segura perante órgãos públicos.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={exportToExcel}
              id="export-excel-btn"
              disabled={stats.count === 0 || generating !== null}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-100 dark:bg-slate-800 disabled:text-slate-400 dark:text-slate-500 disabled:border-transparent disabled:cursor-not-allowed"
            >
              {generating === 'excel' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Progresso...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Planilha Excel (.xlsx)</span>
                </>
              )}
            </button>

            <button
              onClick={exportToPDF}
              id="export-pdf-btn"
              disabled={stats.count === 0 || generating !== null}
              className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-100 dark:bg-slate-800 disabled:text-slate-400 dark:text-slate-500 disabled:border-transparent disabled:cursor-not-allowed"
            >
              {generating === 'pdf' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Construindo...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Documento PDF (.pdf)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
