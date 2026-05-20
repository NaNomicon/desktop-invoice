Public Class frmProgress

    Private Sub frmProgress_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        PictureBox1.Image = Image.FromFile(Application.StartupPath & "\P1.gif")
        Timer1.Enabled = True
        Timer1.Interval = 500
    End Sub
    Dim i As Integer
    Private Sub Timer1_Tick(sender As System.Object, e As System.EventArgs) Handles Timer1.Tick
        If i = 0 Then
            Label1.Text = "Loading."
        ElseIf i = 1 Then
            Label1.Text = "Loading.."
        ElseIf i = 2 Then
            Label1.Text = "Loading..."
        ElseIf i = 3 Then
            Label1.Text = "Loading...."
        ElseIf i = 4 Then
            Label1.Text = "Loading....."
        End If
        i += 1
        If i = 5 Then i = 0
    End Sub
End Class