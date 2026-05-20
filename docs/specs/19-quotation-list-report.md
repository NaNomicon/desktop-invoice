# Quotation List Report — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Reports/Preview_Quotation_list_Report.vb` (207 lines) |
| **Purpose** | Preview/Print quotation list report (multiple quotations) |
| **RDLC** | `QUOTATION_LIST.rdlc` |
| **Caller** | `Quotation_Report` |

## Form Architecture

### Class Declaration
```vb
Public Class preview_quotation_list_report
```

### Parent Reference
- `Quotation_Report.fromdate` — start date parameter
- `Quotation_Report.todate` — end date parameter
- `quotation_query` — from Module1 (query for quotations within date range)

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Calls `load_report()` |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close form |
| `Move` | Calls `moved(Me)` |

## Report Load Sequence

```vb
Public Sub load_report()
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    
    ' Report connection string
    Dim a As String = REPORT_CON_STRING
    Dim con111 As String = (a)
    
    ' Dataset 1: Quotation main + customer join
    Dim ds As New DataSet
    Dim bs As New BindingSource
    Using cn1 As New SqlConnection(con111)
        cn1.Open()
        Dim q1 As String = quotation_query  ' From Module1
        Dim sa As New SqlDataAdapter(q1, con111)
        sa.Fill(ds, "DataSet1")
    End Using
    bs.DataSource = ds
    bs.DataMember = "DataSet1"
    Dim rds As ReportDataSource = New ReportDataSource
    rds.Name = "DataSet1"
    rds.Value = bs
    ReportViewer2.LocalReport.DataSources.Add(rds)
    
    ' Dataset 2: Company info (for header)
    Dim ds12 As New DataSet
    Dim bs12 As New BindingSource
    Using cn122 As New SqlConnection(con111)
        cn122.Open()
        Dim q As String = "select * from tbl_company"
        Dim sa12 As New SqlDataAdapter(q, con111)
        sa12.Fill(ds12, "DataSet2")
    End Using
    bs12.DataSource = ds12
    bs12.DataMember = "DataSet2"
    Dim rds12 As ReportDataSource = New ReportDataSource
    rds12.Name = "DataSet2"
    rds12.Value = bs12
    ReportViewer2.LocalReport.DataSources.Add(rds12)
    
    ' Set RDLC path
    Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\QUOTATION_LIST.rdlc"
    
    ' Calculate dynamic row heights for multi-page items
    Dim no_of_rows_item, no_of_rows_desc As Integer
    
    For i = 0 To tot_item_length.Length - 1
        If tot_item_length(i) > 0 Then
            Dim z As Double
            z = tot_item_length(i) / 38
            no_of_rows_item = Val(no_of_rows_item) + Val(Math.Ceiling(z))
        End If
    Next
    
    For i = 0 To tot_desc_length.Length - 1
        If tot_desc_length(i) > 0 Then
            Dim z As Double
            z = tot_desc_length(i) / 38
            no_of_rows_desc = Val(no_of_rows_desc) + Val(Math.Ceiling(z))
        End If
    Next
    
    ' Pass date range parameters
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
        .LocalReport.SetParameters(from1)
        .LocalReport.SetParameters(to1)
    End With
    
    Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout)
    Me.ReportViewer2.ShowProgress = True
    Me.ReportViewer2.RefreshReport()
End Sub
```

## Data Sources

| Dataset | Name | Source Query |
|---------|------|--------------|
| 1 | DataSet1 | `quotation_query` — tbl_quotation_main + tbl_customer join |
| 2 | DataSet2 | `SELECT * FROM tbl_company` — header info |

## Report Parameters

| Parameter | Source | Type |
|-----------|--------|------|
| `from_date` | `Quotation_Report.fromdate.Value` | DateTime |
| `to_date` | `Quotation_Report.todate.Value` | DateTime |

## Dynamic Row Height Calculation

```vb
' For each item/description with variable length
z = tot_item_length(i) / 38
no_of_rows = Math.Ceiling(z)  ' Characters per line = 38
```

Calculates how many rows each line item needs based on character count ÷ 38.

## Print Functionality

### Print Button (Button5)
```vb
Private Sub Button5_Click(...)
    print_microsoft_report(ReportViewer2.LocalReport, Me)
End Sub
```

### Print Method (inherited/standard pattern)
```vb
Protected Overloads Sub Print(ByVal sender As Object, ByVal e As EventArgs)
    Export(ReportViewer2.LocalReport)
    pageIndex = 0
    Print()
End Sub

Private Sub Export(ByVal report As LocalReport)
    Dim warnings() As Warning
    streams = New List(Of Stream)
    report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
End Sub
```

## UI Components

| Control | Purpose |
|---------|---------|
| `Label2` | Title |
| `Label6` | Close button (X) |
| `Button4` | Close |
| `Button5` | Print |
| `ReportViewer2` | RDLC report display |

## Key Differences from Single Quotation Report

| Aspect | `Preview_Quotation_Report.vb` | `Preview_Quotation_list_Report.vb` |
|--------|------------------------------|-----------------------------------|
| Scope | Single quotation (by ID) | Multiple quotations (by date range) |
| Query | `SELECT ... WHERE id='"` | `quotation_query` (date filtered) |
| RDLC | `QUOTATION.rdlc` | `QUOTATION_LIST.rdlc` |
| Parameters | `quotation_id` | `from_date`, `to_date` |

## ReportViewer Configuration
```vb
SetDisplayMode(DisplayMode.PrintLayout)
ShowProgress = True
RefreshReport()
```