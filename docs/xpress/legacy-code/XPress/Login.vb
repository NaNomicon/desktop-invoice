Public Class Login

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Login_FormClosing(ByVal sender As Object, ByVal e As System.Windows.Forms.FormClosingEventArgs) Handles Me.FormClosing

    End Sub

    Private Sub Login_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub Login_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        password.Focus()
        first_date()
        Button1.FlatAppearance.BorderSize = 0
        Button2.FlatAppearance.BorderSize = 0
        Call con_sql()
        auto_field()
        Me.KeyPreview = True
        load_customer()
    End Sub
    Public Sub load_customer()
        Call SQL_Select("tbl_user", , , " Order by user_id")
        If ds.Tables(0).Rows.Count > 0 Then
            user_id.DataSource = ds.Tables(0)
            user_id.DisplayMember = "User_id"
            user_id.ValueMember = "id"
        End If
    End Sub
    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub user_id_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles user_id.GotFocus
        SendKeys.Send("{F4}")
    End Sub

    Private Sub user_id_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles user_id.KeyDown
        If e.KeyCode = Keys.Enter Then
            password.Focus()
        End If
    End Sub

    Private Sub user_id_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles user_id.SelectedIndexChanged

    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        check1()
    End Sub
    Public Sub check1()
        If user_id.SelectedIndex = -1 Then
            MsgBox("Please Select User ID", vbCritical, "WARNING")
            user_id.Focus()
            Exit Sub
        End If
        If password.Text = "" Then
            MsgBox("Please Enter Password", vbCritical, "WARNING")
            password.Focus()
            Exit Sub
        End If
        Dim con_pass As String = get_single_value("password", "tbl_user", "user_id", user_id.Text)
        If password.Text <> con_pass Then
            MsgBox("Password Is Not Valid", vbCritical, "WARNING")
            password.Text = ""
            password.Focus()
            Exit Sub
        Else
            Me.Hide()
            user_id_log = get_single_value("des", "tbl_user", "id", Val(user_id.SelectedValue))
            user_name = user_id.Text
            user_id.Text = ""
            password.Text = ""
            HOME.Show()
        End If
    End Sub

    Private Sub password_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles password.KeyDown
        If e.KeyCode = Keys.Enter Then
            check1()
        End If
    End Sub

    Private Sub password_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles password.TextChanged

    End Sub
End Class