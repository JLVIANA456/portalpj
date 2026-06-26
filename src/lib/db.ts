/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PJUser,
  Invoice,
  SupabaseConfig,
  Tenant,
  Client,
  Cobranca,
  CobrancaStatus,
  ContaPagar,
  ContaPagarStatus,
  ContaReceber,
  ContaReceberStatus
} from '../types';
import { supabase } from './supabase';

export const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Agência TechVanguard',
    code: 'TECH123'
  },
  {
    id: 'tenant-2',
    name: 'Consultoria Alpha',
    code: 'ALPHA456'
  }
];

export const DEFAULT_USERS: PJUser[] = [
  {
    id: 'user-pj-1',
    tenantId: 'tenant-1',
    cnpj: '12.345.678/0001-99',
    companyName: 'TechVanguard Soluções Tecnológicas Ltda',
    ownerName: 'Danilo Silva',
    email: 'danilo@techvanguard.com.br',
    role: 'pj',
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'user-pj-2',
    tenantId: 'tenant-1',
    cnpj: '98.765.432/0001-11',
    companyName: 'PixelCraft Marketing Digital ME',
    ownerName: 'Mariana Costa',
    email: 'financeiro@pixelcraft.com',
    role: 'pj',
    createdAt: '2026-02-15T14:30:00Z'
  },
  {
    id: 'admin-1',
    tenantId: 'tenant-1',
    cnpj: '00.000.000/0001-00',
    companyName: 'Administradora Tenant 1',
    ownerName: 'Gestor Financeiro Local',
    email: 'admin@empresa1.com.br',
    role: 'admin_tenant',
    createdAt: '2026-01-01T09:00:00Z'
  },
  {
    id: 'super-admin-1',
    cnpj: '00.000.000/0000-00',
    companyName: 'Portal PJ (Dono do Sistema)',
    ownerName: 'Super Admin',
    email: 'admin@portalpj.com.br',
    role: 'super_admin',
    createdAt: '2026-01-01T08:00:00Z'
  }
];

const PRELOADED_INVOICES: Invoice[] = [
  {
    id: 'invoice-101',
    tenantId: 'tenant-1',
    userId: 'user-pj-1',
    companyName: 'TechVanguard Soluções Tecnológicas Ltda',
    cnpj: '12.345.678/0001-99',
    invoiceNumber: '20260023',
    issueDate: '2026-05-05',
    competenciaMonth: 'Maio',
    competenciaYear: '2026',
    amount: 14500.00,
    fileName: 'NF_20260023_TechVanguard.pdf',
    fileType: 'application/pdf',
    fileSize: 245120,
    downloadUrl: 'data:text/plain;base64,U0lNVUxBRE8gREUgS0VZX05PVEFfRklTQ0FMX1BERg==',
    status: 'aprovado',
    notes: 'Desenvolvimento de software referente ao sprint 8.',
    feedback: 'Tudo certinho com a nota fiscal e as horas trabalhadas!',
    createdAt: '2026-05-05T18:30:00Z'
  },
  {
    id: 'invoice-102',
    tenantId: 'tenant-1',
    userId: 'user-pj-1',
    companyName: 'TechVanguard Soluções Tecnológicas Ltda',
    cnpj: '12.345.678/0001-99',
    invoiceNumber: '20260024',
    issueDate: '2026-06-01',
    competenciaMonth: 'Junho',
    competenciaYear: '2026',
    amount: 15200.00,
    fileName: 'NF_20260024_TechVanguard.pdf',
    fileType: 'application/pdf',
    fileSize: 248900,
    downloadUrl: 'data:text/plain;base64,U0lNVUxBRE8gREUgS0VZX05PVEFfRklTQ0FMX1BERg==',
    status: 'pendente',
    notes: 'Serviços de consultoria em arquitetura de cloud, competência Junho.',
    createdAt: '2026-06-01T09:15:00Z'
  },
  {
    id: 'invoice-103',
    tenantId: 'tenant-1',
    userId: 'user-pj-2',
    companyName: 'PixelCraft Marketing Digital ME',
    cnpj: '98.765.432/0001-11',
    invoiceNumber: '00155',
    issueDate: '2026-05-10',
    competenciaMonth: 'Maio',
    competenciaYear: '2026',
    amount: 5800.00,
    fileName: 'NotaFiscal_00155_PixelCraft.pdf',
    fileType: 'application/pdf',
    fileSize: 189400,
    downloadUrl: 'data:text/plain;base64,U0lNVUxBRE8gREUgS0VZX05PVEFfRklTQ0FMX1BERg==',
    status: 'aprovado',
    notes: 'Gestão de tráfego pago e mídias sociais para a campanha de Outono.',
    feedback: 'Validado.',
    createdAt: '2026-05-10T11:45:00Z'
  },
  {
    id: 'invoice-104',
    tenantId: 'tenant-1',
    userId: 'user-pj-2',
    companyName: 'PixelCraft Marketing Digital ME',
    cnpj: '98.765.432/0001-11',
    invoiceNumber: '00156',
    issueDate: '2026-05-28',
    competenciaMonth: 'Maio',
    competenciaYear: '2026',
    amount: 2300.00,
    fileName: 'recibo_reembolso_viagem.xlsx',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 95400,
    downloadUrl: 'data:text/plain;base64,U0lNVUxBRE8gUkVDSUJPX1hMU1g=',
    status: 'rejeitado',
    notes: 'Reembolso das despesas de viagem de negócios para São Paulo.',
    feedback: 'O valor do reembolso deve ser feito em canal separado de reembolso, não emitido como nota fiscal de prestação de serviços padrão.',
    createdAt: '2026-05-28T16:20:00Z'
  },
  {
    id: 'invoice-105',
    tenantId: 'tenant-1',
    userId: 'user-pj-2',
    companyName: 'PixelCraft Marketing Digital ME',
    cnpj: '98.765.432/0001-11',
    invoiceNumber: '00157',
    issueDate: '2026-06-02',
    competenciaMonth: 'Junho',
    competenciaYear: '2026',
    amount: 6000.00,
    fileName: 'NF_00157_Junho.pdf',
    fileType: 'application/pdf',
    fileSize: 195000,
    downloadUrl: 'data:text/plain;base64,U0lNVUxBRE8gREUgS0VZX05PVEFfRklTQ0FMX1BERg==',
    status: 'pendente',
    notes: 'Prestação de serviços contínuos de marketing digital.',
    createdAt: '2026-06-02T10:05:00Z'
  }
];

