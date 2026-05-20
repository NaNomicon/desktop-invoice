Imports System.IO
Imports Microsoft.Office.Interop

Public Class ListOutStanding
    Private Sub ListOutStanding_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        Call grids1(DataGridView1)
        Call load_grid()
    End Sub
    Public Sub load_grid()
        Call con_sql()

        ''CAST(CONVERT(VARCHAR, CAST(due_amount AS MONEY), 1) AS VARCHAR)

        ''Call SQL_Query("SELECT tbl_quotation_main.id, tbl_customer.customer_name, tbl_customer.customer_type, tbl_customer.telephone, tbl_quotation_main.quo_no, tbl_quotation_main.quo_date, tbl_quotation_main.vat, tbl_quotation_main.discount, tbl_quotation_main.total FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id", " where (tbl_quotation_main.quo_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & "') and (tbl_customer.customer_name like '%" & find.Text & "%' or tbl_customer.customer_type like '%" & find.Text & "%' or tbl_customer.telephone like '%" & find.Text & "%' or tbl_quotation_main.quo_no like '%" & find.Text & "%')")
        Dim ds As DataSet = SQL_Select("tbl_customer", "id,customer_name,due_amount,ad_due As Status", " due_amount > 0 AND customer_name like '%" & find.Text & "%'", " Order by customer_name")
        outstanding_query = "select id,LTRIM(title_name + ' ' + customer_name) As Expr1,due_amount, ad_due,customer_type from tbl_customer where due_amount > 0 AND customer_name like '%" & find.Text & "%' Order by customer_name"
        'Dim query As String
        'query = $"SELECT 
        '                        c.id,
        '                        c.customer_name,
        '                        (
        '                            SELECT SUM(i.total)
        '                            FROM tbl_invoice_main i
        '                            WHERE i.customer_id = c.id
        '                            GROUP BY i.customer_id
        '                        ) AS TotalDueAmount,
        '                        c.ad_due AS Status
        '                    FROM 
        '                        tbl_customer c
        '                    WHERE  
        '                        c.due_amount > 0 
        '                        AND c.customer_name LIKE '%{find.Text}%'
        '                    ORDER BY 
        '                        c.customer_name"
        'query = $"SELECT 
        '            t.id,
        '            t.customer_name,
        '            t.TotalDueAmount,
        '            t.TotalReceiptAmount,
        '            t.FinalDueAmount,
        '            t.Status
        '        FROM (
        '            SELECT
        '                c.id,
        '                c.customer_name,
        '                (
        '                    SELECT SUM(i.total)
        '                    FROM tbl_invoice_main i
        '                    WHERE i.customer_id = c.id
        '                ) AS TotalDueAmount,
        '                (
        '                    SELECT SUM(r.amount_received)
        '                    FROM tbl_receipt r
        '                    WHERE r.customer_id = c.id
        '                ) AS TotalReceiptAmount,
        '                (
        '                    (
        '                        SELECT SUM(i.total)
        '                        FROM tbl_invoice_main i
        '                        WHERE i.customer_id = c.id
        '                    ) - 
        '                    COALESCE((
        '                        SELECT SUM(r.amount_received)
        '                        FROM tbl_receipt r
        '                        WHERE r.customer_id = c.id
        '                    ), 0)
        '                ) AS FinalDueAmount,
        '                CASE
        '                    WHEN (
        '                        (
        '                            SELECT SUM(i.total)
        '                            FROM tbl_invoice_main i
        '                            WHERE i.customer_id = c.id
        '                        ) - 
        '                        COALESCE((
        '                            SELECT SUM(r.amount_received)
        '                            FROM tbl_receipt r
        '                            WHERE r.customer_id = c.id
        '                        ), 0)
        '                    ) > 0 THEN 'Due'
        '                    ELSE 'Advance'
        '                END AS Status
        '            FROM 
        '                tbl_customer c
        '            WHERE  
        '                c.customer_name LIKE '%{find.Text}%'
        '        ) t
        '        WHERE 
        '            t.FinalDueAmount > 0 OR t.FinalDueAmount < 0
        '        ORDER BY 
        '            t.customer_name"
        'Dim ds As DataSet = SQL_Query(query)
        'outstanding_query = query

        If ds.Tables(0).Rows.Count > 0 Then
            With DataGridView1
                .DataSource = ds.Tables(0)
                .Columns(0).Visible = False
                '.Columns(1).HeaderText = "Customer Name"
                '.Columns(2).HeaderText = "Amount"

                '.Columns(2).Visible = False
                '.Columns(3).Visible = False

                '.Columns("FinalDueAmount").HeaderText = "Amount"

                tot = 0
                For i = 0 To ds.Tables(0).Rows.Count - 1
                    Dim temp As Double = ds.Tables(0).Rows(i).ItemArray(2).ToString.Replace(",", "")
                    If ds.Tables(0).Rows(i).ItemArray(3).ToString = "Advance" Then
                        .Rows(i).Cells(2).Value = "-" & Format(temp, "0.00")
                        tot = tot - temp
                    Else
                        '.Rows(i).Cells(2).Value = FormatNumber(tot + temp, 2).ToString
                        tot = tot + temp
                    End If
                Next
                '.Columns(2).SortMode = DataGridViewColumnSortMode.Automatic
                .Columns(1).Width = 300
                .Columns(2).Width = 150
                .Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                DataGridView1.Columns(2).DefaultCellStyle.Format = "N2"
            End With
        Else
            DataGridView1.DataSource = Nothing
        End If

    End Sub

    Private Sub ListOutStanding_Move(sender As Object, e As EventArgs) Handles Me.Move
        moved(Me)
    End Sub

    Private Sub DataGridView1_DataBindingComplete(sender As Object, e As DataGridViewBindingCompleteEventArgs) Handles DataGridView1.DataBindingComplete
        On Error Resume Next
        With DataGridView1
            For i = 0 To ds.Tables(0).Rows.Count - 1
                'Dim temp As Double = Val(.Rows(i).Cells(2).Value)
                If .Rows(i).Cells("Status").Value = "Advance" Then
                    .Rows(i).Cells("Status").Style.ForeColor = Color.Green
                    '.Rows(i).Cells(2).Value = ""
                ElseIf .Rows(i).Cells("Status").Value = "Due" Then
                    .Rows(i).Cells("Status").Style.ForeColor = Color.Red
                End If
            Next
        End With
    End Sub

    Private Sub BtnNewReceipt_Click(sender As Object, e As EventArgs) Handles BtnNewReceipt.Click
        receipt_id = 0
        Receipt_voucher_ID = 0
        Add_Edit_Receipt.ShowDialog()
        Add_Edit_Receipt.BringToFront()
    End Sub

    Private Sub BtnReceiptVoucher_Click(sender As Object, e As EventArgs) Handles BtnReceiptVoucher.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If
        receipt_id = 0
        Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
        load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)
        'Call __show(Add_Edit_Receipt)
        'If Add_Edit_Receipt.Visible = True Then
        '    Add_Edit_Receipt.Hide()
        'End If

        Add_Edit_Receipt.ShowDialog()
        Add_Edit_Receipt.BringToFront()
    End Sub

    Private Sub BtnPrint_Click(sender As Object, e As EventArgs) Handles BtnPrint.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If
        Call __show(Preview_Outstanding_Report)
        load_nav_bar("Preview_Outstanding_Report", "Outstanding Report")
    End Sub

    Private Sub BtnViewPDF_Click(sender As Object, e As EventArgs) Handles BtnViewPDF.Click
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
        repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call Preview_Outstanding_Report.Preview_Outstanding_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)
        folder_path = quot_path1 & "\Outstanding Reports\"

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Outstanding_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        pdf_path = quot_path1 & "\Outstanding Reports\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using

        'Call create_log(DateTime.Now, "QUOTATION", "PDF", "PDF new " & user_name & " Quotation & No : " & file_name & "")
        ' MsgBox("PDF File Created Successfully." & vbCrLf & "Saved AT " & pdf_path, MsgBoxStyle.Information, "Automation Square")
        Preview_Outstanding_Report.ReportViewer2.RefreshReport()
        Preview_Outstanding_Report.Dispose()
        Preview_Outstanding_Report.Close()
        Process.Start(pdf_path)
    End Sub

    Private Sub BtnCancel_Click(sender As Object, e As EventArgs) Handles BtnCancel.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Label6_Click(sender As Object, e As EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub find_TextChanged(sender As Object, e As EventArgs) Handles find.TextChanged
        Call load_grid()
    End Sub

    Private Sub BtnExport_Click(sender As Object, e As EventArgs) Handles BtnExport.Click
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
        xlWorkSheet.Cells(1, 2) = "AMOUNT"
        xlWorkSheet.Cells(1, 3) = "STATUS"

        Dim z As Integer
        Dim j As Integer

        z = 2
        With DataGridView1
            For j = 0 To .Rows.Count - 1
                xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value
                xlWorkSheet.Cells(z, 2) = .Rows(j).Cells(2).Value
                xlWorkSheet.Cells(z, 3) = .Rows(j).Cells(3).Value
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

    Private Sub DataGridView1_MouseDoubleClick(sender As Object, e As MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If
        receipt_id = 0
        Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
        load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)
        'Call __show(Add_Edit_Receipt)
        'If Add_Edit_Receipt.Visible = True Then
        '    Add_Edit_Receipt.Hide()
        'End If

        Add_Edit_Receipt.ShowDialog()
        Add_Edit_Receipt.BringToFront()
    End Sub

    Private Sub ListOutStanding_KeyDown(sender As Object, e As KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(sender As Object, e As DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub
End Class