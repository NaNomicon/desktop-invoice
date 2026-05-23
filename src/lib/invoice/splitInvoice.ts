import { getDb } from '@/lib/db';

interface LineItemWithCompany {
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
  company_id: number;
}

interface SplitInvoiceParams {
  customer_id: number;
  invoice_date: string;
  checklist_no: string | null;
  case_debit: string;
  paid_amount: number;
  per: number;
  sub_total: number;
  vat: number;
  discount: number;
  total: number;
  amount_due: number;
  cr_dr: string;
  line_items: LineItemWithCompany[];
}

interface SplitInvoiceResult {
  invoice1_no: string;
  invoice2_no: string;
  invoice1_id: number;
  invoice2_id: number;
}

/**
 * Split invoice: create two invoices grouped by company_id from line items.
 *
 * Financials recalculated per split:
 * - sub_total = sum of group's row_totals
 * - vat = sub_total * per / 100
 * - discount split proportionally by sub_total ratio
 * - paid_amount split proportionally by sub_total ratio
 * - total = sub_total + vat - discount (per invoice)
 * - amount_due = total - paid_amount (per invoice)
 * - balance = amount_due (per invoice)
 * - cr_dr: paid > 0 → 'Cr.', else → 'Dr.'
 *
 * Both invoices created in a single transaction.
 * Customer due_amount updated for both invoices (Cr. subtracts, Dr. adds).
 */
export async function splitInvoice(
  params: SplitInvoiceParams,
): Promise<SplitInvoiceResult> {
  const db = await getDb();

  const groups = new Map<number, LineItemWithCompany[]>();
  for (const item of params.line_items) {
    const list = groups.get(item.company_id);
    if (list) {
      list.push(item);
    } else {
      groups.set(item.company_id, [item]);
    }
  }

  const companyIds = Array.from(groups.keys());
  if (companyIds.length !== 2) {
    throw new Error(
      `Expected exactly 2 companies in line items, got ${companyIds.length}`,
    );
  }

  const c1 = companyIds[0];
  const c2 = companyIds[1];
  if (c1 === undefined || c2 === undefined) {
    throw new Error('Unable to resolve both company groups for split invoice');
  }

  const items1 = groups.get(c1) ?? [];
  const items2 = groups.get(c2) ?? [];

  const sub1 = items1.reduce((s, i) => s + i.row_total, 0);
  const sub2 = items2.reduce((s, i) => s + i.row_total, 0);

  const vat1 = Math.round((sub1 * params.per) / 100);
  const vat2 = Math.round((sub2 * params.per) / 100);

  const disc1 =
    params.sub_total > 0
      ? Math.round((params.discount * sub1) / params.sub_total)
      : 0;
  const disc2 = params.discount - disc1;

  const total1 = sub1 + vat1 - disc1;
  const total2 = sub2 + vat2 - disc2;

  const paid1 =
    params.sub_total > 0
      ? Math.round((params.paid_amount * sub1) / params.sub_total)
      : 0;
  const paid2 = params.paid_amount - paid1;

  const due1 = total1 - paid1;
  const due2 = total2 - paid2;

  const drcr1 = paid1 > 0 ? 'Cr.' : 'Dr.';
  const drcr2 = paid2 > 0 ? 'Cr.' : 'Dr.';

  await db.execute('BEGIN TRANSACTION');

  try {
    await db.execute(
      'UPDATE tbl_numbers SET invoice_no = invoice_no + 1',
      [],
    );
    const num1 = await db.select<{ invoice_no: number }[]>(
      'SELECT invoice_no FROM tbl_numbers',
      [],
    );
    const invNo1 = String(num1[0]?.invoice_no ?? 0);

    await db.execute(
      'UPDATE tbl_numbers SET invoice_no = invoice_no + 1',
      [],
    );
    const num2 = await db.select<{ invoice_no: number }[]>(
      'SELECT invoice_no FROM tbl_numbers',
      [],
    );
    const invNo2 = String(num2[0]?.invoice_no ?? 0);

    await db.execute(
      `INSERT INTO tbl_invoice_main (
        customer_id, invoice_no, checklist_no, company_id,
        sub_total, amount_due, vat, discount, total, per,
        invoice_date, case_debit, paid_amount, balance, no, cr_dr, identify, print_due
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.customer_id,
        invNo1,
        params.checklist_no ?? null,
        c1,
        sub1,
        due1,
        vat1,
        disc1,
        total1,
        params.per,
        params.invoice_date,
        params.case_debit ?? null,
        paid1,
        due1,
        null,
        drcr1,
        'Invoice',
        null,
      ],
    );

    const idRows1 = await db.select<{ id: number }[]>(
      'SELECT last_insert_rowid() as id',
      [],
    );
    const invId1 = idRows1[0]?.id ?? 0;

    for (let i = 0; i < items1.length; i++) {
      const item = items1[i];
      if (!item) {
        throw new Error('Missing line item while creating first split invoice');
      }
      await db.execute(
        `INSERT INTO tbl_invoice_sub (main_id, qty, product_id, unit_price, row_total, s_no, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          invId1,
          item.qty,
          item.product_id ?? null,
          item.unit_price,
          item.row_total,
          i + 1,
          c1,
        ],
      );
    }

    await db.execute(
      `INSERT INTO tbl_invoice_main (
        customer_id, invoice_no, checklist_no, company_id,
        sub_total, amount_due, vat, discount, total, per,
        invoice_date, case_debit, paid_amount, balance, no, cr_dr, identify, print_due
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.customer_id,
        invNo2,
        params.checklist_no ?? null,
        c2,
        sub2,
        due2,
        vat2,
        disc2,
        total2,
        params.per,
        params.invoice_date,
        params.case_debit ?? null,
        paid2,
        due2,
        null,
        drcr2,
        'Invoice',
        null,
      ],
    );

    const idRows2 = await db.select<{ id: number }[]>(
      'SELECT last_insert_rowid() as id',
      [],
    );
    const invId2 = idRows2[0]?.id ?? 0;

    for (let i = 0; i < items2.length; i++) {
      const item = items2[i];
      if (!item) {
        throw new Error('Missing line item while creating second split invoice');
      }
      await db.execute(
        `INSERT INTO tbl_invoice_sub (main_id, qty, product_id, unit_price, row_total, s_no, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          invId2,
          item.qty,
          item.product_id ?? null,
          item.unit_price,
          item.row_total,
          i + 1,
          c2,
        ],
      );
    }

    if (drcr1 === 'Cr.') {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount - ? WHERE id = ?',
        [total1, params.customer_id],
      );
    } else {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount + ? WHERE id = ?',
        [total1, params.customer_id],
      );
    }

    if (drcr2 === 'Cr.') {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount - ? WHERE id = ?',
        [total2, params.customer_id],
      );
    } else {
      await db.execute(
        'UPDATE tbl_customer SET due_amount = due_amount + ? WHERE id = ?',
        [total2, params.customer_id],
      );
    }

    await db.execute('COMMIT');

    return {
      invoice1_no: invNo1,
      invoice2_no: invNo2,
      invoice1_id: invId1,
      invoice2_id: invId2,
    };
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}
