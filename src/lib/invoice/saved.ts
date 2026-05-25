import { getDb } from '@/lib/db';

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
    let previousNetDelta = 0;

    if (isEditing) {
      const existingRows = await db.select<
        { invoice_no: string; total: number; paid_amount: number }[]
      >('SELECT invoice_no, total, paid_amount FROM tbl_invoice_main WHERE id = ?', [
        invoiceId,
      ]);
      const existing = existingRows[0];
      if (!existing) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }
      invoice_no = invoice_no || existing.invoice_no;
      previousNetDelta = existing.total - existing.paid_amount;
    } else if (!invoice_no) {
      await db.execute(
        'UPDATE tbl_numbers SET invoice_no = invoice_no + 1',
        [],
      );
      const numRows = await db.select<{ invoice_no: number }[]>(
        'SELECT invoice_no FROM tbl_numbers',
        [],
      );
      invoice_no = String(numRows[0]?.invoice_no ?? 0);
    }

    const startingSignedBalance = customer
      ? toSignedBalance(customer.ad_due, customer.due_amount)
      : 0;
    const netInvoiceDelta = params.total - params.paid_amount;
    const endingSignedBalance = startingSignedBalance - previousNetDelta + netInvoiceDelta;
    const nextCustomerBalance = fromSignedBalance(endingSignedBalance);

    let cr_dr: string | null = null;
    if (netInvoiceDelta > 0) {
      cr_dr = 'Cr.';
    } else if (netInvoiceDelta < 0) {
      cr_dr = 'Dr.';
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
