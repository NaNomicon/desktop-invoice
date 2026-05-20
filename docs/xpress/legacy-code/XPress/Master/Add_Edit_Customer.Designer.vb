<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class Add_Edit_Customer
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
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
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.Panel2 = New System.Windows.Forms.Panel()
        Me.brn = New System.Windows.Forms.TextBox()
        Me.vat = New System.Windows.Forms.TextBox()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.reg_date = New System.Windows.Forms.DateTimePicker()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.title_name = New System.Windows.Forms.ComboBox()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.customer_type = New System.Windows.Forms.ComboBox()
        Me.contact = New System.Windows.Forms.TextBox()
        Me.address = New System.Windows.Forms.TextBox()
        Me.email = New System.Windows.Forms.TextBox()
        Me.telephone = New System.Windows.Forms.TextBox()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.customer_name = New System.Windows.Forms.TextBox()
        Me.Panel1 = New System.Windows.Forms.Panel()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.Label12 = New System.Windows.Forms.Label()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.PictureBox1 = New System.Windows.Forms.PictureBox()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label16 = New System.Windows.Forms.Label()
        Me.Label18 = New System.Windows.Forms.Label()
        Me.Label10 = New System.Windows.Forms.Label()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.Panel2.SuspendLayout()
        Me.Panel1.SuspendLayout()
        CType(Me.PictureBox1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Panel2
        '
        Me.Panel2.AutoScroll = True
        Me.Panel2.BackColor = System.Drawing.Color.White
        Me.Panel2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.Panel2.Controls.Add(Me.brn)
        Me.Panel2.Controls.Add(Me.vat)
        Me.Panel2.Controls.Add(Me.Label9)
        Me.Panel2.Controls.Add(Me.reg_date)
        Me.Panel2.Controls.Add(Me.Label8)
        Me.Panel2.Controls.Add(Me.title_name)
        Me.Panel2.Controls.Add(Me.Label6)
        Me.Panel2.Controls.Add(Me.customer_type)
        Me.Panel2.Controls.Add(Me.contact)
        Me.Panel2.Controls.Add(Me.address)
        Me.Panel2.Controls.Add(Me.email)
        Me.Panel2.Controls.Add(Me.telephone)
        Me.Panel2.Controls.Add(Me.Label5)
        Me.Panel2.Controls.Add(Me.Button2)
        Me.Panel2.Controls.Add(Me.Button1)
        Me.Panel2.Controls.Add(Me.Label1)
        Me.Panel2.Controls.Add(Me.customer_name)
        Me.Panel2.Dock = System.Windows.Forms.DockStyle.Fill
        Me.Panel2.Location = New System.Drawing.Point(224, 0)
        Me.Panel2.Name = "Panel2"
        Me.Panel2.Size = New System.Drawing.Size(840, 618)
        Me.Panel2.TabIndex = 10
        '
        'brn
        '
        Me.brn.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.brn.Location = New System.Drawing.Point(7, 197)
        Me.brn.Name = "brn"
        Me.brn.Size = New System.Drawing.Size(350, 28)
        Me.brn.TabIndex = 7
        '
        'vat
        '
        Me.vat.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.vat.Location = New System.Drawing.Point(7, 232)
        Me.vat.Name = "vat"
        Me.vat.Size = New System.Drawing.Size(350, 28)
        Me.vat.TabIndex = 8
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label9.ForeColor = System.Drawing.Color.DimGray
        Me.Label9.Location = New System.Drawing.Point(145, 31)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(80, 21)
        Me.Label9.TabIndex = 173
        Me.Label9.Text = "Reg. Date"
        '
        'reg_date
        '
        Me.reg_date.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.reg_date.Format = System.Windows.Forms.DateTimePickerFormat.[Short]
        Me.reg_date.Location = New System.Drawing.Point(149, 55)
        Me.reg_date.Name = "reg_date"
        Me.reg_date.Size = New System.Drawing.Size(143, 28)
        Me.reg_date.TabIndex = 2
        '
        'Label8
        '
        Me.Label8.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label8.Image = Global.XPress.My.Resources.Resources.icons8_cancel_30
        Me.Label8.Location = New System.Drawing.Point(808, 1)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(29, 29)
        Me.Label8.TabIndex = 146
        '
        'title_name
        '
        Me.title_name.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.title_name.FormattingEnabled = True
        Me.title_name.Items.AddRange(New Object() {"Mr", "Mrs", "Miss"})
        Me.title_name.Location = New System.Drawing.Point(7, 55)
        Me.title_name.Name = "title_name"
        Me.title_name.Size = New System.Drawing.Size(136, 29)
        Me.title_name.TabIndex = 1
        '
        'Label6
        '
        Me.Label6.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label6.Image = Global.XPress.My.Resources.Resources.icons8_cancel_30
        Me.Label6.Location = New System.Drawing.Point(930, 1)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(29, 29)
        Me.Label6.TabIndex = 145
        '
        'customer_type
        '
        Me.customer_type.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.customer_type.FormattingEnabled = True
        Me.customer_type.Items.AddRange(New Object() {"Residential", "Corporate", "Ironing"})
        Me.customer_type.Location = New System.Drawing.Point(363, 91)
        Me.customer_type.Name = "customer_type"
        Me.customer_type.Size = New System.Drawing.Size(165, 29)
        Me.customer_type.TabIndex = 4
        '
        'contact
        '
        Me.contact.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.contact.Location = New System.Drawing.Point(7, 301)
        Me.contact.Name = "contact"
        Me.contact.Size = New System.Drawing.Size(350, 28)
        Me.contact.TabIndex = 10
        '
        'address
        '
        Me.address.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.address.Location = New System.Drawing.Point(7, 127)
        Me.address.Name = "address"
        Me.address.Size = New System.Drawing.Size(350, 28)
        Me.address.TabIndex = 5
        '
        'email
        '
        Me.email.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.email.Location = New System.Drawing.Point(7, 266)
        Me.email.Name = "email"
        Me.email.Size = New System.Drawing.Size(350, 28)
        Me.email.TabIndex = 9
        '
        'telephone
        '
        Me.telephone.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.telephone.Location = New System.Drawing.Point(7, 162)
        Me.telephone.Name = "telephone"
        Me.telephone.Size = New System.Drawing.Size(350, 28)
        Me.telephone.TabIndex = 6
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label5.ForeColor = System.Drawing.Color.DimGray
        Me.Label5.Location = New System.Drawing.Point(359, 65)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(116, 21)
        Me.Label5.TabIndex = 144
        Me.Label5.Text = "Customer Type"
        '
        'Button2
        '
        Me.Button2.BackColor = System.Drawing.Color.LightSkyBlue
        Me.Button2.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.Button2.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Button2.ForeColor = System.Drawing.Color.DimGray
        Me.Button2.Location = New System.Drawing.Point(183, 337)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(174, 45)
        Me.Button2.TabIndex = 31
        Me.Button2.Text = "&CANCEL"
        Me.Button2.UseVisualStyleBackColor = False
        '
        'Button1
        '
        Me.Button1.BackColor = System.Drawing.Color.LightSkyBlue
        Me.Button1.FlatStyle = System.Windows.Forms.FlatStyle.Flat
        Me.Button1.Font = New System.Drawing.Font("Calibri", 15.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Button1.ForeColor = System.Drawing.Color.DimGray
        Me.Button1.Location = New System.Drawing.Point(7, 337)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(170, 45)
        Me.Button1.TabIndex = 30
        Me.Button1.Text = "&SAVE"
        Me.Button1.UseVisualStyleBackColor = False
        '
        'Label1
        '
        Me.Label1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label1.Location = New System.Drawing.Point(916, 0)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(44, 46)
        Me.Label1.TabIndex = 142
        '
        'customer_name
        '
        Me.customer_name.Font = New System.Drawing.Font("Calibri", 12.75!)
        Me.customer_name.Location = New System.Drawing.Point(7, 92)
        Me.customer_name.Name = "customer_name"
        Me.customer_name.Size = New System.Drawing.Size(350, 28)
        Me.customer_name.TabIndex = 3
        '
        'Panel1
        '
        Me.Panel1.BackColor = System.Drawing.Color.LightSkyBlue
        Me.Panel1.BackgroundImageLayout = System.Windows.Forms.ImageLayout.Stretch
        Me.Panel1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.Panel1.Controls.Add(Me.Label11)
        Me.Panel1.Controls.Add(Me.Label12)
        Me.Panel1.Controls.Add(Me.Label7)
        Me.Panel1.Controls.Add(Me.PictureBox1)
        Me.Panel1.Controls.Add(Me.Label4)
        Me.Panel1.Controls.Add(Me.Label16)
        Me.Panel1.Controls.Add(Me.Label18)
        Me.Panel1.Controls.Add(Me.Label10)
        Me.Panel1.Controls.Add(Me.Label2)
        Me.Panel1.Controls.Add(Me.Label3)
        Me.Panel1.Dock = System.Windows.Forms.DockStyle.Left
        Me.Panel1.Location = New System.Drawing.Point(0, 0)
        Me.Panel1.Name = "Panel1"
        Me.Panel1.Size = New System.Drawing.Size(224, 618)
        Me.Panel1.TabIndex = 11
        '
        'Label11
        '
        Me.Label11.AutoSize = True
        Me.Label11.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label11.ForeColor = System.Drawing.Color.DimGray
        Me.Label11.Location = New System.Drawing.Point(179, 234)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(36, 21)
        Me.Label11.TabIndex = 174
        Me.Label11.Text = "VAT"
        '
        'Label12
        '
        Me.Label12.AutoSize = True
        Me.Label12.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label12.ForeColor = System.Drawing.Color.DimGray
        Me.Label12.Location = New System.Drawing.Point(174, 199)
        Me.Label12.Name = "Label12"
        Me.Label12.Size = New System.Drawing.Size(41, 21)
        Me.Label12.TabIndex = 173
        Me.Label12.Text = "BRN"
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label7.ForeColor = System.Drawing.Color.DimGray
        Me.Label7.Location = New System.Drawing.Point(174, 59)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(41, 21)
        Me.Label7.TabIndex = 172
        Me.Label7.Text = "Title"
        '
        'PictureBox1
        '
        Me.PictureBox1.Dock = System.Windows.Forms.DockStyle.Bottom
        Me.PictureBox1.Image = Global.XPress.My.Resources.Resources.Profile_pic_logo_png
        Me.PictureBox1.Location = New System.Drawing.Point(0, 385)
        Me.PictureBox1.Name = "PictureBox1"
        Me.PictureBox1.Size = New System.Drawing.Size(222, 231)
        Me.PictureBox1.SizeMode = System.Windows.Forms.PictureBoxSizeMode.Zoom
        Me.PictureBox1.TabIndex = 171
        Me.PictureBox1.TabStop = False
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label4.ForeColor = System.Drawing.Color.DimGray
        Me.Label4.Location = New System.Drawing.Point(98, 303)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(117, 21)
        Me.Label4.TabIndex = 170
        Me.Label4.Text = "Contact Person"
        '
        'Label16
        '
        Me.Label16.AutoSize = True
        Me.Label16.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label16.ForeColor = System.Drawing.Color.DimGray
        Me.Label16.Location = New System.Drawing.Point(100, 269)
        Me.Label16.Name = "Label16"
        Me.Label16.Size = New System.Drawing.Size(115, 21)
        Me.Label16.TabIndex = 152
        Me.Label16.Text = "E-Mail Address"
        '
        'Label18
        '
        Me.Label18.AutoSize = True
        Me.Label18.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label18.ForeColor = System.Drawing.Color.DimGray
        Me.Label18.Location = New System.Drawing.Point(148, 130)
        Me.Label18.Name = "Label18"
        Me.Label18.Size = New System.Drawing.Size(67, 21)
        Me.Label18.TabIndex = 150
        Me.Label18.Text = "Address"
        '
        'Label10
        '
        Me.Label10.AutoSize = True
        Me.Label10.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label10.ForeColor = System.Drawing.Color.DimGray
        Me.Label10.Location = New System.Drawing.Point(131, 165)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(84, 21)
        Me.Label10.TabIndex = 146
        Me.Label10.Text = "Telephone"
        '
        'Label2
        '
        Me.Label2.BackColor = System.Drawing.Color.Transparent
        Me.Label2.Font = New System.Drawing.Font("Franklin Gothic Medium Cond", 21.75!)
        Me.Label2.ForeColor = System.Drawing.Color.DimGray
        Me.Label2.Location = New System.Drawing.Point(0, -4)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(224, 50)
        Me.Label2.TabIndex = 2
        Me.Label2.Text = "Add New Customer"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Font = New System.Drawing.Font("Calibri", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label3.ForeColor = System.Drawing.Color.DimGray
        Me.Label3.Location = New System.Drawing.Point(90, 95)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(125, 21)
        Me.Label3.TabIndex = 142
        Me.Label3.Text = "Customer Name"
        '
        'Add_Edit_Customer
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(1064, 618)
        Me.Controls.Add(Me.Panel2)
        Me.Controls.Add(Me.Panel1)
        Me.Name = "Add_Edit_Customer"
        Me.Panel2.ResumeLayout(False)
        Me.Panel2.PerformLayout()
        Me.Panel1.ResumeLayout(False)
        Me.Panel1.PerformLayout()
        CType(Me.PictureBox1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents Panel2 As System.Windows.Forms.Panel
    Friend WithEvents contact As System.Windows.Forms.TextBox
    Friend WithEvents address As System.Windows.Forms.TextBox
    Friend WithEvents email As System.Windows.Forms.TextBox
    Friend WithEvents telephone As System.Windows.Forms.TextBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents customer_name As System.Windows.Forms.TextBox
    Friend WithEvents Panel1 As System.Windows.Forms.Panel
    Friend WithEvents PictureBox1 As System.Windows.Forms.PictureBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label16 As System.Windows.Forms.Label
    Friend WithEvents Label18 As System.Windows.Forms.Label
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents customer_type As System.Windows.Forms.ComboBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents title_name As System.Windows.Forms.ComboBox
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents reg_date As System.Windows.Forms.DateTimePicker
    Friend WithEvents brn As System.Windows.Forms.TextBox
    Friend WithEvents vat As System.Windows.Forms.TextBox
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents Label12 As System.Windows.Forms.Label
End Class
