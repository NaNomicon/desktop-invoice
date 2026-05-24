CREATE TABLE IF NOT EXISTS tbl_company (
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
);

CREATE TABLE IF NOT EXISTS tbl_user (
    id INTEGER PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    des TEXT,
    company_id INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tbl_setting (
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
);

CREATE TABLE IF NOT EXISTS tbl_numbers (
    id INTEGER PRIMARY KEY,
    invoice_no INTEGER DEFAULT 1,
    quo_no INTEGER DEFAULT 1,
    receipt_no INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tbl_product_type (
    id INTEGER PRIMARY KEY,
    type_name TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tbl_customer (
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
);

CREATE INDEX IF NOT EXISTS idx_customer_name ON tbl_customer(customer_name);

CREATE TABLE IF NOT EXISTS tbl_product (
    id INTEGER PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    type_id INTEGER REFERENCES tbl_product_type(id),
    company_id INTEGER DEFAULT 1,
    price INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_type ON tbl_product(type_id);
CREATE INDEX IF NOT EXISTS idx_product_company ON tbl_product(company_id);

CREATE TABLE IF NOT EXISTS tbl_invoice_main (
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
);

CREATE INDEX IF NOT EXISTS idx_invoice_cust ON tbl_invoice_main(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_company ON tbl_invoice_main(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON tbl_invoice_main(invoice_date);

CREATE TABLE IF NOT EXISTS tbl_invoice_sub (
    id INTEGER PRIMARY KEY,
    main_id INTEGER REFERENCES tbl_invoice_main(id),
    qty INTEGER DEFAULT 0,
    product_id INTEGER REFERENCES tbl_product(id),
    unit_price INTEGER DEFAULT 0,
    row_total INTEGER DEFAULT 0,
    s_no INTEGER DEFAULT 0,
    company_id INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_sub_main ON tbl_invoice_sub(main_id);

CREATE TABLE IF NOT EXISTS tbl_quotation_main (
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
);

CREATE INDEX IF NOT EXISTS idx_quotation_cust ON tbl_quotation_main(customer_id);

CREATE TABLE IF NOT EXISTS tbl_quotation_sub (
    id INTEGER PRIMARY KEY,
    main_id INTEGER REFERENCES tbl_quotation_main(id),
    qty INTEGER DEFAULT 0,
    product_id INTEGER REFERENCES tbl_product(id),
    unit_price INTEGER DEFAULT 0,
    row_total INTEGER DEFAULT 0,
    s_no INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tbl_receipt (
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
);

CREATE INDEX IF NOT EXISTS idx_receipt_cust ON tbl_receipt(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipt_company ON tbl_receipt(company_id);
CREATE INDEX IF NOT EXISTS idx_receipt_date ON tbl_receipt(receipt_date);

CREATE TABLE IF NOT EXISTS tbl_email (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_type ON tbl_email(template_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_identify ON tbl_email(identify);

CREATE TABLE IF NOT EXISTS tbl_wa_template (
    id INTEGER PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_id TEXT NOT NULL,
    body TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_name ON tbl_wa_template(template_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_id ON tbl_wa_template(template_id);

CREATE TABLE IF NOT EXISTS tbl_whatsapp (
    id INTEGER PRIMARY KEY,
    identify TEXT NOT NULL,
    content_sid TEXT NOT NULL,
    body TEXT NOT NULL,
    header_type TEXT,
    header_url TEXT,
    footer TEXT,
    status TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_identify ON tbl_whatsapp(identify);

CREATE TABLE IF NOT EXISTS tbl_whatsapp_settings (
    id INTEGER PRIMARY KEY,
    company_id INTEGER DEFAULT 1,
    phone_id TEXT NOT NULL,
    waba_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    display_name TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tbl_whatsapp_log (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    identify TEXT,
    recipient_phone TEXT NOT NULL,
    message_sid TEXT,
    status TEXT,
    error_code TEXT,
    error_message TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_customer ON tbl_whatsapp_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_status ON tbl_whatsapp_log(status);
