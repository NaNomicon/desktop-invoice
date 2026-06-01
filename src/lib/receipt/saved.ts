import { getDb } from '@/lib/db';
import { cal } from './cal';

function toSignedBalance(adDue: string | null | undefined, amount: number): number {
  return adDue === 'Advance' ? -amount : amount;
}

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
  pre_load_status?: string | null;
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
    pre_load_status,
  } = input;

  const result = cal({ load_dua_amount, amount_received });
  const new_due_abs = Math.abs(result.new_due);
  const previous_balance_abs = Math.abs(load_dua_amount);
  const timestamp = String(Date.now());
  const paymentLabel = (payment_mode ?? '').trim().toLowerCase();
  const isCash = paymentLabel === 'cash' ? '1' : '0';
  const isCheque = paymentLabel === 'cheque' ? '1' : '0';
  const isOther = paymentLabel !== '' && paymentLabel !== 'cash' && paymentLabel !== 'cheque' ? '1' : '0';

  await db.execute('BEGIN TRANSACTION');

  try {
    const customerRows = await db.select<
      { company_id: number; ad_due: string | null; due_amount: number }[]
    >('SELECT company_id, ad_due, due_amount FROM tbl_customer WHERE id = ? LIMIT 1', [customer_id]);
    const customer = customerRows[0];
    const companyId = customer?.company_id ?? 1;

    // pre_load captures the customer's balance state BEFORE this receipt
    // For new receipts: use the customer's current ad_due (their state before the receipt)
    // For edits: preserve the originally captured pre_load_status
    const preLoadValue = receipt_id === 0
      ? (customer?.ad_due ?? null)
      : (pre_load_status ?? customer?.ad_due ?? null);

    if (receipt_id === 0) {
      await db.execute(
        `INSERT INTO tbl_receipt (
          receipt_no, receipt_date, customer_id, company_id, due_amount,
          amount_received, cheque_no, no, balance, cr_dr, pre_load,
          cash, cheque, other, payment_mode, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receipt_no,
          receipt_date,
          customer_id,
          companyId,
          new_due_abs,
          amount_received,
          cheque_no ?? null,
          timestamp,
          previous_balance_abs,
          cr_dr,
          preLoadValue,
          isCash,
          isCheque,
          isOther,
          payment_mode,
          notes ?? null,
        ],
      );

      await db.execute(
        'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
        [new_due_abs, ad_due, customer_id],
      );

      await db.execute(
        'UPDATE tbl_numbers SET receipt_no = receipt_no + 1 WHERE id = (SELECT MAX(id) FROM tbl_numbers)',
      );
    } else {
      const existingRows = await db.select<
        { amount_received: number }[]
      >('SELECT amount_received FROM tbl_receipt WHERE id = ? LIMIT 1', [receipt_id]);
      const existingReceipt = existingRows[0];

      if (!existingReceipt) {
        throw new Error(`Receipt ${receipt_id} not found`);
      }

      const currentSignedBalance = toSignedBalance(customer?.ad_due, customer?.due_amount ?? 0);
      const revertedLoadAmount = currentSignedBalance + existingReceipt.amount_received;
      const updatedBalance = cal({
        load_dua_amount: revertedLoadAmount,
        amount_received,
      });

      await db.execute(
        `UPDATE tbl_receipt SET
         receipt_date = ?, due_amount = ?, amount_received = ?, cheque_no = ?,
         balance = ?, cr_dr = ?, pre_load = ?, cash = ?, cheque = ?, other = ?,
         payment_mode = ?, notes = ?
         WHERE id = ?`,
        [
          receipt_date,
          Math.abs(updatedBalance.new_due),
          amount_received,
          cheque_no ?? null,
          Math.abs(revertedLoadAmount),
          cr_dr,
          preLoadValue,
          isCash,
          isCheque,
          isOther,
          payment_mode,
          notes ?? null,
          receipt_id,
        ],
      );

      await db.execute(
        'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
        [Math.abs(updatedBalance.new_due), updatedBalance.ad_due, customer_id],
      );
    }

    await db.execute('COMMIT');
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
