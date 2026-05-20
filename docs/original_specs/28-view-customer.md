# 28 - View Customer

## Purpose
`View_Customer` is the customer listing/search/manage screen. It provides:
- Grid-based customer browsing
- Live text search
- Add/Edit/Delete customer actions
- Excel import and export utilities

## Load logic
On form load, it initializes styling, DB connection, key handling, then loads grid data.

```vb
Private Sub View_Customer_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
    Call set_fonr(Me, Label2)
    Call con_sql()
    lblTotalRecords.Text = ""
    lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
    Me.KeyPreview = True
    Call load_grid_sql()
End Sub
```

`load_grid_sql()` uses `SQL_Select` with `LTRIM(title_name + ' ' + customer_name)` and binds result to `DataGridView1`.

```vb
Public Sub load_grid_sql()
    Call grids1(DataGridView1)
    Call SQL_Select("tbl_customer", "id,LTRIM(title_name + ' ' + customer_name),Customer_type,contact,telephone,address,email,due_amount,reg_date", " customer_name like '%" & find.Text & "%' or telephone like '%" & find.Text & "%' OR contact like '%" & find.Text & "%' OR address like '%" & find.Text & "%'")
    If ds.Tables(0).Rows.Count > 0 Then
        DataGridView1.DataSource = ds.Tables(0)
        With DataGridView1
            .Columns(0).Visible = False
            .Columns(1).HeaderText = "Customer Name"
            .Columns(2).HeaderText = "Customer Type"
            .Columns(3).HeaderText = "Contact Person"
            .Columns(4).HeaderText = "Telephone"
            .Columns(5).HeaderText = "Address"
            .Columns(6).HeaderText = "E-Mail"
            .Columns(8).HeaderText = "Register Date"
            .Columns(8).DefaultCellStyle.Format = "dd-MM-yyyy"
            .Columns(7).Visible = False
        End With
    Else
        DataGridView1.DataSource = Nothing
    End If
    lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
End Sub
```

## Search filter
Search is live via `find_TextChanged`, reloading the SQL each time input changes.

Fields included in filter (`LIKE`):
- `customer_name`
- `telephone`
- `contact`
- `address`

```vb
Private Sub find_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find.TextChanged
    load_grid_sql()
End Sub
```

## Actions
### Add
```vb
Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
    customer_id = 0
    Call __show(Add_Edit_Customer)
    load_nav_bar("Add_Edit_Customer", "Add Customer")
End Sub
```

### Edit
Edit requires a selected row and opens `Add_Edit_Customer` in edit mode.

> **Note:** `DataGridView1_MouseDoubleClick` also triggers `edit1()` — double-click on a row opens the edit form (same behavior as Edit button).

```vb
Public Sub edit1()
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    customer_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Customer)
    load_nav_bar("Add_Edit_Customer", "Edit Customer")
End Sub
```

### Delete (with FK check)
Full `Button3_Click` handler (source lines 291-332):

```vb
Private Sub Button3_Click(...) Handles Button3.Click
    ' 1. Pre-check: no rows to delete
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No User Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    customer_id = DataGridView1.SelectedRows(0).Cells(0).Value

    ' 2. User confirmation
    Dim ask As String
    ask = MsgBox("Are You Sure Want to Delete Customer Details?", vbQuestion + vbYesNo)
    If ask = "6" Then      ' Yes
        If DataGridView1.SelectedRows.Count <= 0 Then
            MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If

        ' 3. FK check: invoice
        Dim temp As String = get_single_value("id", "tbl_invoice_main", "customer_id", customer_id)
        If temp <> "" Then
            MsgBox("This Customer In Use You Can Not Delete", vbCritical, "WARNING")
            Exit Sub
        End If

        ' 4. FK check: quotation
        Dim temp1 As String = get_single_value("id", "tbl_quotation_main", "customer_id", customer_id)
        If temp1 <> "" Then
            MsgBox("This Customer In Use You Can Not Delete", vbCritical, "WARNING")
            Exit Sub
        End If

        ' 5. Execute delete
        Call SQL_Delete("tbl_customer", " id='" & customer_id & "'")

        ' 6. Success + refresh
        MsgBox("Customer Successfully Deleted.", vbInformation)
        Call load_grid_sql()
        DataGridView1.Focus()
    ElseIf ask = "7" Then   ' No
        DataGridView1.Focus()
        Exit Sub
    End If
    load_grid_sql()
    DataGridView1.Focus()
End Sub
```

