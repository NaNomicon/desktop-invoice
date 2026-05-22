-- XPress Billing SQLite Schema
-- Money fields: INTEGER cents (e.g., 125000 = $1,250.00)
-- Date fields: TEXT ISO 8601 (YYYY-MM-DD)

-- tbl_company
CREATE TABLE IF NOT EXISTS tbl_company (
    id INTEGER PRIMARY KEY,
    company_name TEXT,
    contact_person TEXT,
    address TEXT,
    telephone TEXT,
    email TEXT,
    brn TEXT,
    vat TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    logo TEXT,
    watermark TEXT,
    is_active INTEGER DEFAULT 1
);

-- tbl_user
CREATE TABLE IF NOT EXISTS tbl_user (
    id INTEGER PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    des TEXT,
    company_id INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
);

-- tbl_setting
CREATE TABLE IF NOT EXISTS tbl_setting (
    id INTEGER PRIMARY KEY,
    isvat INTEGER DEFAULT 0,
    vat_per INTEGER DEFAULT 0,
    invoice_days TEXT,
    invoice_path TEXT,
    quo_path TEXT,
    report_path TEXT,
    back_path TEXT,
    backup_path TEXT,
    cash TEXT,
    cheque TEXT,
    other TEXT
);

-- tbl_numbers
CREATE TABLE IF NOT EXISTS tbl_numbers (
    id INTEGER PRIMARY KEY,
    invoice_no INTEGER DEFAULT 1,
    quo_no INTEGER DEFAULT 1,
    receipt_no INTEGER DEFAULT 1
);

-- tbl_product_type
CREATE TABLE IF NOT EXISTS tbl_product_type (
    id INTEGER PRIMARY KEY,
    type_name TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- tbl_customer
CREATE TABLE IF NOT EXISTS tbl_customer (
    id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    contact TEXT,
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

CREATE INDEX idx_customer_name ON tbl_customer(customer_name);

-- tbl_product
CREATE TABLE IF NOT EXISTS tbl_product (
    id INTEGER PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    type_id INTEGER REFERENCES tbl_product_type(id),
    company_id INTEGER DEFAULT 1,
    price INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_product_type ON tbl_product(type_id);
CREATE INDEX idx_product_company ON tbl_product(company_id);

-- tbl_invoice_main
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

CREATE INDEX idx_invoice_cust ON tbl_invoice_main(customer_id);
CREATE INDEX idx_invoice_company ON tbl_invoice_main(company_id);
CREATE INDEX idx_invoice_date ON tbl_invoice_main(invoice_date);

-- tbl_invoice_sub
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

-- tbl_quotation_main
CREATE TABLE IF NOT EXISTS tbl_quotation_main (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES tbl_customer(id),
    quo_no TEXT NOT NULL,
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

-- tbl_quotation_sub
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

-- tbl_receipt
CREATE TABLE IF NOT EXISTS tbl_receipt (
    id INTEGER PRIMARY KEY,
    receipt_no TEXT NOT NULL,
    customer_id INTEGER REFERENCES tbl_customer(id),
    amount_received INTEGER DEFAULT 0,
    payment_mode TEXT,
    cheque_no TEXT,
    bank_name TEXT,
    invoice_reference TEXT,
    cr_dr TEXT,
    receipt_date TEXT,
    notes TEXT,
    company_id INTEGER DEFAULT 1
);

CREATE INDEX idx_receipt_cust ON tbl_receipt(customer_id);

-- tbl_email
CREATE TABLE IF NOT EXISTS tbl_email (
    id INTEGER PRIMARY KEY,
    template_type TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    sender_email TEXT,
    sender_pass TEXT
);