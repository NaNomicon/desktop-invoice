import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tbl_company (
    id INTEGER PRIMARY KEY,
    company_name TEXT,
    company_short_name TEXT,
    company_code TEXT,
    contact_person TEXT,
    address TEXT,
    city TEXT,
    telephone TEXT,
    email TEXT,
    facebook_url TEXT,
    brn TEXT,
    vat TEXT,
    note1 TEXT,
    note2 TEXT,
    note3 TEXT,
    thanks1 TEXT,
    thanks2 TEXT,
    currency TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    logo TEXT,
    watermark TEXT,
    is_active INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_user (
    id INTEGER PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    des TEXT,
    company_id INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_setting (
    id INTEGER PRIMARY KEY,
    isvat INTEGER DEFAULT 1,
    vat_per INTEGER DEFAULT 5,
    invoice_path TEXT,
    quo_path TEXT,
    report_path TEXT,
    invoice_days TEXT,
    back_path TEXT,
    backup_path TEXT,
    cash TEXT,
    cheque TEXT,
    other TEXT,
    wa_access_token TEXT,
    wa_phone_number_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_numbers (
    id INTEGER PRIMARY KEY,
    invoice_no INTEGER DEFAULT 1,
    quo_no INTEGER DEFAULT 1,
    receipt_no INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_product_type (
    id INTEGER PRIMARY KEY,
    type_name TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_customer (
    id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    contact TEXT,
    customer_type TEXT,
    telephone TEXT,
    address TEXT,
    email TEXT,
    due_amount INTEGER DEFAULT 0,
    title_name TEXT,
    reg_date TEXT,
    ad_due TEXT DEFAULT 'Advance',
    brn TEXT,
    vat TEXT,
    company_id INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_product (
    id INTEGER PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    type_id INTEGER REFERENCES tbl_product_type(id),
    company_id INTEGER DEFAULT 1,
    price INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_invoice_main (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES tbl_customer(id),
    invoice_no TEXT NOT NULL,
    checklist_no TEXT,
    company_id INTEGER DEFAULT 1,
    sub_total INTEGER DEFAULT 0,
    amount_due INTEGER DEFAULT 0,
    vat INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    per INTEGER DEFAULT 0,
    invoice_date TEXT,
    case_debit TEXT,
    paid_amount INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
    no TEXT,
    cr_dr TEXT,
    identify TEXT,
    print_due TEXT,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_invoice_sub (
    id INTEGER PRIMARY KEY,
    main_id INTEGER REFERENCES tbl_invoice_main(id),
    qty INTEGER DEFAULT 0,
    product_id INTEGER REFERENCES tbl_product(id),
    unit_price INTEGER DEFAULT 0,
    row_total INTEGER DEFAULT 0,
    s_no INTEGER DEFAULT 0,
    company_id INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_quotation_main (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES tbl_customer(id),
    quo_no TEXT NOT NULL,
    checklist_no TEXT,
    company_id INTEGER DEFAULT 1,
    sub_total INTEGER DEFAULT 0,
    amount_due INTEGER DEFAULT 0,
    vat INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    per INTEGER DEFAULT 0,
    quo_date TEXT,
    case_debit TEXT,
    paid_amount INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
    no TEXT,
    cr_dr TEXT,
    identify TEXT,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_quotation_sub (
    id INTEGER PRIMARY KEY,
    main_id INTEGER REFERENCES tbl_quotation_main(id),
    qty INTEGER DEFAULT 0,
    product_id INTEGER REFERENCES tbl_product(id),
    unit_price INTEGER DEFAULT 0,
    row_total INTEGER DEFAULT 0,
    s_no INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_receipt (
    id INTEGER PRIMARY KEY,
    receipt_no TEXT NOT NULL,
    receipt_date TEXT,
    customer_id INTEGER REFERENCES tbl_customer(id),
    company_id INTEGER DEFAULT 1,
    due_amount INTEGER DEFAULT 0,
    amount_received INTEGER DEFAULT 0,
    cheque_no TEXT,
    no TEXT,
    balance INTEGER DEFAULT 0,
    cr_dr TEXT,
    invoice_no TEXT,
    pre_load TEXT,
    cash TEXT DEFAULT '0',
    cheque TEXT DEFAULT '0',
    other TEXT DEFAULT '0',
    payment_mode TEXT,
    bank_name TEXT,
    invoice_reference TEXT,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_email (
    id INTEGER PRIMARY KEY,
    template_type TEXT,
    subject TEXT,
    body TEXT,
    sender_email TEXT,
    sender_pass TEXT,
    client_email TEXT,
    sender TEXT,
    identify TEXT,
    sub_subject TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_wa_template (
    id INTEGER PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_id TEXT NOT NULL,
    body TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_whatsapp (
    id INTEGER PRIMARY KEY,
    identify TEXT NOT NULL,
    content_sid TEXT NOT NULL,
    body TEXT NOT NULL,
    header_type TEXT,
    header_url TEXT,
    footer TEXT,
    status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_whatsapp_settings (
    id INTEGER PRIMARY KEY,
    company_id INTEGER DEFAULT 1,
    phone_id TEXT NOT NULL,
    waba_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    display_name TEXT,
    is_active INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS tbl_whatsapp_log (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    identify TEXT,
    recipient_phone TEXT NOT NULL,
    message_sid TEXT,
    status TEXT,
    error_code TEXT,
    error_message TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS idx_customer_name ON tbl_customer(customer_name)',
  'CREATE INDEX IF NOT EXISTS idx_product_type ON tbl_product(type_id)',
  'CREATE INDEX IF NOT EXISTS idx_product_company ON tbl_product(company_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_cust ON tbl_invoice_main(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_company ON tbl_invoice_main(company_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_date ON tbl_invoice_main(invoice_date)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_sub_main ON tbl_invoice_sub(main_id)',
  'CREATE INDEX IF NOT EXISTS idx_quotation_cust ON tbl_quotation_main(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_receipt_cust ON tbl_receipt(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_receipt_company ON tbl_receipt(company_id)',
  'CREATE INDEX IF NOT EXISTS idx_receipt_date ON tbl_receipt(receipt_date)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_type ON tbl_email(template_type)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_email_identify ON tbl_email(identify)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_name ON tbl_wa_template(template_name)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_id ON tbl_wa_template(template_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_identify ON tbl_whatsapp(identify)',
  'CREATE INDEX IF NOT EXISTS idx_whatsapp_log_customer ON tbl_whatsapp_log(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_whatsapp_log_status ON tbl_whatsapp_log(status)',
] as const;

interface ColumnSpec {
  name: string;
  type: string;
}

const REQUIRED_COLUMNS: Record<string, ColumnSpec[]> = {
  tbl_company: [
    { name: 'company_name', type: 'TEXT' },
    { name: 'company_short_name', type: 'TEXT' },
    { name: 'company_code', type: 'TEXT' },
    { name: 'contact_person', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'city', type: 'TEXT' },
    { name: 'telephone', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'facebook_url', type: 'TEXT' },
    { name: 'brn', type: 'TEXT' },
    { name: 'vat', type: 'TEXT' },
    { name: 'note1', type: 'TEXT' },
    { name: 'note2', type: 'TEXT' },
    { name: 'note3', type: 'TEXT' },
    { name: 'thanks1', type: 'TEXT' },
    { name: 'thanks2', type: 'TEXT' },
    { name: 'currency', type: 'TEXT' },
    { name: 'bank_name', type: 'TEXT' },
    { name: 'bank_account', type: 'TEXT' },
    { name: 'bank_branch', type: 'TEXT' },
    { name: 'logo', type: 'TEXT' },
    { name: 'watermark', type: 'TEXT' },
    { name: 'is_active', type: 'INTEGER DEFAULT 1' },
  ],
  tbl_user: [
    { name: 'user_id', type: 'TEXT' },
    { name: 'password', type: 'TEXT' },
    { name: 'des', type: 'TEXT' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_setting: [
    { name: 'isvat', type: 'INTEGER DEFAULT 1' },
    { name: 'vat_per', type: 'INTEGER DEFAULT 5' },
    { name: 'invoice_path', type: 'TEXT' },
    { name: 'quo_path', type: 'TEXT' },
    { name: 'report_path', type: 'TEXT' },
    { name: 'invoice_days', type: 'TEXT' },
    { name: 'back_path', type: 'TEXT' },
    { name: 'backup_path', type: 'TEXT' },
    { name: 'cash', type: 'TEXT' },
    { name: 'cheque', type: 'TEXT' },
    { name: 'other', type: 'TEXT' },
    { name: 'wa_access_token', type: 'TEXT' },
    { name: 'wa_phone_number_id', type: 'TEXT' },
  ],
  tbl_numbers: [
    { name: 'invoice_no', type: 'INTEGER DEFAULT 1' },
    { name: 'quo_no', type: 'INTEGER DEFAULT 1' },
    { name: 'receipt_no', type: 'INTEGER DEFAULT 1' },
  ],
  tbl_product_type: [
    { name: 'type_name', type: 'TEXT' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_customer: [
    { name: 'customer_name', type: 'TEXT' },
    { name: 'contact', type: 'TEXT' },
    { name: 'customer_type', type: 'TEXT' },
    { name: 'telephone', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'due_amount', type: 'INTEGER DEFAULT 0' },
    { name: 'title_name', type: 'TEXT' },
    { name: 'reg_date', type: 'TEXT' },
    { name: 'ad_due', type: "TEXT DEFAULT 'Advance'" },
    { name: 'brn', type: 'TEXT' },
    { name: 'vat', type: 'TEXT' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_product: [
    { name: 'product_id', type: 'TEXT' },
    { name: 'product_name', type: 'TEXT' },
    { name: 'type_id', type: 'INTEGER' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'price', type: 'INTEGER DEFAULT 0' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_invoice_main: [
    { name: 'customer_id', type: 'INTEGER' },
    { name: 'invoice_no', type: 'TEXT' },
    { name: 'checklist_no', type: 'TEXT' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'sub_total', type: 'INTEGER DEFAULT 0' },
    { name: 'amount_due', type: 'INTEGER DEFAULT 0' },
    { name: 'vat', type: 'INTEGER DEFAULT 0' },
    { name: 'discount', type: 'INTEGER DEFAULT 0' },
    { name: 'total', type: 'INTEGER DEFAULT 0' },
    { name: 'per', type: 'INTEGER DEFAULT 0' },
    { name: 'invoice_date', type: 'TEXT' },
    { name: 'case_debit', type: 'TEXT' },
    { name: 'paid_amount', type: 'INTEGER DEFAULT 0' },
    { name: 'balance', type: 'INTEGER DEFAULT 0' },
    { name: 'no', type: 'TEXT' },
    { name: 'cr_dr', type: 'TEXT' },
    { name: 'identify', type: 'TEXT' },
    { name: 'print_due', type: 'TEXT' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_invoice_sub: [
    { name: 'main_id', type: 'INTEGER' },
    { name: 'qty', type: 'INTEGER DEFAULT 0' },
    { name: 'product_id', type: 'INTEGER' },
    { name: 'unit_price', type: 'INTEGER DEFAULT 0' },
    { name: 'row_total', type: 'INTEGER DEFAULT 0' },
    { name: 's_no', type: 'INTEGER DEFAULT 0' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_quotation_main: [
    { name: 'customer_id', type: 'INTEGER' },
    { name: 'quo_no', type: 'TEXT' },
    { name: 'checklist_no', type: 'TEXT' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'sub_total', type: 'INTEGER DEFAULT 0' },
    { name: 'amount_due', type: 'INTEGER DEFAULT 0' },
    { name: 'vat', type: 'INTEGER DEFAULT 0' },
    { name: 'discount', type: 'INTEGER DEFAULT 0' },
    { name: 'total', type: 'INTEGER DEFAULT 0' },
    { name: 'per', type: 'INTEGER DEFAULT 0' },
    { name: 'quo_date', type: 'TEXT' },
    { name: 'case_debit', type: 'TEXT' },
    { name: 'paid_amount', type: 'INTEGER DEFAULT 0' },
    { name: 'balance', type: 'INTEGER DEFAULT 0' },
    { name: 'no', type: 'TEXT' },
    { name: 'cr_dr', type: 'TEXT' },
    { name: 'identify', type: 'TEXT' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_quotation_sub: [
    { name: 'main_id', type: 'INTEGER' },
    { name: 'qty', type: 'INTEGER DEFAULT 0' },
    { name: 'product_id', type: 'INTEGER' },
    { name: 'unit_price', type: 'INTEGER DEFAULT 0' },
    { name: 'row_total', type: 'INTEGER DEFAULT 0' },
    { name: 's_no', type: 'INTEGER DEFAULT 0' },
    { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
  ],
  tbl_receipt: [
    { name: 'receipt_no', type: 'TEXT' },
    { name: 'receipt_date', type: 'TEXT' },
    { name: 'customer_id', type: 'INTEGER' },
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'due_amount', type: 'INTEGER DEFAULT 0' },
    { name: 'amount_received', type: 'INTEGER DEFAULT 0' },
    { name: 'cheque_no', type: 'TEXT' },
    { name: 'no', type: 'TEXT' },
    { name: 'balance', type: 'INTEGER DEFAULT 0' },
    { name: 'cr_dr', type: 'TEXT' },
    { name: 'invoice_no', type: 'TEXT' },
    { name: 'pre_load', type: 'TEXT' },
    { name: 'cash', type: "TEXT DEFAULT '0'" },
    { name: 'cheque', type: "TEXT DEFAULT '0'" },
    { name: 'other', type: "TEXT DEFAULT '0'" },
    { name: 'payment_mode', type: 'TEXT' },
    { name: 'bank_name', type: 'TEXT' },
    { name: 'invoice_reference', type: 'TEXT' },
    { name: 'notes', type: 'TEXT' },
  ],
  tbl_email: [
    { name: 'template_type', type: 'TEXT' },
    { name: 'subject', type: 'TEXT' },
    { name: 'body', type: 'TEXT' },
    { name: 'sender_email', type: 'TEXT' },
    { name: 'sender_pass', type: 'TEXT' },
    { name: 'client_email', type: 'TEXT' },
    { name: 'sender', type: 'TEXT' },
    { name: 'identify', type: 'TEXT' },
    { name: 'sub_subject', type: 'TEXT' },
  ],
  tbl_wa_template: [
    { name: 'template_name', type: 'TEXT' },
    { name: 'template_id', type: 'TEXT' },
    { name: 'body', type: 'TEXT' },
    { name: 'status', type: "TEXT DEFAULT 'PENDING'" },
    { name: 'created_at', type: "TEXT DEFAULT (datetime('now'))" },
    { name: 'updated_at', type: "TEXT DEFAULT (datetime('now'))" },
  ],
  tbl_whatsapp: [
    { name: 'identify', type: 'TEXT NOT NULL' },
    { name: 'content_sid', type: 'TEXT NOT NULL' },
    { name: 'body', type: 'TEXT NOT NULL' },
    { name: 'header_type', type: 'TEXT' },
    { name: 'header_url', type: 'TEXT' },
    { name: 'footer', type: 'TEXT' },
    { name: 'status', type: 'TEXT' },
  ],
  tbl_whatsapp_settings: [
    { name: 'company_id', type: 'INTEGER DEFAULT 1' },
    { name: 'phone_id', type: 'TEXT NOT NULL' },
    { name: 'waba_id', type: 'TEXT NOT NULL' },
    { name: 'access_token', type: 'TEXT NOT NULL' },
    { name: 'display_name', type: 'TEXT' },
    { name: 'is_active', type: 'INTEGER DEFAULT 1' },
  ],
  tbl_whatsapp_log: [
    { name: 'customer_id', type: 'INTEGER' },
    { name: 'identify', type: 'TEXT' },
    { name: 'recipient_phone', type: 'TEXT NOT NULL' },
    { name: 'message_sid', type: 'TEXT' },
    { name: 'status', type: 'TEXT' },
    { name: 'error_code', type: 'TEXT' },
    { name: 'error_message', type: 'TEXT' },
    { name: 'sent_at', type: "TEXT DEFAULT (datetime('now'))" },
  ],
};

async function ensureSchema(database: Database): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await database.execute(statement);
  }

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const existing = (await database.select(
      `PRAGMA table_info(${table})`,
    )) as unknown as { name: string }[];
    const existingNames = new Set(existing.map((column) => column.name));

    for (const column of columns) {
      if (!existingNames.has(column.name)) {
        await database.execute(
          `ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.type}`,
        );
      }
    }
  }
}

async function seedDefaults(database: Database): Promise<void> {
  await database.execute(
    `INSERT OR IGNORE INTO tbl_company (id, company_name, company_short_name, company_code, is_active)
     VALUES (1, 'X-Press Ironing Ltd', 'XPI', 'XPI', 1)`,
  );
  await database.execute(
    `INSERT OR IGNORE INTO tbl_numbers (id, invoice_no, quo_no, receipt_no)
     VALUES (1, 1, 1, 1)`,
  );
  // Bump existing 0/0/0 to 1/1/1 (migration from prior seed value)
  await database.execute(
    `UPDATE tbl_numbers
     SET invoice_no = 1,
         quo_no = 1,
         receipt_no = 1
     WHERE id = 1
       AND invoice_no = 0
       AND quo_no = 0
       AND receipt_no = 0`,
  );
  await database.execute(
    `INSERT OR IGNORE INTO tbl_setting (id, isvat, vat_per, cash, cheque, other)
     VALUES (1, 1, 5, 'Cash', 'Cheque', 'Other')`,
  );
  await database.execute(
    `INSERT OR IGNORE INTO tbl_user (id, user_id, password, des, company_id, is_deleted)
     VALUES (1, 'ADMIN', 'admin', 'ADMIN', 1, 0)`,
  );
  await database.execute(
    `UPDATE tbl_user
     SET des = 'ADMIN'
     WHERE user_id = 'ADMIN'
       AND (des IS NULL OR TRIM(des) = '')`,
  );

  const emailDefaults = [
    { id: 1, type: 'INVOICE' },
    { id: 2, type: 'QUOTATION' },
    { id: 3, type: 'STATEMENT' },
    { id: 4, type: 'RECEIPT' },
  ] as const;

  for (const item of emailDefaults) {
    await database.execute(
      `INSERT OR IGNORE INTO tbl_email (id, template_type, identify)
       VALUES (?, ?, ?)`,
      [item.id, item.type, item.type],
    );
  }

  await database.execute(
    `UPDATE tbl_email
     SET template_type = COALESCE(template_type, identify),
         identify = COALESCE(identify, template_type)
     WHERE template_type IS NULL OR identify IS NULL`,
  );
}

async function initialize(database: Database): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL');
  await database.execute('PRAGMA foreign_keys=ON');
  await ensureSchema(database);
  await seedDefaults(database);
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:xpress.db');
  }

  if (!initPromise) {
    initPromise = initialize(db).catch((error) => {
      initPromise = null;
      db = null;
      throw error;
    });
  }

  await initPromise;
  return db;
}

/** Closes the active database connection. Call before restore to release file locks. */
export async function closeDb(): Promise<void> {
  if (db) {
    try {
      await db.close();
    } catch {
      // ignore close errors
    }
    db = null;
    initPromise = null;
  }
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const database = await getDb();
  return database.select(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const database = await getDb();
  await database.execute(sql, params);
}
