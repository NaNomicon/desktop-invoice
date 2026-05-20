# Module1 & SQL_CRUD: Shared Utilities Reference

**Source Files:**
- `docs/xpress/legacy-code/XPress/Module1.vb` (835 lines)
- `docs/xpress/legacy-code/XPress/SQL_CRUD.vb` (332 lines)

---

## Overview

These two modules contain the global utilities, state management, and database operations used across the entire XPress application. They form the foundation layer.

---

## Module1.vb: Global State & UI Utilities

### Global Variables (Lines 5-30)

| Variable | Type | Purpose |
|----------|------|---------|
| `last_form` | `Form` | Tracks currently active form |
| `GLOBLE_INVOICE_NO` | `Double` | Current invoice number tracking |
| `new_pro_key`, `new_pro_key_quo` | `Boolean` | Product creation flags |
| `user_id_log`, `user_name` | `String` | Logged-in user identity |
| `company_id` | `Double` | Current company context |
| `user_id` | `Double` | User ID reference |
| `setting_id` | `Double` | Settings reference |
| `customer_id` | `Double` | Current customer context |
| `quotation_id` | `Double` | Current quotation context |
| `invoice_id` | `Double` | Current invoice context |
| `receipt_id` | `Double` | Current receipt context |
| `Receipt_voucher_ID` | `Double` | Receipt voucher reference for payments |
| `product_type_id`, `product_ids` | `Double` | Product context |
| `Quotation_To_Invoice_ID` | `Double` | Conversion tracking |
| `c_row`, `c_col` | `Double` | Grid position tracking |
| `report_qurty`, `sales_query`, `quotation_query`, `outstanding_query` | `String` | Report queries |
| `tot` | `Double` | Running total accumulator |
| `db_nm` | `String` | Database name (`"XPressDB"`) |
| `REPORT_CON_STRING` | `String` | Connection string for reports |
| `backup_constr` | `String` | Backup connection string |
| `print_due_amt_on_invoice` | `Boolean` | Invoice print flag |
| `load_dua_amount` | `Double` | Due amount for receipts |
| `email_id` | `Double` | Email template ID |
| `tot_time` | `String` | Epoch timestamp output |
| `is_pdf` | `Boolean` | PDF generation flag |
| `con` | `SqlConnection` | Global DB connection |
| `tot_item_length(50)`, `tot_desc_length(50)` | `Double` | Print formatting arrays |

---

### Database Connection

#### `con_sql()` (Lines 34-65)

Initializes the global `SqlConnection`. Pattern: singleton with lazy open.

**Behavior:**
1. Skip if already `ConnectionState.Open`
2. Builds connection string based on PC name
3. Sets `REPORT_CON_STRING` and `backup_constr`
4. Opens connection
5. Sets `db_nm = "XPressDB"`
6. Calls `set_global_date_format()`

**Machine-Specific Logic:**
```
If PC = "Mahesh" OR "Ankit-pc" → MAHESH\SQLEXPRESS
Else → TRUTHALWAYSTRIU\SQLEXPRESS
```

**Hardcoded Connections (Legacy Comments):**
- YASH Lappy 2014: `YASH\YASH`
- YASH Lappy 2008: `YASH\SQLEXPRESS`
- DICTIN-PC (Client 2008): `DICTIN-PC`
- DICKEN-LAPTOP (Client 2014): `DICKEN-LAPTOP\SQLEXPRESS`

---

### UI Styling Utilities

#### `fback_color(frm As Form)` (Lines 66-78)

Configures MDI child form appearance. Applied to all child forms.

| Property | Value |
|----------|-------|
| `MdiParent` | `HOME` |
| `FormBorderStyle` | `None` |
| `Location` | `0, 0` |
| `Height` | `HOME.Height - 97` |
| `Width` | `HOME.Width - 10` |
| `BackColor` | `Color.White` |

#### `grids1(grids As DataGridView)` (Lines 95-122)

Standard DataGridView configuration applied throughout the app.

| Property | Value |
|----------|-------|
| `Font` | `Franklin Gothic Book, 11pt` |
| `ColumnHeadersHeight` | `45` |
| `RowTemplate.Height` | `30` |
| `AutoSizeColumnsMode` | `Fill` |
| `RowHeadersVisible` | `False` |
| `BackgroundColor` | `Color.WhiteSmoke` |
| `AllowUserToResizeRows` | `False` |
| `AllowUserToResizeColumns` | `False` |
| `SelectionMode` | `FullRowSelect` |
| `SelectionBackColor` | `Color.LightSkyBlue` |
| `CellBorderStyle` | `Single` |

