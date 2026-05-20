# Invoice Module — Implementation Details

> **Multi-Company Support Added:** `company_id` column on `tbl_invoice_main`.

## Purpose

Document the actual calculation formulas, state transitions, edge cases, and business logic behind the invoice module for replication.

### Important: Two Save Functions Exist
- **`saved()`** (lines 1232-1497): Primary save function used by all button handlers (Button1/Button4/Button6). Use this as the reference.
- **`saved1()`** (lines 981-1229): Parallel legacy save function with broken delete logic (`contain_id` is Double, not String). **Do NOT use as reference.**

---

## Multi-Company Support

### Company Selection

A **company ComboBox** is added at the form header, next to or above the customer selection.

**UI Placement:**
```
┌─────────────────────────────────────────────────────────────┐
│  Company: [X-Press Ironing Ltd ▼]     Customer: [________] │
│                                    Invoice No: [____]       │
│  Checklist No: [____]   Date: [___]   CASH ○  CREDIT ○      │
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

**Edit Mode:**
- If invoice has line items, disable company change
- If invoice has no line items, allow company change
```vb
Private Sub ValidateCompanyChange()
    If DataGridView2.Rows.Count > 1 Then
        MsgBox("Cannot change company when line items exist.", vbExclamation)
        company_cmb.Enabled = False
    Else
        company_cmb.Enabled = True
    End If
End Sub
```

---

## Calculation Engine — `cal()` Function

### Formula Chain

```
row_total = qty × unit_price

sub_total = Σ(row_total) for all visible rows

vat = sub_total × (vat_per / 100)

IF per > 0 THEN
    discount = (sub_total + vat) × (per / 100)     ← discount is % of (sub + vat)
ELSE
    discount = 0

total = (new_tot + vat) - discount    ← new_tot is sub_total adjusted by advance/due (NOT raw sub_total)
           ↑
           new_tot computed BEFORE vat/discount:
             IF Label8 = "Advance Amount" THEN
                 new_tot = sub_total - |amount_due|            ← subtract existing advance
             IF Label8 = "Due Amount" THEN
                 new_tot = sub_total + |amount_due|            ← add existing due
```

### Invoice `cal()` — Full Source
```vb
Public Sub cal()
    With DataGridView2
        Dim total As Double = 0
        Dim temp As Double = 0

        ' 1. Calculate row totals from visible rows
        For i = 0 To .Rows.Count - 1
            If .Rows(i).Visible = True Then
                Dim QTY As Double = Val(.Rows(i).Cells(2).Value)
                .Rows(i).Cells(2).Value = Format(QTY, "0.00")
                temp = Val(Val(.Rows(i).Cells(2).Value) * Val(.Rows(i).Cells(3).Value))
                .Rows(i).Cells(4).Value = Format(temp, "0.00")
                temp = Val(.Rows(i).Cells(3).Value)
                .Rows(i).Cells(3).Value = Format(temp, "0.00")
                total = total + Val(.Rows(i).Cells(4).Value)
            End If
        Next
        sub_total.Text = Format(total, "0.00")

        ' 2. Apply advance/due adjustment
        Dim new_tot As Double = 0
        If Label8.Text = "Advance Amount" Then
            Dim t As Double = Val(amount_due.Text) * -1
            new_tot = Val(sub_total.Text) + Val(t)       ' subtract advance
        ElseIf Label8.Text = "Due Amount" Then
            new_tot = Math.Abs(Val(sub_total.Text) + Val(amount_due.Text))  ' add due
        End If

        ' 3. Calculate VAT
        Dim vat_per1, vat1 As Double
        vat_per1 = Val(vat_per.Text)
        vat1 = Math.Abs(Val(Val(sub_total.Text) * vat_per1) / 100)
        vat.Text = Format(vat1, "0.00")

        ' 4. Calculate discount (% of sub_total + vat)
        If Val(per.Text) = 0 Then
            ' No discount percentage — discount field disabled
        Else
            ' Discount is percentage of (sub_total + vat)
            discount.Text = Format(Val(Val(sub_total.Text) + vat1) * Val(per.Text) / 100, "0.00")
            discount.Text = Format(Val(discount.Text), "0.00")
        End If

        ' 5. Final total
        total_amt.Text = Format((new_tot + vat1) - Val(discount.Text), "0.00")
        total_amt.Text = Format(Val(total_amt.Text), "0.00")
        new_AMOUNT = total_amt.Text
    End With
