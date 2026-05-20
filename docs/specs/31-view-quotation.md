# Quotation List View — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Quotation/View_Quotation.vb` (274 lines) |
| **Class** | `Public Class View_Quotation` |
| **Purpose** | Manage quotation listing, search/filter, CRUD-style actions, PDF actions, and conversion from quotation to invoice |
| **Primary Tables** | `tbl_quotation_main`, `tbl_quotation_sub`, `tbl_customer`, `tbl_setting` |
| **Core Flow** | Browse quotation list -> Add/Edit/Delete/Print/View PDF -> Double-click converts selected quotation into invoice |

## Purpose

`View_Quotation` is the quotation list screen. It loads quotation records with customer information, supports live search, provides Add/Edit/Delete/Print/View PDF actions, and allows direct conversion to invoice via double-click.

Key conversion behavior:

```vb
Quotation_To_Invoice_ID = DataGridView1.SelectedRows(0).Cells(0).Value
Call __show(Add_Edit_Invoice)
load_nav_bar("Add_Edit_Invoice", "Add Invoice From Quot.")
```

## Form Lifecycle and Core Events

### Load event

```vb
Private Sub View_Quotation_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
    Call set_fonr(Me, Label2)
    Call con_sql()
    lblTotalRecords.Text = ""
    lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
    Me.KeyPreview = True
    Call load_grid_sql()
End Sub
```

Behavior:
- Initializes form font and SQL connection.
- Enables key preview for form-level key handling.
- Loads list data immediately.

### Close/dispose/escape

```vb
Private Sub Label6_Click(...) Handles Label6.Click
    Me.Dispose()
    Me.Close()
End Sub

Private Sub Button4_Click(...) Handles Button4.Click
    Me.Dispose()
    Me.Close()
End Sub

Private Sub View_Quotation_KeyDown(...) Handles Me.KeyDown
    If e.KeyCode = Keys.Escape Then
        Me.Dispose()
        Me.Close()
    End If
End Sub
```

### Disposed + move + paint hooks

```vb
Private Sub View_Invoice_Disposed(...) Handles Me.Disposed
    last_form_close(Me)
End Sub

Private Sub View_Quotation_Move(...) Handles Me.Move
    Call moved(Me)
End Sub

Private Sub View_Quotation_Paint(...) Handles Me.Paint
    Call admin1(Button3)
End Sub
```

## Load Logic (`load_grid_sql`) and Search

### SQL query with `INNER JOIN`

`load_grid_sql()` is the core loader. It calls `SQL_Query` with a base `SELECT` and a dynamic filter string.

```vb
Public Sub load_grid_sql()
    Call grids1(DataGridView1)
    Call SQL_Query("SELECT tbl_quotation_main.id, tbl_quotation_main.quo_no,tbl_quotation_main.quo_date, LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name), tbl_quotation_main.checklist_no, CAST(CONVERT(VARCHAR, CAST(tbl_quotation_main.total AS MONEY), 1) AS VARCHAR) FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id", " where tbl_customer.customer_name like '%" & find.Text & "%' or tbl_quotation_main.quo_no like '%" & find.Text & "%' or tbl_quotation_main.checklist_no like '%" & find.Text & "%' order by tbl_quotation_main.id desc")
```

Query details:
- Joins quotation main with customer:
  - `FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id`
- Selected fields:
  - hidden id
  - quotation number
  - quotation date
  - full customer display name via `LTRIM(title_name + ' ' + customer_name)`
  - checklist number
  - total (formatted as money string)
- Search filter (`find.Text`) is applied with `LIKE` to:
  - `tbl_customer.customer_name`
  - `tbl_quotation_main.quo_no`
  - `tbl_quotation_main.checklist_no`
- Sort order: newest first (`order by tbl_quotation_main.id desc`)

### Live search trigger

```vb
Private Sub find_TextChanged(...) Handles find.TextChanged
    load_grid_sql()
End Sub
```

Any text change in search box reloads and refilters the grid.

## Grid Formatting and Presentation

After data binding, grid columns are formatted explicitly:

```vb
.Columns(0).Visible = False
.Columns(0).Width = 0
.Columns(1).HeaderText = "Quotation No"
.Columns(1).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(1).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(1).Width = 30
.Columns(2).HeaderText = "Date"
.Columns(2).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(2).Width = 15
.Columns(3).HeaderText = "Customer Name"
.Columns(3).Width = 50
.Columns(4).HeaderText = "Checklist No"
.Columns(4).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
.Columns(4).Width = 15
.Columns(4).Visible = False
.Columns(5).HeaderText = "Total"
.Columns(5).Width = 300
.Columns(5).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
.Columns(5).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
.Columns(2).DisplayIndex = 1
.Columns(1).DisplayIndex = 3
.Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
```

Formatting notes:
- ID column is hidden.
- Checklist column is also hidden (`.Columns(4).Visible = False`) despite having header/width/alignment assignments.
- Date is centered and shown as `dd-MM-yyyy`.
- Total is right-aligned.
- Column display order is adjusted via `DisplayIndex`.

Record count is always updated:

```vb
lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
```

## Actions

## 1) Add Quotation (`Button1`)

Creates a new quotation context by resetting IDs and opening add/edit form.

```vb
Private Sub Button1_Click(...) Handles Button1.Click
    quotation_id = 0
    customer_id = 0
    Call __show(Add_Edit_Quotation)
    load_nav_bar("Add_Edit_Quotation", "Add Quotation")
End Sub
```

Important rule: `quotation_id = 0` indicates add/new mode.

## 2) Edit Quotation (`Button2` -> `edit1()`)

Edit action is centralized in `edit1()` and reused by keyboard shortcuts.

