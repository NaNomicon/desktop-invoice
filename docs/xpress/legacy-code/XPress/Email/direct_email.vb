Public Class direct_email

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        'For i = 0 To CheckedListBox1.CheckedItems.Count - 1
        '    MsgBox(CheckedListBox1.CheckedItems(i).ToString())
        'Next

        'Exit Sub

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
    Public Sub sent()

    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        'If OpenFileDialog1.ShowDialog <> Windows.Forms.DialogResult.Cancel Then
        '    'PictureBox1.Image = Image.FromFile(OpenFileDialog1.FileName)
        '    MsgBox(OpenFileDialog1.FileNames.ToString)
        'End If
        Dim fbd As New OpenFileDialog With { _
      .Title = "Select multiple files", _
      .Multiselect = True, _
      .FileName = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)}

        If fbd.ShowDialog = DialogResult.OK Then
            'CheckedListBox1.AddRange(fbd.FileNames.Select(Function(f) IO.Path.GetFileName(f)))
            'MsgBox(fbd.FileNames.Select(Function(f) IO.Path.GetFileName(f)).ToString)
            For Each mFile As String In fbd.FileNames
                CheckedListBox1.Items.Add(mFile, True)
            Next
        End If
    End Sub
End Class