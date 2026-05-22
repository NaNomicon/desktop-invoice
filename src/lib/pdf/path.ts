import { mkdir, exists } from '@tauri-apps/plugin-fs';
import { platform } from '@tauri-apps/plugin-os';
import { query } from '@/lib/db';
import type { InvoiceMain } from '@/lib/types';

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\/\\:*?"<>|]/g, '_');
}

function formatDateForFilename(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return date;
  }
  return d.toISOString().split('T')[0];
}

async function ensureDir(dir: string): Promise<void> {
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir, { recursive: true });
  }
}

async function getCompanyPath(invoice: InvoiceMain): Promise<string> {
  const settings = await query<{ invoice_path: string | null }>(
    'SELECT invoice_path FROM tbl_setting LIMIT 1',
  );

  if (settings.length > 0 && settings[0].invoice_path) {
    return settings[0].invoice_path;
  }

  const companies = await query<{ path: string | null }>(
    'SELECT path FROM tbl_company WHERE id = ? LIMIT 1',
    [invoice.company_id],
  );

  if (companies.length > 0 && companies[0].path) {
    return companies[0].path;
  }

  const p = await platform();
  return p === 'windows' ? 'C:\\XPress\\Invoices' : '/home/XPress/Invoices';
}

export async function getInvoicePdfPath(invoice: InvoiceMain): Promise<string> {
  const companyPath = await getCompanyPath(invoice);
  await ensureDir(companyPath);

  const sanitizedInvoiceNo = sanitizeFilename(invoice.invoice_no);
  const formattedDate = formatDateForFilename(invoice.invoice_date);
  const filename = `invoice_${sanitizedInvoiceNo}_${formattedDate}.pdf`;

  const sep = (await platform()) === 'windows' ? '\\' : '/';
  return `${companyPath}${sep}${filename}`;
}