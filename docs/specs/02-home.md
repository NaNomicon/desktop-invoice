# HOME — MDI Parent Form Implementation Details

## Purpose
Document the MDI parent form structure, navigation, and global state management.

---

## MDI Architecture

### Form Structure
```
HOME (MDI Parent)
├── Menu Strip
│   ├── File
│   │   ├── Change Password
│   │   ├── Backup Database
│   │   ├── Restore Database
│   │   └── Logout
│   ├── Master
│   │   ├── Company Details
│   │   ├── Customer
│   │   ├── Product Type
│   │   ├── Product
│   │   └── User
│   ├── Invoice
│   │   ├── Add Invoice
│   │   ├── View Invoice
│   │   └── Sales Report
│   ├── Quotation
│   │   ├── Add Quotation
│   │   └── View Quotation
│   ├── Outstanding
│   │   ├── Outstanding List
│   │   ├── Add Receipt
│   │   └── View Receipt
│   ├── Report
│   │   ├── Invoice Report
│   │   ├── Quotation Report
│   │   ├── Receipt Report
│   │   ├── Sales Report
│   │   └── Outstanding Report
│   └── Settings
│       └── Application Settings
└── FlowLayoutPanel (Tab bar for open forms)
    └── [Button1] [Button2] [Button3] [CloseX]
```

### Form Properties
```vb
frm.MdiParent = HOME
frm.FormBorderStyle = FormBorderStyle.None
frm.Location = New Point(0, 0)
frm.Height = HOME.Height - 97
frm.Width = HOME.Width - 10
frm.BackColor = Color.White
```

---

## Navigation Bar (Tab Bar)

### Purpose
Show open forms as buttons in a FlowLayoutPanel at the top. Allows switching between open forms.

### Button Creation
```vb
Public Sub new_load_nav_bar(ByRef frm As String, ByVal name As String)
    name = name.Replace("_", " ")
    name = name.Replace("email", "E-mail Config")
    name = name.Replace("Add Edit Company", "Company details")
    ' ... more replacements ...
    name = name.Replace("View ", "")
    name = name.Replace("Add Edit ", "")

    Dim inImg2 As Image = Image.FromFile(Application.StartupPath & "\icons8-cancel-15.png")
    For i = 0 To 1
        Dim btn As Button = New Button()
        Dim old As Padding = flt.Margin
        btn.FlatStyle = FlatStyle.Flat
        btn.FlatAppearance.BorderSize = 0
        btn.Name = frm
        btn.Text = name
        btn.AutoSize = True
        btn.Font = New Font("Calibri", 10, FontStyle.Bold)
        If i = 0 Then
            btn.Margin = New Padding(old.Left + 5, 0, 0, 0)
            btn.BackColor = Color.LightSkyBlue
        Else
            btn.Name = frm & "X"
            btn.Text = "  "
            btn.Image = inImg2
            btn.BackColor = Color.Red
            btn.ForeColor = Color.LightSkyBlue
            btn.Margin = New Padding(old.Left - 20, 0, 0, 0)
            btn.Size = New Size(5, 5)
        End If
        flt.Controls.Add(btn)
        AddHandler btn.Click, AddressOf updateFunc
    Next
End Sub
```

### Name Transformations
| Original | Transformed |
|----------|-------------|
| Add_Edit_Invoice | Invoice |
| View_Customer | Customer List |
| email | E-mail Config |
| ListOutStanding | Outstanding List |

---

## Form Open/Close Management

### Show Form
```vb
Public Sub ShowForm(ByVal Frm As String)
    For Each frmClose As Form In HOME.MdiChildren
        If Frm = frmClose.Name Then
            __show(frmClose)  ' Bring to front if already open
            Exit Sub
        End If
    Next
    ' Form not open - caller must create and show it
End Sub

Public Sub __show(ByRef frm As Form)
    If frm.Visible = True Then
        frm.Hide()
    End If
    Call fback_color(frm)
    Call rights(frm)  ' Apply RBAC
    frm.Show()
End Sub
```

### Remove Form (Close)
```vb
Public Sub RemoveForm(ByVal Frm As String)
    For Each frmClose As Form In HOME.MdiChildren
        If Frm = frmClose.Name Then
            frmClose.Dispose()
            frmClose.Close()
        End If
    Next
End Sub

Public Sub last_form_close(ByRef frm As Form)
    Dim load_for_remove As String = frm.Name & "X"
    Dim final As String = load_for_remove.Substring(0, load_for_remove.Length - 1)
    Dim j As Boolean = False
JJJJ:
    For Each ctrl As Control In flt.Controls
        If final = ctrl.Name Then
            flt.Controls.Remove(ctrl)
            j = True
            GoTo JJJJ
        End If
        If j = True Then
            If final & "X" = ctrl.Name Then
                flt.Controls.Remove(ctrl)
                RemoveForm(final)
                Exit Sub
            End If
        End If
    Next
End Sub
```

### Splash Screen (frmProgress)

### Purpose
Display loading animation during application startup while initialization completes.

