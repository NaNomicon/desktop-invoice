Imports System.IO

Imports System.Data.OleDb
Imports Microsoft.Office.Interop

Public Class View_Customer

    Private Sub View_Customer_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub View_Customer_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub View_Customer_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        Call con_sql()
        lblTotalRecords.Text = ""
        lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
        Me.KeyPreview = True
        Call load_grid_sql()
    End Sub
    Public Sub load_grid_sql()
        Call grids1(DataGridView1)
        Call SQL_Select("tbl_customer", "id,LTRIM(title_name + ' ' + customer_name),Customer_type,contact,telephone,address,email,due_amount,reg_date", " customer_name like '%" & find.Text & "%' or telephone like '%" & find.Text & "%' OR contact like '%" & find.Text & "%' OR address like '%" & find.Text & "%'")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)
            With DataGridView1
                .Columns(0).Visible = False
                .Columns(1).HeaderText = "Customer Name"
                .Columns(2).HeaderText = "Customer Type"
                .Columns(3).HeaderText = "Contact Person"
                .Columns(4).HeaderText = "Telephone"
                .Columns(5).HeaderText = "Address"
                .Columns(6).HeaderText = "E-Mail"
                .Columns(8).HeaderText = "Register Date"
                '                .Columns(8).DisplayIndex = 0
                .Columns(8).DefaultCellStyle.Format = "dd-MM-yyyy"
                .Columns(7).Visible = False
            End With
        Else
            DataGridView1.DataSource = Nothing
        End If
        lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
    End Sub
    Private Sub View_Customer_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        customer_id = 0
        Call __show(Add_Edit_Customer)
        load_nav_bar("Add_Edit_Customer", "Add Customer")
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Call edit1()
    End Sub
    Public Sub edit1()
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If


        customer_id = DataGridView1.SelectedRows(0).Cells(0).Value
        Call __show(Add_Edit_Customer)
        load_nav_bar("Add_Edit_Customer", "Edit Customer")
    End Sub

    Private Sub find_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find.TextChanged
        load_grid_sql()
    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        lblmsg.Visible = True
        ProgressBar1.Visible = True
        Dim conn As OleDbConnection
        Dim dtr As OleDbDataReader
        Dim dta As OleDbDataAdapter
        Dim cmd As OleDbCommand
        Dim dts As DataSet
        Dim excel As String
        Dim OpenFileDialog As New OpenFileDialog

        OpenFileDialog.InitialDirectory = My.Computer.FileSystem.SpecialDirectories.MyDocuments
        OpenFileDialog.Filter = "All Files (*.*)|*.*|Excel files (*.xlsx)|*.xlsx|CSV Files (*.csv)|*.csv|XLS Files (*.xls)|*xls"

        If (OpenFileDialog.ShowDialog(Me) = System.Windows.Forms.DialogResult.OK) Then

            Dim fi As New FileInfo(OpenFileDialog.FileName)
            Dim FileName As String = OpenFileDialog.FileName

            excel = fi.FullName
            conn = New OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" + excel + ";Extended Properties=Excel 12.0;")
            dta = New OleDbDataAdapter("Select * From [Sheet1$]", conn)
            dts = New DataSet
            dta.Fill(dts, "[Sheet1$]")
            DataGridView2.DataSource = dts
            DataGridView2.DataMember = "[Sheet1$]"
            conn.Close()

            Timer1.Enabled = True
            Timer1.Start()
            Timer1.Interval = 50
            ProgressBar1.Maximum = 100
            ProgressBar1.Minimum = 0
            Try


                With DataGridView2
                    For i = 0 To .Rows.Count - 1

                        'xlWorkSheet.Cells(1, 1) = "TITLE"
                        'xlWorkSheet.Cells(1, 2) = "CUSTOMER NAME"
                        'xlWorkSheet.Cells(1, 3) = "CONTACT PERSON"
                        'xlWorkSheet.Cells(1, 4) = "ADDRESS"
                        'xlWorkSheet.Cells(1, 5) = "TELEPHONE"
                        'xlWorkSheet.Cells(1, 6) = "EMAIL ADDRESS"
                        'xlWorkSheet.Cells(1, 7) = "CUSTOMER TYPE"
                        Dim variable As New Dictionary(Of String, String)
                        Dim title_name, CUSTOMER_NAME, contact, address, telephone, email, customer_type, brn, vat As String
                        title_name = .Rows(i).Cells(0).Value.ToString
                        'If title_name.Trim = "" Then
                        ' GoTo nnnn
                        ' End If
                        CUSTOMER_NAME = .Rows(i).Cells(1).Value.ToString.Replace("'", "''")
                        contact = .Rows(i).Cells(2).Value.ToString
                        address = .Rows(i).Cells(3).Value.ToString.Replace("'", "''")
                        telephone = .Rows(i).Cells(4).Value.ToString
                        email = .Rows(i).Cells(5).Value.ToString.Replace("'", "''")
                        customer_type = .Rows(i).Cells(6).Value.ToString
                        brn = .Rows(i).Cells(7).Value.ToString
                        vat = .Rows(i).Cells(8).Value.ToString
                        Dim test As String = get_single_value("customer_name", "tbl_customer", "customer_name", Trim(CUSTOMER_NAME))
                        If test <> "" Then GoTo nnnn
                        variable.Add("title_name", "'" & title_name & "'")
                        variable.Add("customer_name", "'" & CUSTOMER_NAME & "'")
                        variable.Add("contact", "'" & contact & "'")
                        variable.Add("address", "'" & address & "'")
                        variable.Add("telephone", "'" & telephone & "'")
                        variable.Add("email", "'" & email & "'")
                        variable.Add("customer_type", "'" & customer_type & "'")
                        variable.Add("brn", "'" & brn & "'")
                        variable.Add("vat", "'" & vat & "'")
                        Dim reg_date1 As Date = Date.Now
                        variable.Add("reg_date", "'" & Format(reg_date1, "dd-MMM-yyyy") & "'")
                        Dim d As Integer = SQL_Insert("tbl_customer", variable)