Note: Spec previously showed only the FK check code block (lines 96-107). Full flow now documented.

## Excel import
Import uses `System.Data.OleDb` with ACE provider and reads from `Sheet1$`.

```vb
conn = New OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" + excel + ";Extended Properties=Excel 12.0;")
dta = New OleDbDataAdapter("Select * From [Sheet1$]", conn)
dts = New DataSet
dta.Fill(dts, "[Sheet1$]")
DataGridView2.DataSource = dts
DataGridView2.DataMember = "[Sheet1$]"
```

Column mapping in import loop:
- `Cells(0)` -> `title_name`
- `Cells(1)` -> `customer_name`
- `Cells(2)` -> `contact`
- `Cells(3)` -> `address`
- `Cells(4)` -> `telephone`
- `Cells(5)` -> `email`
- `Cells(6)` -> `customer_type`
- `Cells(7)` -> `brn`
- `Cells(8)` -> `vat`

```vb
title_name = .Rows(i).Cells(0).Value.ToString
CUSTOMER_NAME = .Rows(i).Cells(1).Value.ToString.Replace("'", "''")
contact = .Rows(i).Cells(2).Value.ToString
address = .Rows(i).Cells(3).Value.ToString.Replace("'", "''")
telephone = .Rows(i).Cells(4).Value.ToString
email = .Rows(i).Cells(5).Value.ToString.Replace("'", "''")
customer_type = .Rows(i).Cells(6).Value.ToString
brn = .Rows(i).Cells(7).Value.ToString
vat = .Rows(i).Cells(8).Value.ToString
```

Duplicates are skipped during import:

```vb
Dim test As String = get_single_value("customer_name", "tbl_customer", "customer_name", Trim(CUSTOMER_NAME))
If test <> "" Then GoTo nnnn
```

## Excel export
Export uses `Microsoft.Office.Interop.Excel`, writes a workbook, and populates headers/rows from `tbl_customer`.

Header columns written:
- `TITLE`
- `CUSTOMER NAME`
- `CONTACT PERSON`
- `ADDRESS`
- `TELEPHONE`
- `EMAIL ADDRESS`
- `CUSTOMER TYPE`
- `BRN`
- `VAT`

```vb
xlWorkSheet.Cells(1, 1) = "TITLE"
xlWorkSheet.Cells(1, 2) = "CUSTOMER NAME"
xlWorkSheet.Cells(1, 3) = "CONTACT PERSON"
xlWorkSheet.Cells(1, 4) = "ADDRESS"
xlWorkSheet.Cells(1, 5) = "TELEPHONE"
xlWorkSheet.Cells(1, 6) = "EMAIL ADDRESS"
xlWorkSheet.Cells(1, 7) = "CUSTOMER TYPE"
xlWorkSheet.Cells(1, 8) = "BRN"
xlWorkSheet.Cells(1, 9) = "VAT"
```

Source query used by export:

```vb
Call SQL_Select("tbl_customer", "id,title_name, customer_name,Customer_type,contact,telephone,address,email,due_amount,brn,vat", " customer_name like '" & find.Text & "%'")
```

## Delete validation
Before deleting a customer, the form enforces referential checks against:
- `tbl_invoice_main.customer_id`
- `tbl_quotation_main.customer_id`

If any reference exists, deletion is blocked with warning:

```vb
MsgBox("This Customer In Use You Can Not Delete", vbCritical, "WARNING")
```
