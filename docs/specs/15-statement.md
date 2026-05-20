# Statement of Account — Specification

## Overview
**File**: `Reports/Statement.vb`  
**Purpose**: Generate Statement of Account reports for customers showing invoice/receipt ledger transactions  
**Access**: Menu → Reports → Statement

## Data Flow
```
Customer Selection (search by name)
    ↓
Date Range Filter (from_date → to_date)
    ↓
Query: UNION of tbl_invoice_main + tbl_receipt
    ↓
Display: DataGridView1 with running balance
    ↓
Actions: Preview PDF | Email PDF | Export Excel
```

---

## UI Components

### Controls
| Control | Type | Purpose |
|---------|------|---------|
| `customer_name` | TextBox | Selected customer display (triggers search grid) |
| `txt_search` | TextBox | Search input for customer autocomplete |
| `DataGridView2` | DataGridView | Customer search results |
| `fromdate` | DateTimePicker | Start date (default: first_date()) |
| `todate` | DateTimePicker | End date |
| `DataGridView1` | DataGridView | Ledger transactions display |
| `Button1` | Button | Preview in ReportViewer |
| `Button2` | Button | (unused — empty handler) |
| `Button3` | Button | Email PDF (with attachments) |
| `Button4` | Button | Close |
| `Button5` | Button | Export to Excel |
| `Button6` | Button | Save PDF |
| `Label6` | Label | Close button |

### DataGridView1 Columns
| Column | Name | Content |
|--------|------|---------|
| 0 | id | Hidden ID |
| 1 | VType | "Invoice" or "Payment" (based on paid_amount: empty→Invoice, populated→Payment) |
| 2 | Date | Transaction date |
| 3 | INVNo | Invoice/Receipt number |
| 4 | ChecklistNo | Checklist reference |
| 5 | BillAmount | Invoice total (sub_total - discount) |
| 6 | PaidAmount | Payment amount |
| 7 | ChequeNo | Cheque reference |
| 8 | Balance | Running balance |
| 9 | extra | Sort order key |
| 10 | DDD | "Cr." indicator |
| 11 | Balance2 | Hidden, used for calculations |

---

## Logic

### Customer Search
```vb
Private Sub txt_search_TextChanged()
    load_customer()  ' Search tbl_customer by name
End Sub

Public Sub load_customer()
    SQL_Select("tbl_customer", "id,customer_name", 
               "customer_name like '%" & txt_search.Text & "%'")
    DataGridView2.DataSource = ds.Tables(0)
    DataGridView2.Columns(0).Visible = False
    DataGridView2.Columns(1).HeaderText = "Customer Name"
End Sub
```

### Load Grid (load_grid)
```vb
Public Sub load_grid()
    ' UNION query for invoices + receipts
    A = "SELECT ... FROM tbl_invoice_main WHERE customer_id = X 
         AND invoice_date BETWEEN fromdate AND todate"
    B = "SELECT ... FROM tbl_receipt WHERE customer_id = X 
         AND receipt_date BETWEEN fromdate AND todate"
    
    report_qurty = A & " UNION " & B & " Order by extra"
    SQL_Query(report_qurty)
    DataGridView1.DataSource = ds.Tables(0)
    
    ' Calculate VType (Invoice vs Payment) based on paid_amount
    For Each Row
        If Cells(6).Value <> "" Then Cells(1).Value = "Payment"
        Else Cells(1).Value = "Invoice"
        
        ' Handle Cr./Dr. indicators
        If Cells(10).Value = "Cr." Then
            Cells(11).Value = "-" & Val(Cells(8).Value)
        End If
    Next
End Sub
```

### Date Trigger
```vb
Private Sub fromdate_ValueChanged() / todate_ValueChanged()
    load_grid()  ' Auto-refresh on date change
End Sub
```

---

## Actions

### Button1: Save PDF
```vb
Private Sub Button1_Click()
    is_pdf = True
    repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
    
    ' Load report with customer_id context
    Preview_Statement_Report.Preview_Statement_Report_Load(sender, e)
    
    ' Get report path from tbl_setting
    quot_path1 = get_single_value("report_path", "tbl_setting", "id", get_max_number(...))
    
    ' Create folder: report_path\Statement Reports\
    folder_path = quot_path1 & "\Statement Reports\"
    
    ' PDF filename: "SOA [CustomerName] [timestamp].pdf"
    pdf_path = folder_path & "SOA " & cust_nm & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
    
    ' Render and save
    Bytes = Preview_Statement_Report.ReportViewer2.LocalReport.Render("PDF", ...)
    Using Stream As FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using
    
    ' Open PDF
    Process.Start(pdf_path)
End Sub
```

