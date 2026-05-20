# Receipt Module — Implementation Details

> **Multi-Company Support Added:** `company_id` column on `tbl_receipt`.

## Purpose

`Add_Edit_Receipt` handles both:
- creating a new receipt,
- creating a receipt voucher from outstanding list,
- editing an existing receipt.

It tracks customer balance transitions (`Due`/`Advance`) and updates both `tbl_receipt` and `tbl_customer`.

```vb
Public Class Add_Edit_Receipt
    Dim advance As Boolean = False
    Dim TotalDueAmountGlobal As Double = 0
    Dim pre_load_status As String = ""
    Public save_ad_due, cr_dr As String
```

---

## Multi-Company Support

### Company Selection

A **company ComboBox** is added at the form header.

**UI Placement:**
```
┌─────────────────────────────────────────────────────────────┐
│  Company: [X-Press Ironing Ltd ▼]     Customer: [________] │
│                                    Receipt No: [____]       │
│  Receipt Date: [___]                Amount Received: [____]   │
└─────────────────────────────────────────────────────────────┘
```

**Data Source:**
```sql
SELECT id, company_name FROM tbl_company WHERE is_active = 1 ORDER BY id
```

**Load Logic:**
```vb
Private Sub LoadCompanyCombo()
    Dim ds As DataSet = SQL_Query("SELECT id, company_name FROM tbl_company WHERE is_active = 1 ORDER BY id")
    company_cmb.DataSource = ds.Tables(0)
    company_cmb.DisplayMember = "company_name"
    company_cmb.ValueMember = "id"
    If ds.Tables(0).Rows.Count > 0 Then
        company_cmb.SelectedIndex = 0
    End If
End Sub
```

**Save Logic:**
```vb
variable.Add("company_id", company_cmb.SelectedValue)
```

---

## Load logic (receipt_no from tbl_numbers, identify="V"/"R" pattern)

On load, the form fetches next `receipt_no` from `tbl_numbers`. If opened for voucher or edit, it calls `load_data()` and then loads history grid.

```vb
Private Sub Add_Edit_Receipt_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
    Call set_fonr(Me, Label2)
    Label2.Font = New Font("Franklin Gothic Medium Cond", 19, FontStyle.Bold)

    Call con_sql()
    Me.KeyPreview = True
    receipt_no.Text = get_single_value("receipt_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
    If receipt_id > 0 Or Receipt_voucher_ID > 0 Then
        receipt_no.Text = get_single_value("receipt_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
        Call load_data()
    End If
    load_grid()
End Sub
```

`load_data()` sets mode with `identify`:

```vb
Dim identify As String = ""

Public Sub load_data()
    If Receipt_voucher_ID > 0 Then
        identify = "V"
    ElseIf receipt_id > 0 Then
        identify = "R"
    End If
```

---

## Transaction history grid (INVOICE + RECEIPT UNION query by customer_id, order by extra desc)

History is assembled from two queries (invoice + receipt), unioned, and sorted by `extra desc`.

```vb
Public Sub load_grid()
    Call grids1(DataGridView2)
    DataGridView2.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells
    Dim A, B As String
    A = "SELECT tbl_invoice_main.id AS IID, 'INVOICE' AS aaa, FORMAT(tbl_invoice_main.invoice_date, 'dd-MM-yyyy') AS IDATE, tbl_invoice_main.invoice_no AS INO, tbl_invoice_main.checklist_no AS ICHECK, tbl_invoice_main.sub_total - tbl_invoice_main.discount AS ITOTAL, tbl_invoice_main.paid_amount AS IPAID, '-' AS ICHE,tbl_invoice_main.balance AS IBAL, tbl_invoice_main.no as extra,tbl_invoice_main.cr_dr as DDD, '' as ExtraA FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id WHERE (tbl_invoice_main.customer_id='" & customer_id & "')"
    B = "SELECT tbl_receipt.id AS RID, 'RECEIPT' AS RE, FORMAT(tbl_receipt.receipt_date, 'dd-MM-yyyy') AS IDATE, tbl_receipt.receipt_no AS RNO, '-' AS RCHECK, tbl_receipt.amount_received AS RTOTAL," &
        " tbl_receipt.amount_received AS RPAID, tbl_receipt.cheque_no AS RCHE, tbl_receipt.due_amount AS RBAL, tbl_receipt.no as extra, tbl_receipt.cr_dr as DDD1, '' as ExtraB FROM tbl_receipt INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id WHERE (tbl_receipt.customer_id='" & customer_id & "')"
    report_qurty = A & " UNION " & B & " Order by extra desc"
    Call SQL_Query(A & " UNION " & B, " Order by extra desc")
```

