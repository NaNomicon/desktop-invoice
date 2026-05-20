# Demo_Add_Edit.vb — Alternative Invoice Form Specification

**Source:** `XPress/Invoice/Demo_Add_Edit.vb` (1285 lines)
**Designer:** `Demo_Add_Edit.Designer.vb` (753 lines)
**Comparison Target:** `Add_Edit_Invoice.vb` (documented in `10-invoice.md`)

---

## 1. Relationship to Add_Edit_Invoice — Duplicate or Variant?

**Classification:** Parallel implementation (legacy variant, not actively used)

| Aspect | Demo_Add_Edit | Add_Edit_Invoice |
|--------|---------------|------------------|
| **Purpose** | Alternative invoice entry form | Primary invoice entry form |
| **Grid Setup** | `count_row_col()` — index-based cells (0-6) | `SetColumnsForMainGrid()` — named columns |
| **Row Deletion** | Hard delete via `contain_id` string tracking | Soft delete via `IsDeleted` column + `.Visible = False` |
| **cal() Check** | No visibility check on rows | Checks `.Rows(i).Visible = True` |
| **Customer Search** | `customer_name LIKE '%...%'` only | `customer_name OR telephone OR contact OR address LIKE '%...%'` |
| **SEND Button** | Email workflow (opens `direct_email`) | Save only, no email |
| **Delete Tracking** | `contain_id` = comma-separated IDs | `IsDeleted` column in grid |
| **tmp_cust_id** | Missing | Present (`tmp_cust_id` for customer restoration) |

**Conclusion:** Demo_Add_Edit is an older parallel implementation. Add_Edit_Invoice has better engineering (named columns, soft delete, extended search). Demo form appears to be a prototype or alternative UI that was superseded.

---

## 2. Form Structure

### 2.1 Layout (1219 x 600 pixels)

```
┌─────────────┬──────────────────────────────────────────────────────────┐
│  Panel1     │  Panel2 (Dock: Fill)                                    │
│  (Left Nav) │                                                          │
│             │  ┌────────────────────────────────────────────────────┐  │
│  Add New    │  │ Customer: [txt_search] / [customer_name READONLY] │  │
│  Invoice    │  │ Invoice#: [invoice_no] Date: [invoice_date]      │  │
│             │  │ Checklist#: [checklist_no] Type: [case_debit]     │  │
│  Product    │  └────────────────────────────────────────────────────┘  │
│  Type       │  ┌────────────────────────────────────────────────────┐  │
│             │  │ Product Type: [load_type ▼] [All Type □]          │  │
│  Invoice No │  │ [+ Add Product]                                    │  │
│             │  ├────────────────────────────────────────────────────┤  │
│  Customer   │  │ GroupBox1: Invoice Product Detail's               │  │
│  Name       │  │ ┌──────────────────────────────────────────────┐  │  │
│             │  │ │ DataGridView2 (Docked Fill)                  │  │  │
│             │  │ │ Sr | Product Name & Description | Qty | Unit Price | Total │  │  │
│             │  │ │ 1  | [find_item popup] | 1.00| 0.00| 0.00   │  │  │
│             │  │ │    | Type Product Name  |    |     |         │  │  │
│             │  │ └──────────────────────────────────────────────┘  │  │
│             │  │ [find_item textbox] [load_item DataGridView]      │  │
│             │  └────────────────────────────────────────────────────┘  │
│             │  ┌────────────────────────────────────────────────────┐  │
│             │  │ Calculation Panel (Bottom Right)                   │  │
│             │  │ Sub Total: [sub_total READONLY]                    │  │
│             │  │ Advance/Due Amount: [copy_dua_amount READONLY]    │  │
│             │  │ Discount %/Amount: [per] / [discount]            │  │
│             │  │ VAT (X%): [vat_per READONLY] [vat READONLY]      │  │
│             │  │ Total Amount: [total_amt READONLY]                │  │
│             │  │ Paid Amount: [paid_amount]                        │  │
│             │  └────────────────────────────────────────────────────┘  │
│             │  [+ Create New Invoice] [+ Add] [+ Add Product]         │
│             │  [+ Create Receipt]                                    │
│             │  [SAVE] [PRINT] [SEND] [CANCEL]                       │
│             │                                       [×] Close        │
└─────────────┴──────────────────────────────────────────────────────────┘
```

