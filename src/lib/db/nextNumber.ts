import { query } from '@/lib/db';

export async function getNextInvoiceNo(): Promise<string> {
  const rows = await query<{ next_no: number | null }>(
    `SELECT MAX(CAST(invoice_no AS INTEGER)) + 1 AS next_no
     FROM tbl_invoice_main
     WHERE is_deleted = 0`,
  );
  return String(rows[0]?.next_no ?? 1);
}

export async function getNextQuoNo(): Promise<string> {
  const rows = await query<{ next_no: number | null }>(
    `SELECT MAX(CAST(quo_no AS INTEGER)) + 1 AS next_no
     FROM tbl_quotation_main`,
  );
  return String(rows[0]?.next_no ?? 1);
}

export async function getNextReceiptNo(): Promise<string> {
  const rows = await query<{ next_no: number | null }>(
    `SELECT MAX(CAST(receipt_no AS INTEGER)) + 1 AS next_no
     FROM tbl_receipt`,
  );
  return String(rows[0]?.next_no ?? 1);
}
