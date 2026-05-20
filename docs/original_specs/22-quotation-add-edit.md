# Quotation Create/Edit — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Quotation/Add_Edit_Quotation.vb` (974 lines) |
| **Purpose** | Create and edit quotations |
| **Table** | `tbl_quotation_main`, `tbl_quotation_sub` |
| **Related** | `View_Quotation`, `Preview_Quotation_Report`, `Quotation_Report` |

## Relationship to Invoice

Quotation mirrors Invoice structure with key differences:
- No invoice_type (always QUOTATION)
- No paid status
- Auto-generates PDF to save path after save
- Can convert to Invoice via `Quotation_To_Invoice_ID`

## Form Architecture

### Class Declaration
```vb
Public Class Add_Edit_Quotation
```

### Global State
- `quotation_id` — 0 = Add, >0 = Edit
- `customer_id` — Selected customer
- `customer_idq` — Customer ID variant
- `new_pro_key_quo` — Trigger auto-fill into quotation

### Module Variables
```vb
Dim check_per_vat As String = ""
Dim vat_per_value As String = ""
Dim contain_id As String = ""  ' Deleted row IDs for cleanup
Dim msmsms As String = ""      ' Title name for PDF path
Dim ttt As Char = ""
Dim nnn As Boolean = False
Dim exportPDFPath As String = ""
```

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Initialize grid, load customer/type combos, set VAT visibility |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape closes (handles item search mode) |
| `Move` | Calls `moved(Me)` |

### Load Logic
```vb
Private Sub Add_Edit_Quotation_Load(...)
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    grids1(DataGridView2)
    Call load_customer()
    load_item_type()
    Call count_row_col()
    quo_no.Text = get_single_value("quo_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
    
    If quotation_id > 0 Then
        Label2.Text = "Edit Invoice"
        Call load_data()
    End If
    
    ' VAT visibility based on settings
    check_per_vat = get_single_value("isvat", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If check_per_vat = 0 Then
        Label11.Visible = False
        vat_per.Visible = False
        vat.Visible = False
    ElseIf check_per_vat = 1 Then
        Label11.Visible = True
        vat_per.Visible = True
        vat.Visible = True
        vat_per.Text = get_single_value("vat_per", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    End If
    cal()
End Sub
```

## UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Add Quotation" / "Edit Invoice" |
| `customer_name` | TextBox | Customer name (triggers search) |
| `txt_search` | TextBox | Hidden customer search input |
| `DataGridView1` | DataGridView | Customer search results |
| `quo_no` | TextBox | Quotation number (auto-generated) |
| `checklist_no` | TextBox | Optional checklist number |
| `quo_date` | DateTimePicker | Quotation date |
| `DataGridView2` | DataGridView | Line items |
| `find_item` | TextBox | Product search input |
| `load_item` | DataGridView | Product search results |
| `load_type` | ComboBox | Filter by product type |
| `all_type` | CheckBox | Show all product types |
| `sub_total` | TextBox | Calculated subtotal (read-only) |
| `vat_per` | TextBox | VAT percentage |
| `vat` | TextBox | VAT amount (calculated) |
| `per` | TextBox | Discount percentage |
| `discount` | TextBox | Discount amount |
| `total_amt` | TextBox | Total amount |
| `amount_due` | TextBox | Customer's outstanding amount |
| `Button1` | Button | Save & Close |
| `Button2` | Button | Cancel |
| `Button3` | Button | Quick add customer |
| `Button4` | Button | Save & Preview |
| `Button5` | Button | Reset form |
| `Button6` | Button | Save & Email |
| `Button7` | Button | Quick add product |

## Grid Structure (DataGridView2)

```vb
Public Sub count_row_col()
    With DataGridView2
        .ColumnCount = 7
        .RowCount = 1
        .Columns(0).HeaderText = "Sr.No."
        .Columns(0).Width = 20
        .Columns(0).ReadOnly = True
        .Columns(1).HeaderText = "Product Name & Description"
        .Columns(1).Width = 160
        .Columns(1).ReadOnly = True
        .Columns(2).HeaderText = "Qty"
        .Columns(2).Width = 30
        .Columns(3).HeaderText = "Unit Price"
        .Columns(3).Width = 50
        .Columns(3).ReadOnly = True
        .Columns(4).HeaderText = "Total"
        .Columns(4).Width = 60
        .Columns(4).ReadOnly = True
        .Columns(5).Visible = False  ' Product ID
        .Columns(6).Visible = False  ' Line item ID
        .Rows(0).Cells(1).Value = "Type Product Name"
    End With
End Sub
```

## Data Loading (`load_data()`)

