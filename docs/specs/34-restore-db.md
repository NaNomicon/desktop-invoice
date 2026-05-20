# RestoreDB Specification

Source file: `docs/xpress/legacy-code/XPress/Utility/RestoreDB.vb`

## Purpose

`RestoreDB` restores application database data from a selected backup file. The implementation is centered in `Restore_DATA()` and is triggered by `Button3_Click`.

Primary intent:
- Let the user choose a backup file path
- Confirm destructive restore action
- Reconnect with `backup_constr` to SQL Server `master`
- Force target DB to single-user mode
- Run `RESTORE DATABASE ... WITH REPLACE`
- Return DB to multi-user mode
- Show progress and close application after completion

## UI Components

### File Selection
- `Button1_Click` opens `OpenFileDialog1`.
- Selected file path is written into `txt_path.Text`.
- If user cancels selection, `txt_path.Text` is reset to empty.

Actual code:

```vb
Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
    If (OpenFileDialog1.ShowDialog() = DialogResult.OK) Then
        txt_path.Text = OpenFileDialog1.FileName
    Else
        txt_path.Text = ""
    End If
End Sub
```

### Restore Trigger and Progress
- `Button3_Click` calls `Restore_DATA()`.
- `ProgressBar1` starts with a +20 increment during restore start.
- `Timer1_Tick` simulates progress to 100% by +5 increments.
- `Label1` shows progress text (`Process X % Finished`).
- At 100%, timer stops, progress bar hides, message is shown, and app exits.

Actual code:

```vb
Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
    Call Restore_DATA()
End Sub
```

```vb
Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick
    If ProgressBar1.Value = 100 Then
        Timer1.Enabled = False
        ProgressBar1.Visible = False
        Label1.Text = "Process 100 % Finished"
        MsgBox("Restore Done, It will Exit now", vbInformation, "Information")
        Application.Exit()
    Else
        ProgressBar1.Value = ProgressBar1.Value + 5
        Label1.Text = "Process " & ProgressBar1.Value & " % Finished"
    End If
End Sub
```

## Restore Logic

Core method: `Private Sub Restore_DATA()`.

### Pre-restore Validation and Confirmation
1. Require non-empty `txt_path.Text`.
2. Ask user to confirm replacement of previous data.
3. Abort if user chooses No.

Actual code:

```vb
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
```

### SQL Restore Sequence
The restore sequence uses the following SQL order:
1. `use [master]`
2. `alter database [db_nm] set single_user with rollback immediate`
3. `RESTORE DATABASE [db_nm] FROM DISK = N'<baklocation>' WITH REPLACE`
4. `ALTER DATABASE [db_nm] SET Multi_User`

Actual code:

```vb
Dim sqlConn As New SqlConnection(backup_constr)
sqlConn.Open()

Dim dbnm As String
dbnm = "[" & db_nm & "]"

Dim qry As String
qry = "use [master] "
Using sqlCmd As New SqlCommand(qry, sqlConn)
    sqlCmd.ExecuteNonQuery()
End Using

qry = "alter database " & dbnm & " set single_user with rollback immediate"
Using sqlCmd As New SqlCommand(qry, sqlConn)
    sqlCmd.ExecuteNonQuery()
End Using

Dim sCommand = "RESTORE DATABASE " & dbnm & " FROM DISK = N'" & baklocation & "' WITH REPLACE"
Using sqlCmd As New SqlCommand(sCommand, sqlConn)
    sqlCmd.ExecuteNonQuery()
End Using

qry = "ALTER DATABASE " & dbnm & " SET Multi_User"
Using sqlCmd As New SqlCommand(qry, sqlConn)
    sqlCmd.ExecuteNonQuery()
End Using
```

## Connection Handling

### Closing Existing App Connection (`con`)
Before restore, the global/current connection `con` is closed and released if open:

```vb
If con.State = 1 Then
    con.Close()
    con.Dispose()
    con = Nothing
End If
```

Reason: restore requires exclusive control and cannot proceed safely with active app-level connections.

### Use of `backup_constr`
Restore operation creates a new dedicated SQL connection using `backup_constr`:

```vb
Dim sqlConn As New SqlConnection(backup_constr)
sqlConn.Open()
```

Expected behavior of `backup_constr`:
- Must connect to SQL Server instance with permission to restore databases
- Must allow executing `USE master`, `ALTER DATABASE`, and `RESTORE DATABASE`
- Must not depend on attaching/opening the target DB as active user DB

## Path Construction and Backup File Handling

The restore flow manipulates selected file names with `rar`/`bak` replacement:

1. Initial selected path:

```vb
baklocation = txt_path.Text
```

2. Rename selected file from `.rar` naming to `.bak` using only safe file name:

```vb
new_file = Replace(OpenFileDialog1.SafeFileName, "rar", "bak")
My.Computer.FileSystem.RenameFile(baklocation, new_file)
```

3. Rebuild restore path by replacing `rar` with `bak` in full text path:

```vb
baklocation = txt_path.Text.Replace("rar", "bak")
```

4. After restore, rename file back from `.bak` to `.rar`:

```vb
new_file = Replace(OpenFileDialog1.SafeFileName, "bak", "rar")
My.Computer.FileSystem.RenameFile(baklocation, new_file)
```

Notes:
- `OpenFileDialog1.SafeFileName` provides file name only (no directory).
- `RenameFile` is called with full original path plus new name, so final file remains in original directory with changed extension/name.
- String replacement is not extension-aware; it replaces any `rar`/`bak` substring in name/path.

## Error Handling

### Current State in Source
There is no `Try...Catch` around:
- File rename operations
- SQL connection open
- SQL command execution
- Final rename back to `.rar`

Therefore failures (missing permissions, invalid file, SQL errors, locked file, wrong connection rights) will raise runtime exceptions.

### Existing User-facing Guards
Only these guardrails are implemented:
- Empty-path check with warning message
- Destructive action confirmation prompt

### Operational Risks to Note
- If restore SQL fails after first rename, file may remain as `.bak`.
- If `ALTER DATABASE ... SET Multi_User` fails, DB can remain single-user.
- `sqlConn` is not wrapped in `Using`, so disposal is not guaranteed on exception.
- Progress UI is timer-driven, not tied to actual SQL restore progress.

## End-to-end Flow Summary

1. User opens restore screen (`RestoreDB_Load` sets form state and DB connection context).
2. User picks backup file with `OpenFileDialog1` (`Button1_Click`).
3. User clicks restore (`Button3_Click` -> `Restore_DATA()`).
4. Path required check + confirmation prompt.
5. Existing connection `con` closed/disposed.
6. Selected file renamed (`rar` -> `bak`) and `baklocation` constructed.
7. New SQL connection opened using `backup_constr`.
8. DB switched to `master`, set single-user, restored with `WITH REPLACE`, set multi-user.
9. Backup file renamed back (`bak` -> `rar`).
10. Progress timer starts, success message appears at 100%, app exits.