**Note:** Hides first column (typically ID).

#### `ctrl_focus(e As KeyEventArgs)` (Lines 123-125)

Enter key → Tab navigation for form fields.

```vb
If e.KeyCode = 13 Then SendKeys.Send("{TAB}")
```

#### `set_fonr(frm As Form, lbl As Label)` (Lines 581-587)

Sets form controls font and title label font.

| Element | Font |
|---------|------|
| All controls | `Franklin Gothic Book, 12.75pt` |
| Title label | `Franklin Gothic Medium Cond, 21.75pt` |

---

### Navigation Bar Management

#### `new_load_nav_bar(frm As String, name As String)` (Lines 589-632)

Creates tab buttons in `HOME.FlowLayoutPanel1` for each opened form.

**Name Transformations:**
| Original | Display |
|----------|---------|
| `Add_Edit_Company` | Company details |
| `View_Customer` | Customer List |
| `View_Product` | Product List |
| `Product_List_Type` | Product Type |
| `View_Invoice` | Invoice List |
| `View_Quotation` | Quotation List |
| `View_Add_Edit_User` | Users |
| `ListOutStanding` | Outstanding List |
| `*_email` | E-mail Config |

**Creates Two Buttons Per Form:**
1. **Main Button:** Name=frm, BackColor=`LightSkyBlue`
2. **Close Button:** Name=frm+"X", BackColor=`Red`, Image=`icons8-cancel-15.png`

#### `updateFunc(sender, e)` (Lines 659-708)

Handles tab button clicks. Logic:
- **Close button (X) clicked:**
  - Removes both buttons from FlowLayoutPanel
  - Disposes form via `RemoveForm(final)`
  - For Invoice, prompts "Are you sure you want to cancel?"
- **Main button clicked:**
  - Calls `ShowForm(b.Name)` to display/focus form

#### `active_form(frm As String)` (Lines 709-732)

Highlights the active tab button:
- Active: BackColor=`YellowGreen`, ForeColor=`White`
- Others: BackColor=`LightSkyBlue`, ForeColor=`Black`

#### `last_form_close(frm As Form)` (Lines 759-783)

Cleans up nav bar when a form closes programmatically.

---

### Form Management

#### `ShowForm(Frm As String)` (Lines 792-801)

Shows existing form or creates new one. Pattern: check if MDI child exists, if yes call `__show()`, else exit.

#### `RemoveForm(Frm As String)` (Lines 784-791)

Disposes and closes MDI child form by name.

#### `__show(frm As Form)` (Lines 85-93)

Standard form show sequence:
1. Hide if visible
2. Apply `fback_color()`
3. Apply `rights()` (button visibility)
4. `frm.Show()`

---

### Button Visibility & Rights

#### `rights(frm As Form)` (Lines 733-757)

Applied to every form via `__show()`. Controls button appearance by role:

**USER Role (`user_id_log = "USER"`):**
- Hides DELETE button

**All Users - Button Styling:**
| Button Text | BackColor | ForeColor |
|-------------|-----------|-----------|
| CREATE NEW | YellowGreen | DimGray |
| PRINT | YellowGreen | DimGray |
| DELETE | Gray | LightSkyBlue |
| SAVE, SEND, + Create New Invoice, + Create New Quotation | YellowGreen | DimGray |

#### `admin1(btn As Button)` (Lines 802-806)

Hides button if user is not admin.

```vb
If user_id_log.ToLower <> "admin" Then btn.Visible = False
```

---

### Timestamp & Date Utilities

#### `time_count()` (Lines 807-816)

Generates Unix epoch timestamp with milliseconds.

```vb
result = DateDiff("s", CDate("1970-1-1 12:00:00 AM"), Now) * 1000 + milliseconds
tot_time = result
```

**Output:** String representation of milliseconds since 1970-01-01.

#### `first_date()` (Lines 819-822)

Returns first day of current month.

```vb
Return New Date(Now.Year, Now.Month, 1)
```

---

### Report Device Configuration

#### `deviceInfo` (Lines 824-832)

EMF rendering settings for Crystal Reports.

```xml
<DeviceInfo>
  <OutputFormat>EMF</OutputFormat>
  <PageWidth></PageWidth>
  <PageHeight></PageHeight>
  <MarginTop></MarginTop>
  <MarginLeft></MarginLeft>
  <MarginRight></MarginRight>
  <MarginBottom></MarginBottom>
</DeviceInfo>
```

