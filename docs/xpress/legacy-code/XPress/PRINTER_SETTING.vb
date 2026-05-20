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

Module PRINTER_SETTING
    Private m_currentPageIndex As Integer
    Private m_streams As IList(Of Stream)
    Private printdoc As PrintDocument
    Public Sub print_microsoft_report(ByRef report As LocalReport, ByVal page_width As Integer, ByVal page_height As Integer, _
                                  Optional ByVal islandscap As Boolean = False, _
                                  Optional ByVal printer_name As String = Nothing)
        printdoc = New PrintDocument()
        If printer_name <> Nothing Then printdoc.PrinterSettings.PrinterName = printer_name
        If Not printdoc.PrinterSettings.IsValid Then ' detecate is the printer is exist
            Throw New Exception("Cannot find the specified printer")
        Else
            Dim ps As New PaperSize("Custom", page_width, page_height)
            printdoc.DefaultPageSettings.PaperSize = ps
            printdoc.DefaultPageSettings.Landscape = islandscap
            Export(report)
            Print()
        End If
    End Sub
    ''' <summary>
    ''' Print rdlc report with specific paper kind
    ''' </summary>
    ''' <param name="report"></param>
    ''' <param name="paperkind">String paper Kind, ex:"letter"</param>
    ''' <param name="islandscap"></param>
    ''' <param name="printer_name">Ignore this parameter to use default printer</param>
    ''' <remarks></remarks>
    Public Sub print_microsoft_report(ByVal report As LocalReport, ByRef frm As Form, Optional ByVal paperkind As String = "A4", _
                                      Optional ByVal islandscap As Boolean = False, _
                                      Optional ByVal printer_name As String = Nothing)

        printdoc = New PrintDocument()
        If printer_name <> Nothing Then printdoc.PrinterSettings.PrinterName = printer_name
        If Not printdoc.PrinterSettings.IsValid Then ' detecate is the printer is exist
            Throw New Exception("Cannot find the specified printer")
        Else
            Dim ps As PaperSize
            Dim pagekind_found As Boolean = False
            For i = 0 To printdoc.PrinterSettings.PaperSizes.Count - 1
                If printdoc.PrinterSettings.PaperSizes.Item(i).Kind.ToString = paperkind Then
                    ps = printdoc.PrinterSettings.PaperSizes.Item(i)
                    printdoc.DefaultPageSettings.PaperSize = ps
                    pagekind_found = True
                End If
            Next
            If Not pagekind_found Then Throw New Exception("paper size is invalid")
            printdoc.DefaultPageSettings.Landscape = islandscap
            Export(report)
            Print()
            frm.Dispose()
            frm.Close()
        End If

    End Sub

    ' Routine to provide to the report renderer, in order to
    ' save an image for each page of the report.
    Private Function CreateStream(ByVal name As String, ByVal fileNameExtension As String, ByVal encoding As Encoding, ByVal mimeType As String, ByVal willSeek As Boolean) As Stream
        Dim stream As Stream = New MemoryStream()
        m_streams.Add(stream)
        Return stream
    End Function
    ' Export the given report as an EMF (Enhanced Metafile) file.
    Private Sub Export(ByVal report As LocalReport)
        Dim w As Integer
        Dim h As Integer
        If printdoc.DefaultPageSettings.Landscape = True Then
            w = printdoc.DefaultPageSettings.PaperSize.Height
            h = printdoc.DefaultPageSettings.PaperSize.Width
        Else
            w = printdoc.DefaultPageSettings.PaperSize.Width
            h = printdoc.DefaultPageSettings.PaperSize.Height
        End If
        Dim deviceInfo As String = "<DeviceInfo>" & _
            "<OutputFormat>EMF</OutputFormat>" & _
            "<PageWidth>" & w / 100 & "in</PageWidth>" & _
            "<PageHeight>" & h / 100 & "in</PageHeight>" & _
            "<MarginTop>0.0in</MarginTop>" & _
            "<MarginLeft>0.0in</MarginLeft>" & _
            "<MarginRight>0.0in</MarginRight>" & _
            "<MarginBottom>0.0in</MarginBottom>" & _
            "</DeviceInfo>"
        Dim warnings As Warning()
        m_streams = New List(Of Stream)()
        report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
        For Each stream As Stream In m_streams
            stream.Position = 0
        Next
    End Sub

    ' Handler for PrintPageEvents
    Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
        Dim pageImage As New Metafile(m_streams(m_currentPageIndex))

        ' Adjust rectangular area with printer margins.
        Dim adjustedRect As New Rectangle(ev.PageBounds.Left - CInt(ev.PageSettings.HardMarginX),
                                          ev.PageBounds.Top - CInt(ev.PageSettings.HardMarginY), _
                                          ev.PageBounds.Width, _
                                          ev.PageBounds.Height)

        ' Draw a white background for the report
        ev.Graphics.FillRectangle(Brushes.White, adjustedRect)

        ' Draw the report content
        ev.Graphics.DrawImage(pageImage, adjustedRect)

        ' Prepare for the next page. Make sure we haven't hit the end.
        m_currentPageIndex += 1
        ev.HasMorePages = (m_currentPageIndex < m_streams.Count)
    End Sub
    Private Sub Print()
        If m_streams Is Nothing OrElse m_streams.Count = 0 Then
            Throw New Exception("Error: no stream to print.")
        End If
        AddHandler printdoc.PrintPage, AddressOf PrintPage
        m_currentPageIndex = 0
        printdoc.Print()
    End Sub
End Module
