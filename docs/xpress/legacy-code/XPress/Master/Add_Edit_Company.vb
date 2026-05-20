Imports System.IO
Imports System.Windows

Public Class Add_Edit_Company

    Private Sub Add_Edit_Company_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Add_Edit_Company_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            last_form_close(Me)
            Me.Dispose()
            Me.Close()
        End If
    End Sub


    Private Sub Add_Edit_Company_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        IMG1 = False
        IMG2 = False
        Me.KeyPreview = True
        company_id = get_max_number("id", "tbl_company")
        If company_id > 0 Then
            Call load_data()
        End If
    End Sub
    Public Sub load_data()
        Call SQL_Select("tbl_company", "", "id='" & company_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            company_name.Text = ds.Tables(0).Rows(0).Item("company_name").ToString
            address.Text = ds.Tables(0).Rows(0).Item("address").ToString
            city.Text = ds.Tables(0).Rows(0).Item("city").ToString
            telephone.Text = ds.Tables(0).Rows(0).Item("telephone").ToString
            email.Text = ds.Tables(0).Rows(0).Item("email").ToString
            facebook_url.Text = ds.Tables(0).Rows(0).Item("facebook_url").ToString
            brn.Text = ds.Tables(0).Rows(0).Item("brn").ToString
            note1.Text = ds.Tables(0).Rows(0).Item("note1").ToString
            note2.Text = ds.Tables(0).Rows(0).Item("note2").ToString
            note3.Text = ds.Tables(0).Rows(0).Item("note3").ToString
            thanks1.Text = ds.Tables(0).Rows(0).Item("thanks1").ToString
            thanks2.Text = ds.Tables(0).Rows(0).Item("thanks2").ToString
            currency.Text = ds.Tables(0).Rows(0).Item("currency").ToString
            vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
            Dim imageData As Byte()
            imageData = DirectCast(ds.Tables(0).Rows(0).Item("logo"), Byte())
            If Not imageData Is Nothing Then
                Using ms As New MemoryStream(imageData, 0, imageData.Length)
                    ms.Write(imageData, 0, imageData.Length)
                    pic_logo.Image = Image.FromStream(ms, True)
                    bmp = Image.FromStream(ms, True)
                    Dim temp_img As String
                    temp_img = Application.StartupPath & "\tmp_logo.jpg"
                    pic_logo.Image.Save(temp_img)
                End Using
            End If
            'Exit Sub
            Dim imageData1 As Byte()
            imageData1 = DirectCast(ds.Tables(0).Rows(0).Item("watermark"), Byte())
            If Not imageData1 Is Nothing Then
                Using ms As New MemoryStream(imageData1, 0, imageData1.Length)
                    ms.Write(imageData1, 0, imageData1.Length)
                    pic_water.Image = Image.FromStream(ms, True)
                    bmp2 = Image.FromStream(ms, True)
                    Dim temp_img As String
                    temp_img = Application.StartupPath & "\tmp_logo.jpg"
                    pic_water.Image.Save(temp_img)
                End Using
            End If
        End If

    End Sub
    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click

        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Add_Edit_Company_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub ComboBox1_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles currency.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles currency.SelectedIndexChanged

    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Dim strfilename As String
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

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Dim strfilename As String
        OpenFileDialog1.Filter = "All Images Files (*.png;*.jpeg;*.gif;*.jpg;*.bmp;*.tiff;*.tif | *.png;*.jpeg;*.gif;*.jpg;*.bmp;*.tiff;" & "*.tif"
        With OpenFileDialog1
            '...
            If .ShowDialog = Forms.DialogResult.OK Then
                strfilename = OpenFileDialog1.FileName
                pic_water.Image = Image.FromFile(strfilename)
                bmp2 = pic_water.Image
                IMG2 = True
            End If
            If .ShowDialog = Forms.DialogResult.OK Then
                strfilename = OpenFileDialog1.FileName
                pic_water.Image = Image.FromFile(strfilename)
                bmp2 = pic_water.Image
                IMG2 = True
            End If
        End With
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Call saved_sql()
    End Sub
    Public Sub saved_sql()
        If company_id > 0 Then
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            variable.Add(currency.Name, "'" & currency.Text.Replace("'", "''") & "'")
            If IMG1 = True Then
                variable.Add("logo", "@logo")
            End If
            If IMG2 = True Then
                variable.Add("watermark", "@logo1")
            End If
            If IMG1 = True And IMG2 = True Then
                Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "@logo", "@logo1")
                MsgBox("Company Details Saved!", vbInformation)
                IMG1 = False
                IMG2 = False
                Me.Dispose()
                Me.Close()
                Exit Sub
            End If
            If IMG1 = True Then
                Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "@logo")
                MsgBox("Company Details Saved!", vbInformation)
                IMG1 = False
                IMG2 = False
                Me.Dispose()
                Me.Close()
                Exit Sub
            End If
            If IMG2 = True Then
                Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "", "@logo1")
                MsgBox("Company Details Saved!", vbInformation)
                IMG1 = False
                IMG2 = False
                Me.Dispose()
                Me.Close()
                Exit Sub
            End If
            If IMG1 = False And IMG2 = False Then
                Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id)
                MsgBox("Company Details Saved!", vbInformation)
                IMG1 = False
                IMG2 = False
                Me.Dispose()
                Me.Close()
                Exit Sub
            End If

        Else
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            variable.Add(currency.Name, "'" & currency.Text.Replace("'", "''") & "'")
            variable.Add("logo", "@logo")
            variable.Add("watermark", "@logo1")
            Dim d As Integer = SQL_Insert("tbl_company", variable, "@logo", "@logo1")
            MsgBox("Company Details Saved!", vbInformation)
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub telephone_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles telephone.TextChanged

    End Sub
End Class