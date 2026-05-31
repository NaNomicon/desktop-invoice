export interface ColumnDef {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  default?: string;
  references?: string;
}

export interface TableSpec {
  columns: ColumnDef[];
  indexes?: string[];
  constraints?: string[];
}

interface SchemaVersion {
  major: number;
  minor: number;
  updated_at?: string;
}

export const CURRENT_VERSION: SchemaVersion = { major: 1, minor: 0 };

export const TABLES: Record<string, TableSpec> = {
  tbl_company: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
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
      { name: 'is_active', type: 'INTEGER', default: '1' },
    ],
    indexes: [],
  },

  tbl_user: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'user_id', type: 'TEXT', notNull: true },
      { name: 'password', type: 'TEXT', notNull: true },
      { name: 'des', type: 'TEXT' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: [],
    constraints: ['UNIQUE(user_id)'],
  },

  tbl_setting: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'isvat', type: 'INTEGER', default: '1' },
      { name: 'vat_per', type: 'INTEGER', default: '5' },
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
    indexes: [],
  },

  tbl_numbers: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'invoice_no', type: 'INTEGER', default: '1' },
      { name: 'quo_no', type: 'INTEGER', default: '1' },
      { name: 'receipt_no', type: 'INTEGER', default: '1' },
    ],
    indexes: [],
  },

  tbl_product_type: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'type_name', type: 'TEXT', notNull: true },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: [],
  },

  tbl_customer: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'customer_name', type: 'TEXT', notNull: true },
      { name: 'contact', type: 'TEXT' },
      { name: 'customer_type', type: 'TEXT' },
      { name: 'telephone', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'due_amount', type: 'INTEGER', default: '0' },
      { name: 'title_name', type: 'TEXT' },
      { name: 'reg_date', type: 'TEXT' },
      { name: 'ad_due', type: 'TEXT', default: "'Advance'" },
      { name: 'brn', type: 'TEXT' },
      { name: 'vat', type: 'TEXT' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_customer_name ON tbl_customer(customer_name)'],
  },

  tbl_product: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'product_id', type: 'TEXT' },
      { name: 'product_name', type: 'TEXT', notNull: true },
      { name: 'type_id', type: 'INTEGER', references: 'tbl_product_type(id)' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'price', type: 'INTEGER', default: '0' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_product_type ON tbl_product(type_id)',
      'CREATE INDEX IF NOT EXISTS idx_product_company ON tbl_product(company_id)',
    ],
  },

  tbl_invoice_main: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'customer_id', type: 'INTEGER', references: 'tbl_customer(id)' },
      { name: 'invoice_no', type: 'TEXT', notNull: true },
      { name: 'checklist_no', type: 'TEXT' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'sub_total', type: 'INTEGER', default: '0' },
      { name: 'amount_due', type: 'INTEGER', default: '0' },
      { name: 'vat', type: 'INTEGER', default: '0' },
      { name: 'discount', type: 'INTEGER', default: '0' },
      { name: 'total', type: 'INTEGER', default: '0' },
      { name: 'per', type: 'INTEGER', default: '0' },
      { name: 'invoice_date', type: 'TEXT' },
      { name: 'case_debit', type: 'TEXT' },
      { name: 'paid_amount', type: 'INTEGER', default: '0' },
      { name: 'balance', type: 'INTEGER', default: '0' },
      { name: 'no', type: 'TEXT' },
      { name: 'cr_dr', type: 'TEXT' },
      { name: 'identify', type: 'TEXT' },
      { name: 'print_due', type: 'TEXT' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_invoice_cust ON tbl_invoice_main(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_company ON tbl_invoice_main(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_date ON tbl_invoice_main(invoice_date)',
    ],
  },

  tbl_invoice_sub: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'main_id', type: 'INTEGER', references: 'tbl_invoice_main(id)' },
      { name: 'qty', type: 'INTEGER', default: '0' },
      { name: 'product_id', type: 'INTEGER', references: 'tbl_product(id)' },
      { name: 'unit_price', type: 'INTEGER', default: '0' },
      { name: 'row_total', type: 'INTEGER', default: '0' },
      { name: 's_no', type: 'INTEGER', default: '0' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_invoice_sub_main ON tbl_invoice_sub(main_id)'],
  },

  tbl_quotation_main: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'customer_id', type: 'INTEGER', references: 'tbl_customer(id)' },
      { name: 'quo_no', type: 'TEXT', notNull: true },
      { name: 'checklist_no', type: 'TEXT' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'sub_total', type: 'INTEGER', default: '0' },
      { name: 'amount_due', type: 'INTEGER', default: '0' },
      { name: 'vat', type: 'INTEGER', default: '0' },
      { name: 'discount', type: 'INTEGER', default: '0' },
      { name: 'total', type: 'INTEGER', default: '0' },
      { name: 'per', type: 'INTEGER', default: '0' },
      { name: 'quo_date', type: 'TEXT' },
      { name: 'case_debit', type: 'TEXT' },
      { name: 'paid_amount', type: 'INTEGER', default: '0' },
      { name: 'balance', type: 'INTEGER', default: '0' },
      { name: 'no', type: 'TEXT' },
      { name: 'cr_dr', type: 'TEXT' },
      { name: 'identify', type: 'TEXT' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_quotation_cust ON tbl_quotation_main(customer_id)'],
  },

  tbl_quotation_sub: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'main_id', type: 'INTEGER', references: 'tbl_quotation_main(id)' },
      { name: 'qty', type: 'INTEGER', default: '0' },
      { name: 'product_id', type: 'INTEGER', references: 'tbl_product(id)' },
      { name: 'unit_price', type: 'INTEGER', default: '0' },
      { name: 'row_total', type: 'INTEGER', default: '0' },
      { name: 's_no', type: 'INTEGER', default: '0' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'is_deleted', type: 'INTEGER', default: '0' },
    ],
    indexes: [],
  },

  tbl_receipt: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'receipt_no', type: 'TEXT', notNull: true },
      { name: 'receipt_date', type: 'TEXT' },
      { name: 'customer_id', type: 'INTEGER', references: 'tbl_customer(id)' },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'due_amount', type: 'INTEGER', default: '0' },
      { name: 'amount_received', type: 'INTEGER', default: '0' },
      { name: 'cheque_no', type: 'TEXT' },
      { name: 'no', type: 'TEXT' },
      { name: 'balance', type: 'INTEGER', default: '0' },
      { name: 'cr_dr', type: 'TEXT' },
      { name: 'invoice_no', type: 'TEXT' },
      { name: 'pre_load', type: 'TEXT' },
      { name: 'cash', type: 'TEXT', default: "'0'" },
      { name: 'cheque', type: 'TEXT', default: "'0'" },
      { name: 'other', type: 'TEXT', default: "'0'" },
      { name: 'payment_mode', type: 'TEXT' },
      { name: 'bank_name', type: 'TEXT' },
      { name: 'invoice_reference', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_receipt_cust ON tbl_receipt(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_receipt_company ON tbl_receipt(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_receipt_date ON tbl_receipt(receipt_date)',
    ],
  },

  tbl_email: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
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
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_type ON tbl_email(template_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_email_identify ON tbl_email(identify)',
    ],
  },

  tbl_wa_template: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'template_name', type: 'TEXT', notNull: true },
      { name: 'template_id', type: 'TEXT', notNull: true },
      { name: 'body', type: 'TEXT' },
      { name: 'status', type: 'TEXT', default: "'PENDING'" },
      { name: 'created_at', type: 'TEXT', default: "(datetime('now'))" },
      { name: 'updated_at', type: 'TEXT', default: "(datetime('now'))" },
    ],
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_name ON tbl_wa_template(template_name)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_id ON tbl_wa_template(template_id)',
    ],
  },

  tbl_whatsapp: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'identify', type: 'TEXT', notNull: true },
      { name: 'content_sid', type: 'TEXT', notNull: true },
      { name: 'body', type: 'TEXT', notNull: true },
      { name: 'header_type', type: 'TEXT' },
      { name: 'header_url', type: 'TEXT' },
      { name: 'footer', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
    ],
    indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_identify ON tbl_whatsapp(identify)'],
  },

  tbl_whatsapp_settings: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'company_id', type: 'INTEGER', default: '1' },
      { name: 'phone_id', type: 'TEXT', notNull: true },
      { name: 'waba_id', type: 'TEXT', notNull: true },
      { name: 'access_token', type: 'TEXT', notNull: true },
      { name: 'display_name', type: 'TEXT' },
      { name: 'is_active', type: 'INTEGER', default: '1' },
    ],
    indexes: [],
  },

  tbl_whatsapp_log: {
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'identify', type: 'TEXT' },
      { name: 'recipient_phone', type: 'TEXT', notNull: true },
      { name: 'message_sid', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'error_code', type: 'TEXT' },
      { name: 'error_message', type: 'TEXT' },
      { name: 'sent_at', type: 'TEXT', default: "(datetime('now'))" },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_whatsapp_log_customer ON tbl_whatsapp_log(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_whatsapp_log_status ON tbl_whatsapp_log(status)',
    ],
  },
};

