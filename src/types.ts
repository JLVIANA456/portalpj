/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'pj' | 'admin_tenant' | 'super_admin';

export interface Tenant {
  id: string;
  name: string;
  code: string; // Um código amigável, ex: "TECHVANGUARD"
}

export interface PJUser {
  id: string;
  tenantId?: string; // PJ ou Admin Tenant pertencem a um Tenant. Super Admin pode não ter.
  cnpj: string;
  companyName: string;
  ownerName: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt: string;
}

export type InvoiceStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface Invoice {
  id: string;
  tenantId: string; // Nota fiscal sempre pertence a um Tenant
  userId: string;
  companyName: string;
  cnpj: string;
  invoiceNumber: string;
  issueDate: string;
  competenciaMonth: string; // e.g. "Janeiro", "Fevereiro", ...
  competenciaYear: string;  // e.g. "2026"
  amount: number;
  fileName: string;
  fileType: string;         // e.g. "application/pdf", "image/png", etc.
  fileSize: number;         // in bytes
  downloadUrl: string;      // base64 url or simulated object url
  status: InvoiceStatus;
  notes?: string;           // comments made by PJ
  feedback?: string;        // explanation by Admin for status (especially rejection)
  createdAt: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  useMockDatabase: boolean;
}

export interface MonthReport {
  month: string;
  year: string;
  totalAmount: number;
  totalInvoices: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Client {
  id: string;
  tenantId?: string;
  name: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  document?: string;
  codigoCliente?: string;
  contacts?: ClientContact[];
  contato?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  dataContrato?: string;
  numeroContrato?: string;
  exigeOC?: boolean;
  observacoes?: string;
  defaultAmount?: number;
  dueDay?: number;
  createdAt: string;
}

export type CobrancaStatus = 'em_aberto' | 'pago' | 'vencido' | 'cancelado';

export interface Cobranca {
  id: string;
  tenantId?: string;
  clientId: string;
  clienteNome?: string;
  descricao: string;
  competencia: string;
  dataVencimento: string;
  valor: number;
  categoriaFinanceira?: string;
  formaRecebimento?: string;
  contaBancaria?: string;
  centroCusto?: string;
  exigeOC?: boolean;
  observacoes?: string;
  status: CobrancaStatus;
  createdAt?: string;
}

export type ContaPagarStatus = 'aberto' | 'vencido' | 'pago' | 'cancelado';

export interface ContaPagar {
  id: string;
  tenantId: string;
  userId?: string;
  fornecedor: string;
  categoria: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: ContaPagarStatus;
  formaPagamento?: string;
  arquivoUrl?: string;
  ofxFitid?: string;
  ofxData?: string;
  ofxDescricao?: string;
  observacoes?: string;
  createdAt: string;
}

export type ContaReceberStatus = 'pendente' | 'enviado' | 'vencido' | 'recebido' | 'cancelado';

export interface ContaReceber {
  id: string;
  tenantId: string;
  userId?: string;
  clienteNome: string;
  clienteEmail?: string;
  clienteDocumento?: string;
  notaFiscalId?: string;
  descricao: string;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataRecebimento?: string;
  status: ContaReceberStatus;
  formaPagamento?: string;
  ofxFitid?: string;
  ofxData?: string;
  ofxDescricao?: string;
  observacoes?: string;
  createdAt: string;
}
