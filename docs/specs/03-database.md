# Database Schema — SQLite

## Purpose

Complete SQLite schema for the Tauri app. Replicated from the original SQL Server schema with type conversions documented.

> **Money fields**: All monetary values stored as `INTEGER` (cents) to avoid floating-point precision loss. E.g., `$1,250.00` = `125000`.
>
> **Date fields**: All dates stored as `TEXT` in ISO 8601 format (`YYYY-MM-DD`).

---

## Core Tables

### tbl_company

```sql
CREATE TABLE tbl_company (
    id INTEGER PRIMARY KEY,
    company_name TEXT,
    company_short_name TEXT,
    company_code TEXT,
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
    logo TEXT,          -- base64 encoded IMAGE from SQL Server
    watermark TEXT,    -- base64 encoded IMAGE from SQL Server
    is_active INTEGER DEFAULT 1
);
```

**Existing company:** ID=1, X-Press Ironing Ltd (XPI). ID=2 (XPW, X-Press Wash) planned for future.

---

### tbl_customer

```sql
CREATE TABLE tbl_customer (
    id INTEGER PRIMARY KEY,
    customer_name TEXT,
    contact TEXT,
    customer_type TEXT,
    telephone TEXT,
    address TEXT,
    email TEXT,
    due_amount INTEGER DEFAULT 0,  -- cents
    title_name TEXT,
    reg_date TEXT,                  -- ISO 8601
    ad_due TEXT DEFAULT 'Advance',
    brn TEXT,
    vat TEXT
);
```

**Notes:**
- Customers are SHARED across companies
- `due_amount` is company-agnostic (one balance per customer)
- `telephone` used for WhatsApp delivery

---

## Reference Tables

### tbl_user

```sql
CREATE TABLE tbl_user (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    password TEXT,
    des TEXT
);
```

**Default:** `user_id='ADMIN'`, `password='admin'`

---

### tbl_setting

```sql
CREATE TABLE tbl_setting (
    id INTEGER PRIMARY KEY,
    isvat INTEGER,
    vat_per INTEGER,
    invoice_path TEXT,
    quo_path TEXT,
    report_path TEXT,
    invoice_days TEXT,
    back_path TEXT,
    backup_path TEXT,
    cash TEXT,
    cheque TEXT,
    other TEXT
);
```

**Default:** `isvat=1`, `vat_per=5`

---

### tbl_numbers

```sql
CREATE TABLE tbl_numbers (
    id INTEGER PRIMARY KEY,
    invoice_no INTEGER DEFAULT 1,
    quo_no INTEGER DEFAULT 1,
    receipt_no INTEGER DEFAULT 1
);
```

---

### tbl_product_type

```sql
CREATE TABLE tbl_product_type (
    id INTEGER PRIMARY KEY,
    type_name TEXT
);
```

**Types:** Resi, Dryclean, Ironing, Bank, Hotel, Corporate, + others (~26 total).

---

### tbl_product

```sql
CREATE TABLE tbl_product (
    id INTEGER PRIMARY KEY,
    product_id TEXT,
    product_name TEXT,
    type_id INTEGER,
    company_id INTEGER DEFAULT 1,
    price INTEGER  -- cents
);
```

**Note:** Each product belongs to exactly one company via `company_id`.

---

## Transaction Tables

### tbl_invoice_main

```sql
CREATE TABLE tbl_invoice_main (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    invoice_no TEXT,
    checklist_no TEXT,
    company_id INTEGER DEFAULT 1,
    sub_total INTEGER,     -- cents
    amount_due INTEGER,    -- cents
    vat INTEGER,           -- cents
    discount INTEGER,       -- cents
    total INTEGER,         -- cents
    per INTEGER,
    invoice_date TEXT,     -- ISO 8601
    case_debit TEXT,      -- 'Due' or 'Advance'
    paid_amount INTEGER,   -- cents
    balance INTEGER,       -- cents
    no TEXT,
    cr_dr TEXT,
    identify TEXT,
    print_due TEXT
);

CREATE INDEX idx_invoice_cust ON tbl_invoice_main(customer_id);
CREATE INDEX idx_invoice_company ON tbl_invoice_main(company_id);
CREATE INDEX idx_invoice_date ON tbl_invoice_main(invoice_date);
```

---

### tbl_invoice_sub

```sql
CREATE TABLE tbl_invoice_sub (
    id INTEGER PRIMARY KEY,
    main_id INTEGER,       -- FK to tbl_invoice_main.id
    qty INTEGER,
    product_id INTEGER,
    unit_price INTEGER,    -- cents
    row_total INTEGER,     -- cents
    s_no INTEGER
);

CREATE INDEX idx_invoice_sub_main ON tbl_invoice_sub(main_id);
```

---

### tbl_quotation_main

```sql
CREATE TABLE tbl_quotation_main (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    quo_no TEXT,
    checklist_no TEXT,
    company_id INTEGER DEFAULT 1,
    sub_total INTEGER,     -- cents
    amount_due INTEGER,    -- cents
    vat INTEGER,           -- cents
    discount INTEGER,      -- cents
    total INTEGER,         -- cents
    per INTEGER,
    quo_date TEXT          -- ISO 8601
);

CREATE INDEX idx_quotation_cust ON tbl_quotation_main(customer_id);
```

---

### tbl_quotation_sub

```sql
CREATE TABLE tbl_quotation_sub (
    id INTEGER PRIMARY KEY,
    main_id INTEGER,
    qty INTEGER,
    product_id INTEGER,
    unit_price INTEGER,    -- cents
    row_total INTEGER,     -- cents
    s_no INTEGER
);
```

---

### tbl_receipt

