# Product Management — Specification

## Overview

| Property | Value |
|----------|-------|
| **Files** | `Master/View_Product.vb` (331 lines), `Master/Add_Edit_Product.vb` (190 lines) |
| **Purpose** | Product CRUD, import from Excel, export to Excel |
| **Table** | `tbl_product`, `tbl_product_type` |
| **Parent** | HOME → Master menu |

## Architecture

```
View_Product (List)
├── Add (→ Add_Edit_Product with product_ids=0)
├── Edit (→ Add_Edit_Product with product_ids=selected)
├── Delete (with FK check)
├── Import from Excel
└── Export to Excel

Add_Edit_Product (Form)
├── Add mode (product_ids=0)
├── Edit mode (product_ids>0)
├── Validate duplicate product_name + type_id
├── Auto-fill into Invoice/Quotation if opened
└── Quick add Product Type (Button3)
```

## View_Product — List Screen

### Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Sets font, calls `load_grid_sql()` |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close |
| `Move` | Calls `moved(Me)` |

### UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Product" |
| `Label6` | Label | Close button (X) |
| `Button1` | Button | Add new |
| `Button2` | Button | Edit |
| `Button3` | Button | Delete |
| `Button4` | Button | Close |
| `Button5` | Button | Import from Excel |
| `Button6` | Button | Export to Excel |
| `find` | TextBox | Search filter |
| `DataGridView1` | DataGridView | Product list |
| `DataGridView2` | DataGridView | Hidden (import preview) |
| `lblTotalRecords` | Label | Record count |
| `lblmsg` | Label | Import progress |
| `ProgressBar1` | ProgressBar | Import progress bar |
| `Timer1` | Timer | Progress animation |

### Grid Configuration

```vb
.Columns(0).Visible = False          ' ID (hidden)
.Columns(1).HeaderText = "Product ID"
.Columns(1).DisplayIndex = 4         ' Move to position 4
.Columns(2).HeaderText = "Product Name"
.Columns(3).HeaderText = "Product Type"
.Columns(4).HeaderText = "Price"
.Columns(0).Width = 100
.Columns(1).Width = 10
.Columns(2).Width = 800
.Columns(3).Width = 200
.Columns(4).Width = 150
lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
```

### Data Loading (`load_grid_sql()`)

```vb
Public Sub load_grid_sql()
    Call grids1(DataGridView1)
    Call SQL_Query(
        "SELECT tbl_product.id, tbl_product.product_id, tbl_product.product_name, 
         tbl_product_type.type_name, tbl_product.price 
         FROM tbl_product INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id",
        " where tbl_product.product_id like '%" & find.Text & "%' 
          or tbl_product.product_name like '%" & find.Text & "%' 
          or tbl_product_type.type_name like '%" & find.Text & "%' 
          or tbl_product.price like '%" & find.Text & "%'"
    )
    ' Display results...
End Sub
```

**Search**: Real-time filter across product_id, product_name, type_name, price.

### Actions

#### Add (Button1)
```vb
Private Sub Button1_Click(...)
    product_ids = 0
    Call __show(Add_Edit_Product)
    load_nav_bar("Add_Edit_Product", "Add Product")
End Sub
```

#### Edit (Button2 → edit1())
```vb
Public Sub edit1()
    product_ids = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Product)
    load_nav_bar("Add_Edit_Product", "Edit Product")
End Sub

Private Sub DataGridView1_MouseDoubleClick(...)
    Call edit1()
End Sub
```

#### Delete (Button3)
```vb
Private Sub Button3_Click(...)
    product_ids = DataGridView1.SelectedRows(0).Cells(0).Value
    
    ' Confirmation dialog
    Dim ask As String = MsgBox("Are You Sure Want to Delete Product Details?", vbQuestion + vbYesNo)
    If ask <> "6" Then Exit Sub
    
    ' FK checks before delete
    Dim temp As String = get_single_value("id", "tbl_invoice_sub", "product_id", product_ids)
    If temp <> "" Then
        MsgBox("This Product In Use You Can Not Delete", vbCritical, "WARNING")
        Exit Sub
    End If
    Dim temp1 As String = get_single_value("id", "tbl_quotation_sub", "product_id", product_ids)
    If temp1 <> "" Then
        MsgBox("This Product In Use You Can Not Delete", vbCritical, "WARNING")
        Exit Sub
    End If
    
    Call SQL_Delete("tbl_product", " id='" & product_ids & "'")
    Call load_grid_sql()
End Sub
```

