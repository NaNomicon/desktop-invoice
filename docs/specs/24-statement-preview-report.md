# Statement Preview Report — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Reports/Preview_Statement_Report.vb` (206 lines) |
| **Purpose** | Preview Statement of Account (RDLC) |
| **RDLC** | `STATEMENT.rdlc` |
| **Caller** | `Statement` (screen form) |

## Form Architecture

### Class Declaration
```vb
Public Class Preview_Statement_Report
```

### Parent Reference
- `Statement.report_qurty` — query from Statement screen
- `Statement.fromdate` — start date parameter
- `Statement.todate` — end date parameter
- `Statement.amt` — amount parameter

## Form Events

| Event | Behavior |
|-------|----------|
| `Load` | Calls `load_report()` |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape → close form |
| `Move` | Calls `moved(Me)` |

## Report Load Sequence

```vb
Public Sub Preview_Statement_Report_Load(...)
    Call set_fonr(Me, Label2)
    Call con_sql()
    Me.KeyPreview = True
    
    Dim a As String = REPORT_CON_STRING
    Dim con111 As String = (a)
    
    ' Dataset 1: Statement query (from Statement screen)
    Dim ds As New DataSet
    Dim bs As New BindingSource
    Using cn1 As New SqlConnection(con111)
        cn1.Open()
        Dim q1 As String = report_qurty  ' From Statement form
        Dim sa As New SqlDataAdapter(q1, con111)
        sa.Fill(ds, "DataSet1")
    End Using
    bs.DataSource = ds
    bs.DataMember = "DataSet1"
    Dim rds As ReportDataSource = New ReportDataSource
    rds.Name = "DataSet1"
    rds.Value = bs
    ReportViewer2.LocalReport.DataSources.Add(rds)
    
    ' Dataset 2: Customer info
    Dim ds1 As New DataSet
    Dim bs1 As New BindingSource
    Using cn12 As New SqlConnection(con111)
        cn12.Open()
        Dim q As String = "select * from tbl_customer where id='" & customer_id & "'"
        Dim sa1 As New SqlDataAdapter(q, con111)
        sa1.Fill(ds1, "DataSet2")
    End Using
    bs1.DataSource = ds1
    bs1.DataMember = "DataSet2"
    Dim rds1 As ReportDataSource = New ReportDataSource
    rds1.Name = "DataSet2"
    rds1.Value = bs1
    ReportViewer2.LocalReport.DataSources.Add(rds1)
    
    ' Dataset 3: Company info
    Dim ds12 As New DataSet
    Dim bs12 As New BindingSource
    Using cn122 As New SqlConnection(con111)
        cn122.Open()
        Dim q As String = "select * from tbl_company"
        Dim sa12 As New SqlDataAdapter(q, con111)
        sa12.Fill(ds12, "DataSet3")
    End Using
    bs12.DataSource = ds12
    bs12.DataMember = "DataSet3"
    Dim rds12 As ReportDataSource = New ReportDataSource
    rds12.Name = "DataSet3"
    rds12.Value = bs12
    ReportViewer2.LocalReport.DataSources.Add(rds12)
    
    ' Set RDLC path
    Me.ReportViewer2.LocalReport.ReportPath = Application.StartupPath & "\Reports\STATEMENT.rdlc"
    
    ' Calculate dynamic row heights (same as other reports)
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
    
    ' Pass parameters from Statement form
    With ReportViewer2
        Dim from1 As New ReportParameter("from_date", Statement.fromdate.Value)
        Dim to1 As New ReportParameter("to_date", Statement.todate.Value)
        Dim amt2 As New ReportParameter("amt1", Statement.amt.ToString)
        .LocalReport.SetParameters(from1)
        .LocalReport.SetParameters(to1)
        .LocalReport.SetParameters(amt2)
    End With
    
    Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout)
    Me.ReportViewer2.ShowProgress = True
    Me.ReportViewer2.RefreshReport()
End Sub
```

