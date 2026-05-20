# Login Module — Implementation Details

## Purpose
Document the authentication flow, user management, and role-based access control for replication.

---

## Authentication Flow

```
1. User selects user_id from dropdown
2. User enters password
3. Press Enter or click Login
4. System validates credentials against tbl_user
5. If valid → Hide login, Show HOME (MDI parent)
6. If invalid → Show error, clear password field
```

### Source
```vb
Public Sub check1()
    ' 1. Validate selection
    If user_id.SelectedIndex = -1 Then
        MsgBox("Please Select User ID", vbCritical, "WARNING")
        user_id.Focus()
        Exit Sub
    End If
    
    ' 2. Validate password
    If password.Text = "" Then
        MsgBox("Please Enter Password", vbCritical, "WARNING")
        password.Focus()
        Exit Sub
    End If
    
    ' 3. Get stored password
    Dim con_pass As String = get_single_value("password", "tbl_user", "user_id", user_id.Text)
    
    ' 4. Compare
    If password.Text <> con_pass Then
        MsgBox("Password Is Not Valid", vbCritical, "WARNING")
        password.Text = ""
        password.Focus()
        Exit Sub
    End If
    
    ' 5. Success → set globals and show HOME
    Me.Hide()
    user_id_log = get_single_value("des", "tbl_user", "id", Val(user_id.SelectedValue))
    user_name = user_id.Text
    user_id.Text = ""
    password.Text = ""
    HOME.Show()
End Sub
```

---

## Global User State

After successful login, these module-level globals are set:

| Variable | Source | Purpose |
|----------|--------|---------|
| `user_id_log` | `tbl_user.des` | Role: "admin" or "USER" |
| `user_name` | `tbl_user.user_id` | Display name |

```vb
user_id_log = get_single_value("des", "tbl_user", "id", Val(user_id.SelectedValue))
user_name = user_id.Text
```

---

## Role-Based Access Control (RBAC)

The `des` field in `tbl_user` stores the role:
- `"admin"` — full access including delete
- `"USER"` — restricted (no delete buttons)

### Implemented in Module1.rights()
```vb
Public Sub rights(ByRef frm As Form)
    Dim textboxes = GetAllControls(frm).OfType(Of Button)().ToList()
    For Each item As Button In textboxes
        If user_id_log = "USER" Then
            If item.Text.Replace("&", "") = "DELETE" Then
                item.Visible = False
            End If
        End If
        
        ' Button styling
        If item.Text.Replace("&", "") = "CREATE NEW" Then
            item.BackColor = Color.YellowGreen
            item.ForeColor = Color.DimGray
        End If
        If item.Text.Replace("&", "") = "PRINT" Then
            item.BackColor = Color.YellowGreen
            item.ForeColor = Color.DimGray
        End If
        If item.Text.Replace("&", "") = "DELETE" Then
            item.BackColor = Color.Gray
            item.ForeColor = Color.LightSkyBlue
        End If
        If item.Text.Replace("&", "") = "SAVE" Or 
           item.Text.Replace("&", "") = "SEND" Or
           item.Text.Replace("&", "") = "+ Create New Invoice" Or
           item.Text.Replace("&", "") = "+ Create New Quotation" Then
            item.BackColor = Color.YellowGreen
            item.ForeColor = Color.DimGray
        End If
    Next
End Sub
```

### Admin Button Visibility
```vb
Public Sub admin1(ByVal btn As Button)
    If user_id_log.ToLower <> "admin" Then
        btn.Visible = False
    End If
End Sub
```

Used in View forms to hide DELETE button for non-admin users.

---

## User Management

### tbl_user Schema
```sql
CREATE TABLE tbl_user (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id VARCHAR(500),     -- Login name
    password VARCHAR(500),    -- Plain text (⚠️ security issue)
    des VARCHAR(500)           -- Role: "admin" or "USER"
)
```

### Default User (created on first run)
```vb
' In Module1.auto_field():
Call SQL_Select("tbl_user")
If ds.Tables(0).Rows.Count = 0 Then
    Dim variable As New Dictionary(Of String, String)
    variable.Add("user_id", "'ADMIN'")
    variable.Add("password", "'admin'")
    Call SQL_Insert("tbl_user", variable)
End If
```

**Credentials:** User: `ADMIN`, Password: `admin`

---

## Login Form Events

### Load Sequence
```vb
Private Sub Login_Load(...)
    password.Focus()
    first_date()
    Button1.FlatAppearance.BorderSize = 0
    Button2.FlatAppearance.BorderSize = 0
    Call con_sql()           ' Establish DB connection
    auto_field()             ' Ensure all tables exist (migrate if needed)
    Me.KeyPreview = True
    load_customer()          ' Load user list
End Sub
```

### `auto_field()` — Auto-Migration
Ensures all database tables and columns exist. Creates default records if missing:
- `tbl_company` — company details (logo, footer)
- `tbl_customer` — customer records
- `tbl_invoice_main/sub` — invoice data
- `tbl_quotation_main/sub` — quotation data
- `tbl_product` — products
- `tbl_product_type` — product categories
- `tbl_receipt` — payment receipts
- `tbl_setting` — app configuration
- `tbl_user` — users
- `tbl_email` — email templates
- `tbl_numbers` — sequence counters

---

## Password Storage — Security Issue

**⚠️ CRITICAL:** Passwords stored in **plain text** in `tbl_user.password`.

```vb
Dim con_pass As String = get_single_value("password", "tbl_user", "user_id", user_id.Text)
If password.Text <> con_pass Then
    ' Compare plain text
```

For modern replication, implement:
- **BCrypt/Argon2 hashing** — never store plain passwords
- **Salt per user** — prevent rainbow table attacks
- **Password requirements** — min length, complexity

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter | Submit login |
| Escape | Close login form |
| F4 | Open user_id dropdown |

```vb
Private Sub user_id_GotFocus(...)
    SendKeys.Send("{F4}")  ' Auto-open dropdown on focus
End Sub

Private Sub user_id_KeyDown(...)
    If e.KeyCode = Keys.Enter Then
        password.Focus()
    End If
End Sub

Private Sub password_KeyDown(...)
    If e.KeyCode = Keys.Enter Then
        check1()
    End If
End Sub
```

---

## Connection Initialization

Login form calls `con_sql()` which:
1. Establishes `SqlConnection` to SQL Server
2. Reads connection string from code (hardcoded for specific PC names)
3. Sets `REPORT_CON_STRING` and `backup_constr`

```vb
Public Sub con_sql()
    If con.State = ConnectionState.Open Then Exit Sub
    
    ' Determine connection based on PC name
    Dim pc As String = My.Computer.Name
    If UCase(pc) = "MAHESH" Or UCase(pc) = "ANKIT-PC" Then
        con.ConnectionString = "... ' Local dev
    Else
        con.ConnectionString = "... ' Client PC
    End If
    
    REPORT_CON_STRING = con.ConnectionString
    backup_constr = con.ConnectionString
    con.Open()
    db_nm = "XPressDB"
    Call set_global_date_format()
End Sub
```

**For replication:** Store connection string in config file, not hardcoded.

---

## Session Persistence

No session persistence implemented. Each app launch requires fresh login.

**Future enhancement:**
- JWT tokens for web/API version
- Session cookies for desktop
- Remember me functionality

---

## Logout Flow

Not explicitly implemented. To "logout":
1. Close HOME form
2. Login form auto-shows (since it was hidden, not closed)

```vb
' In Login check1() success:
Me.Hide()  ' Hide, don't close
HOME.Show()
```

No "logout" button in original app.