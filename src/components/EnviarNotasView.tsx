import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Send,
  User,
  Search,
  X,
  Loader2,
  Link,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PJUser, Client } from '../types';
import { getClients } from '../lib/db';
import { ResendService, uploadEmailDocument } from '../lib/resend';
import { useToast } from '../lib/toast';
import ConfirmDialog from './ConfirmDialog';

interface EnviarNotasViewProps {
  user: PJUser;
}

interface NotaEnviada {
  id: string;
  clientId: string;
  description: string;
  status: 'pending' | 'sent';
  createdAt: string;
}

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

export default function EnviarNotasView({ user }: EnviarNotasViewProps) {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [notas, setNotas] = useState<NotaEnviada[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [description, setDescription] = useState('');

  const storageKey = `portal_pj_notas_${user.tenantId ?? 'default'}`;

  useEffect(() => {
    getClients(user.tenantId ?? 'default').then(setClients);
    const saved = localStorage.getItem(storageKey);
    setNotas(saved ? JSON.parse(saved) : []);
  }, [user.tenantId, storageKey]);

  const saveNotas = (updated: NotaEnviada[]) => {
    setNotas(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const resetAddForm = () => {
    setSelectedClient('');
    setDescription('');
  };

  const resetSendForm = () => {
    setSelectedNotaId(null);
    setEmailSubject('');
    setEmailBody('');
    setIsSendingEmail(false);
    setDocumentFile(null);
    setDocumentUrl(null);
    setIsUploadingDoc(false);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente Removido';
  const getClientById = (id: string) => clients.find(c => c.id === id);

  const buildDefaultBody = (nota: NotaEnviada, client: Client) =>
    `Olá ${client.name},

Segue em anexo a nota fiscal referente aos serviços prestados.

Descrição: ${nota.description || 'Nota Fiscal'}

Qualquer dúvida, estamos à disposição.

Atenciosamente,
DigAI`;

  const buildEmailHtml = (customBody: string, docUrl?: string | null) => {
    const buttonHtml = docUrl
      ? `<div style="text-align:center;margin:30px 0;">
          <a href="${docUrl}" target="_blank"
            style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
            📄 Acesse aqui o documento
          </a>
        </div>`
      : '';

    return `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:40px;border:1px solid #f0f0f0;border-radius:30px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:35px;">
          <h1 style="color:#1a1a1a;font-size:26px;font-weight:300;margin:0;letter-spacing:-0.02em;">
            Envio de <span style="color:#4f46e5;font-weight:800;">Nota Fiscal</span>
          </h1>
          <p style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-top:8px;">Documento Fiscal</p>
        </div>
        <div style="line-height:1.6;color:#475569;font-size:15px;margin-bottom:35px;">${textToHtml(customBody)}</div>
        ${buttonHtml}
        <hr style="border:0;border-top:1px solid #f1f5f9;margin:40px 0;">
        <div style="text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin-bottom:8px;">
            Este é um comunicado oficial enviado por<br>
            <strong style="color:#1e293b;font-size:14px;">DigAI</strong>.
          </p>
        </div>
      </div>`;
  };

  const handleAddNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const nova: NotaEnviada = {
      id: Date.now().toString(),
      clientId: selectedClient,
      description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    saveNotas([nova, ...notas]);
    setIsAddModalOpen(false);
    resetAddForm();
  };

  const handleOpenSendModal = (id: string) => {
    const nota = notas.find(n => n.id === id);
    if (!nota) return;
    const client = getClientById(nota.clientId);
    if (!client || !client.email) {
      toast.warning('Sem e-mail', 'Cliente não encontrado ou sem e-mail cadastrado.');
      return;
    }
    setSelectedNotaId(id);
    setEmailSubject(`Nota Fiscal - ${nota.description || 'Documento Fiscal'}`);
    setEmailBody(buildDefaultBody(nota, client));
    setIsSendModalOpen(true);
  };

  const handleCloseSendModal = () => {
    if (isSendingEmail) return;
    setIsSendModalOpen(false);
    resetSendForm();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotaId || !emailSubject.trim() || !emailBody.trim()) return;

    const nota = notas.find(n => n.id === selectedNotaId);
    if (!nota) return;
    const client = getClientById(nota.clientId);
    if (!client || !client.email) { toast.warning('Sem e-mail', 'E-mail do cliente não encontrado.'); return; }

    try {
      setIsSendingEmail(true);

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

      saveNotas(notas.map(n => n.id === selectedNotaId ? { ...n, status: 'sent' } : n));
      setIsSendModalOpen(false);
      resetSendForm();
      toast.success('Nota enviada!', 'E-mail enviado com sucesso para o cliente.');
    } catch (error: any) {
      toast.error('Erro ao enviar', error?.message || 'Erro desconhecido.');
      setIsSendingEmail(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const doDelete = () => {
    if (!confirmDeleteId) return;
    saveNotas(notas.filter(n => n.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  const filtered = notas.filter(n =>
    getClientName(n.clientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedNota = selectedNotaId ? notas.find(n => n.id === selectedNotaId) : null;
  const selectedClient2 = selectedNota ? getClientById(selectedNota.clientId) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            Enviar Notas por E-mail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Selecione o cliente e envie a nota fiscal diretamente por e-mail.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Nota
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map(nota => (
            <motion.div
              key={nota.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(nota.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  nota.status === 'sent'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {nota.status === 'sent' ? 'Enviado' : 'Pendente'}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <User className="w-4 h-4" />
                  <span className="truncate font-medium">{getClientName(nota.clientId)}</span>
                </div>
                {nota.description && (
                  <p className="text-sm text-slate-500 truncate">{nota.description}</p>
                )}
                <p className="text-xs text-slate-400">
                  {new Date(nota.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenSendModal(nota.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Enviar E-mail
                </button>
                {nota.status === 'sent' && (
                  <div className="flex items-center justify-center px-3 bg-blue-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma nota encontrada. Clique em "Nova Nota" para começar.</p>
          </div>
        )}
      </div>

      {/* Modal Nova Nota */}
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
              <form onSubmit={handleAddNota}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nova Nota</h2>
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
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Descrição / Referência</label>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ex: NF-e Junho 2025, Honorários..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl">
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Enviar */}
      <AnimatePresence>
        {isSendModalOpen && selectedNota && selectedClient2 && (
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
              <form onSubmit={handleSend}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enviar Nota por E-mail</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Anexe a nota e revise o texto antes de enviar.</p>
                  </div>
                  <button type="button" onClick={handleCloseSendModal} disabled={isSendingEmail} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedClient2.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedClient2.email}</p>
                    </div>
                  </div>

                  {/* Assunto */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Assunto do e-mail</label>
                    <input
                      type="text" required value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  {/* Corpo */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Texto do e-mail</label>
                    <textarea
                      required rows={10} value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed"
                    />
                  </div>

                  {/* Documento */}
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-200 flex items-center gap-2">
                      <Link className="w-4 h-4 text-indigo-500" />
                      Documento com botão no e-mail
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      O cliente verá um botão <strong>"Acesse aqui o documento"</strong> no e-mail.
                    </p>

                    {!documentFile ? (
                      <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-indigo-50 dark:bg-indigo-950/30 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                        <UploadCloud className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Selecionar nota/documento (PDF...)</span>
                        <input
                          type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => { setDocumentFile(e.target.files?.[0] ?? null); setDocumentUrl(null); }}
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
                        {documentUrl
                          ? <span className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">✓ Pronto</span>
                          : isUploadingDoc
                            ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                            : <span className="text-xs text-indigo-500 shrink-0">Será enviado ao clicar em Enviar</span>
                        }
                        <button type="button" onClick={() => { setDocumentFile(null); setDocumentUrl(null); }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-end gap-2">
                  <button type="button" onClick={handleCloseSendModal} disabled={isSendingEmail}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm rounded-xl">
                    {isSendingEmail
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                      : <><Send className="w-4 h-4" />Enviar Nota</>
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Deseja excluir este registro?"
        onConfirm={doDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
