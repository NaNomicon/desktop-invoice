import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Delete invoice with customer balance reversal.
 * cr_dr === "Cr." → ADD total back to customer.due_amount
 * cr_dr === "Dr." → SUBTRACT total from customer.due_amount
 * cr_dr null → log warning, skip reversal
 */
export async function deleteInvoice(id: number): Promise<void> {
  const db = await getDb();

  const rows = await db.select<
    { cr_dr: string | null; total: number; customer_id: number }[]
  >('SELECT cr_dr, total, customer_id FROM tbl_invoice_main WHERE id = ?', [
    id,
  ]);
  const invoice = rows[0];

  if (!invoice) {
    throw new Error(`Invoice ${id} not found`);
  }

  await db.execute('BEGIN TRANSACTION');

  try {
    if (invoice.cr_dr === 'Cr.') {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount + ? WHERE id = ?',
        [invoice.total, invoice.customer_id],
      );
    } else if (invoice.cr_dr === 'Dr.') {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount - ? WHERE id = ?',
        [invoice.total, invoice.customer_id],
      );
    } else {
      logger.warn('deleteInvoice: cr_dr is null, skipping balance reversal', {
        id,
      });
    }

    await db.execute('DELETE FROM tbl_invoice_sub WHERE main_id = ?', [id]);
    await db.execute('DELETE FROM tbl_invoice_main WHERE id = ?', [id]);

    await db.execute('COMMIT');
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
