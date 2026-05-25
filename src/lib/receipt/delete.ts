import { getDb } from '@/lib/db';

export async function deleteReceipt(id: number): Promise<void> {
  const db = await getDb();

  const rows = await db.select<
    { customer_id: number }[]
  >('SELECT customer_id FROM tbl_receipt WHERE id = ? LIMIT 1', [id]);

  if (!rows[0]) return;

  await db.execute('DELETE FROM tbl_receipt WHERE id = ?', [id]);
}
