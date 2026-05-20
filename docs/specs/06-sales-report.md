# Sales Report — Implementation Details

## Purpose

Date-range filtered sales report displaying invoice transactions with customer details. Provides filtering, preview, PDF export, and Excel export functionality.

---

## UI Components

### Form Layout
```
┌──────────────────────────────────────────────────────────┐
│ [Left Panel]          │ [Top Filter Bar - LightSkyBlue]  │
│                       │                                  │
│  [PRINT]              │  From [DatePicker] To [DatePicker]│
│  [VIEW PDF]           │                     [🔍 Filter] │
│  [CANCEL]             │  [Export Excel ⬛]                │
│                       ├──────────────────────────────────┤
│  "Sales Report"       │                                  │
│                       │         DataGridView1             │
│                       │    (fills remaining space)       │
│                       │                                  │
│  [Logo PictureBox]    │                                  │
└──────────────────────────────────────────────────────────┘
```

### Controls

| Control | Type | Purpose | Default Value |
|---------|------|---------|---------------|
| `fromdate` | DateTimePicker | Start of date range | `first_date()` (first day of current month) |
| `todate` | DateTimePicker | End of date range | Current date |
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
| 4 | Invoice Date | Left | **dd-MM-yyyy** | `tbl_invoice_main.invoice_date` | **1** (moved via DisplayIndex=1) |
| 1 | Customer Name | Left | — | `LTRIM(tbl_customer.customer_name)` | 2 |
| 2 | Customer Type | Left | — | `tbl_customer.customer_type` | 3 |
| 3 | Invoice NO | Left | — | `tbl_invoice_main.invoice_no` | 4 |
| 5 | Discount | **Right** | — | `tbl_invoice_main.discount` | 5 |
| 6 | Bill Amount | **Right** | — | `sub_total + vat - discount` | 6 |
| 7 | Checklist NO | Left | — | `tbl_invoice_main.checklist_no` | 7 |

**Note:** Column 4 (Invoice Date) has `.DisplayIndex = 1`, so it displays as the **second column** (position 1) after Sales ID. This reorders the visual layout from the query return order.

**Grid Properties:**
- `ReadOnly = True`
- `AllowUserToAddRows = False`
- `AllowUserToDeleteRows = False`
- `CellBorderStyle = None`

---

## Query Logic

### Grid Display Query (Lines 46-54)

```vb
q = "SELECT tbl_invoice_main.id, LTRIM(tbl_customer.customer_name) AS Expr1, " &
    "tbl_customer.customer_type, tbl_invoice_main.invoice_no, " &
    "tbl_invoice_main.invoice_date, " &
    "CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR), " &
    "CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.sub_total + tbl_invoice_main.vat - " &
    "tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR), " &
    "tbl_invoice_main.checklist_no " &
    "FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id " &
    "WHERE (tbl_invoice_main.invoice_date BETWEEN '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' AND '" & Format(todate.Value, "dd-MMM-yyyy") & "') " &
    "AND (tbl_customer.customer_name LIKE '%" & find.Text & "%' " &
    "OR tbl_customer.customer_type LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.invoice_no LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.discount LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.checklist_no LIKE '%" & find.Text & "%') " &
    "ORDER BY tbl_invoice_main.invoice_date"
```

### sales_query Variable (Lines 66-72)

Stored separately for report generation (used by Preview_Sales_Report):