const STORAGE_KEYS = {
  USERS: 'portal_pj_users',
  INVOICES: 'portal_pj_invoices',
  TENANTS: 'portal_pj_tenants',
  SUPABASE_CONFIG: 'portal_pj_supabase_config'
};

type DbProfile = {
  id: string;
  tenant_id?: string | null;
  cnpj?: string | null;
  razao_social?: string | null;
  nome_responsavel?: string | null;
  email?: string | null;
  cargo?: PJUser['role'] | string | null;
  criado_em?: string | null;
  empresas_contratantes?: { nome?: string | null } | { nome?: string | null }[] | null;
};

type DbInvoice = {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  cnpj?: string | null;
  razao_social?: string | null;
  numero_nota?: string | null;
  data_emissao?: string | null;
  competencia_mes?: string | null;
  competencia_ano?: string | null;
  valor?: number | string | null;
  formato_arquivo?: string | null;
  tamanho_arquivo?: number | null;
  nome_arquivo?: string | null;
  link_download?: string | null;
  status?: Invoice['status'] | string | null;
  observacoes?: string | null;
  feedback_admin?: string | null;
  criado_em?: string | null;
};

type DbContaPagar = {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  fornecedor?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  valor?: number | string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  status?: ContaPagarStatus | string | null;
  forma_pagamento?: string | null;
  arquivo_url?: string | null;
  ofx_fitid?: string | null;
  ofx_data?: string | null;
  ofx_descricao?: string | null;
  observacoes?: string | null;
  criado_em?: string | null;
};

