# Master Module — Implementation Details

## Purpose
Document the implementation details for Company, Customer, Product Type, Product, and User management screens.

---

## Company Settings — `Add_Edit_Company`

### Purpose
Store company profile info used in report headers/footers: name, address, logo, VAT number, BRN, footer notes.

### Load
```vb
Private Sub Add_Edit_Company_Load(...)
    company_id = get_max_number("id", "tbl_company")
    If company_id > 0 Then
        Call load_data()   ' Load existing record
    End If
End Sub
```

**Key insight:** Only ONE company record exists. `company_id` always = `get_max_number("id", "tbl_company")`.

### Fields
| Field | DB Column | Purpose |
|-------|-----------|---------|
| company_name | company_name | Business name |
| address | address | Street address |
| city | city | City |
| telephone | telephone | Phone number |
| email | email | Contact email |
| facebook_url | facebook_url | Social media link |
| brn | brn | Business Registration Number |
| vat | vat | VAT number |
| currency | currency | Default currency (dropdown) |
| note1/2/3 | note1/2/3 | Invoice footer lines |
| thanks1/2 | thanks1/2 | Thank you messages |
| logo | logo | Image (BMP) |
| watermark | watermark | Image (BMP) |

### Image Handling
```vb
' Load image from DB
Dim imageData As Byte() = DirectCast(ds.Tables(0).Rows(0).Item("logo"), Byte())
If Not imageData Is Nothing Then
    Using ms As New MemoryStream(imageData, 0, imageData.Length)
        ms.Write(imageData, 0, imageData.Length)
        pic_logo.Image = Image.FromStream(ms, True)
        bmp = Image.FromStream(ms, True)
    End Using
End If

' Save image to DB
IMG1 = True   ' Flag when new image selected
variable.Add("logo", "@logo")   ' @logo triggers image param
```

### Save Logic
```vb
If company_id > 0 Then
    ' UPDATE
    SQL_Update("tbl_company", variable, "id=" & company_id, "@logo", "@logo1")
Else
    ' INSERT
    SQL_Insert("tbl_company", variable, "@logo", "@logo1")
End If
```

---

## Customer Management

### Add_Edit_Customer

#### Fields
| Field | DB Column | Validation |
|-------|-----------|------------|
| customer_name | customer_name | Required, unique |
| title_name | title_name | Mr/Mrs/Ms/Dr (dropdown) |
| customer_type | customer_type | Required (dropdown: Individual/Corporate) |
| contact | contact | Contact person name |
| telephone | telephone | Phone |
| address | address | Street address |
| email | email | Email (validated for Corporate) |
| brn | brn | Business registration |
| vat | vat | VAT number |
| reg_date | reg_date | Registration date |

#### Auto-calculated Fields (on invoice/receipt)
```sql
due_amount NUMERIC(18,2) DEFAULT 0    -- Running balance
ad_due VARCHAR(100) DEFAULT 'Advance' -- "Due"/"Advance"/""
```

#### Duplicate Check
```vb
Dim test As String = get_single_value("customer_name", "tbl_customer", 
    "customer_name", Trim(customer_name.Text.ToLower))

If customer_id > 0 Then
    ' Editing: allow same name if it's the same record
    If test <> "" And load_customer_name <> customer_name.Text Then
        MsgBox("Customer Name Is Duplicate Please Enter Different Name")
        Exit Sub
    End If
Else
    ' New: no duplicates allowed
    If test <> "" Then
        MsgBox("Customer Name Is Duplicate Please Enter Different Name")
        Exit Sub
    End If
End If
```

#### After Save
```vb
' Refresh parent forms
Call View_Customer.load_grid_sql()
Call Add_Edit_Invoice.load_customer()
Call Add_Edit_Quotation.load_customer()

' Auto-fill the calling form
id = get_max_number("id", "tbl_customer")
Add_Edit_Invoice.customer_name.Text = name
Add_Edit_Invoice.customer_id = Val(id)
Add_Edit_Invoice.ad_de = get_single_value("ad_due", "tbl_customer", "id", id)
```

#### Email Validation
```vb
Private Sub email_LostFocus(...)
    If customer_type.Text = "Corporate" Then
        Call isemail(email.Text)   ' Shows warning if invalid
    End If
End Sub
```

### View_Customer

