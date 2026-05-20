Imports Microsoft.Office.Interop.Excel
Imports Microsoft.Office.Interop
Imports System.ComponentModel
Imports System.IO
Public Class Sales_Report
    Dim tables As DataTableCollection
    Dim source1 As New BindingSource
    Dim APP As New Excel.Application
    Dim worksheet As Excel.Worksheet
    Dim workbook As Excel.Workbook

    'Dim xlWorkBook As Excel.Workbook
    'Dim xlWorkSheet As Excel.Worksheet
    'Dim misValue As Object = System.Reflection.Missing.Value
    'Dim xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()
    Private Sub Sales_Report_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Sales_Report_FormClosed(ByVal sender As Object, ByVal e As System.Windows.Forms.FormClosedEventArgs) Handles Me.FormClosed
        On Error Resume Next
        workbook.Save()
        workbook.Close()
        APP.Quit()
    End Sub

    Private Sub Sales_Report_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub Sales_Report_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        fromdate.Value = first_date()
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        Call grids1(DataGridView1)
        Call load_grid()
    End Sub
    Public Sub load_grid()
        Call con_sql()

        Dim q As String
        q = "SELECT tbl_invoice_main.id, LTRIM(tbl_customer.customer_name) AS Expr1, tbl_customer.customer_type, tbl_invoice_main.invoice_no" &
                       ", tbl_invoice_main.invoice_date, " &
                       "CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR)," &
                       " CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR), " &
                       " tbl_invoice_main.checklist_no FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id " &
                       " where (tbl_invoice_main.invoice_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & _
                           "') and (tbl_customer.customer_name like '%" & find.Text & "%' or tbl_customer.customer_type like '%" & _
                           find.Text & "%' or tbl_invoice_main.invoice_no like '%" & find.Text & "%' or tbl_invoice_main.discount like '%" & _
                           find.Text & "%' or tbl_invoice_main.checklist_no like '%" & find.Text & "%') order by tbl_invoice_main.invoice_date"
        Call SQL_Query(q)
        'Call SQL_Query("SELECT tbl_invoice_main.id, LTRIM(tbl_customer.customer_name) AS Expr1, tbl_customer.customer_type, tbl_invoice_main.invoice_no" &
        '               ", tbl_invoice_main.invoice_date, " &
        '               "CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR)," &
        '               " CAST(CONVERT(VARCHAR, CAST(tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS MONEY), 1) AS VARCHAR), " &
        '               " tbl_invoice_main.checklist_no FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id", "" &
        '               " where (tbl_invoice_main.invoice_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & _
        '                   "') and (tbl_customer.customer_name like '%" & find.Text & "%' or tbl_customer.customer_type like '%" & _
        '                   find.Text & "%' or tbl_invoice_main.invoice_no like '%" & find.Text & "%' or tbl_invoice_main.discount like '%" & _
        '                   find.Text & "%') order by tbl_invoice_main.invoice_date tbl_invoice_main.checklist_no like '%" & find.Text & "%'")

        sales_query = "SELECT tbl_invoice_main.id, tbl_invoice_main.paid_amount, tbl_customer.title_name, LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name) AS Expr1," &
            " tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount As Expr2, tbl_customer.customer_type, tbl_invoice_main.invoice_no," &
            " tbl_invoice_main.invoice_date, tbl_invoice_main.discount, tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS Expr3," &
            " tbl_invoice_main.checklist_no FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id where " &
            "(tbl_invoice_main.invoice_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & "')" &
            " and (tbl_customer.customer_name like '%" & find.Text & "%' or tbl_customer.customer_type like '%" & find.Text & "%' or tbl_invoice_main.invoice_no" &
            " like '%" & find.Text & "%' or tbl_invoice_main.checklist_no like '%" & find.Text & "%' or tbl_invoice_main.discount like '%" & find.Text & "%') order by tbl_invoice_main.invoice_date"
        'sales_query = q
        If ds.Tables(0).Rows.Count > 0 Then
            With DataGridView1
                .DataSource = ds.Tables(0)
                .Columns(0).HeaderText = "Sales ID"
                .Columns(1).HeaderText = "Customer Name"
                .Columns(2).HeaderText = "Customer Type"
                .Columns(3).HeaderText = "Invoice NO"
                .Columns(4).HeaderText = "Invoice Date"
                .Columns(4).DisplayIndex = 1
                .Columns(5).HeaderText = "Discount"
                .Columns(6).HeaderText = "Bill Amount"
                .Columns(7).HeaderText = "Checklist NO"
                .Columns(4).DefaultCellStyle.Format = "dd-MM-yyyy"
                With DataGridView1
                    .Columns(6).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(6).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(5).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                    .Columns(5).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                End With
            End With
        Else
            DataGridView1.DataSource = Nothing
        End If
    End Sub
    Private Sub Sales_Report_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub find_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find.TextChanged
        load_grid()
    End Sub

    Private Sub DateTimePicker1_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles fromdate.ValueChanged
        Call load_grid()
    End Sub

    Private Sub DateTimePicker2_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles todate.ValueChanged
        Call load_grid()
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)


    End Sub
    Private Sub releaseObject(ByVal obj As Object)
        Try
            System.Runtime.InteropServices.Marshal.ReleaseComObject(obj)
            obj = Nothing
        Catch ex As Exception
            obj = Nothing
        Finally
            GC.Collect()
        End Try
    End Sub
  
    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If
        frmProgress.Show()
        Call __show(Preview_Sales_Report)
        Call load_nav_bar("Preview_Sales_Report", "Sales Report")
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        is_pdf = True
        Dim repo_path_id As Double = 0
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
        frmProgress.Show()
        repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call Preview_Sales_Report.Preview_Sales_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)
        folder_path = quot_path1 & "\Sales Reports\"

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Sales_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        pdf_path = quot_path1 & "\Sales Reports\" & "Sales" & Format(Date.Now, "dd.MM.yyyyHH_mm_ss") & ".pdf"

        'If find.Text = "" Then
        '    'No Filter
        '    pdf_path = quot_path1 & "\Sales Reports\" & "Sales" & Format(Date.Now, "dd.MM.yyyy") & ".pdf"
        'Else
        '    'Filter
        '    pdf_path = quot_path1 & "\Sales Reports\" & "Sales" & Format(Date.Now, "dd.MM.yyyy") & ".pdf"
        'End If
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
            Stream.Dispose()
            Stream.Close()

        End Using
        'Call create_log(DateTime.Now, "QUOTATION", "PDF", "PDF new " & user_name & " Quotation & No : " & file_name & "")
        ' MsgBox("PDF File Created Successfully." & vbCrLf & "Saved AT " & pdf_path, MsgBoxStyle.Information, "Automation Square")
        Preview_Sales_Report.ReportViewer2.RefreshReport()
        Preview_Sales_Report.Dispose()
        Preview_Sales_Report.Close()
        Process.Start(pdf_path)
        'Me.Dispose()
        'Me.Close()

        frmProgress.Dispose()
        frmProgress.Close()
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        Dim saveFileDialog1 As New SaveFileDialog()
        'saveFileDialog1.Filter = "JPeg Image|*.jpg|Bitmap Image|*.bmp|Gif Image|*.gif"
        'saveFileDialog1.Title = "Save an Image File"
        saveFileDialog1.Filter = "Excel |*.xlsx"
        saveFileDialog1.Title = "Save Excle File"
        saveFileDialog1.ShowDialog()

        Dim fnm As String

        If saveFileDialog1.FileName <> "" Then
            'Dim fs As System.IO.FileStream = CType _
            '   (saveFileDialog1.OpenFile(), System.IO.FileStream)
            fnm = saveFileDialog1.FileName
            'fs.Close()
        Else
            'MessageBox.Show("Please Enter Proper Excel File name")
            Exit Sub
        End If

        'MsgBox(fnm)
        'MsgBox("Done")
        'Exit Sub
        Dim xlWorkBook As Excel.Workbook
        Dim xlWorkSheet As Excel.Worksheet
        Dim misValue As Object = System.Reflection.Missing.Value
        Dim xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()

        Dim excel_file_name As String
        Dim today_dt As String
        today_dt = Format(Today.Date, "dd-MM-yyyy") 'Today.Date.ToString
        excel_file_name = fnm  '"d:\" & today_dt & ".xlsx"

        If xlApp Is Nothing Then
            MessageBox.Show("Excel is not properly installed!!")
            Return
        End If

        xlWorkBook = xlApp.Workbooks.Add(misValue)
        xlWorkSheet = xlWorkBook.Sheets("sheet1")
        'xlWorkSheet.Cells(1, 1) = "Sheet 1 content"

        xlWorkSheet.Cells(1, 1) = "CUSTOMER NAME"
        xlWorkSheet.Cells(1, 2) = "CUSTOMER TYPE"
        xlWorkSheet.Cells(1, 3) = "INVOICE NO"
        xlWorkSheet.Cells(1, 4) = "INVOICE DATE"
        xlWorkSheet.Cells(1, 5) = "DISCOUNT"
        xlWorkSheet.Cells(1, 6) = "SUB TOTAL"
        xlWorkSheet.Cells(1, 7) = "CHECKLIST NO"

        Dim z As Integer
        Dim j As Integer

        z = 2
        With DataGridView1
            For j = 0 To .Rows.Count - 1
                xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value
                xlWorkSheet.Cells(z, 2) = .Rows(j).Cells(2).Value
                xlWorkSheet.Cells(z, 3) = .Rows(j).Cells(3).Value
                xlWorkSheet.Cells(z, 4) = .Rows(j).Cells(4).Value
                xlWorkSheet.Cells(z, 5) = .Rows(j).Cells(5).Value
                xlWorkSheet.Cells(z, 6) = .Rows(j).Cells(6).Value
                xlWorkSheet.Cells(z, 7) = .Rows(j).Cells(7).Value
                z = z + 1
            Next
        End With
        xlWorkSheet.Columns.AutoFit()

        xlWorkBook.SaveAs(excel_file_name)
        'xlWorkBook.Save()
        'xlWorkBook.SaveAs("d:\csharp-Excel.xls", Excel.XlFileFormat.xlWorkbookNormal, misValue, misValue, misValue, misValue, _
        ' Excel.XlSaveAsAccessMode.xlExclusive, misValue, misValue, misValue, misValue, misValue)
        xlWorkBook.Close(True, misValue, misValue)
        xlApp.Quit()

        releaseObject(xlWorkSheet)
        releaseObject(xlWorkBook)
        releaseObject(xlApp)

        'Call export_data_To_FTP()
        MsgBox("File Saved at : " & fnm)
    End Sub
End Class