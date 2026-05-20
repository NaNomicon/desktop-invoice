# View List of Receipt — Specification

## Overview
**File**: `Outstanding/View_List_of_Receipt.vb`  
**Purpose**: Display all receipt vouchers with search, edit, preview, delete, email, and PDF export capabilities  
**Access**: Menu → Outstanding → View List of Receipt

## Data Flow
```
Load Form
    ↓
Query: tbl_receipt INNER JOIN tbl_customer
    ↓
Display: DataGridView1 (searchable by customer_name or receipt_no)
    ↓
Actions: Add | Edit | Delete | Preview | Email | Save PDF
```

---

## UI Components

### Controls
| Control | Type | Purpose |
|---------|------|---------|
| `find` | TextBox | Search filter for customer name or receipt number |
| `DataGridView1` | DataGridView | Receipt list display |
| `lblTotalRecords` | Label | Total count display ("Total : X") |
| `Button1` | Button | Add New Receipt |
| `Button2` | Button | Edit Selected Receipt |
| `Button3` | Button | Delete Selected Receipt |
| `Button4` | Button | Close |
| `Button5` | Button | PRINT |
| `Button6` | Button | E-MAIL |
| `Button7` | Button | PDF |
| `Label2` | Label | Title |
| `Label6` | Label | Close button |

