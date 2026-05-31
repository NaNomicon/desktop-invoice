import type Database from '@tauri-apps/plugin-sql';

export async function run(db: Database): Promise<void> {
  await db.execute(
    `INSERT OR IGNORE INTO tbl_company (id, company_name, company_short_name, company_code, is_active)
     VALUES (1, 'X-Press Ironing Ltd', 'XPI', 'XPI', 1)`
  );
  await db.execute(
    `INSERT OR IGNORE INTO tbl_numbers (id, invoice_no, quo_no, receipt_no)
     VALUES (1, 1, 1, 1)`
  );
  await db.execute(
    `UPDATE tbl_numbers
     SET invoice_no = 1,
         quo_no = 1,
         receipt_no = 1
     WHERE id = 1
       AND invoice_no = 0
       AND quo_no = 0
       AND receipt_no = 0`
  );
  await db.execute(
    `INSERT OR IGNORE INTO tbl_setting (id, isvat, vat_per, cash, cheque, other)
     VALUES (1, 1, 5, 'Cash', 'Cheque', 'Other')`
  );
  await db.execute(
    `INSERT OR IGNORE INTO tbl_user (id, user_id, password, des, company_id, is_deleted)
     VALUES (1, 'ADMIN', 'admin', 'ADMIN', 1, 0)`
  );
  await db.execute(
    `UPDATE tbl_user
     SET des = 'ADMIN'
     WHERE user_id = 'ADMIN'
       AND (des IS NULL OR TRIM(des) = '')`
  );

  const emailDefaults = [
    { id: 1, type: 'INVOICE' },
    { id: 2, type: 'QUOTATION' },
    { id: 3, type: 'STATEMENT' },
    { id: 4, type: 'RECEIPT' },
  ] as const;

  for (const item of emailDefaults) {
    await db.execute(
      `INSERT OR IGNORE INTO tbl_email (id, template_type, identify)
       VALUES (?, ?, ?)`,
      [item.id, item.type, item.type]
    );
  }

  await db.execute(
    `UPDATE tbl_email
     SET template_type = COALESCE(template_type, identify),
         identify = COALESCE(identify, template_type)
     WHERE template_type IS NULL OR identify IS NULL`
  );
}