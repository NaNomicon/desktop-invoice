# Quotation Reports — Specification

## Overview

| Property | Value |
|----------|-------|
| **Files** | `Quotation/Quotation_Report.vb` (280 lines), `Reports/Preview_Quotation_list_Report.vb` (207 lines), `Reports/Preview_Quotation_Report.vb` (212 lines) |
| **Purpose** | List quotations, preview single, preview multiple |
| **RDLC** | `QUOTATION.rdlc` (single), `QUOTATION_LIST.rdlc` (list) |

## Form Architecture

### Quotation_Report — List Screen

```vb
Public Class Quotation_Report
    Dim tables As DataTableCollection
    Dim source1 As New BindingSource
    Dim APP As New Excel.Application
    Dim worksheet As Excel.Worksheet
    Dim workbook As Excel.Workbook
```

### Global State
- `quotation_query` — Module1 variable, holds current filtered query
- `Quotation_To_Invoice_ID` — For converting quotation to invoice

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Set default dates, load grid |
| `Disposed` | Cleanup Excel objects |
| `FormClosed` | Save and close workbook, quit Excel |
| `KeyDown` | Escape → close |
| `Move` | Calls `moved(Me)` |

### Load Logic
```vb
Private Sub Quotation_Report_Load(...)
    fromdate.Value = first_date()
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    Call grids1(DataGridView1)
    Call load_grid()
End Sub
```

## UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Quotation" |
| `Label6` | Label | Close button (X) |
| `Button4` | Button | Close |
| `Button5` | Button | Preview list report |
| `Button2` | Button | Export list PDF |
| `Button7` | Button | Export to Excel |
| `fromdate` | DateTimePicker | Start date filter |
| `todate` | DateTimePicker | End date filter |
| `find` | TextBox | Search filter |
| `DataGridView1` | DataGridView | Quotation list |

### Grid Configuration
```vb
.Columns(0).HeaderText = "Sales ID"
.Columns(1).HeaderText = "Customer"
.Columns(2).HeaderText = "Customer Type"
.Columns(3).HeaderText = "Mobile"
.Columns(4).HeaderText = "Quotation NO"
.Columns(5).HeaderText = "Date"
.Columns(6).HeaderText = "Tax(%)"
.Columns(7).HeaderText = "Discount"
.Columns(8).HeaderText = "Sub Total"
.Columns(5).DefaultCellStyle.Format = "dd-MM-yyyy"
.Columns(6-8).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
```

## Data Loading (`load_grid()`)

```vb
Public Sub load_grid()
    Call con_sql()
    
    ' Display query (stripped for UI)
    Call SQL_Query("SELECT tbl_quotation_main.id, LTRIM(tbl_customer.customer_name), 
        tbl_customer.customer_type, tbl_customer.telephone, tbl_quotation_main.quo_no, 
        tbl_quotation_main.quo_date, tbl_quotation_main.vat, 
        CAST(CONVERT(VARCHAR, CAST(tbl_quotation_main.discount AS MONEY), 1) AS VARCHAR), 
        CAST(CONVERT(VARCHAR, CAST(tbl_quotation_main.total AS MONEY), 1) AS VARCHAR) 
        FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id",
        " where (tbl_quotation_main.quo_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' 
                and '" & Format(todate.Value, "dd-MMM-yyyy") & "') 
            and (tbl_customer.customer_name like '%" & find.Text & "%' 
                 or tbl_customer.customer_type like '%" & find.Text & "%' 
                 or tbl_customer.telephone like '%" & find.Text & "%' 
                 or tbl_quotation_main.quo_no like '%" & find.Text & "%') 
        order by tbl_quotation_main.quo_date")
    
    ' Full query for report (includes title_name)
    quotation_query = "SELECT tbl_quotation_main.id, 
        LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name) as Expr1, 
        tbl_customer.customer_type, tbl_customer.telephone, tbl_quotation_main.quo_no, 
        tbl_quotation_main.quo_date, tbl_quotation_main.vat, tbl_quotation_main.discount, 
        tbl_quotation_main.total 
        FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id
        where ... order by tbl_quotation_main.quo_date"
End Sub
```

**Filter**: Date range + customer_name/customer_type/telephone/quo_no (LIKE)

## Actions

### Preview List Report (Button5)
```vb
Private Sub Button5_Click(...)
    quotation_query = "SELECT ... (full query with title_name) ..."
    Call __show(preview_quotation_list_report)
    Call load_nav_bar("Preview_Quotation_list_Report", "Quotation List Report")
End Sub
```

### Export List PDF (Button2)
```vb
Private Sub Button2_Click(...)
    quotation_query = "SELECT ... (full query) ..."
    is_pdf = True
    
    If DataGridView1.Rows.Count = 0 Or DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call preview_quotation_list_report.load_report()
    
    Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If
    
    folder_path = quot_path1 & "\Quotation Reports\"
    System.IO.Directory.CreateDirectory(folder_path)
    
    Dim Bytes() As Byte = preview_quotation_list_report.ReportViewer2.LocalReport.Render("PDF", ...)
    pdf_path = quot_path1 & "\Quotation Reports\" & "Quotation" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
    
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    
    preview_quotation_list_report.Dispose()
    preview_quotation_list_report.Close()
    Process.Start(pdf_path)
End Sub
```

