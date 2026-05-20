# Settings, Email & Utility Module — Implementation Details

## Purpose
Document the settings management, email system, and utility operations (backup/restore).

---

## Table of Contents
1. [Settings Screen — Settings.vb](#1-settings-screen--settingsvb)
2. [Email System — direct_email.vb / emails.vb](#2-email-system)
3. [Backup Utility — Backup.vb](#3-backup-utility--backupvb)
4. [Restore Utility — RestoreDB.vb](#4-restore-utility--restoredbvb)
5. [Auto-Backup on HOME Close](#5-auto-backup-on-home-close)
6. [Connection String Handling](#6-connection-string-handling)
7. [Database Schemas](#7-database-schemas)
8. [Security Issues](#8-security-issues)

---

## 1. Settings Screen — `Settings.vb`

### Purpose
Central configuration form for the application: paths, VAT, payment modes, number sequences, and branding.

### Form Lifecycle

```vb
Private Sub Settings_Load(...)
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    setting_id = get_max_number("id", "tbl_setting")
    invoice_id1 = get_max_number("id", "tbl_numbers")
    Call load_data()
End Sub
```

### Fields

#### VAT Configuration
| Field | DB Column | Control | Default |
|-------|-----------|---------|---------|
| isvat | isvat | CheckBox | 1 (checked) |
| vat_per | vat_per | TextBox | 5 |

#### File Paths
| Field | DB Column | Control | Purpose |
|-------|-----------|---------|---------|
| invoice_path | invoice_path | TextBox | Invoice PDF save path |
| quo_path | quo_path | TextBox | Quotation PDF save path |
| report_path | report_path | TextBox | Report PDF save path |
| backup_path | backup_path | TextBox | Backup destination |
| back_path | back_path | PictureBox | Login form background image |

#### Other Settings
| Field | DB Column | Control | Purpose |
|-------|-----------|---------|---------|
| invoice_days | invoice_days | TextBox | Days before invoice edit lock |
| cash | cash | TextBox | Cash payment label |
| cheque | cheque | TextBox | Cheque payment label |
| other | other | TextBox | Other payment label |

#### Number Sequences (tbl_numbers)
| Field | DB Column | Control | Purpose |
|-------|-----------|---------|---------|
| invoice_no | invoice_no | TextBox | Next invoice number |
| quo_no | quo_no | TextBox | Next quotation number |

### Data Loading — `load_data()`

```vb
Public Sub load_data()
    ' Load settings from tbl_setting
    Call SQL_Select("tbl_setting", "", " id='" & setting_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        ' VAT state
        Dim temp As String = ds.Tables(0).Rows(0).Item("isvat").ToString
        If Val(temp) = 0 Then
            isvat.ForeColor = Color.Red
            isvat.Text = "Deactive"
            isvat.Checked = False
        ElseIf Val(temp) = 1 Then
            isvat.Checked = True
        End If
        
        ' Numeric fields
        vat_per.Text = Val(ds.Tables(0).Rows(0).Item("vat_per").ToString)
        invoice_days.Text = ds.Tables(0).Rows(0).Item("invoice_days").ToString
        
        ' Path fields
        quo_path.Text = ds.Tables(0).Rows(0).Item("quo_path").ToString
        invoice_path.Text = ds.Tables(0).Rows(0).Item("invoice_path").ToString
        report_path.Text = ds.Tables(0).Rows(0).Item("report_path").ToString
        backup_path.Text = ds.Tables(0).Rows(0).Item("backup_path").ToString
        
        ' Payment labels
        TextBox3.Text = ds.Tables(0).Rows(0).Item("cash").ToString
        TextBox2.Text = ds.Tables(0).Rows(0).Item("cheque").ToString
        TextBox1.Text = ds.Tables(0).Rows(0).Item("other").ToString
        
        ' Logo/background image loading
        If ds.Tables(0).Rows(0).Item("back_path").ToString <> "" Then
            If File.Exists(ds.Tables(0).Rows(0).Item("back_path").ToString) = True Then
                Dim inImg2 As Image = Image.FromFile(ds.Tables(0).Rows(0).Item("back_path").ToString)
                pic_logo.Image = inImg2
            End If
        End If
    End If

    ' Load number sequences from tbl_numbers
    Call SQL_Select("tbl_numbers", "", " id='" & invoice_id1 & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        invoice_no.Text = Val(ds.Tables(0).Rows(0).Item("invoice_no").ToString)
        quo_no.Text = Val(ds.Tables(0).Rows(0).Item("quo_no").ToString)
    End If
End Sub
```

### VAT CheckBox Visual Feedback

```vb
Private Sub isvat_CheckedChanged(...)
    If isvat.Checked = True Then
        isvat.ForeColor = Color.Green
        isvat.Text = "Active"
    Else
        isvat.ForeColor = Color.Red
        isvat.Text = "Deactive"
    End If
End Sub
```

### Path Browse Handlers

Each path field has a browse button that opens `FolderBrowserDialog`:

```vb
' Button3 → invoice_path (line 132)
' Button4 → quo_path (line 142)
' Button5 → report_path (line 152)
' Button7 → backup_path (line 178)

Private Sub Button7_Click(...)  ' Backup path example
    If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
        If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
            backup_path.Text = FolderBrowserDialog1.SelectedPath
        Else
            backup_path.Text = FolderBrowserDialog1.SelectedPath
        End If
    End If
End Sub
```

### Logo/BG Image Selection

```vb
' Button6 → back_path / pic_logo (line 162)
Dim strfilename As String

Private Sub Button6_Click(...)
    OpenFileDialog1.Filter = "All Images Files (*.png;*.jpeg;*.gif;*.jpg;*.bmp;*.tiff;*.tif)|*.png;*.jpeg;*.gif;*.jpg;*.bmp;*.tiff;*.tif"
    With OpenFileDialog1
        If .ShowDialog = Forms.DialogResult.OK Then
            strfilename = OpenFileDialog1.FileName
            pic_logo.Image = Image.FromFile(strfilename)
            bmp = pic_logo.Image
            IMG1 = True
        End If
    End With
End Sub
```

### Save Logic — `Button1_Click()`

```vb
Private Sub Button1_Click(...)
    ' 1. Parse isvat checkbox to numeric
    Dim ischeck As Double = 0
    If isvat.Checked = True Then ischeck = 1

    ' 2. Build settings dictionary
    Dim variable As New Dictionary(Of String, String)
    variable.Add("isvat", "'" & ischeck & "'")
    variable.Add("vat_per", "'" & Val(vat_per.Text) & "'")
    variable.Add("quo_path", "'" & quo_path.Text & "'")
    variable.Add("invoice_path", "'" & invoice_path.Text & "'")
    variable.Add("report_path", "'" & report_path.Text & "'")
    variable.Add("invoice_days", "'" & invoice_days.Text & "'")
    variable.Add("backup_path", "'" & backup_path.Text & "'")
    variable.Add("cash", "'" & TextBox3.Text & "'")
    variable.Add("cheque", "'" & TextBox2.Text & "'")
    variable.Add("other", "'" & TextBox1.Text & "'")
    
    ' Only update back_path if new image selected
    If strfilename <> "" Then
        variable.Add("back_path", "'" & strfilename & "'")
    End If

    ' 3. Update or insert settings
    If setting_id > 0 Then
        SQL_Update("tbl_setting", variable, "id=" & setting_id)
    Else
        SQL_Insert("tbl_setting", variable)
    End If

    ' 4. Update number sequences (tbl_numbers)
    If invoice_id1 > 0 Then
        Dim variable1 As New Dictionary(Of String, String)
        variable1.Add("invoice_no", "'" & Val(invoice_no.Text) & "'")
        variable1.Add("quo_no", "'" & Val(quo_no.Text) & "'")
        SQL_Update("tbl_numbers", variable1, "id=" & invoice_id1)
    Else
        Dim variable1 As New Dictionary(Of String, String)
        variable1.Add("invoice_no", "'" & Val(invoice_no.Text) & "'")
        variable1.Add("quo_no", "'" & Val(quo_no.Text) & "'")
        SQL_Insert("tbl_numbers", variable1)
    End If

    MsgBox("Setting Details Saved!", vbInformation)
    Call HOME.HOME_Load(sender, e)  ' Refresh HOME with new settings
    Me.Dispose()
    Me.Close()
End Sub
```

### Form Behavior

| Event | Handler | Action |
|-------|---------|--------|
| Escape key | `KeyDown` | Close form |
| Form move | `Move` | Call `moved(Me)` for position tracking |
| Form dispose | `Disposed` | Call `last_form_close(Me)` |
| X button | `Label6_Click` | Close form |

---

## 2. Email System

### Purpose
Send PDF attachments via SMTP with customizable templates for invoices, quotations, statements, and receipts.

### Form — `direct_email.vb`

#### Form Fields
| Field | Control | Purpose |
|-------|---------|---------|
| receiver_id | TextBox | To: email address |
| sender_id | TextBox | From: email address |
| passss | TextBox | SMTP password |
| Subject | TextBox | Email subject |
| sub_subject | TextBox | Additional subject info |
| body | TextBox | Email body (with placeholders) |
| attach | TextBox | PDF file path |
| CheckedListBox1 | CheckedListBox | Multiple attachments |

#### Send Logic
```vb
Private Sub Button5_Click(...)
    ' 1. Validate inputs
    If receiver_id.Text = "" Then
        MsgBox("Please Enter Receiver ID", vbCritical, "WARNING")
        Exit Sub
    End If
    If sender_id.Text = "" Then
        MsgBox("Please Enter Sender ID", vbCritical, "WARNING")
        Exit Sub
    End If

    ' 2. Show progress
    Label2.Visible = True
    Application.DoEvents()

    ' 3. Send email via sent_mail()
    Call sent_mail(Subject.Text, attach.Text, receiver_id.Text, 
                   sender_id.Text, passss.Text, body.Text, sub_subject.Text)
    
    Me.Dispose()
    Me.Close()
End Sub
```

#### Add Attachments
```vb
Private Sub Button2_Click(...)
    Dim fbd As New OpenFileDialog With {
        .Title = "Select multiple files",
        .Multiselect = True,
        .FileName = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)}

    If fbd.ShowDialog = DialogResult.OK Then
        For Each mFile As String In fbd.FileNames
            CheckedListBox1.Items.Add(mFile, True)  ' Add checked by default
        Next
    End If
End Sub
```

### Template System — `emails.vb`

#### Template Identification
| identify | Usage |
|----------|-------|
| INVOICE | Invoice email template |
| QUOTATION | Quotation email template |
| STATEMENT | Statement email template |
| RECEIPT | Receipt email template |

#### Load Template (emails.vb — three_buttons method)
```vb
Public Sub three_buttons(ByRef btn As Button)
    real_identify = btn.Text.Replace("&", "")
    Call SQL_Select("tbl_email", , " identify='" & btn.Text.Replace("&", "") & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        sender_id.Text = ds.Tables(0).Rows(0).Item("sender").ToString
        sender_pass.Text = ds.Tables(0).Rows(0).Item("sender_pass").ToString
        body.Text = ds.Tables(0).Rows(0).Item("body").ToString
        Subject.Text = ds.Tables(0).Rows(0).Item("subject").ToString
        sub_subject.Text = ds.Tables(0).Rows(0).Item("sub_subject").ToString
    End If
End Sub
```

#### Placeholder Replacements
**NOT IMPLEMENTED in source.** No placeholder replacement code exists in emails.vb or direct_email.vb. Placeholder strings (`<date>`, `<contact person>`) stored in tbl_email.body are sent as-is.

#### Placeholder Summary
| Placeholder | Replaced With |
|-------------|----------------|
| `<date>` | Formatted document date (dd.MM.yyyy) |
| `<contact person>` | Customer contact name |
| `invoice` | `quotation` (in quotation emails only) |

---

## 3. Backup Utility — `Backup.vb`

### Purpose
Create SQL Server database backup files with simulated compression (renamed to .rar).

### Form Layout
| Control | Type | Purpose |
|---------|------|---------|
| txt_path | TextBox | Backup file path (date-stamped) |
| FolderBrowserDialog1 | FolderBrowserDialog | Path selection |
| Button1 | Button | Browse for path |
| Button3 | Button | Execute backup |
| Button4 | Button | Close form |
| ProgressBar1 | ProgressBar | Progress indication |
| Timer1 | Timer | Progress animation |
| Label1 | Label | Status text |

### Path Selection — `Button1_Click()`
```vb
Private Sub Button1_Click(...)
    If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
        If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
            txt_path.Text = FolderBrowserDialog1.SelectedPath & "\" & Format(Date.Now, "dd-MM-yyyy")
        Else
            txt_path.Text = FolderBrowserDialog1.SelectedPath & Format(Date.Now, "dd-MM-yyyy")
        End If
    End If
End Sub
```

### Backup Process — `Nw_Backup()`
```vb
Private Sub Nw_Backup()
    ' 1. Validate path
    If txt_path.Text = "" Then
        MsgBox("Please Select Path to save Backup", vbCritical, "WARNING")
        txt_path.Focus()
        Exit Sub
    End If

    ' 2. Close existing connection
    con.Dispose()
    con.Close()

    ' 3. Create new connection to master DB
    Dim sqlConn As New SqlConnection(backup_constr)
    sqlConn.Open()

    ' 4. Build backup command
    Dim dbnm As String = "[" & db_nm & "]"
    Dim bkp_file_nm As String = txt_path.Text & ".bak"
    
    Dim sCommand = "BACKUP DATABASE " & dbnm & " TO DISK = N'" & bkp_file_nm & "' WITH COPY_ONLY"

    ' 5. Execute backup
    Using sqlCmd As New SqlCommand(sCommand, sqlConn)
        sqlCmd.ExecuteNonQuery()
    End Using

    ' 6. Rename to .rar (compression simulation)
    Dim new_file As String = Format(Date.Now, "dd-MM-yyyy") & "XPRESSBKP.rar"
    Dim testfile As String = txt_path.Text & "TI.rar"
    
    If My.Computer.FileSystem.FileExists(testfile) Then
        My.Computer.FileSystem.DeleteFile(testfile)
    End If
    My.Computer.FileSystem.RenameFile(bkp_file_nm, new_file)

    ' 7. Show progress
    ProgressBar1.Value = 0
    Timer1.Enabled = True
    ProgressBar1.Visible = True
End Sub
```

### Backup Button — `Button3_Click()`
```vb
Private Sub Button3_Click(...)
    Call Nw_Backup()
End Sub
```

### Progress Timer — `Timer1_Tick()`
```vb
Private Sub Timer1_Tick(...)
    If ProgressBar1.Value = 100 Then
        Timer1.Enabled = False
        ProgressBar1.Visible = False
        Label1.Text = "Process 100 % Finished"
        MsgBox("Backup Process Completed Successfully", vbInformation, "Information")
        Label1.Visible = False
    Else
        ProgressBar1.Value = ProgressBar1.Value + 5
        Label1.Text = "Process " & ProgressBar1.Value & " % Finished"
    End If
End Sub
```

### Output File Format
| Step | File | Example |
|------|------|---------|
| Initial path | User-selected + date | `D:\Backups\20-05-2026` |
| After SQL backup | .bak file | `D:\Backups\20-05-2026.bak` |
| After rename | .rar file | `D:\Backups\20-05-2026XPRESSBKP.rar` |

**Note:** The .rar extension is misleading — the file is still a SQL Server backup file, just renamed to simulate compression.

### Dependencies
- `db_nm`: Database name from Module1
- `backup_constr`: Backup connection string from Module1
- `con_sql()`: Connection initialization

---

## 4. Restore Utility — `RestoreDB.vb`

### Purpose
Restore SQL Server database from backup file (.bak/.rar).

### Form Layout
| Control | Type | Purpose |
|---------|------|---------|
| txt_path | TextBox | Backup file path |
| OpenFileDialog1 | OpenFileDialog | File selection |
| Button1 | Button | Browse for .bak/.rar file |
| Button3 | Button | Execute restore |
| Button4 | Button | Close form |
| ProgressBar1 | ProgressBar | Progress indication |
| Timer1 | Timer | Progress animation |
| Label1 | Label | Status text |

### File Selection — `Button1_Click()`
```vb
Private Sub Button1_Click(...)
    If (OpenFileDialog1.ShowDialog() = DialogResult.OK) Then
        txt_path.Text = OpenFileDialog1.FileName
    Else
        txt_path.Text = ""
    End If
End Sub
```

### Restore Process — `Restore_DATA()`

```vb
Private Sub Restore_DATA()
    ' 1. Validate path
    If txt_path.Text = "" Then
        MsgBox("Please Select File to Restore Data", vbCritical, "WARNING")
        txt_path.Focus()
        Exit Sub
    End If

    ' 2. Confirm restore
    Dim que As String
    que = MsgBox("Are You Sure Want to Restore Data?, Previous Data will be removed", 
                 vbQuestion + vbYesNo, "Question")
    If que = vbNo Then Exit Sub

    ' 3. Close application connection
    If con.State = 1 Then
        con.Close()
        con.Dispose()
        con = Nothing
    End If

    ProgressBar1.Value = ProgressBar1.Value + 20
    Dim a As String = Application.StartupPath
    Dim dblocation, baklocation As String

    baklocation = txt_path.Text

    ' 4. Rename .rar back to .bak for SQL Server
    Dim new_file As String
    new_file = Replace(OpenFileDialog1.SafeFileName, "rar", "bak")
    My.Computer.FileSystem.RenameFile(baklocation, new_file)
    baklocation = txt_path.Text.Replace("rar", "bak")

    ' 5. Connect to master database
    Dim sqlConn As New SqlConnection(backup_constr)
    sqlConn.Open()

    Dim dbnm As String = "[" & db_nm & "]"

    ' 6. Set single-user mode (force disconnect other users)
    Dim qry As String = "use [master] "
    Using sqlCmd As New SqlCommand(qry, sqlConn)
        sqlCmd.ExecuteNonQuery()
    End Using
    
    qry = "alter database " & dbnm & " set single_user with rollback immediate"
    Using sqlCmd As New SqlCommand(qry, sqlConn)
        sqlCmd.ExecuteNonQuery()
    End Using

    ' 7. Execute restore
    Dim sCommand = "RESTORE DATABASE " & dbnm & " FROM DISK = N'" & baklocation & "' WITH REPLACE"
    Using sqlCmd As New SqlCommand(sCommand, sqlConn)
        sqlCmd.ExecuteNonQuery()
    End Using

    ' 8. Set multi-user mode
    qry = "ALTER DATABASE " & dbnm & " SET Multi_User"
    Using sqlCmd As New SqlCommand(qry, sqlConn)
        sqlCmd.ExecuteNonQuery()
    End Using

    ' 9. Rename back to .rar
    new_file = Replace(OpenFileDialog1.SafeFileName, "bak", "rar")
    My.Computer.FileSystem.RenameFile(baklocation, new_file)

    Timer1.Enabled = True
    ProgressBar1.Visible = True
End Sub
```

### Restore Button — `Button3_Click()`
```vb
Private Sub Button3_Click(...)
    Call Restore_DATA()
End Sub
```

### Restore Progress Timer — `Timer1_Tick()`
```vb
Private Sub Timer1_Tick(...)
    If ProgressBar1.Value = 100 Then
        Timer1.Enabled = False
        ProgressBar1.Visible = False
        Label1.Text = "Process 100 % Finished"
        MsgBox("Restore Done, It will Exit now", vbInformation, "Information")
        Application.Exit()  ' Force exit after restore
    Else
        ProgressBar1.Value = ProgressBar1.Value + 5
        Label1.Text = "Process " & ProgressBar1.Value & " % Finished"
    End If
End Sub
```

### Restore Safety Steps
| Step | Action | Purpose |
|------|--------|---------|
| 1 | Close app connection | Release database |
| 2 | Rename .rar → .bak | Convert for SQL Server |
| 3 | `USE master` | Switch context |
| 4 | `SET single_user` | Block other connections |
| 5 | `RESTORE DATABASE` | Restore from file |
| 6 | `SET multi_user` | Restore normal access |
| 7 | Rename .bak → .rar | Restore original extension |

**Note:** After restore completes, `Application.Exit()` forces the application to close. User must restart.

---

## 5. Auto-Backup on HOME Close

### Trigger
`HOME_FormClosing` event prompts user for backup before exit:

```vb
Dim count As Double = 0

Private Sub HOME_FormClosing(...)
    Dim ask As String
    If count = 0 Then
        ask = MsgBox("Do You Want to Get Backup Now?", vbQuestion + vbYesNo)
        If ask = "6" Then  ' Yes = 6
            last_backup()
        End If
        count += 1
    End If
    Application.Exit()
End Sub
```

### Auto-Backup Logic — `last_backup()`

```vb
Private Sub last_backup()
    ' 1. Build path from settings
    Dim path As String = get_single_value("backup_path", "tbl_setting", "id", 
                           get_max_number("id", "tbl_setting")) & "\" & 
                           Format(Date.Now, "dd-MM-yyyy HH_mm_ss")
    
    If path = "" Then
        MsgBox("Please Set Path From Setting", vbCritical, "WARNING")
        Exit Sub
    End If

    ' 2. Prepare backup variables
    Dim a As String = Application.StartupPath & "\XPressDB.mdf"
    Dim dblocation, baklocation, testfile As String
    Call con_sql()

    dblocation = "[" & Application.StartupPath & "\XPressDB.mdf" & "]"
    baklocation = path & ".bak"

    ' 3. Create backup connection
    Dim dbnm As String = "[" & db_nm & "]"
    Dim bkp_file_nm As String = baklocation
    
    con.Dispose()
    con.Close()
    Dim sqlConn As New SqlConnection(backup_constr)
    sqlConn.Open()

    ' 4. Execute backup
    Dim sCommand = "BACKUP DATABASE " & dbnm & " TO DISK = N'" & bkp_file_nm & "' WITH COPY_ONLY"
    Using sqlCmd As New SqlCommand(sCommand, sqlConn)
        sqlCmd.ExecuteNonQuery()
    End Using

    ' 5. Rename to .rar
    Dim new_file As String = Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".rar"
    testfile = path & ".rar"
    If My.Computer.FileSystem.FileExists(testfile) Then
        My.Computer.FileSystem.DeleteFile(testfile)
    End If
    My.Computer.FileSystem.RenameFile(baklocation, new_file)
End Sub
```

### Comparison: Manual vs Auto-Backup

| Feature | Manual (Backup.vb) | Auto (HOME.vb) |
|---------|---------------------|----------------|
| Trigger | Button click | HOME close prompt |
| Filename | `dd-MM-yyyyXPRESSBKP.rar` | `dd-MM-yyyy HH_mm_ss.rar` |
| Timestamp | Date only | Date + time (HH_mm_ss) |
| Path | User-selected | From `tbl_setting.backup_path` |
| Progress bar | Yes | No |
| Confirmation | Path validation | Yes/No dialog |

---

## 6. Connection String Handling

### Global Variables in Module1

```vb
Public REPORT_CON_STRING As String   ' For reports
Public backup_constr As String       ' For backup/restore
```

### Initialization in `con_sql()`

```vb
Public Sub con_sql()
    ' ... main connection setup ...
    REPORT_CON_STRING = con.ConnectionString
    backup_constr = con.ConnectionString
    con.Open()
End Sub
```

### Hardcoded Connection (Security Issue)

```vb
' In Module1.vb - conditional by PC name
Dim pc As String = My.Computer.Name
If UCase(pc) = "MAHESH" Or UCase(pc) = "ANKIT-PC" Then
    con.ConnectionString = "Data Source=MAHESH\SQLEXPRESS;..."  ' Local dev
Else
    con.ConnectionString = "Data Source=TRUTHALWAYSTRIU\SQLEXPRESS;..."  ' Client
End If
```

**For replication:** Store in config file, not hardcoded.

---

## 7. Database Schemas

### tbl_setting

```sql
CREATE TABLE tbl_setting (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    isvat NUMERIC(18,0),           -- 0=No VAT, 1=VAT enabled
    vat_per NUMERIC(18,0),          -- VAT percentage (e.g., 5)
    invoice_path VARCHAR(MAX),      -- Invoice PDF save path
    quo_path VARCHAR(MAX),         -- Quotation PDF save path
    report_path VARCHAR(MAX),       -- Report PDF save path
    invoice_days VARCHAR(100),      -- Days before edit lock
    back_path VARCHAR(MAX),         -- Login background image
    backup_path VARCHAR(MAX),       -- Backup destination
    cash VARCHAR(MAX),              -- Cash label (default "Cash")
    cheque VARCHAR(MAX),            -- Cheque label (default "Cheque")
    other VARCHAR(MAX)             -- Other label (default "Other")
)
```

### tbl_numbers

```sql
CREATE TABLE tbl_numbers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    invoice_no NUMERIC(18,0) DEFAULT 0,
    quo_no NUMERIC(18,0) DEFAULT 1,
    receipt_no NUMERIC(18,0) DEFAULT 1
)
```

**Note:** Single row stores all sequence counters. Only one invoice/quotation/receipt sequence exists.

### tbl_email

```sql
CREATE TABLE tbl_email (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    client_email VARCHAR(500),      -- Not used in current code
    sender VARCHAR(500),            -- SMTP from address
    subject VARCHAR(500),           -- Email subject template
    body VARCHAR(MAX),              -- Email body with placeholders
    sender_pass VARCHAR(100),       -- SMTP password (plain text ⚠️)
    identify VARCHAR(100),           -- INVOICE/QUOTATION/STATEMENT/RECEIPT
    sub_subject VARCHAR(MAX)          -- Additional subject line
)
```

### Default Templates (created in auto_field)

```vb
SQL_Insert("tbl_email", {"identify": "'INVOICE'"})
SQL_Insert("tbl_email", {"identify": "'QUOTATION'"})
SQL_Insert("tbl_email", {"identify": "'STATEMENT'"})
SQL_Insert("tbl_email", {"identify": "'RECEIPT'"})
```

---

## 8. Security Issues

| Issue | Risk | Fix |
|-------|------|-----|
| SMTP password in DB | Plain text storage | Use encrypted storage / env vars |
| Connection string hardcoded | PC-specific, no config | Config file / environment variables |
| Database credentials in code | Exposure if repo public | Use Windows Auth / secrets manager |
| Backup path not validated | Path injection | Validate and sanitize paths |
| .rar extension misleading | User confusion | Use actual compression or correct extension |

---

## Appendix: Control-to-Button Mapping (Settings.vb)

| Button | Control Updated | Line |
|--------|----------------|------|
| Button1 | Save all | 85 |
| Button2 | Cancel/Close | 70 |
| Button3 | invoice_path | 132 |
| Button4 | quo_path | 142 |
| Button5 | report_path | 152 |
| Button6 | back_path (image) | 162 |
| Button7 | backup_path | 178 |

---

## Appendix: Backup/Restore File Extension Flow

```
Backup:
  SQL Server → {path}/{date}.bak → Rename → {path}/{date}XPRESSBKP.rar

Restore:
  {path}/{date}XPRESSBKP.rar → Rename → {path}/{date}.bak → SQL Server
```

**Note:** Both backup and restore assume .rar files are actually .bak files with renamed extensions. No actual compression is performed.
