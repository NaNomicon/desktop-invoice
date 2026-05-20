Imports System.Data.OleDb
Imports System.IO
Imports Microsoft.Office.Interop

Public Class View_Product

    Private Sub View_Product_Disposed(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Disposed
        last_form_close(Me)
    End Sub

    Private Sub View_Product_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles Me.KeyDown
        If e.KeyCode = Keys.Escape Then
            Me.Dispose()
            Me.Close()
        End If
    End Sub

    Private Sub View_Product_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Call set_fonr(Me, Label2)
        lblTotalRecords.Text = ""
        lblTotalRecords.Font = New Font("Franklin Gothic Medium Cond", 21.75, FontStyle.Bold)
        Call con_sql()
        Me.KeyPreview = True
        Call load_grid_sql()
    End Sub
    Public Sub load_grid_sql()
        Call grids1(DataGridView1)
        Call SQL_Query("SELECT tbl_product.id, tbl_product.product_id, tbl_product.product_name, tbl_product_type.type_name, tbl_product.price FROM tbl_product INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id", " where tbl_product.product_id like '%" & find.Text & "%' or tbl_product.product_name like '%" & find.Text & "%' or tbl_product_type.type_name like '%" & find.Text & "%' or tbl_product.price like '%" & find.Text & "%'")
        If ds.Tables(0).Rows.Count > 0 Then
            DataGridView1.DataSource = ds.Tables(0)
            With DataGridView1
                .Columns(0).Visible = False
                .Columns(1).HeaderText = "Product ID"
                .Columns(1).DisplayIndex = 4
                .Columns(2).HeaderText = "Product Name"
                .Columns(3).HeaderText = "Product Type"
                .Columns(4).HeaderText = "Price"
                .Columns(0).Width = 100
                .Columns(1).Width = 10
                .Columns(2).Width = 800
                .Columns(3).Width = 200
                .Columns(4).Width = 150
            End With
        Else
            DataGridView1.DataSource = Nothing
        End If
        lblTotalRecords.Text = "Total : " & DataGridView1.Rows.Count
    End Sub

    Private Sub Label6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Label6.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Dispose()
        Me.Close()
    End Sub

    Private Sub View_Product_Move(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Move
        Call moved(Me)
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        product_ids = 0
        Call __show(Add_Edit_Product)
        load_nav_bar("Add_Edit_Product", "Add Product")
    End Sub

    Private Sub find_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles find.TextChanged
        load_grid_sql()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Call edit1()
    End Sub
    Public Sub edit1()
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        If DataGridView1.SelectedRows(0).Cells(1).Value.ToString = "" Then
            MsgBox("No Data Selected", MsgBoxStyle.Critical)
            DataGridView1.Focus()
            Exit Sub
        End If
        product_ids = DataGridView1.SelectedRows(0).Cells(0).Value
        Call __show(Add_Edit_Product)
        load_nav_bar("Add_Edit_Product", "Edit Product")
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
            'Try
            With DataGridView2
                For i = 0 To .Rows.Count - 1
                    Dim variable As New Dictionary(Of String, String)
                    Dim unique_id, a, b, c, d1, e1, f, g As String
                    Dim type_id As Double = 0
                    a = get_single_value("type_name", "tbl_product_type", "type_name", Trim(.Rows(i).Cells(3).Value))
                    If a = "" Then
                        variable.Add("type_name", "'" & Trim(.Rows(i).Cells(3).Value) & "'")
                        Call SQL_Insert("tbl_product_type", variable)
                        variable.Clear()
                        type_id = get_single_value("id", "tbl_product_type", "type_name", Trim(.Rows(i).Cells(3).Value))
                    Else
                        type_id = get_single_value("id", "tbl_product_type", "type_name", a)
                    End If
                    unique_id = .Rows(i).Cells(0).Value.ToString
                    b = .Rows(i).Cells(1).Value
                    c = .Rows(i).Cells(2).Value.ToString.Replace("'", "''")
                    'Dim test As String = get_single_value_two_condition("product_name", "tbl_product", "product_name", "type_id", Trim(c), type_id)
                    'If test <> "" Then
                    '    GoTo nnnn
                    'End If

                    If Val(unique_id) > 0 Then
                        d1 = .Rows(i).Cells(4).Value
                        variable.Add("product_id", "'" & b.Replace("'", "''") & "'")
                        'variable.Add("product_name", "'" & c & "'") '"'" & item.Text.Replace("'", "''") & "'"
                        variable.Add("product_name", "'" & c.Replace("'", "''") & "'") '"'" & item.Text.Replace("'", "''") & "'"
                        variable.Add("type_id", "'" & type_id & "'")
                        variable.Add("price", "'" & d1 & "'")
                        'Dim d As Integer = SQL_Update("tbl_product", variable, )
                        Dim d As Integer = SQL_Update("tbl_product", variable, " id='" & Val(unique_id) & "'")
                    Else
                        d1 = .Rows(i).Cells(4).Value
                        variable.Add("product_id", "'" & b.Replace("'", "''") & "'")
                        'variable.Add("product_name", "'" & c & "'") '"'" & item.Text.Replace("'", "''") & "'"
                        variable.Add("product_name", "'" & c.Replace("'", "''") & "'") '"'" & item.Text.Replace("'", "''") & "'"
                        variable.Add("type_id", "'" & type_id & "'")
                        variable.Add("price", "'" & d1 & "'")
                        Dim d As Integer = SQL_Insert("tbl_product", variable)
                    End If
nnnn:
                Next

            End With
            'Catch ex As Exception
            '    Timer1.Start()
            '    MsgBox("Excel File Format Is Wrong Please Check", vbCritical, "WARNING")
            'End Try
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
            ProgressBar1.Value = 0
        End If
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If DataGridView1.Rows.Count = 0 Then
            MsgBox("No User Selected", MsgBoxStyle.Critical)
            Exit Sub
        End If

        product_ids = DataGridView1.SelectedRows(0).Cells(0).Value
        ' Try
        Dim ask As String
        ask = MsgBox("Are You Sure Want to Delete Product Details?", vbQuestion + vbYesNo)
        If ask = "6" Then
            If DataGridView1.SelectedRows.Count <= 0 Then
                MsgBox("No Sales Bill Selected", MsgBoxStyle.Critical)
                DataGridView1.Focus()
                Exit Sub
            End If
            Dim temp As String = get_single_value("id", "tbl_invoice_sub", "product_id", product_ids)
            If temp <> "" Then
                MsgBox("This Product In Use You Can Not Delete", vbCritical, "WARNING")
                Exit Sub
            End If
            Dim temp1 As String = get_single_value("id", "tbl_quotation_sub", "product_id", product_ids)
            If temp1 <> "" Then
                MsgBox("This Product In Use You Can Not Delete", vbCritical, "WARNING")
                Exit Sub
            End If
            Call SQL_Delete("tbl_product", " id='" & product_ids & "'")

            MsgBox("Product Successfully Deleted.", vbInformation)
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

        xlWorkSheet.Cells(1, 1) = "Unique ID"
        xlWorkSheet.Cells(1, 2) = "Product ID"
        xlWorkSheet.Cells(1, 3) = "Product Name"
        xlWorkSheet.Cells(1, 4) = "Type"
        xlWorkSheet.Cells(1, 5) = "Price"

        Dim z As Integer
        Dim j As Integer

        z = 2
        Call SQL_Query("SELECT tbl_product.id, tbl_product.product_id, tbl_product.product_name, tbl_product_type.type_name, tbl_product.price FROM tbl_product INNER JOIN tbl_product_type ON tbl_product.type_id = tbl_product_type.id", " where tbl_product.product_id like '%" & find.Text & "%' or tbl_product.product_name like '%" & find.Text & "%' or tbl_product_type.type_name like '%" & find.Text & "%' or tbl_product.price like '%" & find.Text & "%'")
        If ds.Tables(0).Rows.Count > 0 Then
            With ds.Tables(0)
                For j = 0 To .Rows.Count - 1
                    xlWorkSheet.Cells(z, 1) = .Rows(j).ItemArray(0).ToString
                    xlWorkSheet.Cells(z, 2) = .Rows(j).ItemArray(1).ToString
                    xlWorkSheet.Cells(z, 3) = .Rows(j).ItemArray(2).ToString
                    xlWorkSheet.Cells(z, 4) = .Rows(j).ItemArray(3).ToString
                    xlWorkSheet.Cells(z, 5) = .Rows(j).ItemArray(4).ToString
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
End Class