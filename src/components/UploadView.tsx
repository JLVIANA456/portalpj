/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { PJUser } from '../types';
import { addInvoice, getSupabaseConfig } from '../lib/db';
import { supabase } from '../lib/supabase';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  DollarSign,
  Calendar,
  Hash,
  Trash2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadViewProps {
  user: PJUser;
  onUploadSuccess: () => void;
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'xml', 'xlsx', 'csv'];

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/xml',
  'application/xml',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const normalizeAmount = (value: string) => {
  const normalized = value
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalized);
};

const getFileExtension = (fileName: string) => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

export default function UploadView({ user, onUploadSuccess }: UploadViewProps) {
  const today = useMemo(() => new Date(), []);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState(today.toISOString().split('T')[0]);
  const [competenciaMonth, setCompetenciaMonth] = useState(MONTHS[today.getMonth()]);
  const [competenciaYear, setCompetenciaYear] = useState(String(today.getFullYear()));
  const [notes, setNotes] = useState('');

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    base64Url: string;
    rawFile: File;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableYears = useMemo(() => {
    const currentYear = today.getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1].map(String);
  }, [today]);

  const validateFile = (file: File) => {
    const extension = getFileExtension(file.name);
    const mimeType = file.type;

    if (file.size > MAX_FILE_SIZE) {
      return 'O arquivo excede o limite máximo de 10MB.';
    }

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return 'Formato inválido. Envie PDF, imagem, XML, CSV ou XLSX.';
    }

    if (mimeType && !ACCEPTED_MIME_TYPES.includes(mimeType)) {
      return 'Tipo de arquivo inválido. Envie PDF, imagem, XML, CSV ou XLSX.';
    }

    return '';
  };

  const processFile = (file: File) => {
    setError('');

    const validationError = validateFile(file);

    if (validationError) {
      setUploadedFile(null);
      setError(validationError);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        base64Url: reader.result as string,
        rawFile: file
      });
    };

    reader.onerror = () => {
      setUploadedFile(null);
      setError('Erro ao ler arquivo. Tente novamente.');
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
      return;
    }

    if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      processFile(file);
    }

    e.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setError('');
  };

  const getFileIcon = (fileType: string, fileName?: string) => {
    const extension = fileName ? getFileExtension(fileName) : '';

    if (fileType.includes('pdf') || extension === 'pdf') return FileText;
    if (
      fileType.includes('spreadsheet') ||
      fileType.includes('excel') ||
      fileType.includes('csv') ||
      extension === 'xlsx' ||
      extension === 'csv'
    ) {
      return FileSpreadsheet;
    }
    if (
      fileType.includes('xml') ||
      fileType.includes('json') ||
      fileType.includes('markup') ||
      extension === 'xml'
    ) {
      return FileCode;
    }
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png'].includes(extension)) {
      return ImageIcon;
    }

    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const resetForm = () => {
    setInvoiceNumber('');
    setAmount('');
    setIssueDate(today.toISOString().split('T')[0]);
    setCompetenciaMonth(MONTHS[today.getMonth()]);
    setCompetenciaYear(String(today.getFullYear()));
    setNotes('');
    setUploadedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!uploadedFile) {
      setError('Por favor, faça o upload de um arquivo de nota fiscal.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setError('Informe o número da nota fiscal.');
      return;
    }

    const parsedAmount = normalizeAmount(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, insira um valor válido maior que zero.');
      return;
    }

    setLoading(true);

    try {
      let publicUrl = uploadedFile.base64Url;
      const config = getSupabaseConfig();

      if (config.useMockDatabase) {
        publicUrl = 'mock_url_placeholder_to_save_storage';
      }

      if (!config.useMockDatabase && uploadedFile.rawFile) {
        const fileExt = getFileExtension(uploadedFile.rawFile.name);
        const uniqueFileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('notas_fiscais')
          .upload(uniqueFileName, uploadedFile.rawFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload do anexo:', uploadError);
          throw new Error('Falha ao enviar arquivo para o bucket.');
        }

        const { data: urlData } = supabase.storage
          .from('notas_fiscais')
          .getPublicUrl(uniqueFileName);

        publicUrl = urlData.publicUrl;
      }

      await addInvoice({
        tenantId: user.tenantId || 'tenant-1',
        userId: user.id,
        companyName: user.companyName,
        cnpj: user.cnpj,
        invoiceNumber: invoiceNumber.trim(),
        issueDate,
        competenciaMonth,
        competenciaYear,
        amount: parsedAmount,
        fileName: uploadedFile.name,
        fileType: uploadedFile.type,
        fileSize: uploadedFile.size,
        downloadUrl: publicUrl,
        status: 'pendente',
        notes: notes.trim()
      });

      setSuccess(true);
      resetForm();
    } catch (err) {
      console.error('Erro ao enviar nota fiscal:', err);
      setError('Erro ao enviar nota fiscal. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const CurrentFileIcon = uploadedFile
    ? getFileIcon(uploadedFile.type, uploadedFile.name)
    : FileText;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Enviar Nova Nota Fiscal
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Realize a submissão dos comprovantes fiscais eletrônicos emitidos referente à prestação de serviços da sua empresa.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl shadow-xl p-8 text-center space-y-4"
            key="success-card"
          >
            <div className="mx-auto h-16 w-16 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Nota Enviada com Sucesso!
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Seu arquivo foi anexado e as informações foram registradas no banco de dados.
              Nossa equipe administrativa analisará a nota fiscal para agendar o pagamento.
            </p>

            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm rounded-xl text-white shadow-md cursor-pointer"
              >
                Enviar nova nota
              </button>

              <button
                type="button"
                onClick={onUploadSuccess}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-sm rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Ver minhas notas
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            onDragEnter={handleDrag}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
            key="upload-form"
          >
            {error && (
              <div
                id="upload-error"
                className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 p-4 rounded-r-xl flex gap-3 text-rose-700 dark:text-rose-300 text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Arquivo da Nota Fiscal
              </label>

              {!uploadedFile ? (
                <div
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[180px] ${dragActive
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    accept=".pdf,.jpg,.jpeg,.png,.xml,.xlsx,.csv,image/jpeg,image/png,application/pdf,text/xml,application/xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  />

                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950 rounded-full text-indigo-600 mb-3">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Clique para anexar ou arraste o arquivo aqui
                  </p>

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Formatos aceitos: PDF, imagens, planilhas ou XML. Máximo de 10MB.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-indigo-600 shadow-sm">
                      <CurrentFileIcon className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-950 dark:text-slate-100 truncate max-w-[280px] sm:max-w-md">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(uploadedFile.size)} • {uploadedFile.type || 'Tipo desconhecido'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeUploadedFile}
                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    aria-label="Remover arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="invoice-number-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Número da Nota Fiscal
                </label>

                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Hash className="w-4 h-4 text-slate-400" />
                  </div>

                  <input
                    id="invoice-number-input"
                    type="text"
                    required
                    placeholder="Ex: 2026102"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="amount-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Valor da Nota (R$)
                </label>

                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>

                  <input
                    id="amount-input"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="issue-date-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Data de Emissão da Nota
                </label>

                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>

                  <input
                    id="issue-date-input"
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="competencia-month-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Mês de Competência
                  </label>

                  <select
                    id="competencia-month-select"
                    value={competenciaMonth}
                    onChange={(e) => setCompetenciaMonth(e.target.value)}
                    className="mt-1 block w-full py-2.5 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                  >
                    {MONTHS.map((month) => (
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="competencia-year-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Ano de Competência
                  </label>

                  <select
                    id="competencia-year-select"
                    value={competenciaYear}
                    onChange={(e) => setCompetenciaYear(e.target.value)}
                    className="mt-1 block w-full py-2.5 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                  >
                    {availableYears.map((year) => (
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="notes-textarea"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Observações adicionais para o Financeiro (Opcional)
              </label>

              <textarea
                id="notes-textarea"
                rows={3}
                placeholder="Exemplo: Valor referente ao projeto Beta ou detalhamento de horas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onUploadSuccess}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="upload-invoice-btn"
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Carregando arquivo...</span>
                  </>
                ) : (
                  <span>Enviar Nota para Análise</span>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}