### Button3: Email PDF
```vb
Private Sub Button3_Click()
    ' Same PDF generation as Button1
    pdf_path = quot_path1 & "\Statement Reports\" & Format(Date.Now, "dd-MM-yyyy") & ".pdf"
    
    ' Load email template from tbl_email (identify = "STATEMENT")
    direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
    direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
    direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
    temp_id = get_single_value("id", "tbl_email", "identify", "STATEMENT")
    direct_email.sender_id = get_single_value("sender", "tbl_email", "id", Val(temp_id))
    direct_email.Subject = get_single_value("subject", "tbl_email", "id", Val(temp_id))
    direct_email.body = get_single_value("body", "tbl_email", "id", Val(temp_id))
    direct_email.attach = pdf_path
    
    ' Template variable replacement
    direct_email.body = body.Replace("<name>", title & " " & customer_name.Text & ",")
    direct_email.body = body.Replace("<date>", Format(Date.Now, "dd.MM.yyyy") & ".")
    Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
    If contact = "" Then
        direct_email.body.Text = body.Replace("<contact person>", "")
    Else
        Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
    If contact = "" Then
        direct_email.body.Text = body.Replace("<contact person>", "")
    Else
        direct_email.body.Text = body.Replace("<contact person>", contact)
    End If
    End If
    
    direct_email.ShowDialog()
End Sub
```

### Button6: Export to Excel
```vb
Private Sub Button6_Click()
    saveFileDialog1.Filter = "Excel |*.xlsx"
    saveFileDialog1.FileName = customer_name.Text
    saveFileDialog1.ShowDialog()
    
    ' Create Excel workbook
    xlApp = New Excel.Application()
    xlWorkBook = xlWorkBook.Workbooks.Add()
    xlWorkSheet = xlWorkBook.Sheets("sheet1")
    
    ' Header block (rows 1-9)
    xlWorkSheet.Cells(1) = 
        "X-Press Ironing Ltd" & vbCrLf &
        "Bissessur Lane, Palma Road" & vbCrLf &
        "Quatre Bornes, Mauritius" & vbCrLf &
        "Tel : 59758740 / 59682450" & vbCrLf &
        "Email : xpressironingltd@gmail.com" & vbCrLf &
        "BRN : C17146035" & vbCrLf &
        "---------------------------------------------------------------------------------" & vbCrLf &
        "Statement Of Account"
    
    ' Column headers (row 10)
    xlWorkSheet.Cells(10, 1) = "Inv/Rec"
    xlWorkSheet.Cells(10, 2) = "Date"
    xlWorkSheet.Cells(10, 3) = "Inv No."
    xlWorkSheet.Cells(10, 4) = "Checklist No"
    xlWorkSheet.Cells(10, 5) = "Bill Amount"
    xlWorkSheet.Cells(10, 6) = "Paid Amount"
    xlWorkSheet.Cells(10, 7) = "Cheque No"
    xlWorkSheet.Cells(10, 8) = "Balance"
    
    ' Data rows (starting row 11)
    For j = 0 To DataGridView1.Rows.Count - 1
        xlWorkSheet.Cells(z, 1) = .Rows(j).Cells("VType").Value
        xlWorkSheet.Cells(z, 2) = .Rows(j).Cells("Date").Value
        ' ... remaining columns
        z = z + 1
    Next
    
    xlWorkSheet.Columns.AutoFit()
    xlWorkBook.SaveAs(fnm)
    xlWorkBook.Close(True)
    xlApp.Quit()
    
    releaseObject(xlWorkSheet)
    releaseObject(xlWorkBook)
    releaseObject(xlApp)
End Sub
```

---

## Database Queries

