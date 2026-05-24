import { getDb } from '@/lib/db';

export async function deleteReceipt(id: number, current_customer_balance: number): Promise<void> {
  const db = await getDb();

  const rows = await db.select<
    { amount_received: number; balance: number; customer_id: number; cr_dr: string }[]
  >('SELECT amount_received, balance, customer_id, cr_dr FROM tbl_receipt WHERE id = ? LIMIT 1', [id]);

  if (!rows[0]) return;

  const { amount_received, balance, customer_id } = rows[0];

  const restored_balance = Math.min(current_customer_balance + amount_received, balance);

  const ad_due = restored_balance > 0 ? 'Due' : restored_balance < 0 ? 'Advance' : '';

  await db.execute('DELETE FROM tbl_receipt WHERE id = ?', [id]);

  await db.execute(
    'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
    [Math.abs(restored_balance), ad_due, customer_id],
  );
}