```vb
sales_query = "SELECT tbl_invoice_main.id, tbl_invoice_main.paid_amount, tbl_customer.title_name, " &
    "LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name) AS Expr1, " &
    "tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount As Expr2, " &
    "tbl_customer.customer_type, tbl_invoice_main.invoice_no, " &
    "tbl_invoice_main.invoice_date, tbl_invoice_main.discount, " &
    "tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS Expr3, " &
    "tbl_invoice_main.checklist_no " &
    "FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id " &
    "WHERE (tbl_invoice_main.invoice_date BETWEEN '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' AND '" & Format(todate.Value, "dd-MMM-yyyy") & "') " &
    "AND (tbl_customer.customer_name LIKE '%" & find.Text & "%' " &
    "OR tbl_customer.customer_type LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.invoice_no LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.checklist_no LIKE '%" & find.Text & "%' " &
    "OR tbl_invoice_main.discount LIKE '%" & find.Text & "%') " &
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
| `find.TextChanged` | User types in search box |
| `fromdate.ValueChanged` | From date changes |
| `todate.ValueChanged` | To date changes |

### Filter Logic

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
        Exit Sub
    End If

    Dim folder_path, pdf_path As String
    Dim file_name = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)
    folder_path = quot_path1 & "\Sales Reports\"

    If (Not System.IO.Directory.Exists(folder_path)) Then
        System.IO.Directory.CreateDirectory(folder_path)
    End If

    Dim Bytes() = Preview_Sales_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
    pdf_path = quot_path1 & "\Sales Reports\" & "Sales" & Format(Date.Now, "dd.MM.yyyyHH_mm_ss") & ".pdf"

    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using

    Preview_Sales_Report.ReportViewer2.RefreshReport()
    Preview_Sales_Report.Dispose()
    Preview_Sales_Report.Close()
    Process.Start(pdf_path)

    frmProgress.Dispose()
    frmProgress.Close()
End Sub
```

### PDF Path Structure

```
{report_path from tbl_setting}/
  Sales Reports/
    Sales20.05.202615_30_45.pdf    ← Format: dd.MM.yyyyHH_mm_ss
```

**Note:** Filename includes timestamp (seconds precision) to ensure uniqueness — no monthly subfolder structure like invoice reports.

### PDF Export Validation

| Check | Condition | Message |
|-------|-----------|---------|
| Grid empty | `DataGridView1.Rows.Count = 0` | "No Data Selected" |
| No row selected | `Cells(1).Value = ""` | "No Data Selected" |
| Report path not set | `report_path = ""` | "Please Set Report Path from Setting" |

---

## Excel Export Flow

### Button7 ("&Export") Click (Lines 216-296)

```vb
Private Sub Button7_Click(sender As Object, e As EventArgs) Handles Button7.Click
    Dim saveFileDialog1 As New SaveFileDialog()
    saveFileDialog1.Filter = "Excel |*.xlsx"
    saveFileDialog1.Title = "Save Excle File"
    saveFileDialog1.ShowDialog()

    If saveFileDialog1.FileName <> "" Then
        fnm = saveFileDialog1.FileName
    Else
        Exit Sub
    End If

    Dim xlWorkBook As Excel.Workbook
    Dim xlWorkSheet As Excel.Worksheet
    Dim misValue = System.Reflection.Missing.Value
    Dim xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()

    If xlApp Is Nothing Then
        MessageBox.Show("Excel is not properly installed!!")
        Return
    End If

    xlWorkBook = xlApp.Workbooks.Add(misValue)
    xlWorkSheet = xlWorkBook.Sheets("sheet1")

    ' Write headers
    xlWorkSheet.Cells(1, 1) = "CUSTOMER NAME"
    xlWorkSheet.Cells(1, 2) = "CUSTOMER TYPE"
    xlWorkSheet.Cells(1, 3) = "INVOICE NO"
    xlWorkSheet.Cells(1, 4) = "INVOICE DATE"
    xlWorkSheet.Cells(1, 5) = "DISCOUNT"
    xlWorkSheet.Cells(1, 6) = "SUB TOTAL"
    xlWorkSheet.Cells(1, 7) = "CHECKLIST NO"

    ' Write data rows
    z = 2
    With DataGridView1
        For j = 0 To .Rows.Count - 1
            xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value   ' Customer Name
            xlWorkSheet.Cells(z, 2) = .Rows(j).Cells(2).Value   ' Customer Type
            xlWorkSheet.Cells(z, 3) = .Rows(j).Cells(3).Value   ' Invoice NO
            xlWorkSheet.Cells(z, 4) = .Rows(j).Cells(4).Value   ' Invoice Date
            xlWorkSheet.Cells(z, 5) = .Rows(j).Cells(5).Value   ' Discount
            xlWorkSheet.Cells(z, 6) = .Rows(j).Cells(6).Value   ' Bill Amount (= SUB TOTAL)
            xlWorkSheet.Cells(z, 7) = .Rows(j).Cells(7).Value  ' Checklist NO
            z = z + 1
        Next
    End With
    
    xlWorkSheet.Columns.AutoFit()
    xlWorkBook.SaveAs(excel_file_name)
    xlWorkBook.Close(True, misValue, misValue)
    xlApp.Quit()

    releaseObject(xlWorkSheet)
    releaseObject(xlWorkBook)
    releaseObject(xlApp)

    MsgBox("File Saved at : " & fnm)
End Sub
```

