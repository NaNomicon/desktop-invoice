import nodemailer from 'nodemailer';
import { query } from '@/lib/db';
import type { EmailTemplate } from '@/lib/types';

export interface SendEmailParams {
  to: string;
  template_type: 'INVOICE' | 'QUOTATION' | 'STATEMENT' | 'RECEIPT';
  subject: string;
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
}

function replacePlaceholders(text: string, variables: SendEmailParams['variables']): string {
  return text
    .replace(/<date>/gi, variables.date ?? '')
    .replace(/<contact person>/gi, variables.contact_person ?? '')
    .replace(/<name>/gi, variables.name ?? '');
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const rows = await query<EmailTemplate>(
      'SELECT * FROM tbl_email WHERE template_type = ?',
      [params.template_type],
    );

    const template = rows[0];
    if (!template) {
      return { success: false, error: `No email template found for type: ${params.template_type}` };
    }

    if (!template.sender_email || !template.sender_pass) {
      return { success: false, error: 'Sender email or password not configured in template' };
    }

    const body = template.body ?? '';
    const subject = replacePlaceholders(params.subject, params.variables);
    const html = replacePlaceholders(body, params.variables);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: template.sender_email,
        pass: template.sender_pass,
      },
    });

    const attachments: nodemailer.SendMailOptions['attachments'] = [];
    if (params.pdf_path) {
      attachments.push({
        filename: params.pdf_path.split('/').pop() ?? 'attachment.pdf',
        path: params.pdf_path,
      });
    }

    await transporter.sendMail({
      from: template.sender_email,
      to: params.to,
      subject,
      html,
      attachments,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}