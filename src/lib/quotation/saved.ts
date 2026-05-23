import { getDb } from '@/lib/db';

export interface QuotationLineItemInput {
  id?: number;
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
}

export interface QuotationSaveParams {
  quotation_id?: number | null;
  customer_id: number;
  quo_no?: string;
  checklist_no: string | null;
  company_id: number;
  sub_total: number;
  amount_due: number;
  vat: number;
  discount: number;
  total: number;
  per: number;
  quo_date: string;
  no: string | null;
  identify: string | null;
  line_items: QuotationLineItemInput[];
  deleted_line_item_ids?: number[];
}

export interface QuotationSaveResult {
  id: number;
  quo_no: string;
}

export async function saveQuotation(
  params: QuotationSaveParams,
): Promise<QuotationSaveResult> {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');

  try {
    const isEditing = Boolean(params.quotation_id);
    let quoNo = params.quo_no?.trim() || '';

    if (!quoNo) {
      const numberRows = await db.select<{ quo_no: number }[]>(
        'SELECT quo_no FROM tbl_numbers WHERE id = 1',
        [],
      );
      quoNo = String((numberRows[0]?.quo_no ?? 0) + 1);
    }

    let quotationId = params.quotation_id ?? 0;

    if (isEditing) {
      await db.execute(
        `UPDATE tbl_quotation_main
         SET customer_id = ?,
             quo_no = ?,
             checklist_no = ?,
             company_id = ?,
             sub_total = ?,
             amount_due = ?,
             vat = ?,
             discount = ?,
             total = ?,
             per = ?,
             quo_date = ?,
             no = ?,
             identify = ?
         WHERE id = ?`,
        [
          params.customer_id,
          quoNo,
          params.checklist_no,
          params.company_id,
          params.sub_total,
          params.amount_due,
          params.vat,
          params.discount,
          params.total,
          params.per,
          params.quo_date,
          params.no,
          params.identify,
          quotationId,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO tbl_quotation_main (
          customer_id, quo_no, checklist_no, company_id,
          sub_total, amount_due, vat, discount, total, per,
          quo_date, no, identify, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          params.customer_id,
          quoNo,
          params.checklist_no,
          params.company_id,
          params.sub_total,
          params.amount_due,
          params.vat,
          params.discount,
          params.total,
          params.per,
          params.quo_date,
          params.no,
          params.identify,
        ],
      );

      const idRows = await db.select<{ id: number }[]>(
        'SELECT last_insert_rowid() AS id',
        [],
      );
      quotationId = idRows[0]?.id ?? 0;

      await db.execute(
        'UPDATE tbl_numbers SET quo_no = ? WHERE id = 1',
        [parseInt(quoNo, 10)],
      );
    }

    for (const item of params.line_items) {
      if (item.id && item.id > 0) {
        await db.execute(
          `UPDATE tbl_quotation_sub
           SET qty = ?,
               product_id = ?,
               unit_price = ?,
               row_total = ?,
               s_no = ?,
               is_deleted = 0
           WHERE id = ?`,
          [
            item.qty,
            item.product_id,
            item.unit_price,
            item.row_total,
            item.s_no,
            item.id,
          ],
        );
      } else {
        await db.execute(
          `INSERT INTO tbl_quotation_sub (
            main_id, qty, product_id, unit_price, row_total, s_no, is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [
            quotationId,
            item.qty,
            item.product_id,
            item.unit_price,
            item.row_total,
            item.s_no,
          ],
        );
      }
    }

    for (const lineId of params.deleted_line_item_ids ?? []) {
      if (lineId > 0) {
        await db.execute('DELETE FROM tbl_quotation_sub WHERE id = ?', [lineId]);
      }
    }

    await db.execute('COMMIT');
    return { id: quotationId, quo_no: quoNo };
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}
