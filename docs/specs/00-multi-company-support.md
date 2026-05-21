# Multi-Company Support — Specification

## Overview

This document describes the multi-company support feature for the XPress billing application. The system supports two companies on the same database:

| Company | Code | Purpose |
|---------|------|---------|
| X-Press Ironing Ltd | XPI | Ironing services (existing) |
| X-Press Wash | XPW | Wash services (future/new) |

## Key Design Decisions

1. **Shared Resources**: Customers and numbering are shared across companies
2. **Company-Owned Products**: Each product belongs to exactly one company
3. **Single Entry Screen, Split Output**: One invoice entry screen can generate one or two company-specific invoices
4. **No Header Company Selector**: Users work from two product lists instead of selecting company first
5. **Company Derived From Item Buckets**: The system assigns invoice `company_id` from the product bucket being saved

---

## Database Changes

### tbl_company — Add Multi-Company Support

```sql
ALTER TABLE tbl_company ADD company_code VARCHAR(50)  -- e.g., 'XPI', 'XPW'
ALTER TABLE tbl_company ADD is_active BIT DEFAULT 1   -- soft disable
ALTER TABLE tbl_company ADD company_short_name VARCHAR(100)  -- "X-Press Ironing" vs full name
```

**Updated schema:**
```sql
CREATE TABLE tbl_company (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    company_name VARCHAR(MAX),
    company_short_name VARCHAR(100),
    company_code VARCHAR(50),
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
    is_active BIT DEFAULT 1
)
```

### tbl_product — Add Company Ownership

```sql
ALTER TABLE tbl_product ADD company_id BIGINT DEFAULT 1
ALTER TABLE tbl_product ADD CONSTRAINT FK_Product_Company
    FOREIGN KEY (company_id) REFERENCES tbl_company(ID)
```

### tbl_invoice_main — Add Company FK

```sql
ALTER TABLE tbl_invoice_main ADD company_id BIGINT DEFAULT 1
ALTER TABLE tbl_invoice_main ADD CONSTRAINT FK_InvoiceMain_Company
    FOREIGN KEY (company_id) REFERENCES tbl_company(ID)
```

### tbl_quotation_main — Add Company FK

```sql
ALTER TABLE tbl_quotation_main ADD company_id BIGINT DEFAULT 1
```

### tbl_receipt — Add Company FK

```sql
ALTER TABLE tbl_receipt ADD company_id BIGINT DEFAULT 1
```

---

## UI Changes

### Invoice Form (Add_Edit_Invoice)

**Replace one unified product picker with two company-specific product lists**.

**UI Layout:**
```text
+--------------------------------------------------------------+
| Customer: [ ABC Hotel ]                                      |
| Invoice No: [ 10234 ]    Checklist No: [ ____ ]              |
| Date: [ ____ ]          CASH / CREDIT                        |
+--------------------------------------------------------------+
| IRONING ITEMS                    | WASH ITEMS                |
|----------------------------------|---------------------------|
| Shirt Ironing                    | Wash & Fold 5kg           |
| Trouser Ironing                  | Blanket Wash              |
| Bed Sheet Pressing               | Curtain Wash              |
| ...                              | ...                       |
+--------------------------------------------------------------+
| IRONING LINE ITEMS                                           |
| 1. Shirt Ironing         10   25.00   250.00                 |
| 2. Trouser Ironing        5   30.00   150.00                 |
| Ironing subtotal:                           400.00           |
+--------------------------------------------------------------+
| WASH LINE ITEMS                                              |
| 1. Blanket Wash          2   100.00   200.00                 |
| 2. Curtain Wash          3    80.00   240.00                 |
| Wash subtotal:                              440.00           |
+--------------------------------------------------------------+
| Combined total:                             840.00           |
+--------------------------------------------------------------+
```

**Behavior:**
1. User stays on one entry screen
2. Products are shown in two separate lists: Ironing and Wash
3. Adding an item from a list puts it into that company bucket
4. On save:
   - if only Ironing bucket has items -> create one Ironing invoice
   - if only Wash bucket has items -> create one Wash invoice
   - if both buckets have items -> create two invoices automatically

