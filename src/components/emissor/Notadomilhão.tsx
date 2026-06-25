import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileKey2,
  FilePlus2,
  FileText,
  Home,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Network,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  UploadCloud,
  Users,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PJUser } from '../../types';
import { nfseApi } from '../../lib/nfse';

interface EmissorNacionalModuleProps {
  user: PJUser;
  onExit: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

type ModuleTab =
  | 'dashboard'
  | 'nova_nota'
  | 'notas'
  | 'clientes'
  | 'emitentes'
  | 'certificados'
  | 'integracao'
  | 'configuracoes';

interface RegistryRecord {
  id: string;
  name: string;
  document: string;
  detail: string;
  createdAt: string;
}

const moduleMenu = [
  { id: 'dashboard' as ModuleTab, label: 'Visão geral', icon: LayoutDashboard },
  { id: 'nova_nota' as ModuleTab, label: 'Emitir NFS-e', icon: FilePlus2 },
  { id: 'notas' as ModuleTab, label: 'Notas fiscais', icon: ReceiptText },
  { id: 'clientes' as ModuleTab, label: 'Clientes', icon: Users },
  { id: 'emitentes' as ModuleTab, label: 'Emitentes', icon: Building2 },
  { id: 'certificados' as ModuleTab, label: 'Certificados digitais', icon: FileKey2 },
  { id: 'integracao' as ModuleTab, label: 'Integração Nacional', icon: Network },
  { id: 'configuracoes' as ModuleTab, label: 'Configurações', icon: Settings }
];

const registryConfig = {
  clientes: {
    title: 'Clientes / Tomadores',
    description: 'Cadastre os tomadores de serviço utilizados na emissão das NFS-e.',
    addLabel: 'Cadastrar cliente',
    nameLabel: 'Nome ou razão social',
    documentLabel: 'CPF ou CNPJ',
    detailLabel: 'E-mail'
  },
  emitentes: {
    title: 'Emitentes / Prestadores',
    description: 'Gerencie as empresas prestadoras habilitadas para emitir pelo Portal Nacional.',
    addLabel: 'Cadastrar emitente',
    nameLabel: 'Razão social',
    documentLabel: 'CNPJ',
    detailLabel: 'Inscrição municipal'
  },
  certificados: {
    title: 'Certificados digitais',
    description: 'Vincule certificados A1 aos emitentes. O arquivo e a senha deverão ser protegidos no backend.',
    addLabel: 'Vincular certificado',
    nameLabel: 'Identificação do certificado',
    documentLabel: 'CNPJ do titular',
    detailLabel: 'Validade'
  }
} as const;

export default function EmissorNacionalModule({
  user,
  onExit,
  onLogout,
  isDarkMode,
  onToggleDarkMode
}: EmissorNacionalModuleProps) {
  const [currentTab, setCurrentTab] = useState<ModuleTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const titles: Record<ModuleTab, string> = {
    dashboard: 'Visão geral',
    nova_nota: 'Emitir nova NFS-e',
    notas: 'Notas fiscais',
    clientes: 'Clientes / Tomadores',
    emitentes: 'Emitentes / Prestadores',
    certificados: 'Certificados digitais',
    integracao: 'Integração com o Portal Nacional',
    configuracoes: 'Configurações do emissor'
  };

  const navigate = (tab: ModuleTab) => {
    setCurrentTab(tab);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    if (currentTab === 'dashboard') {
      return <Dashboard onNavigate={navigate} />;
    }
    if (currentTab === 'nova_nota') {
      return <NewInvoicePage onNavigate={navigate} />;
    }
    if (currentTab === 'notas') {
      return <InvoicesPage onNavigate={navigate} />;
    }
    if (currentTab === 'certificados') {
      return <CertificatesPage />;
    }
    if (currentTab === 'clientes' || currentTab === 'emitentes') {
      return <RegistryPage type={currentTab} tenantKey={user.tenantId || user.id} />;
    }
    if (currentTab === 'integracao') {
      return <IntegrationPage />;
    }
    return <SettingsPage />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-cyan-950/80 bg-[#06151d] text-slate-100 transition-all duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full'
        } ${collapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">Nota do Milhão</p>
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/70">Portal PJ</p>
              </div>
            </div>
          )}
          {collapsed && <ReceiptText className="hidden h-6 w-6 text-cyan-400 lg:block" />}
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:block"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={`border-b border-white/10 bg-white/[0.025] p-4 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <Building2 className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.companyName}</p>
                <p className="truncate text-xs text-slate-500">CNPJ {user.cnpj}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {moduleMenu.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={item.label}
                className={`flex items-center rounded-xl text-sm font-medium transition-colors ${collapsed ? 'mx-auto h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5'
                  } ${active ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <button
            onClick={onExit}
            title="Voltar ao Portal PJ"
            className={`flex items-center rounded-xl text-sm font-medium text-cyan-300 hover:bg-cyan-400/10 ${collapsed ? 'mx-auto h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5'
              }`}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            {!collapsed && 'Voltar ao Portal PJ'}
          </button>
          <button
            onClick={onLogout}
            title="Sair"
            className={`flex items-center rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-400/10 ${collapsed ? 'mx-auto h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5'
              }`}
          >
            <LogOut className="h-4.5 w-4.5" />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold md:text-base">{titles[currentTab]}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Ambiente de emissão integrado ao padrão nacional da NFS-e</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="mx-auto w-full max-w-7xl"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (tab: ModuleTab) => void }) {
  const cards = [
    { label: 'Notas emitidas', value: '0', detail: 'Neste mês', icon: FileText, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10' },
    { label: 'Notas autorizadas', value: '0', detail: 'Processadas com sucesso', icon: FileCheck2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Notas com erro', value: '0', detail: 'Nenhuma pendência', icon: CircleHelp, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Emitentes ativos', value: '0', detail: 'Cadastre o primeiro', icon: Building2, color: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' }
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#06151d] via-[#0a2733] to-cyan-950 p-6 text-white shadow-xl md:p-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Ambiente seguro de emissão
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">Emissor de NFS-e Nota do Milhão</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Centralize emitentes, tomadores, certificados e o ciclo completo de emissão, consulta, cancelamento e download das notas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => onNavigate('nova_nota')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300">
              <FilePlus2 className="h-4 w-4" /> Emitir nova NFS-e
            </button>
            <button onClick={() => onNavigate('integracao')} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
              <Network className="h-4 w-4" /> Ver integração
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-extrabold">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <h3 className="font-bold">Primeiros passos</h3>
          <p className="mt-1 text-sm text-slate-500">Prepare o ambiente antes da primeira emissão.</p>
          <div className="mt-5 space-y-3">
            {[
              ['Cadastrar emitente', 'Dados fiscais, inscrição municipal e regime tributário', 'emitentes'],
              ['Vincular certificado A1', 'Certificado do prestador usado na comunicação segura', 'certificados'],
              ['Cadastrar clientes', 'Tomadores nacionais e estrangeiros', 'clientes'],
              ['Configurar webservice', 'Ambiente, endpoints e parâmetros municipais', 'integracao']
            ].map(([title, detail, tab], index) => (
              <button key={title} onClick={() => onNavigate(tab as ModuleTab)} className="flex w-full items-center gap-4 rounded-xl border border-slate-100 p-3 text-left hover:border-cyan-300 hover:bg-cyan-50/50 dark:border-slate-800 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/20">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="block truncate text-xs text-slate-500">{detail}</span></span>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="font-bold">Estado dos serviços</h3>
          <div className="mt-5 space-y-4">
            <StatusRow label="API do emissor" status="Aguardando backend" />
            <StatusRow label="Portal Nacional NFS-e" status="Não configurado" />
            <StatusRow label="Certificado digital" status="Não vinculado" />
            <StatusRow label="Ambiente" status="Homologação" positive />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusRow({ label, status, positive = false }: { label: string; status: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-amber-600'}`}>{status}</span>
    </div>
  );
}

function RegistryPage({ type, tenantKey }: { type: 'clientes' | 'emitentes' | 'certificados'; tenantKey: string }) {
  const config = registryConfig[type];
  const storageKey = `portal_pj_emissor_${tenantKey}_${type}`;
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', document: '', detail: '' });

  useEffect(() => {
    try {
      setRecords(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch {
      setRecords([]);
    }
  }, [storageKey]);

  const filtered = useMemo(() => records.filter(record =>
    `${record.name} ${record.document} ${record.detail}`.toLowerCase().includes(search.toLowerCase())
  ), [records, search]);

  const save = (next: RegistryRecord[]) => {
    setRecords(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.document.trim()) return;
    save([...records, { id: crypto.randomUUID(), ...form, createdAt: new Date().toISOString() }]);
    setForm({ name: '', document: '', detail: '' });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold">{config.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{config.description}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">
          <Plus className="h-4 w-4" /> {config.addLabel}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800" />
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(record => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                  {type === 'clientes' ? <Users className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{record.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">{record.document}</p>
                  {record.detail && <p className="mt-1 truncate text-xs text-slate-400">{record.detail}</p>}
                </div>
                <button onClick={() => save(records.filter(item => item.id !== record.id))} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={type === 'emitentes' ? Building2 : Users} title={`Nenhum ${type === 'clientes' ? 'cliente' : 'emitente'} cadastrado`} action={config.addLabel} onAction={() => setModalOpen(true)} />
      )}

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.form initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} onSubmit={submit} className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold">{config.addLabel}</h3>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 space-y-4">
                <Field label={config.nameLabel} value={form.name} onChange={name => setForm({ ...form, name })} />
                <Field label={config.documentLabel} value={form.document} onChange={document => setForm({ ...form, document })} />
                <Field label={config.detailLabel} value={form.detail} onChange={detail => setForm({ ...form, detail })} required={false} />
                {type === 'certificados' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    Nesta etapa inicial apenas os metadados são salvos. O upload do arquivo .PFX e sua senha serão enviados diretamente ao cofre seguro do backend.
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
                <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">Salvar cadastro</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CertificatesPage() {
  const [emitters, setEmitters] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [emitterId, setEmitterId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emitterResult, certificateResult] = await Promise.all([
        nfseApi.listEmitters(),
        nfseApi.listCertificates(),
      ]);
      setEmitters(emitterResult.data || []);
      setCertificates(certificateResult.data || []);
      setEmitterId(current => current || emitterResult.data?.[0]?.id || '');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao carregar os certificados.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectFile = (selected?: File) => {
    setMessage(null);
    if (!selected) return setFile(null);
    const extension = selected.name.toLowerCase().split('.').pop();
    if (!['pfx', 'p12'].includes(extension || '')) {
      setFile(null);
      setMessage({ type: 'error', text: 'Selecione um certificado A1 no formato .pfx ou .p12.' });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null);
      setMessage({ type: 'error', text: 'O certificado deve ter no máximo 10 MB.' });
      return;
    }
    setFile(selected);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!emitterId || !file || !password) {
      setMessage({ type: 'error', text: 'Selecione o emitente, o arquivo A1 e informe a senha.' });
      return;
    }
    setUploading(true);
    try {
      await nfseApi.uploadCertificate({ emitterId, file, password });
      setPassword('');
      setFile(null);
      const input = document.getElementById('nfse-certificate-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadData();
      setMessage({ type: 'success', text: 'Certificado A1 cifrado e vinculado com segurança.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao enviar o certificado.' });
    } finally {
      setUploading(false);
    }
  };

  const emitterName = (id: string) =>
    emitters.find(emitter => emitter.id === id)?.razao_social || 'Emitente';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">Certificados digitais A1</h2>
        <p className="mt-1 text-sm text-slate-500">Envie o PKCS#12 diretamente para o armazenamento privado do emissor.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
              <FileKey2 className="h-5 w-5" />
            </div>
            <div><h3 className="font-bold">Vincular certificado</h3><p className="text-xs text-slate-500">Arquivos .pfx ou .p12 de até 10 MB.</p></div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Emitente</span>
              <select required value={emitterId} onChange={event => setEmitterId(event.target.value)} disabled={loading || uploading} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800">
                <option value="">Selecione o emitente</option>
                {emitters.map(emitter => <option key={emitter.id} value={emitter.id}>{emitter.razao_social} — {emitter.cnpj}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Arquivo do certificado</span>
              <div className={`rounded-2xl border-2 border-dashed p-5 text-center ${file ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                <UploadCloud className={`mx-auto h-7 w-7 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
                <p className="mt-2 text-sm font-semibold">{file ? file.name : 'Selecione o arquivo .pfx ou .p12'}</p>
                {file && <p className="mt-1 text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>}
                <input id="nfse-certificate-file" type="file" accept=".pfx,.p12,application/x-pkcs12,application/pkcs12" onChange={event => selectFile(event.target.files?.[0])} disabled={uploading} className="mt-3 block w-full cursor-pointer text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:font-semibold file:text-white" />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Senha do certificado</span>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} disabled={uploading} autoComplete="new-password" placeholder="Digite a senha do A1" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {message && <div className={`rounded-xl border p-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>{message.text}</div>}

            <button type="submit" disabled={uploading || loading || !emitters.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {uploading ? 'Protegendo e enviando...' : 'Proteger e vincular certificado'}
            </button>
          </div>
        </form>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="font-bold">Proteção aplicada</h3>
          <div className="mt-4 space-y-4">
            <SecurityItem number="1" text="Envio autenticado para a Edge Function." />
            <SecurityItem number="2" text="Arquivo cifrado com AES-256-GCM." />
            <SecurityItem number="3" text="Senha separada no Supabase Vault." />
            <SecurityItem number="4" text="Bucket privado, sem URL pública." />
          </div>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            A senha não será exibida ou recuperável depois do envio.
          </div>
        </aside>
      </div>

      <section>
        <h3 className="font-bold">Certificados vinculados</h3>
        <p className="mt-1 text-sm text-slate-500">Somente os metadados seguros aparecem aqui.</p>
        {loading ? (
          <div className="mt-4 flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><Loader2 className="h-6 w-6 animate-spin text-cyan-600" /></div>
        ) : certificates.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {certificates.map(certificate => (
              <article key={certificate.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><BadgeCheck className="h-5 w-5" /></div>
                  <div className="min-w-0"><h4 className="truncate font-bold">{certificate.nome_arquivo}</h4><p className="mt-0.5 truncate text-xs text-slate-500">{emitterName(certificate.emitente_id)}</p></div>
                </div>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                  <span className="text-slate-500">Vinculado em</span>
                  <span className="font-semibold">{new Date(certificate.criado_em).toLocaleDateString('pt-BR')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <FileKey2 className="mx-auto h-8 w-8 text-slate-400" />
            <h4 className="mt-3 font-bold">Nenhum certificado vinculado</h4>
          </div>
        )}
      </section>
    </div>
  );
}

function SecurityItem({ number, text }: { number: string; text: string }) {
  return <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"><span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-extrabold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">{number}</span><p className="leading-6">{text}</p></div>;
}

function Field({ label, value, onChange, required = true }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <input required={required} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-800" />
    </label>
  );
}

function NewInvoicePage({ onNavigate }: { onNavigate: (tab: ModuleTab) => void }) {
  const [emitters, setEmitters] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<{ emitters: number; certificates: number; integration: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = new Date();
  const [form, setForm] = useState({
    emitente_id: '',
    cliente_id: '',
    serie: '1',
    numero: String(today.getFullYear()) + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0') + String(today.getHours()).padStart(2, '0') + String(today.getMinutes()).padStart(2, '0'),
    competencia: today.toISOString().slice(0, 7),
    codigo_servico_nacional: '',
    codigo_servico_municipal: '',
    municipio_incidencia_ibge: '',
    descricao_servico: '',
    valor_servico: '',
  });

  useEffect(() => {
    Promise.all([nfseApi.listEmitters(), nfseApi.listCustomers(), nfseApi.status()])
      .then(([emittersRes, customersRes, statusRes]) => {
        setEmitters(emittersRes.data || []);
        setCustomers(customersRes.data || []);
        setApiStatus(statusRes as any);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (emitters.length > 0 && !form.emitente_id) {
      const first = emitters[0];
      setForm(f => ({
        ...f,
        emitente_id: first.id,
        municipio_incidencia_ibge: first.codigo_municipio_ibge || '',
        codigo_servico_nacional: first.codigo_tributacao_nacional_padrao || '',
        codigo_servico_municipal: first.codigo_servico_municipal_padrao || '',
      }));
    }
  }, [emitters]);

  const hasEmitter = emitters.length > 0;
  const hasCertificate = (apiStatus?.certificates ?? 0) > 0;
  const isIntegrationReady = apiStatus?.integration === 'ready';
  const isReady = hasEmitter && hasCertificate && isIntegrationReady;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const result = await nfseApi.issue({
        ...form,
        serie: form.serie,
        numero: parseInt(form.numero, 10),
        competencia: form.competencia + '-01',
        valor_servico: parseFloat(form.valor_servico),
        cliente_id: form.cliente_id || undefined,
      });
      setSuccess(`Nota enfileirada! Job ${result.job.id.slice(0, 8)}… Aguarde até 1 minuto para o processamento.`);
      setForm(f => ({ ...f, descricao_servico: '', valor_servico: '', numero: String(Date.now()).slice(-8) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao emitir nota.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (disabled: boolean) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${disabled
      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800/60'
      : 'border-slate-200 bg-white focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">Emitir nova NFS-e</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isReady ? 'Preencha os dados abaixo e clique em Emitir.' : 'Configure os pré-requisitos para habilitar a emissão.'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-300">{success}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="font-bold">Dados da declaração de prestação de serviço</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Emitente</span>
              <select value={form.emitente_id} onChange={set('emitente_id')} disabled={!isReady || submitting} className={inputCls(!isReady)}>
                <option value="">Selecione o emitente</option>
                {emitters.map(em => <option key={em.id} value={em.id}>{em.razao_social}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Cliente / Tomador <span className="font-normal text-slate-400">(opcional)</span></span>
              <select value={form.cliente_id} onChange={set('cliente_id')} disabled={!isReady || submitting} className={inputCls(!isReady)}>
                <option value="">Sem tomador identificado</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.razao_social || c.nome}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Código de tributação nacional</span>
              <input value={form.codigo_servico_nacional} onChange={set('codigo_servico_nacional')} disabled={!isReady || submitting} placeholder="Ex: 171901" required className={inputCls(!isReady)} />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Código municipal SP <span className="font-normal text-slate-400">(5 dígitos — obrigatório para SP)</span></span>
              <input value={form.codigo_servico_municipal} onChange={set('codigo_servico_municipal')} disabled={!isReady || submitting} placeholder="Ex: 07498" className={inputCls(!isReady)} />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Município de incidência (IBGE)</span>
              <input value={form.municipio_incidencia_ibge} onChange={set('municipio_incidencia_ibge')} disabled={!isReady || submitting} placeholder="Ex: 3550308" required className={inputCls(!isReady)} />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Descrição do serviço</span>
              <textarea value={form.descricao_servico} onChange={e => setForm(f => ({ ...f, descricao_servico: e.target.value }))} disabled={!isReady || submitting} placeholder="Descreva o serviço prestado" required rows={3} className={`${inputCls(!isReady)} resize-none`} />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Valor do serviço (R$)</span>
              <input type="number" min="0.01" step="0.01" value={form.valor_servico} onChange={set('valor_servico')} disabled={!isReady || submitting} placeholder="0,00" required className={inputCls(!isReady)} />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Competência</span>
              <input type="month" value={form.competencia} onChange={set('competencia')} disabled={!isReady || submitting} required className={inputCls(!isReady)} />
            </label>
          </div>

          <button
            type="submit"
            disabled={!isReady || submitting || loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : 'Emitir NFS-e'}
          </button>
        </form>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-bold">Pré-requisitos</h3>
          <div className="mt-4 space-y-3">
            {loading
              ? [1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)
              : <>
                <Requirement label="Emitente cadastrado" met={hasEmitter} />
                <Requirement label="Certificado A1 válido" met={hasCertificate} />
                <Requirement label="Integração configurada" met={isIntegrationReady} />
              </>
            }
          </div>
          {!isReady && !loading && (
            <button onClick={() => onNavigate(hasEmitter ? 'certificados' : 'emitentes')} className="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">
              Configurar ambiente
            </button>
          )}
          {isReady && (
            <div className="mt-6 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300">
              Ambiente pronto para emissão em homologação.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Requirement({ label, met }: { label: string; met?: boolean }) {
  if (met) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300">
        <BadgeCheck className="h-4 w-4" /> {label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
      <CircleHelp className="h-4 w-4" /> {label}
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  fila: { label: 'Na fila', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  processando: { label: 'Processando', cls: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300' },
  autorizada: { label: 'Autorizada', cls: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' },
  rejeitada: { label: 'Rejeitada', cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  erro: { label: 'Erro', cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  rascunho: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

function InvoicesPage({ onNavigate }: { onNavigate: (tab: ModuleTab) => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([nfseApi.listNotes(), nfseApi.listJobs()])
      .then(([notesRes, jobsRes]) => {
        setNotes(notesRes.data || []);
        setJobs(jobsRes.data || []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Erro ao carregar notas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const allItems = [
    ...notes.map(n => ({ ...n, _type: 'nota' })),
    ...jobs.filter(j => j.tipo === 'emitir' && j.status !== 'concluido').map(j => ({ ...j, _type: 'job' })),
  ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold">Notas fiscais</h2>
          <p className="mt-1 text-sm text-slate-500">Consulte emissões, retornos, XML, DANFSe e eventos.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '↻'} Atualizar
          </button>
          <button onClick={() => onNavigate('nova_nota')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">
            <Plus className="h-4 w-4" /> Nova NFS-e
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : allItems.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Nenhuma nota emitida" action="Preparar primeira emissão" onAction={() => onNavigate('nova_nota')} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Nota / Job</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Serviço / Valor</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allItems.map(item => {
                const badge = STATUS_LABEL[item.status] || { label: item.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {item._type === 'nota' ? (item.numero_nfse || item.chave_acesso?.slice(0, 12) + '…') : `Job ${item.id.slice(0, 8)}…`}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium truncate max-w-[200px]">{item.descricao_servico || (item._type === 'job' ? 'Aguardando processamento' : '—')}</p>
                      {item.valor_servico && <p className="text-xs text-slate-400">R$ {Number(item.valor_servico).toFixed(2)}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                      {(item.erro_mensagem || item.ultimo_erro) && <p className="mt-1 text-xs text-red-500 max-w-[180px] truncate" title={item.erro_mensagem || item.ultimo_erro}>{item.erro_mensagem || item.ultimo_erro}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(item.criado_em).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IntegrationPage() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-extrabold">Integração com o Portal Nacional</h2><p className="mt-1 text-sm text-slate-500">Estrutura prevista para comunicação segura, assinatura e processamento das NFS-e.</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          ['API / Webservice', 'Cliente backend responsável por enviar DPS, consultar NFS-e e registrar eventos.', Network],
          ['Assinatura digital', 'Assinatura dos documentos com certificado A1 do emitente, sem expor a senha no frontend.', KeyRound],
          ['Fila e retentativas', 'Processamento assíncrono, idempotência, controle de NSU e novas tentativas.', FileCheck2],
          ['Auditoria', 'Armazenamento de XML/JSON enviados e recebidos, protocolos, erros e histórico de eventos.', ShieldCheck]
        ].map(([title, description, Icon]) => (
          <article key={title as string} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Icon className="h-6 w-6 text-cyan-600" />
            <h3 className="mt-4 font-bold">{title as string}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description as string}</p>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm leading-6 text-cyan-900 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100">
        A interface está preparada para consumir uma API própria. O próximo passo técnico é criar o backend do emissor, definir o município/ambiente inicial e implementar os contratos oficiais vigentes do Sistema Nacional NFS-e.
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-extrabold">Configurações do emissor</h2><p className="mt-1 text-sm text-slate-500">Preferências gerais e parâmetros operacionais.</p></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-5 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-bold">Ambiente padrão</span><select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option>Homologação</option><option disabled>Produção — liberar após validação</option></select></label>
          <label><span className="mb-1.5 block text-xs font-bold">Série padrão da DPS</span><input defaultValue="1" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
        </div>
        <button className="mt-6 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white">Salvar preferências</button>
      </section>
    </div>
  );
}

function EmptyState({ icon: Icon, title, action, onAction }: { icon: React.ElementType; title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Icon className="h-7 w-7" /></div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">Os registros adicionados neste módulo aparecerão aqui.</p>
      <button onClick={onAction} className="mt-5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">{action}</button>
    </div>
  );
}
