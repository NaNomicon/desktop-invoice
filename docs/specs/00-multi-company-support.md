# Multi-Company Support — Specification

## Overview

This document describes the multi-company support feature for the XPress billing application. The system supports two companies on the same database:

| Company | Code | Purpose |
|---------|------|---------|
| X-Press Ironing Ltd | XPI | Ironing services (existing) |
| X-Press Wash | XPW | Wash services (future/new) |

## Key Design Decisions

1. **Shared Resources**: Customers, invoice numbering, product catalog are shared across companies
2. **Separate Transactions**: Each invoice/quotation/receipt belongs to a specific company
3. **Company Selection**: User selects company at transaction creation time via dropdown
4. **Validation**: Mixed company types on same transaction are blocked

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
    company_name VARCHAR(MAX),           -- Full: "X-Press Ironing Ltd"
    company_short_name VARCHAR(100),     -- Short: "X-Press Ironing"
    company_code VARCHAR(50),            -- 'XPI', 'XPW'
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

**New Control: Company ComboBox**
- Location: Top of form, next to customer selection
- Data source: `SELECT id, company_name FROM tbl_company WHERE is_active = 1`
- Default: First active company (ID=1 for existing installations)
- Width: ~200px

**Behavior:**
1. On new invoice: Company dropdown enabled, default selected
2. On edit: Company dropdown shows current value, can be changed if no line items
3. Validation: If line items exist, company cannot be changed

**Load Logic:**
```vb
Private Sub LoadCompanyCombo()
    Dim ds As DataSet = SQL_Query("SELECT id, company_name FROM tbl_company WHERE is_active = 1 ORDER BY id")
    company_cmb.DataSource = ds.Tables(0)
    company_cmb.DisplayMember = "company_name"
    company_cmb.ValueMember = "id"
    ' Default to first row
    If ds.Tables(0).Rows.Count > 0 Then
        company_cmb.SelectedIndex = 0
    End If
End Sub
```

**Save Logic:**
```vb
variable.Add("company_id", company_cmb.SelectedValue)
```

### Quotation Form (Add_Edit_Quotation)

Same pattern as invoice — add company dropdown at header level.

### Receipt Form (Add_Edit_Receipt)

Same pattern — add company dropdown at header level.

---

## Validation Rules

### Block Mixed Companies

```vb
Private Sub ValidateCompanySelection()
    If DataGridView2.Rows.Count > 1 Then
        ' Block company change if items exist
        MsgBox("Cannot change company when line items exist.", vbExclamation)
        company_cmb.Enabled = False
    End If
End Sub
```

### Company-Specific Product Filter (Optional Enhancement)

If needed, product type dropdown can filter by company:
```sql
SELECT * FROM tbl_product_type 
WHERE company_id = @company_id OR company_id IS NULL  -- shared types
```

---

## Report Branding

Reports use company_id to fetch correct branding:

```vb
Dim companyId = get_single_value("company_id", "tbl_invoice_main", "id", invoiceId)
Dim companyName = get_single_value("company_name", "tbl_company", "id", companyId)
Dim companyLogo = get_single_value("logo", "tbl_company", "id", companyId)
```

### RDLC Report Parameters

Add `company_id` parameter to all transaction reports:
- Invoice Report
- Quotation Report
- Receipt Report
- Statement Report
- Sales Report

---

## Numbering Strategy

Invoice, quotation, and receipt numbers remain **shared** (single sequence per type).

If separate numbering is needed per company:
```sql
ALTER TABLE tbl_numbers ADD invoice_no_xpi BIGINT DEFAULT 1
ALTER TABLE tbl_numbers ADD invoice_no_xpw BIGINT DEFAULT 1
```

---

## Migration Script

```sql
-- 1. Add company_code to existing record
UPDATE tbl_company SET company_code = 'XPI', 
    company_short_name = 'X-Press Ironing',
    is_active = 1 
WHERE id = 1

-- 2. Set default company_id on existing transactions
UPDATE tbl_invoice_main SET company_id = 1 WHERE company_id IS NULL
UPDATE tbl_quotation_main SET company_id = 1 WHERE company_id IS NULL
UPDATE tbl_receipt SET company_id = 1 WHERE company_id IS NULL
```

---

## Backward Compatibility

- Existing invoices without `company_id` default to 1 (X-Press Ironing)
- Reports continue to work with company_id = 1
- Company settings form updated to support multiple companies

---

## Future Enhancements

1. **Company-specific product types**: Add `company_id` to `tbl_product_type`
2. **Separate invoice sequences**: Per-company numbering
3. **Company-specific pricing**: Price tiers by company
4. **Role-based company access**: Users can only access specific companies