Imports System.Data.SqlClient
Imports System.IO

Public Class Add_Edit_Invoice
    Dim tmp_invoice_id As String
    Dim temp_date, old_date As Date
    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Dim ask As String
        ask = MsgBox("Are you sure you want to cancel?", vbQuestion + vbYesNo)
        If ask = "6" Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub Add_Edit_Invoice_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed

        last_form_close(Me)
        Quotation_To_Invoice_ID = 0
        invoice_id = 0
    End Sub

    Private Sub Add_Edit_Invoice_FormClosing(ByVal sender As Object, ByVal e As System.Windows.Forms.FormClosingEventArgs) Handles Me.FormClosing
        'Dim ask As String
        'ask = MsgBox("Are you sure you want to cancel?", vbQuestion + vbYesNo)
        'If ask = "6" Then
        '    Me.Dispose()
        '    Me.Close()
        'End If
    End Sub

    Private Sub Add_Edit_Invoice_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            If load_item.Visible = True Then
                load_item.Visible = False
                find_item.Visible = False
                DataGridView2.Focus()
                Exit Sub
            End If
            If DataGridView1.Visible = True Then
                DataGridView1.Visible = False
                txt_search.Visible = False
                customer_name.Focus()
                Exit Sub
            End If
            'Me.Dispose()
            'Me.Close()
        End If
    End Sub
    Public ad_de As String = ""
    'Public customer_id As Double = 0
    Dim check_per_vat As String = ""
    Dim vat_per_value As String = ""
    Dim old_invoice_date As Date
    Public Sub Add_Edit_Invoice_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        case_debit.SelectedIndex = 1
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
        grids1(DataGridView2)
        Call load_customer()
        load_item_type()
        'Call load_items()
        Call SetColumnsForMainGrid()

        invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
        customer_name.Text = ""
        customer_id = 0
        If invoice_id > 0 Then
            'MsgBox(invoice_id)
            tmp_invoice_id = invoice_id
            Label2.Text = "Edit Invoice"
            Call load_data()
        End If
        If Quotation_To_Invoice_ID > 0 Then
            Call load_data()
        End If
        check_per_vat = get_single_value("isvat", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If check_per_vat = 0 Then
            Label11.Visible = False
            vat_per.Visible = False
            vat.Visible = False
        ElseIf check_per_vat = 1 Then
            Label11.Visible = True
            vat_per.Visible = True
            vat.Visible = True
            vat_per.Text = get_single_value("vat_per", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        End If
        cal()
    End Sub
    Dim identify As String = ""
    Dim temp_paid_amount As Double = 0
    Dim load_amount As Double = 0
    Dim old_sub_total As String
    'Public Sub load_data()
    '    Dim temp_id As Double = 0
    '    If Quotation_To_Invoice_ID > 0 Then
    '        temp_id = Quotation_To_Invoice_ID
    '        identify = "Quotation"
    '    ElseIf invoice_id > 0 Then
    '        temp_id = invoice_id
    '        identify = "Invoice"
    '    End If
    '    If identify = "Invoice" Then
    '        Call SQL_Query("SELECT tbl_invoice_main.id,tbl_invoice_main.case_debit,tbl_invoice_main.paid_amount,tbl_invoice_main.identify, tbl_invoice_main.customer_id,tbl_invoice_main.cr_dr,tbl_invoice_main.invoice_date,tbl_invoice_main.per, tbl_customer.customer_name, tbl_invoice_main.invoice_no, tbl_invoice_main.checklist_no, tbl_invoice_main.sub_total, tbl_invoice_main.amount_due, tbl_invoice_main.vat, tbl_invoice_main.discount, tbl_invoice_main.total FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id", " where tbl_invoice_main.id='" & temp_id & "'")
    '    ElseIf identify = "Quotation" Then
    '        Call SQL_Query("SELECT tbl_quotation_main.id, tbl_quotation_main.customer_id,tbl_quotation_main.quo_date,tbl_quotation_main.per, tbl_customer.customer_name, tbl_quotation_main.quo_no, tbl_quotation_main.checklist_no, tbl_quotation_main.sub_total, tbl_quotation_main.amount_due, tbl_quotation_main.vat, tbl_quotation_main.discount, tbl_quotation_main.total FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id", " where tbl_quotation_main.id='" & temp_id & "'")
    '    End If

    '    If ds.Tables(0).Rows.Count > 0 Then
    '        customer_id = Val(ds.Tables(0).Rows(0).Item("customer_id").ToString)
    '        tmp_cust_id = customer_id
    '        customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString

    '        checklist_no.Text = ds.Tables(0).Rows(0).Item("checklist_no").ToString
    '        sub_total.Text = ds.Tables(0).Rows(0).Item("sub_total").ToString
    '        old_sub_total = ds.Tables(0).Rows(0).Item("sub_total").ToString
    '        amount_due.Text = Format(Val(ds.Tables(0).Rows(0).Item("amount_due").ToString), "0.00")
    '        load_amount = ds.Tables(0).Rows(0).Item("total").ToString
    '        vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
    '        discount.Text = ds.Tables(0).Rows(0).Item("discount").ToString
    '        total_amt.Text = ds.Tables(0).Rows(0).Item("total").ToString
    '        per.Text = ds.Tables(0).Rows(0).Item("per").ToString
    '        'amount_due.Text = get_single_value("due_amount", "tbl_customer", "id", customer_id)

    '        Dim ide As String = ""
    '        If identify = "Invoice" Then
    '            paid_amount.Text = ds.Tables(0).Rows(0).Item("paid_amount").ToString
    '            invoice_no.Text = ds.Tables(0).Rows(0).Item("invoice_no").ToString
    '            invoice_date.Value = ds.Tables(0).Rows(0).Item("invoice_date").ToString
    '            old_invoice_date = ds.Tables(0).Rows(0).Item("invoice_date").ToString
    '            old_date = ds.Tables(0).Rows(0).Item("invoice_date").ToString
    '            'paid_amount.Text = ds.Tables(0).Rows(0).Item("total").ToString
    '            temp_paid_amount = Val(ds.Tables(0).Rows(0).Item("paid_amount").ToString)
    '            case_debit.Text = ds.Tables(0).Rows(0).Item("case_debit").ToString
    '            Dim kk As String = ds.Tables(0).Rows(0).Item("cr_dr").ToString
    '            ide = ds.Tables(0).Rows(0).Item("identify").ToString
    '            If kk = "Cr." Then
    '                ad_de = "Advance"
    '            ElseIf kk = "Dr." Then
    '                ad_de = "Due"
    '            End If

    '            Label8.Text = ide & " Amount"

    '        ElseIf identify = "Quotation" Then
    '            'Dim kk As String = ds.Tables(0).Rows(0).Item("cr_dr").ToString
    '            'If kk = "Cr." Then
    '            '    ad_de = "Advance"
    '            'ElseIf kk = "Dr." Then
    '            '    ad_de = "Due"
    '            'End If
    '            ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
    '            copy_dua_amount.Text = get_single_value("due_amount", "tbl_customer", "id", customer_id)
    '            Label8.Text = ad_de & " Amount"
    '            invoice_date.Value = ds.Tables(0).Rows(0).Item("quo_date").ToString
    '            ide = ad_de
    '        End If


    '        tmp_cust_id = customer_id
    '        Dim k As String = get_single_value("due_amount", "tbl_customer", " id", customer_id)
    '        'k = GetDueAmount(customer_id)
    '        k = Val(k) - Val(ds.Tables(0).Rows(0).Item("total").ToString)
    '        Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
    '        Label8.Text = ad_due & " Amount"
    '        If ad_due = "Advance" Then
    '            k = Val(k) * -1
    '            copy_dua_amount.Text = Format(Val(k), "0.00")
    '        ElseIf ad_due = "Due" Then
    '            copy_dua_amount.Text = Format(Val(k), "0.00")
    '        End If
    '        amount_due.Text = Format(Val(k), "0.00")
    '        txt_search.Visible = False
    '        txt_search.Text = ""
    '        DataGridView1.Visible = False
    '        checklist_no.Focus()
    '        ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)

    '        'Dim k As String '= get_single_value("due_amount", "tbl_customer", " id", customer_id)
    '        'Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
    '        'Label8.Text = ad_due & " Amount"
    '        'k = GetDueAmount(customer_id)
    '        'amount_due.Text = Format(Val(k), "0.00")
    '        'If ad_due = "Advance" Then
    '        '    k = Val(k) * -1
    '        '    copy_dua_amount.Text = Format(Val(k), "0.00")
    '        'ElseIf ad_due = "Due" Then
    '        '    copy_dua_amount.Text = Format(Val(k), "0.00")
    '        'End If
    '        'If ide = "Advance" Then
    '        '    copy_dua_amount.Text = "-" & Format(Math.Abs(Val(amount_due.Text)), "0.00")
    '        'ElseIf ide = "Due" Then
    '        '    copy_dua_amount.Text = Format(Val(amount_due.Text), "0.00")
    '        'End If
    '    End If
    '    If identify = "Invoice" Then
    '        Call SQL_Query("SELECT tbl_invoice_sub.id, tbl_invoice_sub.qty, tbl_product.product_name, tbl_invoice_sub.product_id, tbl_invoice_sub.unit_price, tbl_invoice_sub.row_total FROM tbl_invoice_sub INNER JOIN tbl_product ON tbl_invoice_sub.product_id = tbl_product.id", " where tbl_invoice_sub.main_id='" & temp_id & "'")
    '    ElseIf identify = "Quotation" Then
    '        Call SQL_Query("SELECT tbl_quotation_sub.id, tbl_quotation_sub.qty, tbl_product.product_name, tbl_quotation_sub.product_id, tbl_quotation_sub.unit_price, tbl_quotation_sub.row_total FROM tbl_quotation_sub INNER JOIN tbl_product ON tbl_quotation_sub.product_id = tbl_product.id", " where tbl_quotation_sub.main_id='" & temp_id & "'")
    '        invoice_date.Value = Today
    '    End If

    '    If ds.Tables(0).Rows.Count > 0 Then
    '        DataGridView2.RowCount = ds.Tables(0).Rows.Count + 1
    '        For i = 0 To ds.Tables(0).Rows.Count - 1
    '            With DataGridView2
    '                .Rows(i).Cells(1).Value = ds.Tables(0).Rows(i).Item("product_name").ToString
    '                .Rows(i).Cells(2).Value = ds.Tables(0).Rows(i).Item("qty").ToString
    '                .Rows(i).Cells(3).Value = ds.Tables(0).Rows(i).Item("unit_price").ToString
    '                .Rows(i).Cells(4).Value = ds.Tables(0).Rows(i).Item("row_total").ToString
    '                .Rows(i).Cells(5).Value = ds.Tables(0).Rows(i).Item("product_id").ToString
    '                .Rows(i).Cells(6).Value = ds.Tables(0).Rows(i).Item("id").ToString
    '            End With
    '        Next
    '    End If

    '    temp_date = invoice_date.Value
    '    Call load_sr()
    '    Call cal()


    'End Sub

    Public Sub load_data()
        Dim temp_id As Double = 0
        If Quotation_To_Invoice_ID > 0 Then
            temp_id = Quotation_To_Invoice_ID
            identify = "Quotation"
        ElseIf invoice_id > 0 Then
            temp_id = invoice_id
            identify = "Invoice"
        End If
        If identify = "Invoice" Then
            Call SQL_Query("SELECT tbl_invoice_main.id,tbl_invoice_main.case_debit,tbl_invoice_main.paid_amount,tbl_invoice_main.identify, tbl_invoice_main.customer_id,tbl_invoice_main.cr_dr,tbl_invoice_main.invoice_date,tbl_invoice_main.per, tbl_customer.customer_name, tbl_invoice_main.invoice_no, tbl_invoice_main.checklist_no, tbl_invoice_main.sub_total, tbl_invoice_main.amount_due, tbl_invoice_main.vat, tbl_invoice_main.discount, tbl_invoice_main.total FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id", " where tbl_invoice_main.id='" & temp_id & "'")
        ElseIf identify = "Quotation" Then
            Call SQL_Query("SELECT tbl_quotation_main.id, tbl_quotation_main.customer_id,tbl_quotation_main.quo_date,tbl_quotation_main.per, tbl_customer.customer_name, tbl_quotation_main.quo_no, tbl_quotation_main.checklist_no, tbl_quotation_main.sub_total, tbl_quotation_main.amount_due, tbl_quotation_main.vat, tbl_quotation_main.discount, tbl_quotation_main.total FROM tbl_quotation_main INNER JOIN tbl_customer ON tbl_quotation_main.customer_id = tbl_customer.id", " where tbl_quotation_main.id='" & temp_id & "'")
        End If

        If ds.Tables(0).Rows.Count > 0 Then
            customer_id = Val(ds.Tables(0).Rows(0).Item("customer_id").ToString)
            tmp_cust_id = customer_id
            customer_name.Text = ds.Tables(0).Rows(0).Item("customer_name").ToString

            checklist_no.Text = ds.Tables(0).Rows(0).Item("checklist_no").ToString
            sub_total.Text = ds.Tables(0).Rows(0).Item("sub_total").ToString
            'old_sub_total = ds.Tables(0).Rows(0).Item("sub_total").ToString
            'old_sub_total = ds.Tables(0).Rows(0).Item("due_amount").ToString
            amount_due.Text = Format(Val(ds.Tables(0).Rows(0).Item("amount_due").ToString), "0.00")
            load_amount = ds.Tables(0).Rows(0).Item("total").ToString
            vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
            discount.Text = ds.Tables(0).Rows(0).Item("discount").ToString
            total_amt.Text = ds.Tables(0).Rows(0).Item("total").ToString
            per.Text = ds.Tables(0).Rows(0).Item("per").ToString
            'amount_due.Text = get_single_value("due_amount", "tbl_customer", "id", customer_id)

            old_sub_total = get_single_value("due_amount", "tbl_customer", "id", customer_id)

            Dim ide As String = ""
            If identify = "Invoice" Then
                paid_amount.Text = ds.Tables(0).Rows(0).Item("paid_amount").ToString
                invoice_no.Text = ds.Tables(0).Rows(0).Item("invoice_no").ToString
                invoice_date.Value = ds.Tables(0).Rows(0).Item("invoice_date").ToString
                old_invoice_date = ds.Tables(0).Rows(0).Item("invoice_date").ToString
                old_date = ds.Tables(0).Rows(0).Item("invoice_date").ToString
                'paid_amount.Text = ds.Tables(0).Rows(0).Item("total").ToString
                temp_paid_amount = Val(ds.Tables(0).Rows(0).Item("paid_amount").ToString)
                case_debit.Text = ds.Tables(0).Rows(0).Item("case_debit").ToString
                Dim kk As String = ds.Tables(0).Rows(0).Item("cr_dr").ToString
                ide = ds.Tables(0).Rows(0).Item("identify").ToString
                If kk = "Cr." Then
                    ad_de = "Advance"
                ElseIf kk = "Dr." Then
                    ad_de = "Due"
                End If

                Label8.Text = ide & " Amount"


            ElseIf identify = "Quotation" Then
                'Dim kk As String = ds.Tables(0).Rows(0).Item("cr_dr").ToString
                'If kk = "Cr." Then
                '    ad_de = "Advance"
                'ElseIf kk = "Dr." Then
                '    ad_de = "Due"
                'End If
                ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
                copy_dua_amount.Text = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                Label8.Text = ad_de & " Amount"
                invoice_date.Value = ds.Tables(0).Rows(0).Item("quo_date").ToString
                ide = ad_de
            End If
            If ide = "Advance" Then
                copy_dua_amount.Text = "-" & Format(Val(amount_due.Text), "0.00")
            ElseIf ide = "Due" Then
                copy_dua_amount.Text = Format(Val(amount_due.Text), "0.00")
            End If
        End If
        If identify = "Invoice" Then
            Call SQL_Query("SELECT tbl_invoice_sub.id, tbl_invoice_sub.qty, tbl_product.product_name, tbl_invoice_sub.product_id, tbl_invoice_sub.unit_price, tbl_invoice_sub.row_total FROM tbl_invoice_sub INNER JOIN tbl_product ON tbl_invoice_sub.product_id = tbl_product.id", " where tbl_invoice_sub.main_id='" & temp_id & "'")
        ElseIf identify = "Quotation" Then
            Call SQL_Query("SELECT tbl_quotation_sub.id, tbl_quotation_sub.qty, tbl_product.product_name, tbl_quotation_sub.product_id, tbl_quotation_sub.unit_price, tbl_quotation_sub.row_total FROM tbl_quotation_sub INNER JOIN tbl_product ON tbl_quotation_sub.product_id = tbl_product.id", " where tbl_quotation_sub.main_id='" & temp_id & "'")
            invoice_date.Value = Today
        End If

        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView2.RowCount = ds.Tables(0).Rows.Count + 1
            For i = 0 To ds.Tables(0).Rows.Count - 1
                With DataGridView2
                    .Rows(i).Cells(1).Value = ds.Tables(0).Rows(i).Item("product_name").ToString
                    .Rows(i).Cells(2).Value = ds.Tables(0).Rows(i).Item("qty").ToString
                    .Rows(i).Cells(3).Value = ds.Tables(0).Rows(i).Item("unit_price").ToString
                    .Rows(i).Cells(4).Value = ds.Tables(0).Rows(i).Item("row_total").ToString
                    .Rows(i).Cells(5).Value = ds.Tables(0).Rows(i).Item("product_id").ToString
                    .Rows(i).Cells(6).Value = ds.Tables(0).Rows(i).Item("id").ToString
                End With
            Next
        End If

        temp_date = invoice_date.Value
        Call load_sr()
        Call cal()
    End Sub

    Public Sub SetColumnsForMainGrid()
        DataGridView2.Columns.Add("SrNo", "Sr.No.")
        DataGridView2.Columns.Add("ItemName", "Product Name & Description")
        DataGridView2.Columns.Add("Qty", "Qty")
        DataGridView2.Columns.Add("UnitPrice", "Unit Price")
        DataGridView2.Columns.Add("Total", "Total")
        DataGridView2.Columns.Add("ItemId", "Item Id")
        DataGridView2.Columns.Add("Id", "Id")
        DataGridView2.Columns.Add("IsDeleted", "Is Deleted")

        DataGridView2.Columns("Id").Visible = False

        DataGridView2.Columns("SrNo").Width = 20
        DataGridView2.Columns("SrNo").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
        DataGridView2.Columns("SrNo").ReadOnly = True

        DataGridView2.Columns("ItemName").Width = 160
        DataGridView2.Columns("ItemName").ReadOnly = True

        DataGridView2.Columns("Qty").Width = 30
        DataGridView2.Columns("Qty").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter

        DataGridView2.Columns("UnitPrice").Width = 50
        DataGridView2.Columns("UnitPrice").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
        DataGridView2.Columns("UnitPrice").ReadOnly = True

        DataGridView2.Columns("Total").Width = 60
        DataGridView2.Columns("Total").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
        DataGridView2.Columns("Total").ReadOnly = True

        DataGridView2.Columns("ItemId").Visible = False
        DataGridView2.Columns("IsDeleted").Visible = False

        DataGridView2.RowCount = 1
        DataGridView2.Rows(0).Cells("ItemName").Value = "Type Product Name"
        DataGridView2.SelectionMode = DataGridViewSelectionMode.CellSelect

        'With DataGridView2
        '    .ColumnCount = 7
        '    .RowCount = 1
        '    .Columns(0).Visible = True
        '    .Columns(0).HeaderText = "Sr.No."
        '    .Columns(0).Width = 20
        '    .Columns(0).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
        '    .Columns(0).ReadOnly = True

        '    .Columns(1).HeaderText = "Product Name & Description"
        '    .Columns(1).Width = 160
        '    '.Columns(0).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
        '    .Columns(1).ReadOnly = True

        '    .Columns(2).HeaderText = "Qty"
        '    .Columns(2).Width = 30
        '    .Columns(2).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
        '    '.Columns(0).ReadOnly = True

        '    .Columns(3).HeaderText = "Unit Price"
        '    .Columns(3).Width = 50
        '    .Columns(3).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
        '    .Columns(3).ReadOnly = True

        '    .Columns(4).HeaderText = "Total"
        '    .Columns(4).Width = 60
        '    .Columns(4).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
        '    .Columns(4).ReadOnly = True

        '    .Columns(5).Visible = False
        '    .Columns(6).Visible = False
        '    .Rows(0).Cells(1).Value = "Type Product Name"
        '    .SelectionMode = DataGridViewSelectionMode.CellSelect

        '    .Columns.Add("IsDeleted", "IsDeleted")
        '    '.Columns("IsDeleted").Visible = False
        'End With
    End Sub
    Dim temp As Double = 0
    'Public Sub cal()
    '    With DataGridView2
    '        Dim total As Double
    '        total = 0
    '        Dim temp As Double = 0

    '        For i = 0 To .Rows.Count - 1
    '            If .Rows(i).Visible = True Then
    '                Dim QTY As Double = Val(.Rows(i).Cells(2).Value)
    '                .Rows(i).Cells(2).Value = Format(QTY, "0.00")
    '                temp = Val(Val(.Rows(i).Cells(2).Value) * Val(.Rows(i).Cells(3).Value))
    '                .Rows(i).Cells(4).Value = Format(temp, "0.00")
    '                temp = Val(.Rows(i).Cells(3).Value)
    '                .Rows(i).Cells(3).Value = Format(temp, "0.00")
    '                total = total + Val(.Rows(i).Cells(4).Value)
    '            End If
    '        Next
    '        sub_total.Text = Format(total, "0.00")
    '        Dim new_tot As Double = 0

    '        If Label8.Text = "Advance Amount" Then
    '                Dim t As Double
    '                t = Val(amount_due.Text) * -1
    '                new_tot = Val(sub_total.Text) + Val(t)
    '            ElseIf Label8.Text = "Due Amount" Then
    '                new_tot = Math.Abs(Val(sub_total.Text) + Val(amount_due.Text))
    '            End If

    '        Dim vat_per1, vat1 As Double
    '        vat_per1 = Val(vat_per.Text)
    '        vat1 = Math.Abs(Val(Val(sub_total.Text) * vat_per1) / 100)
    '        vat.Text = Format(vat1, "0.00")
    '        If Val(per.Text) = 0 Then
    '            'discount.Text = "0.00"
    '            'discount.Text = Format(Val(Val(sub_total.Text) + vat1) * Val(per.Text) / 100, "0.00")
    '        Else
    '            'If Label8.Text = "Advance Amount" Then
    '            '    discount.Text = Format(Math.Abs(Val(Val(new_tot - vat1) * Val(per.Text)) / 100), "0.00")
    '            'ElseIf Label8.Text = "Due Amount" Then
    '            'discount.Text = Format(Math.Abs(Val(Val(Val(sub_total.Text) + vat1) * Val(per.Text)) / 100), "0.00")
    '            discount.Text = Format(Val(Val(sub_total.Text) + vat1) * Val(per.Text) / 100, "0.00")
    '            discount.Text = Format(Val(discount.Text), "0.00")
    '            'End If

    '        End If
    '        'If Label8.Text = "Advance Amount" Then
    '        'total_amt.Text = Format(Math.Round((new_tot + vat1) - Val(discount.Text)), "0.00")
    '        total_amt.Text = Format((new_tot + vat1) - Val(discount.Text), "0.00")
    '        'total_amt.Text = Val(total_amt.Text) - Val(amount_due.Text)
    '        total_amt.Text = Format(Val(total_amt.Text), "0.00")
    '        new_AMOUNT = total_amt.Text
    '        ' ElseIf Label8.Text = "Due Amount" Then
    '        ' total_amt.Text = Format(Math.Round(Math.Abs((new_tot + vat1) - Val(discount.Text))), "0.00")
    '        ' End If

    '        temp = Format(Val(new_tot + vat1) - Val(discount.Text), "0.00")
    '    End With
    'End Sub

    Public Sub cal()
        With DataGridView2
            Dim total As Double
            total = 0
            Dim temp As Double = 0

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
            Dim new_tot As Double = 0
            If Label8.Text = "Advance Amount" Then
                Dim t As Double
                t = Val(amount_due.Text) * -1
                new_tot = Val(sub_total.Text) + Val(t)
            ElseIf Label8.Text = "Due Amount" Then
                new_tot = Math.Abs(Val(sub_total.Text) + Val(amount_due.Text))
            End If

            Dim vat_per1, vat1 As Double
            vat_per1 = Val(vat_per.Text)
            vat1 = Math.Abs(Val(Val(sub_total.Text) * vat_per1) / 100)
            vat.Text = Format(vat1, "0.00")
            If Val(per.Text) = 0 Then
                'discount.Text = "0.00"
                'discount.Text = Format(Val(Val(sub_total.Text) + vat1) * Val(per.Text) / 100, "0.00")
            Else
                'If Label8.Text = "Advance Amount" Then
                '    discount.Text = Format(Math.Abs(Val(Val(new_tot - vat1) * Val(per.Text)) / 100), "0.00")
                'ElseIf Label8.Text = "Due Amount" Then
                'discount.Text = Format(Math.Abs(Val(Val(Val(sub_total.Text) + vat1) * Val(per.Text)) / 100), "0.00")
                discount.Text = Format(Val(Val(sub_total.Text) + vat1) * Val(per.Text) / 100, "0.00")
                discount.Text = Format(Val(discount.Text), "0.00")
                'End If

            End If
            'If Label8.Text = "Advance Amount" Then
            'total_amt.Text = Format(Math.Round((new_tot + vat1) - Val(discount.Text)), "0.00")
            total_amt.Text = Format((new_tot + vat1) - Val(discount.Text), "0.00")
            total_amt.Text = Format(Val(total_amt.Text), "0.00")
            new_AMOUNT = total_amt.Text
            ' ElseIf Label8.Text = "Due Amount" Then
            ' total_amt.Text = Format(Math.Round(Math.Abs((new_tot + vat1) - Val(discount.Text))), "0.00")
            ' End If

            temp = Format(Val(new_tot + vat1) - Val(discount.Text), "0.00")
        End With
    End Sub

    Public Sub load_items()

        Call grids1(load_item)
        load_item.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells
        Dim ids As String = get_single_value("id", "tbl_product_type", "type_name", load_type.Text)
        If all_type.Checked = True Then
            Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", " (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", " Order By product_id")
        Else
            Call SQL_Select("tbl_product", " id,Product_id,product_name,price ", " type_id='" & Val(ids) & "' and (product_id like '%" & find_item.Text & "%' or product_name like '%" & find_item.Text & "%')", " Order By product_id")
        End If

        If ds.Tables(0).Rows.Count > 0 Then
            With load_item
                .DataSource = ds.Tables(0)
                .Columns(0).Visible = False
                .Columns(3).HeaderText = "Price"
                .Columns(1).HeaderText = "ID"
                .Columns(2).HeaderText = "Product Name"
                .Columns(0).Width = 0
                .Columns(1).Width = 10
                .Columns(2).Width = 50
                .Columns(3).Width = 90
                .Columns(3).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
            End With
        Else
            load_item.DataSource = Nothing
        End If
    End Sub
    Public Sub load_item_type()
        Call SQL_Select("tbl_product_type", , , " order by type_name")
        If ds.Tables(0).Rows.Count > 0 Then
            load_type.DataSource = ds.Tables(0)
            load_type.DisplayMember = "type_name"
            load_type.ValueMember = "id"

        End If
    End Sub
    Public Sub load_customer()
        If txt_search.TextLength > 0 Then
            DataGridView1.Visible = True
            Call grids1(DataGridView1)

            'Call SQL_Select("tbl_customer", " id,customer_name ", " customer_name like '%" & txt_search.Text & "%'", " Order By customer_name")
            Call SQL_Select("tbl_customer", " id,customer_name ", " customer_name like '%" & txt_search.Text & "%' OR telephone like '%" & txt_search.Text & "%' OR contact like '%" & txt_search.Text & "%' OR address like '%" & txt_search.Text & "%'", " Order By customer_name")
            If ds.Tables(0).Rows.Count > 0 Then
                With DataGridView1
                    .DataSource = ds.Tables(0)
                    .Columns(0).Visible = False
                    .Columns(1).HeaderText = "Customer Name"
                End With
            Else
                DataGridView1.DataSource = Nothing
            End If
        Else
            DataGridView1.DataSource = Nothing
        End If
    End Sub
    Private Sub Add_Edit_Invoice_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        'MsgBox(customer_id)
        Dim ask As String
        ask = MsgBox("Are you sure you want to cancel?", vbQuestion + vbYesNo)
        If ask = "6" Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub
    Dim ttt As Char = ""
    Dim nnn As Boolean = False
    Private Sub product_id_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_name.KeyDown
        If e.KeyCode = Keys.Alt Then
            If Asc(e.KeyCode) <> 50 Then
                txt_search.Visible = True
                ttt = Chr(e.KeyCode)
                nnn = True
                txt_search.Focus()
            End If
        End If


    End Sub

    Private Sub customer_name_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles customer_name.KeyPress
        If e.KeyChar = Chr(27) Then
            Exit Sub
        End If
        If e.KeyChar <> Chr(18) Then
            txt_search.Text = e.KeyChar
            SendKeys.Send("{right}")
            txt_search.Visible = True
            txt_search.Focus()
        End If

    End Sub

    Private Sub product_id_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles customer_name.TextChanged

    End Sub
    Dim tmp_cust_id As String

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub DataGridView1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView1.KeyDown
        With DataGridView1
            If e.KeyCode = Keys.Enter Then
                load_customer_for_list()
            End If

            If e.KeyCode = 27 Then
                DataGridView1.Visible = False
                customer_name.Focus()
            End If
        End With
    End Sub

    Private Sub txt_search_ForeColorChanged(ByVal sender As Object, ByVal e As System.EventArgs) Handles txt_search.ForeColorChanged

    End Sub

    Private Sub txt_search_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyDown

        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            DataGridView1.Focus()
        End If
        With DataGridView1
            If e.KeyCode = Keys.Enter Then
                customer_name.Text = .Rows(0).Cells(1).Value 'Item Name
                customer_id = .Rows(0).Cells(0).Value 'patient id
                Dim k As String = get_single_value("due_amount", "tbl_customer", " id", customer_id)
                Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
                Label8.Text = ad_due & " Amount"
                'k = GetDueAmount(customer_id)
                amount_due.Text = Format(Val(k), "0.00")
                If ad_due = "Advance" Then
                    k = Val(k) * -1
                    copy_dua_amount.Text = Format(Val(k), "0.00")
                ElseIf ad_due = "Due" Then
                    copy_dua_amount.Text = Format(Val(k), "0.00")
                End If
                txt_search.Visible = False
                txt_search.Text = ""
                DataGridView1.Visible = False
                checklist_no.Focus()
                ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
            End If
        End With
    End Sub
    Public Sub load_customer_for_list()
        With DataGridView1
            If DataGridView1.Rows.Count > 0 Then
                customer_name.Text = .Rows(.CurrentRow.Index).Cells(1).Value 'Item Name
                customer_id = .Rows(.CurrentRow.Index).Cells(0).Value 'patient id
                tmp_cust_id = customer_id
                Dim k As String = get_single_value("due_amount", "tbl_customer", " id", customer_id)
                'k = GetDueAmount(customer_id)
                Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
                Label8.Text = ad_due & " Amount"
                If ad_due = "Advance" Then
                    k = Val(k) * -1
                    copy_dua_amount.Text = Format(Val(k), "0.00")
                ElseIf ad_due = "Due" Then
                    copy_dua_amount.Text = Format(Val(k), "0.00")
                End If
                amount_due.Text = Format(Val(k), "0.00")
                txt_search.Visible = False
                txt_search.Text = ""
                DataGridView1.Visible = False
                checklist_no.Focus()
                ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
            End If
        End With
    End Sub
    Private Sub txt_search_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyUp
        'If e.KeyCode = 27 Then Exit Sub
        If txt_search.Text.Length <= 1 And nnn = True Then
            txt_search.Text = ttt
            txt_search.SelectionStart = txt_search.TextLength
            nnn = False
        End If
    End Sub

    Private Sub txt_search_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txt_search.TextChanged
        load_customer()
    End Sub

    Private Sub DataGridView1_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles DataGridView1.KeyPress
        txt_search.Focus()
    End Sub

    Private Sub DataGridView2_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView2.CellContentClick


    End Sub

    Private Sub DataGridView2_CellEndEdit(ByVal sender As Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView2.CellEndEdit
        If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
            'SendKeys.Send("{up}")
            SendKeys.Send("{right}")
        Else
            SendKeys.Send("{up}")
            SendKeys.Send("{right}")
        End If
        Call load_sr()
        Call cal()
    End Sub
    Dim contain_id As Double = 0
    Private Sub DataGridView2_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView2.KeyDown
        On Error Resume Next
        If DataGridView2.CurrentCell Is Nothing Then Exit Sub
        If (e.KeyCode = Keys.I AndAlso e.Modifiers = Keys.Control) Then
            DataGridView2.Rows.Add(1)
            'DataGridView2.accept()
            Call load_sr()
        End If
        If e.KeyCode = Keys.Tab Then
            per.Focus()
        End If

        With DataGridView2
            If (e.KeyCode = Keys.D AndAlso e.Modifiers = Keys.Control) Then
                If DataGridView2.RowCount <= 1 Then Exit Sub
                c_row = .CurrentCell.RowIndex
                Dim curRowIndex, curColumnIndes As Integer
                curRowIndex = .CurrentCell.RowIndex
                curColumnIndes = .CurrentCell.ColumnIndex
                'If DataGridView2.Rows(c_row).Cells(6).Value > 0 Then
                '    'contain_id = contain_id & "," & Val(DataGridView2.Rows(c_row).Cells(6).Value)
                '    'DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
                '    DataGridView2.Rows(c_row).Cells("IsDeleted").Value = "Yes"
                '    DataGridView2.Rows(c_row).Visible = False
                'Else
                '    'DataGridView2.Rows.Remove(DataGridView2.Rows(c_row))
                '    DataGridView2.Rows(c_row).Visible = False
                '    DataGridView2.Rows(c_row).Cells("IsDeleted").Value = "Yes"
                'End If
                DataGridView2.Rows(c_row).Visible = False
                DataGridView2.Rows(c_row).Cells("IsDeleted").Value = "Yes"
                Call load_sr()
                Call cal()
                DataGridView2.Focus()
                SetNextAvailableCell(DataGridView2, curRowIndex, curColumnIndes)
                DataGridView2.Focus()
                Exit Sub
            End If
        End With
        If DataGridView2.CurrentCell.ColumnIndex = 1 Then
            If e.KeyCode <> Keys.Right And e.KeyCode <> Keys.Escape And e.KeyCode <> Keys.Left And e.KeyCode <> Keys.Up And e.KeyCode <> Keys.Down And e.KeyCode <> Keys.ControlKey And e.KeyCode <> Keys.Tab And e.KeyCode <> Keys.Enter Then
                ' MsgBox(Asc(e.KeyCode))
                If Asc(e.KeyCode) = 49 Then GoTo jjjj
                find_item.Visible = True
                ttt = Chr(e.KeyCode)
                nnn = True
                find_item.Focus()
jjjj:
            End If
        End If
        If e.KeyCode = Keys.Enter Then
            If DataGridView2.CurrentCell.ColumnIndex = 4 Then
                DataGridView2.AllowUserToAddRows = False
                With DataGridView2
                    If .Rows(.CurrentCell.RowIndex + 1).Cells(1).Value = "" Or .Rows(.CurrentCell.RowIndex + 1).Cells(1).Value = "Type Product Name" Then
                        DataGridView2.RowCount = Val(DataGridView2.RowCount) + 1
                    End If
                End With
                SendKeys.Send("{home}")
                SendKeys.Send("{left}")
            Else
                If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
                    'SendKeys.Send("{up}")
                    SendKeys.Send("{right}")
                Else
                    SendKeys.Send("{up}")
                    SendKeys.Send("{right}")
                End If
            End If
        End If
    End Sub

    Private Sub SetNextAvailableCell(dgv As DataGridView, currentRowIndex As Integer, currentColIndex As Integer)
        'If dgv.CurrentCell Is Nothing Then Exit Sub

        'Dim currentRowIndex As Integer = dgv.CurrentCell.RowIndex
        'Dim currentColIndex As Integer = dgv.CurrentCell.ColumnIndex

        Dim nextRowIndex As Integer = -1

        ' 1. Try next visible row
        For i As Integer = currentRowIndex + 1 To dgv.Rows.Count - 1
            If dgv.Rows(i).Visible Then
                nextRowIndex = i
                Exit For
            End If
        Next

        ' 2. If not found, try previous visible row
        If nextRowIndex = -1 Then
            For i As Integer = currentRowIndex - 1 To 0 Step -1
                If dgv.Rows(i).Visible Then
                    nextRowIndex = i
                    Exit For
                End If
            Next
        End If

        ' 3. Set focus if found
        If nextRowIndex <> -1 Then
            dgv.CurrentCell = dgv.Rows(nextRowIndex).Cells(currentColIndex)
        Else
            dgv.CurrentCell = Nothing ' No visible rows left
        End If
    End Sub
    Public Sub load_item_for_dou()
        With load_item
            DataGridView2.Rows(c_row).Cells(0).Value = c_row + 1
            DataGridView2.Rows(c_row).Cells(5).Value = .Rows(.CurrentRow.Index).Cells(0).Value 'Item ID
            DataGridView2.Rows(c_row).Cells(1).Value = .Rows(.CurrentRow.Index).Cells(2).Value 'item name
            DataGridView2.Rows(c_row).Cells(3).Value = .Rows(.CurrentRow.Index).Cells(3).Value 'unit
            DataGridView2.Rows(c_row).Cells(2).Value = 1
            load_item.Visible = False
            find_item.Visible = False
            find_item.Text = ""
            If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
                SendKeys.Send("{right}")
            Else
                'SendKeys.Send("{up}")
                SendKeys.Send("{right}")
            End If
            DataGridView2.Focus()
            find_item.Visible = False
        End With
    End Sub
    Private Sub load_item_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles load_item.KeyDown
        With load_item
            If e.KeyCode = Keys.Enter Then
                load_item_for_dou()
            End If

            If e.KeyCode = 27 Then
                load_item.Visible = False
                '  txtfind.Visible = False
                DataGridView2.Focus()
            End If
            Call load_sr()
            Call cal()
        End With
    End Sub
    Public Sub load_sr()
        With DataGridView2
            For i = 0 To .Rows.Count - 1
                If .Rows(i).Visible = True Then
                    .Rows(i).Cells(0).Value = i + 1
                End If
            Next
        End With
    End Sub

    Private Sub per_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles per.KeyDown
        Call ctrl_focus(e)

    End Sub

    Private Sub per_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles per.KeyPress
        Call isdigit(sender, e)
    End Sub

    Private Sub per_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles per.TextChanged
        'If Val(per.Text) = 0 Then
        '    discount.Enabled = True
        'ElseIf Val(per.Text) > 0 Then
        '    discount.Enabled = False
        'End If

        Call cal()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        'Button6.Text = "Sending...."
        is_pdf = True
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If invoice_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            invoice_no.Focus()
            Exit Sub
        End If
        If checklist_no.Text = "" Then
            MsgBox("Please Enter Checklist No", vbCritical, "WARNING")
            checklist_no.Focus()
            Exit Sub
        End If
        If case_debit.SelectedIndex = -1 Then
            MsgBox("Please Select Case / Debit", vbCritical, "WARNING")
            case_debit.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Or DataGridView2.Rows(0).Cells(1).Value = "Type Product Name" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        'PictureBox2.Visible = True
        msmsms = get_single_value("title_name", "tbl_customer", "id", customer_id)
        user_name = msmsms & " " & customer_name.Text
        Call saved()
        'If tmp_invoice_id > 0 Then

        'Else
        '    tmp_invoice_id = get_max_number("id", "tbl_invoice_main")
        'End If
        If tmp_invoice_id > 0 Then
            tmp_invoice_id = tmp_invoice_id
        Else
            tmp_invoice_id = get_max_number("id", "tbl_invoice_main")
        End If
        'MsgBox(tmp_invoice_id)
        invoice_id = tmp_invoice_id

        Call View_Invoice.load_grid_sql()



        'Exit Sub

        Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Invoice Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        'user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", tmp_invoice_id) & "-" & user_name
        Dim iMonth As Integer = Month(invoice_date.Value)
        folder_path = quot_path1 & "\" & MonthName(iMonth)

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If
        'MsgBox(file_name)
        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        Preview_Invoice_Report.Dispose()


        MsgBox("Invoice Details Saved!")
        Me.Dispose()
        Me.Close()
    End Sub
    Dim str1 As String = ""
    Dim msmsms As String = ""
    Public Sub saved1()
        msmsms = get_single_value("title_name", "tbl_customer", "id", customer_id)
        Dim variable As New Dictionary(Of String, String)
        old_date = Date.Now
        'MsgBox(Format(temp_date, "dd-MM-yyyy"))
        If customer_id <= 0 Then
            customer_id = tmp_cust_id
        End If

        Dim print_due As String
        If chk1.Checked = True Then
            print_due = "True"
        Else
            print_due = "False"
        End If

        Dim days As Integer = (old_date - temp_date).Days
        Dim edit_days As String = get_single_value("invoice_days", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If edit_days < days Then
            invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
            tmp_invoice_id = 0
            'invoice_date.Value = Date.Now
            Dim k As String = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
            Label8.Text = ad_due & " Amount"
            If ad_due = "Advance" Then
                copy_dua_amount.Text = "-" & Format(Val(k), "0.00")
            ElseIf ad_due = "Due" Then
                copy_dua_amount.Text = Format(Val(k), "0.00")
            End If
            amount_due.Text = Format(Val(k), "0.00")
            ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
            If old_invoice_date.Date = invoice_date.Value Then
                invoice_date.Value = Date.Now
            End If
            cal()
        End If
        If case_debit.Text = "CASH" Then
            If tmp_invoice_id > 0 Then
                Dim m1 As String = ""
                m1 = "update tbl_customer set due_amount='" & Math.Abs(Val(total_amt.Text) + Val(temp_paid_amount)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
                Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                m1 = "update tbl_customer set due_amount='" & Math.Abs(Val(total_amt.Text) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
            Else
                Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                Dim tot_amt As Double = Math.Abs(Val(total_amt.Text))
                Dim m1 As String = "update tbl_customer set due_amount='" & Math.Abs(Val(tot_amt) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
            End If
            'Dim k As String = "update tbl_customer set due_amount='" & Val(total_amt.Text) & "' where id='" & customer_id & "'"
            'cmd = New SqlCommand(k, con)
            'cmd.ExecuteNonQuery()

            If ad_de = "Advance" Then
                If Val(total_amt.Text) = Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(total_amt.Text) > Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf Val(paid_amount.Text) > Val(total_amt.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            ElseIf ad_de = "Due" Then
                If Val(total_amt.Text) = Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(total_amt.Text) > Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(paid_amount.Text) > Val(total_amt.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            End If
            '   variable.Add("due_amount", "'" & total_amt.Text & "'")
            Call SQL_Update("tbl_customer", variable, " id='" & customer_id & "'")
        ElseIf case_debit.Text = "CREDIT" Then
            'If invoice_id > 0 Then
            '    Dim m1 As String = ""
            '    m1 = "update tbl_customer set due_amount='" & Val(Val(total_amt.Text) + Val(temp_paid_amount)) & "' where id='" & customer_id & "'"
            '    cmd = New SqlCommand(m1, con)
            '    cmd.ExecuteNonQuery()
            '    Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
            '    m1 = "update tbl_customer set due_amount='" & Val(Val(total_amt.Text) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
            '    cmd = New SqlCommand(m1, con)
            '    cmd.ExecuteNonQuery()
            'Else


            If ad_de = "Advance" Then
                If Val(sub_total.Text) = Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf Val(sub_total.Text) > Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(amount_due.Text) > Val(sub_total.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            ElseIf ad_de = "Due" Then
                If Val(sub_total.Text) = Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(sub_total.Text) > Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(amount_due.Text) > Val(sub_total.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                End If
            End If
            If tmp_invoice_id > 0 Then
                Dim tmp As String
                tmp = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                tmp = Val(tmp) - Val(old_sub_total) + Val(sub_total.Text)

                Dim m1 As String = ""
                Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                m1 = "update tbl_customer set due_amount='" & Val(tmp) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
                'Dim get_due1 As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                'm1 = "update tbl_customer set due_amount='" & Math.Abs(Val(get_due1) + Math.Abs(Val(total_amt.Text))) & "' where id='" & customer_id & "'"
                'cmd = New SqlCommand(m1, con)
                'cmd.ExecuteNonQuery()
            Else
                Dim m1 As String = ""
                m1 = "update tbl_customer set due_amount='" & Math.Abs(Val(total_amt.Text)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
                'Else
                '    Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                '    Dim tot_amt As Double = Math.Abs(Val(total_amt.Text))
                '    Dim m1 As String = "update tbl_customer set due_amount='" & Math.Abs(Val(tot_amt) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
                '    cmd = New SqlCommand(m1, con)
                '    cmd.ExecuteNonQuery()
            End If
            'variable.Add("due_amount", "'" & Math.Abs(Val(total_amt.Text)) & "'")
            Call SQL_Update("tbl_customer", variable, " id='" & customer_id & "'")
            'Dim m1 As String = "update tbl_customer set due_amount='" & Val(total_amt.Text) & "' where id='" & customer_id & "'"
            'cmd = New SqlCommand(m1, con)
            'cmd.ExecuteNonQuery()
        End If

        variable.Clear()
        variable.Add("customer_id", "'" & Val(customer_id) & "'")
        variable.Add(invoice_no.Name, "'" & invoice_no.Text & "'")
        variable.Add(checklist_no.Name, "'" & checklist_no.Text & "'")
        variable.Add(sub_total.Name, "'" & Val(sub_total.Text) & "'")
        variable.Add(amount_due.Name, "'" & Val(amount_due.Text) & "'")
        variable.Add(discount.Name, "'" & Val(discount.Text) & "'")
        variable.Add("total", "'" & Math.Abs(Val(total_amt.Text)) & "'")
        variable.Add(per.Name, "'" & Val(per.Text) & "'")
        variable.Add(invoice_date.Name, "'" & Format(invoice_date.Value, "dd-MMM-yyyy") & "'")
        variable.Add(vat.Name, "'" & Val(vat.Text) & "'")
        variable.Add(case_debit.Name, "'" & case_debit.Text & "'")
        If case_debit.Text = "CASH" Then
            variable.Add(paid_amount.Name, "'" & Val(paid_amount.Text) & "'")
        End If

        Call time_count()
        variable.Add("no", "'" & tot_time & "'")
        variable.Add("cr_dr", "'" & str1 & "'")
        variable.Add("balance", "'" & Math.Abs(Val(total_amt.Text) - Val(paid_amount.Text)) & "'")
        variable.Add("identify", "'" & Label8.Text.Replace(" Amount", "") & "'")
        variable.Add("print_due", "'" & print_due & "'")
        If identify = "Quotation" Then
            Dim d As Integer = SQL_Insert("tbl_invoice_main", variable)
        Else
            If tmp_invoice_id > 0 Then

                Dim d As String = SQL_Update("tbl_invoice_main", variable, "id=" & tmp_invoice_id)
            Else

                Dim d As Integer = SQL_Insert("tbl_invoice_main", variable)
            End If
        End If

        Dim main_id As Double = 0
        If identify = "Quotation" Then
            main_id = get_max_number("id", "tbl_invoice_main")
        Else
            If tmp_invoice_id > 0 Then
                main_id = tmp_invoice_id
            Else
                main_id = get_max_number("id", "tbl_invoice_main")
            End If
        End If

        For i = 0 To DataGridView2.Rows.Count - 1
            With DataGridView2
                If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Type Product Name" Then GoTo kkk
                'MsgBox(.Rows(i).Cells(1).Value)
                Dim load_id As Double
                Dim qty, product_id, unit_price, row_total As Double
                qty = Val(.Rows(i).Cells(2).Value)
                unit_price = Val(.Rows(i).Cells(3).Value)
                row_total = Val(.Rows(i).Cells(4).Value)
                product_id = Val(.Rows(i).Cells(5).Value)
                load_id = Val(.Rows(i).Cells(6).Value)
                Dim sr_no As Double = Val(.Rows(i).Cells(0).Value)
                Dim q As String = ""
                If tmp_invoice_id = 0 Then
                    load_id = 0
                End If
                If load_id > 0 Then
                    q = "update tbl_invoice_sub set qty='" & qty & "',product_id='" & product_id & "'" &
                        ",unit_price='" & unit_price & "',row_total='" & row_total & "',s_no='" & sr_no & "' where id='" & load_id & "'"
                Else
                    q = "insert into tbl_invoice_sub(main_id,qty,product_id,unit_price,row_total,s_no) values " &
                        " ('" & main_id & "','" & qty & "','" & product_id & "','" & unit_price & "','" & row_total & "','" & sr_no & "')"
                End If
                cmd = New SqlCommand(q, con)
                cmd.ExecuteNonQuery()
            End With
kkk:
        Next
        If tmp_invoice_id = 0 Then
            Dim q As String = "update tbl_numbers set invoice_no='" & Val(invoice_no.Text) + 1 & "' where id='" & get_max_number("id", "tbl_numbers") & "'"
            cmd = New SqlCommand(q, con)
            cmd.ExecuteNonQuery()
        End If


        Dim LineOfText As String
        Dim i1 As Integer
        Dim aryTextFile() As String

        LineOfText = contain_id

        aryTextFile = LineOfText.Split(",")

        For i1 = 0 To UBound(aryTextFile)
            Dim id As Double = Val(aryTextFile(i1))

            Dim m As String = "delete from tbl_invoice_sub where id='" & id & "'"
            cmd = New SqlCommand(m, con)
            cmd.ExecuteNonQuery()

        Next i1
    End Sub


    Public Sub saved()
        msmsms = get_single_value("title_name", "tbl_customer", "id", customer_id)
        Dim variable As New Dictionary(Of String, String)
        old_date = Date.Now
        'MsgBox(Format(temp_date, "dd-MM-yyyy"))
        If customer_id <= 0 Then
            customer_id = tmp_cust_id
        End If

        Dim print_due As String
        If chk1.Checked = True Then
            print_due = "True"
        Else
            print_due = "False"
        End If

        Dim days As Integer = (old_date - temp_date).Days
        Dim edit_days As String = get_single_value("invoice_days", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If edit_days < days Then
            invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
            tmp_invoice_id = 0
            'invoice_date.Value = Date.Now
            Dim k As String = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
            Label8.Text = ad_due & " Amount"
            If ad_due = "Advance" Then
                copy_dua_amount.Text = "-" & Format(Val(k), "0.00")
            ElseIf ad_due = "Due" Then
                copy_dua_amount.Text = Format(Val(k), "0.00")
            End If
            amount_due.Text = Format(Val(k), "0.00")
            ad_de = get_single_value("ad_due", "tbl_customer", "id", customer_id)
            If old_invoice_date.Date = invoice_date.Value Then
                invoice_date.Value = Date.Now
            End If
            cal()
        End If
        If case_debit.Text = "CASH" Then
            If tmp_invoice_id > 0 Then
                Dim m1 As String = ""
                m1 = "update tbl_customer set due_amount='" & Math.Abs(Val(total_amt.Text) + Val(temp_paid_amount)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
                Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                m1 = "update tbl_customer set due_amount='" & Math.Abs(Val(total_amt.Text) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
            Else
                Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                Dim tot_amt As Double = Math.Abs(Val(total_amt.Text))
                Dim m1 As String = "update tbl_customer set due_amount='" & Math.Abs(Val(tot_amt) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
            End If
            'Dim k As String = "update tbl_customer set due_amount='" & Val(total_amt.Text) & "' where id='" & customer_id & "'"
            'cmd = New SqlCommand(k, con)
            'cmd.ExecuteNonQuery()

            If ad_de = "Advance" Then
                If Val(total_amt.Text) = Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(total_amt.Text) > Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf Val(paid_amount.Text) > Val(total_amt.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            ElseIf ad_de = "Due" Then
                If Val(total_amt.Text) = Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(total_amt.Text) > Val(paid_amount.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(paid_amount.Text) > Val(total_amt.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            End If
            '   variable.Add("due_amount", "'" & total_amt.Text & "'")
            Call SQL_Update("tbl_customer", variable, " id='" & customer_id & "'")
        ElseIf case_debit.Text = "CREDIT" Then
            'If invoice_id > 0 Then
            '    Dim m1 As String = ""
            '    m1 = "update tbl_customer set due_amount='" & Val(Val(total_amt.Text) + Val(temp_paid_amount)) & "' where id='" & customer_id & "'"
            '    cmd = New SqlCommand(m1, con)
            '    cmd.ExecuteNonQuery()
            '    Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
            '    m1 = "update tbl_customer set due_amount='" & Val(Val(total_amt.Text) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
            '    cmd = New SqlCommand(m1, con)
            '    cmd.ExecuteNonQuery()
            'Else


            If ad_de = "Advance" Then
                If Val(sub_total.Text) = Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf Val(sub_total.Text) > Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(amount_due.Text) > Val(sub_total.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            ElseIf ad_de = "Due" Then
                If Val(sub_total.Text) = Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(sub_total.Text) > Val(amount_due.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(amount_due.Text) > Val(sub_total.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                End If
            End If
            If tmp_invoice_id > 0 Then
                Dim oldDueAmt As String
                oldDueAmt = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                'Dim newDueAmt As String = Val(oldDueAmt) - Val(old_sub_total) + Val(sub_total.Text)
                Dim newDueAmt As String = Val(oldDueAmt) - Val(old_sub_total) + Val(total_amt.Text)

                Dim m1 As String = ""
                Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                m1 = "update tbl_customer set due_amount='" & Val(newDueAmt) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
                'Dim get_due1 As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                'm1 = "update tbl_customer set due_amount='" & Math.Abs(Val(get_due1) + Math.Abs(Val(total_amt.Text))) & "' where id='" & customer_id & "'"
                'cmd = New SqlCommand(m1, con)
                'cmd.ExecuteNonQuery()
            Else
                Dim oldDueAmt As String
                oldDueAmt = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                'Dim newDueAmt As String = Val(oldDueAmt) + Val(sub_total.Text)
                Dim m1 As String = ""
                m1 = "update tbl_customer set due_amount='" & Math.Abs(Val(total_amt.Text)) & "' where id='" & customer_id & "'"
                'm1 = "update tbl_customer set due_amount='" & Math.Abs(Val(newDueAmt)) & "' where id='" & customer_id & "'"
                cmd = New SqlCommand(m1, con)
                cmd.ExecuteNonQuery()
                'Else
                '    Dim get_due As Double = get_single_value("due_amount", "tbl_customer", "id", customer_id)
                '    Dim tot_amt As Double = Math.Abs(Val(total_amt.Text))
                '    Dim m1 As String = "update tbl_customer set due_amount='" & Math.Abs(Val(tot_amt) - Val(paid_amount.Text)) & "' where id='" & customer_id & "'"
                '    cmd = New SqlCommand(m1, con)
                '    cmd.ExecuteNonQuery()
            End If
            'variable.Add("due_amount", "'" & Math.Abs(Val(total_amt.Text)) & "'")
            Call SQL_Update("tbl_customer", variable, " id='" & customer_id & "'")
            'Dim m1 As String = "update tbl_customer set due_amount='" & Val(total_amt.Text) & "' where id='" & customer_id & "'"
            'cmd = New SqlCommand(m1, con)
            'cmd.ExecuteNonQuery()
        End If

        variable.Clear()
        variable.Add("customer_id", "'" & Val(customer_id) & "'")
        variable.Add(invoice_no.Name, "'" & invoice_no.Text & "'")
        variable.Add(checklist_no.Name, "'" & checklist_no.Text & "'")
        variable.Add(sub_total.Name, "'" & Val(sub_total.Text) & "'")
        variable.Add(amount_due.Name, "'" & Val(amount_due.Text) & "'")
        variable.Add(discount.Name, "'" & Val(discount.Text) & "'")
        variable.Add("total", "'" & Math.Abs(Val(total_amt.Text)) & "'")
        variable.Add(per.Name, "'" & Val(per.Text) & "'")
        variable.Add(invoice_date.Name, "'" & Format(invoice_date.Value, "dd-MMM-yyyy") & "'")
        variable.Add(vat.Name, "'" & Val(vat.Text) & "'")
        variable.Add(case_debit.Name, "'" & case_debit.Text & "'")
        If case_debit.Text = "CASH" Then
            variable.Add(paid_amount.Name, "'" & Val(paid_amount.Text) & "'")
        End If

        Call time_count()
        variable.Add("no", "'" & tot_time & "'")
        variable.Add("cr_dr", "'" & str1 & "'")
        variable.Add("balance", "'" & Math.Abs(Val(total_amt.Text) - Val(paid_amount.Text)) & "'")
        variable.Add("identify", "'" & Label8.Text.Replace(" Amount", "") & "'")
        variable.Add("print_due", "'" & print_due & "'")
        If identify = "Quotation" Then
            Dim d As Integer = SQL_Insert("tbl_invoice_main", variable)
        Else
            If tmp_invoice_id > 0 Then

                Dim d As String = SQL_Update("tbl_invoice_main", variable, "id=" & tmp_invoice_id)
            Else

                Dim d As Integer = SQL_Insert("tbl_invoice_main", variable)
            End If
        End If

        Dim main_id As Double = 0
        If identify = "Quotation" Then
            main_id = get_max_number("id", "tbl_invoice_main")
        Else
            If tmp_invoice_id > 0 Then
                main_id = tmp_invoice_id
            Else
                main_id = get_max_number("id", "tbl_invoice_main")
            End If
        End If

        For i = 0 To DataGridView2.Rows.Count - 1
            With DataGridView2
                If Val(.Rows(i).Cells("ItemId").Value) > 0 Then

                    'If .Rows(i).Cells(1).Value = "" Or .Rows(i).Cells(1).Value = "Type Product Name" Then GoTo kkk
                    'MsgBox(.Rows(i).Cells(1).Value)
                    If .Rows(i).Visible = True Then
                        Dim mainRowId As Long
                        Dim qty, product_id, unit_price, row_total As Double
                        qty = Val(.Rows(i).Cells("Qty").Value)
                        unit_price = Val(.Rows(i).Cells("UnitPrice").Value)
                        row_total = Val(.Rows(i).Cells("Total").Value)
                        product_id = Val(.Rows(i).Cells("ItemId").Value)
                        mainRowId = Val(.Rows(i).Cells("Id").Value)
                        Dim sr_no As Double = Val(.Rows(i).Cells("SrNo").Value)
                        Dim q As String = ""
                        If tmp_invoice_id = 0 Then
                            mainRowId = 0
                        End If
                        If mainRowId > 0 Then
                            q = "update tbl_invoice_sub set qty='" & qty & "',product_id='" & product_id & "'" &
                        ",unit_price='" & unit_price & "',row_total='" & row_total & "',s_no='" & sr_no & "' where id='" & mainRowId & "'"
                        Else
                            q = "insert into tbl_invoice_sub(main_id,qty,product_id,unit_price,row_total,s_no) values " &
                        " ('" & main_id & "','" & qty & "','" & product_id & "','" & unit_price & "','" & row_total & "','" & sr_no & "')"
                        End If
                        cmd = New SqlCommand(q, con)
                        cmd.ExecuteNonQuery()
                    Else
                        Dim mainRowId As Long = Val(.Rows(i).Cells("Id").Value)
                        If .Rows(i).Cells("IsDeleted").Value = "Yes" Then
                            Dim m As String = "delete from tbl_invoice_sub where id='" & mainRowId & "'"
                            cmd = New SqlCommand(m, con)
                            cmd.ExecuteNonQuery()
                        End If
                    End If
                End If
            End With
            'kkk:
        Next
        If tmp_invoice_id = 0 Then
            Dim q As String = "update tbl_numbers set invoice_no='" & Val(invoice_no.Text) + 1 & "' where id='" & get_max_number("id", "tbl_numbers") & "'"
            cmd = New SqlCommand(q, con)
            cmd.ExecuteNonQuery()
        End If


        'Dim LineOfText As String
        'Dim i1 As Integer
        'Dim aryTextFile() As String

        'LineOfText = contain_id

        'aryTextFile = LineOfText.Split(",")

        'For i1 = 0 To UBound(aryTextFile)
        '    Dim id As Double = Val(aryTextFile(i1))

        '    Dim m As String = "delete from tbl_invoice_sub where id='" & id & "'"
        '    cmd = New SqlCommand(m, con)
        '    cmd.ExecuteNonQuery()

        'Next i1
    End Sub

    Private Sub discount_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs)
        Call ctrl_focus(e)
    End Sub

    Private Sub discount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)

        cal()
    End Sub

    Private Sub find_item_Invalidated(ByVal sender As Object, ByVal e As System.Windows.Forms.InvalidateEventArgs) Handles find_item.Invalidated

    End Sub

    Private Sub find_item_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles find_item.KeyDown
        If e.KeyCode = Keys.Enter Then
            With load_item
                If e.KeyCode = Keys.Enter Then
                    If .Rows.Count > 0 Then

                        DataGridView2.Rows(c_row).Cells(0).Value = c_row + 1

                        DataGridView2.Rows(c_row).Cells(5).Value = .Rows(0).Cells(0).Value 'Item ID
                        'DataGridView2.Rows(c_row).Cells(1).Value = .Rows(.CurrentRow.Index).Cells(1).Value 'Item code
                        DataGridView2.Rows(c_row).Cells(1).Value = .Rows(0).Cells(2).Value 'item name
                        DataGridView2.Rows(c_row).Cells(3).Value = .Rows(0).Cells(3).Value 'unit
                        DataGridView2.Rows(c_row).Cells(2).Value = 1
                        load_item.Visible = False
                        find_item.Visible = False
                        find_item.Text = ""

                        If Val(DataGridView2.CurrentCell.RowIndex) = Val(DataGridView2.RowCount - 1) Then
                            'SendKeys.Send("{up}")
                            SendKeys.Send("{right}")
                        Else
                            SendKeys.Send("{up}")
                            SendKeys.Send("{right}")
                        End If
                        DataGridView2.Focus()
                        find_item.Visible = False
                    End If
                End If
            End With
        End If

        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            load_item.Focus()
        End If
        Call load_sr()
        Call cal()
    End Sub

    Private Sub find_item_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles find_item.KeyUp
        If find_item.Text.Length <= 1 And nnn = True Then
            find_item.Text = ttt
            find_item.SelectionStart = find_item.TextLength
            nnn = False
        End If
    End Sub

    Private Sub find_item_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find_item.TextChanged
        If find_item.TextLength > 0 Then
            With DataGridView2
                load_item.Visible = True
                find_item.Visible = True

                'load_item.Focus()
                'TextBox1.Focus()
                c_row = .CurrentCell.RowIndex
                c_col = .CurrentCell.ColumnIndex
            End With
            Call load_items()
        Else
            load_item.DataSource = Nothing
        End If
    End Sub

    Private Sub invoice_no_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles invoice_no.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub invoice_no_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles invoice_no.TextChanged

    End Sub

    Private Sub checklist_no_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles checklist_no.KeyDown
        If e.KeyCode = Keys.Enter Then
            load_type.Focus()
        End If
    End Sub

    Private Sub checklist_no_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles checklist_no.TextChanged

    End Sub

    Private Sub vat_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles vat.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub vat_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles vat.TextChanged

    End Sub

    Private Sub load_item_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles load_item.KeyPress
        If Asc(e.KeyChar) <> Keys.Space Then
            find_item.Focus()
        End If
    End Sub

    Private Sub DateTimePicker1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles invoice_date.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub DateTimePicker1_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles invoice_date.ValueChanged

    End Sub

    Private Sub Label4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label4.Click

    End Sub

    Private Sub load_type_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles load_type.KeyDown
        If e.KeyCode = Keys.Enter Then
            DataGridView2.Focus()
        End If
    End Sub

    Private Sub load_type_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles load_type.SelectedIndexChanged
        load_items()
    End Sub

    Private Sub CheckBox1_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles all_type.CheckedChanged
        If all_type.Checked = True Then
            load_type.Enabled = False
        Else
            load_type.Enabled = True
        End If
        Call load_items()
    End Sub

    Private Sub DataGridView2_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles DataGridView2.KeyPress
        'If Asc(e.KeyChar) <> 8 Then
        '    If Asc(e.KeyChar) > 65 Or Asc(e.KeyChar) < 90 Or Asc(e.KeyChar) > 96 Or Asc(e.KeyChar) < 122 Then
        '        e.Handled = True
        '    End If
        'End If
    End Sub

    Private Sub vat_per_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles vat_per.TextChanged

    End Sub

    Private Sub all_type_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles all_type.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        customer_id = 0
        Call __show(Add_Edit_Customer)
        load_nav_bar("Add_Edit_Customer", "Add Customer")
    End Sub

    Public Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If invoice_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            invoice_no.Focus()
            Exit Sub
        End If
        If checklist_no.Text = "" Then
            MsgBox("Please Enter Checklist No", vbCritical, "WARNING")
            checklist_no.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Or DataGridView2.Rows(0).Cells(1).Value = "Type Product Name" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        Call saved()
        Console.WriteLine(customer_id)
        Console.WriteLine(customer_name)
        If tmp_invoice_id > 0 Then
            tmp_invoice_id = tmp_invoice_id
        Else
            tmp_invoice_id = get_max_number("id", "tbl_invoice_main")
        End If
        'MsgBox(tmp_invoice_id)
        invoice_id = tmp_invoice_id
        If chk1.Checked = True Then
            print_due_amt_on_invoice = True
        ElseIf chk1.Checked = False Then
            print_due_amt_on_invoice = False
        End If
        Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
        'load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
        'Call View_Invoice.load_grid_sql()
        'Me.Dispose()
        'Me.Close()
        'Exit Sub
        Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Invoice Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If

        user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", tmp_invoice_id) & "-" & user_name
        Dim iMonth As Integer = Month(invoice_date.Value)
        folder_path = quot_path1 & "\" & MonthName(iMonth)

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If
        'MsgBox(file_name)
        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        Call __show(Preview_Invoice_Report)
        load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
        Call View_Invoice.load_grid_sql()
        Me.Dispose()
        Me.Close()
    End Sub
    Public Sub pdf()
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If invoice_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            invoice_no.Focus()
            Exit Sub
        End If
        If checklist_no.Text = "" Then
            MsgBox("Please Enter Checklist No", vbCritical, "WARNING")
            checklist_no.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Or DataGridView2.Rows(0).Cells(1).Value = "Type Product Name" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        If tmp_invoice_id > 0 Then
            tmp_invoice_id = tmp_invoice_id
        Else
            tmp_invoice_id = get_max_number("id", "tbl_invoice_main")
        End If
        Call __show(Preview_Invoice_Report)
        load_nav_bar("Preview_Invoice_Report", "Preview Invoice")
        Call View_Invoice.load_grid_sql()

    End Sub

    Private Sub paid_amount_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles paid_amount.KeyPress

        Call isamount(sender, e)
    End Sub

    Private Sub paid_amount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles paid_amount.TextChanged
        'paid_amount.Text = Val(Val(total_amt.Text) - Val(temp))
    End Sub

    Private Sub ComboBox1_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles case_debit.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub ComboBox1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles case_debit.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles case_debit.SelectedIndexChanged
        If case_debit.Text = "CASH" Then
            paid_amount.Enabled = True
        ElseIf case_debit.Text = "CREDIT" Then
            paid_amount.Enabled = False
        End If
    End Sub

    Private Sub DataGridView2_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView2.KeyUp

    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
        For Each item As TextBox In textboxes
            item.Text = ""
        Next
        load_type.SelectedIndex = -1
        customer_name.Text = "Type Customer Name"
        customer_id = 0
        tmp_invoice_id = 0
        invoice_date.Value = Date.Now
        case_debit.SelectedIndex = -1
        DataGridView2.Rows.Clear()
        DataGridView2.Rows.Insert(0, 1, "Type Product Name")
        load_type.SelectedIndex = 0
        case_debit.SelectedIndex = 1
        invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
        amount_due.Text = ""
        total_amt.Text = ""
    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click

        'Button6.Text = "Sending...."
        is_pdf = True
        If customer_name.Text = "" Then
            MsgBox("Please Enter Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If invoice_no.Text = "" Then
            MsgBox("Please Enter Invoice No", vbCritical, "WARNING")
            invoice_no.Focus()
            Exit Sub
        End If
        If checklist_no.Text = "" Then
            MsgBox("Please Enter Checklist No", vbCritical, "WARNING")
            checklist_no.Focus()
            Exit Sub
        End If
        If case_debit.SelectedIndex = -1 Then
            MsgBox("Please Select Case / Debit", vbCritical, "WARNING")
            case_debit.Focus()
            Exit Sub
        End If
        If DataGridView2.Rows(0).Cells(1).Value = "" Or DataGridView2.Rows(0).Cells(1).Value = "Type Product Name" Then
            MsgBox("There Is No Data To Proccess", vbCritical, "WARNING")
            DataGridView2.Focus()
            Exit Sub
        End If
        'PictureBox2.Visible = True
        Call saved()

        If tmp_invoice_id > 0 Then
            tmp_invoice_id = tmp_invoice_id
        Else
            tmp_invoice_id = get_max_number("id", "tbl_invoice_main")
        End If
        'MsgBox(tmp_invoice_id)
        invoice_id = tmp_invoice_id

        'invoice_id = tmp_invoice_id
        'If invoice_id > 0 Then

        'Else
        '    invoice_id = get_max_number("id", "tbl_invoice_main")
        'End If
        'MsgBox(invoice_id)
        Dim FrmPreview_Invoice_Report As New Preview_Invoice_Report()
        Call View_Invoice.load_grid_sql()
        'Call Preview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
        FrmPreview_Invoice_Report.Preview_Invoice_Report_Load(sender, e)
        Dim quot_path1 As String = get_single_value("Invoice_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Invoice Save Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        user_name = msmsms & " " & customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        Dim file_name As String = "INV" & get_single_value("invoice_no", "tbl_invoice_main", "id", invoice_id) & "-" & user_name
        Dim iMonth As Integer = Month(invoice_date.Value)
        folder_path = quot_path1 & "\" & MonthName(iMonth)
        'MsgBox(file_name)
        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        'Dim Bytes() As Byte = Preview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        Dim Bytes() As Byte = FrmPreview_Invoice_Report.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)
        'pdf_path = quot_path1 & "\" & user_name & "\" & file_name & ".pdf"
        pdf_path = quot_path1 & "\" & MonthName(iMonth) & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
        End Using
        direct_email.receiver_id.Text = get_single_value("email", "tbl_customer", "id", customer_id)
        Dim temp_id As String = get_single_value("id", "tbl_email", "identify", "INVOICE")
        direct_email.sender_id.Text = get_single_value("sender", "tbl_email", "id", Val(temp_id))
        direct_email.Subject.Text = get_single_value("subject", "tbl_email", "id", Val(temp_id))
        direct_email.sub_subject.Text = get_single_value("sub_subject", "tbl_email", "id", Val(temp_id))
        direct_email.passss.Text = get_single_value("sender_pass", "tbl_email", "id", Val(temp_id))
        direct_email.body.Text = get_single_value("body", "tbl_email", "id", Val(temp_id))
        direct_email.attach.Text = pdf_path
        Dim title As String = get_single_value("title_name", "tbl_customer", "id", customer_id)

        'direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", title & " " & customer_name.Text & ",")
        direct_email.body.Text = direct_email.body.Text.Replace("<date>", Format(invoice_date.Value, "dd.MM.yyyy") & ".")
        Dim contact As String = get_single_value("contact", "tbl_customer", "id", customer_id)
        If contact = "" Then
            direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", "")
        Else
            direct_email.body.Text = direct_email.body.Text.Replace("<contact person>", contact)
        End If

        Call direct_email.ShowDialog()
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        new_pro_key = True
        product_ids = 0
        Call __show(Add_Edit_Product)
        load_nav_bar("Add_Edit_Product", "Add Product")
    End Sub

    Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        load_customer_for_list()
    End Sub

    Private Sub load_item_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles load_item.MouseDoubleClick
        load_item_for_dou()
        cal()
        load_sr()
    End Sub

    Private Sub Button8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button8.Click
        receipt_id = 0
        Receipt_voucher_ID = customer_id
        load_dua_amount = Val(amount_due.Text)
        If Receipt_voucher_ID = 0 Then
            MsgBox("Please Select Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        GLOBLE_INVOICE_NO = invoice_no.Text
        Call __show(Add_Edit_Receipt)
        load_nav_bar("Add_Edit_Receipt", "Add Receipt")
    End Sub

    Private Sub load_item_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles load_item.CellContentClick

    End Sub

    Private Sub copy_dua_amount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles copy_dua_amount.TextChanged
        'copy_dua_amount.Text = Format(Val(amount_due.Text), "0.00")
    End Sub

    Private Sub amount_due_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles amount_due.TextChanged
        amount_due.Text = Format(Val(amount_due.Text), "0.00")
    End Sub

    Private Sub discount_TextChanged_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles discount.TextChanged
        cal()
    End Sub
End Class