```vb
Public Sub load_data()
    ' Load quotation main
    Call SQL_Query("SELECT ... FROM tbl_quotation_main INNER JOIN tbl_customer ...", 
        " where tbl_quotation_main.id='" & quotation_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        customer_id = Val(ds.Tables(0).Rows(0).Item("customer_id"))
        customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name")
        quo_no.Text = ds.Tables(0).Rows(0).Item("quo_no")
        ' ... load all fields
        amount_due.Text = get_single_value("due_amount", "tbl_customer", "id", customer_id)
    End If
    
    ' Load quotation sub (line items)
    Call SQL_Query("SELECT ... FROM tbl_quotation_sub INNER JOIN tbl_product ...", 
        " where tbl_quotation_sub.main_id='" & quotation_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        DataGridView2.RowCount = ds.Tables(0).Rows.Count + 1
        For i = 0 To ds.Tables(0).Rows.Count - 1
            .Rows(i).Cells(1).Value = product_name
            .Rows(i).Cells(2).Value = qty
            .Rows(i).Cells(3).Value = unit_price
            .Rows(i).Cells(4).Value = row_total
            .Rows(i).Cells(5).Value = product_id
            .Rows(i).Cells(6).Value = line_id
        Next
    End If
    Call load_sr()
    Call cal()
End Sub
```

## Calculation Engine (`cal()`)

```vb
Public Sub cal()
    With DataGridView2
        Dim total As Double = 0
        For i = 0 To .Rows.Count - 1
            Dim qty As Double = Val(.Rows(i).Cells(2).Value)
            .Rows(i).Cells(2).Value = Format(qty, "0.00")
            
            Dim temp As Double = Val(Val(.Rows(i).Cells(2).Value) * Val(.Rows(i).Cells(3).Value))
            .Rows(i).Cells(4).Value = Format(temp, "0.00")  ' Row total = qty * price
            
total = total + Val(.Rows(i).Cells(4).Value)
            ' Format unit price
            temp = Val(.Rows(i).Cells(3).Value)
            .Rows(i).Cells(3).Value = Format(temp, "0.00")
        Next
        sub_total.Text = Format(total, "0.00")
        Dim new_tot As Double = Val(sub_total.Text)
        Dim vat_per1, vat1 As Double
        vat_per1 = Val(vat_per.Text)
        vat1 = Val(Val(new_tot * vat_per1) / 100)
        vat.Text = Format(vat1, "0.00")
        If Val(per.Text) = 0 Then
            ' No discount
        Else
            discount.Text = Format(Val(Val(Val(new_tot + vat1) * Val(per.Text)) / 100), "0.00")
        End If
        ' Re-format discount text
        discount.Text = Format(Val(discount.Text), "0.00")
        Dim temp_tot As Double = Format(Val(new_tot + vat1) - Val(discount.Text), "0.00")
        total_amt.Text = Format(Val(temp_tot), "0.00")
    End With
End Sub
```

## Customer Selection

### Search Flow
```vb
Private Sub customer_name_KeyDown(...)
    txt_search.Visible = True
    txt_search.Focus()
End Sub

Private Sub txt_search_TextChanged(...)
    load_customer()
End Sub

Public Sub load_customer()
    If txt_search.TextLength > 0 Then
        DataGridView1.Visible = True
        Call SQL_Select("tbl_customer", " id,customer_name ", 
            " customer_name like '%" & txt_search.Text & "%' 
             OR telephone like '%" & txt_search.Text & "%' 
             OR contact like '%" & txt_search.Text & "%' 
             OR address like '%" & txt_search.Text & "%'", 
            " Order By customer_name")
        ' Display in DataGridView1
    End If
End Sub

Public Sub event_for_customer()
    customer_name.Text = .Rows(.CurrentRow.Index).Cells(1).Value
    customer_id = .Rows(.CurrentRow.Index).Cells(0).Value
    amount_due.Text = Format(get_single_value("due_amount", "tbl_customer", "id", customer_id), "0.00")
    txt_search.Visible = False
    txt_search.Text = ""
    DataGridView1.Visible = False
    quo_no.Focus()
End Sub
```

**Search Fields**: customer_name, telephone, contact, address

## Product Selection

### Search Flow
```vb
Private Sub DataGridView2_KeyDown(...)
    If DataGridView2.CurrentCell.ColumnIndex = 1 Then
        If e.KeyCode <> navigation_keys Then
            find_item.Visible = True
            find_item.Focus()
        End If
    End If
End Sub

Private Sub find_item_TextChanged(...)
    find_item.Visible = True
    load_item.Visible = True
    c_row = DataGridView2.CurrentCell.RowIndex
    c_col = DataGridView2.CurrentCell.ColumnIndex
    Call load_items()
End Sub

Public Sub load_items()
    Call grids1(load_item)
    If all_type.Checked = True Then
        Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", 
            " (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", 
            " Order By product_id")
    Else
        ' Filter by selected type
        Dim ids As String = get_single_value("id", "tbl_product_type", "type_name", load_type.Text)
        Call SQL_Select("tbl_product", ..., " type_id='" & Val(ids) & "' and ...", ...)
    End If
End Sub

Public Sub key_down_()
    With load_item
        DataGridView2.Rows(c_row).Cells(5).Value = .Rows(.CurrentRow.Index).Cells(0).Value  ' Product ID
        DataGridView2.Rows(c_row).Cells(1).Value = .Rows(.CurrentRow.Index).Cells(2).Value  ' Product Name
        DataGridView2.Rows(c_row).Cells(3).Value = .Rows(.CurrentRow.Index).Cells(3).Value  ' Unit Price
        DataGridView2.Rows(c_row).Cells(2).Value = 1  ' Default qty
    End With
    load_item.Visible = False
    find_item.Visible = False
    find_item.Text = ""
    Call load_sr()
    Call cal()
End Sub
```