function buildColumnDef(col: ColumnDef): string {
  let def = `${col.name} ${col.type}`;
  if (col.primaryKey) def += ' PRIMARY KEY';
  if (col.notNull && !col.primaryKey) def += ' NOT NULL';
  if (col.references) def += ` REFERENCES ${col.references}`;
  if (col.default) def += ` DEFAULT ${col.default}`;
  return def;
}

function buildTableSQL(tableName: string, spec: TableSpec): string {
  const columnDefs = spec.columns.map(buildColumnDef).join(',\n  ');
  let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnDefs}`;

  if (spec.constraints?.length) {
    sql += `,\n  ${spec.constraints.join(',\n  ')}`;
  }

  sql += '\n)';
  return sql;
}

export const SCHEMA_STATEMENTS: string[] = (() => {
  const statements: string[] = [];

  for (const [tableName, spec] of Object.entries(TABLES)) {
    statements.push(buildTableSQL(tableName, spec));
  }

  for (const spec of Object.values(TABLES)) {
    if (spec.indexes?.length) {
      statements.push(...spec.indexes);
    }
  }

  return statements;
})();

export type RequiredColumns = Record<string, { name: string; type: string }[]>;

function buildRequiredColumnType(col: ColumnDef): string {
  let type = col.type;
  if (col.notNull && !col.primaryKey) type += ' NOT NULL';
  if (col.default) type += ` DEFAULT ${col.default}`;
  return type;
}

export const REQUIRED_COLUMNS: RequiredColumns = (() => {
  const result: RequiredColumns = {};

  for (const [tableName, spec] of Object.entries(TABLES)) {
    result[tableName] = spec.columns
      .filter((col) => !col.primaryKey)
      .map((col) => ({
        name: col.name,
        type: buildRequiredColumnType(col),
      }));
  }

  return result;
})();