### 2.2 Control Inventory

| Control | Type | Purpose |
|---------|------|---------|
| `invoice_no` | TextBox (ReadOnly) | Auto-incremented invoice number |
| `customer_name` | TextBox (ReadOnly) | Selected customer display |
| `txt_search` | TextBox (Hidden) | Customer search input |
| `DataGridView1` | DataGridView (Hidden) | Customer autocomplete results |
| `invoice_date` | DateTimePicker | Invoice date selection |
| `checklist_no` | TextBox | Checklist reference number |
| `case_debit` | ComboBox | CASH / CREDIT selection |
| `load_type` | ComboBox | Product type filter |
| `all_type` | CheckBox | Show all product types |
| `find_item` | TextBox (Hidden) | Product search input |
| `load_item` | DataGridView (Hidden) | Product search results |
| `DataGridView2` | DataGridView | Main invoice product grid |
| `sub_total` | TextBox (ReadOnly) | Sum of all line totals |
| `amount_due` | TextBox (Hidden) | Customer's existing due/advance |
| `copy_dua_amount` | TextBox (ReadOnly) | Formatted advance/due display |
| `per` | TextBox | Discount percentage input |
| `discount` | TextBox | Calculated discount amount |
| `vat_per` | TextBox (ReadOnly) | VAT percentage from settings |
| `vat` | TextBox (ReadOnly) | Calculated VAT amount |
| `total_amt` | TextBox (ReadOnly) | Final total |
| `paid_amount` | TextBox | Payment received (CASH only) |
| `Button1` | Button | SAVE — Save + generate PDF |
| `Button4` | Button | PRINT — Save + preview + PDF |
| `Button5` | Button | Create New Invoice — Reset form |
| `Button6` | Button | SEND — Save + email invoice |
| `Button7` | Button | Add Product — Open product form |
| `Button8` | Button | Create Receipt — Open receipt form |

---

## 3. Keyboard Shortcuts

| Shortcut | Handler | Action |
|----------|---------|--------|
| `Ctrl+I` | `DataGridView2_KeyDown` | Add new row to grid |
| `Ctrl+D` | `DataGridView2_KeyDown` | Delete current row (hard delete) |
| `Escape` | `Add_Edit_Invoice_KeyDown` | Close popups (customer list, item list) or close form |
| `Enter` | Various | Navigate/select in grids and forms |
| `Tab` | `DataGridView2_KeyDown` | Move focus to discount field |
| `↑/↓` | `txt_search_KeyDown` | Navigate customer list |
| `F4` | `case_debit_GotFocus` | Open combobox dropdown |

### 3.1 Row Addition Logic (Ctrl+I)

```vb
If (e.KeyCode = Keys.I AndAlso e.Modifiers = Keys.Control) Then
    DataGridView2.Rows.Add(1)
    Call load_sr()
End If
```

### 3.2 Row Deletion Logic (Ctrl+D)

```vb
If (e.KeyCode = Keys.D AndAlso e.Modifiers = Keys.Control) Then
    If DataGridView2.RowCount <= 1 Then Exit Sub
    c_row = .CurrentCell.RowIndex
    If DataGridView2.Rows(c_row).Cells(6).Value > 0 Then
        contain_id = contain_id & "," & Val(DataGridView2.Rows(c_row).Cells(6).Value)
        DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
    Else
        DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
    End If
    Call load_sr()
    Call cal()
End If
```

**Note:** Deleted IDs are tracked in `contain_id` string for SQL cleanup in `saved()`.

---

## 4. Product Search/Type Filter Logic

### 4.1 Product Type Filter