End Sub
```

### WHY: Discount Applied to (sub_total + vat)
The discount percentage applies to the **taxable amount (sub_total + vat)**, not just sub_total. This is standard tax-inclusive discount treatment — the discount reduces both the base amount and the VAT liability proportionally.

### Quotation `cal()` — Diff from Invoice
```vb
' Quotation does NOT have advance/due adjustment:
new_tot = Val(sub_total.Text)    ' no adjustment

' Discount calculation is identical:
discount.Text = Format(Val(Val(Val(new_tot + vat1) * Val(per.Text)) / 100), "0.00")
```

---

## CASH vs CREDIT State Machine

### CASH Mode
- `paid_amount` field is **enabled**
- Customer can pay partial amount at time of invoice
- Customer balance INCREASES by `total` (full invoice value as receivable)
- `paid_amount` stored separately (can be less than total)
- `balance = total - paid_amount`
- `cr_dr = "Cr."` (increases receivable)
- `ad_due` determined by comparing total vs paid:

```vb
If ad_de = "Advance" Then
    If Val(total_amt) = Val(paid_amount) Then
        ad_due = "Due";      cr_dr = "Dr."
    ElseIf Val(total_amt) > Val(paid_amount) Then
        ad_due = "Advance";  cr_dr = "Cr."
    ElseIf Val(paid_amount) > Val(total_amt) Then
        ad_due = "Advance";  cr_dr = "Cr."
    End If
ElseIf ad_de = "Due" Then
    If Val(total_amt) = Val(paid_amount) Then
        ad_due = "Due";      cr_dr = "Dr."
    ElseIf Val(total_amt) > Val(paid_amount) Then
        ad_due = "Due";      cr_dr = "Dr."
    ElseIf Val(paid_amount) > Val(total_amt) Then
        ad_due = "Advance";  cr_dr = "Cr."
    End If
End If
```

### CREDIT Mode
- `paid_amount` field is **disabled**, set to 0
- Full amount is due (no partial payment)
- Customer balance INCREASES by `total`
- `balance = total` (full amount outstanding)
- `cr_dr` has conditional logic (see full table below), NOT always "Cr."

### CREDIT Mode cr_dr Table (lines 1077-1098, 1328-1349 in `saved()`):

| ad_de | sub_total vs amount_due | Result |
|-------|--------------------------|--------|
| "Advance" | sub_total = amount_due | ad_due="Advance", cr_dr="Cr." |
| "Advance" | sub_total > amount_due | ad_due="Due", cr_dr="Dr." |
| "Advance" | amount_due > sub_total | ad_due="Advance", cr_dr="Cr." |
| "Due" | sub_total = amount_due | ad_due="Due", cr_dr="Dr." |
| "Due" | sub_total > amount_due | ad_due="Due", cr_dr="Dr." |
| "Due" | amount_due > sub_total | ad_due="Due", cr_dr="Cr." |

> **Note:** Spec previously said CREDIT always sets `cr_dr = "Cr."` — this was oversimplified. The actual code uses `sub_total` vs `amount_due` comparison (vs CASH which uses `total` vs `paid_amount`).

### CR_DR Meaning
- `"Cr."` = Credit (customer owes us) — amount added to receivable
- `"Dr."` = Debit (customer overpaid / we owe customer) — reduces receivable

### Edge Case: Overpayment
If customer pays MORE than invoice total (paid_amount > total):
- Excess goes to `ad_due = "Advance"` (credit to customer's account)
- `cr_dr = "Cr."` — amount goes to advance, not receivable

---

## Customer Balance Update Logic

### On Invoice Save (Create New)

**CASH mode (new invoice):**
```vb
' Reverse old paid amount, then apply new
m1 = "UPDATE tbl_customer SET due_amount='" & Math.Abs(Val(total_amt) + Val(temp_paid_amount)) & "' WHERE id='" & customer_id & "'"
' Then apply new paid amount
m1 = "UPDATE tbl_customer SET due_amount='" & Math.Abs(Val(total_amt) - Val(paid_amount)) & "' WHERE id='" & customer_id & "'"
```
**Result:** `due_amount = total - paid_amount`

**CREDIT mode (new invoice):**
```vb
m1 = "UPDATE tbl_customer SET due_amount='" & Math.Abs(Val(total_amt)) & "' WHERE id='" & customer_id & "'"
```
**Result:** `due_amount = total` (full amount as receivable)

### On Invoice Edit

**CASH mode (edit):**
```vb
' Get current balance
Dim oldDueAmt = get_single_value("due_amount", "tbl_customer", "id", customer_id)
' Reverse previous invoice's effect, add new effect
Dim newDueAmt = Val(oldDueAmt) - Val(old_sub_total) + Val(total_amt)
m1 = "UPDATE tbl_customer SET due_amount='" & Val(newDueAmt) & "' WHERE id='" & customer_id & "'"
```
**Result:** `due_amount = old_balance - old_invoice_total + new_invoice_total`

**CREDIT mode (edit):**
```vb
Dim oldDueAmt = get_single_value("due_amount", "tbl_customer", "id", customer_id)
Dim newDueAmt = Val(oldDueAmt) - Val(old_sub_total) + Val(total_amt)
m1 = "UPDATE tbl_customer SET due_amount='" & Val(newDueAmt) & "' WHERE id='" & customer_id & "'"
```
**Result:** Same formula — subtract old invoice, add new invoice

### On Invoice Delete — Reversal

```vb
Dim cur_due_amount = get_single_value("due_amount", "tbl_customer", "id", customer_id)
Dim entry_due_amount = Val(DataGridView1.SelectedRows(0).Cells(7).Value)
Dim cr_dr = DataGridView1.SelectedRows(0).Cells(8).Value   ' "Cr." or "Dr."

