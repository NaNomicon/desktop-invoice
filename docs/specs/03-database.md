# Database Schema — Complete Reference

## Purpose

Complete database schema documentation for replication.

> **Multi-Company Support:** Tables `tbl_invoice_main`, `tbl_quotation_main`, `tbl_receipt`, and `tbl_company` now include `company_id` for multi-company transactions.

---

## Core Tables

### tbl_company

Multi-company support: Can have multiple rows, each representing a separate company entity.

```sql
CREATE TABLE tbl_company (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    company_name VARCHAR(MAX),           -- Full name: "X-Press Ironing Ltd"
    company_short_name VARCHAR(100),     -- Short name: "X-Press Ironing"
    company_code VARCHAR(50),            -- 'XPI', 'XPW' for identification
    address VARCHAR(MAX),
    city VARCHAR(500),
    telephone VARCHAR(100),
    email VARCHAR(200),
    facebook_url VARCHAR(MAX),
    brn VARCHAR(150),
    vat VARCHAR(150),
    note1 VARCHAR(MAX),
    note2 VARCHAR(MAX),
    note3 VARCHAR(MAX),
    thanks1 VARCHAR(MAX),
    thanks2 VARCHAR(MAX),
    currency VARCHAR(50),
    logo IMAGE,
    watermark IMAGE,
    is_active BIT DEFAULT 1             -- Multi-company: soft disable
)
```

**Multi-Company Notes:**
- No longer singleton — multiple companies can exist
- Use `company_code` for quick identification (XPI, XPW)
- Use `is_active` to soft-disable companies
- Reports filter by `company_id` on transaction tables

**Existing Companies:**
| ID | company_name | company_code | Purpose |
|----|--------------|--------------|---------|
| 1 | X-Press Ironing Ltd | XPI | Ironing services (existing) |
| 2 | X-Press Wash | XPW | Wash services (future) |

---

### tbl_customer

```sql
CREATE TABLE tbl_customer (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_name VARCHAR(MAX),
    contact VARCHAR(MAX),
    customer_type VARCHAR(100),
    telephone VARCHAR(50),
    address VARCHAR(MAX),
    email VARCHAR(200),
    due_amount NUMERIC(18,2) DEFAULT 0,
    title_name VARCHAR(50),
    reg_date DATE,
    ad_due VARCHAR(100) DEFAULT 'Advance',
    brn VARCHAR(100),
    vat VARCHAR(100)
)
```

**Notes:**
- Customers are SHARED across companies
- `due_amount` is company-agnostic (one balance per customer)
- If company-specific balances are needed, add `company_id` and separate tracking

---

### tbl_product

```sql
CREATE TABLE tbl_product (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    product_id VARCHAR(200),
    product_name VARCHAR(MAX),
    type_id BIGINT,
    price NUMERIC(18,2)
)
```

---

### tbl_product_type

```sql
CREATE TABLE tbl_product_type (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    type_name VARCHAR(150)
)
```

**Note:** Product types are customer SEGMENTS (Resi, Dryclean, Ironing, Bank, Hotel, Corporate), NOT service types. All types are shared across companies.

---

### tbl_user

```sql
CREATE TABLE tbl_user (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id VARCHAR(500),
    password VARCHAR(500),
    des VARCHAR(500)
)
```

**Default user:** ADMIN / admin (des = NULL)

---

## Transaction Tables

### tbl_invoice_main

**Multi-Company:** `company_id` column added.

```sql
CREATE TABLE tbl_invoice_main (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_id BIGINT,
    invoice_no VARCHAR(200),
    checklist_no VARCHAR(200),
    company_id BIGINT DEFAULT 1,           -- Multi-company support
    sub_total NUMERIC(18,2),
    amount_due NUMERIC(18,2),
    vat NUMERIC(18,2),
    discount NUMERIC(18,2),
    total NUMERIC(18,2),
    per NUMERIC(18,0),
    invoice_date DATE,
    case_debit VARCHAR(50),
    paid_amount NUMERIC(18,2),
    balance NUMERIC(18,2),
    no VARCHAR(MAX),
    cr_dr VARCHAR(50),
    identify VARCHAR(50),
    print_due VARCHAR(10)
)
```

