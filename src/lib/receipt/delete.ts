import { execute } from '@/lib/db';

export async function deleteReceipt(id: number): Promise<void> {
  await execute('DELETE FROM tbl_receipt WHERE id = ?', [id]);
}