Dim final_amt As Double
If cr_dr = "Cr." Then
    final_amt = Val(cur_due_amount) + Val(entry_due_amount)   ' was added, so add back
ElseIf cr_dr = "Dr." Then
    final_amt = Val(cur_due_amount) - Val(entry_due_amount)   ' was subtracted, so subtract
End If
SQL_Update("tbl_customer", {"due_amount": Val(final_amt)}, "id=" & customer_id)
SQL_Delete("tbl_invoice_main", "id=" & invoice_id)
SQL_Delete("tbl_invoice_sub", "main_id=" & invoice_id)
```

### WHY: cr_dr Controls Reversal Direction
- If invoice had `cr_dr = "Cr."` (increased receivable), deleting it adds the amount back
- If invoice had `cr_dr = "Dr."` (decreased receivable/overpayment), deleting it subtracts the amount

---

## Ad_Due (Advance/Due) Status Logic

`ad_due` on customer record determines display and affects calculations:

| ad_due | Meaning | Effect on Invoice calc() |
|--------|---------|--------------------------|
| "Advance" | Customer overpaid / credit balance | `copy_dua_amount = -due_amount` (negative) |
| "Due" | Customer owes money | `copy_dua_amount = due_amount` (positive) |
| "" | Settled | No adjustment |

When a new invoice is created:
1. Read customer's current `due_amount` and `ad_due`
2. Set Label8 = ad_due + " Amount" (e.g., "Due Amount")
3. Pre-fill `amount_due` with customer's outstanding balance
4. After invoice save, `ad_due` may change based on totals

### Edge Case: Settling Old Balance
If `ad_due = "Due"` and invoice total equals existing due:
- New `ad_due = "Due"` (still due, but now for new amount)
- Balance is updated to new total

---

## Line Item Grid — Delete Row Logic

### Keyboard: Ctrl+D
```vb
If (e.KeyCode = Keys.D And e.Modifiers = Keys.Control) Then
    c_row = .CurrentCell.RowIndex
    ' Soft delete: mark hidden, hide row
    DataGridView2.Rows(c_row).Visible = False
    DataGridView2.Rows(c_row).Cells("IsDeleted").Value = "Yes"
    ' Recalculate
    load_sr()
    cal()
    ' Focus next available cell
    SetNextAvailableCell(DataGridView2, curRowIndex, curColIndex)
End If
```

### On Save — Process Deleted Rows

**⚠️ CORRECTION — Two save paths exist:**

**Path 1: `saved()` (primary, used by all save buttons) — inline visibility check:**
```vb
' In the grid loop within saved() (lines 1436-1469):
For i = 0 To .Rows.Count - 1
    If .Rows(i).Visible = True Then
        ' ... process visible rows
    Else
        ' Hidden row — check IsDeleted flag
        If .Rows(i).Cells("IsDeleted").Value = "Yes" Then
            Dim mainRowId As Long = Val(.Rows(i).Cells("Id").Value)
            Dim m As String = "delete from tbl_invoice_sub where id='" & mainRowId & "'"
            cmd = New SqlCommand(m, con)
            cmd.ExecuteNonQuery()
        End If
    End If
