# Email System Specification

## Overview

Complete email workflow from template management to sending with attachments. Three modules handle email operations: template CRUD, direct sending UI, and the core SMTP delivery function.

---

## Module 1: emails.vb — Email Template Management

### Purpose
Management screen for email templates, each tied to a specific document type (Invoice, Quotation, Statement, Receipt).

### Database Table: `tbl_email`

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key, auto-increment |
| `client_email` | String | Client email address |
| `sender` | String | Sender's email (SMTP username) |
| `sender_pass` | String | SMTP password (base64 encoded in legacy, plain text in use) |
| `subject` | String | Email subject line |
| `body` | String | Email body template (supports placeholder: `Dear {title} {name},`) |
| `identify` | String | Template type: `INVOICE`, `QUOTATION`, `STATEMENT`, `RECEIPT` |
| `sub_subject` | String | Display name for sender (used as MailAddress display name) |

### UI Components

```
┌─────────────────────────────────────────────────┐
│ [INVOICE] [QUOTATION] [STATEMENT] [RECEIPT]     │
│                                                 │
│ Sender ID:     [___________________________]    │
│ Sender Pass:   [___________________________]    │
│ Subject:       [___________________________]    │
│ Sub Subject:   [___________________________]    │
│ Body:          [___________________________]    │
│                 [___________________________]    │
│                 [___________________________]    │
│                                                 │
│ Receiver ID:   [____Search...________▼]         │
│                ┌──────────────────────┐          │
│                │ Name    │ Email     │          │
│                └──────────────────────┘          │
│                                                 │
│ [Save] [Cancel]                                 │
└─────────────────────────────────────────────────┘
```

### Identify Values (Template Types)
- `INVOICE` — Invoice email template
- `QUOTATION` — Quotation email template
- `STATEMENT` — Statement email template
- `RECEIPT` — Receipt email template

### CRUD Operations

#### Create/Update Template
```vb
Public Sub saved()
    Dim variable As New Dictionary(Of String, String)
    variable.Add("sender", "'" & sender_id.Text.Replace("'", "''") & "'")
    variable.Add("subject", "'" & Subject.Text.Replace("'", "''") & "'")
    variable.Add("sub_subject", "'" & sub_subject.Text.Replace("'", "''") & "'")
    variable.Add("body", "'" & body.Text.Replace("'", "''") & "'")
    variable.Add(sender_pass.Name, "'" & sender_pass.Text.Replace("'", "''") & "'")
    
    If email_id > 0 Then
        Dim d As String = SQL_Update("tbl_email", variable, "id=" & email_id)
    Else
        Dim d As Integer = SQL_Insert("tbl_email", variable)
    End If
End Sub
```

#### Load Template by Type
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
        email_id = ds.Tables(0).Rows(0).Item("id").ToString
    End If
End Sub
```

### Customer Search Flow
1. User clicks `receiver_id` TextBox → triggers `txt_search` visibility
2. Typing 3+ chars triggers `load_customer()` → searches `tbl_customer`
3. DataGridView shows: `id`, `customer_name`, `email`
4. Selecting (Enter key or click) populates:
   - `body.Text = "Dear {title} {customer_name},"`
   - `receiver_id.Text = {customer_email}`

---

## Module 2: direct_email.vb — Direct Email Sending Screen

### Purpose
Send emails with attachments from pre-configured SMTP settings. Allows manual entry of recipient, subject, body, and multiple file attachments.

### UI Components

```
┌─────────────────────────────────────────────────┐
│ Subject:   [___________________________]        │
│ Receiver:  [___________________________]        │
│ Sender ID: [___________________________]        │
│ Password:  [___________________________]        │
│ Body:      [___________________________]        │
│            [___________________________]        │
│            [___________________________]        │
│ Attach:    [___________________________]        │
│ Files:     ☑ C:\docs\invoice.pdf               │
│            ☑ C:\docs\statement.pdf              │
│            ☑ C:\docs\receipt.pdf                │
│            [Browse...]                           │
│                                                 │
│            [Send Email] [Cancel]                │
└─────────────────────────────────────────────────┘
```

### Attachment Handling
```vb
Private Sub Button2_Click(...)
    Dim fbd As New OpenFileDialog With { _
        .Title = "Select multiple files", _
        .Multiselect = True, _
        .FileName = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)}
    
    If fbd.ShowDialog = DialogResult.OK Then
        For Each mFile As String In fbd.FileNames
            CheckedListBox1.Items.Add(mFile, True)  ' Default: checked
        Next
    End If
End Sub
```

- Uses `CheckedListBox1` for multiple file selection
- All files default to checked state
- Files passed to `sent_mail()` via the checked items collection

### Send Flow
```vb
Private Sub Button5_Click(...)
    ' Validation
    If receiver_id.Text = "" Then
        MsgBox("Please Enter Receiver ID", vbCritical, "WARNING")
        Exit Sub
    End If
    If sender_id.Text = "" Then
        MsgBox("Please Enter Sender ID", vbCritical, "WARNING")
        Exit Sub
    End If
    
    Label2.Visible = True
    Application.DoEvents()
    
    ' Call email_module.sent_mail with all parameters
    Call sent_mail(Subject.Text, attach.Text, receiver_id.Text, sender_id.Text, passss.Text, body.Text, sub_subject.Text)
    
    Me.Dispose()
    Me.Close()
