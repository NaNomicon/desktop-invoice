Imports System.Data.SqlClient
Imports System.IO

Public Class Add_Edit_Receipt
    Dim advance As Boolean = False
    Dim TotalDueAmountGlobal As Double = 0
    Private Sub Label8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Add_Edit_Receipt_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Add_Edit_Receipt_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub
    Dim pre_load_status As String = ""
    Public save_ad_due, cr_dr As String
    Private Sub Add_Edit_Receipt_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        'lblFinalDueAmount.Text = ""
        Call set_fonr(Me, Label2)
        Label2.Font = New Font("Franklin Gothic Medium Cond", 19, FontStyle.Bold)
        'lblFinalDueAmount.Font = New Font("Franklin Gothic Medium Cond", 12, FontStyle.Bold)

        Call con_sql()
        Me.KeyPreview = True
        receipt_no.Text = get_single_value("receipt_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
        If receipt_id > 0 Or Receipt_voucher_ID > 0 Then
            receipt_no.Text = get_single_value("receipt_no", "tbl_numbers", "id", get_max_number("id", "tbl_numbers"))
            Call load_data()
        End If
        load_grid()
    End Sub
    Dim amt As Double = 0
    Public Sub load_grid()
        Call grids1(DataGridView2)
        DataGridView2.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells
        Dim A, B As String
        A = "SELECT tbl_invoice_main.id AS IID, 'INVOICE' AS aaa, FORMAT(tbl_invoice_main.invoice_date, 'dd-MM-yyyy') AS IDATE, tbl_invoice_main.invoice_no AS INO, tbl_invoice_main.checklist_no AS ICHECK, tbl_invoice_main.sub_total - tbl_invoice_main.discount AS ITOTAL, tbl_invoice_main.paid_amount AS IPAID, '-' AS ICHE,tbl_invoice_main.balance AS IBAL, tbl_invoice_main.no as extra,tbl_invoice_main.cr_dr as DDD, '' as ExtraA FROM tbl_invoice_main INNER JOIN tbl_customer ON tbl_invoice_main.customer_id = tbl_customer.id WHERE (tbl_invoice_main.customer_id='" & customer_id & "')"
        B = "SELECT tbl_receipt.id AS RID, 'RECEIPT' AS RE, FORMAT(tbl_receipt.receipt_date, 'dd-MM-yyyy') AS IDATE, tbl_receipt.receipt_no AS RNO, '-' AS RCHECK, tbl_receipt.amount_received AS RTOTAL," &
            " tbl_receipt.amount_received AS RPAID, tbl_receipt.cheque_no AS RCHE, tbl_receipt.due_amount AS RBAL, tbl_receipt.no as extra, tbl_receipt.cr_dr as DDD1, '' as ExtraB FROM tbl_receipt INNER JOIN tbl_customer AS tbl_customer_1 ON tbl_receipt.customer_id = tbl_customer_1.id WHERE (tbl_receipt.customer_id='" & customer_id & "')"
        report_qurty = A & " UNION " & B & " Order by extra desc"
        Call SQL_Query(A & " UNION " & B, " Order by extra desc")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView2.DataSource = ds.Tables(0)
            With DataGridView2
                .Columns(0).Visible = False
                .Columns(1).HeaderText = "INV/REC"
                .Columns(2).HeaderText = "Date"
                .Columns(3).HeaderText = "No"
                .Columns(4).HeaderText = "Checklist No"
                '.Columns(4).Visible = False
                .Columns(5).HeaderText = "Invoice Amount"
                .Columns(6).HeaderText = "Paid Amount"
                .Columns(7).HeaderText = "Cheque No"
                .Columns(7).Visible = False
                .Columns(8).HeaderText = "Balance"
                .Columns(9).Visible = False

                .Columns(10).HeaderText = "-"
                .Columns(10).DisplayIndex = 8
                .Columns(10).Width = 30
                amt = Val(ds.Tables(0).Rows(0).ItemArray(8).ToString)
                For i = 0 To DataGridView2.Rows.Count - 1
                    If .Rows(i).Cells(6).Value.ToString <> "" Then
                        .Rows(i).Cells(1).Value = "Payment"
                    Else
                        .Rows(i).Cells(1).Value = "Invoice"
                    End If
                    If .Rows(i).Cells(10).Value.ToString = "Cr." Then
                        .Rows(i).Cells(11).Value = "-" & Val(.Rows(i).Cells(8).Value)
                    Else
                        .Rows(i).Cells(11).Value = Val(.Rows(i).Cells(8).Value)
                    End If
                Next
                .Columns(3).Visible = False
                .Columns(8).Visible = False
                .Columns(10).Visible = False
                .Columns(6).Visible = False
                .Columns(11).HeaderText = "Balance"
                .Columns(5).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(5).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight

                .Columns(5).DefaultCellStyle.Format = "#,0.00"

                .Columns(6).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(6).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight

                .Columns(11).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns(11).HeaderCell.Style.Alignment = DataGridViewContentAlignment.MiddleRight
                DataGridView2.Columns(11).Visible = False
            End With

            ''***************** Show Total Due at Grid Bottom Label ******************************
            'Dim query As String = $"SELECT 
            '                  customer_id,
            '                  SUM(total) AS TotalDueAmount
            '              FROM 
            '                  tbl_invoice_main
            '              WHERE 
            '                  customer_id = {customer_id} group by customer_id"
            'query = $"SELECT
            '            customer_id,
            '            SUM(total) AS TotalDueAmount,
            '            (
            '                SELECT SUM(r.amount_received)
            '                FROM tbl_receipt r
            '                WHERE r.customer_id = i.customer_id
            '            ) AS TotalReceived,
            '            (
            '                SUM(total) -
            '                COALESCE((
            '                    SELECT SUM(r.amount_received)
            '                    FROM tbl_receipt r
            '                    WHERE r.customer_id = i.customer_id
            '                ), 0)
            '            ) AS FinalDueAmount
            '        FROM 
            '            tbl_invoice_main i
            '        WHERE 
            '            customer_id = {customer_id}
            '        GROUP BY 
            '            customer_id"
            'Dim ds1 As DataSet = SQL_Query(query)
            'If ds1.Tables(0).Rows.Count > 0 Then
            '    Dim TotalDueAmount As Double = Format(Val(ds1.Tables(0).Rows(0).Item("TotalDueAmount").ToString), "0.00")
            '    Dim TotalReceivedAmount As Double = Format(Val(ds1.Tables(0).Rows(0).Item("TotalReceived").ToString), "0.00")
            '    Dim FinalDueAmount As Double = Format(Val(ds1.Tables(0).Rows(0).Item("FinalDueAmount").ToString), "0.00")
            '    TotalDueAmountGlobal = FinalDueAmount
            '    lblTotalDueAmount.Text = "Total Due Amount : " & Format(TotalDueAmount, "0.00")
            '    lblTotalReceivedAmount.Text = "Total Received Amount : " & Format(TotalReceivedAmount, "0.00")
            '    lblFinalDueAmount.Text = "Final Due Amount : " & Format(FinalDueAmount, "0.00")
            '    amount_received.Text = FinalDueAmount
            '    'due_amount.Text = DueAmount
            '    'due_amount.Text = 0
            'End If
        Else
            DataGridView2.DataSource = Nothing
        End If
    End Sub
    Dim identify As String = ""
    Dim pre_load_amount As Double = 0
    Dim pre_load_amount_paid As Double = 0
    Dim last_bal As Double = 0
    Public Sub load_data()
        If Receipt_voucher_ID > 0 Then
            identify = "V"
        ElseIf receipt_id > 0 Then
            identify = "R"
        End If
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
        If ds.Tables(0).Rows.Count > 0 Then
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
                'k = ds.Tables(0).Rows(0).Item("due_amount").ToString
                k = Val(due_amount.Text)
                load_dua_amount = k
                ' amount_received.Text = k 'ds.Tables(0).Rows(0).Item("due_amount").ToString
                amount_received.Text = Format(k, "0.00")
                amount_received.Focus()

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
                k = Val(due_amount.Text)
                Dim t1, t2, t3 As String
                t1 = ds.Tables(0).Rows(0).Item("cash").ToString
                t2 = ds.Tables(0).Rows(0).Item("cheque").ToString
                t3 = ds.Tables(0).Rows(0).Item("other").ToString
                If t1 = "1" Then
                    cash.Checked = True
                ElseIf t1 = "0" Then
                    cash.Checked = False
                End If

                If t2 = "1" Then
                    cheque.Checked = True
                ElseIf t2 = "0" Then
                    cheque.Checked = False
                End If

                If t3 = "1" Then
                    other.Checked = True
                ElseIf t3 = "0" Then
                    other.Checked = False
                End If
            End If

        End If
    End Sub
    Private Sub Add_Edit_Receipt_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        'Call moved(Me)
    End Sub
    Dim ttt As Char = ""
    Dim nnn As Boolean = False
    Private Sub customer_name_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles customer_name.KeyDown
        txt_search.Visible = True
        ttt = Chr(e.KeyCode)
        nnn = True
        txt_search.Focus()
    End Sub

    Private Sub customer_name_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles customer_name.KeyPress
        txt_search.Visible = True
        txt_search.Focus()
    End Sub

    Private Sub customer_name_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles customer_name.TextChanged

    End Sub

    Private Sub txt_search_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyDown
        If e.KeyCode = Keys.Down Or e.KeyCode = Keys.Up Then
            DataGridView1.Focus()
        End If
        If e.KeyCode = Keys.Enter Then
            With DataGridView1
                If DataGridView1.Rows.Count > 0 Then
                    load_dua_amount = 0
                    load_amount()
                End If
            End With
        End If
    End Sub

    Private Sub txt_search_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txt_search.KeyUp
        If txt_search.Text.Length <= 1 And nnn = True Then
            txt_search.Text = ttt
            txt_search.SelectionStart = txt_search.TextLength
            nnn = False
        End If
    End Sub

    Private Sub txt_search_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txt_search.TextChanged
        load_customer()
    End Sub
    Public Sub load_customer()
        If txt_search.TextLength > 0 Then
            DataGridView1.Visible = True
            Call grids1(DataGridView1)
            Call SQL_Select("tbl_customer", " id,customer_name ", " customer_name like '%" & txt_search.Text & "%'", " Order By customer_name")
            If ds.Tables(0).Rows.Count > 0 Then
                With DataGridView1
                    .DataSource = ds.Tables(0)
                    .Columns(0).Visible = False
                    .Columns(1).HeaderText = "Customer Name"
                End With
            Else
                DataGridView1.DataSource = Nothing
            End If
            load_grid()
        Else
            DataGridView1.DataSource = Nothing
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub
    Dim k As Double = 0
    Public Sub load_amount()
        With DataGridView1
            customer_name.Text = .Rows(0).Cells(1).Value 'Item Name
            customer_id = .Rows(0).Cells(0).Value 'patient id
            k = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
            txt_search.Visible = False
            txt_search.Text = ""
kkkk:
            pre_load_status = ad_due
            If ad_due = "Advance" Then
                Label4.Text = "Advance Amount"
                due_amount.Text = "-" & Format(k, "0.00")
            ElseIf ad_due = "Due" Then
                Label4.Text = "Due Amount"
                due_amount.Text = Format(k, "0.00")
            End If


            k = Val(due_amount.Text)
            load_dua_amount = k
            DataGridView1.Visible = False
            amount_received.Text = Format(k, "0.00")
            amount_received.Focus()
        End With
    End Sub

    Public Sub load_amount_1()
        With DataGridView1
            customer_name.Text = .Rows(.CurrentRow.Index).Cells(1).Value 'Item Name
            customer_id = .Rows(.CurrentRow.Index).Cells(0).Value 'patient id
            '            k = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            '            Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
            '            txt_search.Visible = False
            '            txt_search.Text = ""
            'kkkk:
            '            If ad_due = "Advance" Then
            '                Label4.Text = "Advance Amount"
            '                due_amount.Text = "-" & Format(k, "0.00")
            '            ElseIf ad_due = "Due" Then
            '                Label4.Text = "Due Amount"
            '                due_amount.Text = Format(k, "0.00")
            '            End If


            '            amount_received.Text = Format(k, "0.00")
            '            k = Val(due_amount.Text)
            '            load_dua_amount = k
            '            DataGridView1.Visible = False
            '            amount_received.Focus()
            '            load_grid()
            k = get_single_value("due_amount", "tbl_customer", " id", customer_id)
            Dim ad_due As String = get_single_value("ad_due", "tbl_customer", " id", customer_id)
            txt_search.Visible = False
            txt_search.Text = ""
kkkk:
            pre_load_status = ad_due
            If ad_due = "Advance" Then
                Label4.Text = "Advance Amount"
                due_amount.Text = "-" & Format(k, "0.00")
            ElseIf ad_due = "Due" Then
                Label4.Text = "Due Amount"
                due_amount.Text = Format(k, "0.00")
            End If


            k = Val(due_amount.Text)
            load_dua_amount = k
            DataGridView1.Visible = False
            amount_received.Text = Format(k, "0.00")
            amount_received.Focus()
        End With
    End Sub
    Private Sub DataGridView1_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles DataGridView1.KeyDown
        If e.KeyCode = Keys.Enter Then
            load_dua_amount = 0
            load_amount_1()
        End If
    End Sub
    Public Sub cal()
        'due_amount.Text = TotalDueAmountGlobal - Val(amount_received.Text)

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

    Private Sub amount_received_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles amount_received.KeyDown
        Call ctrl_focus(e)
    End Sub
    Private Sub amount_received_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles amount_received.TextChanged
        cal()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        customer_id = 0
        Call __show(Add_Edit_Customer)
        load_nav_bar("Add_Edit_Customer", "Add Customer")
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If customer_id = 0 Then
            MsgBox("Please Select Customer Name", vbCritical, "WARNING")
            customer_name.Focus()
            Exit Sub
        End If
        If Val(amount_received.Text) = 0 Then
            MsgBox("Please Enter Received Amount", vbCritical, "WARNING")
            amount_received.Focus()
            Exit Sub
        End If
        saved()
        Call Outstanding.load_grid()
        Call ListOutStanding.load_grid()
        Call View_List_of_Receipt.load_grid_sql()
        MsgBox("Receipt Saved!", vbInformation)
        Me.Dispose()
        Me.Close()
    End Sub
    Public ad_de As String
    Public Sub saved()
        Dim variable As New Dictionary(Of String, String)
        variable.Add(receipt_no.Name, "'" & receipt_no.Text.Replace("'", "''") & "'")
        variable.Add(receipt_date.Name, "'" & Format(receipt_date.Value, "dd-MMM-yyyy") & "'")
        variable.Add("customer_id", "'" & customer_id & "'")
        Dim str1 As String = ""
        variable.Add(amount_received.Name, "'" & Val(amount_received.Text) & "'")
        variable.Add(cheque_no.Name, "'" & cheque_no.Text.Replace("'", "''") & "'")
        Call time_count()
        variable.Add("no", "'" & tot_time & "'")
        Dim advance_amount As Double = 0
        If receipt_id > 0 Then
            Dim q As String = ""
            Dim cur_due_amount, cur_bal_amount As String
            'Advance Payment Update Option------------------------------------------------->>>
            cur_bal_amount = get_single_value("balance", "tbl_receipt", "id", receipt_id)
            cur_due_amount = get_single_value("due_amount", "tbl_customer", "id", customer_id)
            If pre_load_status = "Advance" And save_ad_due = "Advance" Then
                'Dim z As String = "Update tbl_receipt set balance='" & Math.Abs(Val(pre_load_amount) + Val(cur_bal_amount)) & "' where id='" & receipt_id & "'"
                'cmd = New SqlCommand(z, con)
                'cmd.ExecuteNonQuery()
                'cur_bal_amount = get_single_value("balance", "tbl_receipt", "id", receipt_id)
                'Dim z1 As String = "Update tbl_receipt set balance='" & Math.Abs(Val(pre_load_amount) - Val(cur_bal_amount)) & "' where id='" & receipt_id & "'"
                'cmd = New SqlCommand(z1, con)
                'cmd.ExecuteNonQuery()
upper_portion:
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


            'If advance = True Then
            '    variable.Add("advance_amount", "'" & Val(due_amount.Text) & "'")
            'Else
            '    variable.Add(due_amount.Name, "'" & Val(due_amount.Text) & "'")
            'End If
            If load_dua_amount = Val(amount_received.Text) Then
                variable.Add(due_amount.Name, "'" & Val(0) & "'")
            ElseIf load_dua_amount > Val(amount_received.Text) Then
                variable.Add(due_amount.Name, "'" & Val(Val(load_dua_amount) - Val(amount_received.Text)) & "'")
            ElseIf Val(amount_received.Text) > load_dua_amount Then
                variable.Add(due_amount.Name, "'" & Val(Val(amount_received.Text) - Val(load_dua_amount)) & "'")
            End If
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
            If cash.Checked = True Then
                variable.Add("cash", "'1'")
            Else
                variable.Add("cash", "'0'")
            End If
            If cheque.Checked = True Then
                variable.Add("cheque", "'1'")
            Else
                variable.Add("cheque", "'0'")
            End If
            If other.Checked = True Then
                variable.Add("other", "'1'")
            Else
                variable.Add("other", "'0'")
            End If
            Dim d As Integer = SQL_Update("tbl_receipt", variable, " id='" & receipt_id & "'")
            variable.Clear()
            variable.Add(due_amount.Name, "'" & Math.Abs(Val(due_amount.Text)) & "'")
            'Dim ad_de As String = get_single_value("ad_due", "tbl_customer", "id", customer_id)
            If ad_de = "Advance" Then
                If load_dua_amount = Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf load_dua_amount > Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf Val(amount_received.Text) > load_dua_amount Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            ElseIf ad_de = "Due" Then
                If load_dua_amount = Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf load_dua_amount > Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(amount_received.Text) > load_dua_amount Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            End If
            Dim f As Integer = SQL_Update("tbl_customer", variable, "id='" & customer_id & "'")
            variable.Clear()
            q = "update tbl_customer set due_amount='" & Val(Val(pre_load_amount) + Val(amount_received.Text)) & "' where id='" & customer_id & "'"
            cmd = New SqlCommand(q, con)
            cmd.ExecuteNonQuery()
            Dim temp As String = get_single_value("due_amount", "tbl_customer", "id", customer_id)
            q = "update tbl_customer set due_amount='" & Val(due_amount.Text) & "' where id='" & customer_id & "'"
            cmd = New SqlCommand(q, con)
            cmd.ExecuteNonQuery()
            Dim d1 As String = SQL_Update("tbl_receipt", variable, "id=" & receipt_id)
            MAKEPDF()
        Else
            'If advance = True Then
            '    variable.Add("cr_de", "'Cr.'")
            'Else
            '    variable.Add("cr_de", "'De.'")
            'End If
            If load_dua_amount = Val(amount_received.Text) Then
                variable.Add(due_amount.Name, "'" & Val(0) & "'")
            ElseIf load_dua_amount > Val(amount_received.Text) Then
                variable.Add(due_amount.Name, "'" & Val(Val(load_dua_amount) - Val(amount_received.Text)) & "'")
            ElseIf Val(amount_received.Text) > load_dua_amount Then
                variable.Add(due_amount.Name, "'" & Val(Val(amount_received.Text) - Val(load_dua_amount)) & "'")
            End If
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
            variable.Add("invoice_no", "'" & GLOBLE_INVOICE_NO & "'")
            variable.Add("balance", "'" & Math.Abs(k) & "'")
            variable.Add("pre_load", "'" & pre_load_status & "'")
            If cash.Checked = True Then
                variable.Add("cash", "'1'")
            End If
            If cheque.Checked = True Then
                variable.Add("cheque", "'1'")
            End If
            If other.Checked = True Then
                variable.Add("other", "'1'")
            End If

            Dim d As Integer = SQL_Insert("tbl_receipt", variable)
            variable.Clear()
            variable.Add(due_amount.Name, "'" & Math.Abs(Val(due_amount.Text)) & "'")
            'Dim ad_de As String = get_single_value("ad_due", "tbl_customer", "id", customer_id)
            If ad_de = "Advance" Then
                If load_dua_amount = Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf load_dua_amount > Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                ElseIf Val(amount_received.Text) > load_dua_amount Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            ElseIf ad_de = "Due" Then
                If load_dua_amount = Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf load_dua_amount > Val(amount_received.Text) Then
                    variable.Add("ad_due", "'Due'")
                    str1 = "Dr."
                ElseIf Val(amount_received.Text) > load_dua_amount Then
                    variable.Add("ad_due", "'Advance'")
                    str1 = "Cr."
                End If
            End If
            Dim f As Integer = SQL_Update("tbl_customer", variable, "id='" & customer_id & "'")
            variable.Clear()
            variable.Add("receipt_no", "'" & Val(receipt_no.Text) + 1 & "'")
            SQL_Update("tbl_numbers", variable, " id='" & get_max_number("id", "tbl_numbers") & "'")
            receipt_id = get_max_number("id", "tbl_receipt")
            'Call __show(Preview_Receipt)


            'Deduct dues from Quotation table
            'tbl_quotation_main
            'amount_due
            Dim old_due_from_quotation As String
            MAKEPDF()
        End If

        'MAKE PDF

    End Sub
    Private Sub MAKEPDF()
        'receipt_id = DataGridView1.SelectedRows(0).Cells(0).Value
        'customer_id = DataGridView1.SelectedRows(0).Cells(8).Value
        Call Preview_Receipt.Preview_Receipt_Load(Nothing, Nothing)
        Dim quot_path1 As String = get_single_value("report_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If quot_path1 = "" Then
            MsgBox("Please Set Report Path from Setting", vbCritical, "Warning")
            Exit Sub
        End If
        '  user_name = DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim folder_path, pdf_path As String
        user_name = customer_name.Text  'DataGridView1.SelectedRows(0).Cells(3).Value.ToString
        Dim file_name As String = "PAY" & get_single_value("receipt_no", "tbl_receipt", "id", receipt_id) & "-" & user_name
        Dim iMonth As Integer = Month(receipt_date.Value) 'Month(DataGridView1.SelectedRows(0).Cells(2).Value.ToString)
        folder_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name

        If (Not System.IO.Directory.Exists(folder_path)) Then
            System.IO.Directory.CreateDirectory(folder_path)
        End If

        'MsgBox(folder_path)
        'MsgBox(Q_no)
        Dim Bytes() As Byte = Preview_Receipt.ReportViewer2.LocalReport.Render("PDF", "", Nothing, Nothing, Nothing, Nothing, Nothing)

        pdf_path = quot_path1 & "\Receipt\" & MonthName(iMonth) & "\" & user_name & "\" & file_name & ".pdf"
        'global_pdf_path = quot_path1 'pdf_path
        Using Stream As New FileStream(pdf_path, FileMode.Create)
            Stream.Write(Bytes, 0, Bytes.Length)
            Stream.Dispose()
            Stream.Close()
        End Using

        'MsgBox(pdf_path, vbInformation)
        'Call __show(Preview_Receipt)
        'load_nav_bar("Preview_Receipt", "Preview Receipt")
        'Call __show(Preview_Invoice_Report) '.Preview_Invoice_Report_Load(sender, e)

        Preview_Receipt.Dispose()
        Preview_Receipt.Close()
    End Sub
    Private Sub Panel2_Paint(ByVal sender As System.Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles Panel2.Paint

    End Sub

    Private Sub receipt_no_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles receipt_no.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub receipt_no_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles receipt_no.TextChanged

    End Sub

    Private Sub receipt_date_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles receipt_date.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub receipt_date_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles receipt_date.ValueChanged

    End Sub

    Private Sub due_amount_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles due_amount.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub due_amount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles due_amount.TextChanged

    End Sub

    Private Sub cheque_no_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles cheque_no.KeyDown
        Call ctrl_focus(e)
    End Sub

    Private Sub cheque_no_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles cheque_no.TextChanged

    End Sub
End Class