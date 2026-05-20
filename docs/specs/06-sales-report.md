# Sales Report — Implementation Details

> **Multi-Company Support Added:** `company_id` filter and company branding in reports.

## Purpose

Date-range filtered sales report displaying invoice transactions with customer details. Provides filtering, preview, PDF export, and Excel export functionality.

---

## UI Components

### Form Layout
```
┌────────────────────────────────────────────────────────────────┐
│ [Left Panel]          │ [Top Filter Bar - LightSkyBlue]        │
│                       │                                        │
│  [PRINT]              │  From [DatePicker] To [DatePicker]     │
│  [VIEW PDF]           │  Company: [All Companies ▼]           │
│  [CANCEL]             │                     [🔍 Filter]         │
│                       │  [Export Excel ⬛]                     │
│  "Sales Report"       ├────────────────────────────────────────┤
│                       │                                        │
│  [Logo PictureBox]    │         DataGridView1                  │
│                       │    (fills remaining space)             │
└────────────────────────────────────────────────────────────────┘
```

### New Company Filter

A **company ComboBox** is added to filter sales by company:

```vb
' Load company filter
Private Sub LoadCompanyFilter()
    Dim ds As DataSet = SQL_Query("SELECT 0 AS ID, 'All Companies' AS company_name UNION SELECT id, company_name FROM tbl_company WHERE is_active = 1")
    company_cmb.DataSource = ds.Tables(0)
    company_cmb.DisplayMember = "company_name"
    company_cmb.ValueMember = "id"
End Sub

' Add filter to query
Dim companyFilter As String = ""
If company_cmb.SelectedValue > 0 Then
    companyFilter = " AND im.company_id = " & company_cmb.SelectedValue
End If
```

---

### Controls

| Control | Type | Purpose | Default Value |
|---------|------|---------|---------------|
| `fromdate` | DateTimePicker | Start of date range | `first_date()` (first day of current month) |
| `todate` | DateTimePicker | End of date range | Current date |
| `company_cmb` | ComboBox | Filter by company | "All Companies" (0) |
| `find` | TextBox | Search/filter across all columns | Empty |
| `Button5` ("&PRINT") | Button | Open preview form | — |
| `Button2` ("&VIEW PDF") | Button | Generate & open PDF | — |
| `Button7` ("&Export") | Button | Export to Excel | — |
| `Button4` ("&CANCEL") | Button | Close form | — |
| `DataGridView1` | DataGridView | Display filtered results | — |

### DataGridView Column Headers

| Index | Header Text | Alignment | Format | Source | Display Order |
|-------|-------------|-----------|--------|--------|---------------|
| 0 | Sales ID | Left | — | `tbl_invoice_main.id` | 0 |
| 4 | Invoice Date | Left | **dd-MM-yyyy** | `tbl_invoice_main.invoice_date` | **1** |
| 1 | Customer Name | Left | — | `LTRIM(tbl_customer.customer_name)` | 2 |
| 2 | Customer Type | Left | — | `tbl_customer.customer_type` | 3 |
| 3 | Invoice NO | Left | — | `tbl_invoice_main.invoice_no` | 4 |
| 5 | Discount | **Right** | — | `tbl_invoice_main.discount` | 5 |
| 6 | Bill Amount | **Right** | — | `sub_total + vat - discount` | 6 |
| 7 | Checklist NO | Left | — | `tbl_invoice_main.checklist_no` | 7 |
| 8 | Company | Left | — | `tbl_company.company_short_name` | 8 |

---

## Query Logic

### Grid Display Query (Lines 46-54)

**Multi-Company:** Added `company_id` filter and company column.