---

## auto_field(): Database Schema Initialization

**Location:** Lines 127-579

**Purpose:** Creates all core tables and columns if they don't exist. Runs on every app startup.

### Pattern: Conditional Table/Column Creation

```vb
' Table creation
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_xxx')
BEGIN CREATE TABLE tbl_xxx ([ID] bigint IDENTITY(1,1) NOT NULL, PRIMARY KEY (ID)) End

' Column creation
IF COL_LENGTH('tbl_xxx', 'column_name') IS NULL
BEGIN ALTER TABLE tbl_xxx ADD [column_name] datatype END
```

---

### Tables Created

#### tbl_company (Lines 130-181)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `company_name` | `varchar(MAX)` |
| `address` | `varchar(MAX)` |
| `city` | `varchar(500)` |
| `telephone` | `varchar(100)` |
| `email` | `varchar(200)` |
| `facebook_url` | `varchar(MAX)` |
| `brn` | `varchar(150)` |
| `vat` | `varchar(150)` |
| `note1`, `note2`, `note3` | `varchar(MAX)` |
| `thanks1`, `thanks2` | `varchar(MAX)` |
| `currency` | `varchar(50)` |
| `logo` | `image` |
| `watermark` | `image` |

#### tbl_customer (Lines 183-223)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `customer_name` | `varchar(MAX)` |
| `contact` | `varchar(MAX)` |
| `customer_type` | `varchar(100)` |
| `telephone` | `varchar(50)` |
| `address` | `varchar(MAX)` |
| `email` | `varchar(200)` |
| `due_amount` | `numeric(18,2)` |
| `title_name` | `varchar(50)` |
| `reg_date` | `date` |
| `ad_due` | `varchar(100)` default `'Advance'` |
| `brn` | `varchar(100)` |
| `vat` | `varchar(100)` |

#### tbl_invoice_main (Lines 224-278)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `customer_id` | `bigint` |
| `invoice_no` | `varchar(200)` |
| `checklist_no` | `varchar(200)` |
| `sub_total`, `amount_due`, `vat`, `discount`, `total` | `numeric(18,2)` |
| `per` | `numeric(18,0)` |
| `invoice_date` | `date` |
| `case_debit` | `varchar(50)` |
| `paid_amount`, `balance` | `numeric(18,2)` |
| `no`, `cr_dr`, `identify`, `print_due` | `varchar(50)`, `varchar(50)`, `varchar(50)`, `varchar(10)` |

#### tbl_quotation_main (Lines 382-415)

**Note: NOT same structure as tbl_invoice_main.** Columns present:

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `customer_id` | `bigint` |
| `quo_no` | `varchar(200)` |
| `checklist_no` | `varchar(200)` |
| `sub_total`, `amount_due`, `vat`, `discount`, `total` | `numeric(18,2)` |
| `per` | `numeric(18,0)` |
| `quo_date` | `date` |

**Missing from tbl_invoice_main (NOT in tbl_quotation_main):** `case_debit`, `paid_amount`, `balance`, `no`, `cr_dr`, `identify`, `print_due`

#### tbl_invoice_sub / tbl_quotation_sub (Lines 281-303, 417-438)

Line items for invoice/quotation documents.

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `main_id` | `bigint` |
| `qty`, `s_no` | `numeric(18,0)` |
| `product_id` | `bigint` |
| `unit_price`, `row_total` | `numeric(18,2)` |

#### tbl_receipt (Lines 440-486)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `receipt_no`, `receipt_date`, `customer_id` | various |
| `due_amount`, `amount_received`, `balance` | `numeric(18,2)` |
| `cheque_no`, `no`, `cr_dr`, `invoice_no`, `pre_load` | various |
| `cash`, `cheque`, `other` | `varchar(100)` default `0` |

#### tbl_product (Lines 319-335)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `product_id` | `varchar(200)` |
| `product_name` | `varchar(MAX)` |
| `type_id` | `bigint` |
| `price` | `numeric(18,2)` |

#### tbl_product_type (Lines 336-342)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `type_name` | `varchar(150)` |

#### tbl_setting (Lines 344-380)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `isvat`, `vat_per` | `numeric(18,0)` |
| `invoice_path`, `quo_path`, `report_path`, `backup_path` | `varchar(MAX)` |
| `invoice_days`, `back_path` | various |
| `cash`, `cheque`, `other` | `varchar(MAX)` |

