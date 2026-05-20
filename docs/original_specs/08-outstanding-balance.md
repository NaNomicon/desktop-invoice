# Outstanding.vb — Balance Tracking Screen

## Purpose

Outstanding.vb is a **customer balance tracking screen** that displays all customers with outstanding balances (positive `due_amount`), enabling quick access to receipt management, report viewing, and data export.

**Focus**: Lists customers → triggers receipt actions → generates reports.

---

## Form Architecture

### Class Declaration
```vb
Public Class Outstanding
    Dim tables As DataTableCollection
    Dim source1 As New BindingSource
    ' Excel interop for export
    Dim APP As New Excel.Application
    Dim worksheet As Excel.Worksheet
    Dim workbook As Excel.Workbook
```

### Inheritance
- Inherits `System.Windows.Forms.Form`
- Designer-generated partial class

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────────────────────────┤
│ │          │ │ [Export] [Filter: ___________] [X]                  │
│ │ OUTSTAND │ ├──────────────────────────────────────────────────────┤
│ │          │ │                                                      │
│ │ [NEW]    │ │   Customer Name    │    Amount    │    Status       │
│ │ RECEIPT  │ │  ────────────────────────────────────────────────   │
│ │          │ │   Mr John          │   5,000.00   │   Due           │
│ │ [RECEIPT]│ │   Ms Jane          │   -2,500.00  │   Advance       │
│ │ VOUCHER  │ │   ...              │              │                  │
│ │          │ │                                                      │
│ │ [PRINT]  │ │                                                      │
│ │          │ │                                                      │
│ │ [VIEW    │ │                                                      │
│ │  PDF]    │ │                                                      │
│ │          │ │                                                      │
│ │ [CANCEL] │ │                                                      │
│ │          │ │                                                      │
│ │  [LOGO]  │ │                                                      │
│ └──────────┘ └──────────────────────────────────────────────────────┤
└──────────────────────────────────────────────────────────────────────┘
```

### Left Panel (Panel1)
| Control | Text | Location (Y) | Purpose |
|---------|------|--------------|---------|
| Label2 | "Outstanding" | -4 | Title banner |
| Button5 | "&NEW RECEIPT" | 49 | Create new receipt from scratch |
| Button2 | "&RECEIPT VOUCHER" | 100 | Create receipt for selected customer |
| Button1 | "&PRINT" | 151 | Preview report |
| Button6 | "&VIEW PDF" | 202 | Generate and open PDF |
| Button4 | "&CANCEL" | 253 | Close form |
| PictureBox1 | - | Bottom | Company logo |

### Top Panel (Panel2)
| Control | Text | Location | Purpose |
|---------|------|----------|---------|
| Button7 | "&Export" | 0,3 | Export grid to Excel |
| find | TextBox | 461,3 | Filter customers by name |
| Label7 | "Filter" | 411,6 | Label for search field |
| Label6 | X icon | 744,2 | Close button (click handler) |

### Main Area (DataGridView1)
- Dock: `DockStyle.Fill`
- Read-only, no add/delete
- Shows outstanding customer list

---

## Core Query Logic

### Primary Data Query

```vb
' In load_grid()
Call SQL_Select("tbl_customer", "id,customer_name,due_amount,ad_due As Status", _
    " due_amount > 0 AND customer_name like '%" & find.Text & "%'", _
    " Order by customer_name")

outstanding_query = "select id,LTRIM(title_name + ' ' + customer_name) As Expr1,due_amount, ad_due,customer_type " & _
    "from tbl_customer where due_amount > 0 AND customer_name like '%" & find.Text & "%' Order by customer_name"
