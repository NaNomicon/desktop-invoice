# Quotation Module — Implementation Details

## Purpose
Document the actual calculation formulas, state transitions, edge cases, and business logic for the quotation module.

---

## Difference from Invoice Module

Quotations are simpler than invoices — they don't affect customer balance or track payments:

| Aspect | Quotation | Invoice |
|--------|-----------|---------|
| Customer balance | Not affected | Increases by total |
| Payment tracking | None | CASH/CREDIT modes |
| cr_dr field | Not used | Tracks receivable direction |
| ad_due field | Not affected | May change after save |
| Number sequence | `tbl_numbers.quo_no` | `tbl_numbers.invoice_no` |

---

## Calculation Engine — `cal()` Function

### Formula Chain

```
row_total = qty × unit_price

sub_total = Σ(row_total) for all rows

vat = sub_total × (vat_per / 100)

IF per > 0 THEN
    discount = (sub_total + vat) × (per / 100)
ELSE
    discount = 0 (user can edit directly)

total = (sub_total + vat) - discount
```

**No advance/due adjustment** — quotation total is standalone.

### Full Source
```vb
Public Sub cal()
    With DataGridView2
        Dim total As Double = 0
        Dim temp As Double = 0

        ' 1. Calculate row totals
        For i = 0 To .Rows.Count - 1
            Dim qty As Double = Val(.Rows(i).Cells(2).Value)
            .Rows(i).Cells(2).Value = Format(qty, "0.00")
            temp = Val(Val(.Rows(i).Cells(2).Value) * Val(.Rows(i).Cells(3).Value))
            .Rows(i).Cells(4).Value = Format(temp, "0.00")
            temp = Val(.Rows(i).Cells(3).Value)
            .Rows(i).Cells(3).Value = Format(temp, "0.00")
            total = total + Val(.Rows(i).Cells(4).Value)
        Next

        sub_total.Text = Format(total, "0.00")

        ' 2. VAT
        Dim vat_per1, vat1 As Double
        vat_per1 = Val(vat_per.Text)
        vat1 = Val(Val(new_tot * vat_per1) / 100)
        vat.Text = Format(vat1, "0.00")

        ' 3. Discount (% of sub_total + vat)
        If Val(per.Text) = 0 Then
            ' discount field is editable, user sets manually
        Else
            discount.Text = Format(Val(Val(Val(new_tot + vat1) * Val(per.Text)) / 100), "0.00")
        End If
        discount.Text = Format(Val(discount.Text), "0.00")

        ' 4. Final total
        Dim temp_tot As Double = Format(Val(new_tot + vat1) - Val(discount.Text), "0.00")
        total_amt.Text = Format(Val(temp_tot), "0.00")
    End With
End Sub
```

### Key Difference: `per=0` Behavior
When `per=0` (discount percentage is 0):
- Invoice: discount field is **disabled** when per>0, **enabled** when per=0
- Quotation: discount field is **enabled** when per=0, user can enter fixed amount

This allows two discount modes:
1. **Percentage mode**: Set `per` (e.g., 10) → discount auto-calculated
2. **Fixed amount mode**: Set `per=0` → user enters manual discount amount

---

## Save Logic — `saved()` Function