```vb
Public Sub load_item_type()
    Call SQL_Select("tbl_product_type", , , " order by type_name")
    If ds.Tables(0).Rows.Count > 0 Then
        load_type.DataSource = ds.Tables(0)
        load_type.DisplayMember = "type_name"
        load_type.ValueMember = "id"
    End If
End Sub
```

### 4.2 Product Search (load_items)

```vb
Public Sub load_items()
    Call grids1(load_item)
    load_item.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells
    Dim ids As String = get_single_value("id", "tbl_product_type", "type_name", load_type.Text)
    If all_type.Checked = True Then
        Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", _
            " (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", _
            " Order By product_id")
    Else
        Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", _
            " type_id='" & Val(ids) & "' and (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", _
            " Order By product_id")
    End If
```

**Search by:** Product ID OR Product Name (LIKE `%search%`)
**Filter:** By product type OR all types

### 4.3 Trigger Sequence

1. User types in `find_item` → `find_item_TextChanged`
2. `load_items()` called → shows `load_item` DataGridView
3. User selects with Enter/Double-click → `load_item_for_dou()`
4. Product added to `DataGridView2`, qty defaults to 1

---

## 5. Customer Autocomplete Logic

### 5.1 Customer Search (load_customer)

```vb
Public Sub load_customer()
    If txt_search.TextLength > 0 Then
        DataGridView1.Visible = True
        Call grids1(DataGridView1)
        Call SQL_Select("tbl_customer", " id,customer_name ", _
            " customer_name like '%" & txt_search.Text & "%'", _
            " Order By customer_name")
        If ds.Tables(0).Rows.Count > 0 Then
            With DataGridView1
                .DataSource = ds.Tables(0)
                .Columns(0).Visible = False
                .Columns(1).HeaderText = "Customer Name"
            End With
        End If
    End If
End Sub
```

### 5.2 Customer Selection

```vb
Private Sub txt_search_KeyDown(...)
    If e.KeyCode = Keys.Enter Then
        customer_name.Text = .Rows(0).Cells(1).Value
        customer_id = .Rows(0).Cells(0).Value
        Dim k As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
        Dim ad_due As String = get_single_value("ad_due", "tbl_customer", "id", customer_id)
        Label8.Text = ad_due & " Amount"
        amount_due.Text = Format(k, "0.00")
        If ad_due = "Advance" Then
            copy_dua_amount.Text = "-" & Format(k, "0.00")
        ElseIf ad_due = "Due" Then
            copy_dua_amount.Text = Format(k, "0.00")
        End If
        ad_de = ad_due
    End If
End Sub
```

**On selection:**
- Loads customer's `due_amount` from `tbl_customer`
- Sets `Label8` to "Advance Amount" or "Due Amount"
- Stores signed amount in `copy_dua_amount`
- Sets `ad_de` = customer type (Advance/Due)

---

## 6. Advance/Due Amount Handling

### 6.1 Customer Account State

Each customer has:
- `due_amount` — absolute value of outstanding
- `ad_due` — "Advance" or "Due" indicator

### 6.2 Amount Display Flow

```
Customer Selection
       ↓
Get due_amount + ad_due from tbl_customer
       ↓
Label8.Text = ad_due & " Amount"  (e.g., "Due Amount")
       ↓
copy_dua_amount = signed value
  - Advance: negative (subtracted from invoice)
  - Due: positive (added to invoice)
       ↓
amount_due = raw due_amount
```

### 6.3 Calculation Impact (cal function)

```vb
If Label8.Text = "Advance Amount" Then
    new_tot = Val(sub_total.Text) - Val(amount_due.Text)
ElseIf Label8.Text = "Due Amount" Then
    new_tot = Math.Abs(Val(sub_total.Text) + Val(amount_due.Text))
End If
```

| Customer State | Formula |
|----------------|---------|
| Advance (e.g., overpaid $100) | `new_tot = sub_total - 100` |
| Due (e.g., owes $100) | `new_tot = sub_total + 100` |

---

## 7. Comparison with Add_Edit_Invoice — Detailed Differences

### 7.1 Grid Architecture

