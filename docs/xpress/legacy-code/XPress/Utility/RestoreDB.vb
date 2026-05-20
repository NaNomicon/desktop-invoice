Imports System.Data.SqlClient

Public Class RestoreDB

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub RestoreDB_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub RestoreDB_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub RestoreDB_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Me.KeyPreview = True
    End Sub

    Private Sub RestoreDB_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If (OpenFileDialog1.ShowDialog() = DialogResult.OK) Then
            'If Microsoft.VisualBasic.Right(FolderBrowserDialog1.SelectedPath, 1) <> "\" Then
            txt_path.Text = OpenFileDialog1.FileName  'FolderBrowserDialog1.SelectedPath & "\" & Format(Date.Now, "dd-MM-yyyy")
            'Else 
            'txt_path.Text = FolderBrowserDialog1.SelectedPath & Format(Date.Now, "dd-MM-yyyy")
            'End If
        Else
            txt_path.Text = ""
        End If
    End Sub

    Private Sub Restore_DATA()
        If txt_path.Text = "" Then
            MsgBox("Please Select File to Restore Data", vbCritical, "WARNING")
            txt_path.Focus()
            Exit Sub
        End If

        Dim que As String
        que = MsgBox("Are You Sure Want to Restore Data?, Previous Data will be removed", vbQuestion + vbYesNo, "Question")
        If que = vbNo Then
            Exit Sub
        End If

        If con.State = 1 Then
            con.Close()
            con.Dispose()
            con = Nothing
        End If

        ProgressBar1.Value = ProgressBar1.Value + 20
        Dim a As String = Application.StartupPath
        Dim dblocation, baklocation As String

        baklocation = txt_path.Text

        Dim new_file, nw As String
        new_file = Replace(OpenFileDialog1.SafeFileName, "rar", "bak")
        My.Computer.FileSystem.RenameFile(baklocation, new_file)

        baklocation = txt_path.Text.Replace("rar", "bak")

        'con.Dispose()
        'con.Close()

        'Dim sqlConn As New SqlConnection("Data Source=TBS01\SQLEXPRESS;Initial Catalog=I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF;User ID=M;Password=123456")
        'Dim sqlConn As New SqlConnection("Data Source=SERVER\SQLEXPRESS;Initial Catalog=master;Integrated Security=True")
        'Dim sqlConn As New SqlConnection("Data Source=DICTIN-PC;Initial Catalog=master;Integrated Security=True")
        Dim sqlConn As New SqlConnection(backup_constr)

        sqlConn.Open()

        Dim dbnm As String
        dbnm = "[" & db_nm & "]"

        'MsgBox(dbnm)

        Dim qry As String
        qry = "use [master] "
        Using sqlCmd As New SqlCommand(qry, sqlConn)
            sqlCmd.ExecuteNonQuery()
        End Using
        qry = "alter database " & dbnm & " set single_user with rollback immediate"
        'MsgBox(qry)
        Using sqlCmd As New SqlCommand(qry, sqlConn)
            sqlCmd.ExecuteNonQuery()
        End Using

        'Dim sCommand = "RESTORE DATABASE [I:\2019\ATTANDANCE\ATTENDANCE_NEW\ATTENDANCE\BIN\DEBUG\ATTDB.MDF] FROM DISK = N'E:\Backup.bak' WITH REPLACE"
        Dim sCommand = "RESTORE DATABASE " & dbnm & " FROM DISK = N'" & baklocation & "' WITH REPLACE"

        'MsgBox(sCommand)
        Using sqlCmd As New SqlCommand(sCommand, sqlConn)
            sqlCmd.ExecuteNonQuery()
        End Using

        qry = "ALTER DATABASE " & dbnm & " SET Multi_User"
        Using sqlCmd As New SqlCommand(qry, sqlConn)
            sqlCmd.ExecuteNonQuery()
        End Using

        new_file = Replace(OpenFileDialog1.SafeFileName, "bak", "rar")
        My.Computer.FileSystem.RenameFile(baklocation, new_file)

        Timer1.Enabled = True
        ProgressBar1.Visible = True
    End Sub

    'Private Sub Nw_RESTORE()
    '    OpenFileDialog1.FileName = ""
    '    OpenFileDialog1.Filter = "BAK Files (.bak)|*.bak|All Files (*.*)|*.*"
    '    OpenFileDialog1.ShowDialog()
    '    Timer1.Enabled = True
    '    ProgressBar1.Visible = True
    '    'query("DROP DATABASE " & ComboBoxdb.Text)
    '    'query("RESTORE DATABASE " & ComboBoxdb.Text & " FROM disk='" & OpenFileDialog1.FileName & "'")
    '    Dim query As String
    '    query = "RESTORE DATABASE " & db_nm & " FROM disk='" & OpenFileDialog1.FileName & "'"
    'End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Call Restore_DATA()

        Exit Sub

        If txt_path.Text = "" Then
            MsgBox("Please Select File to Restore Data")
            txt_path.Focus()
            Exit Sub
        End If
        con.Close()
        con.Dispose()
        con = Nothing

        'If con.State = 1 Then Exit Sub

        'Dim a As String = Application.StartupPath & "\database"
        ''MsgBox(a)

        ''*****Working Local
        'Dim constring As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\parsuram_db.mdf;Integrated Security=True;User Instance=True"
        'con.ConnectionString = constring
        'con.Open()

        ProgressBar1.Value = ProgressBar1.Value + 20

        Dim a As String = Application.StartupPath & "\database"
        Dim dblocation, baklocation As String
        'Dim constring1 As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\test.mdf;Integrated Security=True;User Instance=True"
        'Dim constring1 As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\test.mdf;Integrated Security=True;User Instance=True"

        'dblocation = "[" & a & "\parsuram_db.mdf" & "]"
        'baklocation = txt_path.Text & ".bak" '"D:\backup\backup.bak"
        'MsgBox(dblocation)
        baklocation = txt_path.Text
        'MsgBox(OpenFileDialog1.SafeFileName)

        Dim new_file, nw As String
        'For i = baklocation.Length To 1 Step -1
        '    nw = Microsoft.VisualBasic.Mid(baklocation, i, 1) 's1 = Mid(fnm, j, 1)
        '    If nw = "\" Then Exit For
        '    new_file = new_file & nw
        'Next
        new_file = Replace(OpenFileDialog1.SafeFileName, "rar", "bak")
        'MsgBox(baklocation & vbCrLf & new_file)

        'new_file = Format(Date.Now, "dd-MM-yyyy") & ".rar"
        'new_file = Format(Date.Now, "dd-MM-yyyy") & ".rar"
        'My.Computer.FileSystem.RenameFile("C:\Test.txt", "SecondTest.txt")
        My.Computer.FileSystem.RenameFile(baklocation, new_file)

        baklocation = Replace(txt_path.Text, "rar", "bak")
        'Dim sqlConnectionString As String = constring1

        Dim sqlConnectionString As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & a & "\test.mdf;Integrated Security=True;User Instance=True"
        Dim conn As SqlConnection = New SqlConnection(sqlConnectionString)
        conn.Open()
        Dim b, mdfloc, ldfloc, dbmdf, dbldf As String
        'a = "[E:\2016\March\12\matro\WindowsApplication5\WindowsApplication5\Database1.mdf]"
        b = baklocation  '"d:\abcd\a.bak"
        mdfloc = Application.StartupPath & "\parsuram_db.mdf"
        ldfloc = Application.StartupPath & "\parsuram_db_log.ldf"
        dbmdf = Application.StartupPath & "\parsuram_db.mdf"
        dbldf = Application.StartupPath & "\parsuram_db_log.ldf"

        Dim cmd As New SqlCommand
        cmd.CommandType = CommandType.Text
        'cmd.CommandText = "BACKUP DATABASE " & a & " TO DISK='d:\abcd\a.bak'"
        'cmd.CommandText = "RESTORE DATABASE SBS FROM DISK='" & b & "' WITH REPLACE"   '" & a & "
        'cmd.CommandText = "RESTORE DATABASE SBS FROM DISK = '" & b & "' With Move 'SBS' TO '" & mdfloc & "',Move 'SBS_log' TO '" & ldfloc & "',REPLACE" '--Needed if database B already exists
        'cmd.CommandText = "RESTORE DATABASE SBS FROM DISK = '" & b & "' With Move '" & dbmdf & "' TO '" & mdfloc & "',Move '" & dbmdf & "' TO '" & ldfloc & "',REPLACE" '--Needed if database B already exists

        '*** Working Local
        'Dim cb As String = "USE Master ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\database" & "\parsuram_db.mdf] SET Single_User WITH Rollback Immediate Restore database [" & System.Windows.Forms.Application.StartupPath & "\database" & "\parsuram_db.mdf] FROM disk='" & b & "' WITH REPLACE ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\database" & "\parsuram_db.mdf] SET Multi_User "

        '*** Working Network
        Dim cb As String = "USE Master ALTER DATABASE [E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF] SET Single_User WITH Rollback Immediate Restore database [E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF] FROM disk='" & b & "' WITH REPLACE ALTER DATABASE [E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF] SET Multi_User"
        'E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF
        'MsgBox(cb)

        cmd.CommandText = cb
        'MsgBox(cmd.CommandText)
        cmd.Connection = conn
        cmd.ExecuteNonQuery()

        conn.Close()
        'MsgBox("Restore Done, It will Exit now", vbInformation)

        'FILE WRITE CODE
        Dim objWriter As New System.IO.StreamWriter(Application.StartupPath & "\t.txt")

        objWriter.Write("0")
        objWriter.Close()

        new_file = Replace(OpenFileDialog1.SafeFileName, "bak", "rar")
        My.Computer.FileSystem.RenameFile(baklocation, new_file)

        'MessageBox.Show("Text written to file")
        Timer1.Enabled = True
        ProgressBar1.Visible = True
        Exit Sub

        Environment.Exit(0)

        FileSystem.FileCopy(mdfloc, a & "\parsuram_db.mdf")
        FileSystem.FileCopy(ldfloc, a & "\parsuram_db_log.ldf")

        'Dim conn As New SqlConnection(sqlConnectionString)
        'conn.Open()

        'Dim cmd As New SqlCommand
        'cmd.CommandType = CommandType.Text
        ''cmd.CommandText = "BACKUP DATABASE [E:\2016\February\5\parsuram_3_2_16_5pm\parsuram\bin\Debug\parsuram_db.mdf] TO DISK = 'C:\Temp\location.BAK'"
        ''cmd.CommandText = "BACKUP DATABASE " & dblocation & " TO DISK = '" & baklocation & "'"
        'cmd.CommandText = "RESTORE DATABASE [SMS] From DISK = '" & baklocation & "' WITH REPLACE"
        'cmd.Connection = conn
        'cmd.ExecuteNonQuery()

        'conn.Close()

        MsgBox("Done!!!")

        'If txt_path.Text = "" Then
        '    MsgBox("Please Select File to Restore Data", vbCritical, "WARNING")
        '    txt_path.Focus()
        '    Exit Sub
        'End If

        'Dim que As String
        'que = MsgBox("Are You Sure Want to Restore Data?, Previous Data will be removed", vbQuestion + vbYesNo, "Question")
        'If que = vbNo Then
        '    Exit Sub
        'End If

        'If con.State = 1 Then
        '    con.Close()
        '    con.Dispose()
        '    con = Nothing
        'End If

        'ProgressBar1.Value = ProgressBar1.Value + 20
        'Dim a As String = Application.StartupPath & "\XPressDB.mdf"
        'Dim dblocation, baklocation As String

        'baklocation = txt_path.Text

        'Dim new_file, nw As String
        'new_file = Replace(OpenFileDialog1.SafeFileName, "rar", "bak")
        'My.Computer.FileSystem.RenameFile(baklocation, new_file)

        'baklocation = Replace(txt_path.Text, "rar", "bak")
        ''Dim sqlConnectionString As String = constring1

        ''Dim sqlConnectionString As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & path & ";Integrated Security=True;User Instance=True"
        'Dim sqlConnectionString As String = "Data Source=.\SQLEXPRESS;AttachDbFilename=" & Application.StartupPath & "\XPressDB.mdf;Integrated Security=True;Connect Timeout=30;User Instance=True"
        'Dim conn As SqlConnection = New SqlConnection(sqlConnectionString)
        'conn.Open()
        'Dim b, mdfloc, ldfloc, dbmdf, dbldf As String
        ''a = "[E:\2016\March\12\matro\WindowsApplication5\WindowsApplication5\Database1.mdf]"
        'b = baklocation  '"d:\abcd\a.bak"

        'Dim cmd As New SqlCommand
        'cmd.CommandType = CommandType.Text

        ''*** Working Local
        ''Dim cb As String = "USE Master ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\database" & "\parsuram_db.mdf] SET Single_User WITH Rollback Immediate Restore database [" & System.Windows.Forms.Application.StartupPath & "\database" & "\parsuram_db.mdf] FROM disk='" & b & "' WITH REPLACE ALTER DATABASE [" & System.Windows.Forms.Application.StartupPath & "\database" & "\parsuram_db.mdf] SET Multi_User "
        'Dim cb As String = "USE Master ALTER DATABASE [" & Application.StartupPath & "\XPressDB.mdf" & "] SET Single_User WITH Rollback Immediate Restore database [" & Application.StartupPath & "\XPressDB.mdf" & "] FROM disk='" & b & "' WITH REPLACE ALTER DATABASE [" & Application.StartupPath & "\XPressDB.mdf" & "] SET Multi_User"

        ''*** Working Network
        ''Dim cb As String = "USE Master ALTER DATABASE [E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF] SET Single_User WITH Rollback Immediate Restore database [E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF] FROM disk='" & b & "' WITH REPLACE ALTER DATABASE [E:\2016\JULY\PARSURAM_30-06\PARSURAM\BIN\DEBUG\DATABASE\PARSURAM_DB.MDF] SET Multi_User"
        'On Error Resume Next
        ''MsgBox(cb)
        'cmd.CommandText = cb
        ''MsgBox(cmd.CommandText)
        'cmd.Connection = conn
        'cmd.ExecuteNonQuery()

        'conn.Close()
        ''MsgBox("Restore Done, It will Exit now", vbInformation)

        ' ''FILE WRITE CODE
        ''Dim objWriter As New System.IO.StreamWriter(Application.StartupPath & "\t.txt")

        ''objWriter.Write("0")
        ''objWriter.Close()

        'new_file = Replace(OpenFileDialog1.SafeFileName, "bak", "rar")
        'My.Computer.FileSystem.RenameFile(baklocation, new_file)

        ''MessageBox.Show("Text written to file")
        'Timer1.Enabled = True
        'ProgressBar1.Visible = True
        ''Exit Sub

        ''Environment.Exit(0)

        'FileSystem.FileCopy(mdfloc, a)
        'FileSystem.FileCopy(ldfloc, a)
    End Sub

    Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick
        If ProgressBar1.Value = 100 Then
            Timer1.Enabled = False
            ProgressBar1.Visible = False
            Label1.Text = "Process 100 % Finished"
            MsgBox("Restore Done, It will Exit now", vbInformation, "Information")
            Application.Exit()
            'MsgBox("Successfully Done")
            'MsgBox("Restore Done, It will Exit now", vbInformation, "Information")
            'Environment.Exit(1)
        Else
            ProgressBar1.Value = ProgressBar1.Value + 5
            Label1.Text = "Process " & ProgressBar1.Value & " % Finished"
        End If
    End Sub
End Class