```

**SELECTed Fields**:
| Field | Alias | Purpose |
|-------|-------|---------|
| id | - | Customer ID (hidden) |
| LTRIM(title_name + ' ' + customer_name) | Expr1 | Full name with title |
| due_amount | - | Outstanding amount |
| ad_due | Status | "Due" or "Advance" |

**WHERE Conditions**:
- `due_amount > 0` — Only show customers with balance
- `customer_name LIKE '%{find}%'` — Filter by search term
- Both conditions combined with AND

**ORDER BY**: `customer_name ASC`

---

## Grid Display Logic

### Column Configuration

```vb
.Columns(0).Visible = False           ' ID column hidden
.Columns(1).HeaderText = "Customer Name"
.Columns(2).HeaderText = "Amount"
.Columns(1).Width = 300
.Columns(2).Width = 150
```

### Status-Based Value Formatting

```vb
For i = 0 To ds.Tables(0).Rows.Count - 1
    Dim temp As Double = ds.Tables(0).Rows(i).ItemArray(2).ToString.Replace(",", "")
    
    If ds.Tables(0).Rows(i).ItemArray(3).ToString = "Advance" Then
        .Rows(i).Cells(2).Value = "-" & Format(temp, "0.00")
        tot = tot - temp
    Else
        tot = tot + temp
    End If
Next
```

**Rule**:
- **Advance** (negative balance to customer): Display as `-{amount}`, subtract from total
- **Due** (positive balance owed): Display as `{amount}`, add to total

### Color Coding (DataBindingComplete)

```vb
For i = 0 To ds.Tables(0).Rows.Count - 1
    If .Rows(i).Cells(3).Value = "Advance" Then
        .Rows(i).Cells(3).Style.ForeColor = Color.Green
    ElseIf .Rows(i).Cells(3).Value = "Due" Then
        .Rows(i).Cells(3).Style.ForeColor = Color.Red
    End If
Next
```

---

## Action Buttons

### Button5 — NEW RECEIPT

```vb
Private Sub Button5_Click(...)
    receipt_id = 0
    Receipt_voucher_ID = 0
    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```

**Behavior**: Opens Add_Edit_Receipt for creating a new receipt from scratch. No customer pre-selected.

**Shared Variables Set**:
| Variable | Value |
|----------|-------|
| receipt_id | 0 |
| Receipt_voucher_ID | 0 |

---

### Button2 — RECEIPT VOUCHER

```vb
Private Sub Button2_Click(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    receipt_id = 0
    Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)
    
    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```

**Behavior**: Opens Add_Edit_Receipt pre-loaded with selected customer's balance.

**Validation**: Requires at least one row in grid.

**Shared Variables Set**:
| Variable | Value | Source |
|----------|-------|--------|
| receipt_id | 0 | New receipt |
| Receipt_voucher_ID | Customer ID | `DataGridView1.SelectedRows(0).Cells(0).Value` |
| load_dua_amount | Due amount | `Val(DataGridView1.SelectedRows(0).Cells(2).Value)` |

---

### Double-Click on Row

```vb
Private Sub DataGridView1_MouseDoubleClick(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    receipt_id = 0
    Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)
    
    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```

**Same behavior as Button2** — Receipt Voucher for selected customer.

---

### Button1 — PRINT

```vb
Private Sub Button1_Click(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    Call __show(Preview_Outstanding_Report)
    load_nav_bar("Preview_Outstanding_Report", "Outstanding Report")
End Sub
```

**Behavior**: Opens Preview_Outstanding_Report form.

---

### Button6 — VIEW PDF

```vb
Private Sub Button6_Click(...)
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
    repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call Preview_Outstanding_Report.Preview_Outstanding_Report_Load(sender, e)
    
    Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If
    
    Dim folder_path, pdf_path As String
    Dim file_name As String = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)
    folder_path = quot_path1 & "\Outstanding Reports\"

    If (Not System.IO.Directory.Exists(folder_path)) Then
        System.IO.Directory.CreateDirectory(folder_path)
    End If

    Dim Bytes() As Byte = Preview_Outstanding_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
    pdf_path = quot_path1 & "\Outstanding Reports\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
    
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using

    Preview_Outstanding_Report.ReportViewer2.RefreshReport()
    Preview_Outstanding_Report.Dispose()
    Preview_Outstanding_Report.Close()
    Process.Start(pdf_path)