type DbContaReceber = {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  cliente_nome?: string | null;
  cliente_email?: string | null;
  cliente_documento?: string | null;
  nota_fiscal_id?: string | null;
  descricao?: string | null;
  valor?: number | string | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  data_recebimento?: string | null;
  status?: ContaReceberStatus | string | null;
  forma_pagamento?: string | null;
  ofx_fitid?: string | null;
  ofx_data?: string | null;
  ofx_descricao?: string | null;
  observacoes?: string | null;
  criado_em?: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const removePassword = <T extends Record<string, any>>(user: T): Omit<T, 'password'> => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const getTenantNameFromProfile = (u: DbProfile) => {
  const tenant = Array.isArray(u.empresas_contratantes)
    ? u.empresas_contratantes[0]
    : u.empresas_contratantes;
  return tenant?.nome || u.tenant_id || 'Sem tenant';
};

const mapDbProfileToUser = (u: DbProfile): PJUser => ({
  id: u.id,
  tenantId: u.tenant_id || 'tenant-1',
  cnpj: u.cnpj || '',
  companyName: u.razao_social || '',
  ownerName: u.nome_responsavel || '',
  email: u.email || '',
  role: (u.cargo || 'pj') as PJUser['role'],
  createdAt: u.criado_em || new Date().toISOString()
});

const mapDbInvoiceToInvoice = (dbInv: DbInvoice): Invoice => ({
  id: dbInv.id,
  tenantId: dbInv.tenant_id || 'tenant-1',
  userId: dbInv.user_id || '',
  companyName: dbInv.razao_social || '',
  cnpj: dbInv.cnpj || '',
  invoiceNumber: dbInv.numero_nota || '',
  issueDate: dbInv.data_emissao || dbInv.criado_em || '',
  competenciaMonth: dbInv.competencia_mes || '',
  competenciaYear: dbInv.competencia_ano || '',
  amount: Number(dbInv.valor || 0),
  fileName: dbInv.nome_arquivo || '',
  fileType: dbInv.formato_arquivo || '',
  fileSize: Number(dbInv.tamanho_arquivo || 0),
  downloadUrl: dbInv.link_download || '',
  status: (dbInv.status || 'pendente') as Invoice['status'],
  notes: dbInv.observacoes || '',
  feedback: dbInv.feedback_admin || undefined,
  createdAt: dbInv.criado_em || new Date().toISOString()
});

const mapDbContaPagarToContaPagar = (item: DbContaPagar): ContaPagar => ({
  id: item.id,
  tenantId: item.tenant_id || 'tenant-1',
  userId: item.user_id || undefined,
  fornecedor: item.fornecedor || '',
  categoria: item.categoria || 'Outros',
  descricao: item.descricao || '',
  valor: Number(item.valor || 0),
  dataVencimento: item.data_vencimento || '',
  dataPagamento: item.data_pagamento || undefined,
  status: (item.status || 'aberto') as ContaPagarStatus,
  formaPagamento: item.forma_pagamento || undefined,
  arquivoUrl: item.arquivo_url || undefined,
  ofxFitid: item.ofx_fitid || undefined,
  ofxData: item.ofx_data || undefined,
  ofxDescricao: item.ofx_descricao || undefined,
  observacoes: item.observacoes || undefined,
  createdAt: item.criado_em || new Date().toISOString()
});

const mapDbContaReceberToContaReceber = (item: DbContaReceber): ContaReceber => ({
  id: item.id,
  tenantId: item.tenant_id || 'tenant-1',
  userId: item.user_id || undefined,
  clienteNome: item.cliente_nome || '',
  clienteEmail: item.cliente_email || undefined,
  clienteDocumento: item.cliente_documento || undefined,
  notaFiscalId: item.nota_fiscal_id || undefined,
  descricao: item.descricao || '',
  valor: Number(item.valor || 0),
  dataEmissao: item.data_emissao || '',
  dataVencimento: item.data_vencimento || '',
  dataRecebimento: item.data_recebimento || undefined,
  status: (item.status || 'pendente') as ContaReceberStatus,
  formaPagamento: item.forma_pagamento || undefined,
  ofxFitid: item.ofx_fitid || undefined,
  ofxData: item.ofx_data || undefined,
  ofxDescricao: item.ofx_descricao || undefined,
  observacoes: item.observacoes || undefined,
  createdAt: item.criado_em || new Date().toISOString()
});

const requireSupabaseFinanceiro = () => {
  const config = getSupabaseConfig();
  if (config.useMockDatabase) {
    throw new Error('Configure o Supabase para usar Contas a Pagar e Contas a Receber. Esta area nao grava em localStorage.');
  }
};

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Erro ao validar usuário autenticado: ${error.message}`);
  }

  if (!data.user?.id) {
    throw new Error('Usuário não autenticado no Supabase. Faça login novamente antes de enviar notas.');
  }

  return data.user.id;
}

export function initDB() {
  if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(DEFAULT_TENANTS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(PRELOADED_INVOICES));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG)) {
    const defaultConfig: SupabaseConfig = {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      isConnected: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
      useMockDatabase: !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
    };
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(defaultConfig));
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  initDB();
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('notas_fiscais')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar notas fiscais:', error);
    return [];
  }

  return (data || []).map(mapDbInvoiceToInvoice);
}

export async function getUsers(): Promise<PJUser[]> {
  initDB();
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    return users.map((u: any) => removePassword(u));
  }

  const { data, error } = await supabase
    .from('perfis_pj')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }

  return (data || []).map(mapDbProfileToUser);
}

export function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
}

export async function addInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const invoices = await getInvoices();
    const newInvoice: Invoice = {
      ...invoice,
      id: `invoice-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    invoices.unshift(newInvoice);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    return newInvoice;
  }

  const authUserId = await getAuthenticatedUserId();

  if (!invoice.downloadUrl || invoice.downloadUrl.startsWith('data:')) {
    throw new Error('Arquivo inválido para salvar. Envie o arquivo ao Supabase Storage e grave apenas a URL pública ou caminho do arquivo.');
  }

  const payload = {
    tenant_id: invoice.tenantId || 'tenant-1',
    user_id: authUserId,
    cnpj: invoice.cnpj,
    razao_social: invoice.companyName,
    numero_nota: invoice.invoiceNumber,
    data_emissao: invoice.issueDate || null,
    competencia_mes: invoice.competenciaMonth,
    competencia_ano: invoice.competenciaYear,
    valor: Number(invoice.amount || 0),
    formato_arquivo: invoice.fileType,
    tamanho_arquivo: Number(invoice.fileSize || 0),
    nome_arquivo: invoice.fileName,
    link_download: invoice.downloadUrl,
    status: invoice.status || 'pendente',
    observacoes: invoice.notes || ''
  };

  const { data, error } = await supabase
    .from('notas_fiscais')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao inserir nota fiscal:', error);
    throw new Error(`Erro ao salvar nota fiscal: ${error.message}`);
  }

  return mapDbInvoiceToInvoice(data);
}

export async function updateInvoiceStatus(
  id: string,
  status: 'pendente' | 'aprovado' | 'rejeitado',
  feedback?: string
): Promise<Invoice | null> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const invoices = await getInvoices();
    const idx = invoices.findIndex(inv => inv.id === id);

    if (idx !== -1) {
      invoices[idx].status = status;
      if (feedback !== undefined) {
        invoices[idx].feedback = feedback;
      }
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      return invoices[idx];
    }

    return null;
  }

  const updates: { status: string; feedback_admin?: string } = { status };
  if (feedback !== undefined) {
    updates.feedback_admin = feedback;
  }

  const { data, error } = await supabase
    .from('notas_fiscais')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao atualizar status da nota:', error);
    return null;
  }

  return mapDbInvoiceToInvoice(data);
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const invoices = await getInvoices();
    const idx = invoices.findIndex(inv => inv.id === id);
    if (idx !== -1) {
      invoices.splice(idx, 1);
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      return true;
    }
    return false;
  }

  const { error } = await supabase
    .from('notas_fiscais')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar a nota:', error);
    return false;
  }

  return true;
}