### Export to Excel (Button7)
```vb
Private Sub Button7_Click(...)
    saveFileDialog1.Filter = "Excel |*.xlsx"
    
    xlWorkSheet.Cells(1, 1) = "CUSTOMER NAME"
    xlWorkSheet.Cells(1, 2) = "CUSTOMER TYPE"
    xlWorkSheet.Cells(1, 3) = "MOBILE"
    xlWorkSheet.Cells(1, 4) = "QUOTATION NO"
    xlWorkSheet.Cells(1, 5) = "DATE"
    xlWorkSheet.Cells(1, 6) = "TAX(%)"
    xlWorkSheet.Cells(1, 7) = "DISCOUNT"
    xlWorkSheet.Cells(1, 8) = "SUB TOTAL"
    
    ' Write DataGridView1 rows
    For j = 0 To DataGridView1.Rows.Count - 1
        xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value
        ' ... write all columns
    Next
    
    xlWorkBook.SaveAs(excel_file_name)
    MsgBox("File Saved at : " & fnm)
End Sub
```

### Convert to Invoice (Double-click)
```vb
Private Sub DataGridView1_MouseDoubleClick(...)
    Quotation_To_Invoice_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Invoice)
    load_nav_bar("Add_Edit_Invoice", "Add Invoice From Quot.")
End Sub
```

## Preview_Quotation_list_Report — List Report

```vb
Public Class preview_quotation_list_report
```

### Report Load (`load_report()`)

Uses `quotation_query` from Module1 (set by Quotation_Report).

**Data Sources**:
1. `DataSet1`: `quotation_query` — tbl_quotation_main + tbl_customer JOIN
2. `DataSet2`: `SELECT * FROM tbl_company` — header info

**RDLC**: `QUOTATION_LIST.rdlc`

**Parameters**: `from_date`, `to_date` from Quotation_Report controls

### Row Height Calculation
```vb
For i = 0 To tot_item_length.Length - 1
    z = tot_item_length(i) / 38
    no_of_rows_item = no_of_rows_item + Math.Ceiling(z)
Next
For i = 0 To tot_desc_length.Length - 1
    z = tot_desc_length(i) / 38
    no_of_rows_desc = no_of_rows_desc + Math.Ceiling(z)
Next
If no_of_rows_desc > no_of_rows_item Then
    no_of_rows_item = no_of_rows_desc
End If
```

## Preview_Quotation_Report — Single Quotation Report

```vb
Public Class Preview_Quotation_Report
```

### Report Load (`Preview_Quotation_Report_Load`)

Uses `quotation_id` from Module1 (set by Add_Edit_Quotation or View_Quotation).

**Data Sources**:
1. `DataSet1`: `SELECT tbl_quotation_main.*, tbl_customer.*, tbl_customer.brn, tbl_customer.vat AS Expr1 
    FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id 
    WHERE tbl_quotation_main.id='quotation_id'`
2. `DataSet2`: `SELECT tbl_quotation_sub.qty, tbl_product.product_name, tbl_product_type.type_name, 
    tbl_quotation_sub.unit_price, tbl_quotation_sub.row_total, tbl_quotation_sub.s_no as tot_rows 
    FROM tbl_quotation_sub INNER JOIN tbl_product ON tbl_quotation_sub.product_id = tbl_product.id 
    INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id 
    WHERE tbl_quotation_sub.main_id='quotation_id'`
3. `DataSet3`: `SELECT * FROM tbl_company`

**RDLC**: `QUOTATION.rdlc`

**Dynamic Row Calculation**: Same as list report (38 chars per line)

**Post-Load Conditional**: After data load, checks `is_pdf` flag:
```vb
If is_pdf = True Then
    Me.ReportViewer2.RefreshReport()
ElseIf is_pdf = False Then
    ' Print(sender, e)
End If
is_pdf = False
```

### Print Button
```vb
Private Sub Button5_Click(...)
    print_microsoft_report(ReportViewer2.LocalReport, Me)
End Sub
```

## Data Flow

```
Quotation_Report (list screen)
├── Date range filter → load_grid()
├── Double-click row → Quotation_To_Invoice_ID → Add_Edit_Invoice
├── Button5 → preview_quotation_list_report (all quotations in range)
└── Button2 → export PDF of list

Add_Edit_Quotation (create/edit)
├── Save → quotation_id set
├── ExportToPDF() → Preview_Quotation_Report (single quotation)
└── Button6 → Email with PDF attachment

View_Quotation (list screen)
├── Double-click → quotation_id → Add_Edit_Quotation
└── Button3 → Preview_Quotation_Report (single quotation)
```

## Report Parameters

| Report | Parameters | Source |
|--------|------------|--------|
| QUOTATION.rdlc | None | DataSet contains all |
| QUOTATION_LIST.rdlc | from_date, to_date | Quotation_Report.fromdate/todate |

## Key Implementation Details

| Detail | Value |
|--------|-------|
| Date format | `dd-MMM-yyyy` (e.g., "01-Jan-2024") |
| Currency format | `CAST(CONVERT(VARCHAR, CAST(total AS MONEY), 1) AS VARCHAR)` |
| PDF folder | `{report_path}\Quotation Reports\` |
| PDF naming | `Quotation{dd-MM-yyyy HH_mm_ss}.pdf` |
| Excel app | Microsoft.Office.Interop.Excel cleanup on dispose |