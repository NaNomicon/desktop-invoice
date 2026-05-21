Imports System
Imports System.IO
Imports System.Data
Imports System.Text
Imports System.Drawing
Imports System.Drawing.Imaging
Imports System.Drawing.Printing
Imports System.Collections.Generic
Imports System.Windows.Forms
Imports Microsoft.Reporting.WinForms
Imports System.Data.SqlClient

Public Class Preview_Invoice_Report
    Private Sub WriteDebugLog(ByVal message As String)
        Try
            Dim logPath As String = Application.StartupPath & "\debug.log"
            Using sw As New IO.StreamWriter(logPath, True)
                sw.WriteLine("[" & Now.ToString("yyyy-MM-dd HH:mm:ss") & "] Preview_Invoice_Report | " & message)
            End Using
        Catch ex As Exception
        End Try
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Preview_Invoice_Report_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Preview_Invoice_Report_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Public Sub Preview_Invoice_Report_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Call set_fonr(Me, Label2)
            Call con_sql()
            Me.KeyPreview = True
            Dim a As String

            a = REPORT_CON_STRING
        Dim con111 As String = (a)

        'DATASET1
        Dim ds As New DataSet
        Dim bs As New BindingSource
        Dim q1 As String
        q1 = "SELECT tbl_customer.customer_name, tbl_customer.title_name,  tbl_invoice_main.invoice_date, " &
            "tbl_invoice_main.cr_dr,tbl_invoice_main.paid_amount, tbl_customer.contact, tbl_customer.customer_type, " &
            "tbl_customer.telephone, tbl_customer.address, tbl_customer.email, tbl_invoice_main.invoice_no, " &
            "tbl_invoice_main.checklist_no, tbl_invoice_main.sub_total, tbl_invoice_main.amount_due, " &
            "tbl_invoice_main.vat, tbl_invoice_main.discount, tbl_invoice_main.total, tbl_invoice_main.per, " &
            "tbl_customer.brn, tbl_customer.vat AS Expr1, tbl_invoice_main.identify " &
            "As E1 FROM tbl_invoice_main INNER JOIN tbl_customer ON " &
            "tbl_invoice_main.customer_id = tbl_customer.id where tbl_invoice_main.id='" & invoice_id & "'"
        Dim sa As New SqlDataAdapter(q1, Module1.con)
        sa.Fill(ds, "DataSet1")
        bs.DataSource = ds
        bs.DataMember = "DataSet1"
        Dim rds As ReportDataSource = New ReportDataSource
        rds.Name = "DataSet1"
        rds.Value = bs
        ReportViewer2.LocalReport.DataSources.Add(rds)


        Dim ds1 As New DataSet
        Dim bs1 As New BindingSource
        Dim q As String
        q = "SELECT tbl_invoice_sub.qty, tbl_product.product_id, tbl_product.product_name, tbl_product_type.type_name, tbl_invoice_sub.unit_price, tbl_invoice_sub.row_total,  tbl_invoice_sub.s_no as tot_rows FROM tbl_product_type INNER JOIN tbl_product ON tbl_product_type.id = tbl_product.type_id INNER JOIN tbl_invoice_sub ON tbl_product.id = tbl_invoice_sub.product_id where tbl_invoice_sub.main_id='" & invoice_id & "'"
        Dim sa1 As New SqlDataAdapter(q, Module1.con)
        sa1.Fill(ds1, "DataSet2")
        bs1.DataSource = ds1
        bs1.DataMember = "DataSet2"
        Dim rds1 As ReportDataSource = New ReportDataSource
        rds1.Name = "DataSet2"
        rds1.Value = bs1
        ReportViewer2.LocalReport.DataSources.Add(rds1)

        Dim ds12 As New DataSet
        Dim bs12 As New BindingSource
        q = "select * from tbl_company"
        Dim sa12 As New SqlDataAdapter(q, Module1.con)
        sa12.Fill(ds12, "DataSet3")
        bs12.DataSource = ds12
        bs12.DataMember = "DataSet3"
        Dim rds12 As ReportDataSource = New ReportDataSource
        rds12.Name = "DataSet3"
        rds12.Value = bs12
        ReportViewer2.LocalReport.DataSources.Add(rds12)

        'Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\INVOICE.rdlc"

        If print_due_amt_on_invoice = True Then
            'Me.ReportViewer2.LocalReport.ReportPath = "D:\Drive E\2022\Xpress\XPress\XPress\Reports\INVOICE.rdlc"
            Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\INVOICE.rdlc"
        Else
            'Me.ReportViewer2.LocalReport.ReportPath = "D:\Drive E\2022\Xpress\XPress\XPress\Reports\INVOICE_noadv.rdlc"
            Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\INVOICE_noadv.rdlc"
        End If

        'Me.ReportViewer2.LocalReport.ReportPath = "D:\Drive E\2022\Xpress\XPress\XPress\Reports\INVOICE.rdlc"

        'Me.ReportViewer2.LocalReport.ReportPath = "F:\XPress\XPress\Reports\INVOICE.rdlc"
        'Dim txt_name As New ReportParameter("date", Format(view_appointment.dtp_date.Value, "dd-MM-yyyy" & " " & "hh:mm:ss tt"))
        'Dim party As New ReportParameter("party", cmb_party)

        '        ReportViewer2.LocalReport.SetParameters(txt_name)
        'ReportViewer2.LocalReport.SetParameters(party)
        Dim no_of_rows_item, no_of_rows_desc As Integer

        For i = 0 To tot_item_length.Length - 1
            'MsgBox(tot_recs_length(i))
            If tot_item_length(i) > 0 Then
                Dim z As Double
                z = tot_item_length(i) / 38
                no_of_rows_item = Val(no_of_rows_item) + Val(Math.Ceiling(z))
                'MsgBox(z & vbCrLf & Math.Ceiling(z))
            End If
        Next

        For i = 0 To tot_desc_length.Length - 1
            If tot_desc_length(i) > 0 Then
                Dim z As Double
                z = tot_desc_length(i) / 38
                no_of_rows_desc = Val(no_of_rows_desc) + Val(Math.Ceiling(z))
            End If
        Next

        'MsgBox(no_of_rows_item & vbCrLf & no_of_rows_desc)

        Dim pass_para_for_rows As Integer
        If no_of_rows_item = no_of_rows_desc Then
            pass_para_for_rows = no_of_rows_item
        ElseIf no_of_rows_item > no_of_rows_desc Then
            pass_para_for_rows = no_of_rows_item
        ElseIf no_of_rows_desc > no_of_rows_item Then
            pass_para_for_rows = no_of_rows_desc
        End If

        With ReportViewer2
            Dim ft As New ReportParameter("final_amt", new_AMOUNT)
            .LocalReport.SetParameters(ft)
            If print_due_amt_on_invoice = True Then
                Dim due1 As New ReportParameter("due_amt", "1")
                .LocalReport.SetParameters(due1)
            ElseIf print_due_amt_on_invoice = False Then
                Dim due1 As New ReportParameter("due_amt", "0")
                .LocalReport.SetParameters(due1)
            End If
          
        End With
        WriteDebugLog("Load start | invoice_id=" & invoice_id & " | report_path=" & ReportViewer2.LocalReport.ReportPath & " | ds1_rows=" & ds.Tables(0).Rows.Count & " | ds2_rows=" & ds1.Tables(0).Rows.Count & " | ds3_rows=" & ds12.Tables(0).Rows.Count)
        'PrintDialog1.Document = RichTextBoxSelectionAttribute.
        'PrintDialog1.PrinterSettings = PrintDocument1.PrinterSettings
        'PrintDialog1.AllowSomePages = True
        'If PrintDialog1.ShowDialog = DialogResult.OK Then
        '    PrintDocument1.PrinterSettings = PrintDialog1.PrinterSettings
        '    PrintDocument1.Print()
        'End If
        Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout) 'Set Layout
        Me.ReportViewer2.ShowProgress = True
        WriteDebugLog("Before RefreshReport | report_path=" & ReportViewer2.LocalReport.ReportPath & " | invoice_id=" & invoice_id)
        'If is_pdf = True Then
        Me.ReportViewer2.RefreshReport()
        WriteDebugLog("After RefreshReport | report_path=" & ReportViewer2.LocalReport.ReportPath & " | invoice_id=" & invoice_id)
        'Me.ReportViewer2.RefreshReport()
        ' ElseIf is_pdf = False Then

        ' End If
        is_pdf = False
        Catch ex As Exception
            Dim innerMessage As String = ""
            If Not ex.InnerException Is Nothing Then
                innerMessage = ex.InnerException.Message
            End If
            WriteDebugLog("ERROR | " & ex.Message & " | INNER=" & innerMessage & " | report_path=" & ReportViewer2.LocalReport.ReportPath & " | invoice_id=" & invoice_id)
            Throw
        End Try
    End Sub
    Dim pageIndex As Integer = 0
    Dim streams As IList(Of Stream)

    'Protected Overloads Sub Print(ByVal sender As Object, ByVal e As EventArgs)
    '    'Me.ReportViewer1.Clear()
    '    Export(ReportViewer2.LocalReport)
    '    pageIndex = 0
    '    Print()
    'End Sub

    'Private Sub Export(ByVal report As LocalReport)

    '    Dim warnings() As Warning
    '    streams = New List(Of Stream)
    '    report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
    '    For Each stream As Stream In streams
    '        stream.Position = 0
    '    Next
    'End Sub

    'Private Function CreateStream(ByVal name As String, ByVal fileNameExtension As String, ByVal encoding As System.Text.Encoding, ByVal mimeType As String, ByVal willSeek As Boolean) As Stream
    '    'Dim stream As Stream = New FileStream((Server.MapPath("~/Files/") _
    '    '                + (name + ("." + fileNameExtension))), FileMode.Create)
    '    'streams.Add(stream)
    '    'Return stream
    '    Dim stream As Stream = New MemoryStream()
    '    streams.Add(stream)
    '    Return stream
    'End Function

    'Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
    '    Dim pageImage As Metafile = New Metafile(streams(pageIndex))
    '    ev.Graphics.DrawImage(pageImage, ev.PageBounds)
    '    pageIndex = (pageIndex + 1)
    '    ev.HasMorePages = (pageIndex < streams.Count)
    '    Me.Dispose()
    '    Me.Close()

    'End Sub

    'Private Overloads Sub Print()
    '    If ((streams Is Nothing) _
    '                OrElse (streams.Count = 0)) Then
    '        Return
    '    End If

    '    Dim printDoc As PrintDocument = New PrintDocument
    '    AddHandler printDoc.PrintPage, AddressOf Me.PrintPage
    '    printDoc.Print()
    'End Sub


    Private Sub Preview_Invoice_Report_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub PrintDocument1_PrintPage(ByVal sender As System.Object, ByVal e As System.Drawing.Printing.PrintPageEventArgs) Handles PrintDocument1.PrintPage

    End Sub


    Private m_currentPageIndex As Integer
    Private m_streams As IList(Of Stream)

    'Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
    '    'ReportViewer2.PrintDialog()
    '    Thread.Sleep(100)
    '    'ReportViewer2.printto()

    '    'If m_streams Is Nothing OrElse m_streams.Count = 0 Then Throw New Exception("Error: no stream to print.")
    '    'Dim printDoc As PrintDocument = New PrintDocument()

    '    'If Not printDoc.PrinterSettings.IsValid Then
    '    '    Throw New Exception("Error: cannot find the default printer.")
    '    'Else
    '    '    printDoc.PrintPage(sender, e)
    '    '    m_currentPageIndex = 0
    '    '    printDoc.Print()
    '    'End If
    '    'If ((streams Is Nothing) _
    '    '          OrElse (streams.Count = 0)) Then
    '    '    Return
    '    'End If

    '    'Dim printDoc As PrintDocument = New PrintDocument
    '    'AddHandler printDoc.PrintPage, AddressOf Me.PrintPage
    '    'printDoc.Print()

    '    'Exit Sub

    '    'SendKeys.SendWait("+{TAB}")
    '    'SendKeys.SendWait("+{TAB}")
    '    'SendKeys.SendWait("+{TAB}")
    '    'SendKeys.SendWait("+{TAB}")
    '    'SendKeys.SendWait("+{TAB}")
    '    'SendKeys.SendWait("+{TAB}")
    '    'SendKeys.Send(Keys.Enter)
    '    'Exit Sub
    '    Print(sender, e)
    'End Sub

    'Private Sub Print1()

    'End Sub
    'Private Sub Print()
    '    If m_streams Is Nothing OrElse m_streams.Count = 0 Then Throw New Exception("Error: no stream to print.")
    '    Dim printDoc As PrintDocument = New PrintDocument()

    '    If Not printDoc.PrinterSettings.IsValid Then
    '        Throw New Exception("Error: cannot find the default printer.")
    '    Else
    '        printDoc.PrintPage += New PrintPageEventHandler(PrintPage)
    '        m_currentPageIndex = 0
    '        printDoc.Print()
    '    End If
    'End Sub

    'Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
    '    Dim pageImage As Metafile = New Metafile(m_streams(m_currentPageIndex))
    '    Dim adjustedRect As Rectangle = New Rectangle(ev.PageBounds.Left - CInt(ev.PageSettings.HardMarginX), ev.PageBounds.Top - CInt(ev.PageSettings.HardMarginY), ev.PageBounds.Width, ev.PageBounds.Height)
    '    ev.Graphics.FillRectangle(Brushes.White, adjustedRect)
    '    ev.Graphics.DrawImage(pageImage, adjustedRect)
    '    m_currentPageIndex += 1
    '    ev.HasMorePages = (m_currentPageIndex < m_streams.Count)
    'End Sub

    'Private Function CreateStream(ByVal name As String, ByVal fileNameExtension As String, ByVal encoding As System.Text.Encoding, ByVal mimeType As String, ByVal willSeek As Boolean) As Stream
    '    Dim stream As Stream = New MemoryStream()
    '    m_streams.Add(stream)
    '    Return stream
    'End Function

    'Public Sub print_microsoft_report(ByRef report As LocalReport, ByVal page_width As Integer, ByVal page_height As Integer, _
    '                              Optional ByVal islandscap As Boolean = False, _
    '                              Optional ByVal printer_name As String = Nothing)
    '    printdoc = New PrintDocument()
    '    If printer_name <> Nothing Then printdoc.PrinterSettings.PrinterName = printer_name
    '    If Not printdoc.PrinterSettings.IsValid Then ' detecate is the printer is exist
    '        Throw New Exception("Cannot find the specified printer")
    '    Else
    '        Dim ps As New PaperSize("Custom", page_width, page_height)
    '        printdoc.DefaultPageSettings.PaperSize = ps
    '        printdoc.DefaultPageSettings.Landscape = islandscap
    '        Export(report)
    '        Print()
    '    End If
    'End Sub
    'Private printdoc As PrintDocument
    'Private Sub Export(ByVal report As LocalReport)
    '    Dim w As Integer
    '    Dim h As Integer
    '    If printdoc.DefaultPageSettings.Landscape = True Then
    '        w = printdoc.DefaultPageSettings.PaperSize.Height
    '        h = printdoc.DefaultPageSettings.PaperSize.Width
    '    Else
    '        w = printdoc.DefaultPageSettings.PaperSize.Width
    '        h = printdoc.DefaultPageSettings.PaperSize.Height
    '    End If
    '    Dim warnings() As Warning
    '    streams = New List(Of Stream)
    '    report.Render("Image", , AddressOf CreateStream, warnings)
    '    For Each stream As Stream In streams
    '        stream.Position = 0
    '    Next
    'End Sub

    'Private Function CreateStream(ByVal name As String, ByVal fileNameExtension As String, ByVal encoding As System.Text.Encoding, ByVal mimeType As String, ByVal willSeek As Boolean) As Stream
    '    'Dim stream As Stream = New FileStream((Server.MapPath("~/Files/") _
    '    '                + (name + ("." + fileNameExtension))), FileMode.Create)
    '    'streams.Add(stream)
    '    'Return stream
    '    Dim stream As Stream = New MemoryStream()
    '    streams.Add(stream)
    '    Return stream
    'End Function

    'Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
    '    Dim pageImage As Metafile = New Metafile(streams(pageIndex))
    '    ev.Graphics.DrawImage(pageImage, ev.PageBounds)
    '    pageIndex = (pageIndex + 1)
    '    ev.HasMorePages = (pageIndex < streams.Count)
    '    Me.Dispose()
    '    Me.Close()

    'End Sub

    'Private Overloads Sub Print()
    '    If ((streams Is Nothing) _
    '                OrElse (streams.Count = 0)) Then
    '        Return
    '    End If

    '    Dim printDoc As PrintDocument = New PrintDocument
    '    AddHandler printDoc.PrintPage, AddressOf Me.PrintPage
    '    printDoc.Print()
    'End Sub

    'Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
    '    Print(sender, e)
    'End Sub
    'Private m_currentPageIndex As Integer
    'Private m_streams As IList(Of Stream)
   

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        print_microsoft_report(ReportViewer2.LocalReport, Me)
    End Sub
End Class