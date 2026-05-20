Imports System.Data.SqlClient
Imports System.Reflection

Module Module1
    Public last_form As Form
    Public GLOBLE_INVOICE_NO As Double = 0
    Public new_pro_key, new_pro_key_quo As Boolean
    Public user_id_log, user_name As String
    Public company_id As Double = 0
    Public user_id As Double = 0
    Public setting_id As Double = 0
    Public customer_id As Double = 0
    Public Quotation_To_Invoice_ID As Double = 0
    Public product_type_id, product_ids As Double
    Public invoice_id As Double = 0
    Public receipt_id As Double = 0
    Public quotation_id As Double = 0
    Public c_row, c_col As Double
    Public REPORT_CON_STRING As String
    Public Receipt_voucher_ID As Double = 0
    Public load_dua_amount As Double = 0
    Public email_id As Double = 0
    Public tot_time As String = ""
    Public is_pdf As Boolean = False
    Public con As New SqlConnection
    Public tot_item_length(50), tot_desc_length(50) As Double
    Public report_qurty, sales_query, quotation_query, outstanding_query As String
    Public tot As Double = 0
    Public db_nm As String = ""
    Public print_due_amt_on_invoice As Boolean

    Public backup_constr As String

    Public Sub con_sql()
        If con.State = ConnectionState.Open Then Exit Sub
        'con.ConnectionString = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & Application.StartupPath & "\XPressDB.mdf;Integrated Security=True;Connect Timeout=30;User Instance=True"
        con.ConnectionString = My.Settings.XPressDBConnectionString
        'MsgBox(con.ConnectionString)
        REPORT_CON_STRING = con.ConnectionString
        backup_constr = con.ConnectionString
        con.Open()
        db_nm = "XPressDB" 'Application.StartupPath & "\XPressDB.mdf"
        Call set_global_date_format()
    End Sub
    Public Sub fback_color(ByVal frm As Form)
        'frm.BackColor = Color.AntiqueWhite
        'frm.FormBorderStyle = FormBorderStyle.FixedToolWindow  'FixedToolWindow
        'frm.KeyPreview = True
        frm.MdiParent = HOME
        'If frm.Name <> "Form1" Then frm.Parent = MD
        frm.FormBorderStyle = FormBorderStyle.None
        frm.Location = New Point(0, 0)
        frm.Height = HOME.Height - 97
        frm.Width = HOME.Width - 10
        frm.BackColor = Color.White
        'frm.Width = MDI_Main.Width - 189
    End Sub

    Public Sub moved(ByVal frm As Form)
        frm.Left = 0
        frm.Top = 0
    End Sub

    Public Sub __show(ByRef frm As Form)
        If frm.Visible = True Then
            frm.Hide()
        End If
        Call fback_color(frm)
        Call rights(frm)

        frm.Show()
    End Sub
    Public new_AMOUNT As Double = 0
    Public Sub grids1(ByRef grids As DataGridView)
        With grids
            .Font = New Font("Franklin Gothic Book", 11)
            .ForeColor = Color.Black
            .EnableHeadersVisualStyles = False
            ' .ColumnHeadersDefaultCellStyle.BackColor = Color.WhiteSmoke
            .ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.EnableResizing
            .ColumnHeadersHeight = 40
            .ColumnHeadersHeight = 45
            .RowTemplate.Height = 30
            .ColumnHeadersDefaultCellStyle.Font = New Font("Franklin Gothic Book", 14.75)
            .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
            .RowHeadersVisible = False
            .DefaultCellStyle.BackColor = Color.WhiteSmoke
            If .Columns.Count > 0 Then
                .Columns(0).Visible = False
            End If
            .BackgroundColor = Color.WhiteSmoke
            .AllowUserToResizeRows = False
            .AllowUserToResizeColumns = False
            .SelectionMode = DataGridViewSelectionMode.FullRowSelect
            .ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing
            .DefaultCellStyle.SelectionForeColor = Color.Black
            .RowsDefaultCellStyle.SelectionBackColor = Color.LightSkyBlue    'ColorTranslator.FromHtml("#d63627")
            '.DefaultCellStyle.SelectionBackColor = Color.WhiteSmoke
            .CellBorderStyle = DataGridViewCellBorderStyle.Single
        End With
    End Sub
    Public Sub ctrl_focus(ByVal e As System.Windows.Forms.KeyEventArgs)
        If e.KeyCode = 13 Then SendKeys.Send("{TAB}")
    End Sub

    Public Sub auto_field()
        Dim q As String = ""

        'tbl_company Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_company') BEGIN CREATE TABLE tbl_company ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'company_name') IS NULL BEGIN ALTER TABLE tbl_company ADD [company_name] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'address') IS NULL BEGIN ALTER TABLE tbl_company ADD [address] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'city') IS NULL BEGIN ALTER TABLE tbl_company ADD [city] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'telephone') IS NULL BEGIN ALTER TABLE tbl_company ADD [telephone] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'email') IS NULL BEGIN ALTER TABLE tbl_company ADD [email] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'facebook_url') IS NULL BEGIN ALTER TABLE tbl_company ADD [facebook_url] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'brn') IS NULL BEGIN ALTER TABLE tbl_company ADD [brn] varchar(150) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'vat') IS NULL BEGIN ALTER TABLE tbl_company ADD [vat] varchar(150) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'note1') IS NULL BEGIN ALTER TABLE tbl_company ADD [note1] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'note2') IS NULL BEGIN ALTER TABLE tbl_company ADD [note2] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'note3') IS NULL BEGIN ALTER TABLE tbl_company ADD [note3] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'thanks1') IS NULL BEGIN ALTER TABLE tbl_company ADD [thanks1] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'thanks2') IS NULL BEGIN ALTER TABLE tbl_company ADD [thanks2] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'currency') IS NULL BEGIN ALTER TABLE tbl_company ADD [currency] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'logo') IS NULL BEGIN ALTER TABLE tbl_company ADD [logo] image END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_company', 'watermark') IS NULL BEGIN ALTER TABLE tbl_company ADD [watermark] image END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_customer Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_customer') BEGIN CREATE TABLE tbl_customer ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'customer_name') IS NULL BEGIN ALTER TABLE tbl_customer ADD [customer_name] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'contact') IS NULL BEGIN ALTER TABLE tbl_customer ADD [contact] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'customer_type') IS NULL BEGIN ALTER TABLE tbl_customer ADD [customer_type] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'telephone') IS NULL BEGIN ALTER TABLE tbl_customer ADD [telephone] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'address') IS NULL BEGIN ALTER TABLE tbl_customer ADD [address] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'email') IS NULL BEGIN ALTER TABLE tbl_customer ADD [email] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'due_amount') IS NULL BEGIN ALTER TABLE tbl_customer ADD [due_amount] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'title_name') IS NULL BEGIN ALTER TABLE tbl_customer ADD [title_name] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'reg_date') IS NULL BEGIN ALTER TABLE tbl_customer ADD [reg_date] date END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'ad_due') IS NULL BEGIN ALTER TABLE tbl_customer ADD [ad_due] varchar(100) default('Advance') END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'brn') IS NULL BEGIN ALTER TABLE tbl_customer ADD [brn] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_customer', 'vat') IS NULL BEGIN ALTER TABLE tbl_customer ADD [vat] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_invoice_main Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_invoice_main') BEGIN CREATE TABLE tbl_invoice_main ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'customer_id') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [customer_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'invoice_no') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [invoice_no] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'checklist_no') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [checklist_no] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'sub_total') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [sub_total] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'amount_due') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [amount_due] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'vat') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [vat] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'discount') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [discount] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'total') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [total] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'per') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [per] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'invoice_date') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [invoice_date] date END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'case_debit') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [case_debit] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'paid_amount') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [paid_amount] numeric(18,2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'balance') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [balance] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'no') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [no] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'cr_dr') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [cr_dr] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'identify') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [identify] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_main', 'print_due') IS NULL BEGIN ALTER TABLE tbl_invoice_main ADD [print_due] varchar(10) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()


        'tbl_quotation_sub Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_quotation_sub') BEGIN CREATE TABLE tbl_quotation_sub ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_sub', 'main_id') IS NULL BEGIN ALTER TABLE tbl_quotation_sub ADD [main_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_sub', 'qty') IS NULL BEGIN ALTER TABLE tbl_quotation_sub ADD [qty] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_sub', 'product_id') IS NULL BEGIN ALTER TABLE tbl_quotation_sub ADD [product_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_sub', 'unit_price') IS NULL BEGIN ALTER TABLE tbl_quotation_sub ADD [unit_price] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_sub', 'row_total') IS NULL BEGIN ALTER TABLE tbl_quotation_sub ADD [row_total] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_sub', 's_no') IS NULL BEGIN ALTER TABLE tbl_quotation_sub ADD [s_no] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()


        'tbl_numbers Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_numbers') BEGIN CREATE TABLE tbl_numbers ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_numbers', 'invoice_no') IS NULL BEGIN ALTER TABLE tbl_numbers ADD [invoice_no] numeric(18, 0) default(1) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_numbers', 'quo_no') IS NULL BEGIN ALTER TABLE tbl_numbers ADD [quo_no] numeric(18, 0) default(1) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_numbers', 'receipt_no') IS NULL BEGIN ALTER TABLE tbl_numbers ADD [receipt_no] numeric(18, 0) default(1) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_product Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_product') BEGIN CREATE TABLE tbl_product ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_product', 'product_id') IS NULL BEGIN ALTER TABLE tbl_product ADD [product_id] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_product', 'product_name') IS NULL BEGIN ALTER TABLE tbl_product ADD [product_name] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_product', 'type_id') IS NULL BEGIN ALTER TABLE tbl_product ADD [type_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_product', 'price') IS NULL BEGIN ALTER TABLE tbl_product ADD [price] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_product Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_product_type') BEGIN CREATE TABLE tbl_product_type ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_product_type', 'type_name') IS NULL BEGIN ALTER TABLE tbl_product_type ADD [type_name] varchar(150) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_product Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_setting') BEGIN CREATE TABLE tbl_setting ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'isvat') IS NULL BEGIN ALTER TABLE tbl_setting ADD [isvat] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'vat_per') IS NULL BEGIN ALTER TABLE tbl_setting ADD [vat_per] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'invoice_path') IS NULL BEGIN ALTER TABLE tbl_setting ADD [invoice_path] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'quo_path') IS NULL BEGIN ALTER TABLE tbl_setting ADD [quo_path] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'report_path') IS NULL BEGIN ALTER TABLE tbl_setting ADD [report_path] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'invoice_days') IS NULL BEGIN ALTER TABLE tbl_setting ADD [invoice_days] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'back_path') IS NULL BEGIN ALTER TABLE tbl_setting ADD [back_path] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'backup_path') IS NULL BEGIN ALTER TABLE tbl_setting ADD [backup_path] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'cash') IS NULL BEGIN ALTER TABLE tbl_setting ADD [cash] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'cheque') IS NULL BEGIN ALTER TABLE tbl_setting ADD [cheque] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_setting', 'other') IS NULL BEGIN ALTER TABLE tbl_setting ADD [other] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_quotation_main Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_quotation_main') BEGIN CREATE TABLE tbl_quotation_main ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'customer_id') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [customer_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'quo_no') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [quo_no] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'checklist_no') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [checklist_no] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'sub_total') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [sub_total] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'amount_due') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [amount_due] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'vat') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [vat] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'discount') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [discount] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'total') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [total] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'per') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [per] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_quotation_main', 'quo_date') IS NULL BEGIN ALTER TABLE tbl_quotation_main ADD [quo_date] date END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_invoice_sub Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_invoice_sub') BEGIN CREATE TABLE tbl_invoice_sub ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_sub', 'main_id') IS NULL BEGIN ALTER TABLE tbl_invoice_sub ADD [main_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_sub', 'qty') IS NULL BEGIN ALTER TABLE tbl_invoice_sub ADD [qty] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_sub', 'product_id') IS NULL BEGIN ALTER TABLE tbl_invoice_sub ADD [product_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_sub', 'unit_price') IS NULL BEGIN ALTER TABLE tbl_invoice_sub ADD [unit_price] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_sub', 'row_total') IS NULL BEGIN ALTER TABLE tbl_invoice_sub ADD [row_total] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_invoice_sub', 's_no') IS NULL BEGIN ALTER TABLE tbl_invoice_sub ADD [s_no] numeric(18, 0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_receipt Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_receipt') BEGIN CREATE TABLE tbl_receipt ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'receipt_no') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [receipt_no] varchar(50) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'receipt_date') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [receipt_date] date END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'customer_id') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [customer_id] bigint END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'due_amount') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [due_amount] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'amount_received') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [amount_received] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'cheque_no') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [cheque_no] varchar(200) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'no') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [no] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'balance') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [balance] numeric(18, 2) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'cr_dr') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [cr_dr] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'invoice_no') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [invoice_no] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'pre_load') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [pre_load] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'cash') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [cash] varchar(100) default(0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'cheque') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [cheque] varchar(100) default(0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_receipt', 'other') IS NULL BEGIN ALTER TABLE tbl_receipt ADD [other] varchar(100) default(0) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_user Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_user') BEGIN CREATE TABLE tbl_user ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_user', 'user_id') IS NULL BEGIN ALTER TABLE tbl_user ADD [user_id] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_user', 'password') IS NULL BEGIN ALTER TABLE tbl_user ADD [password] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_user', 'des') IS NULL BEGIN ALTER TABLE tbl_user ADD [des] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        'tbl_email Table
        q = "if not exists (Select * from INFORMATION_SCHEMA.TABLES where TABLE_NAME = 'tbl_email') BEGIN CREATE TABLE tbl_email ([ID] [bigint] IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'client_email') IS NULL BEGIN ALTER TABLE tbl_email ADD [client_email] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'sender') IS NULL BEGIN ALTER TABLE tbl_email ADD [sender] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'subject') IS NULL BEGIN ALTER TABLE tbl_email ADD [subject] varchar(500) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'body') IS NULL BEGIN ALTER TABLE tbl_email ADD [body] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'sender_pass') IS NULL BEGIN ALTER TABLE tbl_email ADD [sender_pass] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'identify') IS NULL BEGIN ALTER TABLE tbl_email ADD [identify] varchar(100) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()
        q = "IF COL_LENGTH('tbl_email', 'sub_subject') IS NULL BEGIN ALTER TABLE tbl_email ADD [sub_subject] varchar(MAX) END"
        cmd = New SqlCommand(q, con)
        cmd.ExecuteNonQuery()

        Call SQL_Select("tbl_numbers")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("invoice_no", "'0'")
            Call SQL_Insert("tbl_numbers", variable)
        End If

        Call SQL_Select("tbl_setting")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("vat_per", "'5'")
            variable.Add("isvat", "'1'")
            Call SQL_Insert("tbl_setting", variable)
        End If

        Call SQL_Select("tbl_user")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("user_id", "'ADMIN'")
            variable.Add("password", "'admin'")
            Call SQL_Insert("tbl_user", variable)
        End If

        Call SQL_Select("tbl_email", , " identify='INVOICE'")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("identify", "'INVOICE'")
            Call SQL_Insert("tbl_email", variable)
        End If

        Call SQL_Select("tbl_email", , " identify='QUOTATION'")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("identify", "'QUOTATION'")
            Call SQL_Insert("tbl_email", variable)
        End If

        Call SQL_Select("tbl_email", , " identify='STATEMENT'")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("identify", "'STATEMENT'")
            Call SQL_Insert("tbl_email", variable)
        End If

        Call SQL_Select("tbl_email", , " identify='RECEIPT'")
        If ds.Tables(0).Rows.Count = 0 Then
            Dim variable As New Dictionary(Of String, String)
            variable.Add("identify", "'RECEIPT'")
            Call SQL_Insert("tbl_email", variable)
        End If


    End Sub

    Public Sub set_fonr(ByRef frm As Form, ByVal lbl As Label)
        Dim textboxes = GetAllControls(frm).ToList()
        For Each item As Control In textboxes
            item.Font = New Font("Franklin Gothic Book", 12.75)
        Next
        lbl.Font = New Font("Franklin Gothic Medium Cond", 21.75)
    End Sub
    Dim flt As FlowLayoutPanel = HOME.FlowLayoutPanel1
    Public Sub new_load_nav_bar(ByRef frm As String, ByVal name As String)
        name = name.Replace("_", " ")
        name = name.Replace("email", "E-mail Config")
        name = name.Replace("Add Edit Company", "Company details")
        name = name.Replace("View Customer", "Customer List")
        name = name.Replace("View Product", "Product List")
        name = name.Replace("Product List Type", "Product Type")
        name = name.Replace("View Invoice", "Invoice List")
        name = name.Replace("View Quotation", "Quotation List")
        name = name.Replace("email", "E-mail")
        name = name.Replace("View Add Edit User", "Users")
        name = name.Replace("ListOutStanding", "Outstanding List")
        '  name = name.Replace("Product List", "Product Type")
        name = name.Replace("View ", "")
        name = name.Replace("Add Edit ", "")
        Dim inImg2 As Image = Image.FromFile(Application.StartupPath & "\icons8-cancel-15.png")
        For i = 0 To 1

            Dim btn As Button = New Button()
            btn.FlatStyle = FlatStyle.Flat
            btn.FlatAppearance.BorderSize = 0
            btn.Name = frm
            btn.Text = name.Replace("_", " ")
            btn.AutoSize = True
            btn.Font = New Font("Calibri", 10, FontStyle.Bold)
            Dim old As Padding = flt.Margin
            btn.Margin = New Padding(old.Left + 5, 0, 0, 0)
            btn.BackColor = Color.LightSkyBlue
            'btn.ForeColor = Color.White
            If i = 1 Then
                btn.Name = frm & "X"
                btn.Text = "  "

                btn.Image = inImg2
                btn.BackColor = Color.Red
                btn.ForeColor = Color.LightSkyBlue
                btn.Margin = New Padding(old.Left - 20, 0, 0, 0)
                btn.Size = New Size(5, 5)
            End If

            flt.Controls.Add(btn)
            AddHandler btn.Click, AddressOf updateFunc
        Next
    End Sub
    Public Sub load_nav_bar(ByRef frm As String, ByVal name As String)
        'For i = 0 To 1

        '    Dim btn As Button = New Button()
        '    btn.FlatStyle = FlatStyle.Flat
        '    btn.FlatAppearance.BorderSize = 0
        '    btn.Name = frm
        '    btn.Text = name
        '    btn.AutoSize = True
        '    btn.Font = New Font("Calibri", 10, FontStyle.Bold)
        '    Dim old As Padding = flt.Margin
        '    btn.Margin = New Padding(old.Left + 5, 0, 0, 0)
        '    btn.BackColor = Color.LightSkyBlue
        '    'btn.ForeColor = Color.White
        '    If i = 1 Then
        '        btn.Name = frm & "X"
        '        btn.Text = "X"
        '        btn.BackColor = Color.Red
        '        btn.Margin = New Padding(old.Left - 20, 0, 0, 0)
        '        btn.Size = New Size(5, 5)
        '    End If

        '    flt.Controls.Add(btn)
        '    AddHandler btn.Click, AddressOf updateFunc
        'Next
    End Sub
    Public Sub updateFunc(ByVal sender As Object, ByVal e As System.EventArgs)
        Dim b As Button = DirectCast(sender, Button)
        Dim load_for_remove As String = b.Name
        Dim final As String = load_for_remove.Substring(0, load_for_remove.Length - 1)
        Dim j As Boolean = False
