# Invoice List View — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Invoice/View_Invoice.vb` (348 lines) |
| **Purpose** | List, search, preview, delete invoices |
| **Table** | `tbl_invoice_main`, `tbl_invoice_sub` |
| **Parent** | HOME → Invoice menu |

## Form Architecture

### Class Declaration
```vb
Public Class View_Invoice
```

### Global State
- `invoice_id` — selected invoice for edit/preview
- `customer_id` — customer context
- `print_due_amt_on_invoice` — whether to show due amount on report

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Sets font, loads grid |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close |
| `Move` | Calls `moved(Me)` |
| `Paint` | Calls `admin1(Button3)` |

### Load Logic
```vb
Private Sub View_Invoice_Load(...)
    Call set_fonr(Me, Label2)
    lblTotalRecords.Text = ""
    lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
    Call con_sql()
    Me.KeyPreview = True
    Call load_grid_sql()
End Sub
```

## UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Invoice" |
| `Label6` | Label | Close button (X) |
| `Button1` | Button | Add new invoice |
| `Button2` | Button | Edit invoice |
| `Button3` | Button | Delete invoice |
| `Button4` | Button | Close |
| `Button5` | Button | Preview & save PDF |
| `Button6` | Button | Export PDF & open |
| `Button7` | Button | Zoom in |
| `Button8` | Button | Zoom out |
| `Button9` | Button | Set background |
| `find` | TextBox | Search filter |
| `DataGridView1` | DataGridView | Invoice list |
| `lblTotalRecords` | Label | Record count |
| `Panel3` | Panel | Report preview panel |

## Data Loading (`load_grid_sql()`)

```vb
Public Sub load_grid_sql()
    Call grids1(DataGridView1)
    Call SQL_Query("SELECT tbl_invoice_main.id, tbl_invoice_main.invoice_no,
        tbl_invoice_main.invoice_date, tbl_customer.customer_name,
        tbl_invoice_main.checklist_no, tbl_invoice_main.total, tbl_invoice_main.customer_id,
        CAST(CONVERT(VARCHAR, CAST(SUM(tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount) AS MONEY), 1) AS VARCHAR), 
        tbl_invoice_main.cr_dr
        FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id",
        " where tbl_customer.customer_name like '%" & find.Text & "%' 
          or tbl_invoice_main.invoice_no like '%" & find.Text & "%' 
          or tbl_invoice_main.checklist_no like '%" & find.Text & "%' 
        Group by ... order by tbl_invoice_main.id Desc")
    
    ' Display with custom formatting...
    .Columns(0).Visible = False  ' ID
    .Columns(6).Visible = False  ' customer_id
    .Columns(5).Visible = False  ' total (redundant)
    .Columns(8).Visible = False  ' cr_dr
    .Columns(1).HeaderText = "Invoice NO"
    .Columns(1).Width = 30
    .Columns(2).HeaderText = "Date"
    .Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
    .Columns(3).HeaderText = "Customer Name"
    .Columns(4).HeaderText = "Checklist No"
    .Columns(7).HeaderText = "Total"
    lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
End Sub
```

**Search**: customer_name, invoice_no, checklist_no

## Actions

### Add (Button1)
```vb
Private Sub Button1_Click(...)
    invoice_id = 0
    customer_id = 0
    Call __show(Add_Edit_Invoice)
    load_nav_bar("Add_Edit_Invoice", "Add Invoice")
End Sub
```

### Edit (Button2 → edit1())
```vb
Public Sub edit1()
    invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Invoice)
    load_nav_bar("Add_Edit_Invoice", "Edit Invoice")
End Sub

Private Sub DataGridView1_MouseDoubleClick(...)
    Call edit1()
End Sub

Private Sub DataGridView1_KeyDown(...)
    If e.KeyCode = Keys.Enter Then
        Call edit1()
        e.SuppressKeyPress = True
    End If
End Sub
```

### Preview & Save PDF (Button5)
```vb
Private Sub Button5_Click(...)
    invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    ' Get print_due setting
    Dim print_due As String = get_single_value("print_due", "tbl_invoice_main", "id", invoice_id)
    If print_due = "True" Then
        print_due_amt_on_invoice = True
    ElseIf print_due = "False" Then
        print_due_amt_on_invoice = False
    End If
    
    ' Load report
    Demo_Add_Edit.Add_Edit_Invoice_Load(sender, e)
    Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
    
    ' Get save path
    Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Invoice Save Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If
    
    ' Build PDF path: {path}/{MonthName}/{file_name}.pdf
    Dim msmsms As String = get_single_value("title_name", "tbl_customer", "id", customer_id)
    user_name = msmsms & " " & DataGridView1.SelectedRows(0).Cells(3).Value.ToString
    Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
    Dim file_name As String = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", invoice_id) & "-" & user_name
    folder_path = quot_path1 & "\" & MonthName(iMonth)
    
    ' Create folder if not exists
    If (Not System.IO.Directory.Exists(folder_path)) Then
        System.IO.Directory.CreateDirectory(folder_path)
    End If
    
    Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", ...)
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
    
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    
    ' Show preview
    Call __show(Preview_Invoice_Report)
    load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
End Sub
```