### Visual Components
- **PictureBox1**: Displays logo (`P1.gif` from `Application.StartupPath`)
- **Label1**: Shows animated loading text
- **Timer1**: Controls animation timing

### Implementation
```vb
Private Sub frmProgress_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
    PictureBox1.Image = Image.FromFile(Application.StartupPath & "\P1.gif")
    Timer1.Enabled = True
    Timer1.Interval = 500
End Sub

Dim i As Integer
Private Sub Timer1_Tick(sender As System.Object, e As System.EventArgs) Handles Timer1.Tick
    If i = 0 Then
        Label1.Text = "Loading."
    ElseIf i = 1 Then
        Label1.Text = "Loading.."
    ElseIf i = 2 Then
        Label1.Text = "Loading..."
    ElseIf i = 3 Then
        Label1.Text = "Loading...."
    ElseIf i = 4 Then
        Label1.Text = "Loading....."
    End If
    i += 1
    If i = 5 Then i = 0
End Sub
```

### Animation States
| State | Label Text |
|-------|------------|
| 0 | Loading. |
| 1 | Loading.. |
| 2 | Loading... |
| 3 | Loading.... |
| 4 | Loading..... |

Timer cycles through 5 states at 500ms intervals.

---

## Startup Sequence

### Flow
```
Application Launch
    │
    ▼
frmProgress (Splash Screen)
    │ Timer animation: "Loading." → ... → "Loading....."
    │ Load P1.gif logo
    │
    ▼
Login Form
    │ User authentication
    │
    ▼
HOME (MDI Parent)
    │ Load background image from tbl_setting
    │ Apply RBAC (hide restricted menu items)
    │
    ▼
Ready
```

### Startup Tasks
1. Show splash screen with animated loading indicator
2. Initialize database connection (`con_sql()`)
3. Load background image from `tbl_setting.back_path` if configured
4. Apply user role-based access control (if `user_id_log = "USER"`, hide `OUTSTANDINGREPORTToolStripMenuItem1` and `USERToolStripMenuItem`)

---

## Auto-Backup on Exit

### Trigger Conditions
- HOME form is closing (last open form)
- `count = 0` (first close event)
- Prompts: "Do You Want to Get Backup Now?"

### Backup Path
- Source: `tbl_setting.backup_path`
- Timestamp: `Format(Date.Now, "dd-MM-yyyy HH_mm_ss")`
- Extension: `.rar` (converted from `.bak`)

### Implementation
```vb
Dim count As Double = 0
Private Sub HOME_FormClosing(ByVal sender As Object, _
    ByVal e As System.Windows.Forms.FormClosingEventArgs) Handles Me.FormClosing

    Dim ask As String
    If count = 0 Then
        ask = MsgBox("Do You Want to Get Backup Now?", vbQuestion + vbYesNo)
        If ask = "6" Then  ' vbYes
            last_backup()
        End If
        count += 1
    End If
    Application.Exit()
End Sub

Private Sub last_backup()
    Dim path As String = get_single_value("backup_path", "tbl_setting", "id", _
        get_max_number("id", "tbl_setting")) & "\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss")
    
    If path = "" Then
        MsgBox("Please Set Path From Setting", vbCritical, "WARNING")
        Exit Sub
    End If
    
    ' SQL Server backup to .bak, then convert to .rar
    Dim baklocation = path & ".bak"
    Dim testfile = path & ".rar"
    ' ... backup logic ...
    My.Computer.FileSystem.RenameFile(baklocation, Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".rar")
End Sub
```

### Notes
- Backup only triggers on HOME close (last open form)
- If `backup_path` not configured, shows warning and skips
- Count variable prevents duplicate prompts

---

## Tab Button Click Handler
```vb
Public Sub updateFunc(ByVal sender As Object, ByVal e As System.EventArgs)
    Dim b As Button = DirectCast(sender, Button)
    Dim load_for_remove As String = b.Name

    ' Close button (ends with X)
    If b.Text = "  " Then
        Dim final As String = load_for_remove.Substring(0, load_for_remove.Length - 1)
        
        ' Special handling for Invoice (confirm cancel)
        If final = "Add_Edit_Invoice" Then
            Dim ask As String
            ask = MsgBox("Are you sure you want to cancel?", vbQuestion + vbYesNo)
            If ask = "6" Then
                flt.Controls.Remove(ctrl)
                RemoveForm(final)
            Else
                Exit Sub
            End If
        End If
        
        flt.Controls.Remove(ctrl)
        RemoveForm(final)
        Exit Sub
    End If

    ' Show form button
    ShowForm(b.Name)
End Sub
```

---

## Role-Based Access Control

### Apply Rights to Form
```vb
Public Sub rights(ByRef frm As Form)
    Dim textboxes = GetAllControls(frm).OfType(Of Button)().ToList()
    For Each item As Button In textboxes
        ' Hide DELETE for non-admin users
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
        ' ... more styling ...
    Next
End Sub
```

### Admin-Only Button
```vb
Public Sub admin1(ByVal btn As Button)
    If user_id_log.ToLower <> "admin" Then
        btn.Visible = False
    End If
End Sub

' Usage in form paint event:
Private Sub View_Invoice_Paint(...)
    Call admin1(Button3)  ' DELETE button
End Sub
```