**Demo_Add_Edit (Index-based):**
```vb
' count_row_col() sets up by index
.Columns(0) = "Sr.No."
.Columns(1) = "Product Name"
.Columns(2) = "Qty"
.Columns(3) = "Unit Price"
.Columns(4) = "Total"
.Columns(5) = Hidden (product_id)
.Columns(6) = Hidden (sub_id)
```

**Add_Edit_Invoice (Named columns):**
```vb
' SetColumnsForMainGrid() uses named columns
.Columns.Add("SrNo", "Sr.No.")
.Columns.Add("ItemName", "Product Name")
.Columns.Add("Qty", "Qty")
.Columns.Add("UnitPrice", "Unit Price")
.Columns.Add("Total", "Total")
.Columns.Add("ItemId", "Item Id")      ' Hidden
.Columns.Add("Id", "Id")              ' Hidden
.Columns.Add("IsDeleted", "Is Deleted") ' Hidden — soft delete
```

### 7.2 Row Deletion Strategy

**Demo_Add_Edit:**
- Hard delete from database
- `contain_id` string accumulates IDs: `"," & deleted_id`
- On save: Loop `contain_id.Split(",")` → individual `DELETE FROM tbl_invoice_sub WHERE id='...'`. Not `IN (...)`.

**Add_Edit_Invoice:**
- Soft delete (row visibility)
- `IsDeleted` column set to "Yes"
- `Row.Visible = False`
- On save: INSERT/UPDATE with visibility check in `cal()`

### 7.3 cal() Function Comparison

**Demo_Add_Edit (no visibility check):**
```vb
For i = 0 To .Rows.Count - 1
    ' Processes ALL rows including deleted
```

**Add_Edit_Invoice (with visibility check):**
```vb
For i = 0 To .Rows.Count - 1
    If .Rows(i).Visible = True Then
        ' Only visible rows
```

### 7.4 Customer Search Comparison

**Demo_Add_Edit:**
```sql
WHERE customer_name LIKE '%search%'
```

**Add_Edit_Invoice:**
```sql
WHERE customer_name LIKE '%search%' 
   OR telephone LIKE '%search%'
   OR contact LIKE '%search%'
   OR address LIKE '%search%'
```

---

## 8. Full cal() Function

```vb
Public Sub cal()
    With DataGridView2
        Dim total As Double = 0
        Dim temp As Double = 0

        ' 1. Calculate row totals
        For i = 0 To .Rows.Count - 1
            Dim QTY As Double = Val(.Rows(i).Cells(2).Value)
            .Rows(i).Cells(2).Value = Format(QTY, "0.00")
            temp = Val(Val(.Rows(i).Cells(2).Value) * Val(.Rows(i).Cells(3).Value))
            .Rows(i).Cells(4).Value = Format(temp, "0.00")
            temp = Val(.Rows(i).Cells(3).Value)
            .Rows(i).Cells(3).Value = Format(temp, "0.00")
            total = total + Val(.Rows(i).Cells(4).Value)
        Next

        ' 2. Sub Total
        sub_total.Text = Format(total, "0.00")

        ' 3. Apply Advance/Due adjustment
        Dim new_tot As Double = 0
        If Label8.Text = "Advance Amount" Then
            new_tot = Val(sub_total.Text) - Val(amount_due.Text)
        ElseIf Label8.Text = "Due Amount" Then
            new_tot = Math.Abs(Val(sub_total.Text) + Val(amount_due.Text))
        End If

        ' 4. VAT Calculation
        Dim vat_per1, vat1 As Double
        vat_per1 = Val(vat_per.Text)
        vat1 = Math.Abs(Val(Val(sub_total.Text) * vat_per1) / 100)
        vat.Text = Format(vat1, "0.00")

        ' 5. Discount Calculation
        If Val(per.Text) = 0 Then
            ' discount stays as-is
        Else
            discount.Text = Format(Val(Val(Val(sub_total.Text) + vat1) * Val(per.Text) / 100), "0.00")
        End If

        ' 6. Total Amount
        total_amt.Text = Format((new_tot + vat1) - Val(discount.Text), "0.00")
        new_AMOUNT = total_amt.Text

        temp = Format(Val(new_tot + vat1) - Val(discount.Text), "0.00")
    End With
End Sub
```

