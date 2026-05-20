Imports System.ComponentModel
Imports Microsoft.Office.Interop.Excel
Imports Microsoft.Office.Interop

Module Export
    Public tables As DataTableCollection
    Public source1 As New BindingSource
    Public APP As New Excel.Application
    Public worksheet As Excel.Worksheet
    Public workbook As Excel.Workbook

    Public xlWorkBook As Excel.Workbook
    Public xlWorkSheet As Excel.Worksheet
    Public misValue As Object = System.Reflection.Missing.Value
    Public xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()
End Module
