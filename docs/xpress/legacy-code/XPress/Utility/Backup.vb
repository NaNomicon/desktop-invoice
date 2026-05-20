Imports System.Data.SqlClient

Public Class Backup

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Backup_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub Backup_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub Backup_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
    End Sub

    Private Sub Backup_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If (FolderBrowserDialog1.ShowDialog() = DialogResult.OK) Then
            If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
                txt_path.Text = FolderBrowserDialog1.SelectedPath & "\" & Format(Date.Now, "dd-MM-yyyy")
            Else
                txt_path.Text = FolderBrowserDialog1.SelectedPath & Format(Date.Now, "dd-MM-yyyy")
            End If
        End If
    End Sub

    Private Sub Nw_Backup()
        If txt_path.Text = "" Then
            MsgBox("Please Select Path to save Backup", vbCritical, "WARNING")
            txt_path.Focus()
            Exit Sub
        End If

        con.Dispose()
        con.Close()

        'Dim sqlConn As New SqlConnection("Data Source=SERVER\SQLEXPRESS;Initial Catalog=master;Integrated Security=True")
        Dim sqlConn As New SqlConnection(backup_constr)

        sqlConn.Open()

        'Dim sCommand = "BACKUP DATABASE [DatabaseName] TO DISK = N'E:\Backup\Backup.bak' WITH COPY_ONLY"
        'Dim sCommand = "BACKUP DATABASE [I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF] TO DISK = N'E:\Backup.bak' WITH COPY_ONLY"
        Dim dbnm As String
        dbnm = "[" & db_nm & "]" '"[I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF]"
        'dbnm = "[I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF]"

        'txt_path.Text = "D:\aabkp1"

        Dim bkp_file_nm As String
        bkp_file_nm = txt_path.Text & ".bak"  '"D:\Test\abc.bak"

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
        Dim testfile As String
        new_file = Format(Date.Now, "dd-MM-yyyy") & "XPRESSBKP.rar"
        'My.Computer.FileSystem.RenameFile("C:\Test.txt", "SecondTest.txt")
        testfile = txt_path.Text & "TI.rar"
        If My.Computer.FileSystem.FileExists(testfile) Then
            My.Computer.FileSystem.DeleteFile(testfile)
        End If
        My.Computer.FileSystem.RenameFile(bkp_file_nm, new_file)

        ProgressBar1.Value = 0
        Timer1.Enabled = True
        ProgressBar1.Visible = True
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Call Nw_Backup()

        Exit Sub

        If txt_path.Text = "" Then
            MsgBox("Please Select Path to save Backup", vbCritical, "WARNING")
            txt_path.Focus()
            Exit Sub
        End If

        'If con.State = 1 Then
        '    con.Dispose()
        '    con.Close()
        '    con = Nothing
        'End If

        ProgressBar1.Value = 0

        Dim a As String = Application.StartupPath & "\XPressDB.mdf"
        Dim dblocation, baklocation, testfile As String
        'Dim constring1 As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\parsuram_db.mdf;Integrated Security=True;User Instance=True"
        Call con_sql()

        dblocation = "[" & db_nm & "]" '"[" & Application.StartupPath & "\XPressDB.mdf" & "]"
        baklocation = txt_path.Text & ".bak" '"D:\backup\backup.bak"

        'MsgBox(dblocation)

        'Dim sqlConnectionString As String = constring1

        'Dim conn As New SqlConnection(sqlConnectionString)
        'conn.Open()

        Dim b, mdfloc, ldfloc, dbmdf, dbldf As String
        ''a = "[E:\2016\March\12\matro\WindowsApplication5\WindowsApplication5\Database1.mdf]"
        ''b = baklocation  '"d:\abcd\a.bak"
        'mdfloc = Application.StartupPath & "\" & "SATVIK_DB.mdf"
        'ldfloc = Application.StartupPath & "\" & "SATVIK_DB_log.ldf"
        'dbmdf = Application.StartupPath & "\" & "SATVIK_DB.mdf"
        'dbldf = Application.StartupPath & "\" & "SATVIK_DB_log.ldf"

        Dim cmd As New SqlCommand
        cmd.CommandType = CommandType.Text
        'cmd.CommandText = "BACKUP DATABASE [E:\2016\February\5\parsuram_3_2_16_5pm\parsuram\bin\Debug\parsuram_db.mdf] TO DISK = 'C:\Temp\location.BAK'"
        'cmd.CommandText = "BACKUP DATABASE " & dblocation & " TO DISK = '" & baklocation & "'"
        'cmd.CommandText = "USE Master ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\DB" & "\SBS.mdf] SET Single_User WITH Rollback Immediate Backup database [" & System.Windows.Forms.Application.StartupPath & "\DB" & "\SBS.mdf] TO DISK '" & baklocation & "' ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\DB" & "\SBS.mdf] SET Multi_User "
        '*******Working Local
        'cmd.CommandText = "BACKUP DATABASE [" & System.Windows.Forms.Application.StartupPath & "\SATVIK_DB.mdf] TO DISK = N'" & baklocation & "' WITH COPY_ONLY"
        Dim new_Query As String
        'new_Query = "backup database [" & Application.StartupPath & "\XPressDB.mdf" & "]" & " to disk='" & baklocation & "'"
        new_Query = "backup database [" & db_nm & "]" & " to disk='" & baklocation & "'"

        'new_Query = "BACKUP DATABASE [E:\2018\August\17\SATVIK HOSPITAL\SATVIK HOSPITAL\bin\Debug\SATVIK_DB.MDF] TO disk = 'D:\BackupFileName.bak'"

        '******Network Testing
        'cmd.CommandText = "BACKUP DATABASE [" & System.Windows.Forms.Application.StartupPath & "\SATVIK_DB.mdf] TO DISK = N'" & baklocation & "' WITH COPY_ONLY"
        'E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF

        'new_Query = "BACKUP DATABASE [" & db_nm & "]" & " TO DISK = N'" & baklocation & "' WITH COPY_ONLY"
        'new_Query = "BACKUP DATABASE [" & db_nm & "]" & " TO  DISK = N'E:\backup_2014.bak' WITH NOFORMAT, NOINIT,  NAME = N'SQL Ser'"
        'new_Query = "BACKUP DATABASE [" & db_nm & "]" & " TO  DISK = N'E:\backup_2014.bak' WITH NOFORMAT, NOINIT,  NAME = N'SQL Server Help _backup_2014_03_13_062920_6305771', SKIP, REWIND, NOUNLOAD,  STATS = 10"

        cmd.CommandText = new_Query

        cmd.Connection = con
        'MsgBox(cmd.CommandText)

        'On Error Resume Next
        cmd.ExecuteNonQuery()
        con.Close()

        'Code to Rename File
        Dim new_file As String
        new_file = Format(Date.Now, "dd-MM-yyyy") & ".rar"
        'My.Computer.FileSystem.RenameFile("C:\Test.txt", "SecondTest.txt")
        testfile = txt_path.Text & ".rar"
        If My.Computer.FileSystem.FileExists(testfile) Then
            My.Computer.FileSystem.DeleteFile(testfile)
        End If
        My.Computer.FileSystem.RenameFile(baklocation, new_file)

        Timer1.Enabled = True
        ProgressBar1.Visible = True
    End Sub

    Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick
        If ProgressBar1.Value = 100 Then
            Timer1.Enabled = False
            ProgressBar1.Visible = False
            Label1.Text = "Process 100 % Finished"
            'MsgBox("Backup Completed", vbInformation, "Information")
            MsgBox("Backup Process Completed Successfully", vbInformation, "Information")
            Label1.Visible = False
        Else
            ProgressBar1.Value = ProgressBar1.Value + 5
            Label1.Text = "Process " & ProgressBar1.Value & " % Finished"
        End If
    End Sub
End Class