End Sub
```

**Behavior**:
1. Loads Preview_Outstanding_Report
2. Gets report path from tbl_setting
3. Creates "Outstanding Reports" folder if needed
4. Renders report to PDF
5. Saves with timestamp filename
6. Opens PDF in default viewer

**PDF Path**: `{report_path}/Outstanding Reports/{dd-MM-yyyy HH_mm_ss}.pdf`

**Validation**: Requires selected row with non-empty customer name.

---

### Button7 — Export to Excel

```vb
Private Sub Button7_Click(...)
    Dim saveFileDialog1 As New SaveFileDialog()
    saveFileDialog1.Filter = "Excel |*.xlsx"
    saveFileDialog1.Title = "Save Excle File"
    saveFileDialog1.ShowDialog()

    Dim fnm As String
    If saveFileDialog1.FileName <> "" Then
        fnm = saveFileDialog1.FileName
    Else
        Exit Sub
    End If

    If xlApp Is Nothing Then
        MessageBox.Show("Excel is not properly installed!!")
        Return
    End If

    xlWorkBook = xlApp.Workbooks.Add(misValue)
    xlWorkSheet = xlWorkBook.Sheets("sheet1")

    xlWorkSheet.Cells(1, 1) = "CUSTOMER NAME"
    xlWorkSheet.Cells(1, 2) = "AMOUNT"
    xlWorkSheet.Cells(1, 3) = "STATUS"

    Dim z As Integer = 2
    With DataGridView1
        For j = 0 To .Rows.Count - 1
            xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value
            xlWorkSheet.Cells(z, 2) = .Rows(j).Cells(2).Value
            xlWorkSheet.Cells(z, 3) = .Rows(j).Cells(3).Value
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

Private Sub releaseObject(ByVal obj As Object)
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

**Exported Columns**:
1. CUSTOMER NAME
2. AMOUNT
3. STATUS

---

## Filter Behavior

### Search Field (find)

```vb
Private Sub find_TextChanged(...)
    Call load_grid()
End Sub
```

**Behavior**: On every keystroke, refreshes grid with new filter.

**Filter Logic**:
```sql
WHERE due_amount > 0 AND customer_name LIKE '%{find.Text}%'
```

**Note**: Only filters by customer name. Other fields (customer_type, telephone) not searched — unlike commented-out code in load_grid().

---

## Form Lifecycle Events

### Load

```vb
Private Sub Outstanding_Load(...)
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    Call grids1(DataGridView1)
    Call load_grid()
End Sub
```

**Actions**:
1. Apply font styling (`set_fonr`)
2. Establish SQL connection (`con_sql`)
3. Enable keyboard preview
4. Apply grid styling (`grids1`)
5. Load data (`load_grid`)

---

### Close Handling

**Label6 (X button)**:
```vb
Private Sub Label6_Click(...)
    Me.Dispose()
    Me.Close()
End Sub
```

**Button4 (CANCEL)**:
```vb
Private Sub Button4_Click(...)
    Me.Dispose()
    Me.Close()
End Sub
```

**Escape Key**:
```vb
Private Sub Outstanding_KeyDown(...)
    If e.KeyCode = Keys.Escape Then
        Me.Dispose()
        Me.Close()
    End If
End Sub
```

**On Dispose**:
```vb
Private Sub Outstanding_Disposed(...)
    last_form_close(Me)
End Sub
```

---

## Outstanding.vb vs ListOutStanding.vb

| Aspect | Outstanding.vb | ListOutStanding.vb |
|--------|---------------|-------------------|
| **Purpose** | Balance tracking | Balance tracking |
| **Query** | Identical | Identical |
| **Button Labels** | OLD naming (Button1-7) | Descriptive (BtnNewReceipt, etc.) |
| **Export** | Button7 | BtnExport |
| **Close Button** | Label6 (image) | Label6 (image) |
| **Double-Click** | Opens Receipt | Opens Receipt |
| **Grid Columns** | Customer Name, Amount, Status | Customer Name, Amount, Status |
| **Excel Export** | Via COM interop | Via COM interop |
| **Status Colors** | Green=Advance, Red=Due | Green=Advance, Red=Due |

### Key Difference: Button Layout

