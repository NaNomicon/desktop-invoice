Public Class Add_Edit_Customer

    Private Sub currency_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles customer_type.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub customer_type_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_type.KeyDown
        If e.KeyCode = Keys.Enter Then
            address.Focus()
        End If
    End Sub

    Private Sub currency_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles customer_type.SelectedIndexChanged
        'If customer_type.Text = "Corporate" Then
        '    contact.Enabled = True

        'Else
        '    contact.Enabled = False
        '    contact.Text = ""
        'End If
    End Sub

    Private Sub Add_Edit_Customer_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Add_Edit_Customer_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub Add_Edit_Customer_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load

        Call set_fonr(Me, Label2)

        'If customer_type.Text = "Corporate" Then
        '    contact.Enabled = True
        '    contact.Text = ""
        'Else
        '    contact.Enabled = False
        '    contact.Text = ""
        'End If
        customer_type.SelectedIndex = 0
        If customer_id > 0 Then
            Label2.Text = "Edit Customer"
            Call load_data()
        End If
        Call con_sql()
        Me.KeyPreview = True
    End Sub
    Dim load_customer_name As String = ""
    Public Sub load_data()
        Call SQL_Select("tbl_customer", "", "id='" & customer_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString
            load_customer_name = ds.Tables(0).Rows(0).Item("customer_name").ToString
            contact.Text = ds.Tables(0).Rows(0).Item("contact").ToString
            customer_type.Text = ds.Tables(0).Rows(0).Item("customer_type").ToString
            telephone.Text = ds.Tables(0).Rows(0).Item("telephone").ToString
            address.Text = ds.Tables(0).Rows(0).Item("address").ToString
            email.Text = ds.Tables(0).Rows(0).Item("email").ToString
            title_name.Text = ds.Tables(0).Rows(0).Item("title_name").ToString
            reg_date.Value = ds.Tables(0).Rows(0).Item("reg_date").ToString
            brn.Text = ds.Tables(0).Rows(0).Item("brn").ToString
            vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
        End If

    End Sub
    Private Sub Add_Edit_Customer_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If customer_type.SelectedIndex = -1 Then
            MsgBox("Please Select Customer Type", vbCritical, "WARNING")
            customer_type.Focus()
            Exit Sub
        End If
        Dim test As String = get_single_value("customer_name", "tbl_customer", "customer_name", Trim(customer_name.Text.ToLower))
        If customer_id > 0 Then
            If test <> "" Then
                If load_customer_name = customer_name.Text Then

                Else
                    MsgBox("Customer Name Is Duplicate Please Enter Different Name", vbCritical, "WARNING")
                    customer_name.Focus()
                    Exit Sub
                End If
            End If
        Else
            If test <> "" Then
                MsgBox("Customer Name Is Duplicate Please Enter Different Name", vbCritical, "WARNING")
                customer_name.Focus()
                Exit Sub
            End If
        End If
        'If customer_type.Text = "Corporate" Then
        '    If isemail(email.Text) = True Then

        '    ElseIf isemail(email.Text) = False Then
        '        Exit Sub
        '    End If
        'End If
        Call saved()
        MsgBox("Customer Details Saved!", vbInformation)
        Call View_Customer.load_grid_sql()
        Call Add_Edit_Invoice.load_customer()
        Add_Edit_Invoice.checklist_no.Focus()
        Call Add_Edit_Quotation.load_customer()
        'Call Add_Edit_Receipt.load_customer()
        Dim name, id As String

        id = get_max_number("id", "tbl_customer")
        Add_Edit_Invoice.ad_de = get_single_value("ad_due", "tbl_customer", "id", id)
        Add_Edit_Invoice.ad_de = get_single_value("ad_due", "tbl_customer", "id", id)
        name = get_single_value("customer_name", "tbl_customer", "id", id)

        Add_Edit_Invoice.customer_name.Text = name
        customer_id = Val(id)

        Add_Edit_Quotation.customer_name.Text = name
        Add_Edit_Quotation.customer_idq = Val(id)
        Me.Dispose()
        Me.Close()
        Exit Sub
    End Sub
    Public Sub saved()
        If customer_id > 0 Then
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            variable.Add(customer_type.Name, "'" & customer_type.Text.Replace("'", "''") & "'")
            variable.Add(title_name.Name, "'" & title_name.Text.Replace("'", "''") & "'")
            variable.Add(reg_date.Name, "'" & Format(reg_date.Value, "dd-MMM-yyyy") & "'")
            Dim d As String = SQL_Update("tbl_customer", variable, "id=" & customer_id)
        Else
            Dim variable As New Dictionary(Of String, String)
            Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
            For Each item As TextBox In textboxes
                variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
            Next
            variable.Add(title_name.Name, "'" & title_name.Text.Replace("'", "''") & "'")
            variable.Add(customer_type.Name, "'" & customer_type.Text.Replace("'", "''") & "'")
            variable.Add(reg_date.Name, "'" & Format(reg_date.Value, "dd-MMM-yyyy") & "'")
            Dim d As Integer = SQL_Insert("tbl_customer", variable)
        End If
    End Sub

    Private Sub email_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles email.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub email_LostFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles email.LostFocus
        If customer_type.Text = "Corporate" Then
            Call isemail(email.Text)
        End If

    End Sub

    Private Sub email_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles email.TextChanged

    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub ComboBox1_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles title_name.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub title_name_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles title_name.KeyDown
        If e.KeyCode = Keys.Enter Then
            reg_date.Focus()
        End If
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles title_name.SelectedIndexChanged

    End Sub

    Private Sub Label8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label8.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub reg_date_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles reg_date.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub reg_date_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles reg_date.ValueChanged

    End Sub

    Private Sub customer_name_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_name.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub customer_name_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles customer_name.TextChanged

    End Sub

    Private Sub contact_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles contact.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub contact_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles contact.TextChanged

    End Sub

    Private Sub telephone_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles telephone.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub telephone_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles telephone.TextChanged

    End Sub

    Private Sub brn_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles brn.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub brn_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles brn.TextChanged

    End Sub

    Private Sub vat_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles vat.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub vat_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles vat.TextChanged

    End Sub

    Private Sub address_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles address.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub address_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles address.TextChanged

    End Sub
End Class