### Excel Header Mapping

| Excel Column | Header | DataGridView Cell Index | Notes |
|--------------|--------|------------------------|-------|
| A | CUSTOMER NAME | 1 | LTRIM(customer_name) |
| B | CUSTOMER TYPE | 2 | customer_type |
| C | INVOICE NO | 3 | invoice_no |
| D | INVOICE DATE | 4 | Formatted dd-MM-yyyy |
| E | DISCOUNT | 5 | discount (currency formatted) |
| F | SUB TOTAL | 6 | Bill Amount = sub_total + vat - discount |
| G | CHECKLIST NO | 7 | checklist_no |

**Note:** "SUB TOTAL" column header actually contains Bill Amount (net after VAT and discount). This is a label inconsistency in the original code.

---

## Form Lifecycle

### Load (Lines 34-41)
```vb
Private Sub Sales_Report_Load(sender As Object, e As EventArgs) Handles MyBase.Load
    fromdate.Value = first_date()
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    Call grids1(DataGridView1)
    Call load_grid()
End Sub
```

### Disposed (Lines 16-18)
```vb
Private Sub Sales_Report_Disposed(sender As Object, e As EventArgs) Handles Me.Disposed
    last_form_close(Me)
End Sub
```

### FormClosed (Lines 20-25)
```vb
Private Sub Sales_Report_FormClosed(sender As Object, e As FormClosedEventArgs) Handles Me.FormClosed
    On Error Resume Next
    workbook.Save()
    workbook.Close()
    APP.Quit()
End Sub
```

### KeyDown — Escape to Close (Lines 27-32)
```vb
Private Sub Sales_Report_KeyDown(sender As Object, e As KeyEventArgs) Handles Me.KeyDown
    If e.KeyCode = Keys.Escape Then
        Me.Dispose()
        Me.Close()
    End If
End Sub
```

---

## Module Integration

### Part of Invoice Module
Sales Report is accessed from the Invoice module to view historical invoice data. It reads from:
- `tbl_invoice_main` — invoice headers
- `tbl_customer` — customer details via JOIN
- `tbl_setting` — report path for PDF export

### Relationship to Invoice Form
```
Invoice Form (Add_Edit_Invoice)
    ↓ creates
tbl_invoice_main records
    ↓ read by
Sales_Report (filters & displays)
    ↓ feeds
Preview_Sales_Report (report preview/PDF)
```

### sales_query Global Variable
The `sales_query` variable is stored globally for consumption by `Preview_Sales_Report`. This form reads `sales_query` to generate the actual report via ReportViewer RDLC.

---

## Date Formatting

| Context | Format | Example |
|---------|--------|---------|
| SQL Query | `dd-MMM-yyyy` | `20-May-2026` |
| DataGridView Display | `dd-MM-yyyy` | `20-05-2026` |
| PDF Filename | `dd.MM.yyyyHH_mm_ss` | `20.05.202615_30_45` |
| Excel Export | DataGridView format | `20-05-2026` |

---

## Form Cleanup / Resource Management

### releaseObject() Helper (Lines 132-141)
```vb
Private Sub releaseObject(obj As Object)
    Try
        System.Runtime.InteropServices.Marshal.ReleaseComObject(obj)
        obj = Nothing
    Catch ex As Exception
        obj = Nothing
    Finally
        GC.Collect()
    End Try
End Sub
```

Ensures Excel COM objects are properly released to prevent zombie processes.

---

## Data Sources

| Source | Usage |
|--------|-------|
| `tbl_invoice_main` | All invoice fields |
| `tbl_customer` | customer_name, customer_type, title_name |
| `tbl_setting` | report_path for PDF destination |

### Schema Dependencies
```
tbl_invoice_main.customer_id → tbl_customer.id (INNER JOIN)
tbl_setting.id = get_max_number("id", "tbl_setting") (singleton settings row)
```