# Outstanding Module — Implementation Details

## Purpose
Document the actual calculation formulas, state transitions, edge cases, and business logic for customer balance tracking and receipt management.

---

## Core Concept: Balance Ledger

The system tracks a customer's **outstanding balance** (how much they owe or are owed). This is a running total that gets updated by:
- **Invoice** → increases balance (creates receivable)
- **Receipt** → decreases balance (payment received)

### Customer Fields
```
due_amount: Numeric(18,2) — current outstanding amount (always positive)
ad_due: Varchar(100) — "Due" (customer owes us) | "Advance" (we owe customer) | "" (settled)
```

---

## Balance Update Rules

### Invoice Creates Balance
When invoice is saved:
```vb
' CASH mode:
due_amount = total - paid_amount    ' partial payment reduces balance

' CREDIT mode:
due_amount = total                  ' full amount is outstanding
```

The invoice's `cr_dr` field tracks direction:
- `"Cr."` = was added to receivable
- `"Dr."` = was subtracted (overpayment scenario)

### Invoice Edit: Delta Calculation
```vb
' Get current customer balance
Dim oldDueAmt = get_single_value("due_amount", "tbl_customer", "id", customer_id)

' Calculate new balance
' Subtract old invoice effect, add new invoice effect
Dim newDueAmt = Val(oldDueAmt) - Val(old_sub_total) + Val(total_amt)

' Apply
m1 = "UPDATE tbl_customer SET due_amount='" & Val(newDueAmt) & "' WHERE id='" & customer_id & "'"
```

### Invoice Delete: Reversal
```vb
Dim cr_dr = DataGridView1.SelectedRows(0).Cells(8).Value

If cr_dr = "Cr." Then
    final_amt = cur_due_amount + entry_due_amount   ' was added, so add back
ElseIf cr_dr = "Dr." Then
    final_amt = cur_due_amount - entry_due_amount   ' was subtracted, so subtract
End If

SQL_Update("tbl_customer", {"due_amount": final_amt}, "id=" & customer_id)
```

---

## Receipt Voucher Flow

### From ListOutStanding → Receipt Voucher
```vb
Private Sub BtnReceiptVoucher_Click(...)
    receipt_id = 0
    Receipt_voucher_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    load_dua_amount = Val(DataGridView1.SelectedRows(0).Cells(2).Value)
    
    Add_Edit_Receipt.ShowDialog()
End Sub
```

This opens Add_Edit_Receipt with:
- `Receipt_voucher_ID > 0` — tells form to load customer data
- `load_dua_amount` — pre-fills the due amount

### In Add_Edit_Receipt Load
```vb
If Receipt_voucher_ID > 0 Then
    ' Load customer for this receipt
    Call SQL_Query("SELECT id, customer_name, due_amount FROM tbl_customer" &
                   " where id='" & Receipt_voucher_ID & "'")
    
    customer_id = ds.Tables(0).Rows(0).Item("id").ToString
    customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString
    
    pre_load_status = get_single_value("ad_due", "tbl_customer", "id", customer_id)
    Label4.Text = pre_load_status & " Amount"
    
    Dim temp = pre_load_status
    If temp = "Due" Then
        due_amount.Text = ds.Tables(0).Rows(0).Item("due_amount").ToString
    ElseIf temp = "Advance" Then
        due_amount.Text = "-" & ds.Tables(0).Rows(0).Item("due_amount").ToString
    End If
    
    k = Val(due_amount.Text)       ' Save as previous value
    load_dua_amount = k            ' Set global for calc
    amount_received.Text = Format(k, "0.00")  ' Pre-fill with full due amount
    amount_received.Focus()
End If
```

---

## Receipt Calculation — `cal()` Function

```vb
Public Sub cal()
    Dim received_amount As Double = load_dua_amount

    If receipt_id > 0 Then
        ' Editing existing receipt
        If pre_load_status = "Advance" Then
            Dim temp As Double = Val(last_bal * -1)
            due_amount.Text = Val(temp - Val(amount_received.Text))
        ElseIf pre_load_status = "Due" Then
            Dim temp As Double = Val(last_bal)
            due_amount.Text = Val(temp - Val(amount_received.Text))
        End If
        
        ' Determine new status
        If Val(due_amount.Text) > 0 Then
            save_ad_due = "Due"
            cr_dr = "Dr."
        Else
            save_ad_due = "Advance"
            cr_dr = "Cr."
        End If
    Else
        ' New receipt
        If k > 0 Then
            due_amount.Text = received_amount - Val(amount_received.Text)
        Else
            due_amount.Text = load_dua_amount - Val(amount_received.Text)
        End If
    End If
End Sub
```