```sql
SELECT 
    id,
    LTRIM(title_name + ' ' + customer_name) AS CustomerName,
    customer_type,
    telephone,
    email,
    contact,
    address,
    due_amount,
    ad_due
FROM tbl_customer
WHERE (customer_name LIKE '%{find}%' OR telephone LIKE '%{find}%')
ORDER BY customer_name
```

---

## Product Type Management

### tbl_product_type Schema
```sql
CREATE TABLE tbl_product_type (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    type_name VARCHAR(150)
)
```

### CRUD Operations
```vb
' Load all types (uses 3-param SQL_Select, WHERE in 3rd param):
Call SQL_Select("tbl_product_type", , " type_name like '%" & find.Text & "%'")

' Add new
SQL_Insert("tbl_product_type", {"type_name": "'Ironing'"})

' Edit (in-place)
SQL_Update("tbl_product_type", {"type_name": "'New Name'"}, "id=" & type_id)

' Delete
SQL_Delete("tbl_product_type", "id=" & type_id)
```

Note: `load_grid_sql` in View_Product_Type uses 3-param `SQL_Select` (no ORDER BY in 4th param). `Add_Edit_Product.load_items` uses 4-param `SQL_Select` with ORDER BY.

---

## Product Management

### tbl_product Schema
```sql
CREATE TABLE tbl_product (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id VARCHAR(200),    -- SKU/Code
    product_name VARCHAR(MAX), -- Display name
    type_id BIGINT,           -- FK to tbl_product_type
    price NUMERIC(18,2)       -- Default price
)
```

### Product Selection in Invoice/Quotation
```vb
' Load products by type (uses SQL_Query with raw SQL, NOT SQL_Select):
Call SQL_Query("SELECT id, product_id, product_name, price FROM tbl_product " &
               "WHERE type_id='" & Val(ids) & "' AND (product_id LIKE '%" & Trim(Text) & "%' OR product_name LIKE '%" & Trim(Text) & "%')")

' Load all products (if "All Type" checked):
Call SQL_Query("SELECT id, product_id, product_name, price FROM tbl_product " &
               "WHERE (product_id LIKE '%" & Trim(Text) & "%' OR product_name LIKE '%" & Trim(Text) & "%')")
```

Note: Actual source uses `SQL_Query` with raw SQL and direct WHERE clause, not `SQL_Select` with separate parameters.

### Pricing in Line Items
- Products have a **default price** stored in `tbl_product.price`
- When product is added to invoice/quotation, unit price = product's default price
- User can override unit price per line item (not stored back to product)
- Price is **per unit** — multiply by qty for row total

---

## User Management

### tbl_user Schema
```sql
CREATE TABLE tbl_user (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id VARCHAR(500),     -- Login name
    password VARCHAR(500),    -- Plain text (⚠️)
    des VARCHAR(500)          -- Role: "admin" or "USER"
)
```

### User Form Features
- **Add/Edit User** — Create or modify user credentials
- **Password** — Plain text storage (security issue)
- **Role** — admin (full access) / USER (restricted)

### Password Comparison
```vb
' Validation on login
Dim con_pass As String = get_single_value("password", "tbl_user", "user_id", user_id.Text)
If password.Text <> con_pass Then
    ' Invalid
End If
```

### Role Assignment
```vb
' In user management form
variable.Add("des", "'" & role.Text & "'")  ' "admin" or "USER"
```

---

## Product Type → Product Relationship

```
tbl_product_type (1) ──── (∞) tbl_product
     │
     │ type_id FK
     │
     ▼
 tbl_product.type_id
```

### Cascade Delete?
No cascade delete implemented. If product type is deleted:
- Products with that type_id remain with orphan FK
- Query may fail or return null type

**Recommendation:** Prevent deleting product type if products exist.

---

## Number Sequence Management

### tbl_numbers Schema
```sql
CREATE TABLE tbl_numbers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    invoice_no NUMERIC(18,0) DEFAULT 1,
    quo_no NUMERIC(18,0) DEFAULT 1,
    receipt_no NUMERIC(18,0) DEFAULT 1
)
```

### Auto-Increment Logic
```vb
' Read current number
invoice_no.Text = get_single_value("invoice_no", "tbl_numbers", "id", 
    get_max_number("id", "tbl_numbers"))

' After save (new record):
q = "UPDATE tbl_numbers SET invoice_no='" & Val(invoice_no.Text) + 1 & 
    "' WHERE id='" & get_max_number("id", "tbl_numbers") & "'"
cmd = New SqlCommand(q, con)
cmd.ExecuteNonQuery()
```