JJJJ:
        For Each ctrl As Control In flt.Controls
            If b.Text = "  " Then
                If final = ctrl.Name Then
                    If final = "Add_Edit_Invoice" Then
                        Dim ask As String
                        ask = MsgBox("Are you sure you want to cancel?", vbQuestion + vbYesNo)
                        If ask = "6" Then
                            flt.Controls.Remove(ctrl)
                            RemoveForm(final)
                        Else
                            Exit Sub
                        End If

                    End If
                    flt.Controls.Remove(ctrl)
                    j = True
                    GoTo JJJJ
                End If
                If j = True Then
                    If final & "X" = ctrl.Name Then

                        flt.Controls.Remove(ctrl)
                        RemoveForm(final)
                        Exit Sub
                    End If
                End If
            End If
        Next
        If b.Text <> "X" Then
            ShowForm(b.Name)
            '    For Each ctrl As Control In flt.Controls
            '        If load_for_remove = ctrl.Name Then
            '            b.BackColor = Color.LimeGreen
            '            b.ForeColor = Color.White
            '        Else
            '            If ctrl.Text <> "X" Then
            '                ctrl.BackColor = Color.LightSkyBlue
            '                ctrl.ForeColor = Color.Black
            '            End If

            '        End If
            '    Next
        End If
    End Sub
    Public Sub active_form(ByVal frm As String)
        For Each ctrl As Control In flt.Controls
            If frm = ctrl.Name Then
                ctrl.BackColor = Color.YellowGreen
                ctrl.ForeColor = Color.White
            ElseIf frm & "X" = ctrl.Name Then

                ''If ctrl.Text & "X" <> "X" Then
                ctrl.BackColor = Color.YellowGreen
                ctrl.ForeColor = Color.White
                'End If
            Else
                If ctrl.Text <> "X" Then
                    ctrl.BackColor = Color.LightSkyBlue
                    ctrl.ForeColor = Color.Black
                End If

            End If
        Next
        'If frm = frmClose.Name Then

        'End If
        'Next
    End Sub
    Public Sub rights(ByRef frm As Form)
        Dim textboxes = GetAllControls(frm).OfType(Of Button)().ToList()
        For Each item As Button In textboxes
            If user_id_log = "USER" Then
                If item.Text.Replace("&", "") = "DELETE" Then
                    item.Visible = False
                End If
            End If
            If item.Text.Replace("&", "") = "CREATE NEW" Then
                item.BackColor = Color.YellowGreen
                item.ForeColor = Color.DimGray
            End If
            If item.Text.Replace("&", "") = "PRINT" Then
                item.BackColor = Color.YellowGreen
                item.ForeColor = Color.DimGray
            End If
            If item.Text.Replace("&", "") = "DELETE" Then
                item.BackColor = Color.Gray
                item.ForeColor = Color.LightSkyBlue
            End If
            If item.Text.Replace("&", "") = "SAVE" Or item.Text.Replace("&", "") = "SEND" Or item.Text.Replace("&", "") = "+ Create New Invoice" Or item.Text.Replace("&", "") = "+ Create New Quotation" Then
                item.BackColor = Color.YellowGreen
                item.ForeColor = Color.DimGray
            End If
        Next
    End Sub
    Public Sub last_form_close(ByRef frm As Form)
        'Dim b As Button = DirectCast(sender, Button)
        Dim load_for_remove As String = frm.Name & "X"
        Dim final As String = load_for_remove.Substring(0, load_for_remove.Length - 1)
        Dim j As Boolean = False
