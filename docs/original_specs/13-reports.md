# Reports & Printing Module — Implementation Details

## Purpose
Document the RDLC report system, PDF generation, and printing implementation for replication.

---

## Report Architecture

### Report Types
| Report | RDLC File | Purpose |
|--------|-----------|---------|
| Invoice | INVOICE.rdlc | Invoice printout with due amount |
| Invoice (no advance) | INVOICE_noadv.rdlc | Invoice without due amount |
| Quotation | QUOTATION.rdlc | Quotation printout |
| Receipt | PAYMENT.rdlc | Payment receipt |
| Outstanding | OUTSTANDING.rdlc | Customer outstanding report |
| Sales | SALES.rdlc | Sales summary report |
| Statement | STATEMENT.rdlc | Customer statement |

### Preview Forms
```
Preview_Invoice_Report.vb → Preview_Invoice_Report.Designer.vb
Preview_Quotation_Report.vb → Preview_Quotation_Report.Designer.vb
Preview_Receipt.vb → Preview_Receipt.Designer.vb
Preview_Sales_Report.vb → Preview_Sales_Report.Designer.vb
Preview_Outstanding_Report.vb → Preview_Outstanding_Report.Designer.vb
```

---

## Invoice Report — `Preview_Invoice_Report`

### Load Sequence
```vb
Public Sub Preview_Invoice_Report_Load(...)
    ' Establish connection using REPORT_CON_STRING
    Dim a As String = REPORT_CON_STRING
    Dim con111 As String = a

    ' Dataset 1: Invoice main + Customer
    Using cn1 As New SqlConnection(con111)
        cn1.Open()
        Dim q1 As String = 
            "SELECT tbl_customer.customer_name, tbl_customer.title_name, " &
            "tbl_invoice_main.invoice_date, tbl_invoice_main.cr_dr, " &
            "tbl_invoice_main.paid_amount, tbl_customer.contact, " &
            "tbl_customer.customer_type, tbl_customer.telephone, " &
            "tbl_customer.address, tbl_customer.email, tbl_invoice_main.invoice_no, " &
            "tbl_invoice_main.checklist_no, tbl_invoice_main.sub_total, " &
            "tbl_invoice_main.amount_due, tbl_invoice_main.vat, " &
            "tbl_invoice_main.discount, tbl_invoice_main.total, tbl_invoice_main.per, " &
            "tbl_customer.brn, tbl_customer.vat AS Expr1, tbl_invoice_main.identify As E1 " &
            "FROM tbl_invoice_main " &
            "INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id " &
            "WHERE tbl_invoice_main.id='" & invoice_id & "'"
        Dim sa As New SqlDataAdapter(q1, con111)
        sa.Fill(ds, "DataSet1")
    End Using

    ' Dataset 2: Invoice line items + Products
    Using cn12 As New SqlConnection(con111)
        cn12.Open()
        Dim q As String = 
            "SELECT tbl_invoice_sub.qty, tbl_product.product_id, " &
            "tbl_product.product_name, tbl_product_type.type_name, " &
            "tbl_invoice_sub.unit_price, tbl_invoice_sub.row_total, " &
            "tbl_invoice_sub.s_no AS tot_rows " &
            "FROM tbl_product_type " &
            "INNER JOIN tbl_product ON tbl_product_type.id = tbl_product.type_id " &
            "INNER JOIN tbl_invoice_sub ON tbl_product.id = tbl_invoice_sub.product_id " &
            "WHERE tbl_invoice_sub.main_id='" & invoice_id & "'"
        Dim sa1 As New SqlDataAdapter(q, con111)
        sa1.Fill(ds1, "DataSet2")
    End Using

    ' Dataset 3: Company info (logo, footer)
    Using cn122 As New SqlConnection(con111)
        cn122.Open()
        Dim q As String = "SELECT * FROM tbl_company"
        Dim sa12 As New SqlDataAdapter(q, con111)
        sa12.Fill(ds12, "DataSet3")
    End Using

    ' Choose RDLC based on print_due flag
    If print_due_amt_on_invoice = True Then
        Me.ReportViewer2.LocalReport.ReportPath = 
            Application.StartupPath & "\Reports\INVOICE.rdlc"
    Else
        Me.ReportViewer2.LocalReport.ReportPath = 
            Application.StartupPath & "\Reports\INVOICE_noadv.rdlc"
    End If

    ' Pass parameters
    Dim ft As New ReportParameter("final_amt", new_AMOUNT)
    .LocalReport.SetParameters(ft)
    
    If print_due_amt_on_invoice = True Then
        Dim due1 As New ReportParameter("due_amt", "1")
        .LocalReport.SetParameters(due1)
    ElseIf print_due_amt_on_invoice = False Then
        Dim due1 As New ReportParameter("due_amt", "0")
        .LocalReport.SetParameters(due1)
    End If

    Me.ReportViewer2.SetDisplayMode(DisplayMode.PrintLayout)
    Me.ReportViewer2.ShowProgress = True
    Me.ReportViewer2.RefreshReport()
End Sub
```

