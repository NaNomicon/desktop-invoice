# 29. List Outstanding

Source: `docs/xpress/legacy-code/XPress/Outstanding/ListOutStanding.vb` (355 lines)

## Purpose (customer balance tracking list)

`ListOutStanding` is the Outstanding screen that lists customers with non-zero outstanding balance (`due_amount > 0`) and allows finance actions (new receipt, receipt voucher, report print/PDF, Excel export). It also visually distinguishes Due vs Advance balances.

```vb
Public Class ListOutStanding
    Private Sub ListOutStanding_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        Call grids1(DataGridView1)
        Call load_grid()
    End Sub
```

## Load logic (SQL_Select, outstanding_query assignment)

`load_grid()` queries customer balances using `SQL_Select`, filters by search text, and stores an equivalent SQL statement in `outstanding_query` for report usage.

```vb
Public Sub load_grid()
    Call con_sql()

    Dim ds As DataSet = SQL_Select("tbl_customer", "id,customer_name,due_amount,ad_due As Status", " due_amount > 0 AND customer_name like '%" & find.Text & "%'", " Order by customer_name")
    outstanding_query = "select id,LTRIM(title_name + ' ' + customer_name) As Expr1,due_amount, ad_due,customer_type from tbl_customer where due_amount > 0 AND customer_name like '%" & find.Text & "%' Order by customer_name"

    If ds.Tables(0).Rows.Count > 0 Then
        With DataGridView1
            .DataSource = ds.Tables(0)
            .Columns(0).Visible = False

            tot = 0
            For i = 0 To ds.Tables(0).Rows.Count - 1
                Dim temp As Double = ds.Tables(0).Rows(i).ItemArray(2).ToString.Replace(",", "")
                If ds.Tables(0).Rows(i).ItemArray(3).ToString = "Advance" Then
                    .Rows(i).Cells(2).Value = "-" & Format(temp, "0.00")
                    tot = tot - temp
                Else
                    tot = tot + temp
                End If
            Next
            .Columns(1).Width = 300
            .Columns(2).Width = 150
            .Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            DataGridView1.Columns(2).DefaultCellStyle.Format = "N2"
        End With
    Else
        DataGridView1.DataSource = Nothing
    End If
End Sub
```

## DataGridView formatting (Status color: Green=Advance, Red=Due)

The status cell is color-coded after binding:
- `Advance` -> Green
- `Due` -> Red

```vb
Private Sub DataGridView1_DataBindingComplete(sender As Object, e As DataGridViewBindingCompleteEventArgs) Handles DataGridView1.DataBindingComplete
    On Error Resume Next
    With DataGridView1
        For i = 0 To ds.Tables(0).Rows.Count - 1
            If .Rows(i).Cells("Status").Value = "Advance" Then
                .Rows(i).Cells("Status").Style.ForeColor = Color.Green
            ElseIf .Rows(i).Cells("Status").Value = "Due" Then
                .Rows(i).Cells("Status").Style.ForeColor = Color.Red
            End If
        Next
    End With
End Sub
```

## Actions

### New Receipt

Opens receipt form in new mode.

```vb
Private Sub BtnNewReceipt_Click(sender As Object, e As EventArgs) Handles BtnNewReceipt.Click
    receipt_id = 0
    Receipt_voucher_ID = 0
    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```

### Receipt Voucher (pre-loads customer_id, load_dua_amount)

Uses selected outstanding row to open receipt form in voucher mode.

```vb
Private Sub BtnReceiptVoucher_Click(sender As Object, e As EventArgs) Handles BtnReceiptVoucher.Click
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    receipt_id = 0
    Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)

    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```

### Print Outstanding Report

```vb
Private Sub BtnPrint_Click(sender As Object, e As EventArgs) Handles BtnPrint.Click
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    Call __show(Preview_Outstanding_Report)
    load_nav_bar("Preview_Outstanding_Report", "Outstanding Report")
End Sub
```

### View PDF

Generates report bytes from `Preview_Outstanding_Report.ReportViewer2`, writes PDF under configured report path, and opens it.