Next
```
> **This is the WORKING approach.** Uses `IsDeleted = "Yes"` flag check inline in the same loop that processes rows.

**Path 2: `saved1()` — contain_id approach (BROKEN/DEAD CODE):**
```vb
' Lines 1213-1228 in saved1() — contain_id is declared as Double (=0), not String.
' The append logic was commented out at line 748.
' LineOfText = contain_id → "0".Split(",") → deletes only id=0, no real effect.
' This approach does not work as described.
```
> **Do NOT use `saved1()` logic for row deletion.** Use the `saved()` inline approach instead.

### Row Visibility Check in cal()
```vb
For i = 0 To .Rows.Count - 1
    If .Rows(i).Visible = True Then   ' ← skip hidden rows
        ' ... calculate
    End If
Next
```

---

## Invoice Number Auto-Increment

```vb
invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id", 
    get_max_number("id", "tbl_numbers"))

' On save (new invoice):
invoice_no = Val(invoice_no.Text)
' ... insert invoice ...
q = "UPDATE tbl_numbers SET invoice_no='" & Val(invoice_no) + 1 & "' WHERE id='" & 
    get_max_number("id", "tbl_numbers") & "'"
cmd = New SqlCommand(q, con)
cmd.ExecuteNonQuery()
```

Single source of truth for invoice numbers. If two users open "new invoice" simultaneously, both get same number until one saves.

---

## Edit Window Restriction

```vb
Dim days As Integer = (old_date - temp_date).Days
Dim edit_days As String = get_single_value("invoice_days", "tbl_setting", "id",
    get_max_number("id", "tbl_setting"))
If edit_days < days Then
    ' Force new invoice number (prevents gap in numbering)
    invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id",
        get_max_number("id", "tbl_numbers"))
    tmp_invoice_id = 0   ' Treat as new invoice
    ' Reset date only if unchanged (preserve intentional date edits):
    If old_invoice_date.Date = invoice_date.Value Then
        invoice_date.Value = Date.Now
    End If
    cal()
End If
```

**WHY:** Prevents editing invoices older than X days (configured in settings). If allowed, forces a new invoice number to avoid gaps in the sequence.

---

## PDF Generation Path Logic

```vb
Dim quot_path1 = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))  ' NOTE: capital "I", NOT lowercase
Dim iMonth = Month(invoice_date.Value)
folder_path = quot_path1 & "\" & MonthName(iMonth)  ' e.g., "D:\Invoices\May"

Directory.CreateDirectory(folder_path)

Dim file_name = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", tmp_invoice_id) & "-" & user_name  ' NOTE: looks up from DB after save, not local variable
Dim pdf_path = folder_path & "\" & file_name & ".pdf"
```
'e.g., "D:\Invoices\May\INV001-Mr John Smith.pdf"
```

### Path Structure
```
{invoice_path}/
  May-2026/
    INV001-Mr John Smith.pdf
    INV002-Ms Jane Doe.pdf
  June-2026/
    INV003-...
```

### Company-Specific Path (Optional Enhancement)
```vb
Dim companyCode = company_cmb.SelectedValue
folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & companyCode
' e.g., "D:\Invoices\May\XPI\"
```

### user_name Construction
```vb
Dim title = get_single_value("title_name", "tbl_customer", "id", customer_id)
' title = "Mr" / "Mrs" / "Ms" / etc.
user_name = title & " " & customer_name.Text
' e.g., "Mr John Smith"
```

---

## Invoice → From Quotation Flow

When double-clicking quotation in View_Quotation:

```vb
Quotation_To_Invoice_ID = DataGridView1.SelectedRows(0).Cells(0).Value
' Opens Add_Edit_Invoice with quotation data pre-loaded
```

In `Add_Edit_Invoice.load_data()`:
```vb
If Quotation_To_Invoice_ID > 0 Then
    identify = "Quotation"
    ' Load quotation main data (quo_date, customer_id, etc.)
    ' Load quotation sub items (products, qty, prices)
    ' Pre-fill customer from quotation
    invoice_date.Value = Today  ' Override to current date
    ' User edits, then saves → creates NEW invoice
    ' (tmp_invoice_id = 0, so INSERT not UPDATE)
End If
```

