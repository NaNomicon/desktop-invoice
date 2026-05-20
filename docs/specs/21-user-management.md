# User Management — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Master/View_Add_Edit_User.vb` (155 lines) |
| **Purpose** | User CRUD (add, edit, delete users) |
| **Table** | `tbl_user` |
| **Parent** | HOME → Master menu |

## Form Architecture

### Class Declaration
```vb
Public Class View_Add_Edit_User
```

### Global State
- `user_id` (Module1) — 0 = Add mode, >0 = Edit/Delete mode

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Sets font, initializes grid, loads data if editing |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close form |
| `Move` | Calls `moved(Me)` |

### Load Logic
```vb
Private Sub View_Add_Edit_User_Load(...)
    Call set_fonr(Me, Label2)
    Call con_sql()
    Call grids1(DataGridView1)
    Call load_grid()
    If user_id > 0 Then  ' Edit mode from parent
        load_data()
    End If
    Me.KeyPreview = True
End Sub
```

## UI Components

| Control | Type | Purpose |
|---------|------|---------|
| `Label2` | Label | Title "Add User" / "Edit User" |
| `Label8` | Label | Close button (X) |
| `Button1` | Button | Save |
| `Button2` | Button | CANCEL (closes form) |
| `Button3` | Button | Delete |
| `user_id1` | TextBox | User login ID |
| `password` | TextBox | User password |
| `confirm_password` | TextBox | Password confirmation |
| `des` | ComboBox | User designation/role |
| `DataGridView1` | DataGridView | User list |

### Grid Configuration
```vb
.Columns(0).Visible = False  ' ID (hidden)
.Columns(1).HeaderText = "User ID"
.Columns(2).Visible = False  ' Password (hidden)
```

## Data Loading

### Load Grid (`load_grid()`)
```vb
Public Sub load_grid()
    Call SQL_Select("tbl_user", , , " Order By user_id")
    If ds.Tables(0).Rows.Count > 0 Then
        With DataGridView1
            .DataSource = ds.Tables(0)
            .Columns(0).Visible = False
            .Columns(1).HeaderText = "User ID"
            .Columns(2).Visible = False
        End With
    End If
End Sub
```

### Load Data (`load_data()`)
```vb
Public Sub load_data()
    Call SQL_Select("tbl_user", , " id='" & user_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        With ds.Tables(0)
            user_id1.Text = .Rows(0).Item("user_id").ToString
            password.Text = .Rows(0).Item("password").ToString
            des.Text = .Rows(0).Item("des").ToString
        End With
    End If
End Sub
```

## User Actions

### Save (Button1)
```vb
Private Sub Button1_Click(...)
    ' Validations
    If user_id1.Text = "" Then
        MsgBox("Please Enter User ID", vbCritical, "WARNING")
        user_id1.Focus()
        Exit Sub
    End If
    If des.SelectedIndex = -1 Then
        MsgBox("Please Select Designation Of User", vbCritical, "WARNING")
        des.Focus()
        Exit Sub
    End If
    If password.Text = "" Then
        MsgBox("Please Enter Password", vbCritical, "WARNING")
        password.Focus()
        Exit Sub
    End If
    If password.Text <> confirm_password.Text Then
        MsgBox("New Password & Confirm Password Not Match", vbCritical, "WARNING")
        password.Text = ""
        password.Focus()
        Exit Sub
    End If
    
    Call saved()
    Call load_grid()
    ' Reset form
    password.Text = ""
    user_id = 0
    user_id1.Text = ""
    confirm_password.Text = ""
End Sub
```

### Save Logic (`saved()`)
```vb
Public Sub saved()
    Dim variable As New Dictionary(Of String, String)
    variable.Add("user_id", "'" & user_id1.Text.Replace("'", "''") & "'")
    variable.Add(password.Name, "'" & password.Text.Replace("'", "''") & "'")
    variable.Add(des.Name, "'" & des.Text.Replace("'", "''") & "'")
    
    If user_id > 0 Then
        Dim d As String = SQL_Update("tbl_user", variable, "id=" & user_id)
    Else
        Dim d As Integer = SQL_Insert("tbl_user", variable)
    End If
End Sub
```

### Edit (Double-click grid row)
```vb
Private Sub DataGridView1_MouseDoubleClick(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    user_id = DataGridView1.SelectedRows(0).Cells(0).Value
    load_data()
End Sub
```

### Delete (Button3)
```vb
Private Sub Button3_Click(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No User Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    
    user_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    Dim ask As String = MsgBox("Are You Sure Want to Delete User Details?", vbQuestion + vbYesNo)
    If ask = "6" Then  ' Yes
        If DataGridView1.SelectedRows.Count <= 0 Then
            MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        
        Call SQL_Delete("tbl_user", " id='" & user_id & "'")
        MsgBox("User Successfully Deleted.", vbInformation)
        Call load_grid()
        DataGridView1.Focus()
    ElseIf ask = "7" Then  ' No
        DataGridView1.Focus()
        Exit Sub
    End If
    load_grid()
    DataGridView1.Focus()
    
    If ds.Tables(0).Rows.Count <= 0 Then
        ' DataGridView1.Rows.Clear()
    End If
End Sub
```

## Form Behavior

| Aspect | Implementation |
|--------|----------------|
| ComboBox | F4 key opens dropdown on focus |
| Password | Stored as plain text (no hashing) |
| Confirmation | Password must match confirm_password |
| Post-save | Form resets, grid refreshes |
| Delete | No FK check (users can be deleted freely) |

## Table Schema

```sql
CREATE TABLE tbl_user (
    [ID] [bigint] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [user_id] varchar(500),
    [password] varchar(500),
    [des] varchar(500)
)
```

## Key Implementation Details

| Detail | Value |
|--------|-------|
| Password storage | Plain text (no encryption) |
| Designations | Free-form text (not from lookup table) |
| Edit from grid | Double-click row → loads user data |
| Delete | No protection — user can always be deleted |
| Session | user_id in Module1 persists selected user |