---

## Load_data for Voucher (Receipt_voucher_ID > 0) vs Edit (receipt_id > 0)

Voucher mode (`V`) loads from `tbl_customer`; edit mode (`R`) loads receipt + customer join and restores previous values.

```vb
If identify = "V" Then
    Call SQL_Query("SELECT id, customer_name, due_amount FROM tbl_customer", " where id='" & Receipt_voucher_ID & "'")
ElseIf identify = "R" Then
    Call SQL_Query("SELECT tbl_receipt.id, tbl_receipt.receipt_no, " &
                   "tbl_receipt.receipt_date,tbl_receipt.balance, tbl_receipt.customer_id, " &
                   "tbl_customer.customer_name, tbl_customer.due_amount, " &
                   "tbl_receipt.amount_received, tbl_receipt.cheque_no," &
                   "tbl_receipt.pre_load,tbl_receipt.cash,tbl_receipt.cheque,tbl_receipt.other FROM tbl_receipt INNER JOIN tbl_customer " &
                   "ON tbl_receipt.customer_id = tbl_customer.id", " where tbl_receipt.id='" & receipt_id & "'")
End If
```

Voucher branch:

```vb
If identify = "V" Then
    customer_id = ds.Tables(0).Rows(0).Item("id").ToString
    Dim temp As String = get_single_value("ad_due", "tbl_customer", "id", customer_id)
    pre_load_status = temp
    Label4.Text = temp & " Amount"
    customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString
    If temp = "Due" Then
        due_amount.Text = ds.Tables(0).Rows(0).Item("due_amount").ToString
    ElseIf temp = "Advance" Then
        due_amount.Text = "-" & ds.Tables(0).Rows(0).Item("due_amount").ToString
    End If
    k = Val(due_amount.Text)
    load_dua_amount = k
    amount_received.Text = Format(k, "0.00")
    amount_received.Focus()
End If
```

Edit branch:

```vb
ElseIf identify = "R" Then
    last_bal = Val(ds.Tables(0).Rows(0).Item("balance").ToString)
    receipt_no.Text = ds.Tables(0).Rows(0).Item("receipt_no").ToString
    receipt_date.Value = ds.Tables(0).Rows(0).Item("receipt_date").ToString
    customer_id = ds.Tables(0).Rows(0).Item("customer_id").ToString
    customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString
    pre_load_status = ds.Tables(0).Rows(0).Item("pre_load").ToString
    due_amount.Text = ds.Tables(0).Rows(0).Item("due_amount").ToString
    pre_load_amount = Val(ds.Tables(0).Rows(0).Item("due_amount").ToString)
    amount_received.Text = ds.Tables(0).Rows(0).Item("amount_received").ToString
    pre_load_amount_paid = Val(ds.Tables(0).Rows(0).Item("amount_received").ToString)
    cheque_no.Text = ds.Tables(0).Rows(0).Item("cheque_no").ToString
    load_dua_amount = Val(ds.Tables(0).Rows(0).Item("due_amount").ToString)
End If

' Additional checkbox restoration (source lines 204-224):
' Restores cash/cheque/other payment mode checkboxes from saved receipt
cash.Checked = CBool(ds.Tables(0).Rows(0).Item("cash").ToString)
cheque.Checked = CBool(ds.Tables(0).Rows(0).Item("cheque").ToString)
other.Checked = CBool(ds.Tables(0).Rows(0).Item("other").ToString)
End If
```

---

## pre_load_status tracking

`pre_load_status` stores previous balance state and drives both UI and reversal logic.

```vb
Dim pre_load_status As String = ""
Public save_ad_due, cr_dr As String
```

```vb
pre_load_status = temp
Label4.Text = temp & " Amount"
```

```vb
pre_load_status = ds.Tables(0).Rows(0).Item("pre_load").ToString
```

---

## Balance calculation (due_amount, amount_received)

`cal()` recalculates post-receipt balance each time `amount_received` changes.