---

## Report Parameters

### Standard Parameters
| Parameter | Type | Purpose |
|-----------|------|---------|
| `final_amt` | String | Total invoice amount (new_AMOUNT) |
| `due_amt` | String | "1" = print due, "0" = don't print |
| `date` | String | Formatted date for reports |
| `party` | String | Customer name |

### Parameter Usage in RDLC
```vb
' Pass total amount
Dim ft As New ReportParameter("final_amt", new_AMOUNT)
.LocalReport.SetParameters(ft)

' Show/hide due amount section
Dim due1 As New ReportParameter("due_amt", "1")  ' or "0"
.LocalReport.SetParameters(due1)
```

---

## PDF Generation

### Render to PDF
```vb
Dim Bytes() As Byte = ReportViewer2.LocalReport.Render(
    "PDF",           ' Format
    "",              ' DeviceInfo
    Nothing,         ' History
    Nothing,         ' CreateStream callback
    Nothing,         ' StreamNames
    Nothing,         ' Warnings
    Nothing          ' Progress
)
```

### Save PDF to File
```vb
Dim pdf_path As String = folder_path & "\" & file_name & ".pdf"
Using Stream As New FileStream(pdf_path, FileMode.Create)
    Stream.Write(Bytes, 0, Bytes.Length)
End Using
```

### Folder Structure
```
{invoice_path}/
  May-2026/
    INV001-Mr John Smith.pdf
    INV002-Ms Jane Doe.pdf
```

---

## RDLC Report Files Inventory

### Primary Reports
| RDLC File | Purpose | Notes |
|-----------|---------|-------|
| `INVOICE.rdlc` | Invoice printout | With due amount (due_amt="1") |
| `INVOICE_noadv.rdlc` | Invoice printout | Without advance/due amount (due_amt="0") |
| `QUOTATION.rdlc` | Quotation printout | Main quotation layout |
| `PAYMENT.rdlc` | Payment receipt | Cash/cheque/other payments |
| `OUTSTANDING.rdlc` | Customer outstanding | Shows all customers with due amounts |
| `SALES.rdlc` | Sales summary | Date-range filtered sales report |
| `STATEMENT.rdlc` | Customer statement | Per-customer account statement |

### Report Variants
| RDLC File | Purpose |
|-----------|---------|
| `INVOICE1.rdlc` | Invoice variant 1 |
| `INVOICE2.rdlc` | Invoice variant 2 |
| `INVOICE3.rdlc` | Invoice variant 3 |
| `QUOTATION1.rdlc` | Quotation variant 1 |
| `QUOTATION2.rdlc` | Quotation variant 2 |
| `QUOTATION_LIST.rdlc` | Quotation list view |
| `PAYMENT1.rdlc` | Payment variant |

### Backup/Archive
| RDLC File | Purpose |
|-----------|---------|
| `INVOICE - Copy.rdlc` | Backup copy |
| `INVOICE_noadv - Backup.rdlc` | Backup copy |