**Product Queries:**
```sql
SELECT id, product_id, product_name, price
FROM tbl_product
WHERE company_id = 1
ORDER BY product_id
```

```sql
SELECT id, product_id, product_name, price
FROM tbl_product
WHERE company_id = 2
ORDER BY product_id
```

**Save Flow:**
```vb
' Pseudo-flow
If IroningGrid.Rows.Count > 0 Then
    CreateInvoiceForCompany(1, IroningGridRows)
End If

If WashGrid.Rows.Count > 0 Then
    CreateInvoiceForCompany(2, WashGridRows)
End If
```

### Quotation Form (Add_Edit_Quotation)

Same dual-list pattern as invoice.

- One quotation entry screen
- Separate Ironing and Wash product buckets
- Save generates one or two quotation records depending on which buckets contain items

### Receipt Form (Add_Edit_Receipt)

Receipt form does **not** need a company selector.

Receipt company is derived from the invoice/quotation being paid or from the selected transaction group.

---

## Split Save Rules

### Invoice Creation

```text
IF ironing bucket has items AND wash bucket is empty
  -> create 1 invoice for XPI

IF wash bucket has items AND ironing bucket is empty
  -> create 1 invoice for XPW

IF both buckets have items
  -> create 2 invoices
     - one invoice for XPI
     - one invoice for XPW
```

### Numbering

Invoice, quotation, and receipt numbers remain **shared**.

Example:
```text
User enters both ironing and wash items in one session

Save result:
- INV-1050 -> X-Press Ironing
- INV-1051 -> X-Press Wash
```

### Printing

If save generates two invoices, preview/print/email must handle two outputs.

```text
One entry session
  -> one company bucket used  -> one document
  -> two company buckets used -> two documents
```

---

## Validation Rules

### Bucket Rules

- A product can only appear in the bucket for its owning company
- User cannot manually move a Wash product into Ironing bucket or vice versa
- Empty bucket is ignored on save
- At least one bucket must contain items before save

### Edit Rules

Once saved, each generated invoice/quotation exists as its own record.

That means:
- one combined entry session may create two separate invoice IDs
- edit/reprint happens per generated invoice, not as one combined database record

---

## Report Branding

Reports continue to use `company_id` to fetch correct branding:

```vb
Dim companyId = get_single_value("company_id", "tbl_invoice_main", "id", invoiceId)
Dim companyName = get_single_value("company_name", "tbl_company", "id", companyId)
Dim companyLogo = get_single_value("logo", "tbl_company", "id", companyId)
```

This works because split save creates one invoice per company.

---

## Migration Script

```sql
-- 1. Add company metadata to existing company
UPDATE tbl_company SET company_code = 'XPI',
    company_short_name = 'X-Press Ironing',
    is_active = 1
WHERE id = 1

-- 2. Add company ownership to products
ALTER TABLE tbl_product ADD company_id BIGINT DEFAULT 1
UPDATE tbl_product SET company_id = 1 WHERE company_id IS NULL

-- 3. Add company_id to transaction headers
UPDATE tbl_invoice_main SET company_id = 1 WHERE company_id IS NULL
UPDATE tbl_quotation_main SET company_id = 1 WHERE company_id IS NULL
UPDATE tbl_receipt SET company_id = 1 WHERE company_id IS NULL
```

---

## Backward Compatibility

- Existing products default to company 1 (X-Press Ironing) until classified
- Existing invoices without `company_id` default to 1
- Existing reports continue to work with company_id = 1
- New split-entry workflow only affects newly created transactions

---

## Future Enhancements

1. **Session Link Table**: Link two generated invoices back to one entry session
2. **Split Preview Screen**: Show both generated invoices before final save
3. **Company-specific pricing**: Different price lists per company
4. **Combined receipt workflow**: Receive payment for both generated invoices in one action