```vb
Public Sub saved()
    ' 1. Build main record dictionary
    Dim variable As New Dictionary(Of String, String)
    variable.Add("customer_id", "'" & Val(customer_id) & "'")
    variable.Add("quo_no", "'" & quo_no.Text & "'")
    variable.Add("checklist_no", "'" & checklist_no.Text & "'")
    variable.Add("sub_total", "'" & Val(sub_total.Text) & "'")
    variable.Add("amount_due", "'" & Val(amount_due.Text) & "'")   ' customer's current due
    variable.Add("discount", "'" & Val(discount.Text) & "'")
    variable.Add("total", "'" & Val(total_amt.Text) & "'")
    variable.Add("per", "'" & Val(per.Text) & "'")
    variable.Add("vat", "'" & Val(vat.Text) & "'")
    variable.Add("quo_date", "'" & Format(quo_date.Value, "dd-MMM-yyyy") & "'")

    ' 2. Insert or Update
    If quotation_id > 0 Then
        SQL_Update("tbl_quotation_main", variable, "id=" & quotation_id)
    Else
        SQL_Insert("tbl_quotation_main", variable)
    End If

    ' 3. Get main_id for line items
    Dim main_id As Double
    If quotation_id > 0 Then
        main_id = quotation_id
    Else
        main_id = get_max_number("id", "tbl_quotation_main")
    End If

    ' 4. Upsert line items
    For i = 0 To DataGridView2.Rows.Count - 1
        If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Press Enter Key" Then
            GoTo kkk  ' Skip empty rows
        End If
        
        Dim load_id = Val(.Rows(i).Cells(6).Value)  ' 0 for new rows
        Dim qty = Val(.Rows(i).Cells(2).Value)
        Dim unit_price = Val(.Rows(i).Cells(3).Value)
        Dim row_total = Val(.Rows(i).Cells(4).Value)
        Dim product_id = Val(.Rows(i).Cells(5).Value)
        Dim sr_no = Val(.Rows(i).Cells(0).Value)

        If load_id > 0 Then
            q = "UPDATE tbl_quotation_sub SET qty=@qty, product_id=@pid, " &
                "unit_price=@up, row_total=@rt, s_no=@sn WHERE id=@id"
        Else
            q = "INSERT INTO tbl_quotation_sub(main_id,qty,product_id,unit_price,row_total,s_no) " &
                "VALUES (@mid, @qty, @pid, @up, @rt, @sn)"
        End If
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
kkk:
    Next

    ' 5. Update sequence number (new quotation only)
    If quotation_id = 0 Then
        q = "UPDATE tbl_numbers SET quo_no='" & Val(quo_no.Text) + 1 & "' WHERE id='" & 
            get_max_number("id", "tbl_numbers") & "'"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
    End If

    ' 6. Delete soft-deleted rows
    ' contain_id holds comma-separated IDs
    LineOfText = contain_id
    aryTextFile = LineOfText.Split(",")
    For i1 = 0 To UBound(aryTextFile)
        Dim id As Double = Val(aryTextFile(i1))
        If id > 0 Then
            SQL_Delete("tbl_quotation_sub", "id=" & id)
        End If
    Next
End Sub
```

### Delete Row (Ctrl+D)
```vb
If (e.KeyCode = Keys.D And e.Modifiers = Keys.Control) Then
    c_row = .CurrentCell.RowIndex
    ' Track deleted IDs for cleanup on save
    If DataGridView2.Rows(c_row).Cells(6).Value > 0 Then
        contain_id = contain_id & "," & Val(DataGridView2.Rows(c_row).Cells(6).Value)
    End If
    DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
    load_sr()
    cal()
End If
```

Unlike Invoice (soft delete), Quotation uses **hard delete** during save.

---

## Grid Column Structure

| Col Index | Name | Purpose | Notes |
|-----------|------|---------|-------|
| 0 | SrNo | Line number | Auto-calculated |
| 1 | ItemName | Product name | Read-only, via search |
| 2 | Qty | Quantity | Editable |
| 3 | UnitPrice | Price per unit | Read-only, from product |
| 4 | Total | qty × price | Calculated |
| 5 | ItemId | Product FK | Hidden |
| 6 | Id | Quotation_sub PK | Hidden, 0 for new |

---

## Search Overlay Pattern

Same as Invoice:
- User types in main TextBox
- Hidden overlay captures keystrokes
- DataGridView shows filtered products
- Enter/Double-click selects

### Product Search with Type Filter
```sql
SELECT id, Product_id, product_name, price
FROM tbl_product
WHERE (product_id LIKE '%{search}%' OR product_name LIKE '%{search}%')
  AND type_id = @type_id   -- if all_type.Checked = false
ORDER BY product_id
```

---

## Quotation → Invoice Conversion

### Trigger: Double-click row in View_Quotation
```vb
Private Sub DataGridView1_MouseDoubleClick(...)
    Quotation_To_Invoice_ID = DataGridView1.SelectedRows(0).Cells(0).Value
    __show(Add_Edit_Invoice)
    load_nav_bar("Add_Edit_Invoice", "Add Invoice From Quot.")
End Sub
```

