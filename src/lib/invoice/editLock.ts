import { query } from '@/lib/db';

export interface InvoiceEditLockResult {
  canEdit: boolean;
  forceDuplicate: boolean;
  message?: string;
}

export async function canEditInvoice(invoiceId: number): Promise<InvoiceEditLockResult> {
  const rows = await query<{ invoice_days: string }>('SELECT invoice_days FROM tbl_setting WHERE id = 1');
  const invoiceDays = rows[0]?.invoice_days ?? '7';
  const days = parseInt(invoiceDays, 10) || 7;

  const invoices = await query<{ invoice_date: string }>(
    'SELECT invoice_date FROM tbl_invoice_main WHERE id = ?',
    [invoiceId]
  );

  if (!invoices[0]?.invoice_date) {
    return { canEdit: true, forceDuplicate: false };
  }

  const invoiceDate = new Date(invoices[0].invoice_date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - invoiceDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= days) {
    return {
      canEdit: true,
      forceDuplicate: true,
      message: `Invoice is past edit lock period (${days} days). A new invoice number will be used.`,
    };
  }

  return { canEdit: true, forceDuplicate: false };
}