### Export PDF & Open (Button6)
```vb
Private Sub Button6_Click(...)
    is_pdf = True
    invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    ' Get print_due setting (same as Button5)
    Dim print_due As String = get_single_value("print_due", "tbl_invoice_main", "id", invoice_id)
    If print_due = "True" Then
        print_due_amt_on_invoice = True
    ElseIf print_due = "False" Then
        print_due_amt_on_invoice = False
    End If
    
    ' Load report
    Demo_Add_Edit.Add_Edit_Invoice_Load(sender, e)
    Demo_Add_Edit.pdf()  ' Generate PDF
    
    ' Save and open
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    
    ' Dispose form before opening
    Dim frm As Form = Preview_Invoice_Report
    frm.Dispose()
    frm.Close()
    
    Process.Start(pdf_path)
    Demo_Add_Edit.Dispose()
    invoice_id = 0
    customer_id = 0
End Sub
```

### Delete (Button3)
```vb
Private Sub Button3_Click(...)
    invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    Dim ask As String = MsgBox("Are You Sure Want to Delete Invoice Details?", vbQuestion + vbYesNo)
    If ask = "6" Then
        ' Adjust customer due_amount
        Dim cur_due_amount As String = get_single_value("due_amount", "tbl_customer", "id", customer_id)
        Dim entry_due_amunt As String = Val(DataGridView1.SelectedRows(0).Cells(7).Value.ToString.Replace(",", ""))
        Dim cr_dr As String = DataGridView1.SelectedRows(0).Cells(8).Value
        
        Dim final_amt As Double = 0
        If cr_dr = "Cr." Then
            final_amt = Val(Val(cur_due_amount) + Val(entry_due_amunt))
        ElseIf cr_dr = "Dr." Then
            final_amt = Val(Val(cur_due_amount) - Val(entry_due_amunt))
        End If
        
        ' Update customer balance
        Dim variable As New Dictionary(Of String, String)
        variable.Add("due_amount", "'" & Val(final_amt) & "'")
        Call SQL_Update("tbl_customer", variable, " id='" & customer_id & "'")
        
        ' Delete invoice
        Call SQL_Delete("tbl_invoice_main", " id='" & invoice_id & "'")
        Call SQL_Delete("tbl_invoice_sub", " main_id='" & invoice_id & "'")
        
        MsgBox("Invoice Successfully Deleted.", vbInformation)
        Call load_grid_sql()
    End If
End Sub
```

**Delete Logic**: Adjusts customer due_amount based on CR/DR before deleting.

## Grid Styling

```vb
.Columns(1).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(1).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(4).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(7).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
.Columns(7).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
.Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
.Columns(2).DisplayIndex = 1  ' Move date before ID
.Columns(1).DisplayIndex = 3  ' Move invoice no after date
```

## Panel Controls (Report Preview)

```vb
Button7_Click: ' Zoom in
Panel3.Top = CInt((Panel3.Top - (Panel3.Height * 0.025)))
Panel3.Left = CInt((Panel3.Left - (Panel3.Width * 0.025)))
Panel3.Height = CInt((Panel3.Height + (Panel3.Height * 0.05)))
Panel3.Width = CInt((Panel3.Width + (Panel3.Width * 0.05)))

Button8_Click: ' Zoom out (reverse)

Button9_Click: ' Set background image
Panel3.BackgroundImage = Image.FromFile(Application.StartupPath & "\Resources\Report.jpg 02.jpg")
Panel3.BackgroundImageLayout = ImageLayout.Stretch
```

## Key Implementation Details

| Detail | Value |
|--------|-------|
| Delete | Reverses customer due_amount (CR adds, DR subtracts) |
| Preview | Uses Demo_Add_Edit form to generate RDLC |
| PDF Path | `{Invoice_path}/{MonthName}/INV{invoice_no}-{customer}.pdf` |
| cr_dr | Credit/Debit indicator from invoice |
| Search | Real-time LIKE on customer_name, invoice_no, checklist_no |

## Data Flow

```
View_Invoice (list)
├── Add → Add_Edit_Invoice (invoice_id=0)
├── Edit → Add_Edit_Invoice (invoice_id=selected)
├── Delete → Adjust customer due, delete invoice
├── Preview (Button5) → Generate PDF + Show Preview_Invoice_Report
└── Export (Button6) → Generate PDF + Open in default viewer
```