**Delete Protection**: Checks `tbl_invoice_sub` and `tbl_quotation_sub` for foreign key references.

### Import from Excel (Button5)

```vb
Private Sub Button5_Click(...)
    ' Open file dialog for .xlsx, .csv, .xls
    OpenFileDialog.Filter = "All Files (*.*)|*.*|Excel files (*.xlsx)|*.xlsx|CSV Files (*.csv)|*.csv|XLS Files (*.xls)|*xls"
    
    ' Read Sheet1$ from Excel using ACE OLEDB provider
    conn = New OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" + excel + ";Extended Properties=Excel 12.0;")
    dta = New OleDbDataAdapter("Select * From [Sheet1$]", conn)
    dta.Fill(dts, "[Sheet1$]")
    
    ' Progress bar animation
    Timer1.Interval = 50
    ProgressBar1.Maximum = 100
    
    For i = 0 To DataGridView2.Rows.Count - 1
        ' Column 3 = Type Name
        type_id = get_or_create_type(Trim(.Rows(i).Cells(3).Value))
        
        ' Column 0 = Unique ID (existing = update, new = insert)
        If Val(unique_id) > 0 Then
            SQL_Update("tbl_product", variable, " id='" & Val(unique_id) & "'")
        Else
            SQL_Insert("tbl_product", variable)
        End If
    Next
End Sub

Function get_or_create_type(type_name As String) As Double
    Dim a = get_single_value("type_name", "tbl_product_type", "type_name", type_name)
    If a = "" Then
        SQL_Insert("tbl_product_type", variable)
        Return get_single_value("id", "tbl_product_type", "type_name", type_name)
    Else
        Return get_single_value("id", "tbl_product_type", "type_name", a)
    End If
End Function
```

**Import Format**: Excel columns → [UniqueID, ProductID, ProductName, TypeName, Price]

### Export to Excel (Button6)

```vb
Private Sub Button6_Click(...)
    ' SaveFileDialog for .xlsx
    saveFileDialog1.Filter = "Excel |*.xlsx"
    
    ' Create Excel workbook with headers
    xlWorkSheet.Cells(1, 1) = "Unique ID"
    xlWorkSheet.Cells(1, 2) = "Product ID"
    xlWorkSheet.Cells(1, 3) = "Product Name"
    xlWorkSheet.Cells(1, 4) = "Type"
    xlWorkSheet.Cells(1, 5) = "Price"
    
    ' Query current filtered results
    Call SQL_Query("SELECT ... FROM tbl_product INNER JOIN tbl_product_type ...")
    
    ' Write rows to Excel
    xlWorkSheet.Cells(z, 1) = .Rows(j).ItemArray(0).ToString  ' ID
    xlWorkSheet.Cells(z, 2) = .Rows(j).ItemArray(1).ToString  ' ProductID
    ' ...
    
    xlWorkBook.SaveAs(excel_file_name)
    MsgBox("File Saved at : " & fnm)
End Sub
```

## Add_Edit_Product — Form

### Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Load type combo, load data if editing |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close |
| `Move` | Calls `moved(Me)` |

### UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Add/Edit Product" |
| `product_id` | TextBox | Product code/ID |
| `product_name` | TextBox | Product name |
| `type_id` | ComboBox | Product type (from tbl_product_type) |
| `Button3` | Button | Quick add product type |
| `price` | TextBox | Unit price |
| `Button1` | Button | Save |
| `Button2` | Button | Cancel |

### Global State

- `product_ids` — 0 = Add, >0 = Edit
- `new_pro_key` — If True, auto-fill into Add_Edit_Invoice
- `new_pro_key_quo` — If True, auto-fill into Add_Edit_Quotation

### Load Combos (`load_combo()`)

```vb
Public Sub load_combo()
    Call SQL_Select("tbl_product_type", , , " order by type_name")
    type_id.DataSource = ds.Tables(0)
    type_id.ValueMember = "id"
    type_id.DisplayMember = "type_name"
    type_id.SelectedIndex = -1
End Sub
```

### Load Data (`load_data()`)

```vb
Public Sub load_data()
    Call SQL_Query(
        "SELECT tbl_product.id, tbl_product.product_id, tbl_product.type_id, 
         tbl_product.product_name, tbl_product_type.type_name, tbl_product.price 
         FROM tbl_product INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id",
        " where tbl_product.id='" & product_ids & "'"
    )
    product_id.Text = ds.Tables(0).Rows(0).Item("product_id").ToString
    pre_load_type_id = ds.Tables(0).Rows(0).Item("type_id").ToString
    product_name.Text = ds.Tables(0).Rows(0).Item("product_name").ToString
    load_product_name = ds.Tables(0).Rows(0).Item("product_name").ToString
    type_id.Text = ds.Tables(0).Rows(0).Item("type_name").ToString
    price.Text = ds.Tables(0).Rows(0).Item("price").ToString
End Sub
```