### Formula
```
new_due = load_dua_amount - amount_received
```

### Example Scenarios

| load_dua_amount | amount_received | new_due | ad_due |
|-----------------|-----------------|---------|--------|
| 1000 | 1000 | 0 | "" (settled) |
| 1000 | 500 | 500 | "Due" |
| 1000 | 1500 | -500 | "Advance" |
| -500 (advance) | 500 | 0 | "" (settled) |

---

## Receipt Save Logic — `saved()` Function

### New Receipt (receipt_id = 0)

```vb
' 1. Calculate new balance
Dim new_balance = load_dua_amount - Val(amount_received.Text)

' 2. Determine cr_dr and ad_due
If new_balance > 0 Then
    cr_dr = "Dr."
    ad_due = "Due"
ElseIf new_balance < 0 Then
    cr_dr = "Cr."
    ad_due = "Advance"
Else
    cr_dr = ""
    ad_due = ""
End If

' 3. Build receipt record
Dim variable As New Dictionary(Of String, String)
variable.Add("receipt_no", "'" & receipt_no.Text & "'")
variable.Add("receipt_date", "'" & Format(receipt_date.Value, "dd-MMM-yyyy") & "'")
variable.Add("customer_id", "'" & customer_id & "'")
variable.Add("due_amount", "'" & Math.Abs(Val(due_amount.Text)) & "'")
variable.Add("amount_received", "'" & Val(amount_received.Text) & "'")
variable.Add("cheque_no", "'" & cheque_no.Text & "'")
variable.Add("balance", "'" & Math.Abs(k) & "'")
variable.Add("cr_dr", "'" & cr_dr & "'")
variable.Add("invoice_no", "'" & GLOBLE_INVOICE_NO & "'")
variable.Add("pre_load", "'" & pre_load_status & "'")
variable.Add("cash", "'1'")  ' If checkbox checked

' 4. Insert receipt
SQL_Insert("tbl_receipt", variable)
receipt_id = get_max_number("id", "tbl_receipt")

' 5. Update customer balance
Dim f = SQL_Update("tbl_customer", {
    "due_amount": Math.Abs(Val(due_amount.Text)),
    "ad_due": "'" & ad_due & "'"
}, "id=" & customer_id)

' 6. Update sequence number
variable.Clear()
variable.Add("receipt_no", "'" & Val(receipt_no.Text) + 1 & "'")
SQL_Update("tbl_numbers", variable, "id=" & get_max_number("id", "tbl_numbers"))
```

### Edit Receipt (receipt_id > 0)

**Complex logic for updating existing receipt:**

```vb
If pre_load_status = "Advance" And save_ad_due = "Advance" Then
    ' Customer had advance, now paying more
    ' 1. Reverse previous receipt's effect
    z2 = "UPDATE tbl_customer SET due_amount='" & 
        Math.Abs(Val(pre_load_amount_paid) - Val(cur_due_amount)) & "' WHERE id='" & customer_id & "'"
    cmd = New SqlCommand(z2, con)
    cmd.ExecuteNonQuery()
    
    ' 2. Add new receipt amount
    z3 = "UPDATE tbl_customer SET due_amount='" & 
        Math.Abs(Val(amount_received.Text) + Val(cur_due_amount)) & "' WHERE id='" & customer_id & "'"
    cmd = New SqlCommand(z3, con)
    cmd.ExecuteNonQuery()
    
ElseIf pre_load_status = "Due" And save_ad_due = "Due" Then
    ' Customer had due, now paying more
    z2 = "UPDATE tbl_customer SET due_amount='" & 
        Math.Abs(Val(pre_load_amount_paid) + Val(cur_due_amount)) & "' WHERE id='" & customer_id & "'"
    cmd = New SqlCommand(z2, con)
    cmd.ExecuteNonQuery()
    
    z3 = "UPDATE tbl_customer SET due_amount='" & 
        Math.Abs(Val(amount_received.Text) - Val(cur_due_amount)) & "' WHERE id='" & customer_id & "'"
    cmd = New SqlCommand(z3, con)
    cmd.ExecuteNonQuery()

Else
    ' Status changed (Due → Advance or vice versa)
    ' Simple update
    z3 = "UPDATE tbl_customer SET due_amount='" & 
        Math.Abs(Val(due_amount.Text)) & "' WHERE id='" & customer_id & "'"
    cmd = New SqlCommand(z3, con)
    cmd.ExecuteNonQuery()
    
    ' Update receipt with new status
    If save_ad_due = "Advance" Then
        variable.Add("cr_dr", "'Cr.'")
        variable.Add("pre_load", "'Advance'")
    ElseIf save_ad_due = "Due" Then
        variable.Add("cr_dr", "'Dr.'")
        variable.Add("pre_load", "'Due'")
    End If
End If

' Update receipt record
SQL_Update("tbl_receipt", variable, "id=" & receipt_id)

' Update customer
SQL_Update("tbl_customer", {
    "ad_due": "'" & ad_due & "'"
}, "id=" & customer_id)
```

