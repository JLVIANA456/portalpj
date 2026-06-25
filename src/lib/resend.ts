import { supabase } from './supabase';

/**
 * Faz upload de um arquivo para o Supabase Storage (bucket: email-documents)
 * e retorna a URL pública para uso como botão no HTML do e-mail.
 *
 * Pré-requisito: criar o bucket "email-documents" no Supabase Dashboard
 * com a opção "Public bucket" ativada.
 */
export async function uploadEmailDocument(file: File, tenantId: string): Promise<string> {
  const fileExt = file.name.split('.').pop() ?? 'bin';
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${tenantId}/emails/${fileName}`;

  const { error } = await supabase.storage
    .from('email-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error('Erro ao subir documento: ' + error.message);
  }

  const { data } = supabase.storage
    .from('email-documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export class ResendService {
  static async sendEmail({
    to,
    subject,
    html,
    reply_to,
    attachments
  }: {
    to: string;
    subject: string;
    html: string;
    reply_to?: string;
    attachments?: { filename: string; content: string }[];
  }) {
    try {
      const { data, error } = await (supabase.rpc as any)('send_email_with_resend', {
        to_email: to,
        subject: subject,
        html_content: html,
        reply_to_email: reply_to || null,
        attachments_data: attachments ?? []
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Resend Error:', error);
      throw new Error(error.message || 'Erro ao enviar e-mail.');
    }
  }
}