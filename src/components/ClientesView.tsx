import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Plus, Trash2, Search,
  Download, Upload, X, Mail, Phone, Building2, UserPlus,
  Pencil, LayoutGrid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { PJUser, Client, ClientContact } from '../types';
import { getClients, addClient, addClients, updateClient, deleteClient } from '../lib/db';

interface ClientesViewProps {
  user: PJUser;
}

interface LocalContact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

function mkContact(): LocalContact {
  return { id: Date.now().toString() + Math.random().toString(36).slice(2), name: '', email: '', phone: '' };
}

type ViewMode = 'grid' | 'list';

export default function ClientesView({ user }: ClientesViewProps) {
  const tenantId = user.tenantId ?? 'default';

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('portal_pj_clientes_view') as ViewMode) || 'grid'
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'manual' | 'planilha'>('manual');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [docField, setDocField] = useState('');
  const [contacts, setContacts] = useState<LocalContact[]>([mkContact()]);
  const [observacoes, setObservacoes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    getClients(tenantId)
      .then(setClients)
      .finally(() => setIsLoading(false));
  }, [tenantId]);

  const setView = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem('portal_pj_clientes_view', v);
  };

  const getContacts = (c: Client): ClientContact[] => {
    if (c.contacts && c.contacts.length > 0) return c.contacts;
    if (c.email || c.contato) return [{ id: '', name: c.contato || c.name, email: c.email, phone: c.phone }];
    return [];
  };

  const resetForm = () => {
    setNomeFantasia(''); setRazaoSocial(''); setDocField('');
    setContacts([mkContact()]); setObservacoes('');
    setEditingClient(null);
  };

  const openNew = () => { resetForm(); setModalTab('manual'); setIsModalOpen(true); };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setNomeFantasia(client.nomeFantasia || client.name);
    setRazaoSocial(client.razaoSocial || '');
    setDocField(client.document || '');
    const cts = getContacts(client);
    setContacts(
      cts.length > 0
        ? cts.map(c => ({ id: c.id || mkContact().id, name: c.name || '', email: c.email || '', phone: c.phone || '' }))
        : [mkContact()]
    );
    setObservacoes(client.observacoes || '');
    setModalTab('manual');
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const updateContact = (id: string, field: keyof LocalContact, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const buildClientFromForm = (base?: Client): Client => {
    const validContacts = contacts.filter(c => c.name.trim() || c.email.trim());
    const clientContacts: ClientContact[] = validContacts.map(c => ({
      id: c.id,
      name: c.name.trim(),
      email: c.email.trim(),
      phone: c.phone.trim() || undefined,
    }));
    return {
      id: base?.id ?? Date.now().toString(),
      tenantId,
      name: nomeFantasia.trim(),
      nomeFantasia: nomeFantasia.trim(),
      razaoSocial: razaoSocial.trim() || undefined,
      document: docField.trim() || undefined,
      contacts: clientContacts.length ? clientContacts : undefined,
      contato: clientContacts[0]?.name,
      email: clientContacts[0]?.email ?? '',
      phone: clientContacts[0]?.phone,
      whatsapp: clientContacts[0]?.phone,
      observacoes: observacoes.trim() || undefined,
      createdAt: base?.createdAt ?? new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingClient) {
        const updated = buildClientFromForm(editingClient);
        await updateClient(editingClient.id, updated);
        setClients(prev => prev.map(c => c.id === editingClient.id ? updated : c));
      } else {
        const newClient = buildClientFromForm();
        await addClient(tenantId, newClient);
        setClients(prev => [...prev, newClient]);
      }
      closeModal();
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Nome Fantasia *', 'Razão Social', 'CNPJ / CPF',
      'Contato 1 - Nome *', 'Contato 1 - E-mail *', 'Contato 1 - WhatsApp/Tel',
      'Contato 2 - Nome', 'Contato 2 - E-mail', 'Contato 2 - WhatsApp/Tel',
      'Contato 3 - Nome', 'Contato 3 - E-mail', 'Contato 3 - WhatsApp/Tel',
      'Observações'
    ];
    const example = [
      'GoBigger', 'GoBigger Tecnologia Ltda', '30.110.179/0001-09',
      'Juliana', 'juliana@gobigger.com.br', '(11) 99999-9999',
      'Carlos', 'carlos@gobigger.com.br', '(11) 88888-8888',
      '', '', '', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 26 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'modelo_clientes.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

        const imported: Client[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as string[];
          const nf = String(r[0] ?? '').trim();
          if (!nf) continue;

          const clientContacts: ClientContact[] = [];
          for (let c = 0; c < 3; c++) {
            const base = 3 + c * 3;
            const cName = String(r[base] ?? '').trim();
            const cEmail = String(r[base + 1] ?? '').trim();
            const cPhone = String(r[base + 2] ?? '').trim();
            if (cName || cEmail) {
              clientContacts.push({ id: Date.now().toString() + i + c, name: cName, email: cEmail, phone: cPhone || undefined });
            }
          }

          imported.push({
            id: Date.now().toString() + i + Math.random().toString(36).slice(2),
            tenantId,
            name: nf,
            nomeFantasia: nf,
            razaoSocial: String(r[1] ?? '').trim() || undefined,
            document: String(r[2] ?? '').trim() || undefined,
            contacts: clientContacts.length ? clientContacts : undefined,
            contato: clientContacts[0]?.name,
            email: clientContacts[0]?.email ?? '',
            phone: clientContacts[0]?.phone,
            whatsapp: clientContacts[0]?.phone,
            observacoes: String(r[12] ?? '').trim() || undefined,
            createdAt: new Date().toISOString(),
          });
        }

        if (imported.length === 0) {
          alert('Nenhum cliente válido. A coluna "Nome Fantasia" é obrigatória.');
          return;
        }

        try {
          await addClients(tenantId, imported);
          setClients(prev => [...prev, ...imported]);
          closeModal();
          alert(`${imported.length} cliente(s) importado(s) com sucesso!`);
        } catch (err: any) {
          alert(err?.message || 'Erro ao importar clientes.');
        }
      } catch {
        alert('Erro ao ler a planilha. Verifique se é um .xlsx ou .xls válido.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este cliente? Ele também não aparecerá nas Cobranças.')) return;
    try {
      await deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir cliente.');
    }
  };

  const filtered = clients.filter(c => {
    const t = searchTerm.toLowerCase();
    if (!t) return true;
    return (
      (c.nomeFantasia || c.name).toLowerCase().includes(t) ||
      c.razaoSocial?.toLowerCase().includes(t) ||
      c.document?.includes(t) ||
      c.contacts?.some(ct => ct.name.toLowerCase().includes(t) || ct.email.toLowerCase().includes(t)) ||
      c.contato?.toLowerCase().includes(t) ||
      c.email?.toLowerCase().includes(t)
    );
  });

  // ── Form JSX (shared between add and edit) ──────────────────────
  const formJsx = (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className="p-6 space-y-5 overflow-y-auto flex-1">

        {/* Empresa */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Dados da Empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome Fantasia *</label>
              <input type="text" required value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)}
                placeholder="Como o cliente é conhecido"
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Razão Social</label>
              <input type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)}
                placeholder="Razão Social"
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">CNPJ / CPF</label>
              <input type="text" value={docField} onChange={e => setDocField(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Contatos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Contatos para Cobrança
            </h3>
            <button type="button"
              onClick={() => setContacts(prev => [...prev, mkContact()])}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              <UserPlus className="w-3.5 h-3.5" />
              Adicionar contato
            </button>
          </div>

          <div className="space-y-3">
            {contacts.map((ct, idx) => (
              <div key={ct.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Contato {idx + 1}</span>
                  {contacts.length > 1 && (
                    <button type="button" onClick={() => removeContact(ct.id)}
                      className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="Nome do contato" value={ct.name}
                    onChange={e => updateContact(ct.id, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="email" placeholder="E-mail" value={ct.email}
                      onChange={e => updateContact(ct.id, 'email', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
                    <input type="tel" placeholder="WhatsApp / Telefone" value={ct.phone}
                      onChange={e => updateContact(ct.id, 'phone', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Observações</h3>
          <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)}
            placeholder="Informações adicionais sobre este cliente..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white resize-none" />
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 flex-shrink-0">
        <button type="button" onClick={closeModal}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
          {isSaving ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Salvar Cliente'}
        </button>
      </div>
    </form>
  );

  // ── Card (grid view) ────────────────────────────────────────────
  const renderCard = (client: Client) => {
    const cts = getContacts(client);
    return (
      <motion.div
        key={client.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all group relative"
      >
        {/* Actions */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => openEdit(client)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="Editar">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(client.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Excluir">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Company */}
        <div className="flex items-start gap-3 mb-4 pr-16">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{client.nomeFantasia || client.name}</h3>
            {client.razaoSocial && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{client.razaoSocial}</p>}
            {client.document && <p className="text-xs text-slate-400 font-mono mt-0.5">{client.document}</p>}
          </div>
        </div>

        {/* Contacts */}
        {cts.length > 0 && (
          <div className="space-y-2 mb-4">
            {cts.map((ct, i) => (
              <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                {ct.name && <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ct.name}</p>}
                {ct.email && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{ct.email}</span>
                  </div>
                )}
                {ct.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{ct.phone}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {client.observacoes && (
          <p className="text-xs text-slate-400 italic truncate mb-3">{client.observacoes}</p>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            Cadastrado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </motion.div>
    );
  };

  // ── Row (list view) ─────────────────────────────────────────────
  const renderRow = (client: Client) => {
    const cts = getContacts(client);
    return (
      <motion.tr
        key={client.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                {client.nomeFantasia || client.name}
              </p>
              {client.razaoSocial && (
                <p className="text-xs text-slate-400 truncate max-w-[180px]">{client.razaoSocial}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
          {client.document || '—'}
        </td>
        <td className="px-4 py-3">
          {cts.length === 0 ? (
            <span className="text-xs text-slate-400">—</span>
          ) : (
            <div className="space-y-0.5">
              {cts.map((ct, i) => (
                <div key={i} className="text-xs">
                  {ct.name && <span className="font-medium text-slate-700 dark:text-slate-200">{ct.name}</span>}
                  {ct.email && (
                    <span className="text-slate-400 ml-1.5">
                      <Mail className="w-3 h-3 inline mr-0.5" />{ct.email}
                    </span>
                  )}
                  {ct.phone && (
                    <span className="text-slate-400 ml-1.5">
                      <Phone className="w-3 h-3 inline mr-0.5" />{ct.phone}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px]">
          <span className="truncate block italic">{client.observacoes || '—'}</span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {new Date(client.createdAt).toLocaleDateString('pt-BR')}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => openEdit(client)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
              title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(client.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </motion.tr>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Base de clientes — empresa, contatos e dados de cobrança.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Search + View Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ, e-mail ou contato..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white"
          />
        </div>
        {/* Right side: count + view toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block">{filtered.length} cliente(s)</span>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            title="Visualização em grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            title="Visualização em lista"
          >
            <List className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-16 flex items-center justify-center text-slate-400">
          Carregando clientes...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum cliente encontrado</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchTerm ? 'Tente outro termo.' : 'Cadastre seu primeiro cliente para começar.'}
          </p>
          {!searchTerm && (
            <button onClick={openNew}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors">
              Novo Cliente
            </button>
          )}
        </div>
      )}

      {/* Grid view */}
      {!isLoading && viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(client => renderCard(client))}
          </AnimatePresence>
        </div>
      )}

      {/* List view */}
      {!isLoading && viewMode === 'list' && filtered.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {['Empresa', 'CNPJ / CPF', 'Contatos', 'Observações', 'Cadastrado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <AnimatePresence>
                  {filtered.map(client => renderRow(client))}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              {filtered.length} cliente(s)
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}
                </h2>
                <button onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs — only for new client */}
              {!editingClient && (
                <div className="flex gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                  {(['manual', 'planilha'] as const).map(tab => (
                    <button key={tab} onClick={() => setModalTab(tab)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                        modalTab === tab
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}>
                      {tab === 'manual' ? 'Cadastro Manual' : 'Importar Planilha'}
                    </button>
                  ))}
                </div>
              )}

              {/* Manual form (add or edit) */}
              {(editingClient || modalTab === 'manual') && formJsx}

              {/* Import tab (only new) */}
              {!editingClient && modalTab === 'planilha' && (
                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">Como funciona?</p>
                    <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                      <li>Baixe a planilha modelo abaixo</li>
                      <li>Preencha os dados — uma linha por empresa, até 3 contatos por linha</li>
                      <li>Importe a planilha preenchida</li>
                    </ol>
                  </div>

                  <button onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl text-sm font-medium transition-colors">
                    <Download className="w-4 h-4" />
                    Baixar planilha modelo Clientes (.xlsx)
                  </button>

                  <label className="flex flex-col items-center justify-center gap-2 px-4 py-10 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Upload className="w-7 h-7 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Clique para selecionar o arquivo</span>
                    <span className="text-xs text-slate-400">.xlsx ou .xls</span>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                  </label>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Colunas da planilha:</p>
                    <p>• Nome Fantasia * | Razão Social | CNPJ/CPF</p>
                    <p>• Contato 1 (Nome, E-mail, WhatsApp) *</p>
                    <p>• Contato 2 e 3 opcionais (mesmas colunas)</p>
                    <p>• Observações</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