```vb
Private Sub Button2_Click(...) Handles Button2.Click
    Call edit1()
End Sub

Public Sub edit1()
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        DataGridView1.Focus()
        Exit Sub
    End If
    quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Quotation)
    load_nav_bar("Add_Edit_Quotation", "Edit Quotation")
End Sub
```

Behavior:
- Validates row selection.
- Sets `quotation_id` from hidden ID column.
- Opens same add/edit form in edit mode.

## 3) Delete Quotation (`Button3`)

Deletion is a direct two-table delete: main then sub.

```vb
Private Sub Button3_Click(...) Handles Button3.Click
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No User Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Dim ask As String
    ask = MsgBox("Are You Sure Want to Delete Quotation Details?", vbQuestion + vbYesNo)
    If ask = "6" Then
        If DataGridView1.SelectedRows.Count <= 0 Then
            MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If

        Call SQL_Delete("tbl_quotation_main", " id='" & quotation_id & "'")
        Call SQL_Delete("tbl_quotation_sub", " main_id='" & quotation_id & "'")
        MsgBox("Quotation Successfully Deleted.", vbInformation)
        Call load_grid_sql()
        DataGridView1.Focus()
    ElseIf ask = "7" Then
        DataGridView1.Focus()
        Exit Sub
    End If
    load_grid_sql()
    DataGridView1.Focus()
End Sub
```

Delete validation model:
- Confirm dialog (`Yes/No`) only.
- No foreign-key or dependency pre-check in this form.
- Performs simple delete against `tbl_quotation_main` and `tbl_quotation_sub`.

## 4) Print/Preview PDF (`Button5`)

Generates report bytes, writes PDF to configured path, then opens preview form.

```vb
Private Sub Button5_Click(...) Handles Button5.Click
    ' Validation guards (source lines 122-131)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        DataGridView1.Focus()
        Exit Sub
    End If

    quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
    Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If
    user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
    Dim folder_path, pdf_path As String
    Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
    Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
    folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

    If (Not System.IO.Directory.Exists(folder_path)) Then
        System.IO.Directory.CreateDirectory(folder_path)
    End If

    Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    Call __show(Preview_Quotation_Report)
    load_nav_bar("Preview_Quotation_Report", "Preview Quotation")
End Sub
```

## 5) View PDF (`Button6`)

Uses similar generation/path logic as Button5, but closes preview form instance and opens the generated PDF file directly with system handler.

```vb
Private Sub Button6_Click(...) Handles Button6.Click
    ' Validation guards (source lines 219-228)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        DataGridView1.Focus()
        Exit Sub
    End If

    quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
    Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If
    user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
    Dim folder_path, pdf_path As String
    Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
    Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
    folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

    If (Not System.IO.Directory.Exists(folder_path)) Then
        System.IO.Directory.CreateDirectory(folder_path)
    End If

    Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    Preview_Quotation_Report.Dispose()
    Preview_Quotation_Report.Close()

    Process.Start(pdf_path)
End Sub
```

## Double-Click Conversion: Quotation -> Invoice

The grid double-click action is not edit; it converts selected quotation into invoice flow.

```vb
Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    Quotation_To_Invoice_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Invoice)
    load_nav_bar("Add_Edit_Invoice", "Add Invoice From Quot.")
End Sub
```

Key contract:
- Assign selected quotation PK into `Quotation_To_Invoice_ID`.
- Open invoice add/edit form (`Add_Edit_Invoice`) in conversion context.

## Enter Key Behavior -> `edit1()`

Enter key on grid triggers edit and suppresses default key processing.

```vb
Private Sub DataGridView1_KeyDown(sender As Object, e As KeyEventArgs) Handles DataGridView1.KeyDown
    If e.KeyCode = Keys.Enter Then
        Call edit1()
        e.SuppressKeyPress = True
        e.Handled = True
    End If
End Sub
```

This creates keyboard parity with Edit button for selected row.

## PDF Path Construction Rules

Both Button5 (print/preview) and Button6 (view PDF) follow the same folder strategy.

Path formula:
- Root from setting table: `quo_path`
- Month folder: `MonthName(iMonth)` derived from selected quotation date
- Customer folder: `user_name` from grid customer display column
- Filename: `QUO{quo_no}-{user_name}.pdf`

Code used:

```vb
Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
```

Directory creation is automatic if missing:

```vb
If (Not System.IO.Directory.Exists(folder_path)) Then
    System.IO.Directory.CreateDirectory(folder_path)
End If
```

## Delete Semantics and Validation Notes

- Delete uses only UI-level confirmation and selected-row checks.
- No explicit FK/dependency check is performed in this screen.
- Deletion sequence is straightforward:
  1. `SQL_Delete("tbl_quotation_main", ...)`
  2. `SQL_Delete("tbl_quotation_sub", ...)`

This means referential safety depends on database constraints and other module behavior, not on this form logic.

## User-Facing Validation Messages

Common guard messages include:
- `"No Data Selected"` (edit/print/PDF/double-click paths)
- `"No User Selected"` (delete entry guard)
- `"Please Set Quotation Save Path from Setting"` (missing `quo_path`)
- `"Quotation Successfully Deleted."`

## Functional Summary

`View_Quotation.vb` implements these required capabilities:
- Quotation list view with SQL-backed loading and record count.
- Search over customer name, quotation number, and checklist number.
- Actions: Add (`quotation_id=0`), Edit (`edit1()`), Delete (`SQL_Delete` main+sub), Print PDF preview, View PDF in external viewer.
- Double-click converts quotation to invoice through `Quotation_To_Invoice_ID` and `__show(Add_Edit_Invoice)`.
- Enter key on grid calls `edit1()` for quick keyboard editing.
