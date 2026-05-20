Imports System.IO
Imports Microsoft.Reporting.WinForms
Imports System.Drawing.Printing

Public Class View_List_of_Receipt

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub View_Invoice_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub View_Invoice_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub View_Invoice_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        lblTotalRecords.Text = ""
        lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
        Call con_sql()
        Me.KeyPreview = True
        Call load_grid_sql()

    End Sub
    Public Sub grids11(ByRef grids As DataGridView)
        With grids
            .Font = New Font("Franklin Gothic Book", 11)
            .ForeColor = Color.Black
            .EnableHeadersVisualStyles = False
            ' .ColumnHeadersDefaultCellStyle.BackColor = Color.WhiteSmoke
            .ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.EnableResizing
            .ColumnHeadersHeight = 40
            .ColumnHeadersHeight = 45
            .RowTemplate.Height = 30
            .ColumnHeadersDefaultCellStyle.Font = New Font("Franklin Gothic Book", 14.75)
            .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
            .RowHeadersVisible = False
            .DefaultCellStyle.BackColor = Color.WhiteSmoke
            If .Columns.Count > 0 Then
                .Columns(0).Visible = False
            End If
            .BackgroundColor = Color.WhiteSmoke
            .AllowUserToResizeRows = False
            .AllowUserToResizeColumns = False
            .SelectionMode = DataGridViewSelectionMode.FullRowSelect
            .ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing
            .DefaultCellStyle.SelectionForeColor = Color.Black
            .RowsDefaultCellStyle.SelectionBackColor = Color.LightSkyBlue    'ColorTranslator.FromHtml("#d63627")
            '.DefaultCellStyle.SelectionBackColor = Color.WhiteSmoke
            .RowHeadersBorderStyle = DataGridViewHeaderBorderStyle.Single

        End With
    End Sub
    Public Sub load_grid_sql()
        Call grids11(DataGridView1)
        'DataGridView1.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode. 
        'Call SQL_Query("SELECT tbl_invoice_main.id, tbl_invoice_main.invoice_no,tbl_invoice_main.invoice_date, LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name)," &
        '              " tbl_invoice_main.checklist_no, tbl_invoice_main.total, tbl_invoice_main.customer_id " &
        '               " FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id", " where tbl_customer.customer_name like '%" & find.Text & "%' or tbl_invoice_main.invoice_no like '%" & find.Text & "%' or tbl_invoice_main.checklist_no like '%" & find.Text & "%' order by tbl_invoice_main.id Desc")

        'Call SQL_Query("SELECT tbl_receipt.id, tbl_receipt.receipt_no, tbl_receipt.receipt_date," &
        '               " tbl_customer.customer_name, tbl_receipt.amount_received, tbl_receipt.no," &
        '               " tbl_customer.due_amount,tbl_receipt.cheque_no,tbl_customer.id FROM " &
        '               "tbl_customer INNER JOIN tbl_receipt ON tbl_customer.id = " &
        '               "tbl_receipt.customer_id Order By tbl_receipt.receipt_date Desc")

        Dim query As String = "SELECT tbl_receipt.id, tbl_receipt.receipt_no, tbl_receipt.receipt_date," &
                       " tbl_customer.customer_name, tbl_receipt.amount_received, tbl_receipt.no," &
                       " tbl_customer.due_amount,tbl_receipt.cheque_no,tbl_customer.id FROM " &
                       "tbl_customer INNER JOIN tbl_receipt ON tbl_customer.id = " &
                       "tbl_receipt.customer_id " &
                        "WHERE tbl_customer.customer_name like '%" & find.Text & "%' OR " &
                        "tbl_receipt.receipt_no like '" & find.Text & "%' Order By tbl_receipt.receipt_no Desc, tbl_receipt.receipt_date Desc"

        Call SQL_Query(query)

        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)
            With DataGridView1

                .Columns(0).Visible = False
                .Columns(1).HeaderText = "Receipt No"
                .Columns(2).HeaderText = "Receipt Date"
                .Columns(3).HeaderText = "Customer Name"
                .Columns(4).HeaderText = "Amount Received"
                .Columns(7).HeaderText = "Cheque No"
                .Columns(5).Visible = False
                .Columns(8).Visible = False
                .Columns(6).HeaderText = "Due Amount"
                .Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
                .CellBorderStyle = DataGridViewCellBorderStyle.Single
                With DataGridView1
                    .Columns(4).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(6).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(6).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(4).DefaultCellStyle.Format = "#,0.00"
                    .Columns(6).DefaultCellStyle.Format = "#,0.00"
                End With
                ''.Columns(6).Visible = False
                ''.Columns(5).Visible = False
                '.Columns(0).Width = 0
                '.Columns(1).HeaderText = "Receipt NO"
                ''.Columns(1).Width = 30
                '.Columns(2).HeaderText = "Receipt Date"
                '.Columns(2).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                '.Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                ''.Columns(2).Width = 30
                '.Columns(3).HeaderText = "Customer Name"
                ''.Columns(3).Width = 50
                '.Columns(4).HeaderText = "Amount Received"
                ''.Columns(4).Width = 30
                '.Columns(5).HeaderText = "Cheque No"
                '.Columns(6).HeaderText = "Due Amount"
                ''.Columns(6).Width = 300

                '.Columns(5).DisplayIndex = 6
                ''.Columns(1).DisplayIndex = 3

            End With
        Else
            DataGridView1.DataSource = Nothing
        End If
        lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
    End Sub


    Private Sub View_Invoice_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click

        Receipt_voucher_ID = 0
        customer_id = 0
        receipt_id = 0
        Add_Edit_Receipt.ShowDialog()
        Add_Edit_Receipt.BringToFront()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Call edit1()
    End Sub
    Public Sub edit1()
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        Receipt_voucher_ID = 0
        receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call __show(Add_Edit_Receipt)
        load_nav_bar("Add_Edit_Receipt", "Edit Receipt")
    End Sub
    Private Sub find_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find.TextChanged
        load_grid_sql()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        'Dim receipt_id As Double = 0
        Dim frm As Form = Preview_Invoice_Report
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
        customer_id = DataGridView1.SelectedRows(0).Cells(8).Value
        Call Preview_Receipt.Preview_Receipt_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim file_name As String = "PAY" & get_single_value("receipt_no", "tbl_receipt", "id", receipt_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Receipt.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)

        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
            Stream.Dispose()
            Stream.Close()
        End Using

        Call __show(Preview_Receipt)
        load_nav_bar("Preview_Receipt", "Preview Receipt")
        'Call __show(Preview_Invoice_Report) '.Preview_Invoice_Report_Load(sender, e)

        Exit Sub
        is_pdf = False
        Preview_Receipt.Preview_Receipt_Load(sender, e)

        '  load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
    End Sub

    Private Sub View_Invoice_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles Me.Paint
        Call admin1(Button3)
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Receipt Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
        ' Try
        Dim ask As String
        ask = MsgBox("Are You Sure Want to Delete Receipt?", vbQuestion + vbYesNo)
        If ask = "6" Then
            If DataGridView1.SelectedRows.Count <= 0 Then
                MsgBox("No Receipt Selected", MsgBoxStyle.Critical)
                DataGridView1.Focus()
                Exit Sub
            End If
            'Dim cur_due_amount As String = get_single_value("due_amount", "tbl_customer", "id", Val(DataGridView1.SelectedRows(0).Cells(6).Value))
            'Dim entry_due_amunt As String = Math.Round(Val(DataGridView1.SelectedRows(0).Cells(7).Value))
            'Dim final_amt As Double = Val(cur_due_amount - entry_due_amunt)
            'Dim variable As New Dictionary(Of String, String)
            'variable.Add("due_amount", "'" & Val(final_amt) & "'")
            'Call SQL_Update("tbl_customer", variable, " id='" & Val(DataGridView1.SelectedRows(0).Cells(6).Value) & "'")
            Call SQL_Delete("tbl_receipt", " id='" & receipt_id & "'")
            'Call SQL_Delete("tbl_invoice_sub", " main_id='" & invoice_id & "'")
            MsgBox("Receipt Successfully Deleted.", vbInformation)
            Call load_grid_sql()
            DataGridView1.Focus()
        ElseIf ask = "7" Then
            DataGridView1.Focus()
            Exit Sub
        End If
        load_grid_sql()
        DataGridView1.Focus()

        If ds.Tables(0).Rows.Count = 0 Then
            ' DataGridView1.Rows.Clear()
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub DataGridView1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView1.KeyDown
        If e.KeyCode = Keys.Enter Then
            Call edit1()
            e.SuppressKeyPress = True
            e.Handled = True
        End If
    End Sub

    Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        Call edit1()
    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        is_pdf = True
        Dim frm As Form = Preview_Invoice_Report
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
        customer_id = DataGridView1.SelectedRows(0).Cells(8).Value
        Call Preview_Receipt.Preview_Receipt_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim file_name As String = "PAY" & get_single_value("receipt_no", "tbl_receipt", "id", receipt_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Receipt.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)

        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
            Stream.Dispose()
            Stream.Close()
        End Using
        direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
        Dim temp_id As String = get_single_value("id", "tbl_email", "identify", "RECEIPT")
        direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", Val(temp_id))
        direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", Val(temp_id))
        direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
        direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
        direct_email.body.Text = get_single_value("body", "tbl_email", "id", Val(temp_id))
        direct_email.attach.Text = pdf_path
        Dim title As String = get_single_value("title_name", "tbl_customer", "id", customer_id)
        direct_email.body.Text = direct_email.body.Text.Replace("<name>", title & " " & user_name & ",")
        direct_email.body.Text = direct_email.body.Text.Replace("<date>", Format(Date.Now, "dd.MM.yyyy") & ".")
        Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
        If contact = "" Then
            direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", "")
        Else
            direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", contact)
        End If
        Preview_Receipt.Dispose()
        Preview_Receipt.Close()
        Call direct_email.ShowDialog()
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub DataGridView1_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles DataGridView1.Paint
        
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        'Dim receipt_id As Double = 0
        Dim frm As Form = Preview_Invoice_Report
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
        customer_id = DataGridView1.SelectedRows(0).Cells(8).Value
        Call Preview_Receipt.Preview_Receipt_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim file_name As String = "PAY" & get_single_value("receipt_no", "tbl_receipt", "id", receipt_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Receipt.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)

        pdf_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
            Stream.Dispose()
            Stream.Close()
        End Using

        MsgBox(pdf_path, vbInformation)
        'Call __show(Preview_Receipt)
        'load_nav_bar("Preview_Receipt", "Preview Receipt")
        'Call __show(Preview_Invoice_Report) '.Preview_Invoice_Report_Load(sender, e)

        Preview_Receipt.Dispose()
        Preview_Receipt.Close()
        Exit Sub
        is_pdf = False
        Preview_Receipt.Preview_Receipt_Load(sender, e)

        '  load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
    End Sub
End Class