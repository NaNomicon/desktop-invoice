import { getDb } from '@/lib/db';

interface LineItemWithCompany {
  id?: number;
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
  company_id: number;
}

interface SplitQuotationParams {
  customer_id: number;
  quo_date: string;
  checklist_no: string | null;
  no: string | null;
  identify: string | null;
  sub_total: number;
  vat: number;
  discount: number;
  total: number;
  per: number;
  line_items: LineItemWithCompany[];
}

interface SplitQuotationResult {
  quotation1_no: string;
  quotation2_no: string;
  quotation1_id: number;
  quotation2_id: number;
}

export async function splitQuotation(
  params: SplitQuotationParams,
): Promise<SplitQuotationResult> {
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
    throw new Error('Unable to resolve both company groups for split quotation');
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

  await db.execute('BEGIN TRANSACTION');

  try {
    await db.execute(
      'UPDATE tbl_numbers SET quo_no = quo_no + 1',
      [],
    );
    const num1 = await db.select<{ quo_no: number }[]>(
      'SELECT quo_no FROM tbl_numbers',
      [],
    );
    const quoNo1 = String(num1[0]?.quo_no ?? 0);

    await db.execute(
      'UPDATE tbl_numbers SET quo_no = quo_no + 1',
      [],
    );
    const num2 = await db.select<{ quo_no: number }[]>(
      'SELECT quo_no FROM tbl_numbers',
      [],
    );
    const quoNo2 = String(num2[0]?.quo_no ?? 0);

    await db.execute(
      `INSERT INTO tbl_quotation_main (
        customer_id, quo_no, checklist_no, company_id,
        sub_total, amount_due, vat, discount, total, per,
        quo_date, no, identify, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        params.customer_id,
        quoNo1,
        params.checklist_no,
        c1,
        sub1,
        total1,
        vat1,
        disc1,
        total1,
        params.per,
        params.quo_date,
        params.no,
        params.identify,
      ],
    );

    const idRows1 = await db.select<{ id: number }[]>(
      'SELECT last_insert_rowid() as id',
      [],
    );
    const quotId1 = idRows1[0]?.id ?? 0;

    for (let i = 0; i < items1.length; i++) {
      const item = items1[i];
      if (!item) {
        throw new Error('Missing line item while creating first split quotation');
      }
      await db.execute(
        `INSERT INTO tbl_quotation_sub (main_id, qty, product_id, unit_price, row_total, s_no, company_id, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          quotId1,
          item.qty,
          item.product_id,
          item.unit_price,
          item.row_total,
          i + 1,
          c1,
        ],
      );
    }

    await db.execute(
      `INSERT INTO tbl_quotation_main (
        customer_id, quo_no, checklist_no, company_id,
        sub_total, amount_due, vat, discount, total, per,
        quo_date, no, identify, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        params.customer_id,
        quoNo2,
        params.checklist_no,
        c2,
        sub2,
        total2,
        vat2,
        disc2,
        total2,
        params.per,
        params.quo_date,
        params.no,
        params.identify,
      ],
    );

    const idRows2 = await db.select<{ id: number }[]>(
      'SELECT last_insert_rowid() as id',
      [],
    );
    const quotId2 = idRows2[0]?.id ?? 0;

    for (let i = 0; i < items2.length; i++) {
      const item = items2[i];
      if (!item) {
        throw new Error('Missing line item while creating second split quotation');
      }
      await db.execute(
        `INSERT INTO tbl_quotation_sub (main_id, qty, product_id, unit_price, row_total, s_no, company_id, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          quotId2,
          item.qty,
          item.product_id,
          item.unit_price,
          item.row_total,
          i + 1,
          c2,
        ],
      );
    }

    await db.execute('COMMIT');

    return {
      quotation1_no: quoNo1,
      quotation2_no: quoNo2,
      quotation1_id: quotId1,
      quotation2_id: quotId2,
    };
  } catch (err) {
    await db.execute('ROLLBACK');
    throw err;
  }
}