**Key fields:**
- `company_id`: Links to `tbl_company.ID` for branding
- `case_debit`: "CASH" (partial payment) or "CREDIT" (full amount)
- `cr_dr`: "Cr." = added to receivable, "Dr." = subtracted
- `identify`: Due/Advance (status)
- `no`: Unix timestamp for chronological ordering

---

### tbl_invoice_sub

```sql
CREATE TABLE tbl_invoice_sub (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    main_id BIGINT,
    qty NUMERIC(18,0),
    product_id BIGINT,
    unit_price NUMERIC(18,2),
    row_total NUMERIC(18,2),
    s_no NUMERIC(18,0)
)
```

**Note:** Line items inherit `company_id` from parent `tbl_invoice_main`.

---

### tbl_quotation_main

**Multi-Company:** `company_id` column added.

```sql
CREATE TABLE tbl_quotation_main (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_id BIGINT,
    quo_no VARCHAR(200),
    checklist_no VARCHAR(200),
    company_id BIGINT DEFAULT 1,           -- Multi-company support
    sub_total NUMERIC(18,2),
    amount_due NUMERIC(18,2),
    vat NUMERIC(18,2),
    discount NUMERIC(18,2),
    total NUMERIC(18,2),
    per NUMERIC(18,0),
    quo_date DATE
)
```

---

### tbl_quotation_sub

```sql
CREATE TABLE tbl_quotation_sub (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    main_id BIGINT,
    qty NUMERIC(18,0),
    product_id BIGINT,
    unit_price NUMERIC(18,2),
    row_total NUMERIC(18,2),
    s_no NUMERIC(18,0)
)
```

---

### tbl_receipt

**Multi-Company:** `company_id` column added.

```sql
CREATE TABLE tbl_receipt (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    receipt_no VARCHAR(50),
    receipt_date DATE,
    customer_id BIGINT,
    company_id BIGINT DEFAULT 1,           -- Multi-company support
    due_amount NUMERIC(18,2),
    amount_received NUMERIC(18,2),
    cheque_no VARCHAR(200),
    no VARCHAR(MAX),
    balance NUMERIC(18,2),
    cr_dr VARCHAR(100),
    invoice_no VARCHAR(100),
    pre_load VARCHAR(100),
    cash VARCHAR(100) DEFAULT '0',
    cheque VARCHAR(100) DEFAULT '0',
    other VARCHAR(100) DEFAULT '0'
)
```

---

## Configuration Tables

### tbl_numbers

```sql
CREATE TABLE tbl_numbers (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    invoice_no NUMERIC(18,0) DEFAULT 1,
    quo_no NUMERIC(18,0) DEFAULT 1,
    receipt_no NUMERIC(18,0) DEFAULT 1
)
```

**Numbering Strategy:** Shared across companies (single sequence per type).

If separate numbering per company is needed:
```sql
ALTER TABLE tbl_numbers ADD invoice_no_xpi BIGINT DEFAULT 1
ALTER TABLE tbl_numbers ADD invoice_no_xpw BIGINT DEFAULT 1
```

---

### tbl_setting

```sql
CREATE TABLE tbl_setting (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    isvat NUMERIC(18,0),
    vat_per NUMERIC(18,0),
    invoice_path VARCHAR(MAX),
    quo_path VARCHAR(MAX),
    report_path VARCHAR(MAX),
    invoice_days VARCHAR(100),
    back_path VARCHAR(MAX),
    backup_path VARCHAR(MAX),
    cash VARCHAR(MAX),
    cheque VARCHAR(MAX),
    other VARCHAR(MAX)
)
```

---

### tbl_email

```sql
CREATE TABLE tbl_email (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    client_email VARCHAR(500),
    sender VARCHAR(500),
    subject VARCHAR(500),
    body VARCHAR(MAX),
    sender_pass VARCHAR(100),
    identify VARCHAR(100),
    sub_subject VARCHAR(MAX)
)
```