### Single Row
Only ONE row exists in `tbl_numbers`. All sequence counters stored together.

---

## Settings Table

### tbl_setting Schema
```sql
CREATE TABLE tbl_setting (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    isvat NUMERIC(18,0),        -- 0=No VAT, 1=Apply VAT
    vat_per NUMERIC(18,0),       -- VAT percentage (e.g., 5)
    invoice_path VARCHAR(MAX),     -- PDF save path for invoices
    quo_path VARCHAR(MAX),        -- PDF save path for quotations
    report_path VARCHAR(MAX),     -- PDF save path for reports
    invoice_days VARCHAR(100),    -- Days before edit lock
    back_path VARCHAR(MAX),       -- Backup location
    backup_path VARCHAR(MAX),      -- Backup location
    cash VARCHAR(MAX),             -- Cash label
    cheque VARCHAR(MAX),           -- Cheque label
    other VARCHAR(MAX)             -- Other payment label
)
```

### Default Values (created on first run)
```vb
Call SQL_Select("tbl_setting")
If ds.Tables(0).Rows.Count = 0 Then
    variable.Add("vat_per", "'5'")
    variable.Add("isvat", "'1'")
    Call SQL_Insert("tbl_setting", variable)
End If
```

### Usage
```vb
' VAT check
check_per_vat = get_single_value("isvat", "tbl_setting", "id", 
    get_max_number("id", "tbl_setting"))
If check_per_vat = 0 Then
    ' Hide VAT fields
ElseIf check_per_vat = 1 Then
    ' Show VAT fields
    vat_per.Text = get_single_value("vat_per", "tbl_setting", "id", ...)
End If

' Payment mode labels
cash.Text = get_single_value("cash", "tbl_setting", "id", 1)   ' "Cash"
cheque.Text = get_single_value("cheque", "tbl_setting", "id", 1) ' "Cheque"
other.Text = get_single_value("other", "tbl_setting", "id", 1)   ' "Other"
```

---

## Email Templates

### tbl_email Schema
```sql
CREATE TABLE tbl_email (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    client_email VARCHAR(500),
    sender VARCHAR(500),          -- SMTP from address
    subject VARCHAR(500),        -- Email subject
    body VARCHAR(MAX),           -- Email body with placeholders
    sender_pass VARCHAR(100),     -- SMTP password
    identify VARCHAR(100),        -- Type: INVOICE/QUOTATION/STATEMENT/RECEIPT
    sub_subject VARCHAR(MAX)       -- File attachment path(s) (MultiFileSelect TextBox, OpenFileDialog)
)
```

### Default Templates
```vb
' Created on first run:
SQL_Insert("tbl_email", {"identify": "'INVOICE'"})
SQL_Insert("tbl_email", {"identify": "'QUOTATION'"})
SQL_Insert("tbl_email", {"identify": "'STATEMENT'"})
SQL_Insert("tbl_email", {"identify": "'RECEIPT'"})
```

### Template Placeholders
```vb
' Subject line replacement:
subject = subject.Replace("invoice", "quotation")  ' For quotation emails

' Body replacement:
body = body.Replace("<date>", Format(date.Value, "dd.MM.yyyy") & ".")
body = body.Replace("<contact person>", contact_name)
body = body.Replace("invoice", "quotation")  ' For quotation emails

' sub_subject holds file attachment paths, not subject info
```

---

## Database Migration — `auto_field()`

Ensures all tables/columns exist, creates defaults if missing.

### Pattern
```vb
' Create table if not exists
q = "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES " &
    "WHERE TABLE_NAME = 'tbl_company') " &
    "BEGIN CREATE TABLE tbl_company ([ID] BIGINT IDENTITY(1,1) NOT NULL) END"
cmd = New SqlCommand(q, con)
cmd.ExecuteNonQuery()

' Add column if not exists
q = "IF COL_LENGTH('tbl_company', 'company_name') IS NULL " &
    "BEGIN ALTER TABLE tbl_company ADD [company_name] VARCHAR(MAX) END"
cmd = New SqlCommand(q, con)
cmd.ExecuteNonQuery()
```

### WHY: Manual Migration
Original app has no formal migration system. `auto_field()` runs on every login to ensure schema is current. For replication:
- Use proper migrations (EF Core migrations, Flyway, etc.)
- Version tracking table
- Up/Down scripts