### INVOICE vs INVOICE_noadv
```vb
' print_due flag controls which RDLC loads
If print_due_amt_on_invoice = True Then
    ReportViewer.LocalReport.ReportPath = "\Reports\INVOICE.rdlc"
Else
    ReportViewer.LocalReport.ReportPath = "\Reports\INVOICE_noadv.rdlc"
End If

' Also controls due_amt parameter
If print_due_amt_on_invoice = True Then
    Dim due1 As New ReportParameter("due_amt", "1")
Else
    Dim due1 As New ReportParameter("due_amt", "0")
End If
```

---

## Report Dataset Structure

### Dataset1: Main Record (Customer + Invoice Header)
```sql
SELECT 
    tbl_customer.customer_name,
    tbl_customer.title_name,
    tbl_invoice_main.invoice_date,
    tbl_invoice_main.cr_dr,
    tbl_invoice_main.paid_amount,
    tbl_customer.contact,
    tbl_customer.customer_type,
    tbl_customer.telephone,
    tbl_customer.address,
    tbl_customer.email,
    tbl_invoice_main.invoice_no,
    tbl_invoice_main.checklist_no,
    tbl_invoice_main.sub_total,
    tbl_invoice_main.amount_due,
    tbl_invoice_main.vat,
    tbl_invoice_main.discount,
    tbl_invoice_main.total,
    tbl_invoice_main.per,
    tbl_customer.brn,
    tbl_customer.vat AS Expr1,
    tbl_invoice_main.identify
FROM tbl_invoice_main
INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
WHERE tbl_invoice_main.id = @invoice_id
```
**Usage**: Customer info block, invoice header, totals

### Dataset2: Line Items (Products)
```sql
SELECT 
    tbl_invoice_sub.qty,
    tbl_product.product_id,
    tbl_product.product_name,
    tbl_product_type.type_name,
    tbl_invoice_sub.unit_price,
    tbl_invoice_sub.row_total,
    tbl_invoice_sub.s_no AS tot_rows
FROM tbl_product_type
INNER JOIN tbl_product ON tbl_product_type.id = tbl_product.type_id
INNER JOIN tbl_invoice_sub ON tbl_product.id = tbl_invoice_sub.product_id
WHERE tbl_invoice_sub.main_id = @invoice_id
```
**Usage**: Line items table, product details

### Dataset3: Company Info (Logo, Footer)
```sql
SELECT * FROM tbl_company
```
**Usage**: Company logo, address, phone, email, footer text

### Passing Datasets to LocalReport
```vb
Dim ds As New DataSet()
Dim ds1 As New DataSet()
Dim ds12 As New DataSet()

' Fill datasets...
sa.Fill(ds, "DataSet1")
sa1.Fill(ds1, "DataSet2")
sa12.Fill(ds12, "DataSet3")

' Add to report data sources via BindingSource (not direct DataTable)
Dim bs As New BindingSource
bs.DataSource = ds
bs.DataMember = "DataSet1"
Dim rds As New ReportDataSource
rds.Name = "DataSet1"
rds.Value = bs
ReportViewer2.LocalReport.DataSources.Add(rds)
' Repeat for DataSet2 and DataSet3 with separate BindingSources
```

---

## Report Parameters

### Standard Parameters
| Parameter | Type | Purpose |
|-----------|------|---------|
| `final_amt` | String | Total invoice amount (new_AMOUNT) |
| `due_amt` | String | "1" = print due section, "0" = hide due section |
| `date` | String | Formatted date for reports |
| `party` | String | Customer name |

### final_amt Parameter
Controls the printed total amount on invoice:
```vb
Dim ft As New ReportParameter("final_amt", new_AMOUNT)
.LocalReport.SetParameters(ft)
```
Used in RDLC textbox to display the grand total.

### due_amt Parameter
Controls conditional visibility of due amount section:
```vb
' Show due amount
Dim due1 As New ReportParameter("due_amt", "1")
.LocalReport.SetParameters(due1)

' Hide due amount
Dim due1 As New ReportParameter("due_amt", "0")
.LocalReport.SetParameters(due1)
```
In RDLC, use expression: `=IIF(Parameters!due_amt.Value(0) = "1", True, False)`

---

## Print Pipeline — `PRINTER_SETTING` Module

### Module Overview
`PRINTER_SETTING.vb` provides two print function overloads:
1. **Custom dimensions**: Specify exact page width/height in 1/100 inches
2. **PaperKind**: Use named paper sizes (A4, Letter, etc.)

