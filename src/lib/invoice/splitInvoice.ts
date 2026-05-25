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

  const vat1 = params.sub_total > 0 ? Math.round((params.vat * sub1) / params.sub_total) : 0;
  const vat2 = params.vat - vat1;

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

  const drcr1 = due1 > 0 ? 'Cr.' : due1 < 0 ? 'Dr.' : null;
  const drcr2 = due2 > 0 ? 'Cr.' : due2 < 0 ? 'Dr.' : null;

  await db.execute('BEGIN TRANSACTION');

  try {
    const customerRows = await db.select<{ due_amount: number; ad_due: string | null }[]>(
      'SELECT due_amount, ad_due FROM tbl_customer WHERE id = ? LIMIT 1',
      [params.customer_id],
    );
    const customer = customerRows[0];
    const startingSignedBalance = customer ? toSignedBalance(customer.ad_due, customer.due_amount) : 0;
    const endingSignedBalance = startingSignedBalance + due1 + due2;
    const nextCustomerBalance = fromSignedBalance(endingSignedBalance);

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
        params.amount_due,
        vat1,
        disc1,
        total1,
        params.per,
        params.invoice_date,
        params.case_debit ?? null,
        paid1,
        Math.abs(due1),
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
        params.amount_due,
        vat2,
        disc2,
        total2,
        params.per,
        params.invoice_date,
        params.case_debit ?? null,
        paid2,
        Math.abs(due2),
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

    await db.execute(
      'UPDATE tbl_customer SET due_amount = ?, ad_due = ? WHERE id = ?',
      [nextCustomerBalance.due_amount, nextCustomerBalance.ad_due, params.customer_id],
    );

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