export async function getContasPagar(user: PJUser): Promise<ContaPagar[]> {
  requireSupabaseFinanceiro();
  let q = supabase.from('contas_pagar').select('*').order('data_vencimento', { ascending: true });
  if (user.role !== 'super_admin') q = q.eq('tenant_id', user.tenantId || 'tenant-1');

  const { data, error } = await q;
  if (error) throw new Error(`Erro ao buscar contas a pagar: ${error.message}`);
  return (data || []).map(mapDbContaPagarToContaPagar);
}

export async function addContaPagar(user: PJUser, conta: Omit<ContaPagar, 'id' | 'tenantId' | 'userId' | 'createdAt'>): Promise<ContaPagar> {
  requireSupabaseFinanceiro();
  const authUserId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('contas_pagar')
    .insert({
      tenant_id: user.tenantId || 'tenant-1',
      user_id: authUserId,
      fornecedor: conta.fornecedor,
      categoria: conta.categoria,
      descricao: conta.descricao,
      valor: Number(conta.valor || 0),
      data_vencimento: conta.dataVencimento,
      data_pagamento: conta.dataPagamento || null,
      status: conta.status || 'aberto',
      forma_pagamento: conta.formaPagamento || null,
      arquivo_url: conta.arquivoUrl || null,
      ofx_fitid: conta.ofxFitid || null,
      ofx_data: conta.ofxData || null,
      ofx_descricao: conta.ofxDescricao || null,
      observacoes: conta.observacoes || null
    })
    .select('*')
    .single();

  if (error) throw new Error(`Erro ao criar conta a pagar: ${error.message}`);
  return mapDbContaPagarToContaPagar(data);
}

export async function updateContaPagar(id: string, updates: Partial<ContaPagar>): Promise<ContaPagar> {
  requireSupabaseFinanceiro();
  const payload: Record<string, any> = {};
  if (updates.fornecedor !== undefined) payload.fornecedor = updates.fornecedor;
  if (updates.categoria !== undefined) payload.categoria = updates.categoria;
  if (updates.descricao !== undefined) payload.descricao = updates.descricao;
  if (updates.valor !== undefined) payload.valor = Number(updates.valor || 0);
  if (updates.dataVencimento !== undefined) payload.data_vencimento = updates.dataVencimento;
  if (updates.dataPagamento !== undefined) payload.data_pagamento = updates.dataPagamento || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.formaPagamento !== undefined) payload.forma_pagamento = updates.formaPagamento || null;
  if (updates.arquivoUrl !== undefined) payload.arquivo_url = updates.arquivoUrl || null;
  if (updates.ofxFitid !== undefined) payload.ofx_fitid = updates.ofxFitid || null;
  if (updates.ofxData !== undefined) payload.ofx_data = updates.ofxData || null;
  if (updates.ofxDescricao !== undefined) payload.ofx_descricao = updates.ofxDescricao || null;
  if (updates.observacoes !== undefined) payload.observacoes = updates.observacoes || null;

  const { data, error } = await supabase
    .from('contas_pagar')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Erro ao atualizar conta a pagar: ${error.message}`);
  return mapDbContaPagarToContaPagar(data);
}

export async function deleteContaPagar(id: string): Promise<boolean> {
  requireSupabaseFinanceiro();
  const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir conta a pagar: ${error.message}`);
  return true;
}

export async function getContasReceber(user: PJUser): Promise<ContaReceber[]> {
  requireSupabaseFinanceiro();
  let q = supabase.from('contas_receber').select('*').order('data_vencimento', { ascending: true });
  if (user.role !== 'super_admin') q = q.eq('tenant_id', user.tenantId || 'tenant-1');

  const { data, error } = await q;
  if (error) throw new Error(`Erro ao buscar contas a receber: ${error.message}`);
  return (data || []).map(mapDbContaReceberToContaReceber);
}

export async function addContaReceber(user: PJUser, conta: Omit<ContaReceber, 'id' | 'tenantId' | 'userId' | 'createdAt'>): Promise<ContaReceber> {
  requireSupabaseFinanceiro();
  const authUserId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('contas_receber')
    .insert({
      tenant_id: user.tenantId || 'tenant-1',
      user_id: authUserId,
      cliente_nome: conta.clienteNome,
      cliente_email: conta.clienteEmail || null,
      cliente_documento: conta.clienteDocumento || null,
      nota_fiscal_id: conta.notaFiscalId || null,
      descricao: conta.descricao,
      valor: Number(conta.valor || 0),
      data_emissao: conta.dataEmissao,
      data_vencimento: conta.dataVencimento,
      data_recebimento: conta.dataRecebimento || null,
      status: conta.status || 'pendente',
      forma_pagamento: conta.formaPagamento || null,
      ofx_fitid: conta.ofxFitid || null,
      ofx_data: conta.ofxData || null,
      ofx_descricao: conta.ofxDescricao || null,
      observacoes: conta.observacoes || null
    })
    .select('*')
    .single();

  if (error) throw new Error(`Erro ao criar conta a receber: ${error.message}`);
  return mapDbContaReceberToContaReceber(data);
}