### Overload 1: Custom Dimensions
```vb
Public Sub print_microsoft_report(
    ByRef report As LocalReport,
    ByVal page_width As Integer,
    ByVal page_height As Integer,
    Optional ByVal islandscap As Boolean = False,
    Optional ByVal printer_name As String = Nothing
)
```
**Parameters**:
- `page_width`: Paper width in 1/100 inches (e.g., 8260 = A4 width ~82.6mm)
- `page_height`: Paper height in 1/100 inches (e.g., 11690 = A4 height ~116.9mm)
- `islandscap`: True = landscape orientation
- `printer_name`: Specific printer or Nothing for default

**A4 Dimensions**: Width=8260, Height=11690 (units: 1/100 inch)

### Overload 2: PaperKind
```vb
Public Sub print_microsoft_report(
    ByVal report As LocalReport,
    ByRef frm As Form,
    Optional ByVal paperkind As String = "A4",
    Optional ByVal islandscap As Boolean = False,
    Optional ByVal printer_name As String = Nothing
)
```
**Parameters**:
- `paperkind`: Named paper size ("A4", "Letter", "Legal", etc.)
- `frm`: Form to dispose after printing
- Other params same as Overload 1

**PaperKind Lookup**:
```vb
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
```

### Printer Selection
```vb
printdoc = New PrintDocument()
If printer_name <> Nothing Then 
    printdoc.PrinterSettings.PrinterName = printer_name
End If
If Not printdoc.PrinterSettings.IsValid Then
    Throw New Exception("Cannot find the specified printer")
End If
```

### EMF Rendering — `Export` Function
```vb
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
    
    Dim deviceInfo As String = "<DeviceInfo>" &
        "<OutputFormat>EMF</OutputFormat>" &
        "<PageWidth>" & w / 100 & "in</PageWidth>" &
        "<PageHeight>" & h / 100 & "in</PageHeight>" &
        "<MarginTop>0.0in</MarginTop>" &
        "<MarginLeft>0.0in</MarginLeft>" &
        "<MarginRight>0.0in</MarginRight>" &
        "<MarginBottom>0.0in</MarginBottom>" &
        "</DeviceInfo>"
    
    Dim warnings As Warning()
    m_streams = New List(Of Stream)()
    report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
    
    For Each stream As Stream In m_streams
        stream.Position = 0
    Next
End Sub
```

**DeviceInfo Structure**:
```xml
<DeviceInfo>
  <OutputFormat>EMF</OutputFormat>
  <PageWidth>8.26in</PageWidth>    <!-- w / 100 -->
  <PageHeight>11.69in</PageHeight> <!-- h / 100 -->
  <MarginTop>0.0in</MarginTop>
  <MarginLeft>0.0in</MarginLeft>
  <MarginRight>0.0in</MarginRight>
  <MarginBottom>0.0in</MarginBottom>
</DeviceInfo>
```

**Multi-page Handling**:
```vb
Private Function CreateStream(ByVal name As String, 
                              ByVal fileNameExtension As String,
                              ByVal encoding As System.Text.Encoding,
                              ByVal mimeType As String,
                              ByVal willSeek As Boolean) As Stream
    Dim stream As Stream = New MemoryStream()
    m_streams.Add(stream)
    Return stream
End Function
```
Each page creates a new MemoryStream, collected in `m_streams` List.

### PrintPage Event Handler
```vb
Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
    Dim pageImage As New Metafile(m_streams(m_currentPageIndex))

    ' Adjust for printer hard margins
    Dim adjustedRect As New Rectangle(
        ev.PageBounds.Left - CInt(ev.PageSettings.HardMarginX),
        ev.PageBounds.Top - CInt(ev.PageSettings.HardMarginY),
        ev.PageBounds.Width,
        ev.PageBounds.Height
    )

    ' White background fill
    ev.Graphics.FillRectangle(Brushes.White, adjustedRect)

    ' Draw metafile to page
    ev.Graphics.DrawImage(pageImage, adjustedRect)

    ' Advance to next page
    m_currentPageIndex += 1
    ev.HasMorePages = (m_currentPageIndex < m_streams.Count)
End Sub
```