```sql
CREATE TABLE tbl_receipt (
    id INTEGER PRIMARY KEY,
    receipt_no TEXT,
    receipt_date TEXT,        -- ISO 8601
    customer_id INTEGER,
    company_id INTEGER DEFAULT 1,
    due_amount INTEGER,        -- cents
    amount_received INTEGER,   -- cents
    cheque_no TEXT,
    no TEXT,
    balance INTEGER,           -- cents
    cr_dr TEXT,
    invoice_no TEXT,
    pre_load TEXT,
    cash TEXT DEFAULT '0',
    cheque TEXT DEFAULT '0',
    other TEXT DEFAULT '0'
);

CREATE INDEX idx_receipt_cust ON tbl_receipt(customer_id);
CREATE INDEX idx_receipt_company ON tbl_receipt(company_id);
```

---

## Communication Tables

### tbl_email

```sql
CREATE TABLE tbl_email (
    id INTEGER PRIMARY KEY,
    client_email TEXT,
    sender TEXT,
    subject TEXT,
    body TEXT,
    sender_pass TEXT,
    identify TEXT,    -- INVOICE, QUOTATION, STATEMENT, RECEIPT
    sub_subject TEXT
);
```

---

### tbl_whatsapp

```sql
CREATE TABLE tbl_whatsapp (
    id INTEGER PRIMARY KEY,
    identify TEXT NOT NULL,      -- INVOICE, QUOTATION, STATEMENT, RECEIPT
    content_sid TEXT NOT NULL,    -- Meta template ID (HX...)
    body TEXT NOT NULL,            -- Template body with {{1}} placeholders
    header_type TEXT,              -- TEXT, IMAGE, VIDEO, DOCUMENT
    header_url TEXT,              -- URL for media header
    footer TEXT,                  -- Footer text
    status TEXT                   -- active, paused, rejected
);
```

---

### tbl_whatsapp_settings

```sql
CREATE TABLE tbl_whatsapp_settings (
    id INTEGER PRIMARY KEY,
    company_id INTEGER DEFAULT 1,
    phone_id TEXT NOT NULL,       -- Meta Phone Number ID
    waba_id TEXT NOT NULL,        -- WhatsApp Business Account ID
    access_token TEXT NOT NULL,   -- Permanent access token
    display_name TEXT,
    is_active INTEGER DEFAULT 1
);
```

---

### tbl_whatsapp_log

```sql
CREATE TABLE tbl_whatsapp_log (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    identify TEXT,                -- INVOICE, QUOTATION, etc.
    recipient_phone TEXT NOT NULL,
    message_sid TEXT,             -- Meta message SID
    status TEXT,                  -- queued, sent, delivered, read, failed
    error_code TEXT,
    error_message TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
);
```

---

## Data Volume (Migrated)

| Table | Rows | Data size |
|-------|------|-----------|
| `tbl_company` | 1 | ~1KB |
| `tbl_customer` | 2,519 | ~500KB |
| `tbl_user` | 1 | ~100B |
| `tbl_setting` | 1 | ~200B |
| `tbl_numbers` | 1 | ~100B |
| `tbl_product_type` | 26 | ~500B |
| `tbl_product` | 1,077 | ~100KB |
| `tbl_email` | 4 | ~2KB |
| `tbl_invoice_main` | 7,199 | ~2MB |
| `tbl_invoice_sub` | 22,137 | ~3MB |
| `tbl_quotation_main` | 241 | ~50KB |
| `tbl_quotation_sub` | 820 | ~100KB |
| `tbl_receipt` | 5,404 | ~1MB |
| **Total** | **~39,430** | **~7-8MB** |

---

## Migration Type Map

| SQL Server Type | SQLite Type | Example |
|----------------|-------------|---------|
| `BIGINT IDENTITY` | `INTEGER PRIMARY KEY` | Auto-increment |
| `NUMERIC(18,2)` | `INTEGER` (cents) | `17165626.70` → `1716562670` |
| `VARCHAR(n)` | `TEXT` | Direct |
| `VARCHAR(MAX)` | `TEXT` | No length limit |
| `DATE` | `TEXT` | `2026-05-21` |
| `BIT` | `INTEGER` | `0` / `1` |
| `IMAGE` | `TEXT` (base64) | `base64(blob)` |
| `BIGINT` | `INTEGER` | Direct |

---

## Indexes Summary

```sql
CREATE INDEX idx_invoice_cust ON tbl_invoice_main(customer_id);
CREATE INDEX idx_invoice_company ON tbl_invoice_main(company_id);
CREATE INDEX idx_invoice_date ON tbl_invoice_main(invoice_date);
CREATE INDEX idx_invoice_sub_main ON tbl_invoice_sub(main_id);
CREATE INDEX idx_receipt_cust ON tbl_receipt(customer_id);
CREATE INDEX idx_receipt_company ON tbl_receipt(company_id);
CREATE INDEX idx_product_company ON tbl_product(company_id);
CREATE INDEX idx_quotation_cust ON tbl_quotation_main(customer_id);
```

---

## Relationships

```
tbl_company (1) ────── (∞) tbl_product
                       ────── (∞) tbl_invoice_main
                       ────── (∞) tbl_quotation_main
                       ────── (∞) tbl_receipt

tbl_customer (1) ──┬── (∞) tbl_invoice_main
                    ├── (∞) tbl_quotation_main
                    └── (∞) tbl_receipt

tbl_product_type (1) ─── (∞) tbl_product
                            ├── (∞) tbl_invoice_sub
                            └── (∞) tbl_quotation_sub

tbl_invoice_main (1) ─── (∞) tbl_invoice_sub
tbl_quotation_main (1) ─── (∞) tbl_quotation_sub
```