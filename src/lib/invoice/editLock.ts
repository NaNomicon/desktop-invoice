import { query } from '@/lib/db';

export async function canEditInvoice(invoiceId: number): Promise<{ canEdit: boolean; message?: string }> {
  const rows = await query<{ invoice_days: string }>('SELECT invoice_days FROM tbl_setting WHERE id = 1');
  const invoiceDays = rows[0]?.invoice_days ?? '7';
  const days = parseInt(invoiceDays, 10) || 7;

  const invoices = await query<{ invoice_date: string }>(
    'SELECT invoice_date FROM tbl_invoice_main WHERE id = ?',
    [invoiceId]
  );

  if (!invoices[0]?.invoice_date) {
    return { canEdit: true };
  }

  const invoiceDate = new Date(invoices[0].invoice_date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - invoiceDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= days) {
    return {
      canEdit: false,
      message: `Invoice cannot be edited — past edit lock period (${days} days)`,
    };
  }

  return { canEdit: true };
}