#### tbl_numbers (Lines 305-317)

Sequential counters for document numbers.

| Column | Type | Default |
|--------|------|---------|
| `ID` | `bigint IDENTITY(1,1)` | - |
| `invoice_no` | `numeric(18,0)` | `1` |
| `quo_no` | `numeric(18,0)` | `1` |
| `receipt_no` | `numeric(18,0)` | `1` |

#### tbl_user (Lines 487-499)

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `user_id` | `varchar(500)` |
| `password` | `varchar(500)` |
| `des` | `varchar(500)` |

#### tbl_email (Lines 501-526)

Email template configuration.

| Column | Type |
|--------|------|
| `ID` | `bigint IDENTITY(1,1)` |
| `client_email`, `sender`, `subject`, `body` | `varchar(500)` or `MAX` |
| `sender_pass` | `varchar(100)` |
| `identify` | `varchar(100)` (INVOICE, QUOTATION, STATEMENT, RECEIPT) |
| `sub_subject` | `varchar(MAX)` |

---

### Default Data Initialization (Lines 527-577)

After table creation, if tables are empty, seed defaults:

| Table | Initial Data |
|-------|--------------|
| `tbl_numbers` | invoice_no=`'0'` |
| `tbl_setting` | vat_per=`'5'`, isvat=`'1'` |
| `tbl_user` | user_id=`'ADMIN'`, password=`'admin'` |
| `tbl_email` | Records for INVOICE, QUOTATION, STATEMENT, RECEIPT |

---

## SQL_CRUD.vb: Database Operations

### Global State (Lines 8-14)

| Variable | Type | Purpose |
|----------|------|---------|
| `display_format` | `String` | Date display format (`"dd-MM-yyyy"`) |
| `ds` | `DataSet` | Global dataset for results |
| `da` | `SqlDataAdapter` | Global adapter |
| `cmd` | `SqlCommand` | Global command |
| `bmp`, `bmp2` | `Bitmap` | Image storage for uploads |
| `globle_format` | `String` | System date format |
| `IMG1`, `IMG2` | `Boolean` | Image upload flags |
| `pic` | `PictureBox` | Image reference |

---

### Date Format Configuration

#### `set_global_date_format()` (Lines 15-18)

Sets system-wide date format to `dd-MM-yyyy`.

```vb
Thread.CurrentThread.CurrentCulture = New CultureInfo("en-US", True)
Registry.SetValue("HKEY_CURRENT_USER\Control Panel\International", "sShortDate", globle_format)
```

---

### CRUD Operations

#### `SQL_Select(table, field, condition, extra, option)` (Lines 19-29)

**Parameters:**
- `table` — Table name
- `field` — Fields to select (default `*`)
- `condition` — WHERE clause (no "WHERE" keyword)
- `extra` — Additional SQL (ORDER BY, etc.)
- `option` — Extra options

**Returns:** `DataSet`

**Builds:**
```sql
SELECT {field} FROM {table} WHERE {condition} {extra}
```

#### `SQL_Insert(table, variable, option, option2)` (Lines 61-109)

Inserts record using Dictionary of field-value pairs.

**Dictionary Format:**
```vb
Dim variable As New Dictionary(Of String, String)
variable.Add("field_name", "'value'")  ' Values must include quotes
```

**Features:**
- Supports two image fields via `option` and `option2` parameters
- Returns the new `SCOPE_IDENTITY()` on success, `0` on failure

#### `SQL_Update(table, variable, condition, option, option2, extra)` (Lines 133-171)

Updates record using Dictionary.

**Dictionary Format:**
```vb
Dim variable As New Dictionary(Of String, String)
variable.Add("field_name", "'new_value'")  ' No = sign needed
```

**Builds:**
```sql
UPDATE {table} SET field1='val1', field2='val2' WHERE {condition}
```

#### `SQL_Delete(table, condition, option)` (Lines 173-185)

Deletes records matching condition.

#### `SQL_Query(query, option)` (Lines 187-195)

Executes raw SQL query, returns DataSet. Used for complex queries, joins, aggregations.

---

### Query Helpers

#### `SQL_GETROW()` / `SQL_GETVALUE()` (Lines 197-203)

Aliases for `SQL_Select()` — exist for convenience.

---

### Single Value Retrieval

#### `get_single_value(get_field_nm, tbl_nm, check_field, val1)` (Lines 249-267)

Retrieves single field value with one condition.