export async function updateContaReceber(id: string, updates: Partial<ContaReceber>): Promise<ContaReceber> {
  requireSupabaseFinanceiro();
  const payload: Record<string, any> = {};
  if (updates.clienteNome !== undefined) payload.cliente_nome = updates.clienteNome;
  if (updates.clienteEmail !== undefined) payload.cliente_email = updates.clienteEmail || null;
  if (updates.clienteDocumento !== undefined) payload.cliente_documento = updates.clienteDocumento || null;
  if (updates.notaFiscalId !== undefined) payload.nota_fiscal_id = updates.notaFiscalId || null;
  if (updates.descricao !== undefined) payload.descricao = updates.descricao;
  if (updates.valor !== undefined) payload.valor = Number(updates.valor || 0);
  if (updates.dataEmissao !== undefined) payload.data_emissao = updates.dataEmissao;
  if (updates.dataVencimento !== undefined) payload.data_vencimento = updates.dataVencimento;
  if (updates.dataRecebimento !== undefined) payload.data_recebimento = updates.dataRecebimento || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.formaPagamento !== undefined) payload.forma_pagamento = updates.formaPagamento || null;
  if (updates.ofxFitid !== undefined) payload.ofx_fitid = updates.ofxFitid || null;
  if (updates.ofxData !== undefined) payload.ofx_data = updates.ofxData || null;
  if (updates.ofxDescricao !== undefined) payload.ofx_descricao = updates.ofxDescricao || null;
  if (updates.observacoes !== undefined) payload.observacoes = updates.observacoes || null;

  const { data, error } = await supabase
    .from('contas_receber')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Erro ao atualizar conta a receber: ${error.message}`);
  return mapDbContaReceberToContaReceber(data);
}

export async function deleteContaReceber(id: string): Promise<boolean> {
  requireSupabaseFinanceiro();
  const { error } = await supabase.from('contas_receber').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir conta a receber: ${error.message}`);
  return true;
}

export async function lookupCnpj(cnpj: string): Promise<PJUser | null> {
  const config = getSupabaseConfig();
  const normalizedCnpj = cnpj.replace(/\D/g, '');

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    const found = users.find((u: any) => u.cnpj?.replace(/\D/g, '') === normalizedCnpj);
    return found ? (removePassword(found) as PJUser) : null;
  }

  const { data, error } = await supabase
    .from('perfis_pj')
    .select('*')
    .or(`cnpj.eq.${cnpj},cnpj.eq.${normalizedCnpj}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return null;
  }

  return data ? mapDbProfileToUser(data) : null;
}

export async function getTenants(): Promise<Tenant[]> {
  initDB();
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.TENANTS);
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('empresas_contratantes')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar empresas contratantes:', error);
    return [];
  }

  return (data || []).map(t => ({
    id: t.id,
    name: t.nome,
    code: t.codigo || t.id
  }));
}

export async function addTenant(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const tenants = await getTenants();
    const newTenant: Tenant = {
      ...tenant,
      id: `tenant-${Date.now()}`
    };

    tenants.push(newTenant);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    return newTenant;
  }

  const { data, error } = await supabase
    .from('empresas_contratantes')
    .insert({
      nome: tenant.name,
      codigo: tenant.code
    })
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao criar empresa contratante:', error);
    throw new Error(`Erro ao criar empresa contratante: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.nome,
    code: data.codigo || data.id
  };
}

export async function getTenantByCode(code: string): Promise<Tenant | null> {
  const tenants = await getTenants();
  return tenants.find(t => t.code.toUpperCase() === code.toUpperCase()) || null;
}

export async function getAllUsers(): Promise<(PJUser & { tenantName?: string })[]> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    return users.map((u: any) => removePassword(u));
  }

  const { data, error } = await supabase
    .from('perfis_pj')
    .select(`
      id, tenant_id, cnpj, razao_social, nome_responsavel, email, cargo, criado_em,
      empresas_contratantes ( nome )
    `)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar todos os usuários:', error);
    return [];
  }

  return (data || []).map((u: DbProfile) => ({
    ...mapDbProfileToUser(u),
    tenantName: getTenantNameFromProfile(u)
  }));
}

export async function updateUserRole(userId: string, newRole: 'pj' | 'admin_tenant' | 'super_admin'): Promise<boolean> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    const idx = users.findIndex((u: any) => u.id === userId);

    if (idx === -1) return false;

    users[idx].role = newRole;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return true;
  }

  const { error } = await supabase
    .from('perfis_pj')
    .update({ cargo: newRole })
    .eq('id', userId);

  if (error) {
    console.error('Erro ao atualizar permissão do usuário:', error);
    return false;
  }

  return true;
}

export async function updateUserTenant(userId: string, newTenantId: string): Promise<boolean> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    const idx = users.findIndex((u: any) => u.id === userId);

    if (idx === -1) return false;

    users[idx].tenantId = newTenantId;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return true;
  }

  const { error } = await supabase
    .from('perfis_pj')
    .update({ tenant_id: newTenantId })
    .eq('id', userId);

  if (error) {
    console.error('Erro ao atualizar tenant do usuário:', error);
    return false;
  }

  return true;
}

export async function registerUser(
  user: Omit<PJUser, 'id' | 'createdAt' | 'role'> & { password?: string }
): Promise<PJUser | string> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    const emailExists = users.some((u: any) => normalizeEmail(u.email) === normalizeEmail(user.email));

    if (emailExists) return 'Este e-mail já está cadastrado.';

    const newMockUser = {
      ...user,
      id: `user-pj-${Date.now()}`,
      role: 'pj',
      createdAt: new Date().toISOString(),
      password: user.password || '123456'
    };

    users.push(newMockUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    return removePassword(newMockUser) as PJUser;
  }

  const email = normalizeEmail(user.email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: user.password || '123456'
  });

  if (authError) return authError.message;
  if (!authData.user) return 'Erro ao criar usuário.';

  const { data, error } = await supabase
    .from('perfis_pj')
    .insert({
      id: authData.user.id,
      tenant_id: user.tenantId || 'tenant-1',
      cnpj: user.cnpj,
      razao_social: user.companyName,
      nome_responsavel: user.ownerName,
      email,
      cargo: 'pj'
    })
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao criar perfil PJ:', error);
    return error.message;
  }

  return mapDbProfileToUser(data);
}