---

## Form Layout Helper

### Apply MDI Styling
```vb
Public Sub fback_color(ByVal frm As Form)
    frm.MdiParent = HOME
    frm.FormBorderStyle = FormBorderStyle.None
    frm.Location = New Point(0, 0)
    frm.Height = HOME.Height - 97
    frm.Width = HOME.Width - 10
    frm.BackColor = Color.White
End Sub

Public Sub moved(ByVal frm As Form)
    frm.Left = 0
    frm.Top = 0
End Sub
```

---

## Active Tab Indicator

```vb
Public Sub active_form(ByVal frm As String)
    For Each ctrl As Control In flt.Controls
        If frm = ctrl.Name Then
            ctrl.BackColor = Color.YellowGreen
            ctrl.ForeColor = Color.White
        ElseIf frm & "X" = ctrl.Name Then
            ctrl.BackColor = Color.YellowGreen
            ctrl.ForeColor = Color.White
        Else
            If ctrl.Text <> "X" Then
                ctrl.BackColor = Color.LightSkyBlue
                ctrl.ForeColor = Color.Black
            End If
        End If
    Next
End Sub
```

Active form button turns yellow, others remain light blue.

---

## Menu Click Handlers

### Pattern
```vb
Private Sub AddInvoiceToolStripMenuItem_Click(...)
    invoice_id = 0
    customer_id = 0
    Call __show(Add_Edit_Invoice)
    load_nav_bar("Add_Edit_Invoice", "Add Invoice")
End Sub

Private Sub ViewInvoiceToolStripMenuItem_Click(...)
    Call __show(View_Invoice)
    load_nav_bar("View_Invoice", "View Invoice")
End Sub

Private Sub BackupDatabaseToolStripMenuItem_Click(...)
    Call __show(Backup)
    load_nav_bar("Backup", "Backup Database")
End Sub
```

---

## Global Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `last_form` | Form | Previously active form |
| `user_id_log` | String | Current user role |
| `user_name` | String | Current user name |
| `invoice_id`, `quotation_id`, `receipt_id` | Double | Current record IDs |
| `customer_id`, `company_id`, `setting_id` | Double | Current entity IDs |
| `new_pro_key`, `new_pro_key_quo` | Boolean | Create new product flag |

---

## Grid Styling Helper

```vb
Public Sub grids1(ByRef grids As DataGridView)
    With grids
        .Font = New Font("Franklin Gothic Book", 11)
        .ForeColor = Color.Black
        .EnableHeadersVisualStyles = False
        .ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        .ColumnHeadersHeight = 45
        .RowTemplate.Height = 30
        .ColumnHeadersDefaultCellStyle.Font = New Font("Franklin Gothic Book", 14.75)
        .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
        .RowHeadersVisible = False
        .DefaultCellStyle.BackColor = Color.WhiteSmoke
        .BackgroundColor = Color.WhiteSmoke
        .AllowUserToResizeRows = False
        .AllowUserToResizeColumns = False
        .SelectionMode = DataGridViewSelectionMode.FullRowSelect
        .DefaultCellStyle.SelectionForeColor = Color.Black
        .RowsDefaultCellStyle.SelectionBackColor = Color.LightSkyBlue
        .CellBorderStyle = DataGridViewCellBorderStyle.Single
    End With
End Sub
```

---

## Keyboard Navigation

```vb
Public Sub ctrl_focus(ByVal e As System.Windows.Forms.KeyEventArgs)
    If e.KeyCode = 13 Then SendKeys.Send("{TAB}")
End Sub
```

Enter key advances to next control.

---

## Session End — Logout

### Flow
1. User clicks Logout
2. HOME form closes
3. Login form shows (was hidden, not closed)
4. User can log in as different user

```vb
Private Sub LogoutToolStripMenuItem_Click(...)
    Me.Dispose()
    Me.Close()
    Login.Show()  ' Login was hidden, not closed
End Sub
```

---

## Form Disposal Pattern

```vb
Private Sub FormName_Disposed(...)
    last_form_close(Me)
End Sub

Private Sub FormName_FormClosing(...)
    ' Commented out - no confirmation on close
End Sub

Private Sub Label6_Click(...)  ' X close button
    last_form_close(Me)
    Me.Dispose()
    Me.Close()
End Sub

Private Sub FormName_KeyDown(...)
    If e.KeyCode = Keys.Escape Then
        Me.Dispose()
        Me.Close()
    End If
End Sub
```

---

## MDI Child Management

### Opening Multiple Forms
- Multiple forms can be open simultaneously
- Tab bar shows all open forms
- Clicking tab shows that form
- Closing removes from tab bar

### Bringing Form to Front
```vb
' If form exists, show and activate
For Each frmClose As Form In HOME.MdiChildren
    If Frm = frmClose.Name Then
        Call __show(frmClose)
        Exit Sub
    End If
Next
```

### Form Cleanup
- `Disposed` event removes tab button
- `Close()` disposes form
- No explicit cleanup needed — VB handles it