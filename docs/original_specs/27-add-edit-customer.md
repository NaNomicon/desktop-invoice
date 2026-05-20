# 27 - Add/Edit Customer

## Purpose
`Add_Edit_Customer` is the customer create/update screen for `tbl_customer`. It supports both **new customer creation** and **editing existing customers**, and its output is consumed immediately by invoice and quotation entry flows.

Key behavior after save:
- Refreshes customer listing in `View_Customer`
- Reloads customer sources in `Add_Edit_Invoice` and `Add_Edit_Quotation`
- Auto-selects the newly saved customer in both forms

```vb
Call View_Customer.load_grid_sql()
Call Add_Edit_Invoice.load_customer()
Call Add_Edit_Quotation.load_customer()

id = get_max_number("id", "tbl_customer")
name = get_single_value("customer_name", "tbl_customer", "id", id)

Add_Edit_Invoice.customer_name.Text = name
customer_id = Val(id)

Add_Edit_Quotation.customer_name.Text = name
Add_Edit_Quotation.customer_idq = Val(id)
```

## Load logic
The form initializes style/db context, sets defaults, then branches by `customer_id` to determine Add vs Edit mode.

```vb
Private Sub Add_Edit_Customer_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load

    Call set_fonr(Me, Label2)
    customer_type.SelectedIndex = 0
    If customer_id > 0 Then
        Label2.Text = "Edit Customer"
        Call load_data()
    End If
    Call con_sql()
    Me.KeyPreview = True
End Sub
```

`load_data()` pulls one record from `tbl_customer` and maps DB fields to form controls.

```vb
Public Sub load_data()
    Call SQL_Select("tbl_customer", "", "id='" & customer_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString
        load_customer_name = ds.Tables(0).Rows(0).Item("customer_name").ToString
        contact.Text = ds.Tables(0).Rows(0).Item("contact").ToString
        customer_type.Text = ds.Tables(0).Rows(0).Item("customer_type").ToString
        telephone.Text = ds.Tables(0).Rows(0).Item("telephone").ToString
        address.Text = ds.Tables(0).Rows(0).Item("address").ToString
        email.Text = ds.Tables(0).Rows(0).Item("email").ToString
        title_name.Text = ds.Tables(0).Rows(0).Item("title_name").ToString
        reg_date.Value = ds.Tables(0).Rows(0).Item("reg_date").ToString
        brn.Text = ds.Tables(0).Rows(0).Item("brn").ToString
        vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
    End If

End Sub
```

## Fields
The form persists the following customer attributes:
- `customer_name`
- `title_name`
- `contact`
- `customer_type`
- `telephone`
- `address`
- `email`
- `reg_date`
- `brn`
- `vat`

Field mapping is explicit in `load_data()` and dynamic in `saved()` (textbox iteration + manual additions for combo/date controls).

## Validation
Validation occurs on save click (`Button1_Click`) before DB write:

1. Customer name is required
2. Customer type selection is required
3. Duplicate customer name check runs for both add/edit paths
4. Email validation is triggered via `isemail()` on `email_LostFocus` when customer type is `Corporate`. Note: `isemail()` is called as `Call isemail(...)` — return value is **discarded** (fire-and-forget advisory, not a hard block). The commented-out validation in `Button1_Click` (lines 109-115) checked the return value — this approach was moved to LostFocus.

```vb
If customer_name.Text = "" Then
    MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
    customer_name.Focus()
    Exit Sub
End If
If customer_type.SelectedIndex = -1 Then
    MsgBox("Please Select Customer Type", vbCritical, "WARNING")
    customer_type.Focus()
    Exit Sub
End If
```

Corporate email validation hook:

```vb
Private Sub email_LostFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles email.LostFocus
    If customer_type.Text = "Corporate" Then
        Call isemail(email.Text)
    End If

End Sub
```

## Duplicate check logic
Duplicate prevention uses `get_single_value` against `tbl_customer.customer_name` and compares with `load_customer_name` in edit mode.

```vb
Dim test As String = get_single_value("customer_name", "tbl_customer", "customer_name", Trim(customer_name.Text.ToLower))
If customer_id > 0 Then
    If test <> "" Then
        If load_customer_name = customer_name.Text Then

        Else
            MsgBox("Customer Name Is Duplicate Please Enter Different Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
    End If
Else
    If test <> "" Then
        MsgBox("Customer Name Is Duplicate Please Enter Different Name", vbCritical, "WARNING")
        customer_name.Focus()
        Exit Sub
    End If
End If
```

Interpretation:
- **Edit mode**: same name as original (`load_customer_name`) is allowed.
- **Add mode**: any existing match is blocked.

## After-save behavior
After a successful save:
- Confirmation shown (`Customer Details Saved!`)
- Customer listing refreshed
- Invoice/quotation customer dropdowns reloaded
- Latest customer pulled via `get_max_number("id", "tbl_customer")`
- Latest customer name assigned to invoice + quotation forms
- Form closes

```vb
Call saved()
MsgBox("Customer Details Saved!", vbInformation)
Call View_Customer.load_grid_sql()
Call Add_Edit_Invoice.load_customer()
Add_Edit_Invoice.checklist_no.Focus()
Call Add_Edit_Quotation.load_customer()

Dim name, id As String
id = get_max_number("id", "tbl_customer")
' Load ad_due from tbl_customer into Add_Edit_Invoice (source lines 126-127, appears twice):
Add_Edit_Invoice.ad_de = get_single_value("ad_due", "tbl_customer", "id", id)
Add_Edit_Invoice.ad_de = get_single_value("ad_due", "tbl_customer", "id", id)
name = get_single_value("customer_name", "tbl_customer", "id", id)

Add_Edit_Invoice.customer_name.Text = name
customer_id = Val(id)

Add_Edit_Quotation.customer_name.Text = name
Add_Edit_Quotation.customer_idq = Val(id)
Me.Dispose()
Me.Close()
```

## Save logic (`SQL_Update` vs `SQL_Insert`)
The `saved()` method branches by `customer_id`:
- `customer_id > 0` → `SQL_Update`
- else → `SQL_Insert`

Both paths:
- Build a `Dictionary(Of String, String)` called `variable`
- Iterate all `TextBox` controls via `GetAllControls(Me).OfType(Of TextBox)`
- Escape single quotes (`Replace("'", "''")`)
- Manually append non-textbox controls: `customer_type`, `title_name`, `reg_date`

```vb
Public Sub saved()
    If customer_id > 0 Then
        Dim variable As New Dictionary(Of String, String)
        Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
        For Each item As TextBox In textboxes
            variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
        Next
        variable.Add(customer_type.Name, "'" & customer_type.Text.Replace("'", "''") & "'")
        variable.Add(title_name.Name, "'" & title_name.Text.Replace("'", "''") & "'")
        variable.Add(reg_date.Name, "'" & Format(reg_date.Value, "dd-MMM-yyyy") & "'")
        Dim d As String = SQL_Update("tbl_customer", variable, "id=" & customer_id)
    Else
        Dim variable As New Dictionary(Of String, String)
        Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
        For Each item As TextBox In textboxes
            variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
        Next
        variable.Add(title_name.Name, "'" & title_name.Text.Replace("'", "''") & "'")
        variable.Add(customer_type.Name, "'" & customer_type.Text.Replace("'", "''") & "'")
        variable.Add(reg_date.Name, "'" & Format(reg_date.Value, "dd-MMM-yyyy") & "'")
        Dim d As Integer = SQL_Insert("tbl_customer", variable)
    End If
End Sub
```