export async function loginUser(email: string, password?: string): Promise<PJUser | string> {
  const config = getSupabaseConfig();

  if (config.useMockDatabase) {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    const foundUser = users.find((u: any) => normalizeEmail(u.email) === normalizeEmail(email));

    if (!foundUser) return 'Usuário não encontrado ou e-mail inválido.';

    if (foundUser.role === 'admin_tenant' || foundUser.role === 'super_admin') {
      if (password !== 'admin123') return 'Senha incorreta para a conta Administrador.';
    }

    if (foundUser.role === 'pj') {
      const expectedPassword = foundUser.password || '123456';
      if (password !== expectedPassword) return 'Senha incorreta.';
    }

    return removePassword(foundUser) as PJUser;
  }

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: password || '123456'
  });

  if (authError) return authError.message;
  if (!data.user) return 'Erro ao fazer login.';

  const { data: profile, error: profileError } = await supabase
    .from('perfis_pj')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil do usuário logado:', profileError);
    return 'Perfil de usuário não encontrado.';
  }

  return mapDbProfileToUser(profile);
}

export function getSupabaseConfig(): SupabaseConfig {
  const data = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);

  if (data) return JSON.parse(data);

  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    isConnected: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    useMockDatabase: !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
}

export const SUPABASE_SQL_INSTRUCTION = `-- Siga estes passos para conectar seu Supabase real:
-- 1. Crie um projeto no Supabase.
-- 2. No menu SQL Editor, execute TODO este script.
-- 3. Depois configure no projeto as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.empresas_contratantes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nome TEXT NOT NULL,
    codigo TEXT UNIQUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.perfis_pj (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES public.empresas_contratantes(id) ON DELETE CASCADE,
    cnpj TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_responsavel TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cargo TEXT NOT NULL DEFAULT 'pj' CHECK (cargo IN ('pj', 'admin_tenant', 'super_admin')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT REFERENCES public.empresas_contratantes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cnpj TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    numero_nota TEXT NOT NULL,
    data_emissao DATE,
    competencia_mes TEXT NOT NULL,
    competencia_ano TEXT NOT NULL,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    formato_arquivo TEXT NOT NULL,
    tamanho_arquivo INTEGER NOT NULL DEFAULT 0,
    nome_arquivo TEXT NOT NULL,
    link_download TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    observacoes TEXT,
    feedback_admin TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contas_pagar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT REFERENCES public.empresas_contratantes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fornecedor TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Outros',
    descricao TEXT NOT NULL DEFAULT '',
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'vencido', 'pago', 'cancelado')),
    forma_pagamento TEXT,
    arquivo_url TEXT,
    ofx_fitid TEXT,
    ofx_data DATE,
    ofx_descricao TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contas_receber (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT REFERENCES public.empresas_contratantes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL,
    cliente_email TEXT,
    cliente_documento TEXT,
    nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL DEFAULT '',
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'vencido', 'recebido', 'cancelado')),
    forma_pagamento TEXT,
    ofx_fitid TEXT,
    ofx_data DATE,
    ofx_descricao TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

INSERT INTO public.empresas_contratantes (id, nome, codigo)
VALUES
    ('tenant-1', 'Agência TechVanguard', 'TECH123'),
    ('tenant-2', 'Consultoria Alpha', 'ALPHA456')
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    codigo = EXCLUDED.codigo;

ALTER TABLE public.empresas_contratantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_pj ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_perfis_pj_tenant_id ON public.perfis_pj(tenant_id);
CREATE INDEX IF NOT EXISTS idx_perfis_pj_email ON public.perfis_pj(email);
CREATE INDEX IF NOT EXISTS idx_perfis_pj_cnpj ON public.perfis_pj(cnpj);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tenant_id ON public.notas_fiscais(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_user_id ON public.notas_fiscais(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_criado_em ON public.notas_fiscais(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_tenant_id ON public.contas_pagar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON public.contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_tenant_id ON public.contas_receber(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON public.contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON public.contas_receber(data_vencimento);

DROP POLICY IF EXISTS "empresas_contratantes_select_auth" ON public.empresas_contratantes;
DROP POLICY IF EXISTS "empresas_contratantes_insert_super_admin" ON public.empresas_contratantes;
DROP POLICY IF EXISTS "empresas_contratantes_update_super_admin" ON public.empresas_contratantes;
DROP POLICY IF EXISTS "perfis_pj_select_multi_tenant" ON public.perfis_pj;
DROP POLICY IF EXISTS "perfis_pj_insert_self" ON public.perfis_pj;
DROP POLICY IF EXISTS "perfis_pj_update_self_or_admin" ON public.perfis_pj;
DROP POLICY IF EXISTS "notas_fiscais_select_multi_tenant" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais_insert_multi_tenant" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais_update_multi_tenant" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais_delete_multi_tenant" ON public.notas_fiscais;
DROP POLICY IF EXISTS "contas_pagar_all_multi_tenant" ON public.contas_pagar;
DROP POLICY IF EXISTS "contas_receber_all_multi_tenant" ON public.contas_receber;

CREATE POLICY "empresas_contratantes_select_auth" ON public.empresas_contratantes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "empresas_contratantes_insert_super_admin" ON public.empresas_contratantes
    FOR INSERT WITH CHECK (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "empresas_contratantes_update_super_admin" ON public.empresas_contratantes
    FOR UPDATE USING (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin'
    ) WITH CHECK (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "perfis_pj_select_multi_tenant" ON public.perfis_pj
    FOR SELECT USING (
        id = auth.uid() OR
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    );

CREATE POLICY "perfis_pj_insert_self" ON public.perfis_pj
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "perfis_pj_update_self_or_admin" ON public.perfis_pj
    FOR UPDATE USING (
        id = auth.uid() OR
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    ) WITH CHECK (
        id = auth.uid() OR
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    );

CREATE POLICY "notas_fiscais_select_multi_tenant" ON public.notas_fiscais
    FOR SELECT USING (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        ) OR
        auth.uid() = user_id
    );

CREATE POLICY "notas_fiscais_insert_multi_tenant" ON public.notas_fiscais
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
            (
                (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
                tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
            ) OR
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    );

CREATE POLICY "notas_fiscais_update_multi_tenant" ON public.notas_fiscais
    FOR UPDATE USING (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    ) WITH CHECK (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    );

CREATE POLICY "notas_fiscais_delete_multi_tenant" ON public.notas_fiscais
    FOR DELETE USING (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant' AND
            tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
        )
    );

CREATE POLICY "contas_pagar_all_multi_tenant" ON public.contas_pagar
    FOR ALL USING (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
    ) WITH CHECK (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
    );

CREATE POLICY "contas_receber_all_multi_tenant" ON public.contas_receber
    FOR ALL USING (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
    ) WITH CHECK (
        (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
        tenant_id = (SELECT tenant_id FROM public.perfis_pj WHERE id = auth.uid())
    );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'notas_fiscais',
    'notas_fiscais',
    true,
    10485760,
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/xml',
        'application/xml',
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "notas_fiscais_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_storage_delete" ON storage.objects;

CREATE POLICY "notas_fiscais_storage_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'notas_fiscais');

CREATE POLICY "notas_fiscais_storage_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'notas_fiscais' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "notas_fiscais_storage_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'notas_fiscais' AND
        auth.uid() IS NOT NULL
    ) WITH CHECK (
        bucket_id = 'notas_fiscais' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "notas_fiscais_storage_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'notas_fiscais' AND
        (
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'super_admin' OR
            (SELECT cargo FROM public.perfis_pj WHERE id = auth.uid()) = 'admin_tenant'
        )
    );
`;

