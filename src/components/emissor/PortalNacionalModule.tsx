import React, { useState, useEffect } from 'react';
import {
  PortalNacionalProvider, usePortal, usePortalTab,
  initialClienteState, initialEnderecoState, initialContatoState,
  initialBancarioState, initialFiscalState, initialContratoState,
  initialServicoTabState, initialImpostosState, initialTransparenciaState,
  initialReformaState, initialDpsState, initialPrestadorState,
  initialIntermediarioState, initialPagamentoState, initialEmailClienteState,
  initialXmlState, initialCancelamentoState, initialAnexosState,
  initialHistoricoFinanceiroState, initialUsuariosState, initialControleState,
} from './PortalNacionalContext';
import {
  ArrowLeft, Ban, Briefcase, Building2, Calculator, ChevronLeft, ChevronRight,
  ClipboardList, Code2, CreditCard, Eye, FileCheck2, FileKey2, FileText,
  History, Landmark, LayoutDashboard, LogOut, Mail, MapPin, Menu, Moon,
  Paperclip, Phone, ReceiptText, Scale, Shield, Sun, UserRound, Users, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PJUser } from '../../types';
import {
  UF_OPTIONS, PAIS_OPTIONS, MUNICIPIO_OPTIONS,
  SERVICO_NACIONAL_OPTIONS, NBS_OPTIONS,
  ANEXOS_OFICIAIS_META, getMunicipioByCodigo,
  getServicoNacionalByCodigo, getNbsByCodigo,
  getRegraIncidenciaByServico, onlyCodigo, type NfseOption,
} from './nfseOfficialTables';
import { supabase } from '../../lib/supabase';
import { ResendService } from '../../lib/resend';

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);
// ─── Tabela oficial IndOp IBS/CBS (Anexo C · v1-01-20260122) ─────────────────
// Fonte: anexo_c-indop_ibscbs-snnfse-v1-01-20260122.xlsx · Sheet IndOp
export const INDOP_OPTIONS: NfseOption[] = [
  { value: '020101', label: '020101 - Operação com bem imóvel relacionada a bem imóvel' },
  { value: '020201', label: '020201 - Serviço prestado fisicamente sobre bem imóvel' },
  { value: '020301', label: '020301 - Serviço de administração e intermediação de bem imóvel' },
  { value: '030101', label: '030101 - Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física' },
  { value: '030102', label: '030102 - Local do endereço do adquirente (Inc. III)' },
  { value: '030103', label: '030103 - Local do endereço do destinatário (Inc. III)' },
  { value: '030104', label: '030104 - Endereço diverso do fornecedor, adquirente ou destinatário (Inc. III)' },
  { value: '040101', label: '040101 - Serviço de planejamento, organização e administração de feiras, exposições, congressos e congêneres' },
  { value: '050101', label: '050101 - Serviço prestado fisicamente sobre bem móvel material' },
  { value: '050102', label: '050102 - Local do endereço do adquirente (Inc. V)' },
  { value: '050103', label: '050103 - Local do endereço do destinatário (Inc. V)' },
  { value: '050104', label: '050104 - Endereço diverso do fornecedor, adquirente ou destinatário (Inc. V)' },
  { value: '050201', label: '050201 - Serviços portuários' },
  { value: '060101', label: '060101 - Serviço de transporte de passageiros' },
  { value: '070101', label: '070101 - Serviço de transporte de carga (endereço de entrega)' },
  { value: '070102', label: '070102 - Serviço de transporte de carga (local da retirada)' },
  { value: '080101', label: '080101 - Serviço de exploração de via (NFS-e Via)' },
  { value: '100101', label: '100101 - Cessão de espaço para serviços publicitários — onerosas — domicílio do adquirente' },
  { value: '100102', label: '100102 - Cessão de espaço para serviços publicitários — onerosas — adquirente no exterior' },
  { value: '100201', label: '100201 - Cessão de espaço para serviços publicitários — não onerosas — domicílio do destinatário' },
  { value: '100301', label: '100301 - Demais serviços onerosos — domicílio principal do adquirente' },
  { value: '100302', label: '100302 - Demais serviços onerosos — adquirente no exterior' },
  { value: '100401', label: '100401 - Demais serviços não onerosos — domicílio principal do destinatário' },
  { value: '100501', label: '100501 - Demais bens imateriais onerosos — domicílio principal do adquirente' },
  { value: '100502', label: '100502 - Demais bens imateriais onerosos — adquirente no exterior' },
  { value: '100601', label: '100601 - Demais bens imateriais não onerosos — domicílio principal do destinatário' },
];

// ─── Tabela CST IBS/CBS (valores fixos RFB para NFS-e) ───────────────────────
export const CST_IBSCBS_OPTIONS: NfseOption[] = [
  { value: '01', label: '01 - Tributada integralmente' },
  { value: '02', label: '02 - Tributada com redução de alíquota' },
  { value: '03', label: '03 - Isenta' },
  { value: '04', label: '04 - Imune' },
  { value: '05', label: '05 - Suspensa' },
  { value: '06', label: '06 - Não incidência' },
  { value: '07', label: '07 - Diferimento' },
  { value: '08', label: '08 - Regime especial / Simples Nacional' },
  { value: '49', label: '49 - Outras' },
  { value: '50', label: '50 - Com crédito presumido' },
  { value: '51', label: '51 - Com crédito presumido e redução de alíquota' },
  { value: '99', label: '99 - Outras tributações' },
];

// ─── Tabela Classificação Tributária IBS/CBS ──────────────────────────────────
export const CLASS_TRIB_IBSCBS_OPTIONS: NfseOption[] = [
  { value: '01', label: '01 - Fornecimento a consumidor final pessoa física' },
  { value: '02', label: '02 - Fornecimento a consumidor final pessoa jurídica' },
  { value: '03', label: '03 - Fornecimento a contribuinte do IBS/CBS' },
  { value: '04', label: '04 - Fornecimento a ente governamental' },
  { value: '05', label: '05 - Exportação de serviço' },
  { value: '06', label: '06 - Fornecimento isento ou imune' },
  { value: '99', label: '99 - Outras classificações' },
];

// ─── Tabela exigibilidade ISS (enum DPS tribISSQN) ───────────────────────────
// Valores aceitos pelo campo tribISSQN no leiaute DPS (Anexo I)
const EXIGIBILIDADE_ISS_OPTIONS = [
  '1 - Exigível',
  '2 - Não incidência',
  '3 - Isenção',
  '4 - Exportação',
  '5 - Imunidade',
  '6 - Exig. suspensa judicial',
  '7 - Exig. suspensa admin.',
];

// Converte label do select para código numérico da DPS
function exigibilidadeParaCodigo(label: string): string {
  return label.charAt(0); // '1', '2', ... '7'
}

// ─── Retenção ISS: enum tpRetISSQN (XSD DPS v1.01) ───────────────────────────
// 1 = Não retido, 2 = Retido pelo tomador, 3 = Retido pelo intermediário
function tpRetISSQN(retido: boolean): '1' | '2' {
  return retido ? '2' : '1';
}

// ─── Extrai código ISO-2 do país (ex: "BR - Brasil" → "BR") ──────────────────
function extrairCodigoPais(valor: string): string {
  if (!valor) return 'BR';
  const clean = valor.trim();
  if (clean.length === 2) return clean;
  return clean.slice(0, 2).toUpperCase();
}

// ─── NBS: manter formato com pontos conforme Anexo B (ex: 1.0101.11.00) ──────
function formatarNbs(raw: string): string {
  const nbs = getNbsByCodigo(raw);
  return nbs?.codigo || '';
}

// ─── CEP / CNPJ lookup ───────────────────────────────────────────────────────
async function buscarCep(cep: string): Promise<{
  logradouro: string; bairro: string; municipio: string; uf: string; ibge: string;
} | null> {
  const c = cep.replace(/\D/g, '');
  if (c.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.erro) return null;
    return { logradouro: d.logradouro || '', bairro: d.bairro || '', municipio: d.localidade || '', uf: d.uf || '', ibge: d.ibge || '' };
  } catch { return null; }
}

