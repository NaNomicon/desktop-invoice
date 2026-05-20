# Database Schema — Complete Reference

## Purpose
Complete database schema documentation for replication.

---

## Core Tables

### tbl_company
Single-row company profile for invoices/reports.

```sql
CREATE TABLE tbl_company (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    company_name VARCHAR(MAX),
    address VARCHAR(MAX),
    city VARCHAR(500),
    telephone VARCHAR(100),
    email VARCHAR(200),
    facebook_url VARCHAR(MAX),
    brn VARCHAR(150),           -- Business Registration Number
    vat VARCHAR(150),           -- VAT Number
    note1 VARCHAR(MAX),          -- Invoice footer line 1
    note2 VARCHAR(MAX),          -- Invoice footer line 2
    note3 VARCHAR(MAX),          -- Invoice footer line 3
    thanks1 VARCHAR(MAX),        -- Thank you message 1
    thanks2 VARCHAR(MAX),        -- Thank you message 2
    currency VARCHAR(50),       -- Default currency
    logo IMAGE,                  -- Company logo
    watermark IMAGE              -- Report watermark
)
```

**Note:** Only ONE record exists. Use `get_max_number("id", "tbl_company")`.

---

### tbl_customer

```sql
CREATE TABLE tbl_customer (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_name VARCHAR(MAX),
    contact VARCHAR(MAX),
    customer_type VARCHAR(100),  -- Individual/Corporate
    telephone VARCHAR(50),
    address VARCHAR(MAX),
    email VARCHAR(200),
    due_amount NUMERIC(18,2) DEFAULT 0,
    title_name VARCHAR(50),       -- Mr/Mrs/Ms/Dr
    reg_date DATE,
    ad_due VARCHAR(100) DEFAULT 'Advance',  -- Due/Advance/""
    brn VARCHAR(100),
    vat VARCHAR(100)
)
```

**Calculated Fields:**
- `due_amount`: Running balance (invoices - receipts)
- `ad_due`: Status ("Due" = owes us, "Advance" = we owe them, "" = settled)

---

### tbl_product

```sql
CREATE TABLE tbl_product (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    product_id VARCHAR(200),      -- SKU/Code
    product_name VARCHAR(MAX),
    type_id BIGINT,              -- FK to tbl_product_type
    price NUMERIC(18,2)          -- Default price
)
```

---

### tbl_product_type

```sql
CREATE TABLE tbl_product_type (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    type_name VARCHAR(150)       -- e.g., "Ironing", "Dry Cleaning"
)
```

---

### tbl_user

```sql
CREATE TABLE tbl_user (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    user_id VARCHAR(500),        -- Login name
    password VARCHAR(500),        -- Plain text ⚠️
    des VARCHAR(500)              -- Role: "admin" or "USER"
)
```

**Default user:** ADMIN / admin (des = NULL)

**Note:** Default INSERT in auto_field() only sets user_id and password. The `des` column is NOT initialized (remains NULL).

---

## Transaction Tables

### tbl_invoice_main

```sql
CREATE TABLE tbl_invoice_main (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_id BIGINT,            -- FK to tbl_customer
    invoice_no VARCHAR(200),
    checklist_no VARCHAR(200),
    sub_total NUMERIC(18,2),
    amount_due NUMERIC(18,2),
    vat NUMERIC(18,2),
    discount NUMERIC(18,2),
    total NUMERIC(18,2),
    per NUMERIC(18,0),           -- Discount percentage
    invoice_date DATE,
    case_debit VARCHAR(50),     -- CASH/CREDIT
    paid_amount NUMERIC(18,2),
    balance NUMERIC(18,2),
    no VARCHAR(MAX),              -- Timestamp for ordering
    cr_dr VARCHAR(50),          -- Cr./Dr. (direction)
    identify VARCHAR(50),         -- Due/Advance (status)
    print_due VARCHAR(10)        -- True/False
)
```

**Key fields:**
- `case_debit`: "CASH" (partial payment) or "CREDIT" (full amount)
- `cr_dr`: "Cr." = added to receivable, "Dr." = subtracted
- `identify`: Customer's prior status ("Due" or "Advance")
- `no`: Unix timestamp for chronological ordering

---

### tbl_invoice_sub

```sql
CREATE TABLE tbl_invoice_sub (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    main_id BIGINT,              -- FK to tbl_invoice_main
    qty NUMERIC(18,0),
    product_id BIGINT,            -- FK to tbl_product
    unit_price NUMERIC(18,2),
    row_total NUMERIC(18,2),
    s_no NUMERIC(18,0)           -- Line number for ordering
)
```

---

### tbl_quotation_main

