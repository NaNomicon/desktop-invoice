import { mkdir, exists } from '@tauri-apps/plugin-fs';
import { platform } from '@tauri-apps/plugin-os';
import { query } from '@/lib/db';
import type { InvoiceMain } from '@/lib/types';

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, '_');
}

function monthFolderName(date: string): string {
  const parsed = /^\d{4}-(\d{2})-\d{2}$/.exec(date);
  const monthIndex = parsed ? Number(parsed[1]) - 1 : new Date(date).getMonth();
  const year = parsed ? Number(date.slice(0, 4)) : new Date(date).getFullYear();
  const safeMonthIndex = Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex < 12 ? monthIndex : 0;
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(
    new Date(safeYear, safeMonthIndex, 1),
  );
  return `${monthName}-${safeYear}`;
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

  const configuredInvoicePath = settings[0]?.invoice_path;
  if (configuredInvoicePath) {
    return configuredInvoicePath;
  }

  const companies = await query<{ path: string | null }>(
    'SELECT path FROM tbl_company WHERE id = ? LIMIT 1',
    [invoice.company_id],
  );

  const companyPath = companies[0]?.path;
  if (companyPath) {
    return companyPath;
  }

  const p = await platform();
  return p === 'windows' ? 'C:\\XPress\\Invoices' : '/home/XPress/Invoices';
}

async function getCustomerDisplayName(customerId: number): Promise<string | null> {
  const rows = await query<{ title_name: string | null; customer_name: string | null }>(
    'SELECT title_name, customer_name FROM tbl_customer WHERE id = ? LIMIT 1',
    [customerId],
  );
  const customer = rows[0];
  if (!customer?.customer_name) {
    return null;
  }

  return [customer.title_name?.trim(), customer.customer_name.trim()].filter(Boolean).join(' ');
}

export async function getInvoicePdfPath(invoice: InvoiceMain): Promise<string> {
  const companyPath = await getCompanyPath(invoice);
  await ensureDir(companyPath);

  const monthFolder = monthFolderName(invoice.invoice_date);
  const folderPath = `${companyPath}${(await platform()) === 'windows' ? '\\' : '/'}${monthFolder}`;
  await ensureDir(folderPath);

  const customerDisplayName = await getCustomerDisplayName(invoice.customer_id);
  const fileBase = customerDisplayName
    ? `INV${invoice.invoice_no}-${customerDisplayName}`
    : `INV${invoice.invoice_no}`;
  const filename = `${sanitizeFilename(fileBase)}.pdf`;

  const sep = (await platform()) === 'windows' ? '\\' : '/';
  return `${folderPath}${sep}${filename}`;
}