async function buscarCnpj(cnpj: string): Promise<{
  razao_social: string; nome_fantasia: string; email: string;
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; municipio: string; uf: string;
} | null> {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`);
    if (!r.ok) return null;
    const d = await r.json();
    return {
      razao_social: d.razao_social || '', nome_fantasia: d.nome_fantasia || '', email: d.email || '',
      cep: (d.cep || '').replace(/\D/g, ''), logradouro: d.logradouro || '',
      numero: d.numero || '', complemento: d.complemento || '',
      bairro: d.bairro || '', municipio: d.municipio || '', uf: d.uf || '',
    };
  } catch { return null; }
}

// ─── Validação CNPJ ──────────────────────────────────────────────────────────
function validarCnpj(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;

  const calc = (base: string, pesos: number[]) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i]) * pesos[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  return calc(c.slice(0, 12), pesos1) === parseInt(c[12]) &&
    calc(c.slice(0, 13), pesos2) === parseInt(c[13]);
}

function validarCpf(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (s: string, n: number) => {
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum += parseInt(s[i]) * (n - i);
    const r = (sum * 10) % 11;
    return r === 10 || r === 11 ? 0 : r;
  };
  return calc(c.slice(0, 9), 10) === parseInt(c[9]) &&
    calc(c.slice(0, 10), 11) === parseInt(c[10]);
}

// ─── Helpers de serviço ───────────────────────────────────────────────────────
function normalizarCodigo(value: unknown): string {
  if (value === null || value === undefined) return '';
  return onlyCodigo(String(value));
}

function normalizarCodigoTribNac(value: unknown): string {
  const codigo = normalizarCodigo(value).replace(/\D/g, '');
  return codigo ? codigo.padStart(6, '0').slice(-6) : '';
}

function primeiroValorTexto(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) { const n = primeiroValorTexto(...value); if (n) return n; continue; }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      const n = primeiroValorTexto(obj.codigo, obj.value, obj.codigo_nbs, obj.nbs_codigo, obj.nbs, obj.id);
      if (n) return n; continue;
    }
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function localizarNbsOficial(raw: unknown): string {
  const raw_str = String(raw ?? '').trim();
  if (!raw_str) return '';
  // Tenta pela tabela oficial (retorna com pontos)
  const direto = getNbsByCodigo(raw_str);
  if (direto?.codigo) return direto.codigo;
  const digitsOnly = raw_str.replace(/\D/g, '');
  return digitsOnly.length === 9 ? formatarNbs(raw_str) : '';
}

function resolverNbsVinculado(servico: unknown, servicoSelecionado: string): string {
  const s = (servico ?? {}) as Record<string, unknown>;
  const nbsDireto = primeiroValorTexto(s.codigo_nbs, s.nbs_codigo, s.nbs, s.codigoNbs, s.nbsCodigo, s.nbs_oficial);
  return localizarNbsOficial(nbsDireto || '');
}

function resolverCnaeVinculado(servico: unknown): string {
  const s = (servico ?? {}) as Record<string, unknown>;
  const cnaeDireto = primeiroValorTexto(s.codigo_cnae, s.cnae_codigo, s.cnae, s.codigoCnae);
  return cnaeDireto ? normalizarCodigo(cnaeDireto) : '';
}

// ─── Tipos e menu ─────────────────────────────────────────────────────────────
interface PortalNacionalModuleProps {
  user: PJUser;
  onExit: (tab?: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

type PortalTab =
  | 'emitir_nfse' | 'whatsapp' | 'cliente' | 'endereco' | 'contato' | 'bancario'
  | 'fiscal' | 'contrato' | 'servico' | 'impostos' | 'transparencia'
  | 'reforma' | 'dps' | 'prestador' | 'intermediario' | 'pagamento'
  | 'email_cliente' | 'xml' | 'cancelamento' | 'anexos'
  | 'historico_financeiro' | 'historico_alteracoes' | 'usuarios' | 'controle';

type PortalMenuGroup = { title: string; items: { id: PortalTab; label: string; icon: React.ElementType }[] };

const groupedMenu: PortalMenuGroup[] = [
  { title: 'Emissão', items: [{ id: 'emitir_nfse', label: 'Emitir NFS-e', icon: ReceiptText }] },
  { title: 'WhatsApp', items: [{ id: 'whatsapp', label: 'WhatsApp', icon: WhatsappIcon }] },
  { title: 'Controle', items: [{ id: 'controle', label: 'Controle de Notas', icon: LayoutDashboard }] },
  { title: 'Cadastros', items: [{ id: 'cliente', label: 'Clientes', icon: Users }, { id: 'servico', label: 'Serviços', icon: Briefcase }, { id: 'prestador', label: 'Prestador', icon: Building2 }] },
  { title: 'Fiscal', items: [{ id: 'impostos', label: 'Impostos e Retenções', icon: Calculator }, { id: 'fiscal', label: 'Dados Fiscais', icon: FileText }, { id: 'reforma', label: 'IBS/CBS', icon: Scale }] },
  { title: 'Financeiro', items: [{ id: 'pagamento', label: 'Financeiro', icon: CreditCard }, { id: 'historico_financeiro', label: 'Histórico Financeiro', icon: History }, { id: 'anexos', label: 'Anexos', icon: Paperclip }] },
  { title: 'Configurações', items: [{ id: 'usuarios', label: 'Usuários', icon: Shield }] },
];

const tabTitles: Record<PortalTab, string> = {
  emitir_nfse: 'Emitir NFS-e', whatsapp: 'WhatsApp', cliente: 'Clientes', endereco: 'Endereço',
  contato: 'Telefones e E-mail', bancario: 'Dados Bancários', fiscal: 'Dados Fiscais',
  contrato: 'Contratos', servico: 'Serviços', impostos: 'Impostos e Retenções',
  transparencia: 'Lei da Transparência', reforma: 'Reforma Tributária - IBS/CBS',
  dps: 'DPS Técnica / NFS-e Nacional', prestador: 'Prestador', intermediario: 'Intermediário',
  pagamento: 'Financeiro', email_cliente: 'E-mail para o Cliente',
  xml: 'XML / API / Retorno', cancelamento: 'Cancelamento / Substituição',
  anexos: 'Anexos', historico_financeiro: 'Histórico Financeiro',
  historico_alteracoes: 'Histórico de Alterações / Auditoria',
  usuarios: 'Usuário do Sistema', controle: 'Controle da Nota',
};

// ─── Componentes de formulário ────────────────────────────────────────────────
function FI({ label, value, onChange, type = 'text', placeholder = '', disabled = false, full = false }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'col-span-full' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-50" />
    </label>
  );
}

function FS({ label, value, onChange, options, full = false }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'col-span-full' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function FDL({ label, value, onChange, options, placeholder = '', full = false }: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly NfseOption[]; placeholder?: string; full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = query.toLowerCase();
  const filtered = q.length < 1
    ? options.slice(0, 120)
    : options.filter(o => o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)).slice(0, 80);

  const select = (o: NfseOption) => { onChange(o.value); setQuery(''); setOpen(false); };

  function highlight(text: string) {
    if (!q) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return <>{text}</>;
    return <>{text.slice(0, idx)}<mark className="bg-cyan-100 text-cyan-800 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>;
  }

  function splitOption(raw: string) {
    const sep = raw.indexOf(' - ');
    if (sep === -1) return { code: raw, name: '' };
    return { code: raw.slice(0, sep), name: raw.slice(sep + 3) };
  }

  return (
    <div className={`relative ${full ? 'col-span-full' : ''}`} ref={ref}>
      <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <div className="relative">
        <input type="text" value={open ? query : value}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        <button type="button" tabIndex={-1} onClick={() => { setOpen(o => !o); setQuery(''); }}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
          <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Nenhum resultado</p>
          ) : filtered.map(o => {
            const { code, name } = splitOption(o.label || o.value);
            const active = value === o.value;
            return (
              <button key={o.value} type="button" onMouseDown={() => select(o)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-cyan-50 dark:hover:bg-cyan-500/10 ${active ? 'bg-cyan-50 dark:bg-cyan-500/10' : ''}`}>
                <span className={`shrink-0 font-mono text-xs font-bold ${active ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  {highlight(code)}
                </span>
                <span className={`truncate text-sm ${active ? 'font-semibold text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-200'}`}>
                  {highlight(name || code)}
                </span>
                {active && (
                  <svg className="ml-auto h-4 w-4 shrink-0 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OfficialAnexosBadge() {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs text-cyan-900 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
      <p className="font-extrabold">Tabelas oficiais SEFIN integradas (versão jan–fev/2026)</p>
      <p className="mt-1">
        Municípios: {ANEXOS_OFICIAIS_META.anexoA.municipios} · Países: {ANEXOS_OFICIAIS_META.anexoA.paises} · Serviços: {ANEXOS_OFICIAIS_META.anexoB.servicosNacionais} · NBS: {ANEXOS_OFICIAIS_META.anexoB.nbs} · IndOp IBS/CBS: {INDOP_OPTIONS.length}
      </p>
    </div>
  );
}

function FC({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </div>
  );
}

function FTA({ label, value, onChange, mono = false, rows = 3, full = false }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; rows?: number; full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'col-span-full' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className={`w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 ${mono ? 'font-mono text-xs' : ''}`} />
    </label>
  );
}

function Card({ title, children, cols = 2 }: { title?: string; children: React.ReactNode; cols?: number }) {
  const colClass = cols === 1 ? '' : cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {title && <h3 className="mb-5 font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
      <div className={`grid gap-4 ${colClass}`}>{children}</div>
    </div>
  );
}

function PH({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function SaveBtn({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  const handle = () => { onSave(); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div className="flex justify-end">
      <button type="button" onClick={handle}
        className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}>
        {saved ? '✓ Salvo' : 'Salvar'}
      </button>
    </div>
  );
}

function TaxGroup({ label, aliquota, setAliquota, valor, setValor, retido, setRetido }: {
  label: string; aliquota: number; setAliquota: (v: string) => void;
  valor: number; setValor: (v: string) => void; retido: boolean; setRetido: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <FI label="Alíquota (%)" value={aliquota} onChange={setAliquota} type="number" />
        <FI label="Valor (R$)" value={valor} onChange={setValor} type="number" />
      </div>
      <FC label={`${label} Retido`} checked={retido} onChange={setRetido} />
    </div>
  );
}

// ─── Wizard de Emissão ────────────────────────────────────────────────────────
const CNAO_NIF_OPTIONS: NfseOption[] = [
  { value: '0', label: '0 - Não informado na nota de origem' },
  { value: '1', label: '1 - Dispensado do NIF' },
  { value: '2', label: '2 - Não exigência do NIF' },
];

type EmissaoStep = 0 | 1 | 2 | 3 | 4 | 5;

const emissaoSteps = [
  { title: 'Tomador', subtitle: 'Quem vai receber a nota?', icon: Users },
  { title: 'Serviço', subtitle: 'O que foi prestado?', icon: Briefcase },
  { title: 'Tributação', subtitle: 'Como será tributado?', icon: Scale },
  { title: 'Valores', subtitle: 'Valor da nota e retenções.', icon: Calculator },
  { title: 'Revisão', subtitle: 'Conferir antes de emitir.', icon: Eye },
  { title: 'Emissão', subtitle: 'Enviar para o Portal Nacional.', icon: ReceiptText },
];

const initialEmissaoForm = {
  // Tomador
  tomador_tipo_pessoa: '',
  tomador_cpf_cnpj: '',
  tomador_razao_social: '',
  tomador_nome_fantasia: '',
  tomador_email: '',
  tomador_telefone: '',
  tomador_cep: '',
  tomador_logradouro: '',
  tomador_numero: '',
  tomador_complemento: '',
  tomador_bairro: '',
  tomador_municipio: '',
  tomador_codigo_municipio_ibge: '',
  tomador_uf: '',
  tomador_pais: 'BR - Brasil',
  // cNaoNIF tomador: '0' = não informado na nota, '1' = não obrigado
  tomador_c_nao_nif: '0',

  // Serviço
  servico_favorito: '',
  servico_codigo_tributacao_nacional: '',
  servico_codigo_municipal: '',
  servico_codigo_cnae: '',
  servico_codigo_nbs: '',
  servico_descricao: '',
  servico_municipio_prestacao: '',
  servico_codigo_municipio_prestacao_ibge: '',
  servico_municipio_incidencia: '',
  servico_codigo_municipio_incidencia_ibge: '',

  // Tributação
  tributacao_exigibilidade_iss: '',
  tributacao_natureza_operacao: '',
  tributacao_iss_retido: false,
  tributacao_optante_simples: false,
  tributacao_regime_especial: '',
  tributacao_incentivo_fiscal: false,
  tributacao_intermediario_existe: false,
  tributacao_intermediario_cpf_cnpj: '',
  tributacao_intermediario_razao_social: '',
  tributacao_intermediario_inscricao_municipal: '',
  // IBS/CBS
  tributacao_aplicar_reforma: false,
  tributacao_cst_ibs_cbs: '',
  tributacao_classificacao_tributaria: '',
  tributacao_indicador_operacao: '',
  tributacao_finalidade_nfse: '1',   // finNFSe: 1=Normal, 2=Complementar, 3=Cancelamento
  tributacao_ind_dest: '0',           // indDest: 0=tomador é destinatário, 1=destinatário diferente

  // Valores
  valor_quantidade: '1',
  valor_unitario: '0',
  valor_servico: '0',
  valor_deducoes: '0',
  valor_desconto_incondicionado: '0',
  valor_desconto_condicionado: '0',
  valor_base_calculo: '0',
  aliquota_iss: '0',
  valor_iss: '0',
  // Retenções federais
  aliquota_ir: '0',
  valor_ir: '0',
  aliquota_csll: '0',
  valor_csll: '0',
  aliquota_inss: '0',
  valor_inss: '0',
  aliquota_pis: '0',
  valor_pis: '0',
  aliquota_cofins: '0',
  valor_cofins: '0',
  valor_liquido: '0',
  // Transparência fiscal (totTrib — obrigatório no Anexo I)
  tot_trib_fed: '0',    // pTotTribFed
  tot_trib_est: '0',    // pTotTribEst
  tot_trib_mun: '0',    // pTotTribMun

  // Emissão
  emissao_ambiente: 'Homologação',
  emissao_data_emissao: '',
  emissao_competencia: '',
  emissao_observacao: '',
  emissao_enviar_email: true,
  emissao_enviar_xml: true,
  emissao_enviar_pdf: true,
};

function StepProgress({ step, setStep }: { step: EmissaoStep; setStep: (s: EmissaoStep) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-2 md:grid-cols-6">
        {emissaoSteps.map((item, index) => {
          const Icon = item.icon;
          const active = step === index;
          const done = step > index;
          return (
            <button key={item.title} type="button" onClick={() => setStep(index as EmissaoStep)}
              className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300' : done ? 'border-cyan-200 bg-white text-slate-700 dark:border-cyan-500/20 dark:bg-slate-900 dark:text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950'}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold ${active || done ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                  {index + 1}
                </span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-extrabold">{item.title}</p>
              <p className="mt-0.5 hidden text-[11px] leading-tight opacity-80 xl:block">{item.subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RequiredHint() {
  return <p className="text-xs text-slate-500">Campos com * são obrigatórios para emissão (ocorrência 1-1 no leiaute DPS).</p>;
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
      <p className="font-extrabold">Revise antes de continuar:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map(e => <li key={e}>{e}</li>)}
      </ul>
    </div>
  );
}

const n = (v: string | number) => Number(v || 0);
const money = (v: number) => Number.isFinite(v) ? v.toFixed(2) : '0.00';

function WizardActions({ step, setStep, onNext, onReset }: {
  step: EmissaoStep; setStep: (s: EmissaoStep) => void; onNext: () => void; onReset: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" disabled={step === 0}
        onClick={() => { setStep(Math.max(0, step - 1) as EmissaoStep); }}
        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
        Voltar
      </button>
      <button type="button" onClick={step === 5 ? onReset : onNext}
        className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-700">
        {step === 4 ? 'Ir para emissão' : step === 5 ? 'Nova emissão' : 'Próximo'}
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right text-slate-800 dark:text-slate-100">{typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value || '-'}</span>
    </div>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

// ─── Wizard principal ─────────────────────────────────────────────────────────
function EmissaoWizard() {
  const [step, setStep] = useState<EmissaoStep>(0);
  const [f, setF] = useState(initialEmissaoForm);
  const [errors, setErrors] = useState<string[]>([]);
  const s = (k: keyof typeof initialEmissaoForm) => (v: string) => setF(p => ({ ...p, [k]: v }));
  const sb = (k: keyof typeof initialEmissaoForm) => (v: boolean) => setF(p => ({ ...p, [k]: v }));

  const ctx = usePortal();
  const [emitindo, setEmitindo] = useState(false);
  const [emissaoResultado, setEmissaoResultado] = useState<{
    jobId: string; dpsId: string;
    status: 'fila' | 'processando' | 'autorizada' | 'erro' | 'timeout';
    notaId?: string; numeroNfse?: string; chaveAcesso?: string;
    codigoVerificacao?: string; xmlPath?: string; danfsePath?: string; mensagemErro?: string;
  } | null>(null);
  const realtimeChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => () => { realtimeChannelRef.current?.unsubscribe(); }, []);

  // CEP auto-fill tomador
  useEffect(() => {
    const cep = f.tomador_cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    let active = true;
    buscarCep(cep).then(r => {
      if (!active || !r) return;
      setF(p => ({
        ...p,
        tomador_logradouro: r.logradouro || p.tomador_logradouro,
        tomador_bairro: r.bairro || p.tomador_bairro,
        tomador_municipio: r.municipio || p.tomador_municipio,
        tomador_codigo_municipio_ibge: r.ibge || p.tomador_codigo_municipio_ibge,
        tomador_uf: r.uf || p.tomador_uf,
      }));
    });
    return () => { active = false; };
  }, [f.tomador_cep]);

  // CNPJ auto-fill tomador PJ
  useEffect(() => {
    const cnpj = f.tomador_cpf_cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || f.tomador_tipo_pessoa !== 'Pessoa Jurídica') return;
    const timer = setTimeout(async () => {
      const r = await buscarCnpj(cnpj);
      if (!r) return;
      setF(p => ({
        ...p,
        tomador_razao_social: r.razao_social || p.tomador_razao_social,
        tomador_nome_fantasia: r.nome_fantasia || p.tomador_nome_fantasia,
        tomador_email: r.email || p.tomador_email,
        tomador_cep: r.cep || p.tomador_cep,
        tomador_logradouro: r.logradouro || p.tomador_logradouro,
        tomador_numero: r.numero || p.tomador_numero,
        tomador_complemento: r.complemento || p.tomador_complemento,
        tomador_bairro: r.bairro || p.tomador_bairro,
        tomador_municipio: r.municipio || p.tomador_municipio,
        tomador_uf: r.uf || p.tomador_uf,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [f.tomador_cpf_cnpj, f.tomador_tipo_pessoa]);

  // Setters especializados
  const setTomadorMunicipio = (value: string) => {
    const m = getMunicipioByCodigo(value);
    setF(p => ({
      ...p,
      tomador_municipio: m ? m.municipio : value,
      tomador_codigo_municipio_ibge: m?.codigo ?? p.tomador_codigo_municipio_ibge,
      tomador_uf: m?.uf ?? p.tomador_uf,
    }));
  };

  const setMunicipioPrestacao = (value: string) => {
    const m = getMunicipioByCodigo(value);
    setF(p => ({
      ...p,
      servico_municipio_prestacao: m ? m.municipio : value,
      servico_codigo_municipio_prestacao_ibge: m?.codigo ?? p.servico_codigo_municipio_prestacao_ibge,
      servico_municipio_incidencia: p.servico_municipio_incidencia || (m ? m.municipio : value),
      servico_codigo_municipio_incidencia_ibge: p.servico_codigo_municipio_incidencia_ibge || m?.codigo || '',
      servico_codigo_municipal: '',
    }));
  };

  const setMunicipioIncidencia = (value: string) => {
    const m = getMunicipioByCodigo(value);
    setF(p => ({
      ...p,
      servico_municipio_incidencia: m ? m.municipio : value,
      servico_codigo_municipio_incidencia_ibge: m?.codigo ?? p.servico_codigo_municipio_incidencia_ibge,
      servico_codigo_municipal: '',
    }));
  };

  const setServicoNacional = (value: string) => {
    const servico = getServicoNacionalByCodigo(value);
    const regra = getRegraIncidenciaByServico(value);
    const codigoTributacaoNacional = normalizarCodigoTribNac(servico?.codigo ?? value);
    const cnaeVinculado = resolverCnaeVinculado(servico);
    const nbsVinculado = resolverNbsVinculado(servico, value);
    setF(p => ({
      ...p,
      servico_favorito: value,
      servico_codigo_tributacao_nacional: codigoTributacaoNacional,
      servico_codigo_cnae: cnaeVinculado || p.servico_codigo_cnae,
      servico_codigo_nbs: nbsVinculado || p.servico_codigo_nbs,
      servico_descricao: servico?.descricao ?? p.servico_descricao,
      tributacao_natureza_operacao: regra?.lp ? 'Tributação no local da prestação' : p.tributacao_natureza_operacao,
      servico_codigo_municipal: '',
    }));
  };

  const setNbsOficial = (value: string) => {
    const nbs = getNbsByCodigo(value);
    setF(p => ({ ...p, servico_codigo_nbs: nbs?.codigo || '' }));
  };

  const setIndicadorOperacao = (value: string) => {
    setF(p => ({ ...p, tributacao_indicador_operacao: value }));
  };

  // Cálculos de valores
  const valorBruto = n(f.valor_quantidade) * n(f.valor_unitario);
  const baseCalculoCalculada = Math.max(0, valorBruto - n(f.valor_deducoes) - n(f.valor_desconto_incondicionado) - n(f.valor_desconto_condicionado));
  const valorIssCalculado = baseCalculoCalculada * (n(f.aliquota_iss) / 100);
  const totalRetencoes =
    n(f.valor_ir) + n(f.valor_csll) + n(f.valor_inss) + n(f.valor_pis) + n(f.valor_cofins) +
    (f.tributacao_iss_retido ? valorIssCalculado : 0);
  const valorLiquidoCalculado = Math.max(0, valorBruto - totalRetencoes);
  // totTrib calculado automaticamente se não preenchido manualmente
  const pTotTribMunCalc = n(f.aliquota_iss);
  const pTotTribFedCalc = n(f.aliquota_ir) + n(f.aliquota_csll) + n(f.aliquota_inss) + n(f.aliquota_pis) + n(f.aliquota_cofins);
  const pTotTribFedFinal = n(f.tot_trib_fed) || pTotTribFedCalc;
  const pTotTribMunFinal = n(f.tot_trib_mun) || pTotTribMunCalc;
  const pTotTribEstFinal = n(f.tot_trib_est);

  // Validação por step
  const required = (label: string, value: string) => value?.trim() ? [] : [label];

  const validateStep = (targetStep = step): string[] => {
    const missing: string[] = [];

    if (targetStep === 0) {
      missing.push(...required('Tipo de Pessoa', f.tomador_tipo_pessoa));
      missing.push(...required('CPF/CNPJ do Tomador', f.tomador_cpf_cnpj));
      // Validação de dígitos verificadores
      const docLimpo = f.tomador_cpf_cnpj.replace(/\D/g, '');
      if (docLimpo.length === 14 && !validarCnpj(f.tomador_cpf_cnpj)) missing.push('CNPJ do Tomador inválido (dígitos verificadores)');
      if (docLimpo.length === 11 && !validarCpf(f.tomador_cpf_cnpj)) missing.push('CPF do Tomador inválido (dígitos verificadores)');
      missing.push(...required('Razão Social/Nome do Tomador', f.tomador_razao_social));
      missing.push(...required('CEP', f.tomador_cep));
      missing.push(...required('Logradouro', f.tomador_logradouro));
      missing.push(...required('Número', f.tomador_numero));
      missing.push(...required('Bairro', f.tomador_bairro));
      missing.push(...required('Município', f.tomador_municipio));
      missing.push(...required('Código IBGE do Município', f.tomador_codigo_municipio_ibge));
      if (f.tomador_codigo_municipio_ibge && f.tomador_codigo_municipio_ibge.replace(/\D/g, '').length !== 7)
        missing.push('Código IBGE deve ter 7 dígitos');
      missing.push(...required('UF', f.tomador_uf));
      missing.push(...required('País', f.tomador_pais));
    }

    if (targetStep === 1) {
      missing.push(...required('Código de Tributação Nacional (cTribNac)', f.servico_codigo_tributacao_nacional));
      if (f.servico_codigo_tributacao_nacional && !/^\d{6}$/.test(f.servico_codigo_tributacao_nacional))
        missing.push('Código de Tributação Nacional deve ter 6 dígitos');
      if (f.servico_codigo_nbs && f.servico_codigo_nbs.replace(/\D/g, '').length !== 9)
        missing.push('NBS, quando informado, deve ser um código final com 9 dígitos');
      if (f.servico_codigo_municipal && !/^\d{3}$/.test(f.servico_codigo_municipal))
        missing.push('Código Municipal do Serviço (cTribMun), quando informado, deve ter exatamente 3 dígitos');
      missing.push(...required('Município de Prestação', f.servico_municipio_prestacao));
      missing.push(...required('Código IBGE da Prestação', f.servico_codigo_municipio_prestacao_ibge));
      missing.push(...required('Descrição do Serviço', f.servico_descricao));
    }

    if (targetStep === 2) {
      missing.push(...required('Exigibilidade do ISS', f.tributacao_exigibilidade_iss));
      if (f.tributacao_intermediario_existe) {
        missing.push(...required('CPF/CNPJ do Intermediário', f.tributacao_intermediario_cpf_cnpj));
        missing.push(...required('Razão Social do Intermediário', f.tributacao_intermediario_razao_social));
      }
      if (f.tributacao_aplicar_reforma) {
        missing.push(...required('CST IBS/CBS', f.tributacao_cst_ibs_cbs));
        missing.push(...required('Classificação Tributária IBS/CBS', f.tributacao_classificacao_tributaria));
        missing.push(...required('Indicador de Operação (IndOp)', f.tributacao_indicador_operacao));
        if (f.tributacao_indicador_operacao && f.tributacao_indicador_operacao.length !== 6)
          missing.push('Indicador de Operação deve ter 6 dígitos (formato XXXXXX)');
      }
    }

    if (targetStep === 3) {
      if (n(f.valor_quantidade) <= 0) missing.push('Quantidade maior que zero');
      if (n(f.valor_unitario) <= 0) missing.push('Valor unitário maior que zero');
      if (valorBruto <= 0) missing.push('Valor do serviço maior que zero');
      if (baseCalculoCalculada <= 0) missing.push('Base de cálculo maior que zero');
    }

    if (targetStep === 5) {
      missing.push(...required('Ambiente', f.emissao_ambiente));
      missing.push(...required('Data de Emissão', f.emissao_data_emissao));
      missing.push(...required('Competência', f.emissao_competencia));
    }

    return missing;
  };

  const goToStep = (target: EmissaoStep) => {
    if (target <= step) { setErrors([]); setStep(target); return; }
    for (let current = step; current < target; current++) {
      const stepErrors = validateStep(current as EmissaoStep);
      if (stepErrors.length) { setErrors(stepErrors); setStep(current as EmissaoStep); return; }
    }
    setErrors([]); setStep(target);
  };

  const nextStep = () => {
    const stepErrors = validateStep();
    if (stepErrors.length) { setErrors(stepErrors); return; }
    setErrors([]);
    setStep(Math.min(5, step + 1) as EmissaoStep);
  };

  const resetWizard = () => {
    setF({ ...initialEmissaoForm });
    setErrors([]);
    setEmissaoResultado(null);
    setStep(0);
  };

  // ─── Emissão ────────────────────────────────────────────────────────────────
  const emitirNfse = async () => {
    const allErrors: string[] = [];
    for (let i = 0; i <= 5; i++) allErrors.push(...validateStep(i as EmissaoStep));

    const emitente_id = ctx.prestador.prestador_id;
    if (!emitente_id) allErrors.push('Prestador não registrado — acesse a aba Prestador e clique em "Registrar Emitente"');
    if (!ctx.prestador.prestador_codigo_municipio_ibge) allErrors.push('Código IBGE do município do Prestador obrigatório');

    // Validar CNPJ do prestador
    const cnpjPrestador = ctx.prestador.prestador_cnpj?.replace(/\D/g, '') || '';
    if (cnpjPrestador.length !== 14 || !validarCnpj(ctx.prestador.prestador_cnpj)) {
      allErrors.push('CNPJ do Prestador inválido');
    }

    if (allErrors.length) { setErrors(allErrors); return; }

    setErrors([]);
    setEmitindo(true);
    setEmissaoResultado(null);

    try {
      const { data: emitter, error: emitterError } = await supabase
        .from('nfse_emitentes')
        .select('serie_dps, ambiente, codigo_municipio_ibge')
        .eq('id', emitente_id)
        .single();
      if (emitterError || !emitter) throw new Error('Emitente não encontrado. Registre o prestador novamente.');

      // ─── Número DPS sequencial via banco ─────────────────────────────────
      // IMPORTANTE: em produção usar uma sequence no PostgreSQL com lock por emitente.
      // Esta chamada via rpc garante atomicidade (sem duplicidade de número).
      const { data: seqData, error: seqError } = await supabase
        .rpc('nfse_proximo_numero_dps', { p_emitente_id: emitente_id });
      if (seqError || !seqData) {
        // Fallback: timestamp + random (NÃO usar em produção alta escala)
        console.warn('[emitirNfse] rpc nfse_proximo_numero_dps indisponível, usando fallback');
      }
      const _numero = seqData ?? Date.now();

      // ─── Código país ISO-2 (extrair "BR" de "BR - Brasil") ───────────────
      const cPaisTomador = extrairCodigoPais(f.tomador_pais);

      // ─── NBS com pontos (1.XXXX.XX.XX) ───────────────────────────────────
      const cNBS = formatarNbs(f.servico_codigo_nbs);

      // ─── Payload completo conforme Anexo I v1-01-20260209 ─────────────────
      const payload = {
        emitente_id,
        serie: emitter.serie_dps || '1',
        numero: _numero,

        // cLocEmi obrigatório (1-1): IBGE do emitente/prestador
        codigo_localidade_emissao: emitter.codigo_municipio_ibge || ctx.prestador.prestador_codigo_municipio_ibge,

        // tpEmit: 1=Prestador, 2=Tomador, 3=Intermediário (quase sempre 1)
        tipo_emitente: '1',

        competencia: f.emissao_competencia
          ? f.emissao_competencia.length === 7
            ? f.emissao_competencia + '-01'
            : f.emissao_competencia
          : (() => { throw new Error('Competência é obrigatória'); })(),

        ambiente: f.emissao_ambiente === 'Produção' ? 'producao' : 'homologacao',

        // Serviço
        codigo_servico_nacional: normalizarCodigoTribNac(f.servico_codigo_tributacao_nacional), // cTribNac
        codigo_tributacao_nacional: normalizarCodigoTribNac(f.servico_codigo_tributacao_nacional),
        codigo_servico_municipal: f.servico_codigo_municipal || null,    // cTribMun opcional, 3 dígitos
        codigo_cnae: f.servico_codigo_cnae || null,
        codigo_nbs: cNBS || null,                                        // cNBS com pontos
        municipio_incidencia_ibge: f.servico_codigo_municipio_incidencia_ibge || f.servico_codigo_municipio_prestacao_ibge,
        municipio_prestacao_ibge: f.servico_codigo_municipio_prestacao_ibge,
        descricao_servico: f.servico_descricao,
        valor_servico: n(valorBruto),

        // Valores completos
        valores: {
          quantidade: n(f.valor_quantidade),
          valor_unitario: n(f.valor_unitario),
          deducoes: n(f.valor_deducoes),
          desconto_incondicionado: n(f.valor_desconto_incondicionado),
          desconto_condicionado: n(f.valor_desconto_condicionado),
          base_calculo: baseCalculoCalculada,
          aliquota_iss: n(f.aliquota_iss),
          iss: valorIssCalculado,
          retencoes: {
            aliquota_ir: n(f.aliquota_ir), ir: n(f.valor_ir),
            aliquota_csll: n(f.aliquota_csll), csll: n(f.valor_csll),
            aliquota_inss: n(f.aliquota_inss), inss: n(f.valor_inss),
            aliquota_pis: n(f.aliquota_pis), pis: n(f.valor_pis),
            aliquota_cofins: n(f.aliquota_cofins), cofins: n(f.valor_cofins),
          },
          liquido: valorLiquidoCalculado,
        },

        // Tributação ISS
        tributacao: {
          // tribISSQN: código numérico '1'..'7' (não label)
          exigibilidade_iss: exigibilidadeParaCodigo(f.tributacao_exigibilidade_iss),
          natureza_operacao: f.tributacao_natureza_operacao,
          // tpRetISSQN: '1'=não retido, '2'=retido pelo tomador (XSD DPS v1.01)
          tp_ret_issqn: tpRetISSQN(f.tributacao_iss_retido),
          iss_retido: f.tributacao_iss_retido,
          optante_simples: f.tributacao_optante_simples,
          regime_especial: f.tributacao_regime_especial || null,
          incentivo_fiscal: f.tributacao_incentivo_fiscal,
          intermediario: f.tributacao_intermediario_existe ? {
            cpf_cnpj: f.tributacao_intermediario_cpf_cnpj,
            razao_social: f.tributacao_intermediario_razao_social,
            inscricao_municipal: f.tributacao_intermediario_inscricao_municipal || null,
          } : null,
          reforma: f.tributacao_aplicar_reforma ? {
            // CST: código de 2 dígitos (ex: '01')
            cst_ibs_cbs: f.tributacao_cst_ibs_cbs,
            // cClassTrib: código de 2 dígitos (ex: '01')
            classificacao_tributaria: f.tributacao_classificacao_tributaria,
            // cIndOp: 6 dígitos (ex: '100301')
            indicador_operacao: f.tributacao_indicador_operacao,
            // finNFSe: '1'=Normal, '2'=Complementar, '3'=Cancelamento
            finalidade_nfse: f.tributacao_finalidade_nfse,
            // indDest: '0'=tomador é destinatário, '1'=destinatário diferente
            ind_dest: f.tributacao_ind_dest,
          } : null,
        },

        // Grupo totTrib — OBRIGATÓRIO (Anexo I, ocor 1-1)
        // Transparência fiscal conforme Lei 12.741/2012
        tot_trib: {
          p_tot_trib_fed: pTotTribFedFinal,   // % federal total
          p_tot_trib_est: pTotTribEstFinal,   // % estadual (geralmente 0 em serviços)
          p_tot_trib_mun: pTotTribMunFinal,   // % municipal (ISS)
          // O gateway usa pTotTrib quando há percentuais e indTotTrib=0 quando não há.
          ind_tot_trib: '0',
        },

        // Tomador snapshot
        tomador_snapshot: {
          tipo_pessoa: f.tomador_tipo_pessoa,
          cpf_cnpj: f.tomador_cpf_cnpj.replace(/\D/g, ''),
          razao_social: f.tomador_razao_social,
          nome_fantasia: f.tomador_nome_fantasia || null,
          email: f.tomador_email || null,
          telefone: f.tomador_telefone || null,
          // cNaoNIF: obrigatório (Anexo I toma/cNaoNIF, ocor 1-1)
          // '0'=não informado na nota, '1'=não obrigado a ter
          c_nao_nif: onlyCodigo(f.tomador_c_nao_nif),
          endereco: {
            logradouro: f.tomador_logradouro,
            numero: f.tomador_numero,
            complemento: f.tomador_complemento || null,
            bairro: f.tomador_bairro,
            municipio: f.tomador_municipio,
            // cMun: código IBGE 7 dígitos
            codigo_ibge: f.tomador_codigo_municipio_ibge,
            uf: f.tomador_uf,
            cep: f.tomador_cep.replace(/\D/g, ''),
            // cPais: apenas 2 chars ISO-2 (ex: "BR", não "BR - Brasil")
            pais: cPaisTomador,
          },
        },

        data_emissao: f.emissao_data_emissao
          ? new Date(f.emissao_data_emissao + 'T12:00:00').toISOString()
          : new Date().toISOString(),
        observacao: f.emissao_observacao || null,
        opcoes_envio: {
          email: f.emissao_enviar_email,
          xml: f.emissao_enviar_xml,
          pdf: f.emissao_enviar_pdf,
          destinatario: f.tomador_email || null,
        },
      };

      const { data: result, error: fnError } = await supabase.functions.invoke('nfse-api/dps', { body: payload });
      if (fnError || result?.error) {
        const detail = result?.error || result?.message || fnError?.message || 'Erro ao enviar DPS';
        const fields = result?.fields ? ` (campos: ${(result.fields as string[]).join(', ')})` : '';
        throw new Error(detail + fields);
      }

      const { dps, job } = result;
      setEmissaoResultado({ jobId: job.id, dpsId: dps.id, status: 'fila' });

      // ─── Finalizar após autorização ────────────────────────────────────────
      const finalizarComNota = async (erro?: string) => {
        if (erro) { setEmissaoResultado(p => ({ ...p!, status: 'erro', mensagemErro: erro })); setEmitindo(false); return; }
        const { data: nota } = await supabase
          .from('nfse_notas')
          .select('id, numero_nfse, chave_acesso, codigo_verificacao, xml_nfse_path, danfse_path')
          .eq('dps_id', dps.id)
          .single();
        setEmissaoResultado(p => ({
          ...p!, status: 'autorizada',
          notaId: nota?.id, numeroNfse: nota?.numero_nfse,
          chaveAcesso: nota?.chave_acesso, codigoVerificacao: nota?.codigo_verificacao,
          xmlPath: nota?.xml_nfse_path, danfsePath: nota?.danfse_path,
        }));
        if (nota) {
          ctx.setXml(p => ({
            ...p, api_status: 'autorizada',
            api_ambiente: f.emissao_ambiente === 'Produção' ? 'producao' : 'homologacao',
            api_chave_acesso_nfse: nota.chave_acesso || '',
            api_numero_nfse: nota.numero_nfse || '',
            api_codigo_verificacao: nota.codigo_verificacao || '',
            api_data_autorizacao: new Date().toISOString(),
            api_usuario_envio: '',
          }));
          ctx.save();
        }
        
        if (f.emissao_enviar_email && f.tomador_email) {
          try {
            let btnLinks = '';
            if (f.emissao_enviar_pdf && nota?.danfse_path) {
              const { data } = await supabase.storage.from('nfse-documentos').createSignedUrl(nota.danfse_path, 259200);
              if (data?.signedUrl) {
                btnLinks += `<a href="${data.signedUrl}" style="display:inline-block;padding:12px 24px;margin:10px 5px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar PDF (DANFS-e)</a>`;
              }
            }
            if (f.emissao_enviar_xml && nota?.xml_nfse_path) {
              const { data } = await supabase.storage.from('nfse-documentos').createSignedUrl(nota.xml_nfse_path, 259200);
              if (data?.signedUrl) {
                btnLinks += `<a href="${data.signedUrl}" style="display:inline-block;padding:12px 24px;margin:10px 5px;background:#64748b;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar XML</a>`;
              }
            }
            
            const prestadorNome = ctx.prestador.prestador_razao_social || 'Prestador de Serviço';
            const emailHtml = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#1e293b;margin-bottom:20px;">Olá, ${f.tomador_razao_social || 'Cliente'}</h2>
                <p style="color:#475569;font-size:16px;line-height:1.5;">A Nota Fiscal de Serviço Eletrônica (NFS-e) referente aos serviços prestados foi emitida com sucesso no Portal Nacional.</p>
                <p style="color:#475569;font-size:16px;line-height:1.5;"><strong>Número da NFS-e:</strong> ${nota?.numero_nfse || 'N/A'}</p>
                <div style="margin-top:30px;text-align:center;">
                  ${btnLinks}
                </div>
                <hr style="border:0;border-top:1px solid #f1f5f9;margin:30px 0;">
                <p style="font-size:12px;color:#94a3b8;text-align:center;">Este é um comunicado enviado por <strong>${prestadorNome}</strong>.</p>
              </div>
            `;
            await ResendService.sendEmail({
              to: f.tomador_email,
              subject: `NFS-e Emitida - ${prestadorNome}`,
              html: emailHtml
            });
            console.log('[Resend] Email de nota enviado para:', f.tomador_email);
          } catch (e) {
            console.error('[Resend] Erro ao enviar email automático da NFS-e:', e);
          }
        }
        
        setEmitindo(false);
      };

      // ─── Realtime + fallback polling ───────────────────────────────────────
      realtimeChannelRef.current?.unsubscribe();
      const channel = supabase
        .channel(`nfse-job-${job.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nfse_jobs', filter: `id=eq.${job.id}` },
          (payload) => {
            const novo = payload.new as { status: string; ultimo_erro?: string };
            if (novo.status === 'concluido') { channel.unsubscribe(); finalizarComNota(); }
            else if (novo.status === 'erro') { channel.unsubscribe(); finalizarComNota(novo.ultimo_erro || 'Erro no worker'); }
            else { setEmissaoResultado(p => p ? { ...p, status: novo.status === 'processando' ? 'processando' : 'fila' } : p); }
          })
        .subscribe();
      realtimeChannelRef.current = channel;

      // Fallback polling a cada 5s
      const fallbackTimer = setInterval(async () => {
        const { data: jobData } = await supabase.from('nfse_jobs').select('status, ultimo_erro').eq('id', job.id).single();
        if (!jobData) return;
        if (jobData.status === 'concluido') { clearInterval(fallbackTimer); channel.unsubscribe(); finalizarComNota(); }
        else if (jobData.status === 'erro') { clearInterval(fallbackTimer); channel.unsubscribe(); finalizarComNota(jobData.ultimo_erro || 'Erro no worker'); }
        else { setEmissaoResultado(p => p ? { ...p, status: jobData.status === 'processando' ? 'processando' : 'fila' } : p); }
      }, 5000);

      // Timeout 3 minutos — exibe estado explícito em vez de sumir silenciosamente
      setTimeout(() => {
        clearInterval(fallbackTimer);
        channel.unsubscribe();
        setEmissaoResultado(p => p && p.status !== 'autorizada' && p.status !== 'erro'
          ? { ...p, status: 'timeout', mensagemErro: 'Tempo limite excedido. Verifique a aba "Controle de Notas" para conferir o status da emissão.' }
          : p
        );
        setEmitindo(false);
      }, 180_000);

    } catch (err) {
      console.error('[emitirNfse] erro:', err);
      setErrors([err instanceof Error ? err.message : 'Erro desconhecido']);
      setEmitindo(false);
    }
  };

  // ─── Render steps ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PH title="Emitir NFS-e Nacional" description="Fluxo em 6 etapas — tabelas oficiais SEFIN jan–fev/2026 integradas." />
      <OfficialAnexosBadge />
      <StepProgress step={step} setStep={goToStep} />
      <ErrorList errors={errors} />

      {/* ── Step 0: Tomador ── */}
      {step === 0 && (
        <div className="space-y-6">
          <RequiredHint />
          <Card title="Tomador" cols={3}>
            <FS label="Tipo de Pessoa *" value={f.tomador_tipo_pessoa} onChange={s('tomador_tipo_pessoa')}
              options={['Pessoa Jurídica', 'Pessoa Física', 'Estrangeiro']} />
            <FI label="CPF / CNPJ *" value={f.tomador_cpf_cnpj} onChange={s('tomador_cpf_cnpj')} placeholder="Digite para buscar automaticamente" />
            <FI label="Razão Social / Nome *" value={f.tomador_razao_social} onChange={s('tomador_razao_social')} />
            <FI label="Nome Fantasia" value={f.tomador_nome_fantasia} onChange={s('tomador_nome_fantasia')} />
            <FI label="E-mail" value={f.tomador_email} onChange={s('tomador_email')} type="email" />
            <FI label="Telefone" value={f.tomador_telefone} onChange={s('tomador_telefone')} />
          </Card>
          <Card title="Endereço do Tomador" cols={3}>
            <FI label="CEP *" value={f.tomador_cep} onChange={s('tomador_cep')} placeholder="Buscar CEP" />
            <FI label="Logradouro *" value={f.tomador_logradouro} onChange={s('tomador_logradouro')} full />
            <FI label="Número *" value={f.tomador_numero} onChange={s('tomador_numero')} />
            <FI label="Complemento" value={f.tomador_complemento} onChange={s('tomador_complemento')} />
            <FI label="Bairro *" value={f.tomador_bairro} onChange={s('tomador_bairro')} />
            <FDL label="Município *" value={f.tomador_municipio} onChange={setTomadorMunicipio}
              options={MUNICIPIO_OPTIONS} placeholder="Digite cidade, UF ou código IBGE" />
            <FI label="Código IBGE (7 dígitos) *" value={f.tomador_codigo_municipio_ibge} onChange={s('tomador_codigo_municipio_ibge')} />
            <FS label="UF *" value={f.tomador_uf} onChange={s('tomador_uf')} options={UF_OPTIONS} />
            <FS label="País *" value={f.tomador_pais} onChange={s('tomador_pais')} options={PAIS_OPTIONS} />
          </Card>
          {/* cNaoNIF é uma alternativa a CPF/CNPJ/NIF no XSD */}
          <Card title="Identificação Fiscal do Tomador" cols={2}>
            <FDL label="Motivo ausência de NIF (cNaoNIF) *" value={f.tomador_c_nao_nif}
              onChange={s('tomador_c_nao_nif')} options={CNAO_NIF_OPTIONS}
              placeholder="Selecione o motivo" />
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              O XML usa CPF/CNPJ quando informado. O cNaoNIF é enviado somente quando não houver documento ou NIF, conforme a escolha exclusiva do XSD.
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 1: Serviço ── */}
      {step === 1 && (
        <div className="space-y-6">
          <RequiredHint />
          <Card title="Serviço Prestado" cols={3}>
            <FDL label="Serviço Nacional *" value={f.servico_favorito} onChange={setServicoNacional}
              options={SERVICO_NACIONAL_OPTIONS} placeholder="Digite código ou descrição" full />
            <FI label="Código de Tributação Nacional (cTribNac) *" value={f.servico_codigo_tributacao_nacional}
              onChange={v => setF(p => ({ ...p, servico_codigo_tributacao_nacional: normalizarCodigoTribNac(v), servico_codigo_municipal: '' }))} />
            <FI label="CNAE" value={f.servico_codigo_cnae} onChange={s('servico_codigo_cnae')} />
            {/* NBS: exibido com pontos (formato 1.XXXX.XX.XX do Anexo B) */}
            <FDL label="NBS (formato 1.XXXX.XX.XX)" value={f.servico_codigo_nbs} onChange={setNbsOficial}
              options={NBS_OPTIONS} placeholder="Digite código ou descrição NBS" />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              NBS enviado no campo <code>cNBS</code> com o formato pontual oficial (1.XXXX.XX.XX) conforme Anexo B.
            </div>
            <FTA label="Descrição do Serviço (xDescServ) *" value={f.servico_descricao} onChange={s('servico_descricao')} rows={4} full />
          </Card>
          <Card title="Municípios e Código Municipal" cols={2}>
            <FDL label="Município de Prestação *" value={f.servico_municipio_prestacao} onChange={setMunicipioPrestacao}
              options={MUNICIPIO_OPTIONS} placeholder="Digite cidade, UF ou código IBGE" />
            <FI label="Código IBGE Prestação *" value={f.servico_codigo_municipio_prestacao_ibge}
              onChange={s('servico_codigo_municipio_prestacao_ibge')} />
            <FDL label="Município de Incidência (ISSQN)" value={f.servico_municipio_incidencia}
              onChange={setMunicipioIncidencia} options={MUNICIPIO_OPTIONS} placeholder="Padrão: igual à prestação" />
            <FI label="Código IBGE Incidência" value={f.servico_codigo_municipio_incidencia_ibge}
              onChange={s('servico_codigo_municipio_incidencia_ibge')} />
            <div className="col-span-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              No Portal Nacional, <strong>cTribMun é opcional</strong>. Informe somente quando o município de incidência fornecer um código nacional compatível de <strong>exatamente 3 dígitos</strong>. Não use códigos municipais locais de 5 dígitos.
            </div>
            <FI label="Código Municipal do Serviço (cTribMun) — opcional" value={f.servico_codigo_municipal}
              onChange={v => setF(p => ({ ...p, servico_codigo_municipal: v.replace(/\D/g, '').slice(0, 3) }))}
              placeholder="Ex: 123 (somente 3 dígitos)" full />
          </Card>
        </div>
      )}

      {/* ── Step 2: Tributação ── */}
      {step === 2 && (
        <div className="space-y-6">
          <RequiredHint />
          <Card title="Tributação do Serviço" cols={2}>
            {/* Exigibilidade: label "1 - Exigível" etc. — extraído para código antes de enviar */}
            <FS label="Exigibilidade ISS (tribISSQN) *" value={f.tributacao_exigibilidade_iss}
              onChange={s('tributacao_exigibilidade_iss')} options={EXIGIBILIDADE_ISS_OPTIONS} />
            <FS label="Natureza da Operação" value={f.tributacao_natureza_operacao}
              onChange={s('tributacao_natureza_operacao')}
              options={['1 - Tributação no município', '2 - Tributação fora do município', '3 - Isenção', '4 - Imune', '5 - Exig. suspensa judicial', '6 - Exig. suspensa admin.']} />
            {/* tpRetISSQN: convertido automaticamente para '1' ou '2' no payload */}
            <FC label="ISS Retido pelo tomador (tpRetISSQN = 2)" checked={f.tributacao_iss_retido} onChange={sb('tributacao_iss_retido')} />
            <FC label="Optante pelo Simples Nacional" checked={f.tributacao_optante_simples} onChange={sb('tributacao_optante_simples')} />
            <FS label="Regime Especial de Tributação" value={f.tributacao_regime_especial}
              onChange={s('tributacao_regime_especial')}
              options={['1 - Microempresa Municipal', '2 - Estimativa', '3 - Sociedade de Profissionais', '4 - Cooperativa', '5 - MEI', '6 - ME EPP', '7 - Profissional Autônomo']} />
            <FC label="Incentivo Fiscal" checked={f.tributacao_incentivo_fiscal} onChange={sb('tributacao_incentivo_fiscal')} />
          </Card>

          <Card title="Intermediário" cols={2}>
            <div className="col-span-full">
              <FC label="Existe intermediário nesta operação" checked={f.tributacao_intermediario_existe}
                onChange={sb('tributacao_intermediario_existe')} />
            </div>
            {f.tributacao_intermediario_existe && <>
              <FI label="CPF / CNPJ Intermediário *" value={f.tributacao_intermediario_cpf_cnpj}
                onChange={s('tributacao_intermediario_cpf_cnpj')} />
              <FI label="Razão Social Intermediário *" value={f.tributacao_intermediario_razao_social}
                onChange={s('tributacao_intermediario_razao_social')} />
              <FI label="Inscrição Municipal Intermediário" value={f.tributacao_intermediario_inscricao_municipal}
                onChange={s('tributacao_intermediario_inscricao_municipal')} />
            </>}
          </Card>

          <Card title="Reforma Tributária — IBS/CBS (Anexo C)" cols={3}>
            <div className="col-span-full">
              <FC label="Aplicar campos IBS/CBS" checked={f.tributacao_aplicar_reforma}
                onChange={sb('tributacao_aplicar_reforma')} />
              {f.tributacao_aplicar_reforma && (
                <p className="mt-2 text-xs text-slate-500">Para optantes do Simples Nacional, IBS/CBS só será obrigatório a partir de 2027 (Anexo I, nota).</p>
              )}
            </div>
            {f.tributacao_aplicar_reforma && <>
              {/* CST: dropdown com valores fixos RFB */}
              <FDL label="CST IBS/CBS *" value={f.tributacao_cst_ibs_cbs} onChange={s('tributacao_cst_ibs_cbs')}
                options={CST_IBSCBS_OPTIONS} placeholder="Selecione o CST" />
              {/* cClassTrib: dropdown com valores fixos */}
              <FDL label="Classificação Tributária (cClassTrib) *" value={f.tributacao_classificacao_tributaria}
                onChange={s('tributacao_classificacao_tributaria')} options={CLASS_TRIB_IBSCBS_OPTIONS}
                placeholder="Selecione a classificação" />
              {/* cIndOp: 34 códigos do Anexo C */}
              <FDL label="Indicador de Operação (cIndOp) *" value={f.tributacao_indicador_operacao}
                onChange={setIndicadorOperacao} options={INDOP_OPTIONS}
                placeholder="Digite código ou descrição (6 dígitos)" />
              <FS label="Finalidade NFS-e (finNFSe)" value={f.tributacao_finalidade_nfse}
                onChange={s('tributacao_finalidade_nfse')}
                options={['1 - Normal', '2 - Complementar', '3 - Cancelamento']} />
              <FS label="Destinatário (indDest)" value={f.tributacao_ind_dest}
                onChange={s('tributacao_ind_dest')}
                options={['0 - Tomador é o destinatário', '1 - Destinatário diferente do tomador']} />
            </>}
          </Card>
        </div>
      )}

      {/* ── Step 3: Valores ── */}
      {step === 3 && (
        <div className="space-y-6">
          <RequiredHint />
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
            O sistema calcula automaticamente valor do serviço, base de cálculo e ISS. O grupo <strong>totTrib</strong> (Lei da Transparência) é calculado automaticamente — preencha manualmente apenas se quiser sobrescrever.
          </div>
          <Card title="Valores da Nota" cols={3}>
            <FI label="Quantidade *" value={f.valor_quantidade} onChange={s('valor_quantidade')} type="number" />
            <FI label="Valor Unitário (R$) *" value={f.valor_unitario} onChange={s('valor_unitario')} type="number" />
            <FI label="Valor do Serviço (R$)" value={money(valorBruto)} onChange={s('valor_servico')} type="number" disabled />
            <FI label="Deduções (R$)" value={f.valor_deducoes} onChange={s('valor_deducoes')} type="number" />
            <FI label="Desconto Incondicionado (R$)" value={f.valor_desconto_incondicionado} onChange={s('valor_desconto_incondicionado')} type="number" />
            <FI label="Desconto Condicionado (R$)" value={f.valor_desconto_condicionado} onChange={s('valor_desconto_condicionado')} type="number" />
            <FI label="Base de Cálculo (R$)" value={money(baseCalculoCalculada)} onChange={s('valor_base_calculo')} type="number" disabled />
            <FI label="Alíquota ISS (%)" value={f.aliquota_iss} onChange={s('aliquota_iss')} type="number" />
            <FI label="Valor ISS (R$)" value={money(valorIssCalculado)} onChange={s('valor_iss')} type="number" disabled />
          </Card>
          <Card title="Retenções Federais" cols={3}>
            <FI label="IRRF (R$)" value={f.valor_ir} onChange={s('valor_ir')} type="number" />
            <FI label="CSLL (R$)" value={f.valor_csll} onChange={s('valor_csll')} type="number" />
            <FI label="INSS / CP (R$)" value={f.valor_inss} onChange={s('valor_inss')} type="number" />
            <FI label="PIS (R$)" value={f.valor_pis} onChange={s('valor_pis')} type="number" />
            <FI label="COFINS (R$)" value={f.valor_cofins} onChange={s('valor_cofins')} type="number" />
            <FI label="Valor Líquido (R$)" value={money(valorLiquidoCalculado)} onChange={s('valor_liquido')} type="number" disabled />
          </Card>
          {/* totTrib — obrigatório no leiaute DPS (Anexo I ocor 1-1) */}
          <Card title="Lei da Transparência Fiscal (totTrib — obrigatório)" cols={3}>
            <div className="col-span-full text-xs text-slate-500">
              Calculado automaticamente com base nas alíquotas informadas. Preencha manualmente para sobrescrever os valores.
            </div>
            <FI label="% Total Federal (auto: {pTotTribFedCalc.toFixed(2)})"
              value={f.tot_trib_fed} onChange={s('tot_trib_fed')} type="number"
              placeholder={pTotTribFedCalc.toFixed(2)} />
            <FI label="% Total Estadual"
              value={f.tot_trib_est} onChange={s('tot_trib_est')} type="number"
              placeholder="0.00" />
            <FI label="% Total Municipal (auto: ISS)"
              value={f.tot_trib_mun} onChange={s('tot_trib_mun')} type="number"
              placeholder={pTotTribMunCalc.toFixed(2)} />
          </Card>
        </div>
      )}

      {/* ── Step 4: Revisão ── */}
      {step === 4 && (
        <div className="space-y-6">
          <RequiredHint />
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCard title="Tomador">
              <ReviewRow label="CPF/CNPJ" value={f.tomador_cpf_cnpj} />
              <ReviewRow label="Razão Social" value={f.tomador_razao_social} />
              <ReviewRow label="Município/UF" value={`${f.tomador_municipio || '-'} / ${f.tomador_uf || '-'}`} />
              <ReviewRow label="País (cPais)" value={extrairCodigoPais(f.tomador_pais)} />
              <ReviewRow label="cNaoNIF" value={f.tomador_c_nao_nif} />
            </ReviewCard>
            <ReviewCard title="Serviço">
              <ReviewRow label="cTribNac" value={f.servico_codigo_tributacao_nacional} />
              <ReviewRow label="cTribMun" value={f.servico_codigo_municipal} />
              <ReviewRow label="cNBS" value={f.servico_codigo_nbs} />
              <ReviewRow label="Município Prestação" value={f.servico_municipio_prestacao} />
              <ReviewRow label="Código IBGE Incidência" value={f.servico_codigo_municipio_incidencia_ibge || f.servico_codigo_municipio_prestacao_ibge} />
            </ReviewCard>
            <ReviewCard title="Tributação">
              <ReviewRow label="Exigibilidade (código)" value={exigibilidadeParaCodigo(f.tributacao_exigibilidade_iss)} />
              <ReviewRow label="tpRetISSQN" value={tpRetISSQN(f.tributacao_iss_retido)} />
              <ReviewRow label="Simples Nacional" value={f.tributacao_optante_simples} />
              <ReviewRow label="IBS/CBS aplicado" value={f.tributacao_aplicar_reforma} />
              {f.tributacao_aplicar_reforma && <>
                <ReviewRow label="CST" value={f.tributacao_cst_ibs_cbs} />
                <ReviewRow label="cIndOp" value={f.tributacao_indicador_operacao} />
              </>}
            </ReviewCard>
            <ReviewCard title="Valores">
              <ReviewRow label="Valor Bruto" value={`R$ ${money(valorBruto)}`} />
              <ReviewRow label="Base Cálculo ISS" value={`R$ ${money(baseCalculoCalculada)}`} />
              <ReviewRow label="ISS" value={`R$ ${money(valorIssCalculado)}`} />
              <ReviewRow label="Total Retenções" value={`R$ ${money(totalRetencoes)}`} />
              <ReviewRow label="Valor Líquido" value={`R$ ${money(valorLiquidoCalculado)}`} />
              <ReviewRow label="% Trib. Federal (totTrib)" value={`${pTotTribFedFinal.toFixed(2)}%`} />
              <ReviewRow label="% Trib. Municipal (totTrib)" value={`${pTotTribMunFinal.toFixed(2)}%`} />
            </ReviewCard>
          </div>
          <Card title="Observações da Nota" cols={1}>
            <FTA label="Observação (xOutInf)" value={f.emissao_observacao} onChange={s('emissao_observacao')} rows={4} full />
          </Card>
        </div>
      )}

      {/* ── Step 5: Emissão ── */}
      {step === 5 && (
        <div className="space-y-6">
          <Card title="Emissão" cols={3}>
            <FS label="Ambiente *" value={f.emissao_ambiente} onChange={s('emissao_ambiente')}
              options={['Homologação', 'Produção']} />
            <FI label="Data de Emissão *" value={f.emissao_data_emissao} onChange={s('emissao_data_emissao')} type="date" />
            <FI label="Competência *" value={f.emissao_competencia} onChange={s('emissao_competencia')} type="month" />
          </Card>
          <Card title="Envio ao Cliente" cols={1}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FC label="Enviar e-mail" checked={f.emissao_enviar_email} onChange={sb('emissao_enviar_email')} />
              <FC label="Anexar XML" checked={f.emissao_enviar_xml} onChange={sb('emissao_enviar_xml')} />
              <FC label="Anexar PDF/DANFS-e" checked={f.emissao_enviar_pdf} onChange={sb('emissao_enviar_pdf')} />
            </div>
          </Card>

          {/* Resultado: autorizada */}
          {emissaoResultado?.status === 'autorizada' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <div>
                  <p className="font-extrabold text-emerald-800 dark:text-emerald-300">NFS-e Autorizada!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-200">Emitida com sucesso pelo Portal Nacional SEFIN</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500">Número NFS-e</p>
                  <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{emissaoResultado.numeroNfse || '—'}</p>
                </div>
                <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500">Código de Verificação</p>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{emissaoResultado.codigoVerificacao || '—'}</p>
                </div>
                <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900 sm:col-span-3">
                  <p className="text-xs text-slate-500">Chave de Acesso</p>
                  <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">{emissaoResultado.chaveAcesso || '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {emissaoResultado.xmlPath && (
                  <button type="button" onClick={async () => {
                    const { data } = await supabase.storage.from('nfse-documentos').createSignedUrl(emissaoResultado.xmlPath!, 120);
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                  }} className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300">
                    <FileText className="h-4 w-4" /> Baixar XML
                  </button>
                )}
                {emissaoResultado.danfsePath && (
                  <button type="button" onClick={async () => {
                    const { data } = await supabase.storage.from('nfse-documentos').createSignedUrl(emissaoResultado.danfsePath!, 120);
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                  }} className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300">
                    <Paperclip className="h-4 w-4" /> Baixar DANFS-e
                  </button>
                )}
                <button type="button" onClick={resetWizard}
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300">
                  Nova emissão
                </button>
              </div>
            </div>
          )}

          {/* Resultado: erro */}
          {emissaoResultado?.status === 'erro' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="font-extrabold text-rose-800 dark:text-rose-300">Falha na emissão</p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">{emissaoResultado.mensagemErro}</p>
              <button type="button" onClick={() => setEmissaoResultado(null)}
                className="mt-3 text-sm font-bold text-rose-700 underline dark:text-rose-300">Tentar novamente</button>
            </div>
          )}

          {/* Resultado: timeout */}
          {emissaoResultado?.status === 'timeout' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="font-extrabold text-amber-800 dark:text-amber-300">Tempo limite excedido</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">{emissaoResultado.mensagemErro}</p>
              <button type="button" onClick={() => { setEmissaoResultado(null); setStep(0 as EmissaoStep); }}
                className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50">
                Verificar em Controle de Notas
              </button>
            </div>
          )}

          {/* Pronto para emitir ou loading */}
          {emissaoResultado?.status !== 'autorizada' && emissaoResultado?.status !== 'timeout' && (
            emitindo ? (
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                  <div>
                    <p className="font-bold text-cyan-800 dark:text-cyan-300">
                      {emissaoResultado?.status === 'processando' ? 'Processando no Portal Nacional SEFIN…' : 'DPS enfileirada, aguardando worker…'}
                    </p>
                    <p className="text-sm text-cyan-700 dark:text-cyan-200">Aguarde — pode levar alguns segundos.</p>
                  </div>
                </div>
              </div>
            ) : emissaoResultado?.status !== 'erro' ? (
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                <p className="text-sm font-bold text-cyan-800 dark:text-cyan-300">Pronto para emissão</p>
                <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-200">
                  A DPS será montada com as tabelas oficiais SEFIN, enviada ao Portal Nacional e o retorno (número, chave, XML) salvo automaticamente.
                </p>
                <button type="button" onClick={emitirNfse}
                  className="mt-5 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-cyan-700">
                  Emitir NFS-e no Portal Nacional
                </button>
              </div>
            ) : null
          )}
        </div>
      )}

      <WizardActions step={step} setStep={s => { setErrors([]); setStep(s); }} onNext={nextStep} onReset={resetWizard} />
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export default function PortalNacionalModule({ user, onExit, onLogout, isDarkMode, onToggleDarkMode }: PortalNacionalModuleProps) {
  const [currentTab, setCurrentTab] = useState<PortalTab>('controle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navigate = (tab: PortalTab) => {
    if (tab === 'whatsapp') {
      onExit('whatsapp');
      return;
    }
    setCurrentTab(tab);
    setSidebarOpen(false);
  };
  const userProfile = String((user as any).perfil ?? (user as any).profile ?? (user as any).role ?? 'usuario').toLowerCase();
  const canSeeConfig = ['admin', 'administrador', 'fiscal', 'suporte', 'ti', 'developer', 'dev'].some(p => userProfile.includes(p));
  const visibleMenu = groupedMenu.filter(g => g.title !== 'Configurações' || canSeeConfig);

  const renderPage = () => {
    switch (currentTab) {
      case 'emitir_nfse': return <EmissaoWizard />;
      case 'cliente': return <ClienteTab />;
      case 'endereco': return <EnderecoTab />;
      case 'contato': return <ContatoTab />;
      case 'bancario': return <BancarioTab />;
      case 'fiscal': return <FiscalTab />;
      case 'contrato': return <ContratoTab />;
      case 'servico': return <ServicoTab />;
      case 'impostos': return <ImpostosTab />;
      case 'transparencia': return <TransparenciaTab />;
      case 'reforma': return <ReformaTab />;
      case 'dps': return <DpsTab />;
      case 'prestador': return <PrestadorTab />;
      case 'intermediario': return <IntermediarioTab />;
      case 'pagamento': return <PagamentoTab />;
      case 'email_cliente': return <EmailClienteTab />;
      case 'xml': return <XmlTab />;
      case 'cancelamento': return <CancelamentoTab />;
      case 'anexos': return <AnexosTab />;
      case 'historico_financeiro': return <HistoricoFinanceiroTab />;
      case 'historico_alteracoes': return <HistoricoAlteracoesTab />;
      case 'usuarios': return <UsuariosTab />;
      case 'controle': return <ControleTab />;
    }
  };

  return (
    <PortalNacionalProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {sidebarOpen && (
          <button aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-cyan-950/80 bg-[#06151d] text-slate-100 transition-all duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : 'lg:w-72'}`}>
          <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
            {!collapsed && (
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950"><ReceiptText className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">Portal Nacional</p>
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/70">NFS-e Nacional</p>
                </div>
              </div>
            )}
            {collapsed && <ReceiptText className="hidden h-6 w-6 text-cyan-400 lg:block" />}
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"><X className="h-5 w-5" /></button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:block" title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <div className={`border-b border-white/10 bg-white/[0.025] p-4 ${collapsed ? 'flex justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Building2 className="h-5 w-5" /></div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.companyName}</p>
                  <p className="truncate text-xs text-slate-500">CNPJ {user.cnpj}</p>
                </div>
              )}
            </div>
          </div>
          <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {visibleMenu.map(group => (
              <div key={group.title}>
                {!collapsed && (
                  <div className="mb-1 px-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-300/70">{group.title}</p>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = currentTab === item.id;
                    return (
                      <button key={item.id} onClick={() => navigate(item.id)} title={item.label}
                        className={`flex items-center rounded-xl text-sm font-medium transition-colors ${collapsed ? 'mx-auto h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2'} ${active ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="space-y-1 border-t border-white/10 p-3">
            <button onClick={onExit} title="Voltar ao Portal PJ"
              className={`flex items-center rounded-xl text-sm font-medium text-cyan-300 hover:bg-cyan-400/10 ${collapsed ? 'mx-auto h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2'}`}>
              <ArrowLeft className="h-4 w-4" />
              {!collapsed && 'Voltar ao Portal PJ'}
            </button>
            <button onClick={onLogout} title="Sair"
              className={`flex items-center rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-400/10 ${collapsed ? 'mx-auto h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2'}`}>
              <LogOut className="h-4 w-4" />
              {!collapsed && 'Sair'}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold md:text-base">{tabTitles[currentTab]}</h1>
                <p className="hidden text-xs text-slate-500 sm:block">Portal Nacional NFS-e — padrão SEFIN</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300 sm:flex">
                <span className="h-2 w-2 rounded-full bg-cyan-500" /> Portal Nacional
              </span>
              <button onClick={onToggleDarkMode} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={currentTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="mx-auto w-full max-w-5xl">
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </PortalNacionalProvider>
  );
}

// ─── Tabs (mantidas idênticas ao original — sem alterações de lógica) ─────────
function ClienteTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.cliente, ctx.setCliente);
  return (
    <div className="space-y-6">
      <PH title="Cliente / Tomador" description="Dados cadastrais do tomador de serviço." />
      <Card title="Identificação" cols={3}>
        <FI label="ID" value={f.cliente_id} onChange={s('cliente_id')} />
        <FI label="Código Interno" value={f.cliente_codigo_interno} onChange={s('cliente_codigo_interno')} />
        <FS label="Tipo de Pessoa" value={f.cliente_tipo_pessoa} onChange={s('cliente_tipo_pessoa')} options={['Pessoa Física', 'Pessoa Jurídica', 'Estrangeiro']} />
        <FI label="Razão Social" value={f.cliente_razao_social} onChange={s('cliente_razao_social')} />
        <FI label="Nome Fantasia" value={f.cliente_nome_fantasia} onChange={s('cliente_nome_fantasia')} />
        <FI label="CNPJ / CPF" value={f.cliente_cnpj_cpf} onChange={s('cliente_cnpj_cpf')} />
        <FI label="Inscrição Municipal" value={f.cliente_inscricao_municipal} onChange={s('cliente_inscricao_municipal')} />
        <FI label="Inscrição Estadual" value={f.cliente_inscricao_estadual} onChange={s('cliente_inscricao_estadual')} />
        <FI label="Inscrição SUFRAMA" value={f.cliente_inscricao_suframa} onChange={s('cliente_inscricao_suframa')} />
      </Card>
      <Card title="Contato" cols={3}>
        <FI label="Nome do Contato" value={f.cliente_nome_contato} onChange={s('cliente_nome_contato')} />
        <FI label="DDD" value={f.cliente_ddd} onChange={s('cliente_ddd')} />
        <FI label="Telefone" value={f.cliente_telefone} onChange={s('cliente_telefone')} />
      </Card>
      <Card title="Configurações" cols={2}>
        <FC label="Cliente Ativo" checked={f.cliente_ativo} onChange={sb('cliente_ativo')} />
        <FI label="Tags (separadas por vírgula)" value={f.cliente_tags} onChange={s('cliente_tags')} />
      </Card>
      <Card title="Observações" cols={1}>
        <FTA label="Observações Internas" value={f.cliente_observacoes_internas} onChange={s('cliente_observacoes_internas')} full />
        <FTA label="Observações Detalhadas" value={f.cliente_observacoes_detalhadas} onChange={s('cliente_observacoes_detalhadas')} full />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function EnderecoTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.endereco, ctx.setEndereco);
  useEffect(() => {
    const cep = f.endereco_cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    let active = true;
    buscarCep(cep).then(r => {
      if (!active || !r) return;
      ctx.setEndereco(p => ({ ...p, endereco_logradouro: r.logradouro || p.endereco_logradouro, endereco_bairro: r.bairro || p.endereco_bairro, endereco_municipio: r.municipio || p.endereco_municipio, endereco_codigo_municipio_ibge: r.ibge || p.endereco_codigo_municipio_ibge, endereco_uf: r.uf || p.endereco_uf }));
    });
    return () => { active = false; };
  }, [f.endereco_cep]);
  return (
    <div className="space-y-6">
      <PH title="Endereço" description="Endereço do tomador de serviço." />
      <Card title="Logradouro" cols={3}>
        <FI label="Logradouro" value={f.endereco_logradouro} onChange={s('endereco_logradouro')} full />
        <FI label="Número" value={f.endereco_numero} onChange={s('endereco_numero')} />
        <FI label="Complemento" value={f.endereco_complemento} onChange={s('endereco_complemento')} />
        <FI label="Bairro" value={f.endereco_bairro} onChange={s('endereco_bairro')} />
        <FI label="CEP" value={f.endereco_cep} onChange={s('endereco_cep')} />
      </Card>
      <Card title="Município e País" cols={3}>
        <FI label="Município" value={f.endereco_municipio} onChange={s('endereco_municipio')} />
        <FI label="Código IBGE" value={f.endereco_codigo_municipio_ibge} onChange={s('endereco_codigo_municipio_ibge')} />
        <FS label="UF" value={f.endereco_uf} onChange={s('endereco_uf')} options={UF_OPTIONS} />
        <FI label="Código do País" value={f.endereco_pais_codigo} onChange={s('endereco_pais_codigo')} />
        <FS label="Nome do País" value={f.endereco_pais_nome} onChange={s('endereco_pais_nome')} options={PAIS_OPTIONS} />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function ContatoTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.contato, ctx.setContato);
  return (
    <div className="space-y-6">
      <PH title="Telefones e E-mail" />
      <Card title="E-mail" cols={2}>
        <FI label="E-mail Principal" value={f.contato_email_principal} onChange={s('contato_email_principal')} type="email" />
        <FI label="E-mails Adicionais" value={f.contato_emails_adicionais} onChange={s('contato_emails_adicionais')} />
      </Card>
      <Card title="Telefone Secundário e Fax" cols={2}>
        <FI label="DDD Tel 2" value={f.contato_ddd_telefone_2} onChange={s('contato_ddd_telefone_2')} />
        <FI label="Telefone 2" value={f.contato_telefone_2} onChange={s('contato_telefone_2')} />
        <FI label="DDD Fax" value={f.contato_ddd_fax} onChange={s('contato_ddd_fax')} />
        <FI label="Fax" value={f.contato_fax} onChange={s('contato_fax')} />
      </Card>
      <Card title="Website" cols={1}><FI label="Website" value={f.contato_website} onChange={s('contato_website')} type="url" /></Card>
      <Card title="Preferências de Envio" cols={1}>
        <div className="space-y-4">
          <FC label="Enviar e-mail automático" checked={f.contato_enviar_email_automatico} onChange={sb('contato_enviar_email_automatico')} />
          <FC label="Enviar anexo por e-mail" checked={f.contato_enviar_anexo_email} onChange={sb('contato_enviar_anexo_email')} />
          <FC label="Enviar link do portal" checked={f.contato_enviar_link_portal} onChange={sb('contato_enviar_link_portal')} />
        </div>
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function BancarioTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.bancario, ctx.setBancario);
  return (
    <div className="space-y-6">
      <PH title="Dados Bancários" />
      <Card title="Banco e Conta" cols={2}>
        <FI label="Código do Banco" value={f.banco_codigo} onChange={s('banco_codigo')} />
        <FI label="Nome do Banco" value={f.banco_nome} onChange={s('banco_nome')} />
        <FI label="Agência" value={f.banco_agencia} onChange={s('banco_agencia')} />
        <FI label="Conta Corrente" value={f.banco_conta_corrente} onChange={s('banco_conta_corrente')} />
        <FS label="Tipo de Conta" value={f.banco_tipo_conta} onChange={s('banco_tipo_conta')} options={['Conta Corrente', 'Conta Poupança', 'Conta Pagamento']} />
      </Card>
      <Card title="PIX" cols={2}>
        <FS label="Tipo de Chave PIX" value={f.banco_tipo_chave_pix} onChange={s('banco_tipo_chave_pix')} options={['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave Aleatória']} />
        <FI label="Chave PIX" value={f.banco_chave_pix} onChange={s('banco_chave_pix')} />
      </Card>
      <Card title="Titular" cols={2}>
        <FI label="CPF / CNPJ do Titular" value={f.banco_cpf_cnpj_titular} onChange={s('banco_cpf_cnpj_titular')} />
        <FI label="Nome do Titular" value={f.banco_nome_titular} onChange={s('banco_nome_titular')} />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function FiscalTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.fiscal, ctx.setFiscal);
  return (
    <div className="space-y-6">
      <PH title="Inscrições, CNAE e Outros" />
      <Card title="Inscrições" cols={3}>
        <FI label="Inscrição Estadual" value={f.fiscal_inscricao_estadual} onChange={s('fiscal_inscricao_estadual')} />
        <FI label="Inscrição Municipal" value={f.fiscal_inscricao_municipal} onChange={s('fiscal_inscricao_municipal')} />
        <FI label="Inscrição SUFRAMA" value={f.fiscal_inscricao_suframa} onChange={s('fiscal_inscricao_suframa')} />
      </Card>
      <Card title="CNAE e Atividade" cols={2}>
        <FI label="CNAE Principal" value={f.fiscal_cnae_principal} onChange={s('fiscal_cnae_principal')} />
        <FI label="Descrição CNAE" value={f.fiscal_cnae_descricao} onChange={s('fiscal_cnae_descricao')} />
        <FI label="Tipo de Atividade" value={f.fiscal_tipo_atividade} onChange={s('fiscal_tipo_atividade')} />
      </Card>
      <Card title="Regime Tributário" cols={2}>
        <FS label="Regime Tributário" value={f.fiscal_regime_tributario} onChange={s('fiscal_regime_tributario')} options={['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI', 'Imune/Isento']} />
        <FS label="Regime Especial" value={f.fiscal_regime_especial_tributacao} onChange={s('fiscal_regime_especial_tributacao')} options={['Microempresa Municipal', 'Estimativa', 'Sociedade de Profissionais', 'Cooperativa', 'MEI', 'ME EPP']} />
        <FS label="Contribuinte ICMS" value={f.fiscal_contribuinte_icms} onChange={s('fiscal_contribuinte_icms')} options={['Contribuinte', 'Não Contribuinte', 'Isento']} />
      </Card>
      <Card title="Configurações Fiscais" cols={1}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FC label="Optante pelo Simples Nacional" checked={f.fiscal_optante_simples_nacional} onChange={sb('fiscal_optante_simples_nacional')} />
          <FC label="Produtor Rural" checked={f.fiscal_produtor_rural} onChange={sb('fiscal_produtor_rural')} />
          <FC label="Incentivo Fiscal" checked={f.fiscal_incentivo_fiscal} onChange={sb('fiscal_incentivo_fiscal')} />
        </div>
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function ContratoTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.contrato, ctx.setContrato);
  return (
    <div className="space-y-6">
      <PH title="Contrato / Faturamento" />
      <Card title="Identificação do Contrato" cols={3}>
        <FI label="Número" value={f.contrato_numero} onChange={s('contrato_numero')} />
        <FS label="Status" value={f.contrato_status} onChange={s('contrato_status')} options={['Ativo', 'Suspenso', 'Encerrado', 'Em renovação']} />
        <FI label="Vigência Inicial" value={f.contrato_vigencia_inicial} onChange={s('contrato_vigencia_inicial')} type="date" />
        <FI label="Vigência Final" value={f.contrato_vigencia_final} onChange={s('contrato_vigencia_final')} type="date" />
      </Card>
      <Card title="Faturamento" cols={3}>
        <FS label="Tipo de Faturamento" value={f.contrato_tipo_faturamento} onChange={s('contrato_tipo_faturamento')} options={['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Avulso']} />
        <FI label="Dia do Faturamento" value={f.contrato_dia_faturamento} onChange={s('contrato_dia_faturamento')} type="number" />
        <FC label="Renovação Automática" checked={f.contrato_renovacao_automatica} onChange={sb('contrato_renovacao_automatica')} />
      </Card>
      <Card title="Valores (R$)" cols={3}>
        <FI label="Valor Total de Serviços" value={f.contrato_valor_total_servicos} onChange={s('contrato_valor_total_servicos')} type="number" />
        <FI label="Valor de Desconto" value={f.contrato_valor_desconto} onChange={s('contrato_valor_desconto')} type="number" />
        <FI label="Valor Total" value={f.contrato_valor_total} onChange={s('contrato_valor_total')} type="number" />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function ServicoTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.servico, ctx.setServico);
  return (
    <div className="space-y-6">
      <PH title="Serviços" />
      <Card title="Dados do Serviço" cols={3}>
        <FI label="Código Tributação Nacional (cTribNac)" value={f.servico_codigo_tributacao_nacional} onChange={s('servico_codigo_tributacao_nacional')} />
        <FI label="Código Municipal (cTribMun)" value={f.servico_codigo_servico_municipal} onChange={s('servico_codigo_servico_municipal')} />
        <FI label="Código CNAE" value={f.servico_codigo_cnae} onChange={s('servico_codigo_cnae')} />
        <FI label="Código NBS" value={f.servico_codigo_nbs} onChange={s('servico_codigo_nbs')} />
        <FTA label="Descrição do Serviço" value={f.servico_descricao} onChange={s('servico_descricao')} full />
      </Card>
      <Card title="Valores (R$)" cols={3}>
        <FI label="Quantidade" value={f.servico_quantidade} onChange={s('servico_quantidade')} type="number" />
        <FI label="Valor Unitário" value={f.servico_valor_unitario} onChange={s('servico_valor_unitario')} type="number" />
        <FI label="Valor Total" value={f.servico_valor_total} onChange={s('servico_valor_total')} type="number" />
        <FI label="Alíquota ISS (%)" value={f.servico_aliquota_iss} onChange={s('servico_aliquota_iss')} type="number" />
        <FC label="ISS Retido" checked={f.servico_iss_retido} onChange={sb('servico_iss_retido')} />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function ImpostosTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.impostos, ctx.setImpostos);
  return (
    <div className="space-y-6">
      <PH title="Impostos e Retenções" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TaxGroup label="ISS" aliquota={+f.retencao_aliquota_iss} setAliquota={s('retencao_aliquota_iss')} valor={+f.retencao_valor_iss} setValor={s('retencao_valor_iss')} retido={f.retencao_iss_retido} setRetido={sb('retencao_iss_retido')} />
        <TaxGroup label="IR" aliquota={+f.retencao_aliquota_ir} setAliquota={s('retencao_aliquota_ir')} valor={+f.retencao_valor_ir} setValor={s('retencao_valor_ir')} retido={f.retencao_ir_retido} setRetido={sb('retencao_ir_retido')} />
        <TaxGroup label="CSLL" aliquota={+f.retencao_aliquota_csll} setAliquota={s('retencao_aliquota_csll')} valor={+f.retencao_valor_csll} setValor={s('retencao_valor_csll')} retido={f.retencao_csll_retido} setRetido={sb('retencao_csll_retido')} />
        <TaxGroup label="INSS" aliquota={+f.retencao_aliquota_inss} setAliquota={s('retencao_aliquota_inss')} valor={+f.retencao_valor_inss} setValor={s('retencao_valor_inss')} retido={f.retencao_inss_retido} setRetido={sb('retencao_inss_retido')} />
        <TaxGroup label="PIS" aliquota={+f.retencao_aliquota_pis} setAliquota={s('retencao_aliquota_pis')} valor={+f.retencao_valor_pis} setValor={s('retencao_valor_pis')} retido={f.retencao_pis_retido} setRetido={sb('retencao_pis_retido')} />
        <TaxGroup label="COFINS" aliquota={+f.retencao_aliquota_cofins} setAliquota={s('retencao_aliquota_cofins')} valor={+f.retencao_valor_cofins} setValor={s('retencao_valor_cofins')} retido={f.retencao_cofins_retido} setRetido={sb('retencao_cofins_retido')} />
      </div>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function TransparenciaTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.transparencia, ctx.setTransparencia);
  return (
    <div className="space-y-6">
      <PH title="Lei da Transparência" description="Carga tributária exibida na NFS-e conforme Lei 12.741/2012." />
      <Card title="Cargas Tributárias (%)" cols={3}>
        <FI label="Carga Federal (%)" value={f.transparencia_carga_federal} onChange={s('transparencia_carga_federal')} type="number" />
        <FI label="Carga Estadual (%)" value={f.transparencia_carga_estadual} onChange={s('transparencia_carga_estadual')} type="number" />
        <FI label="Carga Municipal (%)" value={f.transparencia_carga_municipal} onChange={s('transparencia_carga_municipal')} type="number" />
        <FI label="Fonte" value={f.transparencia_fonte} onChange={s('transparencia_fonte')} />
      </Card>
      <Card title="Texto de Exibição" cols={1}>
        <FTA label="Texto exibido na NFS-e" value={f.transparencia_texto_exibicao_nfse} onChange={s('transparencia_texto_exibicao_nfse')} rows={4} full />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function ReformaTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.reforma, ctx.setReforma);
  return (
    <div className="space-y-6">
      <PH title="Reforma Tributária - IBS/CBS" description="Campos para o novo sistema tributário conforme Anexo C." />
      <Card title="Classificação" cols={3}>
        <FDL label="CST IBS/CBS" value={f.reforma_cst_ibs_cbs} onChange={s('reforma_cst_ibs_cbs')} options={CST_IBSCBS_OPTIONS} placeholder="Selecione o CST" />
        <FDL label="Classificação Tributária" value={f.reforma_classificacao_tributaria} onChange={s('reforma_classificacao_tributaria')} options={CLASS_TRIB_IBSCBS_OPTIONS} placeholder="Selecione a classificação" />
        <FDL label="Indicador de Operação (cIndOp)" value={f.reforma_indicador_operacao} onChange={s('reforma_indicador_operacao')} options={INDOP_OPTIONS} placeholder="Digite código ou descrição" />
      </Card>
      <Card title="Base de Cálculo" cols={2}>
        <FI label="Base de Cálculo IBS/CBS (R$)" value={f.reforma_base_calculo_ibs_cbs} onChange={s('reforma_base_calculo_ibs_cbs')} type="number" />
        <FC label="Informar valor manual" checked={f.reforma_informar_valor_manual} onChange={sb('reforma_informar_valor_manual')} />
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">IBS Municipal</p>
          <FI label="Alíquota (%)" value={f.reforma_aliquota_ibs_municipal} onChange={s('reforma_aliquota_ibs_municipal')} type="number" />
          <FI label="Valor (R$)" value={f.reforma_valor_ibs_municipal} onChange={s('reforma_valor_ibs_municipal')} type="number" />
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">IBS Estadual</p>
          <FI label="Alíquota (%)" value={f.reforma_aliquota_ibs_estadual} onChange={s('reforma_aliquota_ibs_estadual')} type="number" />
          <FI label="Valor (R$)" value={f.reforma_valor_ibs_estadual} onChange={s('reforma_valor_ibs_estadual')} type="number" />
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">CBS</p>
          <FI label="Alíquota (%)" value={f.reforma_aliquota_cbs} onChange={s('reforma_aliquota_cbs')} type="number" />
          <FI label="Valor (R$)" value={f.reforma_valor_cbs} onChange={s('reforma_valor_cbs')} type="number" />
        </div>
      </div>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function DpsTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.dps, ctx.setDps);
  return (
    <div className="space-y-6">
      <PH title="DPS / NFS-e Nacional" description="Declaração de Prestação de Serviço — padrão nacional SEFIN." />
      <Card title="Identificação da DPS" cols={3}>
        <FS label="Ambiente" value={f.dps_ambiente} onChange={s('dps_ambiente')} options={['Produção', 'Homologação']} />
        <FI label="Número" value={f.dps_numero} onChange={s('dps_numero')} />
        <FI label="Série" value={f.dps_serie} onChange={s('dps_serie')} />
        <FI label="Data de Emissão" value={f.dps_data_emissao} onChange={s('dps_data_emissao')} type="date" />
        <FI label="Competência" value={f.dps_competencia} onChange={s('dps_competencia')} type="month" />
      </Card>
      <Card title="Serviço" cols={2}>
        <FI label="Código Tributação Nacional (cTribNac)" value={f.dps_servico_codigo_tributacao_nacional} onChange={s('dps_servico_codigo_tributacao_nacional')} />
        <FI label="Código Municipal (cTribMun)" value={f.dps_servico_codigo_municipal} onChange={s('dps_servico_codigo_municipal')} />
        <FTA label="Descrição do Serviço" value={f.dps_servico_descricao} onChange={s('dps_servico_descricao')} full />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function PrestadorTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.prestador, ctx.setPrestador);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certStatus, setCertStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [certMsg, setCertMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState('');

  useEffect(() => {
    const cep = f.prestador_cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    let active = true;
    buscarCep(cep).then(r => {
      if (!active || !r) return;
      ctx.setPrestador(p => ({ ...p, prestador_logradouro: r.logradouro || p.prestador_logradouro, prestador_bairro: r.bairro || p.prestador_bairro, prestador_municipio: r.municipio || p.prestador_municipio, prestador_codigo_municipio_ibge: r.ibge || p.prestador_codigo_municipio_ibge, prestador_uf: r.uf || p.prestador_uf }));
    });
    return () => { active = false; };
  }, [f.prestador_cep]);

  useEffect(() => {
    const cnpj = f.prestador_cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    const timer = setTimeout(async () => {
      const r = await buscarCnpj(cnpj);
      if (!r) return;
      ctx.setPrestador(p => ({ ...p, prestador_razao_social: r.razao_social || p.prestador_razao_social, prestador_nome_fantasia: r.nome_fantasia || p.prestador_nome_fantasia, prestador_email: r.email || p.prestador_email, prestador_cep: r.cep || p.prestador_cep, prestador_logradouro: r.logradouro || p.prestador_logradouro, prestador_numero: r.numero || p.prestador_numero, prestador_bairro: r.bairro || p.prestador_bairro, prestador_municipio: r.municipio || p.prestador_municipio, prestador_uf: r.uf || p.prestador_uf }));
    }, 500);
    return () => clearTimeout(timer);
  }, [f.prestador_cnpj]);

  const salvarEmitente = async () => {
    if (!f.prestador_cnpj || !f.prestador_razao_social) { setSalvoMsg('error:Informe CNPJ e Razão Social.'); return; }
    if (!validarCnpj(f.prestador_cnpj)) { setSalvoMsg('error:CNPJ inválido (verifique os dígitos verificadores).'); return; }
    setSalvando(true); setSalvoMsg('');
    try {
      const body = {
        cnpj: f.prestador_cnpj.replace(/[.\-\/]/g, ''),
        razao_social: f.prestador_razao_social,
        inscricao_municipal: f.prestador_inscricao_municipal,
        optante_simples: f.prestador_optante_simples_nacional,
        codigo_municipio_ibge: f.prestador_codigo_municipio_ibge,
        ambiente: f.prestador_ambiente_emissao === 'Produção' ? 'producao' : 'homologacao',
        endereco: { logradouro: f.prestador_logradouro, numero: f.prestador_numero, complemento: f.prestador_complemento, bairro: f.prestador_bairro, municipio: f.prestador_municipio, uf: f.prestador_uf, cep: f.prestador_cep },
        email: f.prestador_email,
        telefone: f.prestador_telefone,
        // cNaoNIF do prestador: para PJ nacional sempre '0'
        c_nao_nif: '0',
      };
      if (f.prestador_id) {
        const { error } = await supabase.from('nfse_emitentes').update(body).eq('id', f.prestador_id);
        if (error) throw error;
        setSalvoMsg('ok:Emitente atualizado com sucesso.');
      } else {
        const { data: result, error: fnError } = await supabase.functions.invoke('nfse-api/emitentes', { body });
        if (fnError) throw new Error(fnError.message);
        if (result?.error) throw new Error(result.error);
        ctx.setPrestador(p => ({ ...p, prestador_id: result.data.id }));
        setSalvoMsg('ok:Emitente registrado. ID: ' + result.data.id);
      }
      ctx.save();
    } catch (err) {
      setSalvoMsg('error:' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally { setSalvando(false); }
  };

  const uploadCertificado = async () => {
    if (!certFile) { setCertMsg('Selecione um arquivo .pfx ou .p12 primeiro.'); setCertStatus('error'); return; }
    if (!f.prestador_certificado_a1_senha) { setCertMsg('Informe a senha do certificado.'); setCertStatus('error'); return; }
    if (!f.prestador_id) { setCertMsg('Registre o emitente primeiro.'); setCertStatus('error'); return; }
    setCertStatus('uploading'); setCertMsg('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');
      const form = new FormData();
      form.append('certificate', certFile);
      form.append('password', f.prestador_certificado_a1_senha);
      form.append('emitterId', f.prestador_id);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfse-certificate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || `HTTP ${resp.status}`);
      ctx.setPrestador(p => ({ ...p, prestador_certificado_a1_arquivo: certFile.name }));
      ctx.save();
      setCertStatus('ok');
      setCertMsg(`Certificado "${certFile.name}" enviado e criptografado com sucesso.`);
      setCertFile(null);
      // Limpar senha após upload bem-sucedido (não armazenar)
      ctx.setPrestador(p => ({ ...p, prestador_certificado_a1_senha: '' }));
    } catch (err) {
      setCertStatus('error');
      setCertMsg(err instanceof Error ? err.message : 'Erro desconhecido no upload.');
    }
  };

  return (
    <div className="space-y-6">
      <PH title="Prestador" description="Dados do emitente da NFS-e." />
      <Card title="Identificação" cols={3}>
        <FI label="ID (gerado após registro)" value={f.prestador_id} onChange={s('prestador_id')} disabled />
        <FI label="CNPJ" value={f.prestador_cnpj} onChange={s('prestador_cnpj')} />
        <FI label="Razão Social" value={f.prestador_razao_social} onChange={s('prestador_razao_social')} />
        <FI label="Nome Fantasia" value={f.prestador_nome_fantasia} onChange={s('prestador_nome_fantasia')} />
        <FI label="Inscrição Municipal" value={f.prestador_inscricao_municipal} onChange={s('prestador_inscricao_municipal')} />
        <FS label="Regime Tributário" value={f.prestador_regime_tributario} onChange={s('prestador_regime_tributario')} options={['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI', 'Imune/Isento']} />
        <FC label="Optante pelo Simples Nacional" checked={f.prestador_optante_simples_nacional} onChange={sb('prestador_optante_simples_nacional')} />
      </Card>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">Registro no Sistema</p>
            <p className="mt-0.5 text-xs text-slate-500">{f.prestador_id ? `ID: ${f.prestador_id}` : 'Emitente ainda não registrado.'}</p>
          </div>
          <button type="button" onClick={salvarEmitente} disabled={salvando}
            className="shrink-0 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700">
            {salvando ? 'Salvando…' : f.prestador_id ? 'Atualizar Emitente' : 'Registrar Emitente'}
          </button>
        </div>
        {salvoMsg && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${salvoMsg.startsWith('ok:') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
            {salvoMsg.slice(3)}
          </p>
        )}
      </div>
      <Card title="Certificado A1 e Ambiente" cols={1}>
        <div className="col-span-full grid gap-4 sm:grid-cols-2">
          <FS label="Ambiente de Emissão" value={f.prestador_ambiente_emissao} onChange={s('prestador_ambiente_emissao')} options={['Homologação', 'Produção']} />
          <FI label="Senha do Certificado A1 (não armazenada após upload)" value={f.prestador_certificado_a1_senha} onChange={s('prestador_certificado_a1_senha')} type="password" />
        </div>
        <div className="col-span-full space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Arquivo Certificado A1 (.pfx / .p12)</span>
            <input type="file" accept=".pfx,.p12" onChange={e => { setCertFile(e.target.files?.[0] ?? null); setCertStatus('idle'); setCertMsg(''); }}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" />
          </label>
          {certFile && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <FileKey2 className="h-4 w-4 shrink-0 text-cyan-500" />
              <span className="truncate text-slate-700 dark:text-slate-300">{certFile.name}</span>
              <span className="ml-auto shrink-0 text-xs text-slate-400">{(certFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}
          {f.prestador_certificado_a1_arquivo && !certFile && (
            <p className="text-xs text-slate-500">Certificado atual: <span className="font-semibold">{f.prestador_certificado_a1_arquivo}</span></p>
          )}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            A senha do certificado é usada apenas no momento do upload e não é armazenada no banco de dados.
          </div>
          <button type="button" onClick={uploadCertificado} disabled={certStatus === 'uploading' || !certFile}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
            {certStatus === 'uploading' ? 'Enviando…' : 'Fazer Upload do Certificado'}
          </button>
          {certMsg && (
            <p className={`rounded-lg px-3 py-2 text-sm font-medium ${certStatus === 'ok' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
              {certMsg}
            </p>
          )}
        </div>
      </Card>
      <Card title="Endereço" cols={3}>
        <FI label="Logradouro" value={f.prestador_logradouro} onChange={s('prestador_logradouro')} />
        <FI label="Número" value={f.prestador_numero} onChange={s('prestador_numero')} />
        <FI label="Complemento" value={f.prestador_complemento} onChange={s('prestador_complemento')} />
        <FI label="Bairro" value={f.prestador_bairro} onChange={s('prestador_bairro')} />
        <FI label="Município" value={f.prestador_municipio} onChange={s('prestador_municipio')} />
        <FI label="Código IBGE" value={f.prestador_codigo_municipio_ibge} onChange={s('prestador_codigo_municipio_ibge')} />
        <FS label="UF" value={f.prestador_uf} onChange={s('prestador_uf')} options={UF_OPTIONS} />
        <FI label="CEP" value={f.prestador_cep} onChange={s('prestador_cep')} />
      </Card>
      <Card title="Contato" cols={2}>
        <FI label="E-mail" value={f.prestador_email} onChange={s('prestador_email')} type="email" />
        <FI label="Telefone" value={f.prestador_telefone} onChange={s('prestador_telefone')} />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function IntermediarioTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.intermediario, ctx.setIntermediario);
  return (
    <div className="space-y-6">
      <PH title="Intermediário" />
      <Card title="Presença do Intermediário" cols={1}><FC label="Existe intermediário nesta operação" checked={f.intermediario_existe} onChange={sb('intermediario_existe')} /></Card>
      {f.intermediario_existe && <>
        <Card title="Identificação" cols={2}>
          <FI label="CPF / CNPJ" value={f.intermediario_cpf_cnpj} onChange={s('intermediario_cpf_cnpj')} />
          <FI label="Razão Social" value={f.intermediario_razao_social} onChange={s('intermediario_razao_social')} />
          <FI label="Inscrição Municipal" value={f.intermediario_inscricao_municipal} onChange={s('intermediario_inscricao_municipal')} />
          <FI label="E-mail" value={f.intermediario_email} onChange={s('intermediario_email')} type="email" />
        </Card>
      </>}
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function PagamentoTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.pagamento, ctx.setPagamento);
  return (
    <div className="space-y-6">
      <PH title="Pagamento / Cobrança" />
      <Card title="Dados do Pagamento" cols={3}>
        <FS label="Forma de Pagamento" value={f.pagamento_forma_pagamento} onChange={s('pagamento_forma_pagamento')} options={['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto', 'Transferência', 'Cheque', 'Outros']} />
        <FS label="Status" value={f.pagamento_status} onChange={s('pagamento_status')} options={['Pendente', 'Pago', 'Vencido', 'Cancelado', 'Parcial']} />
        <FI label="Data de Vencimento" value={f.pagamento_data_vencimento} onChange={s('pagamento_data_vencimento')} type="date" />
        <FI label="Valor Cobrado (R$)" value={f.pagamento_valor_cobrado} onChange={s('pagamento_valor_cobrado')} type="number" />
        <FI label="Valor Pago (R$)" value={f.pagamento_valor_pago} onChange={s('pagamento_valor_pago')} type="number" />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function EmailClienteTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.emailCliente, ctx.setEmailCliente);
  return (
    <div className="space-y-6">
      <PH title="E-mail para o Cliente" />
      <Card title="Destinatários" cols={1}>
        <FI label="Destinatários" value={f.email_destinatarios} onChange={s('email_destinatarios')} full />
        <FI label="CC" value={f.email_copia} onChange={s('email_copia')} full />
      </Card>
      <Card title="Conteúdo" cols={1}>
        <FI label="Assunto" value={f.email_assunto} onChange={s('email_assunto')} full />
        <FTA label="Corpo do E-mail" value={f.email_corpo} onChange={s('email_corpo')} rows={6} full />
      </Card>
      <Card title="Anexos" cols={1}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FC label="Enviar XML" checked={f.email_enviar_xml} onChange={sb('email_enviar_xml')} />
          <FC label="Enviar PDF" checked={f.email_enviar_pdf} onChange={sb('email_enviar_pdf')} />
          <FC label="Enviar link do portal" checked={f.email_enviar_link_portal} onChange={sb('email_enviar_link_portal')} />
        </div>
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function XmlTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.xml, ctx.setXml);
  return (
    <div className="space-y-6">
      <PH title="XML / API / Retorno" />
      <Card title="Identificação da Nota" cols={3}>
        <FS label="Status" value={f.api_status} onChange={s('api_status')} options={['Autorizada', 'Rejeitada', 'Em processamento', 'Cancelada', 'Erro']} />
        <FS label="Ambiente" value={f.api_ambiente} onChange={s('api_ambiente')} options={['Produção', 'Homologação']} />
        <FI label="Chave de Acesso NFS-e" value={f.api_chave_acesso_nfse} onChange={s('api_chave_acesso_nfse')} />
        <FI label="Número da NFS-e" value={f.api_numero_nfse} onChange={s('api_numero_nfse')} />
        <FI label="Código de Verificação" value={f.api_codigo_verificacao} onChange={s('api_codigo_verificacao')} />
      </Card>
      <Card title="XML / JSON Enviado" cols={1}>
        <FTA label="XML DPS Enviado" value={f.api_xml_dps_enviado} onChange={s('api_xml_dps_enviado')} mono rows={6} full />
      </Card>
      <Card title="XML / JSON de Retorno" cols={1}>
        <FTA label="XML NFS-e Retorno" value={f.api_xml_nfse_retorno} onChange={s('api_xml_nfse_retorno')} mono rows={6} full />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function CancelamentoTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.cancelamento, ctx.setCancelamento);
  return (
    <div className="space-y-6">
      <PH title="Cancelamento / Substituição" />
      <Card title="Cancelamento" cols={2}>
        <div className="col-span-full"><FC label="NFS-e cancelada" checked={f.nfse_cancelada} onChange={sb('nfse_cancelada')} /></div>
        {f.nfse_cancelada && <>
          <FI label="Data de Cancelamento" value={f.nfse_data_cancelamento} onChange={s('nfse_data_cancelamento')} type="datetime-local" />
          <FI label="Protocolo de Cancelamento" value={f.nfse_protocolo_cancelamento} onChange={s('nfse_protocolo_cancelamento')} />
          <FTA label="Motivo do Cancelamento" value={f.nfse_motivo_cancelamento} onChange={s('nfse_motivo_cancelamento')} full />
        </>}
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function AnexosTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.anexos, ctx.setAnexos);
  return (
    <div className="space-y-6">
      <PH title="Anexos" />
      <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <Paperclip className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Arraste arquivos aqui ou clique para selecionar</p>
        <p className="mt-1 text-xs text-slate-400">PDF, XML, imagens até 20 MB</p>
        <button type="button" className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700">Selecionar arquivo</button>
      </div>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function HistoricoFinanceiroTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.historicoFinanceiro, ctx.setHistoricoFinanceiro);
  return (
    <div className="space-y-6">
      <PH title="Histórico Financeiro" />
      <Card title="Datas" cols={3}>
        <FI label="Data de Emissão" value={f.historico_data_emissao} onChange={s('historico_data_emissao')} type="date" />
        <FI label="Data de Vencimento" value={f.historico_data_vencimento} onChange={s('historico_data_vencimento')} type="date" />
        <FI label="Data de Pagamento" value={f.historico_data_pagamento} onChange={s('historico_data_pagamento')} type="date" />
      </Card>
      <Card title="Valores e Status" cols={3}>
        <FI label="Valor (R$)" value={f.historico_valor} onChange={s('historico_valor')} type="number" />
        <FI label="Valor Pago (R$)" value={f.historico_valor_pago} onChange={s('historico_valor_pago')} type="number" />
        <FS label="Status" value={f.historico_status} onChange={s('historico_status')} options={['Pendente', 'Pago', 'Vencido', 'Cancelado', 'Parcial']} />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function HistoricoAlteracoesTab() {
  const mockLog = [
    { campo: 'cliente_razao_social', antigo: 'Empresa A Ltda', novo: 'Empresa A Comércio Ltda', usuario: 'admin@empresa.com', data: '22/06/2026 14:32', ip: '192.168.1.1' },
    { campo: 'contrato_status', antigo: 'Suspenso', novo: 'Ativo', usuario: 'admin@empresa.com', data: '22/06/2026 09:15', ip: '192.168.1.1' },
  ];
  return (
    <div className="space-y-6">
      <PH title="Histórico de Alterações / Auditoria" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <tr>{['Campo', 'Valor Anterior', 'Valor Novo', 'Usuário', 'Data', 'IP'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {mockLog.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{row.campo}</td>
                <td className="px-4 py-3 text-xs text-rose-500">{row.antigo}</td>
                <td className="px-4 py-3 text-xs text-cyan-600">{row.novo}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.usuario}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.data}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsuariosTab() {
  const ctx = usePortal();
  const { f, s, sb } = usePortalTab(ctx.usuarios, ctx.setUsuarios);
  return (
    <div className="space-y-6">
      <PH title="Usuário do Sistema" />
      <Card title="Dados do Usuário" cols={3}>
        <FI label="Nome" value={f.usuario_nome} onChange={s('usuario_nome')} />
        <FI label="E-mail" value={f.usuario_email} onChange={s('usuario_email')} type="email" />
        <FS label="Perfil" value={f.usuario_perfil} onChange={s('usuario_perfil')} options={['Administrador', 'Operador', 'Visualizador', 'Financeiro', 'Técnico']} />
        <FC label="Usuário Ativo" checked={f.usuario_ativo} onChange={sb('usuario_ativo')} />
      </Card>
      <Card title="Permissões" cols={1}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FC label="Emitir NFS-e" checked={f.usuario_permissao_emitir_nfse} onChange={sb('usuario_permissao_emitir_nfse')} />
          <FC label="Cancelar NFS-e" checked={f.usuario_permissao_cancelar_nfse} onChange={sb('usuario_permissao_cancelar_nfse')} />
          <FC label="Alterar Cadastro" checked={f.usuario_permissao_alterar_cadastro} onChange={sb('usuario_permissao_alterar_cadastro')} />
        </div>
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}

function ControleTab() {
  const ctx = usePortal();
  const { f, s } = usePortalTab(ctx.controle, ctx.setControle);
  type NotaRow = {
    id: string; numero_nfse: string | null; chave_acesso: string | null;
    codigo_verificacao: string | null; status: string; xml_nfse_path: string | null;
    danfse_path: string | null; criado_em: string;
    nfse_dps: { valor_servico: number | null; tomador_snapshot: Record<string, unknown> | null } | null;
  };
  const [notas, setNotas] = useState<NotaRow[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [cancelandoId, setCanceladoId] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const carregarNotas = async () => {
    setCarregando(true);
    const { data } = await supabase.from('nfse_notas').select('id, numero_nfse, chave_acesso, codigo_verificacao, status, xml_nfse_path, danfse_path, criado_em, nfse_dps(valor_servico, tomador_snapshot)').order('criado_em', { ascending: false }).limit(20);
    setNotas((data as NotaRow[]) || []);
    setCarregando(false);
  };
  useEffect(() => { carregarNotas(); }, []);

  const baixar = async (path: string) => {
    const { data } = await supabase.storage.from('nfse-documentos').createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const cancelarNota = async (notaId: string) => {
    if ((justificativa || '').trim().length < 15) { setCancelMsg('Justificativa deve ter pelo menos 15 caracteres.'); return; }
    setCancelando(true); setCancelMsg('');
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(`nfse-api/notas/${notaId}/cancelamento`, { body: { justificativa } });
      if (fnError) throw new Error(fnError.message);
      if (result?.error) throw new Error(result.error);
      setCanceladoId(null); setJustificativa('');
      await carregarNotas();
    } catch (err) {
      setCancelMsg(err instanceof Error ? err.message : 'Erro ao cancelar nota.');
    } finally { setCancelando(false); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      autorizada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
      cancelada: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
      substituida: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    };
    return <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <PH title="Controle de Notas Fiscais" description="Histórico de NFS-e emitidas pelo Portal Nacional." />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <p className="font-bold text-slate-800 dark:text-slate-100">Notas emitidas (últimas 20)</p>
          <button type="button" onClick={carregarNotas} disabled={carregando}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
            {carregando ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>
        {notas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">{carregando ? 'Buscando notas…' : 'Nenhuma nota emitida ainda.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>{['Número', 'Tomador', 'Valor', 'Status', 'Data', 'Ações'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {notas.map(nota => {
                  const tomador = (nota.nfse_dps?.tomador_snapshot as any)?.razao_social ?? '—';
                  const valor = nota.nfse_dps?.valor_servico;
                  return (
                    <React.Fragment key={nota.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{nota.numero_nfse ?? <span className="text-slate-400">—</span>}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">{tomador}</td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{valor != null ? `R$ ${Number(valor).toFixed(2)}` : '—'}</td>
                        <td className="px-4 py-3">{statusBadge(nota.status)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(nota.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {nota.xml_nfse_path && <button type="button" onClick={() => baixar(nota.xml_nfse_path!)} title="Baixar XML" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700"><FileText className="h-3.5 w-3.5" /></button>}
                            {nota.danfse_path && <button type="button" onClick={() => baixar(nota.danfse_path!)} title="Baixar DANFS-e" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700"><Paperclip className="h-3.5 w-3.5" /></button>}
                            {nota.status === 'autorizada' && (
                              <button type="button" onClick={() => { setCanceladoId(cancelandoId === nota.id ? null : nota.id); setCancelMsg(''); setJustificativa(''); }}
                                className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30">
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {cancelandoId === nota.id && (
                        <tr>
                          <td colSpan={6} className="border-t border-rose-100 bg-rose-50 px-5 py-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                            <p className="mb-2 text-sm font-bold text-rose-800 dark:text-rose-300">Cancelar NFS-e {nota.numero_nfse}</p>
                            <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Justificativa (mínimo 15 caracteres)…" rows={2}
                              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-rose-500/30 dark:bg-slate-900 dark:text-slate-100" />
                            {cancelMsg && <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{cancelMsg}</p>}
                            <div className="mt-3 flex gap-3">
                              <button type="button" onClick={() => cancelarNota(nota.id)} disabled={cancelando}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                                {cancelando ? 'Cancelando…' : 'Confirmar Cancelamento'}
                              </button>
                              <button type="button" onClick={() => setCanceladoId(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300">
                                Desistir
                              </button>
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
        )}
      </div>
      <Card title="Detalhe / Referência" cols={3}>
        <FI label="Número NFS-e" value={f.nfse_numero} onChange={s('nfse_numero')} />
        <FI label="Chave de Acesso" value={f.nfse_chave_acesso} onChange={s('nfse_chave_acesso')} />
        <FI label="Código de Verificação" value={f.nfse_codigo_verificacao} onChange={s('nfse_codigo_verificacao')} />
        <FI label="Competência" value={f.nfse_competencia} onChange={s('nfse_competencia')} type="month" />
        <FI label="Observação" value={f.nfse_observacao} onChange={s('nfse_observacao')} />
      </Card>
      <SaveBtn onSave={ctx.save} />
    </div>
  );
}