```vb
Private Sub BtnViewPDF_Click(sender As Object, e As EventArgs) Handles BtnViewPDF.Click
    is_pdf = True
    Dim repo_path_id As Double = 0
    Dim frm As Form = Preview_Invoice_Report
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If

    If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        DataGridView1.Focus()
        Exit Sub
    End If
    repo_path_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Call Preview_Outstanding_Report.Preview_Outstanding_Report_Load(sender, e)
    Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
    If quot_path1 = "" Then
        MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
        Exit Sub
    End If

    Dim folder_path, pdf_path As String
    ' ⚠️ Dead code: `Dim file_name As String = get_single_value("invoice_no", "tbl_invoice_main", "id", repo_path_id)` — assigned but never used (referenced only in commented-out create_log call)
    folder_path = quot_path1 & "\Outstanding Reports\"

    If (Not System.IO.Directory.Exists(folder_path)) Then
        System.IO.Directory.CreateDirectory(folder_path)
    End If

    Dim Bytes() As Byte = Preview_Outstanding_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
    pdf_path = quot_path1 & "\Outstanding Reports\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".pdf"
    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using

    Preview_Outstanding_Report.ReportViewer2.RefreshReport()
    Preview_Outstanding_Report.Dispose()
    Preview_Outstanding_Report.Close()
    Process.Start(pdf_path)
End Sub
```

### Export Excel

Exports current grid rows to `.xlsx` via `Microsoft.Office.Interop.Excel`.

```vb
Private Sub BtnExport_Click(sender As Object, e As EventArgs) Handles BtnExport.Click
    Dim saveFileDialog1 As New SaveFileDialog()
    saveFileDialog1.Filter = "Excel |*.xlsx"
    saveFileDialog1.Title = "Save Excle File"
    saveFileDialog1.ShowDialog()

    Dim fnm As String

    If saveFileDialog1.FileName <> "" Then
        fnm = saveFileDialog1.FileName
    Else
        Exit Sub
    End If

    Dim xlWorkBook As Excel.Workbook
    Dim xlWorkSheet As Excel.Worksheet
    Dim misValue As Object = System.Reflection.Missing.Value
    Dim xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()

    ' Guard: Excel not installed check (source lines 276-279)
    If xlApp Is Nothing Then
        MessageBox.Show("Excel is not properly installed!!")
        Return
    End If

    ' Optional intermediate variables (not functionally used):
    ' Dim excel_file_name As String = fnm  ' aliases fnm, same value
    ' Dim today_dt As String = Format(Today.Date, "dd-MM-yyyy")

    xlWorkBook = xlApp.Workbooks.Add(misValue)
    xlWorkSheet = xlWorkBook.Sheets("sheet1")

    xlWorkSheet.Cells(1, 1) = "CUSTOMER NAME"
    xlWorkSheet.Cells(1, 2) = "AMOUNT"
    xlWorkSheet.Cells(1, 3) = "STATUS"

    Dim z As Integer
    Dim j As Integer

    z = 2
    With DataGridView1
        For j = 0 To .Rows.Count - 1
            xlWorkSheet.Cells(z, 1) = .Rows(j).Cells(1).Value
            xlWorkSheet.Cells(z, 2) = .Rows(j).Cells(2).Value
            xlWorkSheet.Cells(z, 3) = .Rows(j).Cells(3).Value
            z = z + 1
        Next
    End With
    xlWorkSheet.Columns.AutoFit()

    xlWorkBook.SaveAs(fnm)
    xlWorkBook.Close(True, misValue, misValue)
    xlApp.Quit()

    releaseObject(xlWorkSheet)
    releaseObject(xlWorkBook)
    releaseObject(xlApp)

    MsgBox("File Saved at : " & fnm)
End Sub
```

## Excel export (headers: CUSTOMER NAME, AMOUNT, STATUS)

Header row is explicitly written before data iteration:

```vb
xlWorkSheet.Cells(1, 1) = "CUSTOMER NAME"
xlWorkSheet.Cells(1, 2) = "AMOUNT"
xlWorkSheet.Cells(1, 3) = "STATUS"
```

## Double-click -> opens Add_Edit_Receipt

Double-click on a row behaves like receipt voucher action: it sets `Receipt_voucher_ID` and `load_dua_amount`, then opens `Add_Edit_Receipt`.

```vb
Private Sub DataGridView1_MouseDoubleClick(sender As Object, e As MouseEventArgs) Handles DataGridView1.MouseDoubleClick
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Data Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    receipt_id = 0
    Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)

    Add_Edit_Receipt.ShowDialog()
    Add_Edit_Receipt.BringToFront()
End Sub
```
