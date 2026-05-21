Imports System.Data.SqlClient
Imports Microsoft.Reporting.WinForms
Imports System.IO
Imports System.Drawing.Printing
Imports System.Drawing.Imaging

Public Class Preview_Quotation_Report

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Preview_Quotation_Report_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Preview_Quotation_Report_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Public Sub Preview_Quotation_Report_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
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
        q1 = "SELECT tbl_quotation_main.*, tbl_customer.*,tbl_customer.brn, tbl_customer.vat AS Expr1 FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id where tbl_quotation_main.id='" & quotation_id & "'"
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
        q = "SELECT tbl_quotation_sub.qty, tbl_product.product_name, tbl_product_type.type_name, tbl_quotation_sub.unit_price, tbl_quotation_sub.row_total, tbl_quotation_sub.s_no as tot_rows FROM tbl_quotation_sub INNER JOIN tbl_product ON tbl_quotation_sub.product_id = tbl_product.id INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id where tbl_quotation_sub.main_id='" & quotation_id & "'"
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

        Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\QUOTATION.rdlc" ' Application.StartupPath & "\Reports\INVOICE.rdlc" ' Application.StartupPath & "\Reports\Preview_Medicine.rdlc" ' Application.StartupPath & "\reports\WO_Report.rdlc"
        'Me.ReportViewer2.LocalReport.ReportPath = "D:\2020\XPress\May\XPress\XPress\Reports\QUOTATION.rdlc"
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
        '  pass_para_for_rows = ds1.Tables(0).Rows.Count
        'With ReportViewer2
        '    '.LocalReport.ReportPath = "MyReport.rdlc"
        '    Dim lpar As New ReportParameter("tot_rows", pass_para_for_rows)
        '    'Dim lpar1(0) As ReportParameter
        '    'lpar1(0) = lpar
        '    .LocalReport.SetParameters(lpar)
        '    '.LocalReport.Refresh()
        'End With

        Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout) 'Set Layout
        Me.ReportViewer2.ShowProgress = True

        If is_pdf = True Then
            Me.ReportViewer2.RefreshReport()
            Me.ReportViewer2.RefreshReport()
        ElseIf is_pdf = False Then
            ' Print(sender, e)
        End If
        is_pdf = False
    End Sub
      Dim pageIndex As Integer = 0
    Dim streams As IList(Of Stream)

    Protected Overloads Sub Print(ByVal sender As Object, ByVal e As EventArgs)
        'Me.ReportViewer1.Clear()
        Export(ReportViewer2.LocalReport)
        pageIndex = 0
        Print()
    End Sub

    Private Sub Export(ByVal report As LocalReport)

        Dim warnings() As Warning
        streams = New List(Of Stream)
        report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
        For Each stream As Stream In streams
            stream.Position = 0
        Next
    End Sub

    Private Function CreateStream(ByVal name As String, ByVal fileNameExtension As String, ByVal encoding As System.Text.Encoding, ByVal mimeType As String, ByVal willSeek As Boolean) As Stream
        'Dim stream As Stream = New FileStream((Server.MapPath("~/Files/") _
        '                + (name + ("." + fileNameExtension))), FileMode.Create)
        'streams.Add(stream)
        'Return stream
        Dim stream As Stream = New MemoryStream()
        streams.Add(stream)
        Return stream
    End Function

    Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
        Dim pageImage As Metafile = New Metafile(streams(pageIndex))
        ev.Graphics.DrawImage(pageImage, ev.PageBounds)
        pageIndex = (pageIndex + 1)
        ev.HasMorePages = (pageIndex < streams.Count)
        Me.Dispose()
        Me.Close()

    End Sub

    Private Overloads Sub Print()
        If ((streams Is Nothing) _
                    OrElse (streams.Count = 0)) Then
            Return
        End If

        Dim printDoc As PrintDocument = New PrintDocument
        AddHandler printDoc.PrintPage, AddressOf Me.PrintPage
        printDoc.Print()
    End Sub



    Private Sub Preview_Quotation_Report_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        print_microsoft_report(ReportViewer2.LocalReport, Me)
    End Sub
End Class