## Save Logic (`saved()`)

```vb
Public Sub saved()
    msmsms = get_single_value("title_name", "tbl_customer", "id", customer_id)
    
    Dim variable As New Dictionary(Of String, String)
    variable.Add("customer_id", "'" & Val(customer_id) & "'")
    variable.Add(quo_no.Name, "'" & quo_no.Text & "'")
    variable.Add(checklist_no.Name, "'" & checklist_no.Text & "'")
    variable.Add(sub_total.Name, "'" & Val(sub_total.Text) & "'")
    variable.Add(amount_due.Name, "'" & Val(amount_due.Text) & "'")
    variable.Add(discount.Name, "'" & Val(discount.Text) & "'")
    variable.Add("total", "'" & Val(total_amt.Text) & "'")
    variable.Add(per.Name, "'" & Val(per.Text) & "'")
    variable.Add(vat.Name, "'" & Val(vat.Text) & "'")
    variable.Add(quo_date.Name, "'" & Format(quo_date.Value, "dd-MMM-yyyy") & "'")
    
    If quotation_id > 0 Then
        SQL_Update("tbl_quotation_main", variable, "id=" & quotation_id)
    Else
        SQL_Insert("tbl_quotation_main", variable)
    End If
    
    ' Get main_id for line items
    Dim main_id As Double = 0
    If quotation_id > 0 Then
        main_id = quotation_id
    Else
        main_id = get_max_number("id", "tbl_quotation_main")
    End If
    
    ' Save line items
    For i = 0 To DataGridView2.Rows.Count - 1
        If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Press Enter Key" Then GoTo kkk
        
        Dim qty, product_id, unit_price, row_total, load_id, sr_no As Double
        qty = Val(.Rows(i).Cells(2).Value)
        unit_price = Val(.Rows(i).Cells(3).Value)
        row_total = Val(.Rows(i).Cells(4).Value)
        product_id = Val(.Rows(i).Cells(5).Value)
        load_id = Val(.Rows(i).Cells(6).Value)
        sr_no = Val(.Rows(i).Cells(0).Value)
        
        If load_id > 0 Then
            ' UPDATE existing line
            q = "update tbl_quotation_sub set qty='" & qty & "',product_id='" & product_id & "'
                 ,unit_price='" & unit_price & "',row_total='" & row_total & "',s_no='" & sr_no & "' 
                 where id='" & load_id & "'"
        Else
            ' INSERT new line
            q = "insert into tbl_quotation_sub(main_id,qty,product_id,unit_price,row_total,s_no) 
                 values ('" & main_id & "','" & qty & "','" & product_id & "','" & unit_price & "','" & row_total & "','" & sr_no & "')"
        End If
        cmd.ExecuteNonQuery()
kkk:
    Next
    
    ' Update quotation number counter
    If invoice_id = 0 Then
        Dim q As String = "update tbl_numbers set quo_no='" & Val(quo_no.Text) + 1 & "' 
            where id='" & get_max_number("id", "tbl_numbers") & "'"
        cmd.ExecuteNonQuery()
    End If
    
    ' Delete removed line items (stored in contain_id)
    aryTextFile = contain_id.Split(",")
    For i1 = 0 To UBound(aryTextFile)
        Dim id As Double = Val(aryTextFile(i1))
        If id > 0 Then
            m = "delete from tbl_quotation_sub where id='" & id & "'"
            cmd.ExecuteNonQuery()
        End If
    Next
End Sub
```

## Save Actions

### Button1: Save & Close
```vb
Private Sub Button1_Click(...)
    ' Validations...
    Call saved()
    Call View_Quotation.load_grid_sql()
    If quotation_id > 0 Then
        ' Edit mode - no auto PDF
    Else
        quotation_id = get_max_number("id", "tbl_quotation_main")
    End If
    Call View_Invoice.load_grid_sql()
    ExportToPDF()  ' Auto-generate PDF
    Me.Dispose()
    Me.Close()
End Sub
```