```vb
Public Sub cal()
    Dim received_amount As Double = load_dua_amount
    If receipt_id > 0 Then
        If pre_load_status = "Advance" Then
            Dim temp As Double = Val(last_bal * -1)
            due_amount.Text = Val(temp - Val(amount_received.Text))
        ElseIf pre_load_status = "Due" Then
            Dim temp As Double = Val(last_bal)
            due_amount.Text = Val(temp - Val(amount_received.Text))
        End If
        If Val(due_amount.Text) > 0 Then
            save_ad_due = "Due"
            cr_dr = "Dr."
        Else
            save_ad_due = "Advance"
            cr_dr = "Cr."
        End If
    Else
        If k > 0 Then
            due_amount.Text = received_amount - Val(amount_received.Text)
        Else
            due_amount.Text = load_dua_amount - Val(amount_received.Text)
        End If
    End If
End Sub

Private Sub amount_received_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles amount_received.TextChanged
    cal()
End Sub
```

---

## cr_dr and ad_due determination based on balance

In save flows, credit/debit (`cr_dr`) and customer status (`ad_due`) are set from comparisons between existing due and entered payment.

```vb
ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
If ad_de = "Advance" Then
    If load_dua_amount = Val(amount_received.Text) Then
        str1 = "Cr."
    ElseIf load_dua_amount > Val(amount_received.Text) Then
        str1 = "Cr."
    ElseIf Val(amount_received.Text) > load_dua_amount Then
        str1 = "Cr."
    End If
ElseIf ad_de = "Due" Then
    If load_dua_amount = Val(amount_received.Text) Then
        str1 = "Dr."
    ElseIf load_dua_amount > Val(amount_received.Text) Then
        str1 = "Dr."
    ElseIf Val(amount_received.Text) > load_dua_amount Then
        str1 = "Cr."
    End If
End If
variable.Add("cr_dr", "'" & str1 & "'")
```

And for `ad_due` updates:

```vb
If ad_de = "Advance" Then
    variable.Add("ad_due", "'Advance'")
ElseIf ad_de = "Due" Then
    If Val(amount_received.Text) > load_dua_amount Then
        variable.Add("ad_due", "'Advance'")
    Else
        variable.Add("ad_due", "'Due'")
    End If
End If
```

---

## Save logic with complex reversal for edit mode

`saved()` has two major branches:
- `receipt_id > 0`: edit mode with reversal-style customer due adjustments based on previous state (`pre_load_status`, `pre_load_amount_paid`, current due), then receipt update.
- else: insert new receipt, update customer due/status, increment `tbl_numbers.receipt_no`.

### Multi-Company Addition

```vb
variable.Add("company_id", "'" & Val(company_cmb.SelectedValue) & "'")
```

Core edit reversal cases:

