Imports System.IO
Imports Microsoft.Office.Interop

Public Class Statement

    Private Sub Statement_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Statement_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub
    Public Sub load_customer()
        If txt_search.TextLength > 0 Then
            DataGridView2.Visible = True
            'Call grids1(DataGridView1)
            Call SQL_Select("tbl_customer", " id,customer_name ", " customer_name like '%" & txt_search.Text & "%'", " Order By customer_name")
            If ds.Tables(0).Rows.Count > 0 Then
                With DataGridView2
                    .DataSource = ds.Tables(0)
                    .Columns(0).Visible = False
                    .Columns(1).HeaderText = "Customer Name"
                End With
            Else
                DataGridView2.DataSource = Nothing
            End If
        Else
            DataGridView2.DataSource = Nothing
        End If
    End Sub
    Private Sub Statement_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        fromdate.Value = first_date()
        customer_id = 0
        Call con_sql()
        Me.KeyPreview = True
        Call grids1(DataGridView2)
        Call grids1(DataGridView1)
        Call load_customer()
    End Sub
    Public amt As Double = 0

    Private Sub NewLoadDataGrid()
        If customer_id = 0 Then Exit Sub

        Dim A, B As String
        A = "SELECT tbl_invoice_main.id AS IID, 'INVOICE' AS aaa, tbl_invoice_main.invoice_date AS IDATE, tbl_invoice_main.invoice_no AS INO, tbl_invoice_main.checklist_no AS ICHECK, tbl_invoice_main.sub_total - tbl_invoice_main.discount AS ITOTAL, tbl_invoice_main.paid_amount AS IPAID, '-' AS ICHE,tbl_invoice_main.balance AS IBAL, tbl_invoice_main.no as extra,tbl_invoice_main.cr_dr as DDD, '' as ExtraA, tbl_invoice_main.sub_total - tbl_invoice_main.discount AS STOTAL FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id WHERE (tbl_invoice_main.customer_id='" & customer_id & "' and tbl_invoice_main.invoice_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & "')"
        B = "SELECT tbl_receipt.id AS RID, 'RECEIPT' AS RE, tbl_receipt.receipt_date AS IDATE, tbl_receipt.receipt_no AS RNO, '-' AS RCHECK, 0 AS RTOTAL, tbl_receipt.amount_received AS RPAID, tbl_receipt.cheque_no AS RCHE, tbl_receipt.due_amount AS RBAL, tbl_receipt.no as extra, tbl_receipt.cr_dr as DDD1, '' as ExtraB, 0 AS STOTAL FROM tbl_receipt INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id WHERE (tbl_receipt.customer_id='" & customer_id & "' and tbl_receipt.receipt_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & "')"
        report_qurty = A & " UNION " & B & " Order by extra"

        Dim query As String = "WITH LedgerData " & _
                                  "AS (" & _
                                  " SELECT id, " & _
                                  "        'Invoice' AS inv_rec, " & _
                                  "        invoice_date AS [date], " & _
                                  "        invoice_no AS inv_no, " & _
                                  "        checklist_no, " & _
                                  "        sub_total - discount AS bill_amount, " & _
                                  "        0.00 AS paid_amount, " & _
                                  "        '-' AS cheque_no, " & _
                                  "        sub_total - discount AS amount, " & _
                                  "        invoice_date AS sort_date, " & _
                                  "        1 AS sort_order " & _
                                  " FROM tbl_invoice_main " & _
                                  " WHERE customer_id = " & customer_id & _
                                  " AND tbl_invoice_main.invoice_date BETWEEN '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' AND '" & Format(todate.Value, "dd-MMM-yyyy") & "'" & _
                                  " UNION ALL " & _
                                  " SELECT id, " & _
                                  "        'Payment' AS inv_rec, " & _
                                  "        receipt_date AS [date], " & _
                                  "        receipt_no AS inv_no, " & _
                                  "        '' AS checklist_no, " & _
                                  "        0.00 AS bill_amount, " & _
                                  "        amount_received AS paid_amount, " & _
                                  "        cheque_no, " & _
                                  "        -amount_received AS amount, " & _
                                  "        receipt_date AS sort_date, " & _
                                  "        2 AS sort_order " & _
                                  " FROM tbl_receipt " & _
                                  " WHERE customer_id = " & customer_id & _
                                  " AND tbl_receipt.receipt_date BETWEEN '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' AND '" & Format(todate.Value, "dd-MMM-yyyy") & "'" & _
                                  ") " & _
                                  "SELECT id, inv_rec AS [INV/REC], " & _
                                  "       [date] AS [Date], " & _
                                  "       inv_no AS [INV No], " & _
                                  "       checklist_no AS [Checklist No], " & _
                                  "       NULLIF(bill_amount, 0) AS [Bill Amount], " & _
                                  "       NULLIF(paid_amount, 0) AS [Paid Amount], " & _
                                  "       cheque_no AS [Cheque No], " & _
                                  "       SUM(amount) OVER(ORDER BY sort_date, sort_order, inv_no ROWS UNBOUNDED PRECEDING) AS Balance " & _
                                  "FROM LedgerData " & _
                                  "ORDER BY sort_date, sort_order, inv_no"

        'report_qurty = query
        Call SQL_Query(query)
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)

            DataGridView1.Columns("id").Visible = False
            DataGridView1.Columns("Bill Amount").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            DataGridView1.Columns("Paid Amount").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            DataGridView1.Columns("Balance").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
        End If
    End Sub

    Public Sub load_grid()
        'NewLoadDataGrid()

        'Exit Sub


        If customer_id = 0 Then Exit Sub

        Dim A, B As String
        A = "SELECT tbl_invoice_main.id AS IID, 'INVOICE' AS aaa, tbl_invoice_main.invoice_date AS IDATE, tbl_invoice_main.invoice_no AS INO, tbl_invoice_main.checklist_no AS ICHECK, tbl_invoice_main.total AS ITOTAL, tbl_invoice_main.paid_amount AS IPAID, '-' AS ICHE,tbl_invoice_main.balance AS IBAL, tbl_invoice_main.no as extra,tbl_invoice_main.cr_dr as DDD, '' as ExtraA, tbl_invoice_main.sub_total AS STOTAL FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id WHERE (tbl_invoice_main.customer_id='" & customer_id & "' and tbl_invoice_main.invoice_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & "')"
        B = "SELECT tbl_receipt.id AS RID, 'RECEIPT' AS RE, tbl_receipt.receipt_date AS IDATE, tbl_receipt.receipt_no AS RNO, '-' AS RCHECK, 0 AS RTOTAL, tbl_receipt.amount_received AS RPAID, tbl_receipt.cheque_no AS RCHE, tbl_receipt.due_amount AS RBAL, tbl_receipt.no as extra, tbl_receipt.cr_dr as DDD1, '' as ExtraB, 0 AS STOTAL FROM tbl_receipt INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id WHERE (tbl_receipt.customer_id='" & customer_id & "' and tbl_receipt.receipt_date between '" & Format(fromdate.Value, "dd-MMM-yyyy") & "' and '" & Format(todate.Value, "dd-MMM-yyyy") & "')"

        A = $"SELECT tbl_invoice_main.id AS IID, 
                   'INVOICE' AS aaa, 
                   tbl_invoice_main.invoice_date AS IDATE, 
                   tbl_invoice_main.invoice_no AS INO, 
                   tbl_invoice_main.checklist_no AS ICHECK, 
                   tbl_invoice_main.sub_total - tbl_invoice_main.discount AS ITOTAL, 
                   tbl_invoice_main.paid_amount AS IPAID, 
                   '-' AS ICHE, 
                   tbl_invoice_main.balance AS IBAL, 
                   tbl_invoice_main.no AS extra, 
                   tbl_invoice_main.cr_dr AS DDD, 
                   '' AS ExtraA, 
                   tbl_invoice_main.sub_total - tbl_invoice_main.discount AS STOTAL
            FROM tbl_invoice_main
                 INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
            WHERE(tbl_invoice_main.customer_id = {customer_id}
                  AND tbl_invoice_main.invoice_date BETWEEN '{Format(fromdate.Value, "dd-MMM-yyyy")}' AND '{Format(todate.Value, "dd-MMM-yyyy")}')"

        B = $"SELECT tbl_receipt.id AS RID, 
                   'RECEIPT' AS RE, 
                   tbl_receipt.receipt_date AS IDATE, 
                   tbl_receipt.receipt_no AS RNO, 
                   '-' AS RCHECK, 
                   0 AS RTOTAL, 
                   tbl_receipt.amount_received AS RPAID, 
                   tbl_receipt.cheque_no AS RCHE, 
                   tbl_receipt.due_amount AS RBAL, 
                   tbl_receipt.no AS extra, 
                   tbl_receipt.cr_dr AS DDD1, 
                   '' AS ExtraB, 
                   0 AS STOTAL
            FROM tbl_receipt
                 INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id
            WHERE(tbl_receipt.customer_id = {customer_id}
                  AND tbl_receipt.receipt_date BETWEEN '{Format(fromdate.Value, "dd-MMM-yyyy")}' AND '{Format(todate.Value, "dd-MMM-yyyy")}')"

        report_qurty = A & " UNION " & B & " Order by extra"
        Call SQL_Query(A & " UNION " & B, " Order by extra")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)
            With DataGridView1
                .Columns(0).Visible = False
                .Columns(1).HeaderText = "INV/REC"
                .Columns(2).HeaderText = "Date"
                .Columns(3).HeaderText = "INV No"
                .Columns(4).HeaderText = "Checklist No"
                .Columns(5).HeaderText = "Bill Amount" '"Total"
                .Columns(6).HeaderText = "Paid Amount"
                .Columns(7).HeaderText = "Cheque No"
                .Columns(8).HeaderText = "Balance"

                .Columns(1).Name = "VType"
                .Columns(2).Name = "Date"
                .Columns(3).Name = "INVNo"
                .Columns(4).Name = "ChecklistNo"
                .Columns(5).Name = "BillAmount" '"Total"
                .Columns(6).Name = "PaidAmount"
                .Columns(7).Name = "ChequeNo"
                .Columns(8).Name = "Balance"

                .Columns(9).Visible = False
                .Columns(10).HeaderText = "-"
                .Columns(10).DisplayIndex = 8
                .Columns(10).Width = 30
                .Columns(12).Width = 100

                For i = 0 To DataGridView1.Rows.Count - 1
                    If DataGridView1.Rows(i).Cells(6).Value.ToString <> "" Then
                        DataGridView1.Rows(i).Cells(1).Value = "Payment"
                    Else
                        DataGridView1.Rows(i).Cells(1).Value = "Invoice"
                    End If
                    If DataGridView1.Rows(i).Cells(10).Value.ToString = "Cr." Then
                        DataGridView1.Rows(i).Cells(11).Value = "-" & Val(DataGridView1.Rows(i).Cells(8).Value)
                        amt = .Rows(i).Cells(11).Value
                    Else
                        DataGridView1.Rows(i).Cells(11).Value = Val(DataGridView1.Rows(i).Cells(8).Value)
                        amt = .Rows(i).Cells(11).Value
                    End If
                Next

                '.Columns(3).Visible = False
                '.Columns(8).Visible = False
                .Columns(12).Visible = False

                .Columns(10).Visible = False
                .Columns(11).HeaderText = "Balance2"
                .Columns(11).Name = "Balance2"

                .Columns(6).DefaultCellStyle.Format = "#,0.00"
                .Columns(11).DefaultCellStyle.Format = "#,0.00"
                .Columns(11).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(11).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(5).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(5).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(6).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(6).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(12).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(12).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(2).DefaultCellStyle.Format = "dd-MM-yyyy"
                .Columns(12).HeaderText = "Sub Total"
                .Columns(12).Width = 125
                .Columns(12).DisplayIndex = 5
                .Columns(12).DefaultCellStyle.Format = "#,0.00"

                .Columns(8).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(8).DefaultCellStyle.Format = "#,0.00"

                .Columns(5).DefaultCellStyle.Format = "#,0.00"
                .Columns(11).DefaultCellStyle.Format = "#,0.00"
                .Columns(12).DefaultCellStyle.Format = "N2"

                .Columns("Balance2").DefaultCellStyle.Format = "N2"
                .Columns("Balance").DefaultCellStyle.Format = "N2"

                .Columns("Balance2").Visible = False

                .Columns("Balance2").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns("Balance").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight

                '.Columns("STOTAL").DefaultCellStyle.Format = "N2"
                '.Columns("IPAID").DefaultCellStyle.Format = "N2"
                '.Columns("IBAL").DefaultCellStyle.Format = "N2"

                'With DataGridView1.Columns("STOTAL").DefaultCellStyle
                '    .Format = "N2"
                '    .Alignment = DataGridViewContentAlignment.MiddleRight ' Optional: Align numbers to the right
                'End With
            End With
        Else
            DataGridView1.DataSource = Nothing
        End If

    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Statement_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        'DataGridView1.Columns(11).DefaultCellStyle.Format = "N2"
        'DataGridView1.Columns(12).DefaultCellStyle.Format = "N2"
        'Exit Sub
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub txt_search_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyDown
        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            DataGridView2.Focus()
        End If
        If e.KeyCode = Keys.Enter Then
            With DataGridView2
                If DataGridView2.Rows.Count > 0 Then
                    customer_name.Text = .Rows(0).Cells(1).Value 'Item Name
                    customer_id = .Rows(0).Cells(0).Value 'patient id
                    Dim k As Double = get_single_value("due_amount", "tbl_customer", " id", customer_id)
                    txt_search.Visible = False
                    txt_search.Text = ""
                    DataGridView2.Visible = False
                    Call load_grid()
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

    Private Sub DataGridView2_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView2.CellContentClick

    End Sub
    Public Sub load_datatata()
        On Error Resume Next
        With DataGridView2
            customer_name.Text = .Rows(.CurrentRow.Index).Cells(1).Value 'Item Name
            customer_id = .Rows(.CurrentRow.Index).Cells(0).Value 'patient id
            Dim k As Double = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            txt_search.Visible = False
            txt_search.Text = ""
            DataGridView2.Visible = False
            Call load_grid()
        End With
    End Sub
    Private Sub DataGridView2_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView2.KeyDown
        With DataGridView2
            If e.KeyCode = Keys.Enter Then
                load_datatata()
            End If

            If e.KeyCode = 27 Then
                DataGridView2.Visible = False
                customer_name.Focus()
            End If
        End With
    End Sub

    Dim ttt As Char = ""
    Dim nnn As Boolean = False
    Private Sub customer_name_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_name.KeyDown
        txt_search.Visible = True
        ttt = Chr(e.KeyCode)
        nnn = True
        txt_search.Focus()
    End Sub

    Private Sub customer_name_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles customer_name.KeyPress
        txt_search.Visible = True
        txt_search.Focus()
    End Sub

    Private Sub customer_name_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles customer_name.TextChanged

    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If
        Call __show(Preview_Statement_Report)
        Call load_nav_bar("Preview_Statement_Report", "Statement Report")
    End Sub

    Private Sub fromdate_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles fromdate.ValueChanged
        Call load_grid()
    End Sub

    Private Sub todate_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles todate.ValueChanged
        Call load_grid()
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
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
        Call Preview_Statement_Report.Preview_Statement_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)
        folder_path = quot_path1 & "\Statement Reports\"

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)

        Dim cust_nm As String
        cust_nm = get_single_value("customer_name", "tbl_customer", "ID", Val(customer_id))

        Dim Bytes() As Byte = Preview_Statement_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\Statement Reports\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
        pdf_path = quot_path1 & "\Statement Reports\" & "SOA " & cust_nm & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        'Call create_log(DateTime.Now, "QUOTATION", "PDF", "PDF new " & user_name & " Quotation & No : " & file_name & "")
        ' MsgBox("PDF File Created Successfully." & vbCrLf & "Saved AT " & pdf_path, MsgBoxStyle.Information, "Automation Square")
        Preview_Statement_Report.ReportViewer2.RefreshReport()
        Preview_Statement_Report.Dispose()
        Preview_Statement_Report.Close()
        Process.Start(pdf_path)
    End Sub

    Private Sub DataGridView2_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView2.MouseDoubleClick
        load_datatata()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
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
        Call Preview_Statement_Report.Preview_Statement_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)
        folder_path = quot_path1 & "\Statement Reports\"

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Statement_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        pdf_path = quot_path1 & "\Statement Reports\" & Format(Date.Now, "dd-MM-yyyy") & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
        Dim temp_id As String = get_single_value("id", "tbl_email", "identify", "STATEMENT")
        direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", Val(temp_id))
        direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", Val(temp_id))
        direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
        direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
        direct_email.body.Text = get_single_value("body", "tbl_email", "id", Val(temp_id))
        direct_email.attach.Text = pdf_path
        Dim title As String = get_single_value("title_name", "tbl_customer", "id", customer_id)
        direct_email.body.Text = direct_email.body.Text.Replace("<name>", title & " " & customer_name.Text & ",")
        direct_email.body.Text = direct_email.body.Text.Replace("<date>", Format(Date.Now, "dd.MM.yyyy") & ".")
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

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        Dim saveFileDialog1 As New SaveFileDialog()
        'saveFileDialog1.Filter = "JPeg Image|*.jpg|Bitmap Image|*.bmp|Gif Image|*.gif"
        'saveFileDialog1.Title = "Save an Image File"
        saveFileDialog1.Filter = "Excel |*.xlsx"
        saveFileDialog1.Title = "Save Excle File"
        saveFileDialog1.FileName = customer_name.Text
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

        Dim xlsTable = xlWorkSheet.Range("A1:A9:B1:B9:C1:C9:D1:D9:E1:E9:F1:F9:G1:G9:H1:H9")

        ' Merge cells by range   
        xlsTable.Merge()
        xlWorkSheet.Cells(1) = "X-Press Ironing Ltd" & vbCrLf & "Bissessur Lane, Palma Road" & vbCrLf & "Quatre Bornes, Mauritius" & vbCrLf & "Tel : 59758740 / 59682450" & vbCrLf & "Email : xpressironingltd@gmail.com" & vbCrLf & "BRN : C17146035" & vbCrLf & "---------------------------------------------------------------------------------" & vbCrLf & "Statement Of Account"
        xlWorkSheet.Cells(10, 1) = "Inv/Rec"
        xlWorkSheet.Cells(10, 2) = "Date"
        xlWorkSheet.Cells(10, 3) = "Inv No."
        xlWorkSheet.Cells(10, 4) = "Checklist No"
        'xlWorkSheet.Cells(10, 4) = "Sub Total"
        xlWorkSheet.Cells(10, 5) = "Bill Amount"
        xlWorkSheet.Cells(10, 6) = "Paid Amount"
        xlWorkSheet.Cells(10, 7) = "Cheque No"
        xlWorkSheet.Cells(10, 8) = "Balance"

        Dim z As Integer
        Dim j As Integer

        z = 11
        With DataGridView1
            For j = 0 To .Rows.Count - 1
                'xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value
                'xlWorkSheet.Cells(z, 2) = .Rows(j).Cells(2).Value
                'xlWorkSheet.Cells(z, 3) = .Rows(j).Cells(4).Value
                'xlWorkSheet.Cells(z, 4) = .Rows(j).Cells(12).Value
                'xlWorkSheet.Cells(z, 5) = .Rows(j).Cells(5).Value
                'xlWorkSheet.Cells(z, 6) = .Rows(j).Cells(6).Value
                'xlWorkSheet.Cells(z, 7) = .Rows(j).Cells(7).Value
                'xlWorkSheet.Cells(z, 8) = .Rows(j).Cells(11).Value

                xlWorkSheet.Cells(z, 1) = .Rows(j).Cells("VType").Value
                xlWorkSheet.Cells(z, 2) = .Rows(j).Cells("Date").Value
                xlWorkSheet.Cells(z, 3) = .Rows(j).Cells("INVNo").Value
                xlWorkSheet.Cells(z, 4) = .Rows(j).Cells("ChecklistNo").Value
                xlWorkSheet.Cells(z, 5) = .Rows(j).Cells("BillAmount").Value
                xlWorkSheet.Cells(z, 6) = .Rows(j).Cells("PaidAmount").Value
                xlWorkSheet.Cells(z, 7) = .Rows(j).Cells("ChequeNo").Value
                xlWorkSheet.Cells(z, 8) = .Rows(j).Cells("Balance").Value
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
        'Me.Dispose()
        'Me.Close()
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
End Class