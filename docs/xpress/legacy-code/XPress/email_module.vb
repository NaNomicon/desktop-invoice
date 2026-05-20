Imports System.Net.Mail

Module email_module
    Dim mail As New MailMessage
    Dim attachment As System.Net.Mail.Attachment
    Public Sub sent_mail(ByVal subject As String, ByVal att As String, ByVal rec_id As String, ByVal sender_id As String, ByVal pass As String, ByVal body As String, ByVal sub_subject As String)
        'Dim pass As String = get_single_value("sender_pass", "tbl_email", "id", get_max_number("id", "tbl_email"))
        Dim MySubject As String = subject
        Dim subject1 As String = sub_subject
        Dim MyMessageBody As String = body
        Dim RecipientEmail As String = rec_id
        Dim SenderEmail As String = sender_id
        Dim SenderDisplayName As String = "10"
        Dim SenderEmailPassword As String = pass

        Dim HOST = "smtp.gmail.com"
        Dim PORT = "587" 'TLS Port

        'mail.
        mail.Subject = MySubject
        ' mail.Headers.Add("MyHeader", "Some value for my own header")
        mail.Body = MyMessageBody
        mail.To.Clear()
        mail.Attachments.Clear()
        mail.To.Add(RecipientEmail)
        attachment = New System.Net.Mail.Attachment(att)
        mail.Attachments.Add(attachment)
        For i = 0 To direct_email.CheckedListBox1.CheckedItems.Count - 1
            'MsgBox(direct_email.CheckedListBox1.Items(i).ToString())
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
End Module