// ── Clientes ──────────────────────────────────────────────

function mapDbCliente(row: any): Client {
  const contacts = Array.isArray(row.contacts) ? row.contacts : [];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.nome_fantasia,
    nomeFantasia: row.nome_fantasia,
    razaoSocial: row.razao_social || undefined,
    document: row.document || undefined,
    contacts,
    contato: contacts[0]?.name,
    email: contacts[0]?.email || '',
    phone: contacts[0]?.phone,
    whatsapp: contacts[0]?.phone,
    observacoes: row.observacoes || undefined,
    descricaoPadrao: row.descricao_padrao || undefined,
    categoriaFinanceira: row.categoria_financeira || undefined,
    defaultAmount: row.valor_padrao ?? undefined,
    valoresParcelas: Array.isArray(row.valores_parcelas) && row.valores_parcelas.length > 0 ? row.valores_parcelas : undefined,
    dueDay: row.dia_vencimento ?? undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function getClients(tenantId: string = 'default'): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }

  const clients = (data || []).map(mapDbCliente);

  // Auto-migrate localStorage data on first Supabase load
  if (clients.length === 0) {
    const lsKey = `portal_pj_clients_${tenantId}`;
    const lsData = localStorage.getItem(lsKey);
    if (lsData) {
      try {
        const lsClients: Client[] = JSON.parse(lsData);
        if (lsClients.length > 0) {
          await addClients(tenantId, lsClients);
          localStorage.removeItem(lsKey);
          return lsClients;
        }
      } catch { /* ignore migration errors */ }
    }
  }

  return clients;
}

export async function addClient(tenantId: string, client: Client): Promise<void> {
  const { error } = await supabase.from('clientes').insert({
    id: client.id,
    tenant_id: tenantId,
    nome_fantasia: client.nomeFantasia || client.name,
    razao_social: client.razaoSocial || null,
    document: client.document || null,
    contacts: client.contacts || [],
    observacoes: client.observacoes || null,
    descricao_padrao: client.descricaoPadrao || null,
    categoria_financeira: client.categoriaFinanceira || null,
    valor_padrao: client.defaultAmount ?? null,
    valores_parcelas: client.valoresParcelas ?? null,
    dia_vencimento: client.dueDay ?? null,
    created_at: client.createdAt,
  });
  if (error) throw new Error(`Erro ao salvar cliente: ${error.message}`);
}

export async function addClients(tenantId: string, clients: Client[]): Promise<void> {
  if (clients.length === 0) return;
  const { error } = await supabase.from('clientes').insert(
    clients.map(c => ({
      id: c.id,
      tenant_id: tenantId,
      nome_fantasia: c.nomeFantasia || c.name,
      razao_social: c.razaoSocial || null,
      document: c.document || null,
      contacts: c.contacts || [],
      observacoes: c.observacoes || null,
      created_at: c.createdAt,
    }))
  );
  if (error) throw new Error(`Erro ao importar clientes: ${error.message}`);
}

