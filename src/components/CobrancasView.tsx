import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  User,
  Search,
  Calendar,
  X,
  FileText,
  Loader2,
  Link,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PJUser, Client } from '../types';
import { getClients } from '../lib/db';
import { ResendService, uploadEmailDocument } from '../lib/resend';
import { useToast } from '../lib/toast';

interface CobrancasViewProps {
  user: PJUser;
}

interface Cobranca {
  id: string;
  clientId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'sent' | 'paid';
  description: string;
}

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function textToHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}



export default function CobrancasView({ user }: CobrancasViewProps) {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  // Documento com botão "Acesse aqui o documento" no corpo do e-mail
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const storageKey = `portal_pj_cobrancas_${user.tenantId ?? 'default'}`;

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const loadedClients = getClients(user.tenantId);
    setClients(loadedClients);

    const saved = localStorage.getItem(storageKey);
    setCobrancas(saved ? JSON.parse(saved) : []);
  }, [user.tenantId, storageKey]);

  const handleSaveCobrancas = (newCobrancas: Cobranca[]) => {
    setCobrancas(newCobrancas);
    localStorage.setItem(storageKey, JSON.stringify(newCobrancas));
  };

  const resetAddForm = () => {
    setSelectedClient('');
    setAmount('');
    setDueDate('');
    setDescription('');
  };

  const resetSendForm = () => {
    setSelectedReminderId(null);
    setEmailSubject('');
    setEmailBody('');
    setIsSendingEmail(false);
    setDocumentFile(null);
    setDocumentUrl(null);
    setIsUploadingDoc(false);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente Removido';
  const getClientById = (id: string) => clients.find(c => c.id === id);

  const buildDefaultEmailBody = (cobranca: Cobranca, client: Client) => {
    const amountFormatado = moneyFormatter.format(cobranca.amount);
    const dueDateFormatada = new Date(cobranca.dueDate).toLocaleDateString('pt-BR');

    return `Olá ${client.name},

Gostaríamos de lembrar que há uma cobrança pendente referente aos serviços prestados.

Descrição: ${cobranca.description || 'Cobrança avulsa'}
Valor: ${amountFormatado}
Vencimento: ${dueDateFormatada}

Por gentileza, pedimos a programação do pagamento até a data informada.

Caso o pagamento já tenha sido realizado, pedimos a gentileza de desconsiderar esta mensagem e, se possível, encaminhar o respectivo comprovante para conferência e baixa em nossos controles.

Qualquer dúvida, estamos à disposição.

Atenciosamente,
DigAI`;
  };

  const buildEmailHtml = (customBody: string, docUrl?: string | null) => {
    const documentButtonHtml = docUrl
      ? `
        <div style="text-align:center;margin:30px 0;">
          <a href="${docUrl}" target="_blank"
            style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.01em;">
            📄 Acesse aqui o documento
          </a>
        </div>
      `
      : '';

    return `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 30px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 35px;">
          <h1 style="color: #1a1a1a; font-size: 26px; font-weight: 300; margin: 0; letter-spacing: -0.02em;">
            Lembrete de <span style="color: #4f46e5; font-weight: 800;">Cobrança</span>
          </h1>
          <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px;">
            Comunicado Importante
          </p>
        </div>

        <div style="line-height: 1.6; color: #475569; font-size: 15px; margin-bottom: 35px;">
          ${textToHtml(customBody)}
        </div>

        ${documentButtonHtml}

        <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 15px; text-align: center; border: 1px dashed #e2e8f0;">
          <p style="font-size: 13px; color: #64748b; margin: 0;">
            ⚠️ <strong>Atenção:</strong> Por favor, certifique-se de realizar o pagamento até o vencimento para evitar juros por atraso.
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 40px 0;">

        <div style="text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
            Este é um comunicado oficial enviado por<br>
            <strong style="color: #1e293b; font-size: 14px;">DigAI</strong>.
          </p>
        </div>
      </div>
    `;
  };

  const handleAddCobranca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !amount || !dueDate) return;

    const newCobranca: Cobranca = {
      id: Date.now().toString(),
      clientId: selectedClient,
      amount: Number(amount),
      dueDate: new Date(dueDate).toISOString(),
      status: 'pending',
      description
    };

    handleSaveCobrancas([newCobranca, ...cobrancas]);
    setIsAddModalOpen(false);
    resetAddForm();
  };

  const handleOpenReminderModal = (id: string) => {
    const cobranca = cobrancas.find(c => c.id === id);
    if (!cobranca) return;

    const client = getClientById(cobranca.clientId);
    if (!client || !client.email) {
      alert('Cliente não encontrado ou sem e-mail cadastrado.');
      return;
    }

    setSelectedReminderId(id);
    setEmailSubject(`Lembrete de Pagamento Pendente - ${cobranca.description || 'Cobrança Avulsa'}`);
    setEmailBody(buildDefaultEmailBody(cobranca, client));
    setIsSendModalOpen(true);
  };

  const handleCloseSendModal = () => {
    if (isSendingEmail) return;

    setIsSendModalOpen(false);
    resetSendForm();
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReminderId || !emailSubject.trim() || !emailBody.trim()) return;

    const cobranca = cobrancas.find(c => c.id === selectedReminderId);
    if (!cobranca) return;

    const client = getClientById(cobranca.clientId);
    if (!client || !client.email) {
      alert('Cliente não encontrado ou sem e-mail cadastrado.');
      return;
    }

    try {
      setIsSendingEmail(true);

      // Se houver documento selecionado, faz upload e obtém URL pública
      let resolvedDocUrl: string | null = documentUrl;
      if (documentFile && !documentUrl) {
        setIsUploadingDoc(true);
        resolvedDocUrl = await uploadEmailDocument(documentFile, user.tenantId ?? 'default');
        setDocumentUrl(resolvedDocUrl);
        setIsUploadingDoc(false);
      }

      await ResendService.sendEmail({
        to: client.email,
        subject: emailSubject.trim(),
        html: buildEmailHtml(emailBody.trim(), resolvedDocUrl)
      });

      handleSaveCobrancas(cobrancas.map(c =>
        c.id === selectedReminderId ? { ...c, status: 'sent' } : c
      ));

      setIsSendModalOpen(false);
      resetSendForm();
      toast.success('E-mail enviado!', 'Lembrete de cobrança enviado com sucesso.');
    } catch (error: any) {
      toast.error('Erro ao enviar', error?.message || 'Erro desconhecido.');
      setIsSendingEmail(false);
    }
  };

  const handleMarkAsPaid = (id: string) => {
    handleSaveCobrancas(cobrancas.map(c =>
      c.id === id ? { ...c, status: 'paid' } : c
    ));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir esta cobrança?')) {
      handleSaveCobrancas(cobrancas.filter(c => c.id !== id));
    }
  };

  const filteredCobrancas = cobrancas.filter(c => {
    const clientName = getClientName(c.clientId).toLowerCase();
    return clientName.includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedReminderCobranca = selectedReminderId
    ? cobrancas.find(c => c.id === selectedReminderId)
    : null;

  const selectedReminderClient = selectedReminderCobranca
    ? getClientById(selectedReminderCobranca.clientId)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" />
            Cobranças e Lembretes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie cobranças pendentes e envie lembretes por e-mail.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Cobrança
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cobranças..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white"
          />
        </div>
      </div>

      {/* Cobrancas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredCobrancas.map((cobranca) => (
            <motion.div
              key={cobranca.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(cobranca.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                  title="Excluir cobrança"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${cobranca.status === 'paid'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : cobranca.status === 'sent'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {cobranca.status === 'paid' ? 'Pago' : cobranca.status === 'sent' ? 'Enviado' : 'Pendente'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  {moneyFormatter.format(cobranca.amount)}
                </h3>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <User className="w-4 h-4" />
                  <span className="truncate">{getClientName(cobranca.clientId)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Vence em: {new Date(cobranca.dueDate).toLocaleDateString('pt-BR')}</span>
                </div>
                {cobranca.description && (
                  <p className="text-sm text-slate-500 truncate mt-2">{cobranca.description}</p>
                )}
              </div>

              <div className="flex gap-2">
                {cobranca.status !== 'paid' && (
                  <>
                    <button
                      onClick={() => handleOpenReminderModal(cobranca.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Enviar E-mail
                    </button>
                    <button
                      onClick={() => handleMarkAsPaid(cobranca.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Pago
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Nova Cobrança */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <form onSubmit={handleAddCobranca}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nova Cobrança</h2>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Cliente</label>
                    <select
                      required
                      value={selectedClient}
                      onChange={e => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Vencimento</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Descrição (Opcional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl"
                  >
                    Salvar Cobrança
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Enviar Lembrete */}
      <AnimatePresence>
        {isSendModalOpen && selectedReminderCobranca && selectedReminderClient && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseSendModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <form onSubmit={handleSendReminder}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enviar lembrete por e-mail</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Revise o texto, altere se necessário e anexe arquivos antes de enviar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseSendModal}
                    disabled={isSendingEmail}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedReminderClient.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedReminderClient.email}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Valor</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{moneyFormatter.format(selectedReminderCobranca.amount)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Assunto do e-mail</label>
                    <input
                      type="text"
                      required
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Texto que será enviado ao cliente</label>
                    <textarea
                      required
                      rows={12}
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      O texto acima será aplicado dentro do layout visual do e-mail.
                    </p>
                  </div>

                  {/* Documento com botão no e-mail */}
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-200 flex items-center gap-2">
                      <Link className="w-4 h-4 text-indigo-500" />
                      Documento com botão no e-mail
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      O cliente verá um botão <strong>"Acesse aqui o documento"</strong> dentro do e-mail que abre o arquivo no navegador.
                    </p>

                    {!documentFile ? (
                      <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-indigo-50 dark:bg-indigo-950/30 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                        <UploadCloud className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">
                          Selecionar documento (PDF, imagem...)
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0] ?? null;
                            setDocumentFile(f);
                            setDocumentUrl(null);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 truncate">{documentFile.name}</p>
                            <p className="text-xs text-indigo-400">{(documentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        {documentUrl ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">✓ Pronto</span>
                        ) : isUploadingDoc ? (
                          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                        ) : (
                          <span className="text-xs text-indigo-500 shrink-0">Será enviado ao clicar em Enviar</span>
                        )}
                        <button
                          type="button"
                          onClick={() => { setDocumentFile(null); setDocumentUrl(null); }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>


                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseSendModal}
                    disabled={isSendingEmail}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm rounded-xl"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar e-mail
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