**Margin Adjustment**:
- `HardMarginX/Y`: Printer's physical margin (accounts for unprintable area)
- Rectangle offset compensates for printer-specific margins
- White FillRectangle ensures clean output on all printers

### Print Subroutine
```vb
Private Sub Print()
    If m_streams Is Nothing OrElse m_streams.Count = 0 Then
        Throw New Exception("Error: no stream to print.")
    End If
    AddHandler printdoc.PrintPage, AddressOf PrintPage
    m_currentPageIndex = 0
    printdoc.Print()
End Sub
```

### Usage Examples
```vb
' Print with A4 paper, default printer
print_microsoft_report(LocalReport, Me, "A4")

' Print A4 landscape to specific printer
print_microsoft_report(LocalReport, Me, "A4", True, "HP LaserJet")

' Print with custom dimensions (twice A4 width)
print_microsoft_report(LocalReport, 16520, 11690)  ' A4 landscape x2
```

---

## PDF Generation

### Render to PDF
```vb
Dim Bytes() As Byte = ReportViewer2.LocalReport.Render(
    "PDF",           ' Format
    "",              ' DeviceInfo
    Nothing,         ' History
    Nothing,         ' CreateStream callback
    Nothing,         ' StreamNames
    Nothing,         ' Warnings
    Nothing          ' Progress
)
```

### Save PDF to File
```vb
Dim pdf_path As String = folder_path & "\" & file_name & ".pdf"
Using Stream As New FileStream(pdf_path, FileMode.Create)
    Stream.Write(Bytes, 0, Bytes.Length)
End Using
```

### Folder Structure
```
{invoice_path}/
  May-2026/
    INV001-Mr John Smith.pdf
    INV002-Ms Jane Doe.pdf
```

---

## Print Function (Legacy)

### `print_microsoft_report` Function
```vb
Public Sub print_microsoft_report(ByRef report As LocalReport, 
                                  ByVal page_width As Integer, 
                                  ByVal page_height As Integer,
                                  Optional ByVal islandscap As Boolean = False,
                                  Optional ByVal printer_name As String = Nothing)
    printdoc = New PrintDocument()
    
    If printer_name <> Nothing Then 
        printdoc.PrinterSettings.PrinterName = printer_name
    End If
    
    If Not printdoc.PrinterSettings.IsValid Then
        Throw New Exception("Cannot find the specified printer")
    Else
        Dim ps As New PaperSize("Custom", page_width, page_height)
        printdoc.DefaultPageSettings.PaperSize = ps
        printdoc.DefaultPageSettings.Landscape = islandscap
        Export(report)
        Print()
    End If
End Sub

Private printdoc As PrintDocument

Private Sub Export(ByVal report As LocalReport)
    Dim w, h As Integer
    If printdoc.DefaultPageSettings.Landscape = True Then
        w = printdoc.DefaultPageSettings.PaperSize.Height
        h = printdoc.DefaultPageSettings.PaperSize.Width
    Else
        w = printdoc.DefaultPageSettings.PaperSize.Width
        h = printdoc.DefaultPageSettings.PaperSize.Height
    End If
    Dim warnings() As Warning
    streams = New List(Of Stream)
    report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
    For Each stream As Stream In streams
        stream.Position = 0
    Next
End Sub

Private Function CreateStream(ByVal name As String, 
                              ByVal fileNameExtension As String,
                              ByVal encoding As System.Text.Encoding,
                              ByVal mimeType As String,
                              ByVal willSeek As Boolean) As Stream
    Dim stream As Stream = New MemoryStream()
    m_streams.Add(stream)
    Return stream
End Function

Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
    Dim pageImage As Metafile = New Metafile(m_streams(m_currentPageIndex))
    ev.Graphics.DrawImage(pageImage, ev.PageBounds)
    m_currentPageIndex += 1
    ev.HasMorePages = (m_currentPageIndex < m_streams.Count)
End Sub

Private Overloads Sub Print()
    If m_streams Is Nothing OrElse m_streams.Count = 0 Then 
        Return
    End If
    Dim printDoc As PrintDocument = New PrintDocument()
    printDoc.PrintPage += New PrintPageEventHandler(PrintPage)
    printDoc.Print()
End Sub
```