export async function updateClient(id: string, client: Partial<Client>): Promise<void> {
  const { error } = await supabase.from('clientes').update({
    nome_fantasia: client.nomeFantasia || client.name,
    razao_social: client.razaoSocial || null,
    document: client.document || null,
    contacts: client.contacts || [],
    observacoes: client.observacoes || null,
    descricao_padrao: client.descricaoPadrao || null,
    categoria_financeira: client.categoriaFinanceira || null,
    valor_padrao: client.defaultAmount ?? null,
    valores_parcelas: client.valoresParcelas ?? null,
    dia_vencimento: client.dueDay ?? null,
  }).eq('id', id);
  if (error) throw new Error(`Erro ao atualizar cliente: ${error.message}`);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir cliente: ${error.message}`);
}

export async function deleteClients(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('clientes').delete().in('id', ids);
  if (error) throw new Error(`Erro ao excluir clientes: ${error.message}`);
}

// ── Cobranças ─────────────────────────────────────────────

function mapDbCobranca(row: any): Cobranca {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id || '',
    clienteNome: row.cliente_nome || undefined,
    descricao: row.descricao,
    competencia: row.competencia || '',
    dataVencimento: row.data_vencimento || '',
    valor: Number(row.valor || 0),
    categoriaFinanceira: row.categoria_financeira || undefined,
    formaRecebimento: row.forma_recebimento || undefined,
    contaBancaria: row.conta_bancaria || undefined,
    centroCusto: row.centro_custo || undefined,
    exigeOC: row.exige_oc || undefined,
    observacoes: row.observacoes || undefined,
    status: (row.status || 'em_aberto') as CobrancaStatus,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function getCobrancas(tenantId: string): Promise<Cobranca[]> {
  const { data, error } = await supabase
    .from('cobrancas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('data_vencimento', { ascending: false });

  if (error) {
    console.error('Erro ao buscar cobranças:', error);
    return [];
  }

  const cobrancas = (data || []).map(mapDbCobranca);

  // Auto-migrate localStorage data on first Supabase load
  if (cobrancas.length === 0) {
    const lsKey = `portal_pj_cobrancas_v2_${tenantId}`;
    const lsData = localStorage.getItem(lsKey);
    if (lsData) {
      try {
        const lsCobs = JSON.parse(lsData);
        if (lsCobs.length > 0) {
          const migrated: Cobranca[] = lsCobs.map((c: any) => ({
            ...c,
            tenantId,
            status: c.status === 'pending' ? 'em_aberto'
                  : c.status === 'paid'    ? 'pago'
                  : c.status === 'sent'    ? 'em_aberto'
                  : c.status ?? 'em_aberto',
            descricao: c.descricao ?? c.description ?? 'Cobrança',
            competencia: c.competencia ?? '',
            dataVencimento: c.dataVencimento ?? c.dueDate ?? '',
            valor: c.valor ?? c.amount ?? 0,
          }));
          await addCobrancas(tenantId, migrated);
          localStorage.removeItem(lsKey);
          return migrated;
        }
      } catch { /* ignore migration errors */ }
    }
  }

  return cobrancas;
}

export async function addCobranca(tenantId: string, cob: Cobranca): Promise<void> {
  const { error } = await supabase.from('cobrancas').insert({
    id: cob.id,
    tenant_id: tenantId,
    client_id: cob.clientId || null,
    cliente_nome: cob.clienteNome || null,
    descricao: cob.descricao,
    competencia: cob.competencia || null,
    data_vencimento: cob.dataVencimento ? cob.dataVencimento.split('T')[0] : null,
    valor: Number(cob.valor || 0),
    categoria_financeira: cob.categoriaFinanceira || null,
    forma_recebimento: cob.formaRecebimento || null,
    conta_bancaria: cob.contaBancaria || null,
    centro_custo: cob.centroCusto || null,
    exige_oc: cob.exigeOC ?? false,
    observacoes: cob.observacoes || null,
    status: cob.status || 'em_aberto',
  });
  if (error) throw new Error(`Erro ao salvar cobrança: ${error.message}`);
}

export async function addCobrancas(tenantId: string, cobs: Cobranca[]): Promise<void> {
  if (cobs.length === 0) return;
  const { error } = await supabase.from('cobrancas').insert(
    cobs.map(cob => ({
      id: cob.id,
      tenant_id: tenantId,
      client_id: cob.clientId || null,
      cliente_nome: cob.clienteNome || null,
      descricao: cob.descricao,
      competencia: cob.competencia || null,
      data_vencimento: cob.dataVencimento ? cob.dataVencimento.split('T')[0] : null,
      valor: Number(cob.valor || 0),
      categoria_financeira: cob.categoriaFinanceira || null,
      forma_recebimento: cob.formaRecebimento || null,
      conta_bancaria: cob.contaBancaria || null,
      centro_custo: cob.centroCusto || null,
      exige_oc: cob.exigeOC ?? false,
      observacoes: cob.observacoes || null,
      status: cob.status || 'em_aberto',
    }))
  );
  if (error) throw new Error(`Erro ao importar cobranças: ${error.message}`);
}

export async function updateCobrancaStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('cobrancas').update({ status }).eq('id', id);
  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
}

export async function deleteCobranca(id: string): Promise<void> {
  const { error } = await supabase.from('cobrancas').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir cobrança: ${error.message}`);
}
