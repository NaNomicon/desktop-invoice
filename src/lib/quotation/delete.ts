import { getDb } from '@/lib/db';

export async function deleteQuotation(quotationId: number): Promise<void> {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');

  try {
    await db.execute('DELETE FROM tbl_quotation_sub WHERE main_id = ?', [quotationId]);
    await db.execute('DELETE FROM tbl_quotation_main WHERE id = ?', [quotationId]);
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}