### 8.1 Calculation Flow

```
[Row Qty × Unit Price] → Row Total
         ↓
Sum of Row Totals → Sub Total
         ↓
Sub Total ± Amount Due → new_tot
         ↓
new_tot + VAT - Discount → Total Amount
```

---

## 9. Save Logic to tbl_invoice_main + tbl_invoice_sub

### 9.1 saved() Function Flow

```vb
Public Sub saved()
    Dim variable As New Dictionary(Of String, String)
    old_date = Date.Now

    ' 1. Check edit time limit
    Dim days As Integer = (old_date - temp_date).Days
    Dim edit_days As String = get_single_value("invoice_days", ...)
    If edit_days < days Then
        ' Reset invoice number (old invoice becomes read-only)
        invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", ...)
        invoice_id = 0
        ' Reload customer advance/due
    End If

    ' 2. Update customer due_amount based on CASH/CREDIT
    If case_debit.Text = "CASH" Then
        ' CASH: due = total - paid
        m1 = "update tbl_customer set due_amount='" & Math.Abs(total - paid) & "'"
    ElseIf case_debit.Text = "CREDIT" Then
        ' CREDIT: due = total
        m1 = "update tbl_customer set due_amount='" & Math.Abs(total_amt) & "'"
    End If

    ' 3. Determine Cr/Dr status
    If ad_de = "Advance" Then
        If total = paid Then: ad_due = "Due", str1 = "Dr."
        If total > paid Then: ad_due = "Advance", str1 = "Cr."
    ElseIf ad_de = "Due" Then
        If total = paid Then: ad_due = "Due", str1 = "Dr."
        If total > paid Then: ad_due = "Due", str1 = "Dr."
        If paid > total Then: ad_due = "Advance", str1 = "Cr."
    End If

    ' 4. Insert/Update tbl_invoice_main
    variable.Add("customer_id", "'" & customer_id & "'")
    variable.Add("invoice_no", "'" & invoice_no.Text & "'")
    variable.Add("checklist_no", "'" & checklist_no.Text & "'")
    variable.Add("sub_total", "'" & sub_total & "'")
    variable.Add("amount_due", "'" & amount_due & "'")
    variable.Add("discount", "'" & discount & "'")
    variable.Add("total", "'" & Math.Abs(total_amt) & "'")
    variable.Add("per", "'" & per & "'")
    variable.Add("invoice_date", "'" & Format(invoice_date.Value, "dd-MMM-yyyy") & "'")
    variable.Add("vat", "'" & vat & "'")
    variable.Add("case_debit", "'" & case_debit.Text & "'")
    variable.Add("no", "'" & tot_time & "'")
    variable.Add("cr_dr", "'" & str1 & "'")
    variable.Add("balance", "'" & Math.Abs(total_amt - paid_amount) & "'")
    variable.Add("identify", "'" & Label8.Text.Replace(" Amount", "") & "'")

    If invoice_id > 0 Then
        SQL_Update("tbl_invoice_main", variable, "id=" & invoice_id)
    Else
        SQL_Insert("tbl_invoice_main", variable)
        invoice_id = get_max_number("id", "tbl_invoice_main")
    End If

    ' 5. Insert/Update tbl_invoice_sub
    For i = 0 To DataGridView2.Rows.Count - 1
        If .Rows(i).Cells(1).Value = "Type Product Name" Then GoTo kkk

        qty = Val(.Rows(i).Cells(2).Value)
        unit_price = Val(.Rows(i).Cells(3).Value)
        row_total = Val(.Rows(i).Cells(4).Value)
        product_id = Val(.Rows(i).Cells(5).Value)
        load_id = Val(.Rows(i).Cells(6).Value)
        sr_no = Val(.Rows(i).Cells(0).Value)

        If load_id > 0 Then
            q = "UPDATE tbl_invoice_sub SET qty='...', product_id='...', ... WHERE id='" & load_id & "'"
        Else
            q = "INSERT INTO tbl_invoice_sub(main_id,qty,product_id,unit_price,row_total,s_no) VALUES (...)"
        End If
        cmd.ExecuteNonQuery()
kkk:
    Next

    ' 6. Increment invoice number counter
    If invoice_id = 0 Then
        q = "UPDATE tbl_numbers SET invoice_no='" & Val(invoice_no.Text) + 1 & "' WHERE id=..."
    End If

    ' 7. Delete removed rows
    For Each id In contain_id.Split(",")
        m = "DELETE FROM tbl_invoice_sub WHERE id='" & id & "'"
        cmd.ExecuteNonQuery()
    Next
End Sub
```