---

## Relationships

```
tbl_company (1) ────── (∞) tbl_invoice_main
                      ────── (∞) tbl_quotation_main
                      ────── (∞) tbl_receipt

tbl_customer (1) ──┬── (∞) tbl_invoice_main
                  ├── (∞) tbl_quotation_main
                  └── (∞) tbl_receipt

tbl_product_type (1) ─── (∞) tbl_product
                           │
                           └── (∞) tbl_invoice_sub
                           └── (∞) tbl_quotation_sub

tbl_user (1) ───── Not referenced by other tables
```

**Multi-Company Relationship Note:**
- Each transaction (invoice/quotation/receipt) belongs to ONE company
- Customers are shared across all companies
- Products and product types are shared

---

## Indexes

No explicit indexes defined. Implicit indexes on:
- `ID` (PK, clustered)
- `invoice_no`, `quo_no`, `receipt_no` (unique per table)
- `customer_id` (foreign keys)
- `company_id` (new, for filtering)

**For replication:** Add indexes on:
- `tbl_customer.customer_name`
- `tbl_product.product_name`
- `tbl_invoice_main.invoice_date`
- `tbl_invoice_main.company_id` (multi-company filtering)
- `tbl_receipt.receipt_date`

---

## Cascading

**No foreign key constraints with CASCADE DELETE.**

Deleting a customer does NOT automatically delete invoices/receipts. Must delete child records first:

```vb
SQL_Delete("tbl_invoice_main", "customer_id=" & customer_id)
SQL_Delete("tbl_receipt", "customer_id=" & customer_id)
SQL_Delete("tbl_customer", "id=" & customer_id)
```

**For replication:** Consider adding FK constraints for data integrity.

---

## Multi-Company Migration Script

```sql
-- 1. Add new columns to tbl_company
ALTER TABLE tbl_company ADD company_code VARCHAR(50)
ALTER TABLE tbl_company ADD company_short_name VARCHAR(100)
ALTER TABLE tbl_company ADD is_active BIT DEFAULT 1

-- 2. Update existing company record
UPDATE tbl_company SET 
    company_code = 'XPI',
    company_short_name = 'X-Press Ironing',
    is_active = 1
WHERE ID = 1

-- 3. Add company_id to transaction tables
ALTER TABLE tbl_invoice_main ADD company_id BIGINT DEFAULT 1
ALTER TABLE tbl_quotation_main ADD company_id BIGINT DEFAULT 1
ALTER TABLE tbl_receipt ADD company_id BIGINT DEFAULT 1

-- 4. Set default company for existing records
UPDATE tbl_invoice_main SET company_id = 1 WHERE company_id IS NULL
UPDATE tbl_quotation_main SET company_id = 1 WHERE company_id IS NULL
UPDATE tbl_receipt SET company_id = 1 WHERE company_id IS NULL

-- 5. Insert new company (when ready)
-- INSERT INTO tbl_company (company_name, company_short_name, company_code, is_active)
-- VALUES ('X-Press Wash', 'X-Press Wash', 'XPW', 1)
```

---

## CRITICAL FUNCTIONS

### GetDueAmount() — Customer Balance Calculation

**Location:** `SQL_CRUD.vb` (lines 288-313)

**Purpose:** Calculates customer's outstanding balance using invoice totals minus receipts.

**Formula:**
```
FinalDueAmount = SUM(tbl_invoice_main.total) - SUM(tbl_receipt.amount_received)
```

**SQL Query:**
```sql
SELECT
    customer_id,
    SUM(total) AS TotalDueAmount,
    (
        SELECT SUM(r.amount_received)
        FROM tbl_receipt r
        WHERE r.customer_id = i.customer_id
    ) AS TotalReceived,
    (
        SUM(total) -
        COALESCE((
            SELECT SUM(r.amount_received)
            FROM tbl_receipt r
            WHERE r.customer_id = i.customer_id
        ), 0)
    ) AS FinalDueAmount
FROM 
    tbl_invoice_main i
WHERE 
    customer_id = @customer_id
GROUP BY 
    customer_id
```

