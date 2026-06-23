/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PJUser, Invoice, InvoiceStatus } from '../types';
import { updateInvoiceStatus, deleteInvoice } from '../lib/db';
import {
  Download,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Check,
  X,
  FileDown,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryViewProps {
  user: PJUser;
  invoices: Invoice[];
  onUpdateInvoice: () => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function HistoryView({ user, invoices, onUpdateInvoice }: HistoryViewProps) {
  const isAdmin = user.role === 'admin_tenant' || user.role === 'super_admin';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('todos');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Admin approval states
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Selected invoice modal for review
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // OTIMIZAÇÃO: useMemo impede que a filtragem rode a cada render (ex: ao digitar no modal)
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      // Role matching
      if (user.role === 'pj' && inv.userId !== user.id) return false;
      if (user.role === 'admin_tenant' && inv.tenantId !== user.tenantId) return false;

      // Search query matching
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        inv.invoiceNumber.toLowerCase().includes(searchLower) ||
        inv.companyName.toLowerCase().includes(searchLower) ||
        inv.cnpj.includes(searchTerm);

      // Status matching
      const matchesStatus = statusFilter === 'todos' || inv.status === statusFilter;

      // Month matching
      const matchesMonth = monthFilter === 'todos' || inv.competenciaMonth === monthFilter;

      // File Type matching simplificado
      let matchesFileType = true;
      if (fileTypeFilter !== 'todos') {
        const type = inv.fileType.toLowerCase();
        const name = inv.fileName.toLowerCase();

        const isPdf = type.includes('pdf');
        const isImage = type.includes('image');
        const isExcel = type.includes('spreadsheet') || type.includes('excel') || type.includes('sheet') ||
          name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');

        if (fileTypeFilter === 'pdf') matchesFileType = isPdf;
        else if (fileTypeFilter === 'excel') matchesFileType = isExcel;
        else if (fileTypeFilter === 'image') matchesFileType = isImage;
        else if (fileTypeFilter === 'other') matchesFileType = !isPdf && !isExcel && !isImage;
      }

      return matchesSearch && matchesStatus && matchesMonth && matchesFileType;
    });
  }, [invoices, isAdmin, user.id, searchTerm, statusFilter, monthFilter, fileTypeFilter]);

  const exportToCSV = (items: Invoice[]) => {
    if (items.length === 0) return;

    const headers = [
      'ID Nota', 'Numero NF', 'Razao Social PJ', 'CNPJ', 'Competencia',
      'Data Emissao', 'Valor (R$)', 'Nome do Arquivo', 'Formato Arquivo',
      'Status', 'Enviado Em', 'Observacoes'
    ];

    const rows = items.map(inv => [
      inv.id,
      inv.invoiceNumber,
      `"${inv.companyName.replace(/"/g, '""')}"`,
      inv.cnpj,
      `"${inv.competenciaMonth}/${inv.competenciaYear}"`,
      inv.issueDate,
      inv.amount.toFixed(2),
      `"${inv.fileName.replace(/"/g, '""')}"`,
      `"${inv.fileType}"`,
      inv.status,
      inv.createdAt,
      `"${(inv.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    // Create Blob with BOM for excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Exportacao_PortalPJ_${Date.now()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const type = fileType.toLowerCase();
    const name = fileName.toLowerCase();
    if (type.includes('pdf')) return FileText;
    if (type.includes('spreadsheet') || type.includes('excel') || name.endsWith('.csv') || name.endsWith('.xlsx')) return FileSpreadsheet;
    if (type.includes('image')) return ImageIcon;
    return FileText;
  };

  const handleDownload = (inv: Invoice) => {
    try {
      const link = document.createElement('a');
      link.href = inv.downloadUrl;
      link.download = inv.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar arquivo', err);
    }
  };

  const handleStatusUpdate = async (invId: string, status: InvoiceStatus, feedback?: string) => {
    const updated = await updateInvoiceStatus(invId, status, feedback);
    if (updated) {
      onUpdateInvoice();
      setFeedbackId(null);
      setFeedbackText('');
      // Update modal state instantly if it's the one being modified
      if (selectedInvoice && selectedInvoice.id === invId) {
        setSelectedInvoice({ ...selectedInvoice, status, feedback });
      }
    }
  };

  const handleDeleteAction = async (invId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta nota? Esta ação é irreversível.')) return;

    const success = await deleteInvoice(invId);
    if (success) {
      onUpdateInvoice();
      // Remove da seleção se estivesse selecionada
      setSelectedDocs(prev => prev.filter(id => id !== invId));
    } else {
      alert('Ocorreu um erro ao excluir a nota. Tente novamente.');
    }
  };

  const formatValue = (num: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  // CORREÇÃO: Lógica segura para o checkbox "Selecionar Todos"
  const isAllVisibleDocsSelected = filtered.length > 0 && filtered.every(inv => selectedDocs.includes(inv.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Adiciona os itens visíveis à seleção atual (usando Set para evitar IDs duplicados)
      const newSelection = new Set([...selectedDocs, ...filtered.map(i => i.id)]);
      setSelectedDocs(Array.from(newSelection));
    } else {
      // Remove da seleção atual apenas os itens que estão visíveis no filtro
      const filteredIds = filtered.map(i => i.id);
      setSelectedDocs(selectedDocs.filter(id => !filteredIds.includes(id)));
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 transition-colors tracking-tight">Histórico de Notas Fiscais</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">Monitoramento detalhado de comprovantes fiscais faturados por competência.</p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white dark:bg-slate-900 transition-colors p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="relative md:col-span-4 rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors " />
          </div>
          <input
            id="search-invoices"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? "Buscar por número, empresa ou CNPJ..." : "Buscar por número..."}
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="relative md:col-span-2">
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs cursor-pointer"
          >
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todos os Status</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="pendente">Pendente de Análise</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="aprovado">Aprovado</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="rejeitado">Rejeitado</option>
          </select>
        </div>

        {/* Month Filter */}
        <div className="relative md:col-span-2">
          <select
            id="filter-month-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs cursor-pointer"
          >
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todas as Competências</option>
            {MONTHS.map((m) => (
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* File Type Filter */}
        <div className="relative md:col-span-2">
          <select
            id="filter-file-type-select"
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs cursor-pointer"
          >
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="todos">Todos os Arquivos</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="pdf">Apenas PDF (.pdf)</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="excel">Apenas Planilha (xlsx/csv)</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="image">Apenas Imagens</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="other">Outros Formatos</option>
          </select>
        </div>

        {/* Counter Results */}
        <div className="md:col-span-2 text-center md:text-right">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 px-3 rounded-xl block">
            {filtered.length} Faturado(s)
          </span>
        </div>
      </div>

      {/* Main Table Row */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 transition-colors p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors space-y-2">
          <div className="mx-auto w-12 h-12 bg-slate-50 dark:bg-slate-950 transition-colors text-slate-400 dark:text-slate-500 transition-colors rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors ">Nenhuma nota encontrada</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 transition-colors ">Verifique os filtros de busca ou submeta uma nova nota no portal.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 transition-colors text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 transition-colors ">
                <tr>
                  <th className="py-3.5 px-4 text-left w-10">
                    <input
                      type="checkbox"
                      id="select-all-invoices"
                      checked={isAllVisibleDocsSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 text-left">Número NF</th>
                  {isAdmin && <th className="py-3.5 px-4">Empresa / CNPJ</th>}
                  <th className="py-3.5 px-4">Competência</th>
                  <th className="py-3.5 px-4">Arquivo Anexado</th>
                  <th className="py-3.5 px-4 text-right">Valor Líquido</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => {
                  const FileIcon = getFileIcon(inv.fileType, inv.fileName);
                  const isCurrentFeedbackOpen = feedbackId === inv.id;
                  const isSelected = selectedDocs.includes(inv.id);

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-indigo-50/35 dark:bg-indigo-900/30' : ''}`}>
                        {/* Checkbox */}
                        <td className="py-4 px-4 text-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocs([...selectedDocs, inv.id]);
                              } else {
                                setSelectedDocs(selectedDocs.filter(id => id !== inv.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        {/* Number */}
                        <td className="py-4 px-4 border-l border-transparent">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="font-bold text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>#{inv.invoiceNumber}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-300" />
                          </button>
                        </td>

                        {/* Company (Admin View) */}
                        {isAdmin && (
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100 transition-colors text-xs max-w-[180px] truncate">{inv.companyName}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors font-mono">{inv.cnpj}</span>
                            </div>
                          </td>
                        )}

                        {/* Month / Year */}
                        <td className="py-4 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors ">
                          {inv.competenciaMonth} / {inv.competenciaYear}
                        </td>

                        {/* File Anexed */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 max-w-[200px]" title={inv.fileName}>
                            <FileIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors truncate">{inv.fileName}</span>
                          </div>
                        </td>

                        {/* Financial net amount */}
                        <td className="py-4 px-4 text-right font-extrabold text-slate-950 text-xs">
                          {formatValue(inv.amount)}
                        </td>

                        {/* Status Marker Flag */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${inv.status === 'aprovado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'rejeitado'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            }`}>
                            {inv.status === 'aprovado' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {inv.status === 'rejeitado' && <XCircle className="w-3.5 h-3.5" />}
                            {inv.status === 'pendente' && <Clock className="w-3.5 h-3.5" />}

                            {inv.status === 'aprovado' && 'Aprovada'}
                            {inv.status === 'rejeitado' && 'Rejeitada'}
                            {inv.status === 'pendente' && 'Em Análise'}
                          </span>
                        </td>

                        {/* Actions Box */}
                        <td className="py-4 px-4 text-right space-x-1">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDownload(inv)}
                              title="Baixar Nota Emitida"
                              className="p-1.5 text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 dark:border-slate-700 transition-colors rounded-lg bg-white dark:bg-slate-900 transition-colors shadow-xs cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Admin decisions */}
                            {isAdmin && inv.status === 'pendente' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(inv.id, 'aprovado')}
                                  id={`approve-btn-${inv.id}`}
                                  title="Aprovar Nota Fiscal"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg bg-white dark:bg-slate-900 transition-colors shadow-xs cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setFeedbackId(inv.id);
                                    setFeedbackText('');
                                  }}
                                  id={`reject-btn-${inv.id}`}
                                  title="Rejeitar/Solicitar Correção"
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg bg-white dark:bg-slate-900 transition-colors shadow-xs cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* View feedback message if text exists */}
                            {(inv.feedback || inv.notes) && (
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                title="Ver Observações e Feedback"
                                className="p-1.5 text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 transition-colors rounded-lg bg-white dark:bg-slate-900 transition-colors shadow-xs cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Action */}
                            <button
                              onClick={() => handleDeleteAction(inv.id)}
                              title="Excluir Nota"
                              className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 dark:border-slate-700 transition-colors rounded-lg bg-white dark:bg-slate-900 transition-colors shadow-xs cursor-pointer ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expansible admin feedback text row */}
                      {isCurrentFeedbackOpen && (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="bg-rose-50/50 p-4">
                            <div className="max-w-2xl space-y-2">
                              <label className="block text-xs font-semibold uppercase tracking-wider text-rose-700">Explicação / Feedback para Rejeição de Nota</label>
                              <textarea
                                rows={2}
                                required
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Por favor, explique o motivo da rejeição para que a empresa possa corrigir (ex: Valor líquido incorreto do imposto municipal ou anexo corrompido)..."
                                className="block w-full p-2.5 border border-rose-200 rounded-xl bg-white dark:bg-slate-900 transition-colors text-sm text-slate-900 dark:text-slate-100 transition-colors focus:ring-rose-500 focus:border-rose-500"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setFeedbackId(null)}
                                  className="px-3 py-1.5 bg-white dark:bg-slate-900 transition-colors text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:bg-slate-800 transition-colors rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(inv.id, 'rejeitado', feedbackText)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold ml-1 cursor-pointer"
                                  disabled={!feedbackText.trim()}
                                >
                                  Confirmar Rejeição
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Detailed Modal Backdrop */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-2xl overflow-hidden max-w-xl w-full p-6 text-slate-900 dark:text-slate-100 transition-colors "
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 transition-colors pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Nota Fiscal #{selectedInvoice.invoiceNumber}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 transition-colors ">ID: {selectedInvoice.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 hover:bg-slate-100 dark:bg-slate-800 transition-colors rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-5 space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wide font-semibold text-[10px]">Empresa (PJ)</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 transition-colors text-sm block truncate">{selectedInvoice.companyName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wide font-semibold text-[10px]">CNPJ</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 transition-colors text-sm block font-mono">{selectedInvoice.cnpj}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wide font-semibold text-[10px]">Exercício Competência</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 transition-colors text-sm block">{selectedInvoice.competenciaMonth} / {selectedInvoice.competenciaYear}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wide font-semibold text-[10px]">Valor Bruto</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 transition-colors text-sm block">{formatValue(selectedInvoice.amount)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wide font-semibold text-[10px]">Data de Emissão</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 transition-colors block">{new Date(selectedInvoice.issueDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wide font-semibold text-[10px]">Enviado em</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 transition-colors block">
                      {new Date(selectedInvoice.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedInvoice.createdAt).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Optional description of PJ */}
                {selectedInvoice.notes && (
                  <div className="bg-slate-50 dark:bg-slate-950 transition-colors p-3 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors ">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors uppercase tracking-wider mb-1">Notas do Emitente (PJ):</span>
                    <p className="text-slate-700 dark:text-slate-300 transition-colors italic">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* Optional approval/rejection comments */}
                {selectedInvoice.feedback && (
                  <div className={`p-3 rounded-lg border ${selectedInvoice.status === 'rejeitado'
                      ? 'bg-rose-50 border-rose-100 text-rose-800'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    }`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                      {selectedInvoice.status === 'rejeitado' ? 'Motivo da Recusa (Financeiro):' : 'Mensagem do Validador:'}
                    </span>
                    <p className="font-medium italic">{selectedInvoice.feedback}</p>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-950 transition-colors p-3 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-700 transition-colors ">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors " />
                    <div>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300 transition-colors truncate max-w-[240px]">{selectedInvoice.fileName}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors font-mono">Formato do arquivo anexado</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(selectedInvoice)}
                    className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors flex justify-end gap-2 text-xs">
                {isAdmin && selectedInvoice.status === 'pendente' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedInvoice.id, 'aprovado');
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Aprovar Nota
                    </button>
                    <button
                      onClick={() => {
                        setFeedbackId(selectedInvoice.id);
                        setFeedbackText('');
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Recusar Nota
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:bg-slate-950 transition-colors text-slate-700 dark:text-slate-300 transition-colors font-semibold rounded-xl cursor-pointer"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk action floating card */}
      <AnimatePresence>
        {selectedDocs.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 50, opacity: 0, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-40 w-[92%] max-w-2xl bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 font-extrabold text-xs px-2.5 py-1.5 rounded-full text-white min-w-[24px] text-center">
                {selectedDocs.length}
              </span>
              <div>
                <p className="text-xs font-bold font-sans">Notas selecionadas</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors ">Pronto para download ou exportação em massa de CSV.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setSelectedDocs([])}
                className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 transition-colors hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Limpar seleção
              </button>

              <button
                onClick={() => {
                  const itemsToDownload = invoices.filter(inv => selectedDocs.includes(inv.id));
                  itemsToDownload.forEach((inv, index) => {
                    setTimeout(() => {
                      handleDownload(inv);
                    }, index * 250);
                  });
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Todas</span>
              </button>

              <button
                onClick={() => {
                  const itemsToExport = invoices.filter(inv => selectedDocs.includes(inv.id));
                  exportToCSV(itemsToExport);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