**SQL:**
```sql
SELECT {get_field_nm} FROM {tbl_nm} WHERE {check_field}='{val1}'
```

**Security:** Escapes single quotes via `Replace("'", "''")`

**Returns:** Empty string if no match.

#### `get_single_value_two_condition(get_field_nm, tbl_nm, check_field, check_field1, val1, val2)` (Lines 269-287)

Retrieves single field with two conditions (AND).

**SQL:**
```sql
SELECT {get_field_nm} FROM {tbl_nm} WHERE {check_field}='{val1}' AND {check_field1}='{val2}'
```

#### `get_max_number(field_nm, tbl_nm)` (Lines 223-243)

Returns MAX value of a field. Returns `0` if NULL.

```sql
SELECT MAX({field_nm}) FROM {tbl_nm}
```

---

### Due Amount Calculation

#### `GetDueAmount(CustomerId As Long)` (Lines 288-331)

Complex calculation: Total Invoice Amount − Total Receipts.

**Final Query:**
```sql
SELECT
    customer_id,
    SUM(total) AS TotalDueAmount,
    (
        SELECT SUM(r.amount_received)
        FROM tbl_receipt r
        WHERE r.customer_id = i.customer_id
    ) AS TotalReceived,
    (
        SUM(total) -
        COALESCE((
            SELECT SUM(r.amount_received)
            FROM tbl_receipt r
            WHERE r.customer_id = i.customer_id
        ), 0)
    ) AS FinalDueAmount
FROM tbl_invoice_main i
WHERE customer_id = {customer_id}
GROUP BY customer_id
```

**Returns:** Formatted string with 2 decimal places, or `0` if no data.

---

### Input Validation

#### `isamount(sender, e)` (Lines 205-208)

Allows only digits and decimal point in text fields.

```vb
e.Handled = Not (Char.IsDigit(e.KeyChar) Or e.KeyChar = "." Or e.KeyChar = ControlChars.Back)
```

#### `isdigit(sender, e)` (Lines 210-213)

Allows only digits in text fields.

```vb
e.Handled = Not (Char.IsDigit(e.KeyChar) Or e.KeyChar = ControlChars.Back)
```

#### `isemail(s As String)` (Lines 215-222)

Validates email format using `MailAddress` class.

**Behavior:**
- On invalid: Shows `MsgBox("Please Enter Valid E-Mail Address", vbCritical, "WARNING")`
- Returns `True` always (no false return) — calling code must check result

---

### Control Traversal

#### `GetAllControls(control As Control)` (Lines 244-247)

Recursive function to get all nested controls on a form.

```vb
Return control.Controls.Cast(Of Control)().
    SelectMany(Function(ctrl) GetAllControls(ctrl)).
    Concat(controls)
```

Used by `set_fonr()` and `rights()` to apply styling to all form controls.

---

## Usage Patterns

### Opening a Form (Standard Pattern)

```vb
ShowForm("Add_Edit_Invoice")  ' Shows existing or triggers creation
```

### Saving with Image Upload

```vb
' Set global bmp before call
bmp = PictureBox1.Image
Dim newId = SQL_Insert("tbl_company", variableDict, "logo")
```

### Date-Safe String Values

Always wrap values in quotes for Dictionary-based CRUD:

```vb
variable.Add("invoice_date", "'" & Format(DateTimePicker1.Value, "yyyy-MM-dd") & "'")
variable.Add("sub_total", tot.ToString)
```

### Form Styling on Load

```vb
Private Sub Form_Load(sender, e) Handles MyBase.Load
    Call grids1(DataGridView1)      ' Style grid
    Call set_fonr(Me, Label_Title)  ' Style controls
    Call con_sql()                  ' Ensure connection
End Sub
```

### KeyPress Event Wiring

```vb
TextBox_Amount.KeyPress += Sub(s, e) isamount(s, e)
TextBox_Qty.KeyPress += Sub(s, e) isdigit(s, e)
```

---

## Dependencies

**Module1.vb depends on:**
- `Module1.con` (SqlConnection) — initialized by `con_sql()`
- `HOME` global form reference — MDI parent
- `SQL_CRUD` functions (SQL_Select, SQL_Insert) — used in `auto_field()`

**SQL_CRUD.vb depends on:**
- `Module1.con_sql()` — calls to ensure connection open
- `Module1.con` — uses global connection

**Circular dependency resolved:** `con_sql()` calls `set_global_date_format()` from SQL_CRUD.

---

## File: docs/specs/11-module1-helpers.md