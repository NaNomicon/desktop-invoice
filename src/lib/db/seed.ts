import type Database from '@tauri-apps/plugin-sql';

export async function run(db: Database): Promise<void> {
  await db.execute(
    `INSERT OR IGNORE INTO tbl_company (id, company_name, company_short_name, company_code, is_active)
     VALUES (1, 'X-Press Ironing Ltd', 'XPI', 'XPI', 1)`
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

  await seedCompany2(db);
}

/**
 * Seed reference data and company-specific records for company #2.
 * Idempotent — uses INSERT OR IGNORE for types, existence check for company data.
 * Safe to call on every startup.
 */
async function seedCompany2(db: Database): Promise<void> {
  // ── Product types (shared reference data) ──
  const productTypes = [
    { id: 1, name: 'Ironing Services' },
    { id: 2, name: 'Washing Services' },
    { id: 3, name: 'Dry Cleaning' },
    { id: 4, name: 'Alterations & Repairs' },
  ] as const;

  for (const pt of productTypes) {
    await db.execute(
      `INSERT OR IGNORE INTO tbl_product_type (id, type_name) VALUES (?, ?)`,
      [pt.id, pt.name]
    );
  }

  const existing = await db.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt FROM tbl_product WHERE company_id = 2 AND is_deleted = 0`
  );
  if (existing[0]?.cnt != null && existing[0].cnt > 0) return;

  // ── Customers for company #2 ──
  const customers = [
    {
      name: 'Ocean View Hotel', contact: 'Marie Chen',
      telephone: '+230 5700 1001', address: 'Flic-en-Flac',
      email: 'marie@oceanview.mu', reg_date: '2026-01-15',
    },
    {
      name: 'Blue Bay Resort', contact: 'David Wong',
      telephone: '+230 5700 1002', address: 'Blue Bay',
      email: 'david@bluebay.mu', reg_date: '2026-02-01',
    },
    {
      name: 'Sunshine Laundry Agency', contact: 'Anita Patel',
      telephone: '+230 5700 1003', address: 'Port Louis',
      email: 'anita@sunshine.mu', reg_date: '2026-03-10',
    },
    {
      name: 'Grand Baie Travelodge', contact: 'Jean-Pierre Dubois',
      telephone: '+230 5700 1004', address: 'Grand Baie',
      email: 'jp@grandbaie.mu', reg_date: '2026-04-05',
    },
  ] as const;

  for (const c of customers) {
    await db.execute(
      `INSERT INTO tbl_customer
         (customer_name, contact, telephone, address, email, company_id, reg_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, 2, ?, 0)`,
      [c.name, c.contact, c.telephone, c.address, c.email, c.reg_date]
    );
  }

  // ── Products for company #2 ──
  const products = [
    { name: 'Standard Ironing Service', type_id: 1, price: 15000 },
    { name: 'Premium Wash & Iron', type_id: 2, price: 25000 },
    { name: 'Dry Clean — Suit', type_id: 3, price: 35000 },
    { name: 'Dry Clean — Dress', type_id: 3, price: 28000 },
    { name: 'Trouser Alteration', type_id: 4, price: 12000 },
    { name: 'Bulk Laundry (per kg)', type_id: 2, price: 5000 },
  ] as const;

  for (const p of products) {
    await db.execute(
      `INSERT INTO tbl_product
         (product_name, type_id, company_id, price, is_deleted)
       VALUES (?, ?, 2, ?, 0)`,
      [p.name, p.type_id, p.price]
    );
  }
}