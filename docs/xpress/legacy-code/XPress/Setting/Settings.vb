Imports System.IO
Imports System.Windows

Public Class Settings

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Settings_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Settings_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub
    Dim invoice_id1 As Double = 0
    Private Sub Settings_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        setting_id = get_max_number("id", "tbl_setting")
        invoice_id1 = get_max_number("id", "tbl_numbers")

        Call load_data()
    End Sub
    Public Sub load_data()
        Call SQL_Select("tbl_setting", "", " id='" & setting_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            Dim temp As String = ds.Tables(0).Rows(0).Item("isvat").ToString
            If Val(temp) = 0 Then
                isvat.ForeColor = Color.Red
                isvat.Text = "Deactive"
                isvat.Checked = False
            ElseIf Val(temp) = 1 Then
                isvat.Checked = True
            End If
            vat_per.Text = Val(ds.Tables(0).Rows(0).Item("vat_per").ToString)
            quo_path.Text = ds.Tables(0).Rows(0).Item("quo_path").ToString
            invoice_path.Text = ds.Tables(0).Rows(0).Item("invoice_path").ToString
            report_path.Text = ds.Tables(0).Rows(0).Item("report_path").ToString
            invoice_days.Text = ds.Tables(0).Rows(0).Item("invoice_days").ToString
            backup_path.Text = ds.Tables(0).Rows(0).Item("backup_path").ToString
            TextBox3.Text = ds.Tables(0).Rows(0).Item("cash").ToString
            TextBox2.Text = ds.Tables(0).Rows(0).Item("cheque").ToString
            TextBox1.Text = ds.Tables(0).Rows(0).Item("other").ToString
            If ds.Tables(0).Rows(0).Item("back_path").ToString <> "" Then
                If File.Exists(ds.Tables(0).Rows(0).Item("back_path").ToString) = True Then
                    Dim inImg2 As Image = Image.FromFile(ds.Tables(0).Rows(0).Item("back_path").ToString)
                    pic_logo.Image = inImg2
                End If
                
            End If
        End If

        Call SQL_Select("tbl_numbers", "", " id='" & invoice_id1 & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            invoice_no.Text = Val(ds.Tables(0).Rows(0).Item("invoice_no").ToString)
            quo_no.Text = Val(ds.Tables(0).Rows(0).Item("quo_no").ToString)
        End If
    End Sub
    Private Sub Settings_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub CheckBox1_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles isvat.CheckedChanged
        If isvat.Checked = True Then
            isvat.ForeColor = Color.Green
            isvat.Text = "Active"
        Else
            isvat.ForeColor = Color.Red
            isvat.Text = "Deactive"
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Dim ischeck As Double = 0
        If isvat.Checked = True Then
            ischeck = 1
        Else
            ischeck = 0
        End If
        Dim variable As New Dictionary(Of String, String)
        Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
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
        If strfilename <> "" Then
            variable.Add("back_path", "'" & strfilename & "'")
        End If
        If setting_id > 0 Then
            Dim d As String = SQL_Update("tbl_setting", variable, "id=" & setting_id)
        Else
            Dim d As Integer = SQL_Insert("tbl_setting", variable)
        End If

        If invoice_id1 > 0 Then
            Dim variable1 As New Dictionary(Of String, String)
            variable1.Add("invoice_no", "'" & Val(invoice_no.Text) & "'")
            variable1.Add("quo_no", "'" & Val(quo_no.Text) & "'")
            Dim d As String = SQL_Update("tbl_numbers", variable1, "id=" & invoice_id1)
        Else
            Dim variable1 As New Dictionary(Of String, String)
            variable1.Add("invoice_no", "'" & Val(invoice_no.Text) & "'")
            variable1.Add("quo_no", "'" & Val(quo_no.Text) & "'")
            Dim d As Integer = SQL_Insert("tbl_numbers", variable1)
        End If


        MsgBox("Setting Details Saved!", vbInformation)
        Call HOME.HOME_Load(sender, e)
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
            If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
                invoice_path.Text = FolderBrowserDialog1.SelectedPath
            Else
                invoice_path.Text = FolderBrowserDialog1.SelectedPath
            End If
        End If
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
            If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
                quo_path.Text = FolderBrowserDialog1.SelectedPath
            Else
                quo_path.Text = FolderBrowserDialog1.SelectedPath
            End If
        End If
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
            If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
                report_path.Text = FolderBrowserDialog1.SelectedPath
            Else
                report_path.Text = FolderBrowserDialog1.SelectedPath
            End If
        End If
    End Sub
    Dim strfilename As String
    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click

        OpenFileDialog1.Filter = "All Images Files (*.png;*.jpeg;*.gif;*.jpg;*.bmp;*.tiff;*.tif | *.png;*.jpeg;*.gif;*.jpg;*.bmp;*.tiff;" & "*.tif"
        With OpenFileDialog1
            '...
            If .ShowDialog = Forms.DialogResult.OK Then
                strfilename = OpenFileDialog1.FileName
                pic_logo.Image = Image.FromFile(strfilename)
                bmp = pic_logo.Image
                IMG1 = True
                'ElseIf .ShowDialog = Windows.Forms.DialogResult.Cancel Then
                '    OpenFileDialog1.Dispose()
            End If
        End With
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
            If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
                backup_path.Text = FolderBrowserDialog1.SelectedPath
            Else
                backup_path.Text = FolderBrowserDialog1.SelectedPath
            End If
        End If
    End Sub

    Private Sub TextBox3_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles TextBox3.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub TextBox3_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles TextBox3.TextChanged

    End Sub

    Private Sub TextBox2_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles TextBox2.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub TextBox2_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles TextBox2.TextChanged

    End Sub

    Private Sub TextBox1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles TextBox1.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub TextBox1_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles TextBox1.TextChanged

    End Sub
End Class