Imports System.Data.SqlClient
Imports Microsoft.Reporting.WinForms
Imports System.Drawing.Imaging
Imports System.Drawing.Printing
Imports System.IO

Public Class preview_quotation_list_report

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub preview_quotation_list_report_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Public Sub preview_quotation_list_report_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub preview_quotation_list_report_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        load_report()
    End Sub
    Public Sub load_report()
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
        q1 = quotation_query
        Dim sa As New SqlDataAdapter(q1, Module1.con)
        sa.Fill(ds, "DataSet1")
        bs.DataSource = ds
        bs.DataMember = "DataSet1"
        Dim rds As ReportDataSource = New ReportDataSource
        rds.Name = "DataSet1"
        rds.Value = bs
        ReportViewer2.LocalReport.DataSources.Add(rds)


        Dim ds12 As New DataSet
        Dim bs12 As New BindingSource
        Dim q As String
        q = "select * from tbl_company"
        Dim sa12 As New SqlDataAdapter(q, Module1.con)
        sa12.Fill(ds12, "DataSet2")
        bs12.DataSource = ds12
        bs12.DataMember = "DataSet2"
        Dim rds12 As ReportDataSource = New ReportDataSource
        rds12.Name = "DataSet2"
        rds12.Value = bs12
        ReportViewer2.LocalReport.DataSources.Add(rds12)

        Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\QUOTATION_LIST.rdlc" ' Application.StartupPath & "\Reports\INVOICE.rdlc" ' Application.StartupPath & "\Reports\Preview_Medicine.rdlc" ' Application.StartupPath & "\reports\WO_Report.rdlc"
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
            Dim from1 As New ReportParameter("from_date", Quotation_Report.fromdate.Value)
            Dim to1 As New ReportParameter("to_date", Quotation_Report.todate.Value)
            'Dim amt2 As New ReportParameter("amt1", Statement.amt.ToString)
            .LocalReport.SetParameters(from1)
            'MsgBox(Statement.amt)
            .LocalReport.SetParameters(to1)
            '.LocalReport.SetParameters(amt2)
        End With

        Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout) 'Set Layout
        Me.ReportViewer2.ShowProgress = True

        Me.ReportViewer2.RefreshReport()

        'Me.ReportViewer2.RefreshReport()
    End Sub

    Private Sub preview_quotation_list_report_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
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
    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        print_microsoft_report(ReportViewer2.LocalReport, Me)
    End Sub
End Class