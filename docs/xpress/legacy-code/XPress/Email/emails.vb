Imports System.Data.OleDb
Imports System.Net.Mail
Imports System.Data.SqlClient

Public Class emails
    Dim mail As New MailMessage
    Dim real_identify As String = ""
    Private Sub emails_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        Call last_form_close(Me)
    End Sub

    Private Sub emails_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub emails_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call con_sql()
        Me.KeyPreview = True
        'Call load_data()
        Button1_Click(sender, e)
        If user_id_log.ToLower = "admin" Then
            sender_pass.Visible = True
            Label9.Visible = True
        Else
            sender_pass.Visible = False
            Label9.Visible = False
        End If
    End Sub
    'Public Sub load_data()
    '    Call SQL_Select("tbl_email", , " id='" & get_max_number("id", "tbl_email") & "'")
    '    If ds.Tables(0).Rows.Count > 0 Then
    '        sender_id.Text = ds.Tables(0).Rows(0).Item("sender").ToString
    '        sender_pass.Text = ds.Tables(0).Rows(0).Item("sender_pass").ToString
    '        body.Text = ds.Tables(0).Rows(0).Item("body").ToString
    '        Subject.Text = ds.Tables(0).Rows(0).Item("subject").ToString
    '        email_id = ds.Tables(0).Rows(0).Item("id").ToString
    '    End If
    'End Sub
    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

        'Dim mail As New MailMessage()
        'Dim n As Integer = 0

        'If receiver_id.Text.Contains("gmail") = True Then
        '    Dim SmtpServer As New SmtpClient("smtp.gmail.com") 'Gmail
        '    'mail.UseDefaultCredentials = True
        '    mail.From = New MailAddress(sender_id.Text)
        '    mail.[To].Add(receiver_id.Text)
        '    mail.Subject = Subject.Text
        '    mail.Body = body.Text
        '    'n = Rnd(45)
        '    'PRB1.Value = n
        '    Dim attachment As System.Net.Mail.Attachment
        '    attachment = New System.Net.Mail.Attachment(attage.Text)
        '    mail.Attachments.Add(attachment)
        '    Dim sender_pass1 As String = sender_pass.Text  '"14black14yashgajjar@1999"
        '    SmtpServer.Port = 587
        '    SmtpServer.Credentials = New System.Net.NetworkCredential(sender_id.Text, sender_pass1)

        '    SmtpServer.UseDefaultCredentials = False
        '    SmtpServer.EnableSsl = True

        '    SmtpServer.Send(mail)
        'ElseIf txt_search.Text.Contains("yahoo") = True Then
        '    Dim SmtpServer As New SmtpClient("plus.smtp.mail.yahoo.com") 'Yahoo

        '    mail.From = New MailAddress(txt_search.Text)
        '    mail.[To].Add(receiver_id.Text)
        '    mail.Subject = Subject.Text
        '    mail.Body = body.Text
        '    'n = Rnd(45)
        '    'PRB1.Value = n
        '    Dim attachment As System.Net.Mail.Attachment
        '    attachment = New System.Net.Mail.Attachment(attage.Text)
        '    mail.Attachments.Add(attachment)
        '    Dim sender_pass As String = ""
        '    SmtpServer.Port = 587
        '    SmtpServer.Credentials = New System.Net.NetworkCredential(txt_search.Text, sender_pass)
        '    SmtpServer.EnableSsl = True

        '    SmtpServer.Send(mail)

        'End If
        ''    '''''''''''''''''''''''''''''''''''''''''''''''''
        ''    https://myaccount.google.com/lesssecureapps
        'MsgBox("Mail Send!", vbInformation)
    End Sub
    Public Property CheckedListBox1 As New List(Of TestClass)
    Dim attachment As System.Net.Mail.Attachment

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Dim fbd As New OpenFileDialog With { _
        .Title = "Select multiple files", _
        .Multiselect = True, _
        .FileName = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)}
        fbd.ShowDialog()
        For Each file In fbd.FileNames
            sub_subject.AppendText(file)
            attachment = New System.Net.Mail.Attachment(file)
        Next file
    End Sub
    Public Class TestClass
        Public Property Name As String
    End Class
    Private Sub txt_search_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyDown
        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            DataGridView1.Focus()
        End If
        If e.KeyCode = Keys.Enter Then
            With DataGridView1
                If DataGridView1.Rows.Count > 0 Then
                    Dim str As String = .Rows(0).Cells(0).Value.ToString

                    Dim b As String() = Split(body.Text, vbNewLine)
                    Dim title As String = get_single_value("title_name", "tbl_customer", "id", Val(str))
                    body.Text = "Dear " & title & " " & .Rows(0).Cells(1).Value & "," 'Item Name
                    receiver_id.Text = .Rows(0).Cells(2).Value  'String.Join(vbNewLine, b, 1, b.Length - 1)
                    'customer_id = .Rows(.CurrentRow.Index).Cells(0).Value 'patient id
                    'Subject.Text = Format(k, "0.00")
                    txt_search.Visible = False
                    txt_search.Text = ""
                    DataGridView1.Visible = False
                    sub_subject.Focus()
                End If
            End With
        End If
    End Sub

    Private Sub txt_search_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txt_search.TextChanged
        load_customer()
    End Sub
    Public Sub load_customer()
        If txt_search.TextLength > 2 Then
            DataGridView1.Visible = True
            Call grids1(DataGridView1)
            Call SQL_Select("tbl_customer", " id,customer_name,email", " customer_name like '%" & txt_search.Text & "%'", " Order By customer_name")
            If ds.Tables(0).Rows.Count > 0 Then
                With DataGridView1
                    .DataSource = ds.Tables(0)
                    .Columns(0).Visible = False
                    .Columns(1).HeaderText = "Customer Name"
                    .Columns(2).HeaderText = "E-Mail"
                End With
            Else
                DataGridView1.DataSource = Nothing
            End If
        Else
            DataGridView1.DataSource = Nothing
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub DataGridView1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView1.KeyDown
        With DataGridView1
            If e.KeyCode = Keys.Enter Then

                Dim b As String() = Split(body.Text, vbNewLine)
                Dim title As String = get_single_value("title_name", "tbl_customer", "id", Val(.Rows(.CurrentRow.Index).Cells(0).Value))
                body.Text = "Dear " & title & " " & .Rows(.CurrentRow.Index).Cells(1).Value & "," 'Item Name
                receiver_id.Text = .Rows(.CurrentRow.Index).Cells(2).Value  'String.Join(vbNewLine, b, 1, b.Length - 1)
                'customer_id = .Rows(.CurrentRow.Index).Cells(0).Value 'patient id
                'Subject.Text = Format(k, "0.00")
                txt_search.Visible = False
                txt_search.Text = ""
                DataGridView1.Visible = False
                sub_subject.Focus()
            End If

            If e.KeyCode = 27 Then
                DataGridView1.Visible = False
                receiver_id.Focus()
            End If
        End With
    End Sub

    Private Sub receiver_id_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles receiver_id.KeyPress
        txt_search.Visible = True
        txt_search.Focus()
    End Sub

    Private Sub receiver_id_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles receiver_id.TextChanged

    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If email_id > 0 Then
            Call saved()
            MsgBox("E-Mail Details Saved!", vbInformation)
            Me.Dispose()
            Me.Close()
            Exit Sub
        End If
        
        'Dim MySubject As String = Subject.Text   '"Email Subject Line"
        'Dim MyMessageBody As String = Subject.Text
        'Dim RecipientEmail As String = receiver_id.Text
        'Dim SenderEmail As String = sender_id.Text
        'Dim SenderDisplayName As String = Subject.Text
        'Dim SenderEmailPassword As String = sender_pass.Text

        'Dim HOST = "smtp.gmail.com"
        'Dim PORT = "587" 'TLS Port


        'mail.Subject = MySubject
        'mail.Body = MyMessageBody
        'mail.To.Add(RecipientEmail)

        'mail.Attachments.Add(attachment)
        'mail.From = New MailAddress(SenderEmail, SenderDisplayName)

        'Dim SMTP As New SmtpClient(HOST)
        'SMTP.EnableSsl = True
        'SMTP.Credentials = New System.Net.NetworkCredential(SenderEmail.Trim(), SenderEmailPassword.Trim())
        'SMTP.DeliveryMethod = SmtpDeliveryMethod.Network
        'SMTP.Port = PORT
        'SMTP.Send(mail)
        'MsgBox("Sent Message To : " & RecipientEmail, MsgBoxStyle.Information, "Sent!")
        'Exit Sub
    End Sub
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

    Private Sub emails_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub body_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles body.TextChanged

    End Sub

    Private Sub Label10_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label10.Click

    End Sub

    Private Sub Button1_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        three_buttons(Button1)
    End Sub
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

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        three_buttons(Button3)
    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        three_buttons(Button6)
    End Sub

    Private Sub sub_subject_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles sub_subject.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub sub_subject_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles sub_subject.TextChanged

    End Sub

    Private Sub Subject_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Subject.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub Subject_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Subject.TextChanged

    End Sub

    Private Sub sender_pass_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles sender_pass.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub sender_pass_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles sender_pass.TextChanged

    End Sub

    Private Sub sender_id_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles sender_id.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub sender_id_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles sender_id.TextChanged

    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        three_buttons(Button7)
    End Sub
End Class