Imports System.Reflection
Imports System.IO
Imports System.Data.SqlClient

Public Class HOME
    Private Sub MASTERToolStripMenuItem_Click(ByVal sender As Object, ByVal e As EventArgs)
        Call __show(Form3)
    End Sub

    Private Sub ToolStripMenuItem3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem3.Click

    End Sub

    Private Sub COMPANYToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles COMPANYToolStripMenuItem.Click
        Call __show(Add_Edit_Company)
        load_nav_bar("Add_Edit_Company", "Company")
    End Sub

    Private Sub CUSTOMERToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CUSTOMERToolStripMenuItem.Click
        Call __show(View_Customer)
        load_nav_bar("View_Customer", "Customer")
    End Sub

    Private Sub PRODUCTTYPEToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles PRODUCTTYPEToolStripMenuItem.Click
        Call __show(View_Product_Type)
        load_nav_bar("View_Product_Type", "Product Type")
    End Sub

    Private Sub PRODUCTToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles PRODUCTToolStripMenuItem.Click
        Call __show(View_Product)
        load_nav_bar("View_Product", "Product")
    End Sub

    Private Sub ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem1.Click

    End Sub

    Private Sub PictureBox2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub SETTINGToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles SETTINGToolStripMenuItem.Click

    End Sub

    Private Sub HOME_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed

    End Sub
    Dim count As Double = 0
    Private Sub HOME_FormClosing(ByVal sender As Object, ByVal e As System.Windows.Forms.FormClosingEventArgs) Handles Me.FormClosing

        Dim ask As String
        If count = 0 Then
            ask = MsgBox("Do You Want to Get Backup Now?", vbQuestion + vbYesNo)
            If ask = "6" Then
                last_backup()
            End If
            count += 1

        End If
        Application.Exit()
    End Sub

    Private Sub HOME_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Alt Then
            MenuStrip1.Focus()
        End If
    End Sub

    Public Sub HOME_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load

        Call con_sql()
        If user_id_log = "USER" Then
            OUTSTANDINGREPORTToolStripMenuItem1.Visible = False
            USERToolStripMenuItem.Visible = False
        End If
        Dim str_path As String = get_single_value("back_path", "tbl_setting", "id", get_max_number("id", "tbl_setting"))
        If str_path <> "" Then

            If File.Exists(str_path) = True Then
                Dim inImg2 As Image = Image.FromFile(str_path)
                Me.BackgroundImage = inImg2
            End If
        End If

    End Sub

    Private Sub ToolStripMenuItem4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub ToolStripMenuItem5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub ToolStripMenuItem2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem2.Click

    End Sub

    Private Sub QUOTATIONToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub ToolStripMenuItem4_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub QUOTATIONREPORTToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles QUOTATIONREPORTToolStripMenuItem.Click
        Call __show(Quotation_Report)
        load_nav_bar("Quotation_Report", "Quotation Report")
    End Sub

    Private Sub SALESREPORTToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles SALESREPORTToolStripMenuItem.Click
        Call __show(Sales_Report)
        load_nav_bar("Sales_Report", "Sales Report")
    End Sub

    Private Sub OUTSTANDINGREPORTToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub ToolStripMenuItem4_Click_2(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Receipt_voucher_ID = 0
        Call __show(Add_Edit_Receipt)
        load_nav_bar("Add_Edit_Receipt", "Receipt Voucher")
    End Sub

    Private Sub BACKUPToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub RESTOREToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub USERToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles USERToolStripMenuItem.Click
        Call __show(View_Add_Edit_User)
        load_nav_bar("View_Add_Edit_User", "User")
    End Sub

    Private Sub ToolStripMenuItem6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem6.Click
        customer_id = 0
        Call __show(Statement)
        load_nav_bar("Statement", "Statement")
    End Sub

    Private Sub FlowLayoutPanel1_Paint(ByVal sender As System.Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles FlowLayoutPanel1.Paint

    End Sub

    Private Sub ToolStripMenuItem5_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub ToolStripMenuItem8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub EXITToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles EXITToolStripMenuItem.Click
        Application.Exit()
    End Sub
    Private Sub last_backup()
        Dim path As String = get_single_value("backup_path", "tbl_setting", "id", get_max_number("id", "tbl_setting")) & "\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss")
        If path = "" Then
            MsgBox("Please Set Path From Setting", vbCritical, "WARNING")
            Exit Sub
        End If
        Dim a As String = Application.StartupPath & "\XPressDB.mdf"
        Dim dblocation, baklocation, testfile As String
        'Dim constring1 As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\parsuram_db.mdf;Integrated Security=True;User Instance=True"
        Call con_sql()

        dblocation = "[" & Application.StartupPath & "\XPressDB.mdf" & "]"
        baklocation = path & ".bak" '"D:\backup\backup.bak"

        'Dim sCommand = "BACKUP DATABASE [DatabaseName] TO DISK = N'E:\Backup\Backup.bak' WITH COPY_ONLY"
        'Dim sCommand = "BACKUP DATABASE [I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF] TO DISK = N'E:\Backup.bak' WITH COPY_ONLY"
        Dim dbnm As String
        dbnm = "[" & db_nm & "]" '"[I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF]"
        'dbnm = "[I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF]"

        'txt_path.Text = "D:\aabkp1"

        Dim bkp_file_nm As String
        bkp_file_nm = baklocation
        con.Dispose()
        con.Close()

        'Dim sqlConn As New SqlConnection("Data Source=SERVER\SQLEXPRESS;Initial Catalog=master;Integrated Security=True")
        Dim sqlConn As New SqlConnection(backup_constr)

        sqlConn.Open()
        'MsgBox(dbnm & vbCrLf & bkp_file_nm)

        'dbnm = "[D:\2020 new\Work\TI\Tulsi Ind\Foundry_Management\bin\Debug\TDB.mdf]"

        Dim sCommand = "BACKUP DATABASE " & dbnm & " TO DISK = N'" & bkp_file_nm & "' WITH COPY_ONLY"
        'On Error Resume Next

        'MsgBox(sCommand)
        Using sqlCmd As New SqlCommand(sCommand, sqlConn)
            sqlCmd.ExecuteNonQuery()
        End Using

        'Code to Rename File
        Dim new_file As String
        new_file = Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".rar"
        'My.Computer.FileSystem.RenameFile("C:\Test.txt", "SecondTest.txt")
        testfile = path & ".rar"
        If My.Computer.FileSystem.FileExists(testfile) Then
            My.Computer.FileSystem.DeleteFile(testfile)
        End If
        My.Computer.FileSystem.RenameFile(baklocation, new_file)
    End Sub
    'Public Sub last_backup()
    '    Dim path As String = get_single_value("backup_path", "tbl_setting", "id", get_max_number("id", "tbl_setting")) & "\" & Format(Date.Now, "dd-MM-yyyy HH_mm_ss")
    '    If path = "" Then
    '        MsgBox("Please Set Path From Setting", vbCritical, "WARNING")
    '        Exit Sub
    '    End If
    '    Dim a As String = Application.StartupPath & "\XPressDB.mdf"
    '    Dim dblocation, baklocation, testfile As String
    '    'Dim constring1 As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\parsuram_db.mdf;Integrated Security=True;User Instance=True"
    '    Call con_sql()

    '    dblocation = "[" & Application.StartupPath & "\XPressDB.mdf" & "]"
    '    baklocation = path & ".bak" '"D:\backup\backup.bak"

    '    'MsgBox(dblocation)

    '    'Dim sqlConnectionString As String = constring1

    '    'Dim conn As New SqlConnection(sqlConnectionString)
    '    'conn.Open()

    '    Dim b, mdfloc, ldfloc, dbmdf, dbldf As String
    '    ''a = "[E:\2016\March\12\matro\WindowsApplication5\WindowsApplication5\Database1.mdf]"
    '    ''b = baklocation  '"d:\abcd\a.bak"
    '    'mdfloc = Application.StartupPath & "\" & "SATVIK_DB.mdf"
    '    'ldfloc = Application.StartupPath & "\" & "SATVIK_DB_log.ldf"
    '    'dbmdf = Application.StartupPath & "\" & "SATVIK_DB.mdf"
    '    'dbldf = Application.StartupPath & "\" & "SATVIK_DB_log.ldf"

    '    Dim cmd As New SqlCommand
    '    cmd.CommandType = CommandType.Text
    '    'cmd.CommandText = "BACKUP DATABASE [E:\2016\February\5\parsuram_3_2_16_5pm\parsuram\bin\Debug\parsuram_db.mdf] TO DISK = 'C:\Temp\location.BAK'"
    '    'cmd.CommandText = "BACKUP DATABASE " & dblocation & " TO DISK = '" & baklocation & "'"
    '    'cmd.CommandText = "USE Master ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\DB" & "\SBS.mdf] SET Single_User WITH Rollback Immediate Backup database [" & System.Windows.Forms.Application.StartupPath & "\DB" & "\SBS.mdf] TO DISK '" & baklocation & "' ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\DB" & "\SBS.mdf] SET Multi_User "
    '    '*******Working Local
    '    'cmd.CommandText = "BACKUP DATABASE [" & System.Windows.Forms.Application.StartupPath & "\SATVIK_DB.mdf] TO DISK = N'" & baklocation & "' WITH COPY_ONLY"
    '    Dim new_Query As String
    '    new_Query = "backup database [" & Application.StartupPath & "\XPressDB.mdf" & "]" & " to disk='" & baklocation & "'"

    '    'new_Query = "BACKUP DATABASE [E:\2018\August\17\SATVIK HOSPITAL\SATVIK HOSPITAL\bin\Debug\SATVIK_DB.MDF] TO disk = 'D:\BackupFileName.bak'"

    '    '******Network Testing
    '    'cmd.CommandText = "BACKUP DATABASE [" & System.Windows.Forms.Application.StartupPath & "\SATVIK_DB.mdf] TO DISK = N'" & baklocation & "' WITH COPY_ONLY"
    '    'E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF

    '    cmd.CommandText = new_Query

    '    cmd.Connection = con
    '    'MsgBox(cmd.CommandText)

    '    On Error Resume Next
    '    cmd.ExecuteNonQuery()
    '    con.Close()

    '    'Code to Rename File
    '    Dim new_file As String
    '    new_file = Format(Date.Now, "dd-MM-yyyy HH_mm_ss") & ".rar"
    '    'My.Computer.FileSystem.RenameFile("C:\Test.txt", "SecondTest.txt")
    '    testfile = path & ".rar"
    '    If My.Computer.FileSystem.FileExists(testfile) Then
    '        My.Computer.FileSystem.DeleteFile(testfile)
    '    End If
    '    My.Computer.FileSystem.RenameFile(baklocation, new_file)
    'End Sub
    Private Sub LOGOUTToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles LOGOUTToolStripMenuItem.Click
        Me.Hide()
        Login.Show()
        Login.BringToFront()
    End Sub

    Private Sub EMAILToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles EMAILToolStripMenuItem.Click
        Call __show(emails)
        Call load_nav_bar("emails", "E-Mail")
    End Sub

    Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick

    End Sub

    Private Sub VATSETTINGToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles VATSETTINGToolStripMenuItem.Click
        Call __show(Settings)
        load_nav_bar("Settings", "Vat Settings")
    End Sub

    Private Sub BACKUPToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles BACKUPToolStripMenuItem1.Click
        Call __show(Backup)
        load_nav_bar("Backup", "Backup")
    End Sub

    Private Sub RESTOREToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RESTOREToolStripMenuItem1.Click
        Call __show(RestoreDB)
        'load_nav_bar("RestoreDB", "Restore")
    End Sub

    Private Sub HOME_MdiChildActivate(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.MdiChildActivate
        'Exit Sub
        On Error Resume Next
        For Each ctrl As Control In FlowLayoutPanel1.Controls
            If ActiveMdiChild IsNot Nothing Then
                If ActiveMdiChild.Name = ctrl.Name Then
                    Call active_form(ActiveMdiChild.Name)
                    Exit Sub
                End If
            End If
        Next
        If ActiveMdiChild IsNot Nothing Then
            new_load_nav_bar(ActiveMdiChild.Name, ActiveMdiChild.Name)
            Call active_form(ActiveMdiChild.Name)
        End If
    End Sub

    Private Sub HOME_Paint(ByVal sender As Object, ByVal e As System.Windows.Forms.PaintEventArgs) Handles Me.Paint

    End Sub

    Private Sub INVOICEToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles INVOICEToolStripMenuItem.Click
        Call __show(View_Invoice)
        load_nav_bar("View_Invoice", "Invoice")
    End Sub

    Private Sub QUOTATIONToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles QUOTATIONToolStripMenuItem1.Click
        Call __show(View_Quotation)
        load_nav_bar("View_Quotation", "Quotation")
    End Sub

    Private Sub OUTSTANDINGREPORTToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles OUTSTANDINGREPORTToolStripMenuItem1.Click
        'Call __show(Outstanding)
        Call __show(ListOutStanding)
        load_nav_bar("Outstanding", "Outstanding")
    End Sub

    Private Sub RECEIPTToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RECEIPTToolStripMenuItem.Click
        Call __show(View_List_of_Receipt)
        load_nav_bar("View_List_of_Receipt", "List Of Receipt")
    End Sub
End Class