```vb
If receipt_id > 0 Then
    Dim cur_due_amount, cur_bal_amount As String
    cur_bal_amount = get_single_value("balance", "tbl_receipt", "id", receipt_id)
    cur_due_amount = get_single_value("due_amount", "tbl_customer", "id", customer_id)

    If pre_load_status = "Advance" And save_ad_due = "Advance" Then
        Dim z2 As String = "Update tbl_customer set due_amount='" & Math.Abs(Val(pre_load_amount_paid) - Val(cur_due_amount)) & "' where id='" & customer_id & "'"
        cmd = New SqlCommand(z2, con)
        cmd.ExecuteNonQuery()

        cur_due_amount = get_single_value("due_amount", "tbl_customer", "id", customer_id)
        Dim z3 As String = "Update tbl_customer set due_amount='" & Math.Abs(Val(amount_received.Text) + Val(cur_due_amount)) & "' where id='" & customer_id & "'"
        cmd = New SqlCommand(z3, con)
        cmd.ExecuteNonQuery()

        variable.Add(due_amount.Name, "'" & Math.Abs(Val(due_amount.Text)) & "'")
        Dim k As Integer = SQL_Update("tbl_receipt", variable, " id='" & receipt_id & "'")
        MAKEPDF()
        Exit Sub
    ElseIf pre_load_status = "Due" And save_ad_due = "Due" Then
        Dim z2 As String = "Update tbl_customer set due_amount='" & Math.Abs(Val(pre_load_amount_paid) + Val(cur_due_amount)) & "' where id='" & customer_id & "'"
        cmd = New SqlCommand(z2, con)
        cmd.ExecuteNonQuery()

        cur_due_amount = get_single_value("due_amount", "tbl_customer", "id", customer_id)
        Dim z3 As String = "Update tbl_customer set due_amount='" & Math.Abs(Val(amount_received.Text) - Val(cur_due_amount)) & "' where id='" & customer_id & "'"
        cmd = New SqlCommand(z3, con)
        cmd.ExecuteNonQuery()

        variable.Add(due_amount.Name, "'" & Math.Abs(Val(due_amount.Text)) & "'")
        Dim k As Integer = SQL_Update("tbl_receipt", variable, " id='" & receipt_id & "'")
        MAKEPDF()
        Exit Sub
    Else
        Dim z3 As String = "Update tbl_customer set due_amount='" & Math.Abs(Val(due_amount.Text)) & "' where id='" & customer_id & "'"
        cmd = New SqlCommand(z3, con)
        cmd.ExecuteNonQuery()
        variable.Add(due_amount.Name, "'" & Math.Abs(Val(due_amount.Text)) & "'")

        If save_ad_due = "Advance" Then
            variable.Add("cr_dr", "'Cr.'")
            variable.Add("pre_load", "'Advance'")
            Dim k As Integer = SQL_Update("tbl_receipt", variable, " id='" & receipt_id & "'")
            variable.Clear()
            variable.Add("ad_due", "'Advance'")
        ElseIf save_ad_due = "Due" Then
            variable.Add("cr_dr", "'Dr.'")
            variable.Add("pre_load", "'Due'")
            Dim k As Integer = SQL_Update("tbl_receipt", variable, " id='" & receipt_id & "'")
            variable.Clear()
            variable.Add("ad_due", "'Due'")
        End If

        Dim k1 As Integer = SQL_Update("tbl_customer", variable, " id='" & customer_id & "'")
        MAKEPDF()
        Exit Sub
    End If
Else
    ' INSERT NEW RECEIPT path (source lines 597-682):
    ' 1. Build variable with all receipt fields
    variable.Add("company_id", "'" & Val(company_cmb.SelectedValue) & "'")
    ' 2. cr_dr/ad_due determination based on customer balance:
    '    ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
    '    If ad_de = "Advance" Then: str1 = "Cr." (always)
    '    If ad_de = "Due" Then:
    '      If load_dua_amount = amount_received → str1 = "Dr."
    '      If load_dua_amount > amount_received → str1 = "Dr."
    '      If amount_received > load_dua_amount → str1 = "Cr."
    ' 3. ad_due update in variable:
    '    If ad_de = "Advance" → ad_due = "Advance"
    '    If ad_de = "Due" → if amount_received > load_dua_amount → ad_due = "Advance" else "Due"
    ' 4. Payment method flags: cash/cheque/other CheckBox states
    ' 5. UPDATE tbl_customer with new due_amount and ad_due
    ' 6. Increment tbl_numbers.receipt_no
    ' 7. MAKEPDF()
    ' 8. Set Receipt_voucher_ID = 0
    Dim d As Integer = SQL_Insert("tbl_receipt", variable)
    variable.Clear()
    variable.Add("receipt_no", "'" & Val(receipt_no.Text) + 1 & "'")
    SQL_Update("tbl_numbers", variable, " id='" & get_max_number("id", "tbl_numbers") & "'")
    receipt_id = get_max_number("id", "tbl_receipt")
    MAKEPDF()
End If
```

---

## Database Schema

### tbl_receipt

```sql
CREATE TABLE tbl_receipt (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    receipt_no VARCHAR(50),
    receipt_date DATE,
    customer_id BIGINT,
    company_id BIGINT DEFAULT 1,        -- Multi-company support
    due_amount NUMERIC(18,2),
    amount_received NUMERIC(18,2),
    cheque_no VARCHAR(200),
    no VARCHAR(MAX),
    balance NUMERIC(18,2),
    cr_dr VARCHAR(100),
    invoice_no VARCHAR(100),
    pre_load VARCHAR(100),
    cash VARCHAR(100) DEFAULT '0',
    cheque VARCHAR(100) DEFAULT '0',
    other VARCHAR(100) DEFAULT '0'
)
```