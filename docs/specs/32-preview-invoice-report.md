# Preview Invoice Report — Specification

> **Multi-Company Support Added:** Company branding from `company_id` on `tbl_invoice_main`.

## Purpose

`Preview_Invoice_Report` is a WinForms report-preview form that renders invoice data in `ReportViewer2` using RDLC templates and allows direct printing through a button action.

Primary entry point:

```vb
Public Sub Preview_Invoice_Report_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
```

The load routine:
- Initializes form/runtime (`set_fonr`, `con_sql`, `KeyPreview`).
- Loads 3 report datasets from SQL Server.
- Selects RDLC template based on a global toggle (`print_due_amt_on_invoice`).
- Injects report parameters (`final_amt`, `due_amt`).
- Computes row-height-related values from global arrays.
- Refreshes report viewer in print layout mode.

---

## Multi-Company Support

### Company Branding

Reports now filter company data by `company_id` from the invoice:

```vb
' Get company_id from current invoice
Dim companyId As Long = get_single_value("company_id", "tbl_invoice_main", "id", invoice_id)

' DataSet3: Company master data (filtered by company_id)
q = "SELECT * FROM tbl_company WHERE id = " & companyId
```

### Why This Matters

- Each company has its own logo, watermark, address, branding
- The report header must show the correct company based on `company_id`
- Historical invoices retain their `company_id` and show correct branding

---

## Dataset loading pattern (3 datasets)

The form follows a repeated 3-step pattern for each dataset:
1. Create `DataSet` + `BindingSource`.
2. Fill the dataset through `SqlDataAdapter` and named table (`DataSet1/2/3`).
3. Wrap into `ReportDataSource` and add to `ReportViewer2.LocalReport.DataSources`.

Actual pattern in code:

```vb
Dim ds As New DataSet
Dim bs As New BindingSource
Using cn1 As New SqlConnection(con111)
    cn1.Open()
    Dim q1 As String
    q1 = "..."
    Dim sa As New SqlDataAdapter(q1, cn1)
    sa.Fill(ds, "DataSet1")
End Using
bs.DataSource = ds
bs.DataMember = "DataSet1"
Dim rds As ReportDataSource = New ReportDataSource
rds.Name = "DataSet1"
rds.Value = bs
ReportViewer2.LocalReport.DataSources.Add(rds)
```

The same structure is repeated for `DataSet2` and `DataSet3`.

---

## SQL queries for each dataset

### DataSet1: Customer + Invoice header
Source code query:

```vb
q1 = "SELECT tbl_customer.customer_name, tbl_customer.title_name,  tbl_invoice_main.invoice_date, " &
    "tbl_invoice_main.cr_dr,tbl_invoice_main.paid_amount, tbl_customer.contact, tbl_customer.customer_type, " &
    "tbl_customer.telephone, tbl_customer.address, tbl_customer.email, tbl_invoice_main.invoice_no, " &
    "tbl_invoice_main.checklist_no, tbl_invoice_main.sub_total, tbl_invoice_main.amount_due, " &
    "tbl_invoice_main.vat, tbl_invoice_main.discount, tbl_invoice_main.total, tbl_invoice_main.per, " &
    "tbl_customer.brn, tbl_customer.vat AS Expr1, tbl_invoice_main.identify " &
    "As E1 FROM tbl_invoice_main INNER JOIN tbl_customer ON " &
    "tbl_invoice_main.customer_id = tbl_customer.id where tbl_invoice_main.id='" & invoice_id & "'"
```

Notes:
- Joins `tbl_invoice_main` with `tbl_customer`.
- Filters by global/current `invoice_id`.
- Loaded as report table name `DataSet1`.

### DataSet2: Invoice line items with product type join

Source code query:

```vb
q = "SELECT tbl_invoice_sub.qty, tbl_product.product_id, tbl_product.product_name, tbl_product_type.type_name, tbl_invoice_sub.unit_price, tbl_invoice_sub.row_total,  tbl_invoice_sub.s_no as tot_rows FROM tbl_product_type INNER JOIN tbl_product ON tbl_product_type.id = tbl_product.type_id INNER JOIN tbl_invoice_sub ON tbl_product.id = tbl_invoice_sub.product_id where tbl_invoice_sub.main_id='" & invoice_id & "'"
```

Notes:
- Joins `tbl_invoice_sub` -> `tbl_product` -> `tbl_product_type`.
- Uses `main_id = invoice_id` to fetch only current invoice rows.
- Loaded as report table name `DataSet2`.

### DataSet3: Company master data (Multi-Company: Filtered)

```vb
' Get company_id from invoice
Dim companyId As Long = get_single_value("company_id", "tbl_invoice_main", "id", invoice_id)

' Load company branding for this specific company
q = "SELECT * FROM tbl_company WHERE id = " & companyId
```

**Previous:** `q = "select * from tbl_company"` (loaded ALL companies)

**Now:** Filters to the specific company based on invoice's `company_id`.

---

## RDLC selection logic

Report path is selected by global Boolean `print_due_amt_on_invoice`.

Actual code:

```vb
If print_due_amt_on_invoice = True Then
    Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\INVOICE.rdlc"
Else
    Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\INVOICE_noadv.rdlc"
End If
```