### 9.2 tbl_invoice_main Fields

| Field | Source |
|-------|--------|
| `customer_id` | `customer_id` global |
| `invoice_no` | `invoice_no.Text` |
| `checklist_no` | `checklist_no.Text` |
| `invoice_date` | `invoice_date.Value` (dd-MMM-yyyy) |
| `case_debit` | `case_debit.Text` (CASH/CREDIT) |
| `paid_amount` | `paid_amount.Text` (CASH only) |
| `sub_total` | `sub_total.Text` |
| `amount_due` | `amount_due.Text` |
| `vat` | `vat.Text` |
| `discount` | `discount.Text` |
| `per` | `per.Text` (discount %) |
| `total` | `total_amt.Text` |
| `cr_dr` | `str1` (Cr./Dr.) |
| `balance` | `total - paid` |
| `identify` | `ad_due` (Advance/Due) |
| `no` | `tot_time` |

### 9.3 tbl_invoice_sub Fields

| Field | Source | Notes |
|-------|--------|-------|
| `main_id` | `invoice_id` | |
| `product_id` | `Cells(5).Value` | |
| `qty` | `Cells(2).Value` | |
| `unit_price` | `Cells(3).Value` | |
| `row_total` | `Cells(4).Value` | |
| `s_no` | `Cells(0).Value` (row number) | **INSERT does NOT include s_no — set to 0. UPDATE populates s_no from Cells(0).Value.** |

---

## 10. PDF Generation Path

### 10.1 Button1_Click (SAVE + PDF)

```vb
Private Sub Button1_Click(...)
    is_pdf = True
    ' ... validation ...
    Call saved()
    invoice_id = get_max_number("id", "tbl_invoice_main")

    Call View_Invoice.load_grid_sql()
    Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)

    ' Get save path from settings
    Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", ...)

    ' Create folder by month
    Dim iMonth As Integer = Month(invoice_date.Value)
    folder_path = quot_path1 & "\" & MonthName(iMonth)
    If Not Directory.Exists(folder_path) Then
        Directory.CreateDirectory(folder_path)
    End If

    ' Generate PDF
    Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", ...)
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"

    Using Stream As New FileStream(pdf_path, FileMode.Create)
        Stream.Write(Bytes, 0, Bytes.Length)
    End Using

    Preview_Invoice_Report.Dispose()
    MsgBox("Invoice Details Saved!")
    Me.Dispose()
    Me.Close()
End Sub
```

### 10.2 Button4_Click (PRINT + Preview)

```vb
Private Sub Button4_Click(...)
    ' Same validation + saved()
    Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
    Call __show(Preview_Invoice_Report)
    load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
    Call View_Invoice.load_grid_sql()
End Sub
```

### 10.3 Button6_Click (SEND — Email)