---

## Receipt Delete — Reversal

**Location:** `View_List_of_Receipt.vb` — `Button3_Click`

**IMPORTANT:** Delete removes the receipt row but does NOT adjust customer balance. This is different from invoice delete which does reverse balance.

```vb
Private Sub Button3_Click(...)
    If DataGridView1.Rows.Count = 0 Then
        MsgBox("No Receipt Selected", MsgBoxStyle.Critical)
        Exit Sub
    End If
    receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
    Dim ask As String
    ask = MsgBox("Are You Sure Want to Delete Receipt?", vbQuestion + vbYesNo)
    If ask = "6" Then
        ' Delete receipt row only (no balance adjustment)
        Call SQL_Delete("tbl_receipt", " id='" & receipt_id & "'")
        MsgBox("Receipt Successfully Deleted.", vbInformation)
        Call load_grid_sql()
    End If
    load_grid_sql()
    DataGridView1.Focus()
End Sub
```

Note: Unlike invoice delete, receipt delete does NOT reverse the customer's due_amount. The balance remains as-is after deletion.

---

## Payment Mode Tracking

Receipts can be split across payment types:

```vb
' Checkboxes in receipt form
' NOTE: Unchecked boxes are NOT added to the dictionary at all
If cash.Checked = True Then
    variable.Add("cash", "'1'")
End If

If cheque.Checked = True Then
    variable.Add("cheque", "'1'")
    ' cheque_no field enabled for entering check number
End If

If other.Checked = True Then
    variable.Add("other", "'1'")
End If
```

Labels for these fields come from tbl_setting:
```vb
cash.Text = get_single_value("cash", "tbl_setting", "id", 1)   ' e.g., "Cash"
cheque.Text = get_single_value("cheque", "tbl_setting", "id", 1) ' e.g., "Cheque"
other.Text = get_single_value("other", "tbl_setting", "id", 1)   ' e.g., "Other"
```

---

## Transaction History Grid

In Add_Edit_Receipt, a grid shows customer's invoice/receipt history:

```sql
-- Invoices for this customer
SELECT 
    tbl_invoice_main.id AS IID, 'INVOICE' AS aaa,
    FORMAT(tbl_invoice_main.invoice_date, 'dd-MM-yyyy') AS IDATE,
    tbl_invoice_main.invoice_no AS INO,
    tbl_invoice_main.checklist_no AS ICHECK,
    tbl_invoice_main.sub_total - tbl_invoice_main.discount AS ITOTAL,
    tbl_invoice_main.paid_amount AS IPAID, '-' AS ICHE,
    tbl_invoice_main.balance AS IBAL,
    tbl_invoice_main.no AS extra, tbl_invoice_main.cr_dr AS DDD,
    '' AS ExtraA
FROM tbl_invoice_main
INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id
WHERE tbl_invoice_main.customer_id = '{customer_id}'

UNION

-- Receipts for this customer
SELECT 
    tbl_receipt.id AS RID, 'RECEIPT' AS RE,
    FORMAT(tbl_receipt.receipt_date, 'dd-MM-yyyy') AS IDATE,
    tbl_receipt.receipt_no AS RNO, '-' AS RCHECK,
    tbl_receipt.amount_received AS RTOTAL,
    tbl_receipt.amount_received AS RPAID,
    tbl_receipt.cheque_no AS RCHE,
    tbl_receipt.due_amount AS RBAL,
    tbl_receipt.no AS extra, tbl_receipt.cr_dr AS DDD1,
    '' AS ExtraB
FROM tbl_receipt
INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id
WHERE tbl_receipt.customer_id = '{customer_id}'

ORDER BY extra DESC
```

