# Product Type CRUD — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Master/Add_Edit_Product_Type.vb` (77 lines) |
| **Purpose** | Add/Edit product type categories |
| **Table** | `tbl_product_type` |
| **Parent** | `View_Product_Type` |

## Form Architecture

### Class Declaration
```vb
Public Class Add_Edit_Product_Type
```

### Global State
- `product_type_id` (Module1) — 0 = Add mode, >0 = Edit mode

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Calls `set_fonr()`, `con_sql()`, sets `KeyPreview = True`, loads data if editing |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close form |
| `Move` | Calls `moved(Me)` |

### Load Logic
```vb
If product_type_id > 0 Then
    Label2.Text = "Edit Product type"
    Call load_data()
End If
```

## UI Controls

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title ("Add/Edit Product Type") |
| `Label6` | Label | Close button (X) |
| `Button1` | Button | Save |
| `Button2` | Button | Cancel |
| `type_name` | TextBox | Product type name |

## Data Operations

### Load (`load_data()`)
```vb
Call SQL_Select("tbl_product_type", "", "id='" & product_type_id & "'")
If ds.Tables(0).Rows.Count > 0 Then
    type_name.Text = ds.Tables(0).Rows(0).Item("type_name").ToString
End If
```

### Save (`saved()`)
```vb
If product_type_id > 0 Then
    ' UPDATE existing record
    Dim variable As New Dictionary(Of String, String)
    Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
    For Each item As TextBox In textboxes
        variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
    Next
    Dim d As String = SQL_Update("tbl_product_type", variable, "id=" & product_type_id)
Else
    ' INSERT new record
    Dim variable As New Dictionary(Of String, String)
    Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
    For Each item As TextBox In textboxes
        variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
    Next
    Dim d As Integer = SQL_Insert("tbl_product_type", variable)
End If
```

### Save Button Handler
```vb
Private Sub Button1_Click(...)
    If type_name.Text = "" Then
        MsgBox("Please Enter Product Type Name", vbCritical, "WARNING")
        type_name.Focus()
        Exit Sub
    End If
    Call saved()
    MsgBox("Product Type Saved!", vbInformation)
    Call View_Product_Type.load_grid_sql()
    Call Add_Edit_Product.load_combo()  ' Refresh parent form
    Me.Dispose()
    Me.Close()
End Sub
```

## Post-Save Actions

After saving, refreshes:
1. `View_Product_Type.load_grid_sql()` — refresh list view
2. `Add_Edit_Product.load_combo()` — refresh product form dropdown

## Key Implementation Details

### SQL Escape
```vb
item.Text.Replace("'", "''")  ' Prevents SQL injection
```

### GetAllControls Pattern
Uses reflection to iterate all TextBox controls on form for dynamic field building.

### Table Schema (expected)
```sql
CREATE TABLE tbl_product_type (
    id INT PRIMARY KEY,
    type_name VARCHAR(100)
)
```