### DataGridView1 Columns
| Index | Header | Visible | Content |
|-------|--------|---------|---------|
| 0 | id | Hidden | Receipt ID |
| 1 | Receipt No | Visible | Receipt number |
| 2 | Receipt Date | Visible | Date (format: dd-MM-yyyy) |
| 3 | Customer Name | Visible | Customer full name |
| 4 | Amount Received | Visible | Payment amount (right-aligned, #,0.00) |
| 5 | (hidden) | Hidden | Internal reference |
| 6 | Due Amount | Visible | Customer's due amount after payment (right-aligned, #,0.00) |
| 7 | Cheque No | Visible | Cheque reference |
| 8 | (hidden) | Hidden | Customer ID |

---

## Logic

### Load Grid (load_grid_sql)
```vb
Public Sub load_grid_sql()
    Call grids11(DataGridView1)  ' Apply styling
    
    query = "SELECT tbl_receipt.id, tbl_receipt.receipt_no, tbl_receipt.receipt_date," &
            " tbl_customer.customer_name, tbl_receipt.amount_received, tbl_receipt.no," &
            " tbl_customer.due_amount, tbl_receipt.cheque_no, tbl_customer.id " &
            "FROM tbl_customer INNER JOIN tbl_receipt ON tbl_customer.id = tbl_receipt.customer_id " &
            "WHERE tbl_customer.customer_name LIKE '%" & find.Text & "%' OR " &
            "tbl_receipt.receipt_no LIKE '" & find.Text & "%' " &
            "ORDER BY tbl_receipt.receipt_no DESC, tbl_receipt.receipt_date DESC"
    
    SQL_Query(query)
    DataGridView1.DataSource = ds.Tables(0)
    
    ' Styling and formatting
    .Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
    .Columns(4).DefaultCellStyle.Format = "#,0.00"
    .Columns(6).DefaultCellStyle.Format = "#,0.00"
    
    lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
End Sub
```

### Grid Styling (grids11)
```vb
Public Sub grids11(ByRef grids As DataGridView)
    With grids
        .Font = New Font("Franklin Gothic Book", 11)
        .RowTemplate.Height = 30
        .ColumnHeadersHeight = 45
        .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
        .SelectionMode = DataGridViewSelectionMode.FullRowSelect
        .DefaultCellStyle.SelectionBackColor = Color.LightSkyBlue
        .CellBorderStyle = DataGridViewCellBorderStyle.Single
    End With
End Sub
```

---

## Actions

### Button1: Add New Receipt
```vb
Private Sub Button1_Click()
    Receipt_voucher_ID = 0
    customer_id = 0
    receipt_id = 0
    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```

### Button2: Edit Receipt
```vb
Private Sub Button2_Click()
    Call edit1()
End Sub

Public Sub edit1()
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    Receipt_voucher_ID = 0
    receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Receipt)
    load_nav_bar("Add_Edit_Receipt", "Edit Receipt")
End Sub
```

### Button3: Delete Receipt
```vb
Private Sub Button3_Click()
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Receipt Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    ask = MsgBox("Are You Sure Want to Delete Receipt?", vbQuestion + vbYesNo)
    If ask = "6" Then  ' Yes
        SQL_Delete("tbl_receipt", " id='" & receipt_id & "'")
        MsgBox("Receipt Successfully Deleted.", vbInformation)
        Call load_grid_sql()
    End If
End Sub
```

### Button5: Preview Receipt
```vb
Private Sub Button5_Click()
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
    customer_id = DataGridView1.SelectedRows(0).Cells(8).Value
    
    ' Load receipt preview
    Preview_Receipt.Preview_Receipt_Load(sender, e)
    
    ' Get report path
    quot_path1 = get_single_value("report_path", "tbl_setting", ...)
    
    ' Create folder structure
    user_name = DataGridView1.SelectedRows(0).Cells(3).Value  ' Customer name
    folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
    
    ' PDF filename: "PAY[receipt_no]-[customer_name].pdf"
    pdf_path = folder_path & "\" & file_name & ".pdf"
    
    ' Render and save
    Bytes = Preview_Receipt.ReportViewer2.LocalReport.Render("PDF", ...)
    
    ' Show preview
    Call __show(Preview_Receipt)
    load_nav_bar("Preview_Receipt", "Preview Receipt")
End Sub
```

### Button6: Email Receipt PDF
```vb
Private Sub Button6_Click()
    is_pdf = True
    
    ' Same PDF generation as Button5
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
    
    ' Load email template (identify = "RECEIPT")
    direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
    direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
    direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
    temp_id = get_single_value("id", "tbl_email", "identify", "RECEIPT")
    direct_email.sender_id = get_single_value("sender", "tbl_email", "id", Val(temp_id))
    direct_email.Subject = get_single_value("subject", "tbl_email", "id", Val(temp_id))
    direct_email.body = get_single_value("body", "tbl_email", "id", Val(temp_id))
    direct_email.attach = pdf_path
    
    ' Template replacements
    title = get_single_value("title_name", "tbl_customer", "id", customer_id)
    direct_email.body = body.Replace("<name>", title & " " & user_name & ",")
    direct_email.body = body.Replace("<date>", Format(Date.Now, "dd.MM.yyyy") & ".")
    Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
    If contact = "" Then
        direct_email.body.Text = body.Replace("<contact person>", "")
    Else
        direct_email.body.Text = body.Replace("<contact person>", contact)
    End If
    
    Preview_Receipt.Dispose()
    Preview_Receipt.Close()
    direct_email.ShowDialog()
End Sub
```

### Button7: Save PDF Only
```vb
Private Sub Button7_Click()
    ' Same PDF generation as Button5
    pdf_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
    
    ' Different folder: \Receipt\ prefix
    folder_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name
    
    ' Show save location
    MsgBox(pdf_path, vbInformation)
    
    Preview_Receipt.Dispose()
    Preview_Receipt.Close()
End Sub
```

---

## Database Query

### Main Receipt Query
```sql
SELECT tbl_receipt.id, 
       tbl_receipt.receipt_no, 
       tbl_receipt.receipt_date,
       tbl_customer.customer_name, 
       tbl_receipt.amount_received, 
       tbl_receipt.no,
       tbl_customer.due_amount,
       tbl_receipt.cheque_no,
       tbl_customer.id
FROM tbl_customer 
INNER JOIN tbl_receipt ON tbl_customer.id = tbl_receipt.customer_id
WHERE tbl_customer.customer_name LIKE '%{search_term}%' 
   OR tbl_receipt.receipt_no LIKE '{search_term}%'
ORDER BY tbl_receipt.receipt_no DESC, tbl_receipt.receipt_date DESC
```

### Related Queries
```sql
-- Get customer email for email feature
SELECT email FROM tbl_customer WHERE id = {customer_id}

-- Get receipt details
SELECT * FROM tbl_receipt WHERE id = {receipt_id}

-- Get email template for RECEIPT
SELECT * FROM tbl_email WHERE identify = 'RECEIPT'
```

---

## Events

| Event | Handler | Action |
|-------|---------|--------|
| Form Load | `View_Invoice_Load` | Initialize, set font, call `load_grid_sql()` |
| Dispose | `View_Invoice_Disposed` | Call `last_form_close(Me)` |
| KeyDown (Escape) | `View_Invoice_KeyDown` | Close form |
| Move | `View_Invoice_Move` | Call `moved(Me)` |
| Paint | `View_Invoice_Paint` | Call `admin1(Button3)` (hide if no admin rights) |
| find TextChanged | `find_TextChanged` | Refresh grid |
| Button1 Click | `Button1_Click` | Open Add_Edit_Receipt |
| Button2 Click | `Button2_Click` | Edit selected receipt |
| Button3 Click | `Button3_Click` | Delete selected receipt |
| Button4 Click | `Button4_Click` | Close form |
| Button5 Click | `Button5_Click` | Preview receipt |
| Button6 Click | `Button6_Click` | Email receipt PDF |
| Button7 Click | `Button7_Click` | Save PDF |
| DataGridView1 KeyDown | `DataGridView1_KeyDown` | Enter to edit |
| DataGridView1 DoubleClick | `DataGridView1_MouseDoubleClick` | Edit receipt |

---

## Key Implementation Details

### Folder Structure
```
{report_path}\
  ├── {MonthName}\
  │   └── {CustomerName}\
  │       └── PAY{receipt_no}-{CustomerName}.pdf
  
  └── Receipt\
      └── {MonthName}\
          └── {CustomerName}\
              └── PAY{receipt_no}-{CustomerName}.pdf
```

### PDF Filename Convention
```
"PAY" & [receipt_no] & "-" & [customer_name] & ".pdf"
Example: "PAY2024001-John Doe.pdf"
```

### Month Folders
```vb
iMonth = Month(DataGridView1.SelectedRows(0).Cells(2).Value)
folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
```

### Search Behavior
- Uses LIKE for partial match on customer_name
- Uses LIKE with wildcard suffix for receipt_no
- Refreshes on every keystroke

### Due Amount Update on Delete
**Note**: The commented-out code suggests there was logic to update customer's due_amount when deleting a receipt, but it's not active:
```vb
' 'Dim cur_due_amount As String = get_single_value("due_amount", "tbl_customer", ...)
' 'Dim entry_due_amunt As String = Math.Round(Val(DataGridView1.SelectedRows(0).Cells(7).Value))
' 'Dim final_amt As Double = Val(cur_due_amount - entry_due_amunt)
```

Current behavior: Delete simply removes the receipt record.

---

## Related Forms

| Form | File | Relationship |
|------|------|--------------|
| Add_Edit_Receipt | `Outstanding/Add_Edit_Receipt.vb` | Receipt creation/editing (called from Button1/Button2) |
| Preview_Receipt | `Reports/Preview_Receipt.vb` | RDLC receipt report |
| direct_email | `Email/direct_email.vb` | Email sending dialog |

---

## Notes
- View_List_of_Receipt is similar to Outstanding.vb/ListOutStanding.vb but focused on receipts rather than outstanding invoices
- The search filters both customer name (partial) and receipt number (prefix match)
- Button3 deletion does NOT update customer's due_amount in current implementation
- Admin rights check (`admin1(Button3)`) hides delete button for non-admin users
- Receipt preview auto-saves PDF before showing the ReportViewer