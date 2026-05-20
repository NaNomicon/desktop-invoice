Imports System.Data.SqlClient
Imports System.IO

Public Class Add_Edit_Quotation

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Add_Edit_Quotation_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Add_Edit_Quotation_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            If find_item.Visible = True Then
                load_item.Visible = False
                find_item.Visible = False
                DataGridView2.Focus()
                Exit Sub
            End If
            If txt_search.Visible = True Then
                DataGridView1.Visible = False
                txt_search.Visible = False
                customer_name.Focus()
                Exit Sub
            End If
            Me.Dispose()
            Me.Close()
        End If
    End Sub
    Public customer_idq As Double = 0
    Dim check_per_vat As String = ""
    Dim vat_per_value As String = ""
    Private Sub Add_Edit_Quotation_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load

        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        grids1(DataGridView2)
        Call load_customer()
        load_item_type()
        'Call load_items()
        Call count_row_col()
        quo_no.Text = get_single_value("quo_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
        'Console.WriteLine(customer_name.Text)
        If quotation_id > 0 Then
            Label2.Text = "Edit Invoice"
            Call load_data()
        End If
        check_per_vat = get_single_value("isvat", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If check_per_vat = 0 Then
            Label11.Visible = False
            vat_per.Visible = False
            vat.Visible = False
        ElseIf check_per_vat = 1 Then
            Label11.Visible = True
            vat_per.Visible = True
            vat.Visible = True
            vat_per.Text = get_single_value("vat_per", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        End If
        cal()
    End Sub

    Public Sub load_data()
        Call SQL_Query("SELECT tbl_quotation_main.id, tbl_quotation_main.customer_id,tbl_quotation_main.quo_date,tbl_quotation_main.per, tbl_customer.customer_name, tbl_quotation_main.quo_no, tbl_quotation_main.checklist_no, tbl_quotation_main.sub_total, tbl_quotation_main.amount_due, tbl_quotation_main.vat, tbl_quotation_main.discount, tbl_quotation_main.total FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id", " where tbl_quotation_main.id='" & quotation_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            customer_id = Val(ds.Tables(0).Rows(0).Item("customer_id").ToString)
            customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString
            quo_no.Text = ds.Tables(0).Rows(0).Item("quo_no").ToString
            checklist_no.Text = ds.Tables(0).Rows(0).Item("checklist_no").ToString
            sub_total.Text = ds.Tables(0).Rows(0).Item("sub_total").ToString
            'amount_due.Text = ds.Tables(0).Rows(0).Item("amount_due").ToString

            vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
            discount.Text = ds.Tables(0).Rows(0).Item("discount").ToString
            total_amt.Text = ds.Tables(0).Rows(0).Item("total").ToString
            per.Text = ds.Tables(0).Rows(0).Item("per").ToString
            quo_date.Value = ds.Tables(0).Rows(0).Item("quo_date").ToString
            amount_due.Text = get_single_value("due_amount", "tbl_customer", "id", customer_id)
        End If

        Call SQL_Query("SELECT tbl_quotation_sub.id, tbl_quotation_sub.qty, tbl_product.product_name, tbl_quotation_sub.product_id, tbl_quotation_sub.unit_price, tbl_quotation_sub.row_total FROM tbl_quotation_sub INNER JOIN tbl_product ON tbl_quotation_sub.product_id = tbl_product.id", " where tbl_quotation_sub.main_id='" & quotation_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView2.RowCount = ds.Tables(0).Rows.Count + 1
            For i = 0 To ds.Tables(0).Rows.Count - 1
                With DataGridView2
                    .Rows(i).Cells(1).Value = ds.Tables(0).Rows(i).Item("product_name").ToString
                    .Rows(i).Cells(2).Value = ds.Tables(0).Rows(i).Item("qty").ToString
                    .Rows(i).Cells(3).Value = ds.Tables(0).Rows(i).Item("unit_price").ToString
                    .Rows(i).Cells(4).Value = ds.Tables(0).Rows(i).Item("row_total").ToString
                    .Rows(i).Cells(5).Value = ds.Tables(0).Rows(i).Item("product_id").ToString
                    .Rows(i).Cells(6).Value = ds.Tables(0).Rows(i).Item("id").ToString
                End With
            Next
        End If
        Call load_sr()
        Call cal()
    End Sub
    Public Sub count_row_col()
        With DataGridView2
            .ColumnCount = 7
            .RowCount = 1
            .Columns(0).Visible = True
            .Columns(0).HeaderText = "Sr.No."
            .Columns(0).Width = 20
            .Columns(0).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
            .Columns(0).ReadOnly = True

            .Columns(1).HeaderText = "Product Name & Description"
            .Columns(1).Width = 160
            '.Columns(0).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
            .Columns(1).ReadOnly = True

            .Columns(2).HeaderText = "Qty"
            .Columns(2).Width = 30
            .Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
            '.Columns(0).ReadOnly = True

            .Columns(3).HeaderText = "Unit Price"
            .Columns(3).Width = 50
            .Columns(3).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            .Columns(3).ReadOnly = True

            .Columns(4).HeaderText = "Total"
            .Columns(4).Width = 60
            .Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            .Columns(4).ReadOnly = True


            .Columns(5).Visible = False
            .Columns(6).Visible = False
            .Rows(0).Cells(1).Value = "Type Product Name"
            .SelectionMode = DataGridViewSelectionMode.CellSelect
        End With
    End Sub
    Public Sub cal()
        With DataGridView2
            Dim total As Double
            Dim temp As Double = 0
            total = 0
            For i = 0 To .Rows.Count - 1
                Dim qty As Double = Val(.Rows(i).Cells(2).Value)
                .Rows(i).Cells(2).Value = Format(qty, "0.00")
                temp = Val(Val(.Rows(i).Cells(2).Value) * Val(.Rows(i).Cells(3).Value))
                .Rows(i).Cells(4).Value = Format(temp, "0.00")
                temp = Val(.Rows(i).Cells(3).Value)
                .Rows(i).Cells(3).Value = Format(temp, "0.00")
                total = total + Val(.Rows(i).Cells(4).Value)
            Next
            sub_total.Text = Format(total, "0.00")
            Dim new_tot As Double = Val(sub_total.Text)
            Dim vat_per1, vat1 As Double
            vat_per1 = Val(vat_per.Text)
            vat1 = Val(Val(new_tot * vat_per1) / 100)
            vat.Text = Format(vat1, "0.00")
            If Val(per.Text) = 0 Then
                'discount.Text = "0.00"
            Else
                discount.Text = Format(Val(Val(Val(new_tot + vat1) * Val(per.Text)) / 100), "0.00")
            End If
            discount.Text = Format(Val(discount.Text), "0.00") 'temp_tot
            'Dim temp_tot As Double = Format(Math.Round(Val(new_tot + vat1) - Val(discount.Text)), "0.00")
            Dim temp_tot As Double = Format(Val(new_tot + vat1) - Val(discount.Text), "0.00")
            total_amt.Text = Format(Val(temp_tot), "0.00") 'temp_tot
        End With
    End Sub
    Public Sub load_items()

        Call grids1(load_item)
        Dim ids As String = get_single_value("id", "tbl_product_type", "type_name", load_type.Text)
        load_item.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells
        If all_type.Checked = True Then
            Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", " (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", " Order By product_id")
        Else
            Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", " type_id='" & Val(ids) & "' and (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", " Order By product_id")
        End If

        If ds.Tables(0).Rows.Count > 0 Then
            With load_item
                .DataSource = ds.Tables(0)
                .Columns(0).Visible = False
                .Columns(3).HeaderText = "Price"
                .Columns(1).HeaderText = "ID"
                .Columns(2).HeaderText = "Product Name"
                .Columns(0).Width = 0
                .Columns(1).Width = 10
                .Columns(2).Width = 50
                .Columns(3).Width = 90
                .Columns(3).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            End With
        Else
            load_item.DataSource = Nothing
        End If
    End Sub
    Public Sub load_item_type()
        Call SQL_Select("tbl_product_type", , , " order by type_name")
        If ds.Tables(0).Rows.Count > 0 Then
            load_type.DataSource = ds.Tables(0)
            load_type.DisplayMember = "type_name"
            load_type.ValueMember = "id"

        End If
    End Sub
    Public Sub load_customer()
        If txt_search.TextLength > 0 Then
            DataGridView1.Visible = True
            Call grids1(DataGridView1)
            'Dim query As String = "tbl_customer", " id,customer_name ", " customer_name like '%" & txt_search.Text & "%'", " Order By customer_name"
            Call SQL_Select("tbl_customer", " id,customer_name ", " customer_name like '%" & txt_search.Text & "%' OR telephone like '%" & txt_search.Text & "%' OR contact like '%" & txt_search.Text & "%' OR address like '%" & txt_search.Text & "%' ", " Order By customer_name")
            If ds.Tables(0).Rows.Count > 0 Then
                With DataGridView1
                    .DataSource = ds.Tables(0)
                    .Columns(0).Visible = False
                    .Columns(1).HeaderText = "Customer Name"
                End With
            Else
                DataGridView1.DataSource = Nothing
            End If
        Else
            DataGridView1.DataSource = Nothing
        End If
    End Sub
    Private Sub Add_Edit_Quotation_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub
    Dim ttt As Char = ""
    Dim nnn As Boolean = False
    Private Sub product_id_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_name.KeyDown
        txt_search.Visible = True
        ttt = Chr(e.KeyCode)
        nnn = True
        txt_search.Focus()
    End Sub

    Private Sub customer_name_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles customer_name.KeyPress

    End Sub

    Private Sub customer_name_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_name.KeyUp

    End Sub

    Private Sub product_id_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles customer_name.TextChanged

    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick
        event_for_customer()
    End Sub
    Public Sub event_for_customer()
        On Error Resume Next
        With DataGridView1
            customer_name.Text = .Rows(.CurrentRow.Index).Cells(1).Value 'Item Name
            customer_id = .Rows(.CurrentRow.Index).Cells(0).Value 'patient id
            Dim k As Double = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            amount_due.Text = Format(k, "0.00")
            txt_search.Visible = False
            txt_search.Text = ""
            DataGridView1.Visible = False
            quo_no.Focus()
        End With
    End Sub

    Private Sub DataGridView1_DoubleClick(ByVal sender As Object, ByVal e As System.EventArgs) Handles DataGridView1.DoubleClick
        event_for_customer()
    End Sub
    Private Sub DataGridView1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView1.KeyDown
        With DataGridView1
            If e.KeyCode = Keys.Enter Then
                event_for_customer()
            End If

            If e.KeyCode = 27 Then
                DataGridView1.Visible = False
                customer_name.Focus()
            End If
        End With
    End Sub

    Private Sub txt_search_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyDown
        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            DataGridView1.Focus()
        End If
        If e.KeyCode = Keys.Enter Then
            With DataGridView1
                If DataGridView1.Rows.Count > 0 Then
                     If e.KeyCode = Keys.Enter Then
                        customer_name.Text = .Rows(0).Cells(1).Value 'Item Name
                        customer_id = .Rows(0).Cells(0).Value 'patient id
                        Dim k As Double = get_single_value("due_amount", "tbl_customer", " id", customer_id)
                        amount_due.Text = Format(k, "0.00")
                        txt_search.Visible = False
                        txt_search.Text = ""
                        DataGridView1.Visible = False
                        quo_no.Focus()
                    End If
                End If
            End With
        End If
    End Sub

    Private Sub txt_search_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyUp
        If txt_search.Text.Length <= 1 And nnn = True Then
            txt_search.Text = ttt
            txt_search.SelectionStart = txt_search.TextLength
            nnn = False
        End If
    End Sub

    Private Sub txt_search_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txt_search.TextChanged
        load_customer()
    End Sub

    Private Sub DataGridView1_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles DataGridView1.KeyPress
        txt_search.Focus()
    End Sub

    Private Sub DataGridView2_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView2.CellContentClick


    End Sub

    Private Sub DataGridView2_CellEndEdit(ByVal sender As Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView2.CellEndEdit

        If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
            'SendKeys.Send("{up}")
            SendKeys.Send("{right}")
        Else
            'SendKeys.Send("{up}")
            SendKeys.Send("{right}")
        End If
        Call load_sr()
        Call cal()
    End Sub
    Dim contain_id As String = ""
    Private Sub DataGridView2_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView2.KeyDown
        On Error Resume Next
        If (e.KeyCode = Keys.I AndAlso e.Modifiers = Keys.Control) Then
            DataGridView2.Rows.Add(1)
            'DataGridView2.accept()
            Call load_sr()
        End If
        If e.KeyCode = Keys.Tab Then
            per.Focus()
        End If

        With DataGridView2

            If (e.KeyCode = Keys.D AndAlso e.Modifiers = Keys.Control) Then

                If DataGridView2.RowCount <= 1 Then Exit Sub
                c_row = .CurrentCell.RowIndex
                If DataGridView2.Rows(c_row).Cells(6).Value > 0 Then

                    contain_id = contain_id & "," & Val(DataGridView2.Rows(c_row).Cells(6).Value)
                    DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
                Else
                    DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
                End If
                Call load_sr()
                Call cal()
                Exit Sub
            End If

        End With
        If e.KeyCode = Keys.Enter Then
            If DataGridView2.CurrentCell.ColumnIndex = 4 Then
                'SendKeys.Send(Chr(Keys.Tab))
                DataGridView2.AllowUserToAddRows = False
                'MsgBox(DataGridView2.CurrentCell.RowIndex + 1)
                With DataGridView2
                    If .Rows(.CurrentCell.RowIndex + 1).Cells(1).Value = "" Or .Rows(.CurrentCell.RowIndex + 1).Cells(1).Value = "Type Product Name" Then
                        DataGridView2.RowCount = Val(DataGridView2.RowCount) + 1
                    End If
                End With
                SendKeys.Send("{home}")
                SendKeys.Send("{left}")
                Call load_sr()
            Else
                If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
                    'SendKeys.Send("{up}")
                    SendKeys.Send("{right}")
                Else
                    SendKeys.Send("{up}")
                    SendKeys.Send("{right}")
                End If
            End If
            'e.SuppressKeyPress = True
            'SendKeys.Send(Chr(Keys.Tab))
        End If
        If DataGridView2.CurrentCell.ColumnIndex = 1 Then
            If e.KeyCode <> Keys.Right And e.KeyCode <> Keys.Left And e.KeyCode <> Keys.Up And e.KeyCode <> Keys.Down And e.KeyCode <> Keys.ControlKey And e.KeyCode <> Keys.Tab And e.KeyCode <> Keys.Enter Then
                If Asc(e.KeyCode) = 49 Then GoTo jjjj
                find_item.Visible = True
                ttt = Chr(e.KeyCode)
                nnn = True
                find_item.Focus()
jjjj:
            End If
        End If
    End Sub

    Private Sub load_item_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles load_item.CellContentClick

    End Sub

    Private Sub load_item_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles load_item.KeyDown
        If e.KeyCode = Keys.Enter Then
            key_down_()
        End If
    End Sub
    Public Sub key_down_()
        With load_item

            DataGridView2.Rows(c_row).Cells(0).Value = c_row + 1

            DataGridView2.Rows(c_row).Cells(5).Value = .Rows(.CurrentRow.Index).Cells(0).Value 'Item ID
            'DataGridView2.Rows(c_row).Cells(1).Value = .Rows(.CurrentRow.Index).Cells(1).Value 'Item code
            DataGridView2.Rows(c_row).Cells(1).Value = .Rows(.CurrentRow.Index).Cells(2).Value 'item name
            DataGridView2.Rows(c_row).Cells(3).Value = .Rows(.CurrentRow.Index).Cells(3).Value 'unit
            DataGridView2.Rows(c_row).Cells(2).Value = 1
            load_item.Visible = False
            find_item.Visible = False
            find_item.Text = ""

            If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
                'SendKeys.Send("{up}")
                SendKeys.Send("{right}")
            Else
                SendKeys.Send("{up}")
                SendKeys.Send("{right}")
            End If
            DataGridView2.Focus()
            find_item.Visible = False
            'txt_search.Visible = False
            'txt_search.Text = ""
            Call load_sr()
            Call cal()
        End With
    End Sub
    Public Sub load_sr()
        With DataGridView2
            For i = 0 To .Rows.Count - 1
                .Rows(i).Cells(0).Value = i + 1
            Next
        End With
    End Sub

    Private Sub per_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles per.KeyDown
        Call ctrl_focus(e)

    End Sub

    Private Sub per_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles per.KeyPress
        Call isdigit(sender, e)
    End Sub

    Private Sub per_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles per.TextChanged
        If Val(per.Text) = 0 Then
            discount.Enabled = True
        ElseIf Val(per.Text) > 0 Then
            discount.Enabled = False
        End If
        Call cal()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If quo_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            quo_no.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        Call saved()
        'MsgBox("Quotation Details Saved!", vbInformation)
        Call View_Quotation.load_grid_sql()
        If quotation_id > 0 Then

        Else
            quotation_id = get_max_number("id", "tbl_quotation_main")
        End If
        Call View_Invoice.load_grid_sql()
        ExportToPDF()
        'Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
        'Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        'If quot_path1 = "" Then
        '    MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
        '    Exit Sub
        'End If
        'user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        'Dim folder_path, pdf_path As String
        'Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
        'Dim iMonth As Integer = Month(quo_date.Value)
        'folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

        'If (Not System.IO.Directory.Exists(folder_path)) Then
        '    System.IO.Directory.CreateDirectory(folder_path)
        'End If

        ''MsgBox(folder_path)
        ''MsgBox(Q_no)
        'Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        ''pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        'pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        ''global_pdf_path = quot_path1 'pdf_path
        'Using Stream As New FileStream(pdf_path, FileMode.Create)
        '    Stream.Write(Bytes, 0, Bytes.Length)
        'End Using
        'MsgBox("Quotation Details Saved!", vbInformation)
        'Preview_Quotation_Report.Dispose()
        Me.Dispose()
        Me.Close()
        Exit Sub
    End Sub
    Dim exportPDFPath As String
    Private Sub ExportToPDF()
        Dim FrmPreview_Quotation_Report As New Preview_Quotation_Report()
        Call FrmPreview_Quotation_Report.Preview_Quotation_Report_Load(Nothing, Nothing)
        Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
        Dim iMonth As Integer = Month(quo_date.Value)
        folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = FrmPreview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        exportPDFPath = pdf_path
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        MsgBox("Quotation Details Saved!", vbInformation)
        FrmPreview_Quotation_Report.Dispose()
    End Sub

    Dim msmsms As String = ""
    Public Sub saved()
        msmsms = get_single_value("title_name", "tbl_customer", "id", customer_id)
        Dim variable As New Dictionary(Of String, String)
        'Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
        'For Each item As TextBox In textboxes
        '    variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
        'Next
        variable.Add("customer_id", "'" & Val(customer_id) & "'")
        variable.Add(quo_no.Name, "'" & quo_no.Text & "'")
        variable.Add(checklist_no.Name, "'" & checklist_no.Text & "'")
        variable.Add(sub_total.Name, "'" & Val(sub_total.Text) & "'")
        variable.Add(amount_due.Name, "'" & Val(amount_due.Text) & "'")
        variable.Add(discount.Name, "'" & Val(discount.Text) & "'")
        variable.Add("total", "'" & Val(total_amt.Text) & "'")
        variable.Add(per.Name, "'" & Val(per.Text) & "'")
        variable.Add(vat.Name, "'" & Val(vat.Text) & "'")
        variable.Add(quo_date.Name, "'" & Format(quo_date.Value, "dd-MMM-yyyy") & "'")
        If quotation_id > 0 Then
            Dim d As String = SQL_Update("tbl_quotation_main", variable, "id=" & quotation_id)
        Else
            Dim d As Integer = SQL_Insert("tbl_quotation_main", variable)
        End If
        Dim main_id As Double = 0
        If quotation_id > 0 Then
            main_id = quotation_id
        Else
            main_id = get_max_number("id", "tbl_quotation_main")
        End If
        For i = 0 To DataGridView2.Rows.Count - 1
            With DataGridView2
                If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Press Enter Key" Then GoTo kkk
                Dim load_id As Double
                Dim qty, product_id, unit_price, row_total As Double
                qty = Val(.Rows(i).Cells(2).Value)
                unit_price = Val(.Rows(i).Cells(3).Value)
                row_total = Val(.Rows(i).Cells(4).Value)
                product_id = Val(.Rows(i).Cells(5).Value)
                load_id = Val(.Rows(i).Cells(6).Value)
                Dim sr_no As Double = Val(.Rows(i).Cells(0).Value)
                Dim q As String = ""
                If load_id > 0 Then
                    q = "update tbl_quotation_sub set qty='" & qty & "',product_id='" & product_id & "'" &
                        ",unit_price='" & unit_price & "',row_total='" & row_total & "',s_no='" & sr_no & "' where id='" & load_id & "'"
                Else
                    q = "insert into tbl_quotation_sub(main_id,qty,product_id,unit_price,row_total,s_no) values " &
                        " ('" & main_id & "','" & qty & "','" & product_id & "','" & unit_price & "','" & row_total & "','" & sr_no & "')"
                End If
                cmd = New SqlCommand(q, con)
                cmd.ExecuteNonQuery()
            End With
kkk:
        Next
        If invoice_id = 0 Then
            Dim q As String = "update tbl_numbers set quo_no='" & Val(quo_no.Text) + 1 & "' where id='" & get_max_number("id", "tbl_numbers") & "'"
            cmd = New SqlCommand(q, con)
            cmd.ExecuteNonQuery()
        End If
        'Dim k As String = "update tbl_customer set due_amount='" & Val(sub_total.Text) + Val(amount_due.Text) & "' where id='" & customer_id & "'"
        'cmd = New SqlCommand(k, con)
        'cmd.ExecuteNonQuery()

        Dim LineOfText As String
        Dim i1 As Integer
        Dim aryTextFile() As String

        LineOfText = contain_id

        aryTextFile = LineOfText.Split(",")

        For i1 = 0 To UBound(aryTextFile)
            Dim id As Double = Val(aryTextFile(i1))

            Dim m As String = "delete from tbl_quotation_sub where id='" & id & "'"
            cmd = New SqlCommand(m, con)
            cmd.ExecuteNonQuery()

        Next i1
    End Sub

    Private Sub discount_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles discount.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub discount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles discount.TextChanged

        cal()
    End Sub

    Private Sub find_item_Invalidated(ByVal sender As Object, ByVal e As System.Windows.Forms.InvalidateEventArgs) Handles find_item.Invalidated

    End Sub

    Private Sub find_item_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles find_item.KeyDown
        If e.KeyCode = Keys.Enter Then
            With load_item
                If e.KeyCode = Keys.Enter Then
                    If .Rows.Count > 0 Then


                        DataGridView2.Rows(c_row).Cells(0).Value = c_row + 1

                        DataGridView2.Rows(c_row).Cells(5).Value = .Rows(0).Cells(0).Value 'Item ID
                        'DataGridView2.Rows(c_row).Cells(1).Value = .Rows(.CurrentRow.Index).Cells(1).Value 'Item code
                        DataGridView2.Rows(c_row).Cells(1).Value = .Rows(0).Cells(2).Value 'item name
                        DataGridView2.Rows(c_row).Cells(3).Value = .Rows(0).Cells(3).Value 'unit
                        DataGridView2.Rows(c_row).Cells(2).Value = 1
                        load_item.Visible = False
                        find_item.Visible = False
                        find_item.Text = ""

                        If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
                            'SendKeys.Send("{up}")
                            SendKeys.Send("{right}")
                        Else
                            SendKeys.Send("{up}")
                            SendKeys.Send("{right}")
                        End If
                        DataGridView2.Focus()
                        find_item.Visible = False
                        'txt_search.Visible = False
                        'txt_search.Text = ""
                    End If
                End If
            End With
        End If

        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            load_item.Focus()
        End If
        Call load_sr()
        Call cal()
    End Sub

    Private Sub find_item_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles find_item.KeyUp
        If find_item.Text.Length <= 1 And nnn = True Then
            find_item.Text = ttt
            find_item.SelectionStart = find_item.TextLength
            nnn = False
        End If
    End Sub

    Private Sub find_item_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find_item.TextChanged
        If find_item.TextLength > 0 Then
            With DataGridView2
                load_item.Visible = True
                find_item.Visible = True

                'load_item.Focus()
                'TextBox1.Focus()
                c_row = .CurrentCell.RowIndex
                c_col = .CurrentCell.ColumnIndex
            End With
            Call load_items()
        Else
            load_item.DataSource = Nothing
        End If
    End Sub

    Private Sub invoice_no_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles quo_no.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub invoice_no_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles quo_no.TextChanged

    End Sub

    Private Sub checklist_no_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles checklist_no.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub checklist_no_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles checklist_no.TextChanged

    End Sub

    Private Sub vat_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles vat.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub vat_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles vat.TextChanged

    End Sub

    Private Sub load_item_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles load_item.KeyPress
        If Asc(e.KeyChar) <> Keys.Space Then
            find_item.Focus()
        End If

    End Sub

    Private Sub DateTimePicker1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles quo_date.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub DateTimePicker1_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles quo_date.ValueChanged

    End Sub

    Private Sub Label4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label4.Click

    End Sub

    Private Sub load_type_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles load_type.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub load_type_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles load_type.SelectedIndexChanged
        load_items()
    End Sub

    Private Sub CheckBox1_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles all_type.CheckedChanged
        If all_type.Checked = True Then
            load_type.Enabled = False
        Else
            load_type.Enabled = True
        End If
        Call load_items()
    End Sub

    Private Sub DataGridView2_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles DataGridView2.KeyPress

    End Sub

    Private Sub vat_per_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles vat_per.TextChanged

    End Sub

    Private Sub all_type_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles all_type.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        customer_id = 0
        Call __show(Add_Edit_Customer)
        load_nav_bar("Add_Edit_Customer", "Add Customer")
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If quo_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            quo_no.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        Call saved()
        If quotation_id > 0 Then
            quotation_id = quotation_id
        Else
            quotation_id = get_max_number("id", "tbl_quotation_main")
        End If

        ExportToPDF()

        'Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
        'Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        'If quot_path1 = "" Then
        '    MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
        '    Exit Sub
        'End If
        'user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        'Dim folder_path, pdf_path As String
        'Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
        'Dim iMonth As Integer = Month(quo_date.Value)
        'folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
        ''folder_path = quot_path1 & "\" & user_name

        'If (Not System.IO.Directory.Exists(folder_path)) Then
        '    System.IO.Directory.CreateDirectory(folder_path)
        'End If

        ''MsgBox(folder_path)
        ''MsgBox(Q_no)
        'Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        ''pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        'pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        ''global_pdf_path = quot_path1 'pdf_path
        'Using Stream As New FileStream(pdf_path, FileMode.Create)
        '    Stream.Write(Bytes, 0, Bytes.Length)
        'End Using
        Call __show(Preview_Quotation_Report)
        load_nav_bar("Preview_Quotation_Report", "Preview Quotation")
        Call View_Quotation.load_grid_sql()
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub load_item_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles load_item.MouseDoubleClick
        key_down_()
        Call cal()
        load_sr()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
        For Each item As TextBox In textboxes
            item.Text = ""
        Next
        load_type.SelectedIndex = -1
        customer_name.Text = "Type Customer Name"
        customer_id = 0
        quotation_id = 0
        quo_date.Value = Date.Now
        'case_debit.SelectedIndex = -1
        DataGridView2.Rows.Clear()
        DataGridView2.Rows.Insert(0, 1, "Type Product Name")
        load_type.SelectedIndex = 0
        quo_no.Text = get_single_value("quo_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
        amount_due.Text = ""
        total_amt.Text = ""
    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        Button6.Text = "Sending...."
        is_pdf = True
      If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If quo_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            quo_no.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        Call saved()
        'MsgBox("Quotation Details Saved!", vbInformation)
        Call View_Quotation.load_grid_sql()
        If quotation_id > 0 Then

        Else
            quotation_id = get_max_number("id", "tbl_quotation_main")
        End If
        Call View_Invoice.load_grid_sql()

        ExportToPDF()

        'Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
        'Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        'If quot_path1 = "" Then
        '    MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
        '    Exit Sub
        'End If
        'user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        'Dim folder_path, pdf_path As String
        'Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
        'Dim iMonth As Integer = Month(quo_date.Value)
        'folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
        ''folder_path = quot_path1 & "\" & user_name

        'If (Not System.IO.Directory.Exists(folder_path)) Then
        '    System.IO.Directory.CreateDirectory(folder_path)
        'End If

        ''MsgBox(folder_path)
        ''MsgBox(Q_no)
        'Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        ''pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        'pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        ''global_pdf_path = quot_path1 'pdf_path
        'Using Stream As New FileStream(pdf_path, FileMode.Create)
        '    Stream.Write(Bytes, 0, Bytes.Length)
        'End Using

        direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
        Dim temp_id As String = get_single_value("id", "tbl_email", "identify", "QUOTATION")
        direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", Val(temp_id))
        direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", Val(temp_id))
        direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
        direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
        direct_email.body.Text = get_single_value("body", "tbl_email", "id", Val(temp_id))
        direct_email.attach.Text = exportPDFPath
        Dim title As String = get_single_value("title_name", "tbl_customer", "id", customer_id)
        'direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", title & " " & customer_name.Text & ",")
        direct_email.body.Text = direct_email.body.Text.Replace("<date>", Format(quo_date.Value, "dd.MM.yyyy") & ".")
        direct_email.body.Text = direct_email.body.Text.Replace("invoice", "quotation")
        Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
        If contact = "" Then
            direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", "")
        Else
            direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", contact)
        End If
        Call direct_email.ShowDialog()
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        event_for_customer()
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        new_pro_key_quo = True
        product_ids = 0
        Call __show(Add_Edit_Product)
        load_nav_bar("Add_Edit_Product", "Add Product")
    End Sub
End Class