### Save Logic (`saved()`)

```vb
Public Sub saved()
    If product_ids > 0 Then
        ' UPDATE
        Dim variable As New Dictionary(Of String, String)
        For Each item As TextBox In GetAllControls(Me)
            variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
        Next
        variable.Add(type_id.Name, "'" & Val(type_id.SelectedValue) & "'")
        SQL_Update("tbl_product", variable, "id=" & product_ids)
    Else
        ' INSERT
        Dim variable As New Dictionary(Of String, String)
        For Each item As TextBox In GetAllControls(Me)
            variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
        Next
        variable.Add(type_id.Name, "'" & Val(type_id.SelectedValue) & "'")
        SQL_Insert("tbl_product", variable)
    End If
End Sub
```

### Save Button Handler

```vb
Private Sub Button1_Click(...)
    ' Validations
    If product_id.Text = "" Then MsgBox("Please Enter Product ID") : Exit Sub
    If product_name.Text = "" Then MsgBox("Please Enter Product Name") : Exit Sub
    If type_id.SelectedIndex = -1 Then MsgBox("Please Select Product Type") : Exit Sub
    If Val(price.Text) = 0 Then MsgBox("Please Enter Product Price") : Exit Sub
    
    ' Duplicate check: product_name + type_id must be unique
    Dim test As String = get_single_value_two_condition("product_name", "tbl_product", 
        "product_name", "type_id", Trim(product_name.Text), Val(type_id.SelectedValue))
    If test <> "" And Not (load_product_name = product_name.Text And pre_load_type_id = Val(type_id.SelectedValue)) Then
        MsgBox("Product Name Is Duplicate Please Enter Different Name", vbCritical)
        Exit Sub
    End If
    
    Call saved()
    
    ' Refresh parent list
    Call View_Product.load_grid_sql()
    
    ' Auto-fill into Invoice if opened
    If new_pro_key = True Then
        If Add_Edit_Invoice.Visible = True Then
            ' Find first empty row and fill
            For i = 0 To row_count - 1
                If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Type Product Name" Then
                    .Rows(i).Cells(1).Value = product_name.Text  ' Product Name
                    .Rows(i).Cells(2).Value = 1                   ' Qty
                    .Rows(i).Cells(3).Value = Val(price.Text)    ' Unit Price
                    .Rows(i).Cells(5).Value = get_max_number("id", "tbl_product") ' Product ID
                    Exit For
                End If
            Next
            Add_Edit_Invoice.load_sr()
            Add_Edit_Invoice.cal()
        End If
        new_pro_key = False
    End If
    
    ' Same for Quotation (new_pro_key_quo)
    If new_pro_key_quo = True Then
        ' ... similar auto-fill logic for Add_Edit_Quotation
        new_pro_key_quo = False
    End If
    
    Me.Dispose()
    Me.Close()
End Sub
```

### Quick Add Product Type (Button3)

```vb
Private Sub Button3_Click(...)
    product_type_id = 0
    Call __show(Add_Edit_Product_Type)
End Sub
```

### ComboBox Behavior

```vb
Private Sub type_id_GotFocus(...)
    SendKeys.Send("{F4}")  ' Open dropdown on focus
End Sub

Private Sub price_KeyPress(...)
    Call isamount(sender, e)  ' Numeric only
End Sub
```

## Table Schema

```sql
CREATE TABLE tbl_product (
    id INT PRIMARY KEY,
    product_id VARCHAR(50),
    product_name VARCHAR(200),
    type_id INT REFERENCES tbl_product_type(id),
    price DECIMAL(10,2)
)

CREATE TABLE tbl_product_type (
    id INT PRIMARY KEY,
    type_name VARCHAR(100)
)
```

## Key Features

| Feature | Implementation |
|---------|----------------|
| Search | Real-time LIKE on 4 columns |
| Add | Opens Add_Edit_Product with product_ids=0 |
| Edit | Opens Add_Edit_Product with selected ID |
| Delete | FK check on invoice/quotation tables |
| Import | Excel via ACE OLEDB, auto-creates types |
| Export | Excel via Microsoft.Office.Interop |
| Validation | Product name + type_id uniqueness |
| Auto-fill | New products auto-insert into active Invoice/Quotation |