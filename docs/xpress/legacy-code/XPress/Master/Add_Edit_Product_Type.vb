Public Class Add_Edit_Product_Type

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Add_Edit_Product_Type_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Add_Edit_Product_Type_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub Add_Edit_Product_Type_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        If product_type_id > 0 Then
            Label2.Text = "Edit Product type"
            Call load_data()
        End If
    End Sub
    Public Sub load_data()
        Call SQL_Select("tbl_product_type", "", "id='" & product_type_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            type_name.Text = ds.Tables(0).Rows(0).Item("type_name").ToString
        End If

    End Sub

    Private Sub Add_Edit_Product_Type_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If type_name.Text = "" Then
            MsgBox("Please Enter Product Type Name", vbCritical, "WARNING")
            type_name.Focus()
            Exit Sub
        End If
        Call saved()
        MsgBox("Product Type Saved!", vbInformation)
        Call View_Product_Type.load_grid_sql()
        Call Add_Edit_Product.load_combo()
        Me.Dispose()
        Me.Close()
        Exit Sub
    End Sub
    Public Sub saved()
        If product_type_id > 0 Then
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            Dim d As String = SQL_Update("tbl_product_type", variable, "id=" & product_type_id)
        Else
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            Dim d As Integer = SQL_Insert("tbl_product_type", variable)
        End If
    End Sub

End Class