### Button Handler
```vb
Private Sub Button5_Click(...)
    print_microsoft_report(ReportViewer2.LocalReport, Me)
End Sub
```

---

## DeviceInfo for EMF Rendering

```vb
Public deviceInfo As String = 
    "<DeviceInfo>" &
    "  <OutputFormat>EMF</OutputFormat>" &
    "  <PageWidth></PageWidth>" &
    "  <PageHeight></PageHeight>" &
    "  <MarginTop></MarginTop>" &
    "  <MarginLeft></MarginLeft>" &
    "  <MarginRight></MarginRight>" &
    "  <MarginBottom></MarginBottom>" &
    "</DeviceInfo>"
```

Empty values = default margins (system paper size).

---

## Receipt Report — `Preview_Receipt`

### Datasets
```sql
-- Dataset 1: Receipt + Customer (28 explicit columns)
SELECT 
    tbl_receipt.id, tbl_receipt.receipt_no, tbl_receipt.receipt_date,
    tbl_receipt.customer_id, tbl_receipt.due_amount, tbl_receipt.amount_received,
    tbl_receipt.cheque_no, tbl_receipt.no, tbl_receipt.balance, tbl_receipt.cr_dr,
    tbl_receipt.invoice_no, tbl_customer.id AS Expr1, tbl_customer.customer_name,
    tbl_customer.contact, tbl_customer.customer_type, tbl_customer.telephone,
    tbl_customer.address, tbl_customer.email, tbl_customer.due_amount AS Expr2,
    tbl_customer.title_name, tbl_customer.reg_date, tbl_customer.ad_due,
    tbl_customer.brn, tbl_customer.vat, tbl_receipt.pre_load, tbl_receipt.cash,
    tbl_receipt.cheque, tbl_receipt.other
FROM tbl_receipt
INNER JOIN tbl_customer ON tbl_receipt.customer_id = tbl_customer.id
WHERE tbl_receipt.id='{receipt_id}'

-- Dataset 2: Company (logo, footer)
SELECT * FROM tbl_company

-- Dataset 3: Payment mode labels
SELECT cash, cheque, other FROM tbl_setting
```

### Parameters
In addition to `final_amt`, the receipt report conditionally passes a `cheque` parameter:
```vb
Dim che1 As String = get_single_value("cheque", "tbl_receipt", "id", receipt_id)
If che1 = "0" Then
    Dim cheque As New ReportParameter("cheque", "")
    .LocalReport.SetParameters(cheque)
ElseIf che1 = "1" Then
    Dim cheque As New ReportParameter("cheque", get_single_value("cheque_no", "tbl_receipt", "id", receipt_id))
    .LocalReport.SetParameters(cheque)
End If
```

### Path
```
{report_path}/
  Receipt/
    May-2026/
      Mr John Smith/
        PAY001-Mr John Smith.pdf
```

---

## Sales Report — `Preview_Sales_Report`

### Query
```sql
SELECT 
    tbl_invoice_main.id,
    tbl_invoice_main.paid_amount,
    tbl_customer.title_name,
    LTRIM(tbl_customer.title_name + ' ' + tbl_customer.customer_name) AS Expr1,
    tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS Expr2,
    tbl_customer.customer_type,
    tbl_invoice_main.invoice_no,
    tbl_invoice_main.invoice_date,
    tbl_invoice_main.discount,
    tbl_invoice_main.sub_total + tbl_invoice_main.vat - tbl_invoice_main.discount AS Expr3,
    tbl_invoice_main.checklist_no
FROM tbl_invoice_main
INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
WHERE (tbl_invoice_main.invoice_date between '{from_date}' and '{to_date}')
    AND (tbl_customer.customer_name LIKE '%{find}%'
         OR tbl_customer.customer_type LIKE '%{find}%'
         OR tbl_invoice_main.invoice_no LIKE '%{find}%'
         OR tbl_invoice_main.checklist_no LIKE '%{find}%'
         OR tbl_invoice_main.discount LIKE '%{find}%')
ORDER BY tbl_invoice_main.invoice_date
```

