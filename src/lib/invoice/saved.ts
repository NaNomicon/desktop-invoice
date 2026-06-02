import { getDb } from '@/lib/db';
import { getNextInvoiceNo } from '@/lib/db/nextNumber';

export interface InvoiceLineItem {
  id?: number;
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
  company_id: number | null;
}

export interface InvoiceSaveParams {
  invoice_id?: number | null;
  customer_id: number;
  invoice_no?: string;
  invoice_date: string;
  sub_total: number;
  amount_due: number;
  vat: number;
  discount: number;
  total: number;
  per: number;
  paid_amount: number;
  balance: number;
  case_debit: string | null;
  no: string | null;
  identify: string | null;
  print_due: string | null;
  checklist_no: string | null;
  line_items: InvoiceLineItem[];
  deleted_line_item_ids?: number[];
  isAdvance: boolean;
}

export interface InvoiceSaveResult {
  id: number;
  invoice_no: string;
}

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

export async function saved(
  params: InvoiceSaveParams,
  companyId: number,
): Promise<InvoiceSaveResult> {
  const db = await getDb();

  await db.execute('BEGIN TRANSACTION');

  try {
    const isEditing = Boolean(params.invoice_id);
    let invoice_no = params.invoice_no?.trim() || '';

    const custRows = await db.select<
      { ad_due: string; due_amount: number }[]
    >('SELECT ad_due, due_amount FROM tbl_customer WHERE id = ?', [
      params.customer_id,
    ]);
    const customer = custRows[0];

    let invoiceId = params.invoice_id ?? 0;
    let oldSubTotal = 0;

    if (isEditing) {
      const existingRows = await db.select<
        { invoice_no: string; total: number; paid_amount: number; sub_total: number }[]
      >('SELECT invoice_no, total, paid_amount, sub_total FROM tbl_invoice_main WHERE id = ?', [
        invoiceId,
      ]);
      const existing = existingRows[0];
      if (!existing) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }
      invoice_no = invoice_no || existing.invoice_no;
      oldSubTotal = existing.sub_total;
    } else if (!invoice_no) {
      invoice_no = await getNextInvoiceNo();
    }

    const startingSignedBalance = customer
      ? toSignedBalance(customer.ad_due, customer.due_amount)
      : 0;

    let endingSignedBalance: number;
    if (isEditing) {
      // Edit: adjust current balance by sub_total delta
      // Matches original VB: newDue = currentDue - dueAtLoad + newSubTotal
      endingSignedBalance = startingSignedBalance - oldSubTotal + params.sub_total;
    } else {
      // New invoice: replace balance with (total - paid_amount), signed by advance/due
      // Matches original VB: CREDIT → due = total_amt; CASH → due = total_amt - paid_amount
      const rawBalance = Math.abs(params.total) - params.paid_amount;
      endingSignedBalance = params.isAdvance ? -Math.abs(rawBalance) : Math.abs(rawBalance);
    }

    let cr_dr: string | null = null;
    if (endingSignedBalance > 0) {
      cr_dr = 'Dr.';
    } else if (endingSignedBalance < 0) {
      cr_dr = 'Cr.';
    }

    if (isEditing) {
      await db.execute(
        `UPDATE tbl_invoice_main
         SET customer_id = ?,
             invoice_no = ?,
             checklist_no = ?,
             company_id = ?,
             sub_total = ?,
             amount_due = ?,
             vat = ?,
             discount = ?,
             total = ?,
             per = ?,
             invoice_date = ?,
             case_debit = ?,
             paid_amount = ?,
             balance = ?,
             no = ?,
             cr_dr = ?,
             identify = ?,
             print_due = ?
         WHERE id = ?`,
        [
          params.customer_id,
          invoice_no,
          params.checklist_no ?? null,
          companyId,
          params.sub_total,
          params.amount_due,
          params.vat,
          params.discount,
          params.total,
          params.per,
          params.invoice_date,
          params.case_debit ?? null,
          params.paid_amount,
          params.balance,
          params.no ?? null,
          cr_dr,
          params.identify ?? 'Invoice',
          params.print_due ?? null,
          invoiceId,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO tbl_invoice_main (
          customer_id, invoice_no, checklist_no, company_id,
          sub_total, amount_due, vat, discount, total, per,
          invoice_date, case_debit, paid_amount, balance, no, cr_dr, identify, print_due
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.customer_id,
          invoice_no,
          params.checklist_no ?? null,
          companyId,
          params.sub_total,
          params.amount_due,
          params.vat,
          params.discount,
          params.total,
          params.per,
          params.invoice_date,
          params.case_debit ?? null,
          params.paid_amount,
          params.balance,
          params.no ?? null,
          cr_dr,
          params.identify ?? 'Invoice',
          params.print_due ?? null,
        ],
      );

      const idRows = await db.select<{ id: number }[]>(
        'SELECT last_insert_rowid() as id',
        [],
      );
      invoiceId = idRows[0]?.id ?? 0;
    }

    for (const item of params.line_items) {
      if (item.id && item.id > 0) {
        await db.execute(
          `UPDATE tbl_invoice_sub
           SET qty = ?,
               product_id = ?,
               unit_price = ?,
               row_total = ?,
               s_no = ?,
               company_id = ?,
               is_deleted = 0
           WHERE id = ?`,
          [
            item.qty,
            item.product_id ?? null,
            item.unit_price,
            item.row_total,
            item.s_no,
            item.company_id ?? companyId,
            item.id,
          ],
        );
      } else {
        await db.execute(
          `INSERT INTO tbl_invoice_sub (main_id, qty, product_id, unit_price, row_total, s_no, company_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            item.qty,
            item.product_id ?? null,
            item.unit_price,
            item.row_total,
            item.s_no,
            item.company_id ?? companyId,
          ],
        );
      }
    }

    const nextCustomerBalance = fromSignedBalance(endingSignedBalance);

    for (const lineId of params.deleted_line_item_ids ?? []) {
      if (lineId > 0) {
        await db.execute('DELETE FROM tbl_invoice_sub WHERE id = ?', [lineId]);
      }
    }

    await db.execute(
      'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
      [
        nextCustomerBalance.due_amount,
        nextCustomerBalance.ad_due,
        params.customer_id,
      ],
    );

    await db.execute('COMMIT');
    return { id: invoiceId, invoice_no };
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
