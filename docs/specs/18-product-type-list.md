# Product Type List View — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Master/View_Product_Type.vb` (124 lines) |
| **Purpose** | List, search, add, edit, delete product types |
| **Table** | `tbl_product_type` |
| **Child** | `Add_Edit_Product_Type` |

## Form Architecture

### Class Declaration
```vb
Public Class View_Product_Type
```

### Global State
- `product_type_id` (Module1) — selected record ID for edit/delete

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Sets font, calls `con_sql()`, loads grid |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close form |
| `Move` | Calls `moved(Me)` |

## UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Product Type" |
| `Label6` | Label | Close button (X) |
| `Button1` | Button | Add new |
| `Button2` | Button | Edit |
| `Button3` | Button | Delete |
| `Button4` | Button | Close |
| `find` | TextBox | Search filter |
| `DataGridView1` | DataGridView | List display |
| `lblTotalRecords` | Label | Record count display |

### Grid Configuration
```vb
.Columns(0).Visible = False          ' Hide ID column
.Columns(1).HeaderText = "Product Type"
lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
```

## Data Loading

### `load_grid_sql()`
```vb
Public Sub load_grid_sql()
    Call grids1(DataGridView1)
    Call SQL_Select("tbl_product_type", , " type_name like '%" & find.Text & "%'")
    If ds.Tables(0).Rows.Count > 0 Then
        DataGridView1.DataSource = ds.Tables(0)
        With DataGridView1
            .Columns(0).Visible = False
            .Columns(1).HeaderText = "Product Type"
        End With
    Else
        DataGridView1.DataSource = Nothing
    End If
    lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
End Sub
```

**Search Behavior**: Filter by `type_name` with LIKE wildcard on both sides.

## Actions

### Add (Button1)
```vb
Private Sub Button1_Click(...)
    product_type_id = 0  ' Reset for add mode
    Call __show(Add_Edit_Product_Type)
    load_nav_bar("Add_Edit_Product_Type", "Add Product Type")
End Sub
```

### Edit (Button2 → edit1())
```vb
Public Sub edit1()
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    product_type_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call __show(Add_Edit_Product_Type)
    load_nav_bar("Add_Edit_Product_Type", "Edit Product Type")
End Sub
```

**Double-click**: `DataGridView1_MouseDoubleClick` → calls `edit1()`

### Delete (Button3)
```vb
Private Sub Button3_Click(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No User Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    product_type_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Dim ask As String = MsgBox("Are You Sure Want to Delete Product Type Details?", vbQuestion + vbYesNo)
    
    If ask = "6" Then  ' Yes
        If DataGridView1.SelectedRows.Count <= 0 Then
            MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If
        
        ' FK CHECK - prevent delete if used in products
        Dim temp As String = get_single_value("id", "tbl_product", "type_id", product_type_id)
        If temp <> "" Then
            MsgBox("This Product Type In Use You Can Not Delete", vbCritical, "WARNING")
            Exit Sub
        End If
        
        Call SQL_Delete("tbl_product_type", " id='" & product_type_id & "'")
        MsgBox("Product Type Successfully Deleted.", vbInformation)
        Call load_grid_sql()
    End If
End Sub
```

**Delete Protection**: Checks `tbl_product.type_id` foreign key before allowing delete.

## Search Filter

### `find_TextChanged`
```vb
Private Sub find_TextChanged(...)
    Call load_grid_sql()  ' Refresh on every keystroke
End Sub
```

Real-time filtering — no debounce.

## Navigation

Uses `__show()` and `load_nav_bar()` for MDI child management:
- Add: `load_nav_bar("Add_Edit_Product_Type", "Add Product Type")`
- Edit: `load_nav_bar("Add_Edit_Product_Type", "Edit Product Type")`

## Key Implementation Details

| Detail | Value |
|--------|-------|
| Font | "Franklin Gothic Medium Cond" 21.75pt Bold |
| Search | Real-time LIKE with wildcards |
| Delete | FK check before delete |
| Grid | Single column display (type_name) |