**Notes:** `from_date` and `to_date` come from `Sales_Report.fromdate.Value` and `todate.Value`. Search filter (`{find}`) uses `find.Text` from the Sales Report form. ORDER BY is ascending.

---

## Outstanding Report — `Preview_Outstanding_Report`

### Query
```sql
SELECT
    id,
    LTRIM(title_name + ' ' + customer_name) AS Expr1,
    due_amount,
    ad_due,
    customer_type
FROM tbl_customer
WHERE due_amount > 0
  AND customer_name LIKE '%{find}%'
ORDER BY customer_name
```

**Notes:** Condition is `due_amount > 0` (not `<> 0`). Includes `customer_name LIKE` filter. Column alias is `Expr1` (not `CustomerName`).

### Visual Formatting
- Advance rows: Green text
- Due rows: Red text
- Amount with "-" prefix for Advance

---

## RDLC Report Structure

### Standard Layout
```
[Company Logo]          [Invoice Title]          [Date]
-----------------------------------------------------------
Bill To:
[Customer Name]
[Address]

-----------------------------------------------------------
| Item          | Qty   | Unit Price | Total              |
|---------------|-------|------------|-------------------|
| [Product 1]   | 2     | 100.00     | 200.00            |
| [Product 2]   | 1     | 50.00      | 50.00             |
-----------------------------------------------------------
                                      Subtotal:    250.00
                                      VAT (5%):     12.50
                                      Discount:     0.00
                                      ------------------------
                                      TOTAL:       262.50

[Due Amount: X.XX]   (conditional on due_amt parameter)

[Footer Notes]
[Company Address | Phone | Email]
```

---

## Print Button States

| Button | Color | Purpose |
|--------|-------|---------|
| CREATE NEW | YellowGreen | Add new record |
| PRINT | YellowGreen | Generate report/PDF |
| DELETE | Gray | Remove record (admin only) |
| SAVE / SEND | YellowGreen | Submit form / Send email |

---

## Key Global Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `invoice_id` | Double | Current invoice ID for report |
| `quotation_id` | Double | Current quotation ID |
| `receipt_id` | Double | Current receipt ID |
| `print_due_amt_on_invoice` | Boolean | Show/hide due on invoice |
| `new_AMOUNT` | Double | Total amount for report parameter |
| `tot_item_length()` | Double[] | Character counts for rows |
| `tot_desc_length()` | Double[] | Description lengths |

---

## Row Height Calculation

Used for dynamic row heights in RDLC (exists in all report Load subs):

```vb
' Loop 1: Item names
For i = 0 To tot_item_length.Length - 1
    If tot_item_length(i) > 0 Then
        Dim z As Double
        z = tot_item_length(i) / 38
        no_of_rows_item = Val(no_of_rows_item) + Val(Math.Ceiling(z))
    End If
Next

' Loop 2: Descriptions (separate array)
For i = 0 To tot_desc_length.Length - 1
    If tot_desc_length(i) > 0 Then
        Dim z As Double
        z = tot_desc_length(i) / 38
        no_of_rows_desc = Val(no_of_rows_desc) + Val(Math.Ceiling(z))
    End If
Next

' Select the larger row count
Dim pass_para_for_rows As Integer
If no_of_rows_item = no_of_rows_desc Then
    pass_para_for_rows = no_of_rows_item
ElseIf no_of_rows_item > no_of_rows_desc Then
    pass_para_for_rows = no_of_rows_item
ElseIf no_of_rows_desc > no_of_rows_item Then
    pass_para_for_rows = no_of_rows_desc
End If
```

Characters per row / 38 = number of rows needed. Two separate arrays track item and description lengths.

---

## PDF Filename Convention

| Type | Pattern | Example |
|------|---------|---------|
| Invoice | INV{no}-{Title Name}.pdf | INV001-Mr John Smith.pdf |
| Quotation | QUO{no}-{Title Name}.pdf | QUO001-Mr John Smith.pdf |
| Receipt | PAY{no}-{Customer}.pdf | PAY001-Mr John Smith.pdf |
| Outstanding | {date}.pdf | 20-05-2026 10_30_00.pdf |