Public Class Add_Edit_Product

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Add_Edit_Product_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Add_Edit_Product_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub
    Dim pre_load_type_id As Double = 0
    Private Sub Add_Edit_Product_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        load_combo()
        If product_ids > 0 Then
            Label2.Text = "Edit Product"
            Call load_data()

        End If
    End Sub
    Public Sub load_combo()
        Call SQL_Select("tbl_product_type", , , " order by type_name")
        If ds.Tables(0).Rows.Count > 0 Then
            type_id.DataSource = ds.Tables(0)
            type_id.ValueMember = "id"
            type_id.DisplayMember = "type_name"
            type_id.SelectedIndex = -1
        End If
    End Sub
    Dim load_product_name As String = ""
    Public Sub load_data()
        Call SQL_Query("SELECT tbl_product.id, tbl_product.product_id,tbl_product.type_id, tbl_product.product_name, tbl_product_type.type_name, tbl_product.price FROM tbl_product INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id", " where tbl_product.id='" & product_ids & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            product_id.Text = ds.Tables(0).Rows(0).Item("product_id").ToString
            pre_load_type_id = ds.Tables(0).Rows(0).Item("type_id").ToString
            product_name.Text = ds.Tables(0).Rows(0).Item("product_name").ToString
            load_product_name = ds.Tables(0).Rows(0).Item("product_name").ToString
            type_id.Text = ds.Tables(0).Rows(0).Item("type_name").ToString
            price.Text = ds.Tables(0).Rows(0).Item("price").ToString
        End If

    End Sub

    Private Sub Add_Edit_Product_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If product_id.Text = "" Then
            MsgBox("Please Enter Product ID", vbCritical, "WARNING")
            product_id.Focus()
            Exit Sub
        End If
        If product_name.Text = "" Then
            MsgBox("Please Enter Product Name", vbCritical, "WARNING")
            product_name.Focus()
            Exit Sub
        End If
        If type_id.SelectedIndex = -1 Then
            MsgBox("Please Select Product Type", vbCritical, "WARNING")
            type_id.Focus()
            Exit Sub
        End If
        If Val(price.Text) = 0 Then
            MsgBox("Please Enter Product Price", vbCritical, "WARNING")
            price.Focus()
            Exit Sub
        End If
        Dim test As String = get_single_value_two_condition("product_name", "tbl_product", "product_name", "type_id", Trim(product_name.Text), Val(type_id.SelectedValue))
        If test <> "" Then
            If test <> "" Then
                If load_product_name = product_name.Text And pre_load_type_id = Val(type_id.SelectedValue) Then

                Else
                    MsgBox("Product Name Is Duplicate Please Enter Different Name", vbCritical, "WARNING")
                    product_name.Focus()
                    Exit Sub
                End If
            End If
        Else
            If test <> "" Then
                MsgBox("Product Name Is Duplicate Please Enter Different Name", vbCritical, "WARNING")
                product_name.Focus()
                Exit Sub
            End If
        End If
            Call saved()
            MsgBox("Customer Details Saved!", vbInformation)
        Call View_Product.load_grid_sql()
        If new_pro_key = True Then
            If Add_Edit_Invoice.Visible = True Then
                Add_Edit_Invoice.DataGridView2.Rows.Add(1)
                Dim row_count As Double = Add_Edit_Invoice.DataGridView2.Rows.Count
                For i = 0 To row_count - 1
                    With Add_Edit_Invoice.DataGridView2
                        If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Type Product Name" Then
                            .Rows(i).Cells(1).Value = product_name.Text
                            .Rows(i).Cells(2).Value = 1
                            .Rows(i).Cells(3).Value = Val(price.Text)
                            .Rows(i).Cells(5).Value = get_max_number("id", "tbl_product")
                            Add_Edit_Invoice.DataGridView2.Focus()
                            Exit For
                        End If
                    End With
                Next
            End If
            Add_Edit_Invoice.load_sr()
            Add_Edit_Invoice.cal()
            new_pro_key = False
        End If
        If new_pro_key_quo = True Then
            If Add_Edit_Quotation.Visible = True Then
                Add_Edit_Quotation.DataGridView2.Rows.Add(1)
                Dim row_count As Double = Add_Edit_Quotation.DataGridView2.Rows.Count
                For i = 0 To row_count - 1
                    With Add_Edit_Quotation.DataGridView2
                        If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Type Product Name" Then
                            .Rows(i).Cells(1).Value = product_name.Text
                            .Rows(i).Cells(2).Value = 1
                            .Rows(i).Cells(3).Value = Val(price.Text)
                            .Rows(i).Cells(5).Value = get_max_number("id", "tbl_product")
                            Add_Edit_Quotation.DataGridView2.Focus()
                            Exit For
                        End If
                    End With
                Next
            End If
            Add_Edit_Quotation.load_sr()
            Add_Edit_Quotation.cal()
            new_pro_key_quo = False
        End If
        Me.Dispose()
        Me.Close()
        Exit Sub
    End Sub
    Public Sub saved()
        If product_ids > 0 Then
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            variable.Add(type_id.Name, "'" & Val(type_id.SelectedValue) & "'")
            Dim d As String = SQL_Update("tbl_product", variable, "id=" & product_ids)
        Else
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            variable.Add(type_id.Name, "'" & Val(type_id.SelectedValue) & "'")
            Dim d As Integer = SQL_Insert("tbl_product", variable)
        End If
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        product_type_id = 0
        Call __show(Add_Edit_Product_Type)
    End Sub

    Private Sub type_id_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles type_id.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub type_id_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles type_id.SelectedIndexChanged

    End Sub

    Private Sub price_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles price.KeyPress
        Call isamount(sender, e)
    End Sub

    Private Sub price_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles price.TextChanged

    End Sub
End Class