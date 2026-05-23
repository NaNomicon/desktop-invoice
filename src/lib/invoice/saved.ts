import { getDb } from '@/lib/db';

export interface InvoiceLineItem {
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
}

export interface InvoiceSaveParams {
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
  isAdvance: boolean;
}

/**
 * Invoice save with customer balance update, wrapped in a transaction.
 * cr_dr: paid_amount > 0 → "Cr.", else → "Dr."
 * Dr. → ADD total to customer.due_amount (customer owes more)
 * Cr. → SUBTRACT total from customer.due_amount (customer credit)
 * str1 initialized to "" before conditional assignment.
 */
export interface InvoiceSaveResult {
  id: number;
  invoice_no: string;
}

export async function saved(
  params: InvoiceSaveParams,
  companyId: number,
): Promise<InvoiceSaveResult> {
  const db = await getDb();

  let str1 = '';
  if (params.paid_amount > 0) {
    str1 = 'Cr.';
  } else {
    str1 = 'Dr.';
  }

  await db.execute('BEGIN TRANSACTION');

  try {
    let invoice_no = params.invoice_no;

    if (!invoice_no) {
      const custRows = await db.select<
        { ad_due: string; due_amount: number }[]
      >('SELECT ad_due, due_amount FROM tbl_customer WHERE id = ?', [
        params.customer_id,
      ]);
      const customer = custRows[0];

      await db.execute(
        'UPDATE tbl_numbers SET invoice_no = invoice_no + 1',
        [],
      );
      const numRows = await db.select<{ invoice_no: number }[]>(
        'SELECT invoice_no FROM tbl_numbers',
        [],
      );
      invoice_no = String(numRows[0]?.invoice_no ?? 0);

      if (params.isAdvance && customer) {
        const remainingAdvance = customer.due_amount - params.total;
        if (remainingAdvance <= 0) {
          await db.execute(
            'UPDATE tbl_customer SET ad_due = ? WHERE id = ?',
            ['Due', params.customer_id],
          );
        }
      }
    }

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
        str1,
        params.identify ?? 'Invoice',
        params.print_due ?? null,
      ],
    );

    const idRows = await db.select<{ id: number }[]>(
      'SELECT last_insert_rowid() as id',
      [],
    );
    const main_id = idRows[0]?.id ?? 0;

    for (const item of params.line_items) {
      await db.execute(
        `INSERT INTO tbl_invoice_sub (main_id, qty, product_id, unit_price, row_total, s_no, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          main_id,
          item.qty,
          item.product_id ?? null,
          item.unit_price,
          item.row_total,
          item.s_no,
          companyId,
        ],
      );
    }

    if (str1 === 'Cr.') {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount - ? WHERE id = ?',
        [params.total, params.customer_id],
      );
    } else {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount + ? WHERE id = ?',
        [params.total, params.customer_id],
      );
    }

    await db.execute('COMMIT');
    return { id: main_id, invoice_no };
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