```vb
Private Sub Button6_Click(...)
    ' Same validation as Button1 (empty grid check, row check, saved())
    Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)

    ' Generate PDF
    Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", ...)
    pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"

    ' Load email form with invoice attachment
    direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
    direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", ...)
    direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", ...)
    direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", ...).Replace("invoice", "quotation")
    direct_email.body.Text = get_single_value("body", "tbl_email", "id", ...)
    direct_email.body.Text = direct_email.body.Text.Replace("<date>", Format(invoice_date.Value, "dd.MM.yyyy") & ".")
    direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", get_single_value("contact", "tbl_customer", "id", customer_id))
    direct_email.body.Text = direct_email.body.Text.Replace("invoice", "quotation")
    direct_email.sub_subject.Text = pdf_path  ' PDF path attachment
    direct_email.attach = pdf_path

    Call direct_email.ShowDialog()
End Sub
```

### 10.4 PDF Path Template

```
{Invoice_path}/{MonthName}/INV{invoice_no}-{customer_name}.pdf
```

**Example:**
```
C:\Invoices\May/INV1001-Acuserv Holdings.pdf
```

---

## 11. Form Lifecycle

### 11.1 Load (Add_Edit_Invoice_Load)

```vb
Public Sub Add_Edit_Invoice_Load(...)
    case_debit.SelectedIndex = 1  ' Default to CREDIT
    Call con_sql()
    Me.KeyPreview = True
    grids1(DataGridView2)
    Call load_customer()
    load_item_type()
    Call count_row_col()

    invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", ...)

    If invoice_id > 0 Then  ' Edit mode
        Label2.Text = "Edit Invoice"
        Call load_data()
    End If

    If Quotation_To_Invoice_ID > 0 Then  ' From quotation
        Call load_data()
    End If

    ' VAT visibility from settings
    check_per_vat = get_single_value("isvat", "tbl_setting", ...)
    If check_per_vat = 0 Then
        Label11.Visible = False
        vat_per.Visible = False
        vat.Visible = False
    End If

    cal()
End Sub
```

### 11.2 Disposal

```vb
Private Sub Add_Edit_Invoice_Disposed(...)
    last_form_close(Me)
    Quotation_To_Invoice_ID = 0
    invoice_id = 0
End Sub
```

---

## 12. Unique Features in Demo_Add_Edit

| Feature | Description |
|---------|-------------|
| **Email Integration** | Button6 (SEND) opens `direct_email` form with PDF attachment |
| **Receipt Creation** | Button8 opens `Add_Edit_Receipt` with customer due amount preloaded |
| **Global Variables** | `GLOBLE_INVOICE_NO`, `Receipt_voucher_ID`, `load_dua_amount` |
| **copy_dua_amount** | ReadOnly display of signed advance/due value |
| **amount_due (Hidden)** | Original due amount, not visible but used in calculations |

---

## 13. Button Actions Summary

| Button | Text | Action |
|--------|------|--------|
| `Button1` | SAVE | Save + generate PDF + close |
| `Button4` | PRINT | Save + show preview + stay open |
| `Button5` | Create New Invoice | Reset all fields, new invoice number |
| `Button6` | SEND | Save + email invoice to customer |
| `Button7` | Add Product | Open `Add_Edit_Product` form |
| `Button8` | Create Receipt | Open `Add_Edit_Receipt` for customer |
| `Button3` | Add | Open `Add_Edit_Customer` form |
| `Button2` | CANCEL | Close form (dispose) |

---

## 14. Global Variables Used

| Variable | Type | Scope | Purpose |
|----------|------|-------|---------|
| `customer_id` | Double | Global | Selected customer ID |
| `invoice_id` | Double | Global | Current invoice ID (edit mode) |
| `Quotation_To_Invoice_ID` | Double | Global | Quotation being converted |
| `new_AMOUNT` | String | Global | Total for payment processing |
| `GLOBLE_INVOICE_NO` | String | Global | Invoice number for receipt |
| `Receipt_voucher_ID` | Double | Global | Customer ID for receipt |
| `load_dua_amount` | Double | Global | Due amount for receipt |
| `ad_de` | String | Public | Current advance/due state |
| `identify` | String | Module | Source type (Invoice/Quotation) |
| `contain_id` | Double | Module | Deleted row IDs for cleanup |
| `temp_paid_amount` | Double | Module | Original paid amount (edit) |
| `load_amount` | Double | Module | Original total (edit) |
