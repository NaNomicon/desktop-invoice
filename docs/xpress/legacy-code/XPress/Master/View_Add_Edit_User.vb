Public Class View_Add_Edit_User

    Private Sub Label8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label8.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub View_Add_Edit_User_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub View_Add_Edit_User_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub View_Add_Edit_User_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        Call grids1(DataGridView1)
        Call load_grid()
        If user_id > 0 Then
            load_data()
        End If
        Me.KeyPreview = True
    End Sub
    Public Sub load_grid()
        Call SQL_Select("tbl_user", , , " Order By user_id")
        If ds.Tables(0).Rows.Count > 0 Then
            With DataGridView1
                .DataSource = ds.Tables(0)
                .Columns(0).Visible = False
                .Columns(1).HeaderText = "User ID"
                .Columns(2).Visible = False
            End With
        End If
    End Sub
    Public Sub load_data()
        Call SQL_Select("tbl_user", , " id='" & user_id & "'")
        If ds.Tables(0).Rows.Count > 0 Then
            With ds.Tables(0)
                user_id1.Text = .Rows(0).Item("user_id").ToString
                password.Text = .Rows(0).Item("password").ToString
                des.Text = .Rows(0).Item("des").ToString
            End With
        End If
    End Sub
    Private Sub View_Add_Edit_User_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If user_id1.Text = "" Then
            MsgBox("Please Enter User ID", vbCritical, "WARNING")
            user_id1.Focus()
            Exit Sub
        End If
        If des.SelectedIndex = -1 Then
            MsgBox("Please Select Designation Of User", vbCritical, "WARNING")
            des.Focus()
            Exit Sub
        End If
        If password.Text = "" Then
            MsgBox("Please Enter Password", vbCritical, "WARNING")
            password.Focus()
            Exit Sub
        End If
        If password.Text <> confirm_password.Text Then
            MsgBox("New Password & Confirm Password Not Match", vbCritical, "WARNING")
            password.Text = ""
            password.Focus()
            Exit Sub
        End If
        Call saved()
        Call load_grid()
        password.Text = ""
        user_id = 0
        user_id1.Text = ""
        confirm_password.Text = ""
    End Sub
    Public Sub saved()
        Dim variable As New Dictionary(Of String, String)
        variable.Add("user_id", "'" & user_id1.Text.Replace("'", "''") & "'")
        variable.Add(password.Name, "'" & password.Text.Replace("'", "''") & "'")
        variable.Add(des.Name, "'" & des.Text.Replace("'", "''") & "'")
        If user_id > 0 Then
            Dim d As String = SQL_Update("tbl_user", variable, "id=" & user_id)
        Else
            Dim d As Integer = SQL_Insert("tbl_user", variable)
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If


        user_id = DataGridView1.SelectedRows(0).Cells(0).Value
        load_data()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No User Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        user_id = DataGridView1.SelectedRows(0).Cells(0).Value
        ' Try
        Dim ask As String
        ask = MsgBox("Are You Sure Want to Delete User Details?", vbQuestion + vbYesNo)
        If ask = "6" Then
            If DataGridView1.SelectedRows.Count <= 0 Then
                MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
                DataGridView1.Focus()
                Exit Sub
            End If

            Call SQL_Delete("tbl_user", " id='" & user_id & "'")
            MsgBox("User Successfully Deleted.", vbInformation)
            Call load_grid()
            DataGridView1.Focus()
        ElseIf ask = "7" Then
            DataGridView1.Focus()
            Exit Sub
        End If
        load_grid()
        DataGridView1.Focus()

        If ds.Tables(0).Rows.Count <= 0 Then
            ' DataGridView1.Rows.Clear()
        End If
    End Sub

    Private Sub ComboBox1_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles des.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles des.SelectedIndexChanged

    End Sub
End Class