**Key patterns:**
- Correlated subquery for receipts (joins on `customer_id`)
- `COALESCE(..., 0)` handles NULL when no receipts exist
- Returns `Format(value, "0.00")` — always 2 decimal places
- Returns `0` if customer has no invoices

**VB Implementation:**
```vb
Public Function GetDueAmount(CustomerId As Long) As Double
    Dim ds1 As DataSet = SQL_Query(query)
    If ds1.Tables(0).Rows.Count > 0 Then
        Return Format(Val(ds1.Tables(0).Rows(0).Item("FinalDueAmount").ToString), "0.00")
    Else
        Return 0
    End If
End Function
```

**Used by:** Customer form — updates `tbl_customer.due_amount` field on invoice/receipt operations.

---

### auto_field() — Schema Migration & Initialization

**Location:** `Module1.vb` (lines 127-579)

**Purpose:** Called on every app startup. Creates tables if missing, adds columns for schema evolution, initializes default records.

**Multi-Company Additions:**
```vb
' Add company columns if missing
IF COL_LENGTH('tbl_company', 'company_code') IS NULL
    ALTER TABLE tbl_company ADD [company_code] VARCHAR(50)
IF COL_LENGTH('tbl_company', 'company_short_name') IS NULL
    ALTER TABLE tbl_company ADD [company_short_name] VARCHAR(100)
IF COL_LENGTH('tbl_company', 'is_active') IS NULL
    ALTER TABLE tbl_company ADD [is_active] BIT DEFAULT 1

' Add company_id to transaction tables if missing
IF COL_LENGTH('tbl_invoice_main', 'company_id') IS NULL
    ALTER TABLE tbl_invoice_main ADD [company_id] BIGINT DEFAULT 1
IF COL_LENGTH('tbl_quotation_main', 'company_id') IS NULL
    ALTER TABLE tbl_quotation_main ADD [company_id] BIGINT DEFAULT 1
IF COL_LENGTH('tbl_receipt', 'company_id') IS NULL
    ALTER TABLE tbl_receipt ADD [company_id] BIGINT DEFAULT 1

' Initialize existing company record
UPDATE tbl_company SET 
    company_code = 'XPI',
    company_short_name = 'X-Press Ironing',
    is_active = 1
WHERE ID = (SELECT MAX(ID) FROM tbl_company) AND company_code IS NULL
```

**Tables Created:**
| Order | Table | Key Columns Added |
|-------|-------|------------------|
| 1 | tbl_company | company_name, address, city, telephone, email, logo, watermark, company_code, company_short_name, is_active |
| 2 | tbl_customer | customer_name, contact, due_amount, ad_due |
| 3 | tbl_invoice_main | invoice_no, total, case_debit, cr_dr, identify, company_id |
| 4 | tbl_quotation_sub | main_id, qty, product_id, unit_price |
| 5 | tbl_numbers | invoice_no, quo_no, receipt_no |
| 6 | tbl_product | product_id, product_name, price |
| 7 | tbl_product_type | type_name |
| 8 | tbl_setting | isvat, vat_per, invoice_path, backup paths |
| 9 | tbl_invoice_sub | main_id, qty, unit_price |
| 10 | tbl_quotation_main | quo_no, total, quo_date, company_id |
| 11 | tbl_receipt | receipt_no, amount_received, cheque_no, cash/cheque/other, company_id |
| 12 | tbl_user | user_id, password, des |
| 13 | tbl_email | identify (INVOICE/QUOTATION/STATEMENT/RECEIPT) |

---

## Default Data

Created by `auto_field()` on first run:

| Table | Default Record |
|-------|---------------|
| tbl_user | user_id='ADMIN', password='admin' (des = NULL) |
| tbl_setting | isvat=1, vat_per=5 |
| tbl_numbers | invoice_no=1, quo_no=1, receipt_no=1 |
| tbl_email | INVOICE, QUOTATION, STATEMENT, RECEIPT |
| tbl_company | company_code='XPI', company_short_name='X-Press Ironing', is_active=1 |