Behavior:
- `True` -> `INVOICE.rdlc` (shows due/advance-related layout).
- `False` -> `INVOICE_noadv.rdlc` (alternate layout without due/advance section).

---

## Report parameters

Two runtime parameters are passed into the RDLC:

```vb
With ReportViewer2
    Dim ft As New ReportParameter("final_amt", new_AMOUNT)
    .LocalReport.SetParameters(ft)
    If print_due_amt_on_invoice = True Then
        Dim due1 As New ReportParameter("due_amt", "1")
        .LocalReport.SetParameters(due1)
    ElseIf print_due_amt_on_invoice = False Then
        Dim due1 As New ReportParameter("due_amt", "0")
        .LocalReport.SetParameters(due1)
    End If
End With
```

Parameter contract:
- `final_amt`: value from global/form variable `new_AMOUNT`.
- `due_amt`: string flag (`"1"` or `"0"`) derived from `print_due_amt_on_invoice`.

---

## Row height calculation (`tot_item_length`, `tot_desc_length`, `/38`)

The form computes estimated row counts for item and description text wrapping by dividing each length by `38` and applying `Math.Ceiling`.

Actual code:

```vb
Dim no_of_rows_item, no_of_rows_desc As Integer

For i = 0 To tot_item_length.Length - 1
    If tot_item_length(i) > 0 Then
        Dim z As Double
        z = tot_item_length(i) / 38
        no_of_rows_item = Val(no_of_rows_item) + Val(Math.Ceiling(z))
    End If
Next

For i = 0 To tot_desc_length.Length - 1
    If tot_desc_length(i) > 0 Then
        Dim z As Double
        z = tot_desc_length(i) / 38
        no_of_rows_desc = Val(no_of_rows_desc) + Val(Math.Ceiling(z))
    End If
Next

Dim pass_para_for_rows As Integer
If no_of_rows_item = no_of_rows_desc Then
    pass_para_for_rows = no_of_rows_item
ElseIf no_of_rows_item > no_of_rows_desc Then
    pass_para_for_rows = no_of_rows_item
ElseIf no_of_rows_desc > no_of_rows_item Then
    pass_para_for_rows = no_of_rows_desc
End If
```

Observed behavior:
- Computes max of `no_of_rows_item` and `no_of_rows_desc` into `pass_para_for_rows`.
- In current file, `pass_para_for_rows` is calculated but not passed to the report parameters.

---

## Print button behavior

The print action is wired to `Button5_Click` and calls a shared print helper with the prepared local report.

```vb
Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
    print_microsoft_report(ReportViewer2.LocalReport, Me)
End Sub
```

Meaning:
- Printing is delegated to `print_microsoft_report` (external/shared routine).
- The form itself does not perform low-level print rendering in active code (older print pipeline code is present but commented out).

---

## `print_due_amt_on_invoice` global flag

`print_due_amt_on_invoice` controls two key behaviors:
1. **Template selection**: `INVOICE.rdlc` vs `INVOICE_noadv.rdlc`.
2. **Runtime parameter**: `due_amt = "1"` when true, `"0"` when false.

This flag is therefore both:
- A presentation switch (layout file).
- A data/visibility switch (parameter consumed by RDLC expressions).

---

## End-to-end load/preview flow

1. Form load fires `Preview_Invoice_Report_Load`.
2. SQL connection string is read from `REPORT_CON_STRING`.
3. **Get `company_id` from invoice** (new step).
4. `DataSet1`, `DataSet2` are loaded for invoice data.
5. `DataSet3` is loaded **filtered by `company_id`** for company branding.
6. RDLC path is chosen using `print_due_amt_on_invoice`.
7. Parameters `final_amt` and `due_amt` are set.
8. Viewer enters print-layout mode and executes `RefreshReport()`.
9. User clicks Print (`Button5`) -> `print_microsoft_report(ReportViewer2.LocalReport, Me)`.

---

## Other Reports (Quotation, Receipt, Statement)

All transaction report forms follow the same pattern:

1. **Get `company_id`** from the transaction record
2. **Filter `DataSet3` (company data)** by `company_id`
3. **Load company-specific** logo, address, branding

### Quotation Report

```vb
Dim companyId As Long = get_single_value("company_id", "tbl_quotation_main", "id", quotation_id)
q = "SELECT * FROM tbl_company WHERE id = " & companyId
```

### Receipt Report

```vb
Dim companyId As Long = get_single_value("company_id", "tbl_receipt", "id", receipt_id)
q = "SELECT * FROM tbl_company WHERE id = " & companyId
```

### Statement Report

```vb
' Statement shows customer history — include company from first invoice or let user select
Dim companyId As Long = 1  ' Default or user-selected
```

---

## Database Schema Reference

### tbl_company (Report Branding Source)

```sql
SELECT company_name,      -- Report header
       company_short_name,
       address,           -- Report address
       city,
       telephone,
       email,
       brn,               -- Business Registration Number
       vat,               -- VAT Number
       logo,              -- Company logo image
       watermark          -- Report watermark
FROM tbl_company
WHERE id = @company_id
```

### tbl_invoice_main (Transaction + Company Link)

```sql
SELECT id, customer_id, company_id, invoice_no, ...
FROM tbl_invoice_main
WHERE id = @invoice_id
```