End Sub
```

---

## Module 3: email_module.vb — Core Email Delivery

### Purpose
Shared module containing the `sent_mail()` function that handles all SMTP communication.

### SMTP Configuration

| Setting | Value |
|---------|-------|
| Host | `smtp.gmail.com` |
| Port | `587` (TLS) |
| Security | SSL/TLS enabled |
| Authentication | Username/Password credentials |

### Function Signature

```vb
Public Sub sent_mail( _
    ByVal subject As String,       ' Email subject line
    ByVal att As String,           ' Primary attachment file path
    ByVal rec_id As String,        ' Recipient email address
    ByVal sender_id As String,     ' Sender email (SMTP username)
    ByVal pass As String,           ' SMTP password
    ByVal body As String,           ' Email body content
    ByVal sub_subject As String    ' Display name for sender
)
```

### Parameter Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  emails.vb  │───▶│direct_email │───▶│email_module │
│ (template)  │    │   .vb       │    │ .vb         │
│             │    │ (user UI)   │    │(SMTP send)  │
└─────────────┘    └─────────────┘    └─────────────┘

Parameters passed:
  subject     ← Subject.Text
  att         ← attach.Text (single attachment path)
  rec_id      ← receiver_id.Text
  sender_id   ← sender_id.Text
  pass        ← passss.Text
  body        ← body.Text
  sub_subject ← sub_subject.Text (sender display name)
```

### Implementation Details

```vb
Public Sub sent_mail(...)
    Dim mail As New MailMessage
    Dim attachment As System.Net.Mail.Attachment
    
    ' Build email
    mail.Subject = subject
    mail.Body = body
    mail.To.Clear()
    mail.Attachments.Clear()
    mail.To.Add(rec_id)
    
    ' Primary attachment
    attachment = New System.Net.Mail.Attachment(att)
    mail.Attachments.Add(attachment)
    
    ' Additional attachments from CheckedListBox
    For i = 0 To direct_email.CheckedListBox1.CheckedItems.Count - 1
        attachment = New System.Net.Mail.Attachment(direct_email.CheckedListBox1.CheckedItems(i).ToString())
        mail.Attachments.Add(attachment)
    Next
    
    ' Set sender with display name
    mail.From = New MailAddress(sender_id, sub_subject)
    
    ' Configure SMTP
    Dim SMTP As New SmtpClient("smtp.gmail.com")
    SMTP.EnableSsl = True
    SMTP.Credentials = New Net.NetworkCredential(sender_id.Trim(), pass.Trim())
    SMTP.DeliveryMethod = SmtpDeliveryMethod.Network
    SMTP.Port = 587
    
    ' Send
    SMTP.Send(mail)
    MsgBox("Sent Message To : " & rec_id, MsgBoxStyle.Information, "Sent!")
    
    SMTP.Dispose()
End Sub
```

### Key Implementation Notes

1. **Global Mail Object**: `mail` declared at module level (line 4) — persists across calls
2. **Direct Form Reference**: Accesses `direct_email.CheckedListBox1` directly (tight coupling)
3. **Attachment Bug**: Line 33 adds `attachment` again after the loop (duplicate last file)
4. **Display Name**: `sub_subject` parameter used as `MailAddress` display name, not subject
5. **Clearing**: Clears `mail.To` and `mail.Attachments` before each send (prevents accumulation)

---

## Complete Email Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    EMAIL SYSTEM WORKFLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [1] Template Selection (emails.vb)                            │
│      └─ User clicks: INVOICE / QUOTATION / STATEMENT / RECEIPT  │
│      └─ Loads template from tbl_email by identify field        │
│         • sender_id, sender_pass, subject, body, sub_subject     │
│                                                                  │
│  [2] Recipient Selection                                         │
│      └─ Type 3+ chars in receiver_id → search tbl_customer      │
│      └─ DataGridView shows matching customers                    │
│      └─ Select customer → auto-fill:                            │
│         • body = "Dear {title} {name},"                         │
│         • receiver_id = {customer_email}                        │
│                                                                  │
│  [3] Attachment Selection (optional)                            │
│      └─ Button2 opens file dialog (multi-select)                 │
│      └─ Files added to CheckedListBox1 (checked by default)     │
│                                                                  │
│  [4] Send Action                                                 │
│      └─ Button5 validates: receiver_id, sender_id not empty      │
│      └─ Calls sent_mail() with all parameters                   │
│                                                                  │
│  [5] SMTP Delivery (email_module.vb)                            │
│      └─ Creates MailMessage with subject, body, recipient        │
│      └─ Attaches primary file + all checked files from list     │
│      └─ Configures Gmail SMTP: smtp.gmail.com:587, TLS, SSL    │
│      └─ Authenticates with sender credentials                    │
│      └─ Sends email                                             │
│      └─ Shows success message                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

1. **Plain-text Password Storage**: `sender_pass` stored in `tbl_email` in plain text
2. **Admin-only Password Visibility**: `sender_pass` TextBox hidden for non-admin users
3. **SMTP Credential Handling**: Password passed directly to `SmtpClient.Credentials`
4. **SQL Injection Risk**: `txt_search.Text` inserted directly into SQL query (no parameterized query)

---

## Migration Notes

### For .NET 6+ / C# Port
- Replace `System.Net.Mail.MailMessage` with `MailKit.MimeMessage` (System.Net.Mail deprecated)
- Replace `SmtpClient` with `MailKit.SmtpClient`
- TLS 587 → use `MailKit.Security.SecureSocketOptions.StartTls`
- Decouple `email_module` from `direct_email` form reference — pass `List<string>` for attachments
- Parameterize SQL queries to prevent injection
- Store SMTP credentials encrypted, not plain text

### Attachment Handling Fix
Current code has duplicate attachment bug (line 33). Should be:
```vb
' REMOVE: mail.Attachments.Add(attachment)  ' Line 33 is duplicate
```