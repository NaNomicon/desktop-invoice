Imports System.IO
Imports System.Threading
Imports System.Globalization
Imports System.Net.Mail


Public Class View_Quotation

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub View_Invoice_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub View_Quotation_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub View_Quotation_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        lblTotalRecords.Text = ""
        lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
        Me.KeyPreview = True
        Call load_grid_sql()
    End Sub
    Public Sub load_grid_sql()
        Call grids1(DataGridView1)
        Call SQL_Query("SELECT tbl_quotation_main.id, tbl_quotation_main.quo_no,tbl_quotation_main.quo_date, LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name), tbl_quotation_main.checklist_no, CAST(CONVERT(VARCHAR, CAST(tbl_quotation_main.total AS MONEY), 1) AS VARCHAR) FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id", " where tbl_customer.customer_name like '%" & find.Text & "%' or tbl_quotation_main.quo_no like '%" & find.Text & "%' or tbl_quotation_main.checklist_no like '%" & find.Text & "%' order by tbl_quotation_main.id desc")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)
            With DataGridView1
                '.Columns(0).Visible = False
                '.Columns(1).HeaderText = "Quotation No"
                '.Columns(2).HeaderText = "Date"
                '.Columns(3).HeaderText = "Customer Name"
                '.Columns(4).HeaderText = "Checklist No"
                '.Columns(5).HeaderText = "Total"

                .Columns(0).Visible = False
                .Columns(0).Width = 0
                .Columns(1).HeaderText = "Quotation No"
                .Columns(1).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(1).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(1).Width = 30
                .Columns(2).HeaderText = "Date"
                .Columns(2).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(2).Width = 15
                .Columns(3).HeaderText = "Customer Name"
                .Columns(3).Width = 50
                .Columns(4).HeaderText = "Checklist No"
                .Columns(4).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(4).Width = 15
                .Columns(4).Visible = False
                .Columns(5).HeaderText = "Total"
                .Columns(5).Width = 300
                .Columns(5).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(5).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(2).DisplayIndex = 1
                .Columns(1).DisplayIndex = 3
                .Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
                With DataGridView1
                    .Columns(5).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(5).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                End With
            End With
        Else
            DataGridView1.DataSource = Nothing
        End If
        lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
    End Sub


    Private Sub View_Quotation_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        quotation_id = 0
        customer_id = 0
        Call __show(Add_Edit_Quotation)
        load_nav_bar("Add_Edit_Quotation", "Add Quotation")
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
        quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call __show(Add_Edit_Quotation)
        load_nav_bar("Add_Edit_Quotation", "Edit Quotation")
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
        quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name
        'folder_path = quot_path1 & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        Call __show(Preview_Quotation_Report)
        load_nav_bar("Preview_Quotation_Report", "Preview Quotation")

    End Sub

    Private Sub View_Quotation_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles Me.Paint
        Call admin1(Button3)
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No User Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
        ' Try
        Dim ask As String
        ask = MsgBox("Are You Sure Want to Delete Quotation Details?", vbQuestion + vbYesNo)
        If ask = "6" Then
            If DataGridView1.SelectedRows.Count <= 0 Then
                MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
                DataGridView1.Focus()
                Exit Sub
            End If

            Call SQL_Delete("tbl_quotation_main", " id='" & quotation_id & "'")
            Call SQL_Delete("tbl_quotation_sub", " main_id='" & quotation_id & "'")
            MsgBox("Quotation Successfully Deleted.", vbInformation)
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

    Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If


        Quotation_To_Invoice_ID = DataGridView1.SelectedRows(0).Cells(0).Value
        Call __show(Add_Edit_Invoice)
        load_nav_bar("Add_Edit_Invoice", "Add Invoice From Quot.")
    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call Preview_Quotation_Report.Preview_Quotation_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("quo_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Quotation Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "QUO" & get_single_value("quo_no", "tbl_quotation_main", "id", quotation_id) & "-" & user_name
        Dim iMonth As Integer = Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        'folder_path = quot_path1 & "\" & user_name
        folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If
        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Quotation_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        'Call create_log(DateTime.Now, "QUOTATION", "PDF", "PDF new " & user_name & " Quotation & No : " & file_name & "")
        ' MsgBox("PDF File Created Successfully." & vbCrLf & "Saved AT " & pdf_path, MsgBoxStyle.Information, "Automation Square")
        Preview_Quotation_Report.Dispose()
        Preview_Quotation_Report.Close()

        Process.Start(pdf_path)
    End Sub
  
    Private Sub DataGridView1_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles DataGridView1.Paint
        
    End Sub

    Private Sub DataGridView1_KeyDown(sender As Object, e As KeyEventArgs) Handles DataGridView1.KeyDown
        If e.KeyCode = Keys.Enter Then
            Call edit1()
            e.SuppressKeyPress = True
            e.Handled = True
        End If
    End Sub
End Class