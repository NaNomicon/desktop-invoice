import { exists } from '@tauri-apps/plugin-fs';
import { query } from '@/lib/db';
import { commands } from '@/lib/tauri-bindings';
import type { EmailTemplate } from '@/lib/types';

export interface SendEmailParams {
  to: string;
  template_type: 'INVOICE' | 'QUOTATION' | 'STATEMENT' | 'RECEIPT';
  subject?: string;
  variables: {
    date?: string;
    contact_person?: string;
    name?: string;
  };
  pdf_path?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  attachmentCount?: number;
}

function replacePlaceholders(text: string, variables: SendEmailParams['variables']): string {
  return text
    .replace(/<date>/gi, variables.date ?? '')
    .replace(/<contact person>/gi, variables.contact_person ?? '')
    .replace(/<name>/gi, variables.name ?? '')
    .replace(/\{date\}/gi, variables.date ?? '')
    .replace(/\{contact person\}/gi, variables.contact_person ?? '')
    .replace(/\{name\}/gi, variables.name ?? '');
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const rows = await query<EmailTemplate>(
      `SELECT *, COALESCE(template_type, identify) AS template_type
       FROM tbl_email
       WHERE COALESCE(template_type, identify) = ?`,
      [params.template_type],
    );

    const template = rows[0];
    if (!template) {
      return { success: false, error: `No email template found for type: ${params.template_type}` };
    }

    const senderEmail = template.sender_email ?? template.sender ?? null;
    if (!senderEmail || !template.sender_pass) {
      return { success: false, error: 'Sender email or password not configured in template' };
    }

    const rawSubject = params.subject?.trim() || template.subject?.trim() || '';
    if (!rawSubject) {
      return { success: false, error: 'Email subject is not configured for this template' };
    }

    const html = replacePlaceholders(template.body ?? '', params.variables);
    const subject = replacePlaceholders(rawSubject, params.variables);

    const attachments: { path: string; filename: string | null; mime_type: string | null }[] = [];
    if (params.pdf_path && (await exists(params.pdf_path))) {
      attachments.push({
        path: params.pdf_path,
        filename: params.pdf_path.split(/[\\/]/).pop() ?? 'attachment.pdf',
        mime_type: 'application/pdf',
      });
    }

    const result = await commands.sendEmail({
      sender_email: senderEmail,
      sender_pass: template.sender_pass,
      sender_name: template.sub_subject?.trim() || null,
      to: params.to,
      subject,
      html,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_starttls: true,
      attachments,
    });

    if (result.status === 'error') {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      attachmentCount: result.data.attachment_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