### Main Ledger Query (load_grid)
```sql
-- INVOICES
SELECT tbl_invoice_main.id AS IID, 'INVOICE' AS aaa, 
       tbl_invoice_main.invoice_date AS IDATE, 
       tbl_invoice_main.invoice_no AS INO, 
       tbl_invoice_main.checklist_no AS ICHECK, 
       tbl_invoice_main.sub_total - tbl_invoice_main.discount AS ITOTAL,
       tbl_invoice_main.paid_amount AS IPAID, 
       '-' AS ICHE, 
       tbl_invoice_main.balance AS IBAL, 
       tbl_invoice_main.no as extra,
       tbl_invoice_main.cr_dr as DDD, 
       '' as ExtraA, 
       tbl_invoice_main.sub_total - tbl_invoice_main.discount AS STOTAL
FROM tbl_invoice_main 
INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
WHERE tbl_invoice_main.customer_id = {customer_id}
  AND tbl_invoice_main.invoice_date BETWEEN '{fromdate}' AND '{todate}'

UNION

-- RECEIPTS
SELECT tbl_receipt.id AS RID, 'RECEIPT' AS RE,
       tbl_receipt.receipt_date AS IDATE, 
       tbl_receipt.receipt_no AS RNO, 
       '-' AS RCHECK, 
       0 AS RTOTAL, 
       tbl_receipt.amount_received AS RPAID, 
       tbl_receipt.cheque_no AS RCHE, 
       tbl_receipt.due_amount AS RBAL, 
       tbl_receipt.no as extra, 
       tbl_receipt.cr_dr as DDD1, 
       '' as ExtraB, 
       0 AS STOTAL
FROM tbl_receipt
INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id
WHERE tbl_receipt.customer_id = {customer_id}
  AND tbl_receipt.receipt_date BETWEEN '{fromdate}' AND '{todate}'

ORDER BY extra
```

---

## Events

| Event | Handler | Action |
|-------|---------|--------|
| Form Load | `Statement_Load` | Initialize, set fromdate, call `load_customer()` |
| Dispose | `Statement_Disposed` | Call `last_form_close(Me)` |
| KeyDown (Escape) | `Statement_KeyDown` | Close form |
| Move | `Statement_Move` | Call `moved(Me)` |
| txt_search TextChanged | `txt_search_TextChanged` | Call `load_customer()` |
| txt_search KeyDown | `txt_search_KeyDown` | Navigate grid, Enter to select |
| txt_search KeyUp | `txt_search_KeyUp` | Handle single character preservation |
| customer_name KeyDown | `customer_name_KeyDown` | Show search grid |
| DataGridView2 KeyDown | `DataGridView2_KeyDown` | Enter to select, Esc to hide |
| DataGridView2 DoubleClick | `DataGridView2_MouseDoubleClick` | Load customer data |
| fromdate/todate ValueChanged | `fromdate_ValueChanged` | Refresh grid |
| Button1 Click | `Button1_Click` | Save PDF |
| Button3 Click | `Button3_Click` | Email PDF |
| Button4 Click | `Button4_Click` | Close form |
| Button5 Click | `Button5_Click` | Preview in ReportViewer |
| Button6 Click | `Button6_Click` | Export to Excel |
| Label6 Click | `Label6_Click` | Close form |

---

## Key Implementation Details

### Running Balance Calculation
Balance is calculated row-by-row during grid population:
- Invoice rows: Add to balance (bill_amount)
- Payment rows: Subtract from balance (paid_amount)
- Display format: `#,0.00` with right alignment

### VType Determination
```vb
If DataGridView1.Rows(i).Cells(6).Value.ToString <> "" Then
    ' Has paid_amount → Payment
    DataGridView1.Rows(i).Cells(1).Value = "Payment"
Else
    ' No paid_amount → Invoice
    DataGridView1.Rows(i).Cells(1).Value = "Invoice"
End If
```

### Cr./Dr. Handling
```vb
If DataGridView1.Rows(i).Cells(10).Value.ToString = "Cr." Then
    ' Credit note → negate balance
    DataGridView1.Rows(i).Cells(11).Value = "-" & Val(DataGridView1.Rows(i).Cells(8).Value)
Else
    DataGridView1.Rows(i).Cells(11).Value = Val(DataGridView1.Rows(i).Cells(8).Value)
End If
amt = .Rows(i).Cells(11).Value
```

### PDF Filename Convention
```
"SOA " & [CustomerName] & " " & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
Example: "SOA John Doe 20-05-2026 14_30_45.pdf"
```

### Folder Structure for PDFs
```
{report_path}\Statement Reports\
  └── SOA John Doe 20-05-2026 14_30_45.pdf
```

---

## Related Forms

| Form | File | Relationship |
|------|------|--------------|
| Preview_Statement_Report | `Reports/Preview_Statement_Report.vb` | RDLC report rendering for Statement |
| direct_email | `Email/direct_email.vb` | Email sending with attachment |

---

## Notes
- `Statement.vb` is different from `Preview_Statement_Report.vb` - the former is the screen, the latter is the RDLC preview
- Customer selection triggers due_amount lookup: `get_single_value("due_amount", "tbl_customer", " id", customer_id)`
- The `extra` column is used for sorting - maps to `tbl_invoice_main.no` or `tbl_receipt.no`
- Form3.vb is an empty stub, not a functional screen