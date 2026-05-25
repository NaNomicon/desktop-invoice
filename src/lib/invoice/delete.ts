import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

function toSignedBalance(adDue: string | null | undefined, amount: number): number {
  return adDue === 'Advance' ? -amount : amount;
}

function fromSignedBalance(balance: number): { due_amount: number; ad_due: 'Advance' | 'Due' | '' } {
  if (balance < 0) {
    return { due_amount: Math.abs(balance), ad_due: 'Advance' };
  }
  if (balance > 0) {
    return { due_amount: balance, ad_due: 'Due' };
  }

  return { due_amount: 0, ad_due: '' };
}

export async function deleteInvoice(id: number): Promise<void> {
  const db = await getDb();

  const rows = await db.select<
    {
      cr_dr: string | null;
      total: number;
      paid_amount: number;
      customer_id: number;
      ad_due: string | null;
      due_amount: number;
    }[]
  >(
    `SELECT im.cr_dr, im.total, im.paid_amount, im.customer_id, c.ad_due, c.due_amount
     FROM tbl_invoice_main im
     JOIN tbl_customer c ON im.customer_id = c.id
     WHERE im.id = ?`,
    [id],
  );
  const invoice = rows[0];

  if (!invoice) {
    throw new Error(`Invoice ${id} not found`);
  }

  await db.execute('BEGIN TRANSACTION');

  try {
    if (invoice.cr_dr === 'Cr.' || invoice.cr_dr === 'Dr.') {
      const currentSignedBalance = toSignedBalance(invoice.ad_due, invoice.due_amount);
      const invoiceNetDelta = invoice.total - invoice.paid_amount;
      const revertedSignedBalance = currentSignedBalance - invoiceNetDelta;
      const nextCustomerBalance = fromSignedBalance(revertedSignedBalance);

      await db.execute(
        'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
        [
          nextCustomerBalance.due_amount,
          nextCustomerBalance.ad_due,
          invoice.customer_id,
        ],
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
