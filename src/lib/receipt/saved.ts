import { getDb } from '@/lib/db';
import { cal } from './cal';

export interface ReceiptSaveInput {
  receipt_id: number;
  receipt_no: string;
  receipt_date: string;
  customer_id: number;
  amount_received: number;
  payment_mode: string | null;
  cheque_no: string | null;
  notes: string | null;
  cr_dr: string;
  ad_due: string;
  load_dua_amount: number;
}

export async function saved(input: ReceiptSaveInput): Promise<void> {
  const db = await getDb();
  const {
    receipt_id,
    receipt_no,
    receipt_date,
    customer_id,
    amount_received,
    payment_mode,
    cheque_no,
    notes,
    cr_dr,
    ad_due,
    load_dua_amount,
  } = input;

  const result = cal({ load_dua_amount, amount_received });
  const new_due_abs = Math.abs(result.new_due);

  await db.execute('BEGIN TRANSACTION');

  try {
    if (receipt_id === 0) {
      await db.execute(
        `INSERT INTO tbl_receipt (receipt_no, receipt_date, customer_id, amount_received, payment_mode, cheque_no, cr_dr, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [receipt_no, receipt_date, customer_id, amount_received, payment_mode, cheque_no ?? null, cr_dr, notes ?? null],
      );

      await db.execute(
        'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
        [new_due_abs, ad_due, customer_id],
      );

      await db.execute(
        'UPDATE tbl_numbers SET receipt_no = receipt_no + 1 WHERE id = (SELECT MAX(id) FROM tbl_numbers)',
      );
    } else {
      await db.execute(
        `UPDATE tbl_receipt SET
         receipt_date = ?, amount_received = ?, payment_mode = ?, cheque_no = ?, cr_dr = ?, notes = ?
         WHERE id = ?`,
        [receipt_date, amount_received, payment_mode, cheque_no ?? null, cr_dr, notes ?? null, receipt_id],
      );

      await db.execute(
        'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
        [new_due_abs, ad_due, customer_id],
      );
    }

    await db.execute('COMMIT');
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