```vb
q = "SELECT tbl_invoice_main.id, LTRIM(tbl_customer.customer_name) AS Expr1, " &
    "tbl_customer.customer_type, tbl_invoice_main.invoice_no, " &
    "tbl_invoice_main.invoice_date, " &
    "CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR), " &
    "CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.sub_total + tbl_invoice_main.vat - " &
    "tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR), " &
    "tbl_invoice_main.checklist_no, " &
    "ISNULL(tbl_company.company_short_name, 'XPI') AS company_name " &
    "FROM tbl_invoice_main " &
    "INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id " &
    "LEFT JOIN tbl_company ON tbl_invoice_main.company_id = tbl_company.id " &
    "WHERE (tbl_invoice_main.invoice_date BETWEEN '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' AND '" & Format(todate.Value, "dd-MMM-yyyy") & "') " &
    AND (tbl_customer.customer_name LIKE '%" & find.Text & "%' " &
    "OR tbl_customer.customer_type LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.invoice_no LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.discount LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.checklist_no LIKE '%" & find.Text & "%') " &
    companyFilter &  ' Added for multi-company
    "ORDER BY tbl_invoice_main.invoice_date"
```

### sales_query Variable (Lines 66-72)

**Multi-Company:** Added company filter to report query.

```vb
sales_query = "SELECT tbl_invoice_main.id, tbl_invoice_main.paid_amount, tbl_customer.title_name, " &
    "LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name) AS Expr1, " &
    "tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount As Expr2, " &
    "tbl_customer.customer_type, tbl_invoice_main.invoice_no, " &
    "tbl_invoice_main.invoice_date, tbl_invoice_main.discount, " &
    "tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS Expr3, " &
    "tbl_invoice_main.checklist_no " &
    "FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id " &
    "LEFT JOIN tbl_company ON tbl_invoice_main.company_id = tbl_company.id " &
    "WHERE (tbl_invoice_main.invoice_date BETWEEN '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' AND '" & Format(todate.Value, "dd-MMM-yyyy") & "') " &
    AND (tbl_customer.customer_name LIKE '%" & find.Text & "%' " &
    "OR tbl_customer.customer_type LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.invoice_no LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.checklist_no LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.discount LIKE '%" & find.Text & "%') " &
    companyFilter &  ' Added for multi-company
    "ORDER BY tbl_invoice_main.invoice_date"
```

**Differences from grid query:**
- Includes `paid_amount` and `title_name`
- Full customer name with title: `title_name + ' ' + customer_name`
- Bill Amount appears twice: `Expr2` and `Expr3`

### Bill Amount Formula

```
Bill_Amount = sub_total + vat - discount
```

Derived from invoice calculation: total after VAT and discount applied.

---

## Event Handlers

### load_grid() — Called On

| Event | Trigger |
|-------|---------|
| `Sales_Report_Load` | Form loads |
| `company_cmb.SelectedIndexChanged` | Company filter changes |
| `find.TextChanged` | User types in search box |
| `fromdate.ValueChanged` | From date changes |
| `todate.ValueChanged` | To date changes |

### Filter Logic

Company filter (`company_cmb`) is applied as SQL condition:
```vb
If company_cmb.SelectedValue > 0 Then
    companyFilter = " AND im.company_id = " & company_cmb.SelectedValue
End If
```

Search (`find.Text`) is applied via LIKE with `%wildcards%` on multiple fields:
- `tbl_customer.customer_name`
- `tbl_customer.customer_type`
- `tbl_invoice_main.invoice_no`
- `tbl_invoice_main.discount`
- `tbl_invoice_main.checklist_no`

---

## Report Preview Flow

### Button5 ("&PRINT") Click (Lines 143-151)

```vb
Private Sub Button5_Click(sender As Object, e As EventArgs) Handles Button5.Click
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    frmProgress.Show()
    Call __show(Preview_Sales_Report)
    Call load_nav_bar("Preview_Sales_Report", "Sales Report")
End Sub
```

**Flow:**
1. Check if grid has data → error if empty
2. Show `frmProgress` (progress overlay)
3. Open `Preview_Sales_Report` form (report preview with ReportViewer)
4. Load navbar with "Preview_Sales_Report" title, "Sales Report" as module

---

## PDF Export Flow

### Button2 ("&VIEW PDF") Click (Lines 153-213)

```vb
Private Sub Button2_Click(sender As Object, e As EventArgs) Handles Button2.Click
    is_pdf = True
    Dim repo_path_id As Double = 0
    Dim frm As Form = Preview_Invoice_Report
    
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        DataGridView1.Focus()
        Exit Sub
    End If
    
    frmProgress.Show()
    repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    Call Preview_Sales_Report.Preview_Sales_Report_Load(sender, e)
    
    Dim quot_path1 = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
```