<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class ListOutStanding
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()>
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Me.BtnReceiptVoucher = New System.Windows.Forms.Button()
        Me.Panel1 = New System.Windows.Forms.Panel()
        Me.BtnViewPDF = New System.Windows.Forms.Button()
        Me.BtnNewReceipt = New System.Windows.Forms.Button()
        Me.BtnPrint = New System.Windows.Forms.Button()
        Me.BtnCancel = New System.Windows.Forms.Button()
        Me.PictureBox1 = New System.Windows.Forms.PictureBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.DataGridView1 = New System.Windows.Forms.DataGridView()
        Me.Panel2 = New System.Windows.Forms.Panel()
        Me.BtnExport = New System.Windows.Forms.Button()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.find = New System.Windows.Forms.TextBox()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.Panel1.SuspendLayout()
        CType(Me.PictureBox1, System.ComponentModel.ISupportInitialize).BeginInit()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.Panel2.SuspendLayout()
        Me.SuspendLayout()
        '
        'BtnReceiptVoucher
        '
        Me.BtnReceiptVoucher.BackColor = System.Drawing.Color.DimGray
        Me.BtnReceiptVoucher.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.BtnReceiptVoucher.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.BtnReceiptVoucher.ForeColor = System.Drawing.Color.LightSkyBlue
        Me.BtnReceiptVoucher.Location = New System.Drawing.Point(9, 100)
        Me.BtnReceiptVoucher.Name = "BtnReceiptVoucher"
        Me.BtnReceiptVoucher.Size = New System.Drawing.Size(206, 45)
        Me.BtnReceiptVoucher.TabIndex = 3
        Me.BtnReceiptVoucher.Text = "&RECEIPT VOUCHER"
        Me.BtnReceiptVoucher.UseVisualStyleBackColor = False
        '
        'Panel1
        '
        Me.Panel1.BackColor = System.Drawing.Color.LightSkyBlue
        Me.Panel1.BackgroundImageLayout = System.Windows.Forms.ImageLayout.Stretch
        Me.Panel1.Controls.Add(Me.BtnViewPDF)
        Me.Panel1.Controls.Add(Me.BtnNewReceipt)
        Me.Panel1.Controls.Add(Me.BtnPrint)
        Me.Panel1.Controls.Add(Me.BtnReceiptVoucher)
        Me.Panel1.Controls.Add(Me.BtnCancel)
        Me.Panel1.Controls.Add(Me.PictureBox1)
        Me.Panel1.Controls.Add(Me.Label2)
        Me.Panel1.Dock = System.Windows.Forms.DockStyle.Left
        Me.Panel1.Location = New System.Drawing.Point(0, 0)
        Me.Panel1.Name = "Panel1"
        Me.Panel1.Size = New System.Drawing.Size(224, 739)
        Me.Panel1.TabIndex = 11
        '
        'BtnViewPDF
        '
        Me.BtnViewPDF.BackColor = System.Drawing.Color.DimGray
        Me.BtnViewPDF.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.BtnViewPDF.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.BtnViewPDF.ForeColor = System.Drawing.Color.LightSkyBlue
        Me.BtnViewPDF.Location = New System.Drawing.Point(9, 202)
        Me.BtnViewPDF.Name = "BtnViewPDF"
        Me.BtnViewPDF.Size = New System.Drawing.Size(206, 45)
        Me.BtnViewPDF.TabIndex = 5
        Me.BtnViewPDF.Text = "&VIEW PDF"
        Me.BtnViewPDF.UseVisualStyleBackColor = False
        '
        'BtnNewReceipt
        '
        Me.BtnNewReceipt.BackColor = System.Drawing.Color.DimGray
        Me.BtnNewReceipt.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.BtnNewReceipt.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.BtnNewReceipt.ForeColor = System.Drawing.Color.LightSkyBlue
        Me.BtnNewReceipt.Location = New System.Drawing.Point(9, 49)
        Me.BtnNewReceipt.Name = "BtnNewReceipt"
        Me.BtnNewReceipt.Size = New System.Drawing.Size(206, 45)
        Me.BtnNewReceipt.TabIndex = 2
        Me.BtnNewReceipt.Text = "&NEW RECEIPT"
        Me.BtnNewReceipt.UseVisualStyleBackColor = False
        '
        'BtnPrint
        '
        Me.BtnPrint.BackColor = System.Drawing.Color.DimGray
        Me.BtnPrint.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.BtnPrint.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.BtnPrint.ForeColor = System.Drawing.Color.LightSkyBlue
        Me.BtnPrint.Location = New System.Drawing.Point(9, 151)
        Me.BtnPrint.Name = "BtnPrint"
        Me.BtnPrint.Size = New System.Drawing.Size(206, 45)
        Me.BtnPrint.TabIndex = 4
        Me.BtnPrint.Text = "&PRINT"
        Me.BtnPrint.UseVisualStyleBackColor = False
        '
        'BtnCancel
        '
        Me.BtnCancel.BackColor = System.Drawing.Color.DimGray
        Me.BtnCancel.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.BtnCancel.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.BtnCancel.ForeColor = System.Drawing.Color.LightSkyBlue
        Me.BtnCancel.Location = New System.Drawing.Point(9, 253)
        Me.BtnCancel.Name = "BtnCancel"
        Me.BtnCancel.Size = New System.Drawing.Size(206, 45)
        Me.BtnCancel.TabIndex = 6
        Me.BtnCancel.Text = "&CANCEL"
        Me.BtnCancel.UseVisualStyleBackColor = False
        '
        'PictureBox1
        '
        Me.PictureBox1.Dock = System.Windows.Forms.DockStyle.Bottom
        Me.PictureBox1.Image = Global.XPress.My.Resources.Resources.Profile_pic_logo_png
        Me.PictureBox1.Location = New System.Drawing.Point(0, 508)
        Me.PictureBox1.Name = "PictureBox1"
        Me.PictureBox1.Size = New System.Drawing.Size(224, 231)
        Me.PictureBox1.SizeMode = System.Windows.Forms.PictureBoxSizeMode.Zoom
        Me.PictureBox1.TabIndex = 171
        Me.PictureBox1.TabStop = False
        '
        'Label2
        '
        Me.Label2.BackColor = System.Drawing.Color.Transparent
        Me.Label2.Font = New System.Drawing.Font("Microsoft Sans Serif", 21.75!)
        Me.Label2.ForeColor = System.Drawing.Color.DimGray
        Me.Label2.Location = New System.Drawing.Point(0, -4)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(224, 50)
        Me.Label2.TabIndex = 2
        Me.Label2.Text = "Outstanding"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'DataGridView1
        '
        Me.DataGridView1.AllowUserToAddRows = False
        Me.DataGridView1.AllowUserToDeleteRows = False
        Me.DataGridView1.CellBorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.RaisedVertical
        Me.DataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.DataGridView1.Dock = System.Windows.Forms.DockStyle.Fill
        Me.DataGridView1.Location = New System.Drawing.Point(224, 35)
        Me.DataGridView1.Name = "DataGridView1"
        Me.DataGridView1.ReadOnly = True
        Me.DataGridView1.RowHeadersBorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.[Single]
        Me.DataGridView1.Size = New System.Drawing.Size(1253, 704)
        Me.DataGridView1.TabIndex = 13
        '
        'Panel2
        '
        Me.Panel2.BackColor = System.Drawing.Color.LightSkyBlue
        Me.Panel2.Controls.Add(Me.BtnExport)
        Me.Panel2.Controls.Add(Me.Label6)
        Me.Panel2.Controls.Add(Me.find)
        Me.Panel2.Controls.Add(Me.Label7)
        Me.Panel2.Dock = System.Windows.Forms.DockStyle.Top
        Me.Panel2.Location = New System.Drawing.Point(224, 0)
        Me.Panel2.Name = "Panel2"
        Me.Panel2.Size = New System.Drawing.Size(1253, 35)
        Me.Panel2.TabIndex = 14
        '
        'BtnExport
        '
        Me.BtnExport.BackColor = System.Drawing.Color.White
        Me.BtnExport.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.BtnExport.Font = New System.Drawing.Font("Calibri", 11.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.BtnExport.ForeColor = System.Drawing.Color.Green
        Me.BtnExport.Image = Global.XPress.My.Resources.Resources.icons8_microsoft_excel_25
        Me.BtnExport.ImageAlign = System.Drawing.ContentAlignment.MiddleLeft
        Me.BtnExport.Location = New System.Drawing.Point(0, 3)
        Me.BtnExport.Name = "BtnExport"
        Me.BtnExport.Size = New System.Drawing.Size(86, 29)
        Me.BtnExport.TabIndex = 8
        Me.BtnExport.Text = "&Export"
        Me.BtnExport.TextAlign = System.Drawing.ContentAlignment.MiddleRight
        Me.BtnExport.UseVisualStyleBackColor = False
        '
        'Label6
        '
        Me.Label6.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label6.Image = Global.XPress.My.Resources.Resources.icons8_cancel_30
        Me.Label6.Location = New System.Drawing.Point(1220, 2)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(29, 29)
        Me.Label6.TabIndex = 146
        '
        'find
        '
        Me.find.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.find.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.find.Location = New System.Drawing.Point(937, 3)
        Me.find.Name = "find"
        Me.find.Size = New System.Drawing.Size(281, 28)
        Me.find.TabIndex = 9
        '
        'Label7
        '
        Me.Label7.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label7.AutoSize = True
        Me.Label7.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label7.ForeColor = System.Drawing.Color.DimGray
        Me.Label7.Location = New System.Drawing.Point(887, 6)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(47, 21)
        Me.Label7.TabIndex = 175
        Me.Label7.Text = "Filter"
        '
        'ListOutStanding
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(1477, 739)
        Me.Controls.Add(Me.DataGridView1)
        Me.Controls.Add(Me.Panel2)
        Me.Controls.Add(Me.Panel1)
        Me.Name = "ListOutStanding"
        Me.Text = "OutStanding"
        Me.Panel1.ResumeLayout(False)
        CType(Me.PictureBox1, System.ComponentModel.ISupportInitialize).EndInit()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.Panel2.ResumeLayout(False)
        Me.Panel2.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

    Friend WithEvents BtnReceiptVoucher As Button
    Friend WithEvents Panel1 As Panel
    Friend WithEvents BtnViewPDF As Button
    Friend WithEvents BtnNewReceipt As Button
    Friend WithEvents BtnPrint As Button
    Friend WithEvents BtnCancel As Button
    Friend WithEvents PictureBox1 As PictureBox
    Friend WithEvents Label2 As Label
    Friend WithEvents DataGridView1 As DataGridView
    Friend WithEvents Panel2 As Panel
    Friend WithEvents BtnExport As Button
    Friend WithEvents Label6 As Label
    Friend WithEvents find As TextBox
    Friend WithEvents Label7 As Label
End Class