nnnn:
                    Next
                End With
            Catch ex As Exception
                Timer1.Stop()
                MsgBox("Excel File Format Is Wrong Please Check", vbCritical, "WARNING")
            End Try
        End If
    End Sub

    Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick
        ProgressBar1.Value += 2
        lblmsg.Text = ProgressBar1.Value & "%"
        If ProgressBar1.Value = ProgressBar1.Maximum Then
            Timer1.Enabled = False
            MsgBox("Excel File Successfully Imported", vbInformation)
            Call load_grid_sql()
            lblmsg.Visible = False
            ProgressBar1.Visible = False
        End If


    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        Dim saveFileDialog1 As New SaveFileDialog()
        'saveFileDialog1.Filter = "JPeg Image|*.jpg|Bitmap Image|*.bmp|Gif Image|*.gif"
        'saveFileDialog1.Title = "Save an Image File"
        saveFileDialog1.Filter = "Excel |*.xlsx"
        saveFileDialog1.Title = "Save Excle File"
        saveFileDialog1.ShowDialog()

        Dim fnm As String

        If saveFileDialog1.FileName <> "" Then
            'Dim fs As System.IO.FileStream = CType _
            '   (saveFileDialog1.OpenFile(), System.IO.FileStream)
            fnm = saveFileDialog1.FileName
            'fs.Close()
        Else
            'MessageBox.Show("Please Enter Proper Excel File name")
            Exit Sub
        End If

        'MsgBox(fnm)
        'MsgBox("Done")
        'Exit Sub

        Dim excel_file_name As String
        Dim today_dt As String
        today_dt = Format(Today.Date, "dd-MM-yyyy") 'Today.Date.ToString
        excel_file_name = fnm  '"d:\" & today_dt & ".xlsx"

        Dim xlWorkBook As Excel.Workbook
        Dim xlWorkSheet As Excel.Worksheet
        Dim misValue As Object = System.Reflection.Missing.Value
        Dim xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()

        If xlApp Is Nothing Then
            MessageBox.Show("Excel is not properly installed!!")
            Return
        End If

        xlWorkBook = xlApp.Workbooks.Add(misValue)
        xlWorkSheet = xlWorkBook.Sheets("sheet1")
        'xlWorkSheet.Cells(1, 1) = "Sheet 1 content"

        xlWorkSheet.Cells(1, 1) = "TITLE"
        xlWorkSheet.Cells(1, 2) = "CUSTOMER NAME"
        xlWorkSheet.Cells(1, 3) = "CONTACT PERSON"
        xlWorkSheet.Cells(1, 4) = "ADDRESS"
        xlWorkSheet.Cells(1, 5) = "TELEPHONE"
        xlWorkSheet.Cells(1, 6) = "EMAIL ADDRESS"
        xlWorkSheet.Cells(1, 7) = "CUSTOMER TYPE"
        xlWorkSheet.Cells(1, 8) = "BRN"
        xlWorkSheet.Cells(1, 9) = "VAT"

        Dim z As Integer
        Dim j As Integer

        z = 2
        Call SQL_Select("tbl_customer", "id,title_name, customer_name,Customer_type,contact,telephone,address,email,due_amount,brn,vat", " customer_name like '" & find.Text & "%'")
        If ds.Tables(0).Rows.Count > 0 Then
            With ds.Tables(0)
                For j = 0 To .Rows.Count - 1

                    xlWorkSheet.Cells(z, 1) = .Rows(j).ItemArray(1).ToString
                    xlWorkSheet.Cells(z, 2) = .Rows(j).ItemArray(2).ToString
                    xlWorkSheet.Cells(z, 3) = .Rows(j).ItemArray(4).ToString
                    xlWorkSheet.Cells(z, 4) = .Rows(j).ItemArray(6).ToString
                    xlWorkSheet.Cells(z, 5) = .Rows(j).ItemArray(5).ToString
                    xlWorkSheet.Cells(z, 6) = .Rows(j).ItemArray(7).ToString
                    xlWorkSheet.Cells(z, 7) = .Rows(j).ItemArray(3).ToString
                    xlWorkSheet.Cells(z, 8) = .Rows(j).ItemArray(9).ToString
                    xlWorkSheet.Cells(z, 9) = .Rows(j).ItemArray(10).ToString
                    z = z + 1
                Next
            End With
        End If
        xlWorkSheet.Columns.AutoFit()

        xlWorkBook.SaveAs(excel_file_name)
        'xlWorkBook.Save()
        'xlWorkBook.SaveAs("d:\csharp-Excel.xls", Excel.XlFileFormat.xlWorkbookNormal, misValue, misValue, misValue, misValue, _
        ' Excel.XlSaveAsAccessMode.xlExclusive, misValue, misValue, misValue, misValue, misValue)
        xlWorkBook.Close(True, misValue, misValue)
        xlApp.Quit()

        releaseObject(xlWorkSheet)
        releaseObject(xlWorkBook)
        releaseObject(xlApp)

        'Call export_data_To_FTP()
        MsgBox("File Saved at : " & fnm)
        Me.Dispose()

    End Sub
    Private Sub releaseObject(ByVal obj As Object)
        Try
            System.Runtime.InteropServices.Marshal.ReleaseComObject(obj)
            obj = Nothing
        Catch ex As Exception
            obj = Nothing
        Finally
            GC.Collect()
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No User Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        customer_id = DataGridView1.SelectedRows(0).Cells(0).Value
        ' Try
        Dim ask As String
        ask = MsgBox("Are You Sure Want to Delete Customer Details?", vbQuestion + vbYesNo)
        If ask = "6" Then
            If DataGridView1.SelectedRows.Count <= 0 Then
                MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
                DataGridView1.Focus()
                Exit Sub
            End If
            Dim temp As String = get_single_value("id", "tbl_invoice_main", "customer_id", customer_id)
            If temp <> "" Then
                MsgBox("This Customer In Use You Can Not Delete", vbCritical, "WARNING")
                Exit Sub
            End If
            Dim temp1 As String = get_single_value("id", "tbl_quotation_main", "customer_id", customer_id)
            If temp1 <> "" Then
                MsgBox("This Customer In Use You Can Not Delete", vbCritical, "WARNING")
                Exit Sub
            End If
            Call SQL_Delete("tbl_customer", " id='" & customer_id & "'")

            MsgBox("Customer Successfully Deleted.", vbInformation)
            Call load_grid_sql()
            DataGridView1.Focus()
        ElseIf ask = "7" Then
            DataGridView1.Focus()
            Exit Sub
        End If
        load_grid_sql()
        DataGridView1.Focus()

        If ds.Tables(0).Rows.Count <= 0 Then
            ' DataGridView1.Rows.Clear()
        End If
    End Sub

    Private Sub DataGridView1_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles DataGridView1.CellContentClick

    End Sub

    Private Sub DataGridView1_MouseDoubleClick(ByVal sender As Object, ByVal e As System.Windows.Forms.MouseEventArgs) Handles DataGridView1.MouseDoubleClick
        Call edit1()
    End Sub
End Class