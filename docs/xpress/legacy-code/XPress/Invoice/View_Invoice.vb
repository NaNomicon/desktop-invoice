Imports System.IO
Imports Microsoft.Reporting.WinForms
Imports System.Drawing.Printing

Public Class View_Invoice

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
    Public Sub load_grid_sql()
        Call grids1(DataGridView1)
        'DataGridView1.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode. 
        'Call SQL_Query("SELECT tbl_invoice_main.id, tbl_invoice_main.invoice_no,tbl_invoice_main.invoice_date, LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name)," &
        '              " tbl_invoice_main.checklist_no, tbl_invoice_main.total, tbl_invoice_main.customer_id " &
        '               " FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id", " where tbl_customer.customer_name like '%" & find.Text & "%' or tbl_invoice_main.invoice_no like '%" & find.Text & "%' or tbl_invoice_main.checklist_no like '%" & find.Text & "%' order by tbl_invoice_main.id Desc")
        Call SQL_Query("SELECT tbl_invoice_main.id, tbl_invoice_main.invoice_no,tbl_invoice_main.invoice_date, tbl_customer.customer_name," &
                      " tbl_invoice_main.checklist_no, tbl_invoice_main.total, tbl_invoice_main.customer_id,CAST(CONVERT(VARCHAR, CAST(SUM(tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount) AS MONEY), 1) AS VARCHAR), tbl_invoice_main.cr_dr" &
                       " FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id", " where tbl_customer.customer_name like '%" & find.Text & "%' or tbl_invoice_main.invoice_no like '%" & find.Text & "%' or tbl_invoice_main.checklist_no like '%" & find.Text & "%' " &
                       " Group by tbl_invoice_main.id, tbl_invoice_main.invoice_no,tbl_invoice_main.invoice_date, tbl_customer.customer_name," &
                      " tbl_invoice_main.checklist_no, tbl_invoice_main.total, tbl_invoice_main.customer_id,tbl_invoice_main.cr_dr order by tbl_invoice_main.id Desc ")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)
            With DataGridView1

                .Columns(0).Visible = False
                .Columns(6).Visible = False
                .Columns(5).Visible = False
                .Columns(8).Visible = False
                .Columns(0).Width = 0
                .Columns(1).HeaderText = "Invoice NO"
                .Columns(1).Width = 30
                .Columns(1).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(1).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(2).HeaderText = "Date"
                .Columns(2).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(2).Width = 15
                .Columns(3).HeaderText = "Customer Name"
                .Columns(3).Width = 50
                .Columns(4).HeaderText = "Checklist No"
                .Columns(4).Width = 30
                .Columns(4).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(7).HeaderText = "Total"
                .Columns(7).Width = 300
                .Columns(2).DisplayIndex = 1
                .Columns(1).DisplayIndex = 3
                .Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
                With DataGridView1
                    .Columns(7).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(7).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                End With
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
        'Dim t As String
        't = "1,900.00"
        'MsgBox(Val(t))

        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click

        invoice_id = 0
        customer_id = 0
        Call __show(Add_Edit_Invoice)
        load_nav_bar("Add_Edit_Invoice", "Add Invoice")
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
        invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call __show(Add_Edit_Invoice)
        load_nav_bar("Add_Edit_Invoice", "Edit Invoice")
    End Sub
    Private Sub find_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find.TextChanged
        load_grid_sql()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If

        invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value

        Dim print_due As String
        print_due = get_single_value("print_due", "tbl_invoice_main", "id", invoice_id)
        If print_due = "True" Then
            print_due_amt_on_invoice = True
        ElseIf print_due = "False" Then
            print_due_amt_on_invoice = False
        End If

        Demo_Add_Edit.Add_Edit_Invoice_Load(sender, e)
        'Add_Edit_Invoice.pdf()
        Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Invoice Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If

        Dim msmsms As String
        msmsms = get_single_value("title_name", "tbl_customer", "id", Val(DataGridView1.SelectedRows(0).Cells(6).Value.ToString))
        user_name = msmsms & " " & DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", invoice_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\" & MonthName(iMonth)

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        Call __show(Preview_Invoice_Report)
        load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
        'Call __show(Preview_Invoice_Report) '.Preview_Invoice_Report_Load(sender, e)
       
        Exit Sub
        is_pdf = False
        Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)

        '  load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
    End Sub

    Private Sub View_Invoice_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles Me.Paint
        Call admin1(Button3)
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No User Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
        ' Try
        Dim ask As String
        ask = MsgBox("Are You Sure Want to Delete Invoice Details?", vbQuestion + vbYesNo)
        If ask = "6" Then
            If DataGridView1.SelectedRows.Count <= 0 Then
                MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
                DataGridView1.Focus()
                Exit Sub
            End If
            Dim cur_due_amount As String = get_single_value("due_amount", "tbl_customer", "id", Val(DataGridView1.SelectedRows(0).Cells(6).Value))
            Dim entry_due_amunt As String = Val(DataGridView1.SelectedRows(0).Cells(7).Value.ToString.Replace(",", ""))
            'entry_due_amunt = entry_due_amunt.Replace(",", "")
            Dim cr_dr As String = DataGridView1.SelectedRows(0).Cells(8).Value
            Dim final_amt As Double = 0
            If cr_dr = "Cr." Then
                final_amt = Val(Val(cur_due_amount) + Val(entry_due_amunt))
            ElseIf cr_dr = "Dr." Then
                final_amt = Val(Val(cur_due_amount) - Val(entry_due_amunt))
            End If
            Dim variable As New Dictionary(Of String, String)
            variable.Add("due_amount", "'" & Val(final_amt) & "'")
            Call SQL_Update("tbl_customer", variable, " id='" & Val(DataGridView1.SelectedRows(0).Cells(6).Value) & "'")
            Call SQL_Delete("tbl_invoice_main", " id='" & invoice_id & "'")
            Call SQL_Delete("tbl_invoice_sub", " main_id='" & invoice_id & "'")
            MsgBox("Invoice Successfully Deleted.", vbInformation)
            Call load_grid_sql()
            DataGridView1.Focus()
        ElseIf ask = "7" Then
            DataGridView1.Focus()
            Exit Sub
        End If
        load_grid_sql()
        DataGridView1.Focus()

        If ds.Tables(0).Rows.Count <= 0 Then
            ' DataGridView1.Rows.Clear()
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub DataGridView1_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles DataGridView1.KeyPress
        find.Focus()
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

        invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value

        Dim print_due As String
        print_due = get_single_value("print_due", "tbl_invoice_main", "id", invoice_id)
        If print_due = "True" Then
            print_due_amt_on_invoice = True
        ElseIf print_due = "False" Then
            print_due_amt_on_invoice = False
        End If

        Demo_Add_Edit.Add_Edit_Invoice_Load(sender, e)
        Demo_Add_Edit.pdf()
        Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Invoice Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        'msmsms & " " & 

        Dim msmsms As String
        msmsms = get_single_value("title_name", "tbl_customer", "id", Val(DataGridView1.SelectedRows(0).Cells(6).Value.ToString))
        user_name = msmsms & " " & DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        'invoice_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Dim file_name As String = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", invoice_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\" & MonthName(iMonth)

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)

        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
        'If File.Exists(pdf_path) = False Then
        Using Stream As New FileStream(pdf_path, FileMode.Create)
                Stream.Write(Bytes, 0, Bytes.Length)
            End Using
        'Call create_log(DateTime.Now, "QUOTATION", "PDF", "PDF new " & user_name & " Quotation & No : " & file_name & "")
        ' MsgBox("PDF File Created Successfully." & vbCrLf & "Saved AT " & pdf_path, MsgBoxStyle.Information, "Automation Square")
        'End If
        frm.Dispose()
        frm.Close()

        Process.Start(pdf_path)
        Demo_Add_Edit.Dispose()
        invoice_id = 0
        customer_id = 0
    End Sub

    Private Sub DataGridView1_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles DataGridView1.Paint
    
    End Sub

    Private Sub Button9_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button9.Click
        Panel3.BackgroundImage = Image.FromFile(Application.StartupPath & "\Resources\Report.jpg 02.jpg")
        Panel3.BackgroundImageLayout = ImageLayout.Stretch
    End Sub

    Private Sub Button8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button8.Click
        Panel3.Top = CInt((Panel3.Top + (Panel3.Height * 0.025)))
        Panel3.Left = CInt((Panel3.Left + (Panel3.Width * 0.025)))
        Panel3.Height = CInt((Panel3.Height - (Panel3.Height * 0.05)))
        Panel3.Width = CInt((Panel3.Width - (Panel3.Width * 0.05)))
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        Panel3.Top = CInt((Panel3.Top - (Panel3.Height * 0.025)))
        Panel3.Left = CInt((Panel3.Left - (Panel3.Width * 0.025)))
        Panel3.Height = CInt((Panel3.Height + (Panel3.Height * 0.05)))
        Panel3.Width = CInt((Panel3.Width + (Panel3.Width * 0.05)))
    End Sub

    Private Sub DataGridView1_KeyDown(sender As Object, e As KeyEventArgs) Handles DataGridView1.KeyDown
        If e.KeyCode = Keys.Enter Then
            Call edit1()
            e.SuppressKeyPress = True
            e.Handled = True
        End If
    End Sub
End Class