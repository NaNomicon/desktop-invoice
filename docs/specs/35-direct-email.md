# 35. Direct Email (`direct_email.vb`) Specification

## Purpose

The `direct_email` form provides an interactive email sending workflow in the legacy XPress desktop app. It allows users to:

- Enter sender and recipient email details
- Provide sender password for SMTP authentication
- Compose message subject and body
- Select and attach one or many files
- Send via Gmail SMTP (`smtp.gmail.com`) using TLS

This feature is implemented across:

- `docs/xpress/legacy-code/XPress/Email/direct_email.vb` (UI/form flow)
- `docs/xpress/legacy-code/XPress/email_module.vb` (SMTP send logic)

---

## UI Components

The email form behavior is driven by controls referenced directly in code:

- `receiver_id` — recipient email input
- `sender_id` — sender email input
- `passss` — sender password input
- `Subject` — primary email subject input
- `sub_subject` — used as sender display name in `MailAddress`
- `body` — message body
- `attach` — single attachment path/string passed to `sent_mail`
- `CheckedListBox1` — multi-attachment list (checked items are attached)
- `Label2` — status indicator shown before sending
- `Button5` — send action
- `Button2` — open file picker for multiple attachments
- `Button1` — close/dispose form

### Input validation before send

The form enforces required recipient and sender fields:

```vb
If receiver_id.Text = "" Then
    MsgBox("Please Enter Receiver ID", vbCritical, "WARNING")
    receiver_id.Focus()
    Exit Sub
End If
If sender_id.Text = "" Then
    MsgBox("Please Enter Sender ID", vbCritical, "WARNING")
    sender_id.Focus()
    Exit Sub
End If
```

If valid, it shows processing UI and calls mail send:

```vb
Label2.Visible = True
Application.DoEvents()
Call sent_mail(Subject.Text, attach.Text, receiver_id.Text, sender_id.Text, passss.Text, body.Text, sub_subject.Text)
Me.Dispose()
Me.Close()
```

---

## Form Event Flow (`direct_email.vb`)

### Close action

```vb
Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
    Me.Dispose()
    Me.Close()
End Sub
```

### Send action

```vb
Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
    If receiver_id.Text = "" Then
        MsgBox("Please Enter Receiver ID", vbCritical, "WARNING")
        receiver_id.Focus()
        Exit Sub
    End If
    If sender_id.Text = "" Then
        MsgBox("Please Enter Sender ID", vbCritical, "WARNING")
        sender_id.Focus()
        Exit Sub
    End If
    Label2.Visible = True
    Application.DoEvents()
    Call sent_mail(Subject.Text, attach.Text, receiver_id.Text, sender_id.Text, passss.Text, body.Text, sub_subject.Text)
    Me.Dispose()
    Me.Close()
End Sub
```

### Add attachments action (multi-select)

```vb
Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
    Dim fbd As New OpenFileDialog With { _
  .Title = "Select multiple files", _
  .Multiselect = True, _
  .FileName = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)}

    If fbd.ShowDialog = DialogResult.OK Then
        For Each mFile As String In fbd.FileNames
            CheckedListBox1.Items.Add(mFile, True)
        Next
    End If
End Sub
```

This design pre-checks every selected file (`True`) so selected files are immediately queued for sending.

---

## SMTP Configuration

SMTP settings are hard-coded in `email_module.vb`:

```vb
Dim HOST = "smtp.gmail.com"
Dim PORT = "587" 'TLS Port
```

Client configuration:

```vb
Dim SMTP As New SmtpClient(HOST)
SMTP.EnableSsl = True
SMTP.Credentials = New System.Net.NetworkCredential(SenderEmail.Trim(), SenderEmailPassword.Trim())
SMTP.DeliveryMethod = SmtpDeliveryMethod.Network
SMTP.Port = PORT
SMTP.Send(mail)
```

### Required SMTP behaviors

- Host: `smtp.gmail.com`
- Port: `587`
- Encryption: TLS via `EnableSsl = True`
- Auth: `System.Net.NetworkCredential`
- Delivery method: `SmtpDeliveryMethod.Network`

---

## `sent_mail` Function (`email_module.vb`)

Core sending routine:

```vb
Public Sub sent_mail(ByVal subject As String, ByVal att As String, ByVal rec_id As String, ByVal sender_id As String, ByVal pass As String, ByVal body As String, ByVal sub_subject As String)
    Dim MySubject As String = subject
    Dim subject1 As String = sub_subject
    Dim MyMessageBody As String = body
    Dim RecipientEmail As String = rec_id
    Dim SenderEmail As String = sender_id
    Dim SenderDisplayName As String = "10"
    Dim SenderEmailPassword As String = pass

    Dim HOST = "smtp.gmail.com"
    Dim PORT = "587" 'TLS Port

    mail.Subject = MySubject
    mail.Body = MyMessageBody
    mail.To.Clear()
    mail.Attachments.Clear()
    mail.To.Add(RecipientEmail)
    attachment = New System.Net.Mail.Attachment(att)
    mail.Attachments.Add(attachment)
    For i = 0 To direct_email.CheckedListBox1.CheckedItems.Count - 1
        attachment = New System.Net.Mail.Attachment(direct_email.CheckedListBox1.CheckedItems(i).ToString())
        mail.Attachments.Add(attachment)
    Next
    mail.Attachments.Add(attachment)
    mail.From = New MailAddress(SenderEmail, subject1)

    Dim SMTP As New SmtpClient(HOST)
    SMTP.EnableSsl = True
    SMTP.Credentials = New System.Net.NetworkCredential(SenderEmail.Trim(), SenderEmailPassword.Trim())
    SMTP.DeliveryMethod = SmtpDeliveryMethod.Network
    SMTP.Port = PORT
    SMTP.Send(mail)
    MsgBox("Sent Message To : " & RecipientEmail, MsgBoxStyle.Information, "Sent!")

    SMTP.Dispose()

    Exit Sub
End Sub
```

### Notes on current implementation

- `SenderDisplayName` is declared but not used.
- Sender display label is effectively `sub_subject` via `New MailAddress(SenderEmail, subject1)`.
- `mail.Attachments.Add(attachment)` is called again after the loop, which can re-add the last attachment.

---

## Attachment Handling

Attachment flow uses both single and multiple sources:

1. Single path from `attach.Text`:
   ```vb
   attachment = New System.Net.Mail.Attachment(att)
   mail.Attachments.Add(attachment)
   ```
2. Multiple files from checked rows in `CheckedListBox1`:
   ```vb
   For i = 0 To direct_email.CheckedListBox1.CheckedItems.Count - 1
       attachment = New System.Net.Mail.Attachment(direct_email.CheckedListBox1.CheckedItems(i).ToString())
       mail.Attachments.Add(attachment)
   Next
   ```

The checked-list model allows users to keep many selected files and selectively include/exclude by checkbox state.

---

## Template Placeholders

There is no explicit token replacement engine in current code (no `Replace("{token}", value)` patterns in these files).

Current placeholder-like data flow is field-driven:

- `Subject.Text` -> `mail.Subject`
- `body.Text` -> `mail.Body`
- `sub_subject.Text` -> `MailAddress` display name argument
- `receiver_id.Text` -> recipient target
- `sender_id.Text` + `passss.Text` -> SMTP auth credentials

If placeholder support is extended later, the natural insertion point is before assignment to `mail.Subject` and `mail.Body` inside `sent_mail`.

---

## SMTP Credentials and Authentication

Credentials are created from UI inputs using `NetworkCredential`:

```vb
SMTP.Credentials = New System.Net.NetworkCredential(SenderEmail.Trim(), SenderEmailPassword.Trim())
```

This ties authentication directly to runtime values entered by user:

- Username: `sender_id.Text`
- Password: `passss.Text`

---

## Delivery Method

Network delivery is explicitly configured:

```vb
SMTP.DeliveryMethod = SmtpDeliveryMethod.Network
```

This ensures direct SMTP transmission over network instead of pickup-directory/local store strategies.

---

## Error Handling

### Present behavior in source

- UI validation errors are handled via `MsgBox` + `Exit Sub` for missing sender/receiver.
- SMTP send path has **no `Try...Catch`** in `sent_mail`; exceptions from invalid credentials, unreachable SMTP host, TLS/auth failures, or attachment file errors will bubble up.

### Practical implications

- Users receive clear messages only for missing sender/receiver fields.
- Runtime SMTP/attachment exceptions are not gracefully transformed into user-friendly messages in these files.

### Recommended enhancement (future)

Wrap SMTP/attachment operations with `Try...Catch...Finally` to:

- Display actionable failure feedback (`authentication failed`, `file not found`, `network unavailable`)
- Ensure disposal of SMTP and attachment resources even on failure
- Avoid abrupt termination of send flow