## Data Sources

| Dataset | Name | Source Query |
|---------|------|--------------|
| 1 | DataSet1 | `report_qurty` — Statement query (invoices UNION receipts with running balance) |
| 2 | DataSet2 | `SELECT * FROM tbl_customer WHERE id='customer_id'` |
| 3 | DataSet3 | `SELECT * FROM tbl_company` |

## Report Parameters

| Parameter | Source | Type |
|-----------|--------|------|
| `from_date` | `Statement.fromdate.Value` | DateTime |
| `to_date` | `Statement.todate.Value` | DateTime |
| `amt1` | `Statement.amt` | Decimal (opening balance) |

## Report Parameters

| Parameter | Source | Type |
|-----------|--------|------|
| `from_date` | `Statement.fromdate.Value` | DateTime |
| `to_date` | `Statement.todate.Value` | DateTime |
| `amt1` | `Statement.amt` | Decimal (opening balance) |

## Print Functionality

### Print Button (Button5)
```vb
Private Sub Button5_Click(...)
    print_microsoft_report(ReportViewer2.LocalReport, Me)
End Sub
```

### Print Method (inherited pattern)
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

Private Overloads Sub Print()
    If streams Is Nothing Or streams.Count = 0 Then Return
    Dim printDoc As New PrintDocument
    AddHandler printDoc.PrintPage, AddressOf Me.PrintPage
    'ReportViewer2.PrinterSettings.DefaultPageSettings.PaperSize = New PaperSize("Custom", 650, 325)
    printDoc.Print()
End Sub
```

**Note**: PaperSize is set to "Custom" 650x325 (landscape statement size).

## UI Components

| Control | Purpose |
|---------|---------|
| `Label2` | Title |
| `Label6` | Close button (X) |
| `Button4` | Close |
| `Button5` | Print |
| `ReportViewer2` | RDLC report display |

## Key Differences from Other Preview Reports

| Aspect | Preview_Statement_Report | Preview_Invoice_Report | Preview_Quotation_Report |
|--------|--------------------------|------------------------|-------------------------|
| RDLC | STATEMENT.rdlc | INVOICE.rdlc | QUOTATION.rdlc |
| Query Source | `report_qurty` (global) | `invoice_id` (global) | `quotation_id` (global) |
| Parameters | from_date, to_date, amt1 | None | None |
| DataSet2 | Customer info | Invoice sub items | Quotation sub items |

## Data Flow

```
Statement (screen)
├── User selects customer, date range
├── Click Preview → report_qurty set → Preview_Statement_Report.load_report()
│   └── Loads DataSet1 from report_qurty (invoices UNION receipts)
│   └── Loads DataSet2 from tbl_customer
│   └── Loads DataSet3 from tbl_company
│   └── Passes from_date, to_date, amt1 parameters
│   └── Opens STATEMENT.rdlc
└── User can Print or Export

Statement (screen)
├── User selects customer, date range
├── Click Preview → report_qurty set → Preview_Statement_Report.load_report()
│   └── Loads DataSet1 from report_qurty (invoices UNION receipts)
│   └── Loads DataSet2 from tbl_customer
│   └── Loads DataSet3 from tbl_company
│   └── Passes from_date, to_date, amt1 parameters
│   └── Opens STATEMENT.rdlc
└── User can Print or Export
```

## ReportViewer Configuration
```vb
SetDisplayMode(DisplayMode.PrintLayout)
ShowProgress = True
RefreshReport()
```

## Module Variables Used

| Variable | Source | Purpose |
|----------|--------|---------|
| `report_qurty` | Statement screen | Main statement query (UNION of invoices and receipts) |
| `customer_id` | Statement screen | Customer filter for DataSet2 |
| `tot_item_length()` | Module1 | Array of item description lengths for row calculation |
| `tot_desc_length()` | Module1 | Array of description lengths for row calculation |
| `REPORT_CON_STRING` | Module1 | Separate connection string for report data |