**Outstanding.vb** uses numbered buttons:
- Button5 → NEW RECEIPT
- Button2 → RECEIPT VOUCHER
- Button1 → PRINT
- Button6 → VIEW PDF
- Button4 → CANCEL

**ListOutStanding.vb** uses named buttons:
- BtnNewReceipt
- BtnReceiptVoucher
- BtnPrint
- BtnViewPDF
- BtnCancel

---

## GetDueAmount() Function (SQL_CRUD.vb)

```vb
Public Function GetDueAmount(CustomerId As Long) As Double
    Call con_sql()
    
    Dim query As String = $"SELECT
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
            customer_id = {customer_id}
        GROUP BY 
            customer_id"

    Dim ds1 As DataSet = SQL_Query(query)
    If ds1.Tables(0).Rows.Count > 0 Then
        Return Format(Val(ds1.Tables(0).Rows(0).Item("FinalDueAmount").ToString), "0.00")
    Else
        Return 0
    End If
End Function
```

### Calculation Formula

```
FinalDueAmount = SUM(tbl_invoice_main.total) - SUM(tbl_receipt.amount_received)
```

### Returns

| Scenario | Return Value |
|----------|--------------|
| Has invoices + receipts | Calculated difference |
| Has invoices, no receipts | SUM(invoices.total) |
| No invoices | 0 |
| Query returns no rows | 0 |

### Note

This function is defined in SQL_CRUD.vb but is **not directly called** by Outstanding.vb. The Outstanding form reads `due_amount` directly from `tbl_customer`, not calculated via this function.

---

## Global Variables Interaction

| Variable | Set In | Used In | Purpose |
|----------|--------|---------|---------|
| `outstanding_query` | Outstanding.vb, ListOutStanding.vb | Preview_Outstanding_Report | Report query |
| `Receipt_voucher_ID` | Outstanding.vb, ListOutStanding.vb | Add_Edit_Receipt | Pre-load customer |
| `load_dua_amount` | Outstanding.vb, ListOutStanding.vb | Add_Edit_Receipt | Pre-fill amount |
| `receipt_id` | Outstanding.vb | Add_Edit_Receipt | Edit mode flag |
| `is_pdf` | Outstanding.vb, ListOutStanding.vb | Preview_Outstanding_Report | PDF export flag |

---

## Form States

| State | Trigger | Effect |
|-------|---------|--------|
| Load | Form opens | Connects DB, loads grid |
| Filter | Type in find field | Refreshes grid |
| Receipt Voucher | Button2 or double-click | Opens Add_Edit_Receipt |
| New Receipt | Button5 | Opens Add_Edit_Receipt |
| Print | Button1 | Opens report preview |
| View PDF | Button6 | Generates PDF, opens viewer |
| Export | Button7 | Saves Excel file |
| Close | Button4, Label6, Escape | Closes form |

---

## Data Flow Diagram

```
                    Outstanding.vb Load
                            │
                            ▼
                    ┌───────────────┐
                    │  load_grid()  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  SQL_Select   │
                    │  tbl_customer │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Format Grid  │
                    │  Apply Colors │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         ┌────────┐   ┌──────────┐   ┌─────────┐
         │ SEARCH │   │  ACTION  │   │  PRINT  │
         │  find  │   │  BUTTON  │   │ Button1 │
         └────────┘   └────┬─────┘   └────┬────┘
                            │              │
                            ▼              ▼
                    ┌─────────────┐  ┌──────────────┐
                    │Add_Edit_    │  │Preview_     │
                    │Receipt     │  │Outstanding_  │
                    │(ShowDialog)│  │Report        │
                    └─────────────┘  └──────────────┘
```

---

## Related Files

| File | Relationship |
|------|--------------|
| Outstanding.Designer.vb | UI definition |
| ListOutStanding.vb | Similar form with better button names |
| Add_Edit_Receipt.vb | Receipt entry form (called by Outstanding) |
| Preview_Outstanding_Report.vb | Report form (called by Outstanding) |
| SQL_CRUD.vb | Database operations (GetDueAmount defined here) |
| Module1.vb | Global variables (outstanding_query, etc.) |