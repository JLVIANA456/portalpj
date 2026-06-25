import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente no sistema.');

  const response = await fetch(
    `${supabaseUrl}/functions/v1/nfse-api/${path.replace(/^\/+/, '')}`,
    {
      ...options,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Falha na API do emissor.');
  return body as T;
}

export interface NfseStatus {
  emitters: number;
  certificates: number;
  notes: number;
  errors: number;
  integration: 'ready' | 'certificate_required';
}

export const nfseApi = {
  status: () => request<NfseStatus>('status'),

  listEmitters: () => request<{ data: any[] }>('emitentes'),
  createEmitter: (data: Record<string, unknown>) =>
    request<{ data: any }>('emitentes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCustomers: () => request<{ data: any[] }>('clientes'),
  createCustomer: (data: Record<string, unknown>) =>
    request<{ data: any }>('clientes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCertificates: () => request<{ data: any[] }>('certificados'),

  listNotes: () => request<{ data: any[] }>('notas'),
  getNote: (id: string) => request<{ data: any }>(`notas/${id}`),

  issue: (data: Record<string, unknown>, idempotencyKey = crypto.randomUUID()) =>
    request<{ dps: any; job: any }>('dps', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  cancel: (noteId: string, justification: string) =>
    request<{ event: any; job: any }>(`notas/${noteId}/cancelamento`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ justificativa: justification }),
    }),

  listJobs: (status?: string) =>
    request<{ data: any[] }>(`jobs${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  async uploadCertificate(input: {
    emitterId: string;
    file: File;
    password: string;
  }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente no sistema.');

    const form = new FormData();
    form.append('emitterId', input.emitterId);
    form.append('certificate', input.file);
    form.append('password', input.password);

    const response = await fetch(`${supabaseUrl}/functions/v1/nfse-certificate`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Falha ao enviar o certificado.');
    return body as { certificate: any };
  },
};