### Button4: Save & Preview
```vb
Private Sub Button4_Click(...)
    ' Validations
    If customer_id = 0 Or customer_name.Text = "" Then
        MsgBox("Please Select Customer", vbCritical, "WARNING")
        customer_name.Focus()
        Exit Sub
    End If
    If quo_no.Text = "" Then
        MsgBox("Please Enter Quotation Number", vbCritical, "WARNING")
        quo_no.Focus()
        Exit Sub
    End If
    If DataGridView2.Rows.Count <= 1 Then
        MsgBox("No Items Added", vbCritical, "WARNING")
        Exit Sub
    End If
    
    Call saved()
    If quotation_id > 0 Then
        quotation_id = quotation_id
    Else
        quotation_id = get_max_number("id", "tbl_quotation_main")
    End If
    ExportToPDF()  ' Generate PDF to file
    Call __show(Preview_Quotation_Report)  ' Show preview
    Call load_nav_bar("Preview_Quotation_Report", "Preview Quotation")
    Call View_Quotation.load_grid_sql()
    Me.Dispose()
    Me.Close()
End Sub
```

### Button6: Save & Email
```vb
Private Sub Button6_Click(...)
    Button6.Text = "Sending...."
    is_pdf = True
    Call saved()
    ExportToPDF()
    
    ' Pre-fill email form from tbl_email template
    direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
    Dim temp_id As String = get_single_value("id", "tbl_email", "identify", "QUOTATION")
    direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", Val(temp_id))
    direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", Val(temp_id))
    direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
    direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
    direct_email.body.Text = get_single_value("body", "tbl_email", "id", Val(temp_id))
    direct_email.attach.Text = exportPDFPath
    
    ' Replace placeholders
    direct_email.body.Text = direct_email.body.Text.Replace("<date>", Format(quo_date.Value, "dd.MM.yyyy") & ".")
    direct_email.body.Text = direct_email.body.Text.Replace("invoice", "quotation")
    Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
    If contact = "" Then
        direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", "")
    Else
        direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", contact)
    End If
    
    Call direct_email.ShowDialog()
    Me.Dispose()
    Me.Close()
End Sub
```

## PDF Export (`ExportToPDF()`)

```vb
Private Sub ExportToPDF()
    Dim FrmPreview_Quotation_Report As New Preview_Quotation_Report()
    Call FrmPreview_Quotation_Report.Preview_Quotation_Report_Load(Nothing, Nothing)
    
    Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If
    
    user_name = msmsms & " " & customer_name.Text
    Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
    Dim iMonth As Integer = Month(quo_date.Value)
    folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
    
    System.IO.Directory.CreateDirectory(folder_path)
    
    Dim Bytes() As Byte = FrmPreview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", ...)
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
    exportPDFPath = pdf_path
    
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    
    FrmPreview_Quotation_Report.Dispose()
End Sub
```

**PDF Path Structure**: `{quot_path}/{MonthName}/{title customer_name}/QUO{quo_no}-{title customer_name}.pdf`

## Row Deletion

```vb
Private Sub DataGridView2_KeyDown(...)
    If (e.KeyCode = Keys.D AndAlso e.Modifiers = Keys.Control) Then
        ' Ctrl+D to delete row
        c_row = .CurrentCell.RowIndex
        If DataGridView2.Rows(c_row).Cells(6).Value > 0 Then
            contain_id = contain_id & "," & Val(DataGridView2.Rows(c_row).Cells(6).Value)  ' Store for later delete
            DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
        Else
            DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
        End If
        Call load_sr()
        Call cal()
    End If
End Sub
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+I | Insert new row |
| Ctrl+D | Delete current row |
| Tab | Move to next field |
| Enter | Confirm selection, move to next cell |
| Escape | Close form (or close search mode) |

## Table Schema

```sql
CREATE TABLE tbl_quotation_main (
    [ID] [bigint] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [customer_id] bigint,
    [quo_no] varchar(200),
    [checklist_no] varchar(200),
    [quo_date] date,
    [sub_total] numeric(18,2),
    [amount_due] numeric(18,2),
    [vat] numeric(18,2),
    [discount] numeric(18,2),
    [per] numeric(18,0),
    [total] numeric(18,2)
)

CREATE TABLE tbl_quotation_sub (
    [ID] [bigint] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [main_id] bigint,
    [product_id] bigint,
    [qty] numeric(18,0),
    [unit_price] numeric(18,2),
    [row_total] numeric(18,2),
    [s_no] numeric(18,0)
)
```

## Key Differences from Invoice

| Aspect | Invoice | Quotation |
|--------|---------|-----------|
| Type | CASH/CREDIT | QUOTATION |
| Payment | paid/unpaid status | No payment |
| Auto-PDF | On save | On save (mandatory) |
| Conversion | N/A | Can become Invoice |
| Number field | invoice_no | quo_no |