JJJJ:
        For Each ctrl As Control In flt.Controls
            If final = ctrl.Name Then
                flt.Controls.Remove(ctrl)

                j = True
                GoTo JJJJ
            End If
            If j = True Then
                If final & "X" = ctrl.Name Then
                    flt.Controls.Remove(ctrl)

                    RemoveForm(final)
                    Exit Sub


                End If
            End If
        Next
    End Sub
    Public Sub RemoveForm(ByVal Frm As String)
        For Each frmClose As Form In HOME.MdiChildren
            If Frm = frmClose.Name Then
                frmClose.Dispose()
                frmClose.Close()
            End If
        Next
    End Sub
    Public Sub ShowForm(ByVal Frm As String)

        For Each frmClose As Form In HOME.MdiChildren
            If Frm = frmClose.Name Then
                Call __show(frmClose)

                Exit Sub
            End If
        Next
    End Sub
    Public Sub admin1(ByVal btn As Button)
        If user_id_log.ToLower <> "admin" Then
            btn.Visible = False
        End If
    End Sub
    Public Sub time_count()
        Dim result As Double
        result = DateDiff("s", CDate("1970-1-1 12:00:00 AM"), Now)
        Dim tempStr As String
        tempStr = Strings.Format$(Now, "yyyy-MM-dd HH:mm:ss.SSS")
        Dim strTime() As String
        strTime = Strings.Split(tempStr, ".") ' Last element is millisecond
        result = result * 1000 + Val(strTime(UBound(strTime)))
        tot_time = result
    End Sub


    Public Function first_date() As Date
        Dim dtp As Date = New Date(Now.Year, Now.Month, 1)
        Return dtp
    End Function

    Public deviceInfo As String = "<DeviceInfo>" + _
                                "  <OutputFormat>EMF</OutputFormat>" + _
                                "  <PageWidth></PageWidth>" + _
                                "  <PageHeight></PageHeight>" + _
                                "  <MarginTop></MarginTop>" + _
                                "  <MarginLeft></MarginLeft>" + _
                                "  <MarginRight></MarginRight>" + _
                                "  <MarginBottom></MarginBottom>" + _
                                "</DeviceInfo>"

End Module

