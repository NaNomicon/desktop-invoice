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

Public Class Preview_Receipt

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Preview_Receipt_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Preview_Receipt_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Public Sub Preview_Receipt_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        Dim a As String

        a = REPORT_CON_STRING
        Dim con111 As String = (a)

        'DATASET1
        Dim ds As New DataSet
        Dim bs As New BindingSource
        Using cn1 As New SqlConnection(con111)
            cn1.Open()
            Dim q1 As String
            q1 = "SELECT tbl_receipt.id, tbl_receipt.receipt_no, tbl_receipt.receipt_date, " &
                "tbl_receipt.customer_id, tbl_receipt.due_amount, tbl_receipt.amount_received, " &
                "tbl_receipt.cheque_no, tbl_receipt.no, tbl_receipt.balance, tbl_receipt.cr_dr, " &
                "tbl_receipt.invoice_no, tbl_customer.id AS Expr1, tbl_customer.customer_name, " &
                "tbl_customer.contact, tbl_customer.customer_type, tbl_customer.telephone, " &
                "tbl_customer.address, tbl_customer.email, tbl_customer.due_amount AS Expr2, " &
                "tbl_customer.title_name, tbl_customer.reg_date, tbl_customer.ad_due, " &
                "tbl_customer.brn, tbl_customer.vat, tbl_receipt.pre_load, tbl_receipt.cash, tbl_receipt.cheque, tbl_receipt.other " &
                "FROM tbl_receipt INNER JOIN tbl_customer ON tbl_receipt.customer_id = tbl_customer.id where tbl_receipt.id='" & receipt_id & "'"
            Dim sa As New SqlDataAdapter(q1, con111)
            'sa.SelectCommand.CommandTimeout = cGlobals.ReportTimeout
            sa.Fill(ds, "DataSet1")
        End Using
        bs.DataSource = ds
        bs.DataMember = "DataSet1"
        Dim rds As ReportDataSource = New ReportDataSource
        rds.Name = "DataSet1"
        rds.Value = bs
        ReportViewer2.LocalReport.DataSources.Add(rds)

        Dim ds12 As New DataSet
        Dim bs12 As New BindingSource
        Using cn122 As New SqlConnection(con111)
            cn122.Open()

            Dim q As String
            q = "select * from tbl_company"
            Dim sa12 As New SqlDataAdapter(q, con111)
            'sa.SelectCommand.Command Timeout = cGlobals.ReportTimeout
            sa12.Fill(ds12, "DataSet2")
        End Using
        bs12.DataSource = ds12
        bs12.DataMember = "DataSet2"
        Dim rds12 As ReportDataSource = New ReportDataSource
        rds12.Name = "DataSet2"
        rds12.Value = bs12
        ReportViewer2.LocalReport.DataSources.Add(rds12)

        Dim ds13 As New DataSet
        Dim bs13 As New BindingSource
        Using cn122 As New SqlConnection(con111)
            cn122.Open()

            Dim q As String
            q = "SELECT cash, cheque, other FROM tbl_setting"
            Dim sa13 As New SqlDataAdapter(q, con111)
            'sa.SelectCommand.Command Timeout = cGlobals.ReportTimeout
            sa13.Fill(ds13, "DataSet3")
        End Using
        bs13.DataSource = ds13
        bs13.DataMember = "DataSet3"
        Dim rds13 As ReportDataSource = New ReportDataSource
        rds13.Name = "DataSet3"
        rds13.Value = bs13
        ReportViewer2.LocalReport.DataSources.Add(rds13)


        Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\PAYMENT.rdlc" ' Application.StartupPath & "\Reports\Preview_Medicine.rdlc" ' Application.StartupPath & "\reports\WO_Report.rdlc"
        'Me.ReportViewer2.LocalReport.ReportPath = "D:\2020\OCT\XPress\XPress\XPress\Reports\PAYMENT.rdlc"
        'Dim txt_name As New ReportParameter("date", Format(view_appointment.dtp_date.Value, "dd-MM-yyyy" & " " & "hh:mm:ss tt"))
        'Dim party As New ReportParameter("party", cmb_party)
        Dim che1 As String = get_single_value("cheque", "tbl_receipt", "id", receipt_id)
        If che1 = "0" Then
            With ReportViewer2
                Dim cheque As New ReportParameter("cheque", "")
                .LocalReport.SetParameters(cheque)
            End With
        ElseIf che1 = "1" Then
            With ReportViewer2
                Dim cheque As New ReportParameter("cheque", get_single_value("cheque_no", "tbl_receipt", "id", receipt_id))
                .LocalReport.SetParameters(cheque)
            End With
        End If
        
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

       
        'PrintDialog1.Document = RichTextBoxSelectionAttribute.
        'PrintDialog1.PrinterSettings = PrintDocument1.PrinterSettings
        'PrintDialog1.AllowSomePages = True
        'If PrintDialog1.ShowDialog = DialogResult.OK Then
        '    PrintDocument1.PrinterSettings = PrintDialog1.PrinterSettings
        '    PrintDocument1.Print()
        'End If
        Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout) 'Set Layout
        Me.ReportViewer2.ShowProgress = True
        'If is_pdf = True Then
        Me.ReportViewer2.RefreshReport()
        Me.ReportViewer2.RefreshReport()
        ' ElseIf is_pdf = False Then

        ' End If
        is_pdf = False
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