### In Add_Edit_Invoice — Load Data
```vb
Public Sub load_data()
    Dim temp_id As Double = 0
    If Quotation_To_Invoice_ID > 0 Then
        temp_id = Quotation_To_Invoice_ID
        identify = "Quotation"
    ElseIf invoice_id > 0 Then
        temp_id = invoice_id
        identify = "Invoice"
    End If

    ' Load quotation/ invoice main
    If identify = "Quotation" Then
        SQL_Query("SELECT qm.*, c.customer_name FROM tbl_quotation_main qm " &
                  "INNER JOIN tbl_customer c ON qm.customer_id = c.id " &
                  "WHERE qm.id=@temp_id")
        ' Populate customer, checklist, dates
        invoice_date.Value = Today  ' Override to current date
    End If

    ' Load line items
    SQL_Query("SELECT qs.*, p.product_name FROM tbl_quotation_sub qs " &
              "INNER JOIN tbl_product p ON qs.product_id = p.id " &
              "WHERE qs.main_id=@temp_id")
    ' Populate grid rows
End Sub
```

### Save Behavior
When `identify = "Quotation"` on save:
```vb
' Creates NEW invoice, does NOT update quotation
Dim d As Integer = SQL_Insert("tbl_invoice_main", variable)
' quotation remains unchanged in tbl_quotation_main
```

---

## PDF Generation Path

```vb
Dim quot_path1 = get_single_value("quo_path", "tbl_setting", "id", 
    get_max_number("id", "tbl_setting"))
Dim iMonth = Month(quo_date.Value)
folder_path = quot_path1 & "\" & MonthName(iMonth) & "\" & user_name

' e.g., "D:\Quotations\May\Mr John Smith"
Directory.CreateDirectory(folder_path)

Dim file_name = "QUO" & quotation_id & "-" & user_name
pdf_path = folder_path & "\" & file_name & ".pdf"
```

### Path Structure
```
{quo_path}/
  May-2026/
    Mr John Smith/
      QUO001-Mr John Smith.pdf
    Ms Jane Doe/
      QUO002-Ms Jane Doe.pdf
```

---

## Email with Template

```vb
' Get email template for QUOTATION
Dim temp_id = get_single_value("id", "tbl_email", "identify", "QUOTATION")
direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", Val(temp_id))
direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", Val(temp_id))
direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
direct_email.body.Text = get_single_value("body", "tbl_email", "id", Val(temp_id))
direct_email.attach.Text = exportPDFPath

' Replace placeholders
direct_email.body.Text = direct_email.body.Text.Replace("<date>", 
    Format(quo_date.Value, "dd.MM.yyyy") & ".")
direct_email.body.Text = direct_email.body.Text.Replace("invoice", "quotation")

Dim contact = get_single_value("contact", "tbl_customer", "id", customer_id)
If contact = "" Then
    direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", "")
Else
    direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", contact)
End If

direct_email.ShowDialog()
```

### Template Placeholders
- `<date>` — Quotation date (dd.MM.yyyy)
- `<contact person>` — Customer contact name
- "invoice" → "quotation" replacement (auto)

---

## Delete Quotation

```vb
Private Sub Button3_Click(...)
    Dim ask As String = MsgBox("Are You Sure Want to Delete Quotation Details?", 
        vbQuestion + vbYesNo)
    If ask = "6" Then
        quotation_id = DataGridView1.SelectedRows(0).Cells(0).Value
        
        SQL_Delete("tbl_quotation_main", "id=" & quotation_id)
        SQL_Delete("tbl_quotation_sub", "main_id=" & quotation_id)
        
        MsgBox("Quotation Successfully Deleted.", vbInformation)
        load_grid_sql()
    End If
End Sub
```

**No balance reversal** — quotations don't affect customer balance. Simple delete of main + sub records.

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| customer_name | Must be selected | "Please Enter Customer Name" |
| quo_no | Must not be empty | "Please Enter Invoice No" |
| line items | At least 1 product row | "There Is No Data To Process" |

Note: No `checklist_no` validation, no `case_debit` validation (not applicable to quotation).

---

## Sequence Auto-Increment

```vb
quo_no.Text = get_single_value("quo_no", "tbl_numbers", "id", 
    get_max_number("id", "tbl_numbers"))

' On save (new quotation):
q = "UPDATE tbl_numbers SET quo_no='" & Val(quo_no.Text) + 1 & "' WHERE id='" & 
    get_max_number("id", "tbl_numbers") & "'"
```

---

## Button Actions Summary

| Button | Action |
|--------|--------|
| SAVE | Save + refresh list + show preview |
| PREVIEW | Save + show RDLC print preview |
| EMAIL | Save + generate PDF + open email form |
| CLEAR | Reset all fields to initial state |
| ADD CUSTOMER | Open Add_Edit_Customer form |
| ADD PRODUCT | Open Add_Edit_Product form (new_pro_key_quo=true) |