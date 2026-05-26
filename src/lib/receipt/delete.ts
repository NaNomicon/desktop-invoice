import { getDb } from '@/lib/db';

function toSignedBalance(adDue: string | null | undefined, amount: number): number {
  return adDue === 'Advance' ? -amount : amount;
}

function fromSignedBalance(balance: number): {
  due_amount: number;
  ad_due: 'Advance' | 'Due' | '';
} {
  if (balance < 0) {
    return { due_amount: Math.abs(balance), ad_due: 'Advance' };
  }
  if (balance > 0) {
    return { due_amount: balance, ad_due: 'Due' };
  }

  return { due_amount: 0, ad_due: '' };
}

export async function deleteReceipt(id: number): Promise<void> {
  const db = await getDb();

  const rows = await db.select<
    {
      customer_id: number;
      amount_received: number;
      ad_due: string | null;
      due_amount: number;
    }[]
  >(
    `SELECT r.customer_id, r.amount_received, c.ad_due, c.due_amount
     FROM tbl_receipt r
     JOIN tbl_customer c ON r.customer_id = c.id
     WHERE r.id = ?
     LIMIT 1`,
    [id],
  );

  const receipt = rows[0];
  if (!receipt) {
    throw new Error(`Receipt ${id} not found`);
  }

  await db.execute('BEGIN TRANSACTION');

  try {
    const currentSignedBalance = toSignedBalance(receipt.ad_due, receipt.due_amount);
    const revertedSignedBalance = currentSignedBalance + receipt.amount_received;
    const nextCustomerBalance = fromSignedBalance(revertedSignedBalance);

    await db.execute(
      'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
      [nextCustomerBalance.due_amount, nextCustomerBalance.ad_due, receipt.customer_id],
    );
    await db.execute('DELETE FROM tbl_receipt WHERE id = ?', [id]);

    await db.execute('COMMIT');
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
