import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mail, Plus, Trash2, Send, CheckCircle2, Search, X,
  FileText, Loader2, Link, UploadCloud, Download,
  AlertTriangle, ChevronDown, DollarSign, Clock, Filter, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { PJUser, Client, Cobranca, CobrancaStatus } from '../types';
import { getClients, getCobrancas, addCobranca, addCobrancas, updateCobrancaStatus, deleteCobranca } from '../lib/db';
import { ResendService, uploadEmailDocument } from '../lib/resend';
import { useToast } from '../lib/toast';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

interface PreviewRow extends Partial<Cobranca> {
  _empresa: string;
  _clientFound: boolean;
  _remove?: boolean;
}

interface BulkClientForm {
  descricao: string;
  dataVencimento: string;
  valor: string;
  categoriaFinanceira: string;
  status: CobrancaStatus;
  observacoes: string;
  tipoCobrar?: 'total' | 'parcela';
  numeroParcela?: number;
}

const emptyBulkForm = (): BulkClientForm => ({
  descricao: '', dataVencimento: '', valor: '',
  categoriaFinanceira: '', status: 'em_aberto', observacoes: '',
});

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

const STATUS_CFG: Record<CobrancaStatus, { label: string; cls: string }> = {
  em_aberto: { label: 'Em aberto', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-700' },
  pago:      { label: 'Pago',      cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-700' },
  vencido:   { label: 'Vencido',   cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

const CATEGORIAS = ['Mensalidade', 'Projeto', 'Consultoria', 'Suporte', 'Licença de Software', 'Serviços Avulsos', 'Outro'];

const MONTHS_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const MONTHS_NUM: Record<string,number> = { JAN:1,FEV:2,MAR:3,ABR:4,MAI:5,JUN:6,JUL:7,AGO:8,SET:9,OUT:10,NOV:11,DEZ:12 };
const MONTHS_NAME: Record<number,string> = { 1:'Jan',2:'Fev',3:'Mar',4:'Abr',5:'Mai',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Out',11:'Nov',12:'Dez' };

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function parseMoney(s: string | number): number {
  const str = String(s ?? '').replace(/R\$\s*/g, '').trim();
  if (!str) return 0;
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
}

function parseDate(s: string | number): string {
  if (!s) return '';
  const str = String(s).trim();
  // Excel serial
  const serial = parseInt(str);
  if (!isNaN(serial) && serial > 1000 && !str.includes('/') && !str.includes('-')) {
    return new Date(Math.round((serial - 25569) * 86400000)).toISOString();
  }
  // DD/MM/YYYY
  const p = str.split('/');
  if (p.length === 3 && p[2].length >= 4) {
    return new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}T00:00:00`).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str).toISOString();
  return '';
}

function parseComp(s: string): string {
  const str = String(s).trim().toUpperCase();
  for (const abbr of MONTHS_PT) {
    if (str.startsWith(abbr)) {
      const yr = (str.match(/(\d{4})/) || [])[1] ?? String(new Date().getFullYear());
      return `${String(MONTHS_NUM[abbr]).padStart(2,'0')}/${yr}`;
    }
  }
  if (/^\d{2}\/\d{4}$/.test(str)) return str;
  return str;
}

function compDisplay(c: string): string {
  const [m, y] = c.split('/');
  return `${MONTHS_NAME[parseInt(m)] || m}/${y}`;
}

function parseStatus(s: string): Cobranca['status'] {
  const l = String(s).toLowerCase();
  if (l.includes('pago') || l.includes('paga') || l.includes('receb')) return 'pago';
  if (l.includes('vencid') || l.includes('atraso')) return 'vencido';
  if (l.includes('cancel')) return 'cancelado';
  return 'em_aberto';
}

function computeStatus(c: Cobranca): Cobranca['status'] {
  if (c.status !== 'em_aberto') return c.status;
  const today = new Date(); today.setHours(0,0,0,0);
  if (new Date(c.dataVencimento) < today) return 'vencido';
  return 'em_aberto';
}

function detectFormat(headers: string[]): 'horizontal' | 'vertical' {
  const up = headers.map(h => String(h).toUpperCase().trim());
  return MONTHS_PT.some(m => up.some(h => h.startsWith(m) && (h.includes('DIA') || h.includes('VALOR') || h.includes('VAL'))))
    ? 'horizontal' : 'vertical';
}

function findCol(headers: string[], names: string[]): number {
  const up = headers.map(h => h.toUpperCase().trim());
  return names.map(n => up.findIndex(h => h.includes(n.toUpperCase()))).find(i => i >= 0) ?? -1;
}

function parseHorizontal(rows: any[][], clients: Client[], baseYear: number): PreviewRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h: any) => String(h ?? '').trim());
  const up = headers.map((h: string) => h.toUpperCase());

  // Find month pairs (DIA + VALOR)
  const monthCols: { month: number; year: number; dayIdx: number; valIdx: number }[] = [];
  const usedVal = new Set<number>();

  for (let i = 0; i < up.length; i++) {
    for (const abbr of MONTHS_PT) {
      if (up[i].startsWith(abbr) && up[i].includes('DIA')) {
        for (let j = i + 1; j < up.length; j++) {
          if (up[j].startsWith(abbr) && (up[j].includes('VALOR') || up[j].includes('VAL')) && !usedVal.has(j)) {
            const yr = (up[i].match(/(\d{4})/) || [])[1];
            monthCols.push({ month: MONTHS_NUM[abbr], year: yr ? parseInt(yr) : baseYear, dayIdx: i, valIdx: j });
            usedVal.add(j);
            break;
          }
        }
        break;
      }
    }
  }

  const cEmp = findCol(headers, ['EMPRESA','CLIENTE','NOME FANT']) !== -1 ? findCol(headers, ['EMPRESA','CLIENTE','NOME FANT']) : 0;
  const cDoc = findCol(headers, ['CNPJ','CPF','DOC']);
  const cDesc = findCol(headers, ['DESCRI','SERVI','PACOTE']);

  const records: PreviewRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    const empresa = String(row[cEmp] ?? '').trim();
    if (!empresa) continue;

    const doc = cDoc >= 0 ? String(row[cDoc] ?? '').trim() : '';
    const desc = cDesc >= 0 ? String(row[cDesc] ?? '').trim() || 'Cobrança' : 'Cobrança';

    const client = clients.find(c =>
      (c.nomeFantasia || c.name).toLowerCase() === empresa.toLowerCase() ||
      (doc && c.document && c.document.replace(/\D/g,'') === doc.replace(/\D/g,''))
    );

    for (const mc of monthCols) {
      const dia = parseInt(String(row[mc.dayIdx] ?? '0'));
      const valor = parseMoney(String(row[mc.valIdx] ?? '0'));
      if (!dia || !valor) continue;

      records.push({
        id: `imp-${Date.now()}-${r}-${mc.month}-${Math.random().toString(36).slice(2)}`,
        clientId: client?.id ?? '',
        clienteNome: empresa,
        descricao: desc,
        competencia: `${String(mc.month).padStart(2,'0')}/${mc.year}`,
        dataVencimento: new Date(mc.year, mc.month - 1, dia).toISOString(),
        valor,
        status: 'em_aberto',
        _empresa: empresa,
        _clientFound: !!client,
      });
    }
  }
  return records;
}

function parseVertical(rows: any[][], clients: Client[]): PreviewRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h: any) => String(h ?? '').trim());

  const cEmp   = findCol(headers, ['EMPRESA','CLIENTE','NOME FANT']);
  const cDoc   = findCol(headers, ['CNPJ','CPF','DOC']);
  const cComp  = findCol(headers, ['COMPET']);
  const cVenc  = findCol(headers, ['VENCIM','DATA VEN']);
  const cValor = findCol(headers, ['VALOR']);
  const cDesc  = findCol(headers, ['DESCRI','SERVI']);
  const cCateg = findCol(headers, ['CATEG']);
  const cStat  = findCol(headers, ['STATUS']);
  const cObs   = findCol(headers, ['OBSERV','OBS']);

  const records: PreviewRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    const empresa = cEmp >= 0 ? String(row[cEmp] ?? '').trim() : '';
    if (!empresa) continue;
    const valor = parseMoney(String(row[cValor] ?? ''));
    if (!valor) continue;

    const doc = cDoc >= 0 ? String(row[cDoc] ?? '').trim() : '';
    const client = clients.find(c =>
      (c.nomeFantasia || c.name).toLowerCase() === empresa.toLowerCase() ||
      (doc && c.document && c.document.replace(/\D/g,'') === doc.replace(/\D/g,''))
    );

    records.push({
      id: `imp-${Date.now()}-${r}-${Math.random().toString(36).slice(2)}`,
      clientId: client?.id ?? '',
      clienteNome: empresa,
      descricao: cDesc >= 0 ? String(row[cDesc] ?? '').trim() || 'Cobrança' : 'Cobrança',
      competencia: cComp >= 0 ? parseComp(String(row[cComp] ?? '')) : '',
      dataVencimento: cVenc >= 0 ? parseDate(row[cVenc]) : '',
      valor,
      categoriaFinanceira: cCateg >= 0 ? String(row[cCateg] ?? '').trim() || undefined : undefined,
      observacoes:         cObs >= 0   ? String(row[cObs] ?? '').trim() || undefined : undefined,
      status: cStat >= 0 ? parseStatus(String(row[cStat] ?? '')) : 'em_aberto',
      _empresa: empresa,
      _clientFound: !!client,
    });
  }
  return records;
}

function escapeHtml(v: string) {
  return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function textToHtml(v: string) { return escapeHtml(v).replace(/\n/g,'<br>'); }

function buildEmailHtml(body: string, docUrl?: string | null): string {
  const docBtn = docUrl
    ? `<div style="text-align:center;margin:28px 0;"><a href="${docUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">📄 Acesse aqui o documento</a></div>`
    : '';
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:40px;border:1px solid #f0f0f0;border-radius:24px;background:#fff;"><h1 style="color:#1a1a1a;font-size:24px;font-weight:300;margin-bottom:4px;">Lembrete de <strong style="color:#4f46e5;font-weight:800;">Cobrança</strong></h1><hr style="border:0;border-top:1px solid #f1f5f9;margin:24px 0;"><div style="line-height:1.7;color:#475569;font-size:15px;">${textToHtml(body)}</div>${docBtn}<div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:12px;text-align:center;border:1px dashed #e2e8f0;"><p style="font-size:13px;color:#64748b;margin:0;">⚠️ Realize o pagamento até o vencimento para evitar juros.</p></div><hr style="border:0;border-top:1px solid #f1f5f9;margin:32px 0;"><p style="text-align:center;font-size:12px;color:#94a3b8;">Comunicado oficial enviado por <strong style="color:#1e293b;">DigAI</strong>.</p></div>`;
}

// ─────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────

interface CobrancasViewProps { user: PJUser; }

export default function CobrancasView({ user }: CobrancasViewProps) {
  const toast = useToast();
  const tenantId = user.tenantId ?? 'default';

  const [clients, setClients] = useState<Client[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Add modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addClientId, setAddClientId] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addComp, setAddComp] = useState('');
  const [addVenc, setAddVenc] = useState('');
  const [addValor, setAddValor] = useState('');
  const [addCateg, setAddCateg] = useState('');
  const [addStatus, setAddStatus] = useState<Cobranca['status']>('em_aberto');
  const [addObs, setAddObs] = useState('');
  const [addTipoCobrar, setAddTipoCobrar] = useState<'total' | 'parcela'>('total');
  const [addNumeroParcela, setAddNumeroParcela] = useState(1);

  // Import modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload'|'preview'>('upload');
  const [importFormat, setImportFormat] = useState<'horizontal'|'vertical'>('vertical');
  const [importYear, setImportYear] = useState(String(new Date().getFullYear()));
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk billing modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<'clients' | 'data'>('clients');
  const [bulkSelectedClients, setBulkSelectedClients] = useState<Set<string>>(new Set());
  const [bulkClientSearch, setBulkClientSearch] = useState('');
  const [bulkCompetencia, setBulkCompetencia] = useState('');
  const [bulkClientData, setBulkClientData] = useState<Record<string, BulkClientForm>>({});
  const [bulkExpandedClient, setBulkExpandedClient] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Email modal
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailCobId, setEmailCobId] = useState<string|null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailContacts, setEmailContacts] = useState<{name:string;email:string;phone?:string}[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [docFile, setDocFile] = useState<File|null>(null);
  const [docUrl, setDocUrl] = useState<string|null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getClients(tenantId),
      getCobrancas(tenantId),
    ]).then(([cls, cobs]) => {
      setClients(cls);
      setCobrancas(cobs);
    }).finally(() => setIsLoading(false));
  }, [tenantId]);

  const clientInfo = (id: string) => clients.find(c => c.id === id);
  const displayName = (cob: Cobranca) => {
    const cl = clientInfo(cob.clientId);
    return cl ? (cl.nomeFantasia || cl.name) : (cob.clienteNome || '—');
  };

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return cobrancas
      .map(c => ({ ...c, _eff: computeStatus(c) }))
      .filter(c => {
        if (statusFilter !== 'todos' && c._eff !== statusFilter) return false;
        const t = searchTerm.toLowerCase();
        return !t
          || displayName(c).toLowerCase().includes(t)
          || c.descricao.toLowerCase().includes(t)
          || c.competencia.includes(t)
          || c.categoriaFinanceira?.toLowerCase().includes(t)
          || '';
      })
      .sort((a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime());
  }, [cobrancas, statusFilter, searchTerm, clients]);

  // ── Add cobrança ──
  const clientNextDueDate = (cl: Client): string => {
    if (!cl.dueDay) return '';
    const today = new Date();
    let d = new Date(today.getFullYear(), today.getMonth(), cl.dueDay);
    if (d <= today) d = new Date(today.getFullYear(), today.getMonth() + 1, cl.dueDay);
    return d.toISOString().split('T')[0];
  };

  const currentCompetencia = (): string => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };

  const handleClientSelect = (id: string) => {
    setAddClientId(id);
    const cl = clientInfo(id);
    if (!cl) return;
    if (cl.descricaoPadrao) setAddDesc(cl.descricaoPadrao);
    if (cl.categoriaFinanceira) setAddCateg(cl.categoriaFinanceira);
    if (cl.valoresParcelas && cl.valoresParcelas.length > 0) {
      setAddTipoCobrar('parcela');
      setAddNumeroParcela(1);
      setAddValor(String(cl.valoresParcelas[0]));
    } else if (cl.defaultAmount) {
      setAddTipoCobrar('total');
      setAddValor(String(cl.defaultAmount));
    } else {
      setAddTipoCobrar('total');
    }
    if (!addComp) setAddComp(currentCompetencia());
    const venc = clientNextDueDate(cl);
    if (venc && !addVenc) setAddVenc(venc);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addClientId || !addDesc || !addVenc || !addValor) return;

    const cob: Cobranca = {
      id: Date.now().toString(),
      tenantId,
      clientId: addClientId,
      clienteNome: (clientInfo(addClientId)?.nomeFantasia || clientInfo(addClientId)?.name) ?? '',
      descricao: addDesc,
      competencia: addComp,
      dataVencimento: addVenc,
      valor: parseMoney(addValor),
      categoriaFinanceira: addCateg || undefined,
      observacoes: addObs || undefined,
      status: addStatus,
    };

    try {
      await addCobranca(tenantId, cob);
      setCobrancas(prev => [cob, ...prev]);
      setIsAddOpen(false);
      setAddClientId(''); setAddDesc(''); setAddComp(''); setAddVenc(''); setAddValor('');
      setAddCateg(''); setAddStatus('em_aberto'); setAddObs('');
      setAddTipoCobrar('total'); setAddNumeroParcela(1);
    } catch (err: any) {
      toast.error('Erro ao salvar', err?.message || 'Erro desconhecido.');
    }
  };

  // ── Import ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        if (rows.length < 2) { alert('Planilha vazia ou sem dados.'); return; }

        const headers = rows[0].map((h: any) => String(h ?? '').trim());
        const fmt = detectFormat(headers);
        setImportFormat(fmt);

        const records = fmt === 'horizontal'
          ? parseHorizontal(rows, clients, parseInt(importYear) || new Date().getFullYear())
          : parseVertical(rows, clients);

        if (records.length === 0) { alert('Nenhum registro válido encontrado.'); return; }

        setPreview(records.map(r => ({ ...r, _remove: false })));
        setImportStep('preview');
      } catch { alert('Erro ao ler o arquivo. Verifique se é um .xlsx ou .xls válido.'); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    const toImport = preview.filter(r => !r._remove && r.valor && r.dataVencimento);
    const newCobs: Cobranca[] = toImport.map(r => ({
      id: r.id ?? Date.now().toString() + Math.random(),
      tenantId,
      clientId: r.clientId ?? '',
      clienteNome: r.clienteNome,
      descricao: r.descricao ?? 'Cobrança',
      competencia: r.competencia ?? '',
      dataVencimento: r.dataVencimento ?? '',
      valor: r.valor ?? 0,
      categoriaFinanceira: r.categoriaFinanceira,
      observacoes: r.observacoes,
      status: (r.status ?? 'em_aberto') as CobrancaStatus,
    }));

    try {
      await addCobrancas(tenantId, newCobs);
      setCobrancas(prev => [...newCobs, ...prev]);
      setIsImportOpen(false);
      setImportStep('upload');
      setPreview([]);
      toast.success('Importação concluída!', `${newCobs.length} título(s) importado(s).`);
    } catch (err: any) {
      toast.error('Erro na importação', err?.message || 'Erro desconhecido.');
    }
  };

  const handleDownloadTemplate = () => {
    const hdrs = ['Cliente/Empresa *','CNPJ/CPF','Competência (MM/AAAA) *','Data Vencimento (DD/MM/AAAA) *','Valor *','Descrição do Serviço','Categoria Financeira','Status','Observações'];
    const ex = ['GoBigger','30.110.179/0001-09','08/2026','19/08/2026','85,83','Mensalidade','Mensalidade','Em aberto',''];
    const ws = XLSX.utils.aoa_to_sheet([hdrs, ex]);
    ws['!cols'] = hdrs.map(() => ({ wch: 26 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranças');
    XLSX.writeFile(wb, 'modelo_cobrancas.xlsx');
  };

  // ── Status change ──
  const handleStatusChange = async (id: string, s: CobrancaStatus) => {
    try {
      await updateCobrancaStatus(id, s);
      setCobrancas(prev => prev.map(c => c.id === id ? { ...c, status: s } : c));
    } catch (err: any) {
      toast.error('Erro ao atualizar status', err?.message || 'Erro desconhecido.');
    }
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta cobrança?')) return;
    try {
      await deleteCobranca(id);
      setCobrancas(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      toast.error('Erro ao excluir', err?.message || 'Erro desconhecido.');
    }
  };

  // ── Email ──
  const getClientContactList = (cl: Client): {name:string;email:string;phone?:string}[] => {
    if (cl.contacts && cl.contacts.length > 0) {
      return cl.contacts.filter(c => c.email).map(c => ({ name: c.name, email: c.email, phone: c.phone }));
    }
    if (cl.email) return [{ name: cl.contato || cl.name, email: cl.email, phone: cl.phone }];
    return [];
  };

  const buildBody = (cob: Cobranca, cl: Client, contactName: string) => {
    const empresa = cl.nomeFantasia || cl.name || cob.clienteNome || '';
    const dt = new Date(cob.dataVencimento).toLocaleDateString('pt-BR');
    return `Olá${contactName ? ' ' + contactName : ''},\n\nGostaríamos de lembrar sobre o pagamento referente aos serviços prestados.\n\nEmpresa: ${empresa}\nDescrição: ${cob.descricao}\nCompetência: ${compDisplay(cob.competencia)}\nVencimento: ${dt}\nValor: ${moneyFmt.format(cob.valor)}\n\nPedimos a programação do pagamento até a data de vencimento.\n\nAtenciosamente,\nDigAI`;
  };

  const handleOpenEmail = (cob: Cobranca) => {
    const cl = clientInfo(cob.clientId);
    if (!cl) { alert('Cliente não encontrado.'); return; }

    const cts = getClientContactList(cl);
    if (cts.length === 0) { alert('Nenhum e-mail cadastrado para este cliente.'); return; }

    setEmailCobId(cob.id);
    setEmailContacts(cts);
    setEmailTo(cts[0].email);
    setEmailSubject(`Lembrete de Pagamento — ${cob.descricao} ${compDisplay(cob.competencia)}`);
    setEmailBody(buildBody(cob, cl, cts[0].name));
    setIsEmailOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCobId || !emailSubject.trim() || !emailBody.trim()) return;
    try {
      setIsSending(true);
      let resolvedUrl = docUrl;
      if (docFile && !docUrl) {
        setIsUploading(true);
        resolvedUrl = await uploadEmailDocument(docFile, user.tenantId ?? 'default');
        setDocUrl(resolvedUrl);
        setIsUploading(false);
      }

      const html = buildEmailHtml(emailBody, resolvedUrl);

      await ResendService.sendEmail({ to: emailTo, subject: emailSubject, html });
      setIsEmailOpen(false);
      setEmailCobId(null); setEmailTo(''); setEmailContacts([]); setEmailSubject(''); setEmailBody('');
      setDocFile(null); setDocUrl(null); setIsSending(false);
      toast.success('E-mail enviado!', 'Lembrete enviado com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao enviar', err?.message || 'Erro desconhecido.');
      setIsSending(false);
    }
  };

  // ── Bulk billing ──
  const resetBulk = () => {
    setBulkStep('clients'); setBulkSelectedClients(new Set()); setBulkClientSearch('');
    setBulkCompetencia(currentCompetencia()); setBulkClientData({}); setBulkExpandedClient(null);
    setBulkProgress(null);
  };

  const toggleBulkClient = (id: string) => {
    setBulkSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredBulkClients = clients.filter(c => {
    if (!bulkClientSearch) return true;
    const t = bulkClientSearch.toLowerCase();
    return (c.nomeFantasia || c.name).toLowerCase().includes(t) || c.document?.includes(t);
  });

  const allBulkSelected = filteredBulkClients.length > 0 && filteredBulkClients.every(c => bulkSelectedClients.has(c.id));

  const toggleAllBulk = () => {
    if (allBulkSelected) setBulkSelectedClients(new Set());
    else setBulkSelectedClients(new Set(filteredBulkClients.map(c => c.id)));
  };

  const isClientFormComplete = (form: BulkClientForm) =>
    !!form.descricao && !!form.dataVencimento && parseMoney(form.valor) > 0;

  const allClientsComplete = () =>
    clients.filter(c => bulkSelectedClients.has(c.id))
      .every(c => isClientFormComplete(bulkClientData[c.id] ?? emptyBulkForm()));

  const updateClientField = <K extends keyof BulkClientForm>(clientId: string, field: K, value: BulkClientForm[K]) => {
    setBulkClientData(prev => ({ ...prev, [clientId]: { ...(prev[clientId] ?? emptyBulkForm()), [field]: value } }));
  };

  const renderBulkForm = (form: BulkClientForm, onChange: <K extends keyof BulkClientForm>(f: K, v: BulkClientForm[K]) => void) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição *</label>
          <input type="text" value={form.descricao} onChange={e => onChange('descricao', e.target.value)} placeholder="Ex: Mensalidade"
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data de Vencimento *</label>
          <input type="date" value={form.dataVencimento} onChange={e => onChange('dataVencimento', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor (R$) *</label>
          <input type="number" step="0.01" min="0" value={form.valor} onChange={e => onChange('valor', e.target.value)} placeholder="0,00"
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoria Financeira</label>
          <select value={form.categoriaFinanceira} onChange={e => onChange('categoriaFinanceira', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
            <option value="">Selecione...</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Observações</label>
        <textarea rows={2} value={form.observacoes} onChange={e => onChange('observacoes', e.target.value)} placeholder="Informações adicionais..."
          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
      </div>
    </div>
  );

  const handleBulkCreate = async (sendEmails: boolean) => {
    if (bulkSelectedClients.size === 0 || !allClientsComplete()) return;
    setIsBulkSaving(true);
    const selectedList = clients.filter(c => bulkSelectedClients.has(c.id));
    const now = Date.now();
    const newCobs: Cobranca[] = selectedList.map((cl, i) => {
      const form = bulkClientData[cl.id] ?? emptyBulkForm();
      return {
        id: `${now}-${i}-${Math.random().toString(36).slice(2)}`,
        tenantId,
        clientId: cl.id,
        clienteNome: cl.nomeFantasia || cl.name,
        descricao: form.descricao,
        competencia: bulkCompetencia,
        dataVencimento: form.dataVencimento,
        valor: parseMoney(form.valor),
        categoriaFinanceira: form.categoriaFinanceira || undefined,
        observacoes: form.observacoes || undefined,
        status: form.status,
      };
    });

    try {
      await addCobrancas(tenantId, newCobs);
      setCobrancas(prev => [...newCobs, ...prev]);

      if (sendEmails) {
        setBulkProgress({ sent: 0, failed: 0, total: newCobs.length });
        let sent = 0; let failed = 0;
        for (let i = 0; i < newCobs.length; i++) {
          const cob = newCobs[i];
          const cl = selectedList[i];
          const cts = getClientContactList(cl);
          if (cts.length === 0) { failed++; setBulkProgress({ sent, failed: ++failed - 1, total: newCobs.length }); continue; }
          try {
            const subject = `Lembrete de Pagamento — ${cob.descricao}${cob.competencia ? ' ' + compDisplay(cob.competencia) : ''}`;
            const body = buildBody(cob, cl, cts[0].name);
            await ResendService.sendEmail({ to: cts[0].email, subject, html: buildEmailHtml(body) });
            sent++;
          } catch { failed++; }
          setBulkProgress({ sent, failed, total: newCobs.length });
        }
        toast.success('Cobranças criadas!', `${newCobs.length} cobranças salvas. E-mails: ${sent} enviados${failed > 0 ? `, ${failed} sem e-mail cadastrado` : ''}.`);
      } else {
        toast.success('Cobranças criadas!', `${newCobs.length} cobranças salvas com sucesso.`);
      }

      setIsBulkOpen(false);
      resetBulk();
    } catch (err: any) {
      toast.error('Erro ao criar cobranças', err?.message || 'Erro desconhecido.');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const statusTabs: { key: string; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'em_aberto', label: 'Em aberto' },
    { key: 'vencido', label: 'Vencido' },
    { key: 'pago', label: 'Pago' },
    { key: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" />
            Cobranças
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Contas a receber — controle de títulos por competência e status.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setIsImportOpen(true); setImportStep('upload'); setPreview([]); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={() => { resetBulk(); setIsBulkOpen(true); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
            Cobrança em Lote
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {statusTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
              {t.key !== 'todos' && (
                <span className="ml-1.5 opacity-70">
                  {cobrancas.filter(c => computeStatus(c) === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empresa, descrição, categoria..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-400">
            Carregando cobranças...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-900 dark:text-white">Nenhuma cobrança encontrada</p>
            <p className="text-sm text-slate-500 mt-1">{searchTerm || statusFilter !== 'todos' ? 'Tente outros filtros.' : 'Crie ou importe sua primeira cobrança.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {['Empresa', 'Competência', 'Vencimento', 'Valor', 'Descrição', 'Categoria', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(cob => {
                  const eff = cob._eff as Cobranca['status'];
                  const scfg = STATUS_CFG[eff];
                  return (
                    <tr key={cob.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">{displayName(cob)}</p>
                          {clientInfo(cob.clientId)?.document && (
                            <p className="text-xs text-slate-400 font-mono">{clientInfo(cob.clientId)!.document}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {cob.competencia ? compDisplay(cob.competencia) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={eff === 'vencido' ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>
                          {cob.dataVencimento ? new Date(cob.dataVencimento).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {moneyFmt.format(cob.valor)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[140px]">
                        <span className="truncate block">{cob.descricao}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {cob.categoriaFinanceira || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={cob.status}
                          onChange={e => handleStatusChange(cob.id, e.target.value as Cobranca['status'])}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${scfg.cls}`}
                        >
                          <option value="em_aberto">Em aberto</option>
                          <option value="pago">Pago</option>
                          <option value="vencido">Vencido</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {cob.status !== 'pago' && cob.status !== 'cancelado' && (
                            <>
                              <button
                                onClick={() => handleOpenEmail(cob)}
                                title="Enviar e-mail"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(cob.id, 'pago')}
                                title="Marcar como pago"
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(cob.id)}
                            title="Excluir"
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              {filtered.length} título(s) | Total filtrado: {moneyFmt.format(filtered.reduce((s,c) => s + c.valor, 0))}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[100]">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setIsAddOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="relative w-screen h-screen max-w-none sm:max-w-none top-0 left-0 translate-x-0 translate-y-0 bg-white dark:bg-slate-900 rounded-none shadow-2xl flex flex-col">

              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nova Cobrança</h2>
                <button onClick={() => setIsAddOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-5 overflow-y-auto flex-1">

                  {/* Cliente */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cliente *</label>
                    <select required value={addClientId} onChange={e => handleClientSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="">Selecione o cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia || c.name}{c.document ? ` — ${c.document}` : ''}</option>)}
                    </select>
                  </div>

                  {/* Descrição + Competência */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Descrição do Serviço *</label>
                      <input type="text" required value={addDesc} onChange={e => setAddDesc(e.target.value)}
                        placeholder="Ex: Mensalidade"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Competência (MM/AAAA) *</label>
                      <input type="text" required value={addComp} onChange={e => setAddComp(e.target.value)}
                        placeholder="08/2026"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                  </div>

                  {/* Vencimento + Valor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data de Vencimento *</label>
                      <input type="date" required value={addVenc} onChange={e => setAddVenc(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Valor (R$) *</label>
                      <input type="number" step="0.01" min="0" required value={addValor} onChange={e => setAddValor(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                  </div>

                  {/* Seletor de parcela — aparece somente se o cliente tiver parcelas */}
                  {(() => {
                    const selCl = clientInfo(addClientId);
                    if (!selCl?.valoresParcelas?.length) return null;
                    const totalVal = selCl.defaultAmount
                      ? String(selCl.defaultAmount)
                      : String(selCl.valoresParcelas.reduce((s, v) => s + v, 0));
                    return (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de cobrança</p>
                        <div className="flex gap-2">
                          {(['total', 'parcela'] as const).map(t => (
                            <button key={t} type="button"
                              onClick={() => {
                                setAddTipoCobrar(t);
                                if (t === 'total') {
                                  setAddValor(totalVal);
                                } else {
                                  setAddValor(String(selCl.valoresParcelas![addNumeroParcela - 1] ?? ''));
                                }
                              }}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                addTipoCobrar === t
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-400'
                              }`}
                            >
                              {t === 'total' ? 'Valor Total' : 'Parcela'}
                            </button>
                          ))}
                        </div>
                        {addTipoCobrar === 'parcela' && (
                          <select
                            value={addNumeroParcela}
                            onChange={e => {
                              const num = parseInt(e.target.value);
                              setAddNumeroParcela(num);
                              setAddValor(String(selCl.valoresParcelas![num - 1] ?? ''));
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            {selCl.valoresParcelas.map((v, i) => (
                              <option key={i} value={i + 1}>Parcela {i + 1} — {moneyFmt.format(v)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })()}

                  {/* Categoria + Forma */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Categoria Financeira *</label>
                      <select value={addCateg} onChange={e => setAddCateg(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                        <option value="">Selecione...</option>
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status *</label>
                    <select value={addStatus} onChange={e => setAddStatus(e.target.value as Cobranca['status'])}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="em_aberto">Em aberto</option>
                      <option value="pago">Pago</option>
                      <option value="vencido">Vencido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                    <textarea rows={2} value={addObs} onChange={e => setAddObs(e.target.value)}
                      placeholder="Informações adicionais..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 flex-shrink-0">
                  <button type="button" onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl">
                    Salvar Cobrança
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── IMPORT MODAL ── */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-[100]">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => { if (importStep === 'upload') setIsImportOpen(false); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="relative w-screen h-screen max-w-none sm:max-w-none top-0 left-0 translate-x-0 translate-y-0 bg-white dark:bg-slate-900 rounded-none shadow-2xl flex flex-col">

              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Importar Cobranças</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {importStep === 'upload' ? 'Selecione o arquivo — o sistema detecta o formato automaticamente.' : `Formato detectado: ${importFormat === 'horizontal' ? 'Planilha Horizontal (meses em colunas)' : 'Formato Vertical (uma linha por título)'}`}
                  </p>
                </div>
                <button onClick={() => { setIsImportOpen(false); setImportStep('upload'); setPreview([]); }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload step */}
              {importStep === 'upload' && (
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200 dark:border-indigo-800">
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Formato Vertical (Profissional)</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">Uma linha por título. Colunas: Cliente | Competência | Vencimento | Valor | Categoria...</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-800">
                      <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Formato Horizontal (Planilha Atual)</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">Uma linha por empresa, meses em colunas: AGO DIA | AGO VALOR | SET DIA | SET VALOR...</p>
                    </div>
                  </div>

                  {importFormat === 'horizontal' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Ano base (para colunas sem ano)</label>
                      <input type="number" value={importYear} onChange={e => setImportYear(e.target.value)} min="2020" max="2035"
                        className="w-32 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" />
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button onClick={handleDownloadTemplate}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl text-sm font-medium transition-colors self-start">
                      <Download className="w-4 h-4" />
                      Baixar modelo Cobranças (.xlsx)
                    </button>

                    <label className="flex flex-col items-center justify-center gap-3 px-4 py-10 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Clique para selecionar o arquivo</p>
                        <p className="text-xs text-slate-400 mt-0.5">.xlsx ou .xls — detecção automática do formato</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              )}

              {/* Preview step */}
              {importStep === 'preview' && (
                <>
                  <div className="p-4 mx-6 mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>{preview.filter(r => !r._clientFound).length}</strong> título(s) com cliente não encontrado na base.
                      Serão importados sem vínculo de cliente — cadastre o cliente depois e edite o título.
                      Clientes encontrados: <strong>{preview.filter(r => r._clientFound).length}</strong> de <strong>{preview.length}</strong>.
                    </p>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="overflow-auto flex-1 mx-1">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                            {['','Empresa','Competência','Vencimento','Valor','Descrição','Status','Cliente'].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap border-b border-slate-200 dark:border-slate-700">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {preview.map((row, i) => (
                            <tr key={i} className={`${row._remove ? 'opacity-40 line-through' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                              <td className="px-3 py-2">
                                <input type="checkbox" checked={!row._remove}
                                  onChange={e => setPreview(p => p.map((r,j) => j===i ? {...r, _remove: !e.target.checked} : r))}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600" />
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-900 dark:text-white whitespace-nowrap">{row._empresa}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.competencia ? compDisplay(row.competencia) : '—'}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {row.dataVencimento ? new Date(row.dataVencimento).toLocaleDateString('pt-BR') : '—'}
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{moneyFmt.format(row.valor ?? 0)}</td>
                              <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.descricao}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_CFG[(row.status ?? 'em_aberto') as Cobranca['status']].cls}`}>
                                  {STATUS_CFG[(row.status ?? 'em_aberto') as Cobranca['status']].label}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {row._clientFound
                                  ? <span className="text-green-600 dark:text-green-400">✓ Vinculado</span>
                                  : <span className="text-amber-500">⚠ Não encontrado</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 flex-shrink-0">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {preview.filter(r => !r._remove).length} de {preview.length} título(s) selecionados
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setImportStep('upload')}
                        className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl">
                        Voltar
                      </button>
                      <button onClick={handleConfirmImport} disabled={preview.filter(r => !r._remove).length === 0}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl">
                        Confirmar Importação
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BULK BILLING MODAL ── */}
      <AnimatePresence>
        {isBulkOpen && (
          <div className="fixed inset-0 z-[100]">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => { if (!isBulkSaving) { setIsBulkOpen(false); resetBulk(); } }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="relative w-screen h-screen max-w-none sm:max-w-none top-0 left-0 translate-x-0 translate-y-0 bg-white dark:bg-slate-900 rounded-none shadow-2xl flex flex-col">

              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cobrança em Lote</h2>
                  <div className="flex items-center gap-3 mt-2">
                    {(['clients', 'data'] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${bulkStep === s || (s === 'clients' && bulkStep === 'data') ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <span className={`text-xs font-medium ${bulkStep === s ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                          {s === 'clients' ? 'Selecionar Clientes' : 'Dados da Cobrança'}
                        </span>
                        {i === 0 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { if (!isBulkSaving) { setIsBulkOpen(false); resetBulk(); } }} disabled={isBulkSaving}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1 — Select Clients */}
              {bulkStep === 'clients' && (
                <>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Buscar cliente por nome ou CNPJ..."
                        value={bulkClientSearch} onChange={e => setBulkClientSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {/* Select all */}
                    <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 mb-2">
                      <input type="checkbox" checked={allBulkSelected} onChange={toggleAllBulk}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {allBulkSelected ? 'Desmarcar todos' : 'Selecionar todos'} ({filteredBulkClients.length})
                      </span>
                    </label>

                    {filteredBulkClients.length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-8">Nenhum cliente encontrado.</p>
                    )}

                    {filteredBulkClients.map(cl => {
                      const cts = getClientContactList(cl);
                      const hasEmail = cts.length > 0;
                      return (
                        <label key={cl.id} className={`flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors border ${
                          bulkSelectedClients.has(cl.id)
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-600'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}>
                          <input type="checkbox" checked={bulkSelectedClients.has(cl.id)} onChange={() => toggleBulkClient(cl.id)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cl.nomeFantasia || cl.name}</p>
                              {!hasEmail && (
                                <span className="text-xs text-amber-500 flex-shrink-0">⚠ sem e-mail</span>
                              )}
                            </div>
                            {cl.document && <p className="text-xs text-slate-400 font-mono">{cl.document}</p>}
                            {cts.map((ct, i) => (
                              <p key={i} className="text-xs text-slate-400">✉ {ct.email}</p>
                            ))}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 flex-shrink-0">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {bulkSelectedClients.size} cliente(s) selecionado(s)
                    </span>
                    <button
                      onClick={() => {
                        const init: Record<string, BulkClientForm> = {};
                        clients.filter((c: Client) => bulkSelectedClients.has(c.id)).forEach((cl: Client) => {
                          const hasParcelas = cl.valoresParcelas && cl.valoresParcelas.length > 0;
                          const valorInit = hasParcelas
                            ? String(cl.valoresParcelas![0])
                            : cl.defaultAmount ? String(cl.defaultAmount) : '';
                          init[cl.id] = {
                            descricao: cl.descricaoPadrao || '',
                            dataVencimento: clientNextDueDate(cl),
                            valor: valorInit,
                            categoriaFinanceira: cl.categoriaFinanceira || '',
                            status: 'em_aberto',
                            observacoes: '',
                            tipoCobrar: hasParcelas ? 'parcela' : 'total',
                            numeroParcela: hasParcelas ? 1 : undefined,
                          };
                        });
                        setBulkClientData(init);
                        setBulkStep('data');
                      }}
                      disabled={bulkSelectedClients.size === 0}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      Próximo →
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 — Preview + confirm */}
              {bulkStep === 'data' && (() => {
                const selectedList = clients.filter(c => bulkSelectedClients.has(c.id));
                const readyCount = selectedList.filter(cl => isClientFormComplete(bulkClientData[cl.id] ?? emptyBulkForm())).length;
                const missingCount = selectedList.length - readyCount;
                return (
                  <>
                    {/* Competência global */}
                    <div className="px-6 pt-5 pb-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Competência</label>
                        <input type="text" value={bulkCompetencia} onChange={e => setBulkCompetencia(e.target.value)}
                          placeholder="MM/AAAA"
                          className="w-36 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                        <span className="text-xs text-slate-400">Mês de referência aplicado a todas as cobranças</span>
                      </div>
                    </div>

                    {/* Client list */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedList.map(cl => {
                          const form = bulkClientData[cl.id] ?? emptyBulkForm();
                          const complete = isClientFormComplete(form);
                          const isOpen = bulkExpandedClient === cl.id;
                          return (
                            <div key={cl.id}>
                              <button type="button"
                                onClick={() => setBulkExpandedClient(isOpen ? null : cl.id)}
                                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${complete ? 'bg-green-500' : 'bg-amber-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{cl.nomeFantasia || cl.name}</p>
                                  {complete ? (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {form.descricao}
                                      {form.tipoCobrar === 'parcela' && form.numeroParcela ? ` · Parcela ${form.numeroParcela}` : ''}
                                      {form.categoriaFinanceira ? ` · ${form.categoriaFinanceira}` : ''}
                                      {form.dataVencimento ? ` · venc. ${new Date(form.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-amber-500">Dados incompletos — clique para preencher</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {complete && (
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {moneyFmt.format(parseMoney(form.valor))}
                                    </span>
                                  )}
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                              </button>
                              {isOpen && (
                                <div className="px-6 pb-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                                  <div className="pt-4 space-y-4">
                                    {/* Seletor de tipo de cobrança — apenas clientes parcelados */}
                                    {cl.valoresParcelas && cl.valoresParcelas.length > 0 && (() => {
                                      const totalVal = cl.defaultAmount
                                        ? String(cl.defaultAmount)
                                        : String(cl.valoresParcelas!.reduce((s: number, v: number) => s + v, 0));
                                      return (
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo de cobrança</p>
                                          <div className="flex gap-2">
                                            {(['total', 'parcela'] as const).map(t => (
                                              <button key={t} type="button"
                                                onClick={() => {
                                                  updateClientField(cl.id, 'tipoCobrar', t);
                                                  if (t === 'total') {
                                                    updateClientField(cl.id, 'valor', totalVal);
                                                    updateClientField(cl.id, 'numeroParcela', undefined);
                                                  } else {
                                                    const idx = (form.numeroParcela ?? 1) - 1;
                                                    updateClientField(cl.id, 'valor', String(cl.valoresParcelas![idx] ?? ''));
                                                  }
                                                }}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                  (form.tipoCobrar ?? 'total') === t
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-400'
                                                }`}
                                              >
                                                {t === 'total' ? 'Valor Total' : 'Parcela'}
                                              </button>
                                            ))}
                                          </div>
                                          {form.tipoCobrar === 'parcela' && (
                                            <select
                                              value={form.numeroParcela ?? 1}
                                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                const num = parseInt(e.target.value);
                                                updateClientField(cl.id, 'numeroParcela', num);
                                                updateClientField(cl.id, 'valor', String(cl.valoresParcelas![num - 1] ?? ''));
                                              }}
                                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                            >
                                              {cl.valoresParcelas!.map((v: number, i: number) => (
                                                <option key={i} value={i + 1}>Parcela {i + 1} — {moneyFmt.format(v)}</option>
                                              ))}
                                            </select>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {renderBulkForm(form, (field, value) => updateClientField(cl.id, field, value))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Email progress */}
                    {bulkProgress && (
                      <div className="mx-6 mb-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800 rounded-xl flex-shrink-0">
                        <div className="flex justify-between text-xs text-indigo-700 dark:text-indigo-300 mb-2">
                          <span>Enviando e-mails...</span>
                          <span>{bulkProgress.sent + bulkProgress.failed} / {bulkProgress.total}</span>
                        </div>
                        <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-2">
                          <div className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100}%` }} />
                        </div>
                        {bulkProgress.failed > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{bulkProgress.failed} cliente(s) sem e-mail</p>
                        )}
                      </div>
                    )}

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setBulkStep('clients')} disabled={isBulkSaving}
                          className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50">
                          ← Voltar
                        </button>
                        <span className="text-xs text-slate-500">
                          <span className="text-green-600 font-semibold">{readyCount} pronto{readyCount !== 1 ? 's' : ''}</span>
                          {missingCount > 0 && <span className="text-amber-500"> · {missingCount} incompleto{missingCount !== 1 ? 's' : ''}</span>}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleBulkCreate(false)}
                          disabled={isBulkSaving || !allClientsComplete()}
                          className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                          Salvar sem enviar
                        </button>
                        <button onClick={() => handleBulkCreate(true)}
                          disabled={isBulkSaving || !allClientsComplete()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                          {isBulkSaving
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</>
                            : <><Send className="w-4 h-4" />Salvar e enviar e-mails</>}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EMAIL MODAL ── */}
      <AnimatePresence>
        {isEmailOpen && (
          <div className="fixed inset-0 z-[110]">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => { if (!isSending) { setIsEmailOpen(false); setDocFile(null); setDocUrl(null); } }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="relative w-screen h-screen max-w-none sm:max-w-none top-0 left-0 translate-x-0 translate-y-0 bg-white dark:bg-slate-900 rounded-none shadow-2xl flex flex-col">

              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enviar lembrete por e-mail</h2>
                <button type="button" onClick={() => { if (!isSending) { setIsEmailOpen(false); setDocFile(null); setDocUrl(null); } }}
                  disabled={isSending} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendEmail} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {emailContacts.length > 1 ? (
                    <div>
                      <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Enviar para o contato</label>
                      <select
                        value={emailTo}
                        onChange={e => {
                          const ct = emailContacts.find(c => c.email === e.target.value);
                          setEmailTo(e.target.value);
                          if (ct) {
                            const cob = cobrancas.find(c => c.id === emailCobId);
                            const cl = cob ? clientInfo(cob.clientId) : null;
                            if (cob && cl) setEmailBody(buildBody(cob, cl, ct.name));
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        {emailContacts.map(ct => (
                          <option key={ct.email} value={ct.email}>
                            {ct.name} — {ct.email}{ct.phone ? ` | ${ct.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">
                      Para: <strong>{emailTo}</strong>
                      {emailContacts[0]?.name && <span className="text-slate-500"> ({emailContacts[0].name})</span>}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Assunto</label>
                    <input type="text" required value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-200">Mensagem</label>
                    <textarea required rows={12} value={emailBody} onChange={e => setEmailBody(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-200 flex items-center gap-2">
                      <Link className="w-4 h-4 text-indigo-500" /> Documento (botão no e-mail)
                    </label>
                    {!docFile ? (
                      <label className="flex flex-col items-center gap-2 px-4 py-4 bg-indigo-50 dark:bg-indigo-950/30 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
                        <UploadCloud className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Selecionar documento (PDF, imagem...)</span>
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => { setDocFile(e.target.files?.[0] ?? null); setDocUrl(null); }} />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 truncate">{docFile.name}</p>
                        </div>
                        {docUrl ? <span className="text-xs text-green-600 shrink-0">✓ Pronto</span>
                          : isUploading ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                          : <span className="text-xs text-indigo-500 shrink-0">Enviado ao clicar em Enviar</span>}
                        <button type="button" onClick={() => { setDocFile(null); setDocUrl(null); }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 flex-shrink-0">
                  <button type="button" disabled={isSending} onClick={() => { setIsEmailOpen(false); setDocFile(null); setDocUrl(null); }}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm rounded-xl">
                    {isSending ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</> : <><Send className="w-4 h-4" />Enviar e-mail</>}
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