**Key:** The quotation data populates the invoice form, but on save it creates a **new invoice** (not updating the quotation). The quotation remains in the system.

---

## Grid Column Structure

| Col Index | Name | Purpose | Notes |
|-----------|------|---------|-------|
| 0 | SrNo | Line number | Auto-calculated, visible rows only |
| 1 | ItemName | Product name | Read-only, selected via search |
| 2 | Qty | Quantity | Editable, default 1 |
| 3 | UnitPrice | Price per unit | Read-only, from product |
| 4 | Total | qty × price | Calculated, read-only |
| 5 | ItemId | Product FK | Hidden |
| 6 | Id | Invoice_sub PK | Hidden, 0 for new rows |
| 7 | IsDeleted | Soft delete flag | Hidden, "Yes" for deleted |

---

## Search Overlay Pattern

Same pattern used for customer and product search:

```
1. User types in main TextBox
2. Hidden overlay TextBox (txt_search) captures keystrokes
3. DataGridView overlay shows filtered results
4. Enter/Double-click selects → populates main fields
5. Escape hides overlay
```

### Customer Search Query
```sql
SELECT id, customer_name
FROM tbl_customer
WHERE customer_name LIKE '%{search}%'
   OR telephone LIKE '%{search}%'
   OR contact LIKE '%{search}%'
   OR address LIKE '%{search}%'
ORDER BY customer_name
```

### Product Search Query
```sql
SELECT id, Product_id, product_name, price
FROM tbl_product
WHERE (product_id LIKE '%{search}%' OR product_name LIKE '%{search}%')
  AND type_id = @type_id   -- if "All Type" unchecked
ORDER BY product_id
```

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| customer_name | Must be selected (customer_id > 0) | "Please Enter Customer Name" |
| invoice_no | Must not be empty | "Please Enter Invoice No" |
| checklist_no | Must not be empty | "Please Enter Checklist No" |
| case_debit | Must be selected (CASH or CREDIT) | "Please Select Case / Debit" |
| line items | At least 1 product row | "There Is No Data To Process" |

### Multi-Company Validation
| Rule | Error Message |
|------|---------------|
| Company must be selected | "Please select a company" |
| Cannot change company if line items exist | "Cannot change company when line items exist" |

---

## Print Due Amount Option

```vb
If chk1.Checked = True Then
    print_due = "True"
Else
    print_due = "False"
End If
variable.Add("print_due", "'" & print_due & "'")
```

Controls whether the outstanding balance (from `copy_dua_amount`) is printed on the invoice PDF. The RDLC report reads `print_due` from `tbl_invoice_main`.

---

## Sales Report

```sql
SELECT
    im.id AS Sales_ID,
    c.customer_name,
    c.customer_type,
    im.invoice_no,
    Format(im.invoice_date, 'dd-MM-yyyy') AS Invoice_Date,
    im.discount,
    im.total AS Bill_Amount,
    im.checklist_no,
    co.company_name
FROM tbl_invoice_main im
INNER JOIN tbl_customer c ON im.customer_id = c.id
LEFT JOIN tbl_company co ON im.company_id = co.id
WHERE im.invoice_date BETWEEN @fromdate AND @todate
  AND (c.customer_name LIKE '%{find}%' OR im.invoice_no LIKE '%{find}%')
ORDER BY im.invoice_date DESC
```

Date defaults: `fromdate = first day of current month`, `todate = today`

---

## Database Schema

### tbl_invoice_main

```sql
CREATE TABLE tbl_invoice_main (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_id BIGINT,
    invoice_no VARCHAR(200),
    checklist_no VARCHAR(200),
    company_id BIGINT DEFAULT 1,        -- Multi-company support
    sub_total NUMERIC(18,2),
    amount_due NUMERIC(18,2),
    vat NUMERIC(18,2),
    discount NUMERIC(18,2),
    total NUMERIC(18,2),
    per NUMERIC(18,0),
    invoice_date DATE,
    case_debit VARCHAR(50),
    paid_amount NUMERIC(18,2),
    balance NUMERIC(18,2),
    no VARCHAR(MAX),
    cr_dr VARCHAR(50),
    identify VARCHAR(50),
    print_due VARCHAR(10)
)
```