### WHY: Order by `no` (timestamp field)
The `no` field contains a Unix timestamp (generated in `time_count()`):
```vb
Public Sub time_count()
    Dim result As Double
    result = DateDiff("s", CDate("1970-1-1 12:00:00 AM"), Now)
    Dim tempStr As String
    tempStr = Strings.Format$(Now, "yyyy-MM-dd HH:mm:ss.SSS")
    Dim strTime() As String
    strTime = Strings.Split(tempStr, ".")
    result = result * 1000 + Val(strTime(UBound(strTime)))
    tot_time = result
End Sub
```

This creates a **chronological ledger** of all transactions sorted by time.

---

## PDF Generation Path

```vb
Dim quot_path1 = get_single_value("report_path", "tbl_setting", "id", 
    get_max_number("id", "tbl_setting"))
Dim iMonth = Month(receipt_date.Value)
folder_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name

Directory.CreateDirectory(folder_path)

Dim file_name = "PAY" & get_single_value("receipt_no", "tbl_receipt", "id", receipt_id) & "-" & customer_name.Text
pdf_path = folder_path & "\" & file_name & ".pdf"
```

### Path Structure
```
{report_path}/
  Receipt/
    May-2026/
      Mr John Smith/
        PAY001-Mr John Smith.pdf
      Ms Jane Doe/
        PAY002-Ms Jane Doe.pdf
```

---

## ListOutStanding — Query

```sql
SELECT 
    id,
    LTRIM(title_name + ' ' + customer_name) AS Expr1,
    due_amount,
    ad_due AS Status,
    customer_type
FROM tbl_customer
WHERE due_amount > 0
  AND customer_name LIKE '%{find}%'
ORDER BY customer_name
```

### Display Logic
```vb
For i = 0 To ds.Tables(0).Rows.Count - 1
    Dim temp As Double = Val(ds.Tables(0).Rows(i).ItemArray(2).ToString.Replace(",", ""))
    
    If ds.Tables(0).Rows(i).ItemArray(3).ToString = "Advance" Then
        .Rows(i).Cells(2).Value = "-" & Format(temp, "0.00")
        tot = tot - temp    ' subtract from total
    Else
        tot = tot + temp    ' add to total
    End If
Next

' Color coding
If .Rows(i).Cells("Status").Value = "Advance" Then
    .Rows(i).Cells("Status").Style.ForeColor = Color.Green
ElseIf .Rows(i).Cells("Status").Value = "Due" Then
    .Rows(i).Cells("Status").Style.ForeColor = Color.Red
End If
```

---

## Cr_Dr Meaning in Receipts

| cr_dr | Meaning | Effect |
|-------|---------|--------|
| "Cr." | Credit — customer paid too much / has advance | Reduces receivable |
| "Dr." | Debit — customer owes us | Increases receivable |

This is the inverse of accounting convention (debit = increase, credit = decrease) — here adapted for customer perspective:
- If customer has **advance** (we owe them), it's "Cr." to our receivable
- If customer has **due** (they owe us), it's "Dr." to their payable

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| customer_name | Must be selected | "Please Select Customer Name" |
| amount_received | Must be > 0 | "Please Enter Received Amount" |

---

## Receipt Voucher vs Manual Receipt

| Aspect | Receipt Voucher | Manual New Receipt |
|--------|-----------------|-------------------|
| Entry point | ListOutStanding → button | Outstanding → New Receipt button |
| customer_id | Pre-loaded from selection | Must select |
| load_dua_amount | Pre-loaded with due | Calculated from customer |
| receipt_id | 0 | 0 |
| Receipt_voucher_ID | Set to selected customer | 0 |