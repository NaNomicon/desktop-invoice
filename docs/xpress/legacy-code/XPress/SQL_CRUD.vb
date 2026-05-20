Imports System.Data.SqlClient
Imports System.IO
Imports System.Drawing.Imaging
Imports System.Threading
Imports System.Globalization

Module SQL_CRUD
    Public display_format As String = "dd-MM-yyyy"
    Public ds As New DataSet
    Public da As SqlDataAdapter
    Public cmd As SqlCommand
    Public bmp, bmp2 As Bitmap
    Public globle_format As String = "dd-MM-yyyy"
    Public IMG1, IMG2 As Boolean
    Public Sub set_global_date_format()
        Thread.CurrentThread.CurrentCulture = New CultureInfo("en-US", True)
        Microsoft.Win32.Registry.SetValue("HKEY_CURRENT_USER\Control Panel\International", "sShortDate", globle_format)
    End Sub
    Public Function SQL_Select(ByVal table As String, Optional ByVal field As String = "*", Optional ByVal condition As String = "", Optional ByVal extra As String = "", Optional ByVal _option As String = "")
        'Dim ds As DataSet
        'Dim da As SqlDataAdapter
        Call con_sql()
        Dim q As String = ""
        q = "SELECT " & IIf(field = "", "*", field) & " From " & table & " " & IIf(condition = "", "", "WHERE " & condition & " ") & extra
        da = New SqlDataAdapter(q, con)
        ds = New DataSet()
        da.Fill(ds)
        Return ds
    End Function
    Public pic As PictureBox
    'Public Function SQL_Insert(ByVal table As String, ByVal value As String, Optional ByVal field As String = "*", Optional ByVal _option As String = "") As Integer
    '    Call con_sql()
    '    Dim ms As New MemoryStream()
    '    Dim check As Integer = 0
    '    Dim q As String = ""
    '    q = "INSERT INTO " & table & IIf(field = "", "", "(" & field & ")") & " VALUES (" & value & ") "
    '    cmd = New SqlCommand(q, con)
    '    If _option = "" Then

    '    Else
    '        Dim Picstream As MemoryStream = New MemoryStream
    '        bmp.Save(Picstream, ImageFormat.Bmp)
    '        'pic.Image.Save(ms, Picstream.Image.RawFormat)
    '        Dim data As Byte() = Picstream.GetBuffer()
    '        cmd.Parameters.Add(_option, SqlDbType.Image).Value = data
    '    End If
    '    check = cmd.ExecuteNonQuery()
    '    If check = 0 Then
    '        Return 0
    '    Else
    '        q = "SELECT SCOPE_IDENTITY() AS Expr1"
    '        Dim last_ID As String
    '        da = New SqlDataAdapter(q, con)
    '        ds = New DataSet()
    '        da.Fill(ds)

    '        last_ID = Val(ds.Tables(0).Rows(0).Item(0).ToString)
    '        Return last_ID
    '    End If
    'End Function
    Public Function SQL_Insert(ByVal table As String, ByVal variable As Dictionary(Of String, String), Optional ByVal _option As String = "", Optional ByVal _option2 As String = "") As Integer
        Call con_sql()
        Dim ms As New MemoryStream()
        Dim check As Integer = 0
        Dim key, value, all As String
        For Each i In variable
            key = key & "," & i.Key
            value = value & "," & i.Value
        Next
        Dim k, j As String
        k = key.Substring(1, key.Length - 1)
        j = value.Substring(1, value.Length - 1)
        all = " (" & k & ") values (" & j & ")"
        Dim q As String = ""
        'q = "INSERT INTO " & table & IIf(field = "", "", "(" & field & ")") & " VALUES (" & value & ") "
        q = "INSERT INTO " & table & all
        cmd = New SqlCommand(q, con)
        If _option = "" Then

        Else
            Dim Picstream As MemoryStream = New MemoryStream
            bmp.Save(Picstream, ImageFormat.Bmp)
            'pic.Image.Save(ms, Picstream.Image.RawFormat)
            Dim data As Byte() = Picstream.GetBuffer()
            cmd.Parameters.Add(_option, SqlDbType.Image).Value = data
        End If
        If _option2 = "" Then

        Else
            Dim Picstream As MemoryStream = New MemoryStream
            bmp2.Save(Picstream, ImageFormat.Bmp)
            'pic.Image.Save(ms, Picstream.Image.RawFormat)
            Dim data As Byte() = Picstream.GetBuffer()
            cmd.Parameters.Add(_option2, SqlDbType.Image).Value = data
        End If
        check = cmd.ExecuteNonQuery()
        If check = 0 Then
            Return 0
        Else
            q = "SELECT SCOPE_IDENTITY() AS Expr1"
            Dim last_ID As String
            da = New SqlDataAdapter(q, con)
            ds = New DataSet()
            da.Fill(ds)

            last_ID = Val(ds.Tables(0).Rows(0).Item(0).ToString)
            Return last_ID
        End If
    End Function

    'Public Function SQL_Update(ByVal table As String, ByVal fieldvalue As String, ByVal condition As String, Optional ByVal _option As String = "", Optional ByVal extra As String = "") As Integer
    '    Call con_sql()
    '    Dim check As Integer = 0
    '    Dim q As String = ""
    '    q = "UPDATE " & table & " SET " & fieldvalue & " WHERE " & condition & ""
    '    cmd = New SqlCommand(q, con)
    '    If _option = "" Then

    '    Else
    '        Dim Picstream As MemoryStream = New MemoryStream
    '        bmp.Save(Picstream, ImageFormat.Bmp)
    '        'pic.Image.Save(ms, Picstream.Image.RawFormat)
    '        Dim data As Byte() = Picstream.GetBuffer()
    '        cmd.Parameters.Add(_option, SqlDbType.Image).Value = data
    '    End If
    '    check = cmd.ExecuteNonQuery()
    '    If check = 0 Then
    '        Return 0
    '    Else
    '        Return check
    '    End If
    'End Function
    Public Function SQL_Update(ByVal table As String, ByVal variable As Dictionary(Of String, String), ByVal condition As String, Optional ByVal _option As String = "", Optional ByVal _option2 As String = "", Optional ByVal extra As String = "") As Integer
        Call con_sql()
        Dim check As Integer = 0
        Dim key, value, all As String
        For Each i In variable
            value = value & "," & i.Key & "=" & i.Value
            'value = value & "," & i.Value
        Next
        If value = Nothing Then Exit Function
        all = value.Substring(1, value.Length - 1)

        Dim q As String = ""
        q = "UPDATE " & table & " SET " & all & " WHERE " & condition & ""
        cmd = New SqlCommand(q, con)
        If _option = "" Then

        Else
            Dim Picstream As MemoryStream = New MemoryStream
            bmp.Save(Picstream, ImageFormat.Bmp)
            'pic.Image.Save(ms, Picstream.Image.RawFormat)
            Dim data As Byte() = Picstream.GetBuffer()
            cmd.Parameters.Add(_option, SqlDbType.Image).Value = data
        End If
        If _option2 = "" Then

        Else
            Dim Picstream As MemoryStream = New MemoryStream
            bmp2.Save(Picstream, ImageFormat.Bmp)
            'pic.Image.Save(ms, Picstream.Image.RawFormat)
            Dim data As Byte() = Picstream.GetBuffer()
            cmd.Parameters.Add(_option2, SqlDbType.Image).Value = data
        End If
        check = cmd.ExecuteNonQuery()
        If check = 0 Then
            Return 0
        Else
            Return check
        End If
    End Function

    Public Function SQL_Delete(ByVal table As String, ByVal condition As String, Optional ByVal _option As String = "") As Integer
        Call con_sql()
        Dim check As Integer = 0
        Dim q As String = ""
        q = "Delete From " & table & " WHERE " & condition & ""
        cmd = New SqlCommand(q, con)
        check = cmd.ExecuteNonQuery()
        If check = 0 Then
            Return 0
        Else
            Return check
        End If
    End Function

    Public Function SQL_Query(ByVal query As String, Optional ByVal _option As String = "") As DataSet
        'Dim ds As DataSet
        'Dim da As SqlDataAdapter
        Call con_sql()
        da = New SqlDataAdapter(query & " " & _option, con)
        ds = New DataSet()
        da.Fill(ds)
        Return ds
    End Function

    Public Function SQL_GETROW(ByVal table As String, Optional ByVal field As String = "*", Optional ByVal condition As String = "", Optional ByVal extra As String = "", Optional ByVal _option As String = "")
        Return SQL_Select(table, field, condition, extra, _option)
    End Function

    Public Function SQL_GETVALUE(ByVal table As String, ByVal field As String, Optional ByVal condition As String = "", Optional ByVal extra As String = "", Optional ByVal _option As String = "")
        Return SQL_GETROW(table, field, condition, extra, _option)
    End Function

    Public Function isamount(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs)
        e.Handled = Not (Char.IsDigit(e.KeyChar) Or e.KeyChar = "." Or e.KeyChar = ControlChars.Back)
        Return 0
    End Function

    Public Function isdigit(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs)
        e.Handled = Not (Char.IsDigit(e.KeyChar) Or e.KeyChar = ControlChars.Back)
        Return 0
    End Function

    Function isemail(ByVal s As String) As Boolean
        Try
            Dim a As New System.Net.Mail.MailAddress(s)
        Catch
            MsgBox("Please Enter Valid E-Mail Address", vbCritical, "WARNING")
        End Try
        Return True
    End Function
    Public Function get_max_number(ByVal field_nm As String, ByVal tbl_nm As String) As Integer
        Dim da1 As New SqlDataAdapter
        Dim ds1 As New DataSet
        Dim a As String
        Dim number As Integer

        Call con_sql()
        a = "select max(" & field_nm & ") from " & tbl_nm & ""
        da1 = New SqlDataAdapter(a, con)
        ds1 = New DataSet()
        da1.Fill(ds1)

        If ds1.Tables(0).Rows.Count > 0 Then
            If Val(ds1.Tables(0).Rows(0).ItemArray(0).ToString) = 0 Then
                number = 0
            Else
                number = Val(ds1.Tables(0).Rows(0).ItemArray(0).ToString)
            End If
        End If
        Return number
    End Function
    Public Function GetAllControls(ByVal control As Control) As IEnumerable(Of Control)
        Dim controls = control.Controls.Cast(Of Control)()
        Return controls.SelectMany(Function(ctrl) GetAllControls(ctrl)).Concat(controls)
    End Function
    
    Public Function get_single_value(ByVal get_field_nm As String, ByVal tbl_nm As String, ByVal check_field As String, ByVal val1 As String) As String
        Dim da1 As New SqlDataAdapter
        Dim ds1 As New DataSet
        Dim a As String
        Dim return_val As String

        Call con_sql()
        a = "select " & get_field_nm & " from " & tbl_nm & " where " & check_field & "='" & val1.Replace("'", "''") & "'"
        da1 = New SqlDataAdapter(a, con)
        ds1 = New DataSet()
        da1.Fill(ds1)

        If ds1.Tables(0).Rows.Count > 0 Then
            return_val = ds1.Tables(0).Rows(0).ItemArray(0).ToString
        Else
            return_val = ""
        End If
        Return return_val
    End Function

    Public Function get_single_value_two_condition(ByVal get_field_nm As String, ByVal tbl_nm As String, ByVal check_field As String, ByVal check_field1 As String, ByVal val1 As String, ByVal val2 As String) As String
        Dim da1 As New SqlDataAdapter
        Dim ds1 As New DataSet
        Dim a As String
        Dim return_val As String

        Call con_sql()
        a = "select " & get_field_nm & " from " & tbl_nm & " where " & check_field & "='" & val1 & "' and " & check_field1 & "='" & val2 & "'"
        da1 = New SqlDataAdapter(a, con)
        ds1 = New DataSet()
        da1.Fill(ds1)

        If ds1.Tables(0).Rows.Count > 0 Then
            return_val = ds1.Tables(0).Rows(0).ItemArray(0).ToString
        Else
            return_val = ""
        End If
        Return return_val
    End Function
    Public Function GetDueAmount(CustomerId As Long) As Double
        Call con_sql()

        Dim query As String = "SELECT customer_id, " & _
                              "       SUM(total) AS TotalDueAmount, " & _
                              "       (SELECT SUM(r.amount_received) " & _
                              "        FROM tbl_receipt r " & _
                              "        WHERE r.customer_id = i.customer_id) AS TotalReceived, " & _
                              "       (SUM(total) - COALESCE((SELECT SUM(r.amount_received) " & _
                              "                               FROM tbl_receipt r " & _
                              "                               WHERE r.customer_id = i.customer_id), 0)) AS FinalDueAmount " & _
                              "FROM tbl_invoice_main i " & _
                              "WHERE customer_id = " & CustomerId & " " & _
                              "GROUP BY customer_id"

        Dim ds1 As DataSet = SQL_Query(query)
        If ds1.Tables(0).Rows.Count > 0 Then
            Return Format(Val(ds1.Tables(0).Rows(0).Item("FinalDueAmount").ToString), "0.00")
        Else
            Return 0
        End If
        'da = New SqlDataAdapter(query & " " & _option, con)
        'ds = New DataSet()
        'da.Fill(ds)
        'Return ds
    End Function
End Module