```sql
CREATE TABLE tbl_quotation_main (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_id BIGINT,
    quo_no VARCHAR(200),
    checklist_no VARCHAR(200),
    sub_total NUMERIC(18,2),
    amount_due NUMERIC(18,2),
    vat NUMERIC(18,2),
    discount NUMERIC(18,2),
    total NUMERIC(18,2),
    per NUMERIC(18,0),
    quo_date DATE
    -- No cr_dr, identify, case_debit, paid_amount, balance
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

```sql
CREATE TABLE tbl_receipt (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    receipt_no VARCHAR(50),
    receipt_date DATE,
    customer_id BIGINT,
    due_amount NUMERIC(18,2),
    amount_received NUMERIC(18,2),
    cheque_no VARCHAR(200),
    no VARCHAR(MAX),            -- Timestamp
    balance NUMERIC(18,2),
    cr_dr VARCHAR(100),         -- Cr./Dr.
    invoice_no VARCHAR(100),
    pre_load VARCHAR(100),      -- Due/Advance (prior status)
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

**Note:** Single row, all sequences in one table.

---

### tbl_setting

```sql
CREATE TABLE tbl_setting (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    isvat NUMERIC(18,0),            -- 0=No VAT, 1=VAT
    vat_per NUMERIC(18,0),           -- e.g., 5 for 5%
    invoice_path VARCHAR(MAX),
    quo_path VARCHAR(MAX),
    report_path VARCHAR(MAX),
    invoice_days VARCHAR(100),       -- Edit lock days
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
    identify VARCHAR(100),            -- INVOICE/QUOTATION/STATEMENT/RECEIPT
    sub_subject VARCHAR(MAX)
)
```

---

## Relationships

```
tbl_company (1) ───── (∞) Not used anywhere
                    
tbl_customer (1) ──┬── (∞) tbl_invoice_main
                    ├── (∞) tbl_quotation_main  
                    └── (∞) tbl_receipt

tbl_product_type (1) ─── (∞) tbl_product
                             │
                             └── (∞) tbl_invoice_sub
                             └── (∞) tbl_quotation_sub

tbl_user (1) ───── Not referenced by other tables
```

---

## Indexes

No explicit indexes defined. Implicit indexes on:
- `ID` (PK, clustered)
- `invoice_no` (unique per table)
- `customer_id` (foreign keys)

**For replication:** Add indexes on:
- `tbl_customer.customer_name`
- `tbl_product.product_name`
- `tbl_invoice_main.invoice_date`
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

**Execution Flow:**
1. Create each table `IF NOT EXISTS`
2. Add each column `IF NOT EXISTS` (schema evolution)
3. Insert default records if tables are empty

**Tables Created:**
| Order | Table | Key Columns Added |
|-------|-------|------------------|
| 1 | tbl_company | company_name, address, city, telephone, email, logo, watermark |
| 2 | tbl_customer | customer_name, contact, due_amount, ad_due |
| 3 | tbl_invoice_main | invoice_no, total, case_debit, cr_dr, identify |
| 4 | tbl_quotation_sub | main_id, qty, product_id, unit_price |
| 5 | tbl_numbers | invoice_no, quo_no, receipt_no |
| 6 | tbl_product | product_id, product_name, price |
| 7 | tbl_product_type | type_name |
| 8 | tbl_setting | isvat, vat_per, invoice_path, backup paths |
| 9 | tbl_invoice_sub | main_id, qty, unit_price |
| 10 | tbl_quotation_main | quo_no, total, quo_date |
| 11 | tbl_receipt | receipt_no, amount_received, cheque_no, cash/cheque/other |
| 12 | tbl_user | user_id, password, des |
| 13 | tbl_email | identify (INVOICE/QUOTATION/STATEMENT/RECEIPT) |

**Table Creation Pattern:**
```sql
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_company')
    CREATE TABLE tbl_company ([ID] BIGINT IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID))
```

**Column Addition Pattern:**
```sql
IF COL_LENGTH('tbl_company', 'company_name') IS NULL
    ALTER TABLE tbl_company ADD [company_name] VARCHAR(MAX)
```

**Default Records Initialized:**
```vb
' tbl_numbers
INSERT INTO tbl_numbers (invoice_no, quo_no, receipt_no) VALUES (0, 0, 0)

' tbl_setting  
INSERT INTO tbl_setting (vat_per, isvat) VALUES (5, 1)

' tbl_user
INSERT INTO tbl_user (user_id, password) VALUES ('ADMIN', 'admin')

' tbl_email — one row per type
INSERT INTO tbl_email (identify) VALUES ('INVOICE')
INSERT INTO tbl_email (identify) VALUES ('QUOTATION')
INSERT INTO tbl_email (identify) VALUES ('STATEMENT')
INSERT INTO tbl_email (identify) VALUES ('RECEIPT')
```

**Migration Strategy Notes:**
- **Idempotent:** Safe to run multiple times — checks `IF NOT EXISTS`
- **Additive only:** Never drops columns or tables
- **Order matters:** Foreign key relationships assumed to exist in order
- **For replication:** Replace with proper migration framework (EF Core, Flyway)

---

## Default Data

Created by `auto_field()` on first run:

| Table | Default Record |
|-------|---------------|
| tbl_user | user_id='ADMIN', password='admin' (des = NULL) |
| tbl_setting | isvat=1, vat_per=5 |
| tbl_numbers | invoice_no=1, quo_no=1, receipt_no=1 |
| tbl_email | INVOICE, QUOTATION, STATEMENT, RECEIPT |