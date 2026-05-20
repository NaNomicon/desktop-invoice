# Company Settings — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Master/Add_Edit_Company.vb` |
| **Purpose** | Maintain multiple company profiles used in invoice/report headers and footer text |
| **Table** | `tbl_company` |
| **Pattern** | Multi-row CRUD with `company_id` selection (changed from singleton) |

## Purpose

This form manages multiple company profiles (name, address/contact, statutory fields, notes, thanks text, currency, logo, watermark). Report and print modules consume this data for header branding and footer lines based on the `company_id` of each transaction.

Previously a **single-record configuration** (`company_id = get_max_number("id", "tbl_company")`), now supports **multiple companies** with a list/grid for selection.

---

## Form Lifecycle and Load Logic

### Class Declaration

```vb
Public Class Add_Edit_Company
    Dim company_id As Long = 0
    Dim mode As String = "add"  ' or "edit"
```

### Key Events

| Event | Behavior |
|-------|----------|
| `Add_Edit_Company_Load` | Initializes SQL connection, loads company list grid |
| `Disposed` | Calls `last_form_close(Me)` |
| `KeyDown` | Escape closes form |
| `Move` | Calls `moved(Me)` |

### Load Event

```vb
Private Sub Add_Edit_Company_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
    Call set_fonr(Me, Label2)
    Call con_sql()
    IMG1 = False
    IMG2 = False
    Me.KeyPreview = True
    LoadCompanyList()      ' NEW: Load list of all companies
    ClearForm()
End Sub
```

### Company List Grid

```vb
Public Sub LoadCompanyList()
    Dim query As String = "SELECT ID, company_name, company_code, company_short_name, is_active FROM tbl_company ORDER BY company_code"
    Call SQL_Query(query)
    DataGridView1.DataSource = ds.Tables(0)
    
    ' Format columns
    DataGridView1.Columns("ID").Visible = False
    DataGridView1.Columns("company_name").HeaderText = "Company Name"
    DataGridView1.Columns("company_code").HeaderText = "Code"
    DataGridView1.Columns("company_short_name").HeaderText = "Short Name"
    DataGridView1.Columns("is_active").HeaderText = "Active"
End Sub
```

### Grid Double-Click → Edit Mode

```vb
Private Sub DataGridView1_CellDoubleClick(ByVal sender As Object, ByVal e As DataGridViewCellEventArgs) Handles DataGridView1.CellDoubleClick
    If e.RowIndex >= 0 Then
        company_id = DataGridView1.Rows(e.RowIndex).Cells("ID").Value
        mode = "edit"
        Call load_data()
        Button1.Text = "Update"  ' Change save button text
    End If
End Sub
```

---

## Data Fetch (`load_data`)

`load_data()` uses `SQL_Select` with `id` filter and hydrates controls:

```vb
Public Sub load_data()
    Call SQL_Select("tbl_company", "", "id='" & company_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        company_name.Text = ds.Tables(0).Rows(0).Item("company_name").ToString
        company_short_name.Text = ds.Tables(0).Rows(0).Item("company_short_name").ToString
        company_code.Text = ds.Tables(0).Rows(0).Item("company_code").ToString
        is_active.Checked = CBool(ds.Tables(0).Rows(0).Item("is_active"))
        address.Text = ds.Tables(0).Rows(0).Item("address").ToString
        city.Text = ds.Tables(0).Rows(0).Item("city").ToString
        telephone.Text = ds.Tables(0).Rows(0).Item("telephone").ToString
        email.Text = ds.Tables(0).Rows(0).Item("email").ToString
        facebook_url.Text = ds.Tables(0).Rows(0).Item("facebook_url").ToString
        brn.Text = ds.Tables(0).Rows(0).Item("brn").ToString
        note1.Text = ds.Tables(0).Rows(0).Item("note1").ToString
        note2.Text = ds.Tables(0).Rows(0).Item("note2").ToString
        note3.Text = ds.Tables(0).Rows(0).Item("note3").ToString
        thanks1.Text = ds.Tables(0).Rows(0).Item("thanks1").ToString
        thanks2.Text = ds.Tables(0).Rows(0).Item("thanks2").ToString
        currency.Text = ds.Tables(0).Rows(0).Item("currency").ToString
        vat.Text = ds.Tables(0).Rows(0).Item("vat").ToString
    End If
End Sub
```

---

## Field and DB Column Mapping (`tbl_company`)

| UI Control | Control Type | DB Column | Load assignment | Save source |
|------------|--------------|-----------|-----------------|-------------|
| `company_name` | TextBox | `company_name` | `.Item("company_name")` | auto via GetAllControls |
| `company_short_name` | TextBox | `company_short_name` | `.Item("company_short_name")` | auto |
| `company_code` | TextBox | `company_code` | `.Item("company_code")` | auto |
| `address` | TextBox | `address` | `.Item("address")` | auto |
| `city` | TextBox | `city` | `.Item("city")` | auto |
| `telephone` | TextBox | `telephone` | `.Item("telephone")` | auto |
| `email` | TextBox | `email` | `.Item("email")` | auto |
| `facebook_url` | TextBox | `facebook_url` | `.Item("facebook_url")` | auto |
| `brn` | TextBox | `brn` | `.Item("brn")` | auto |
| `vat` | TextBox | `vat` | `.Item("vat")` | auto |
| `note1` | TextBox | `note1` | `.Item("note1")` | auto |
| `note2` | TextBox | `note2` | `.Item("note2")` | auto |
| `note3` | TextBox | `note3` | `.Item("note3")` | auto |
| `thanks1` | TextBox | `thanks1` | `.Item("thanks1")` | auto |
| `thanks2` | TextBox | `thanks2` | `.Item("thanks2")` | auto |
| `currency` | ComboBox | `currency` | `.Item("currency")` | explicit |
| `is_active` | CheckBox | `is_active` | `.Item("is_active")` | explicit |
| `pic_logo`/`bmp` | PictureBox/Image | `logo` (Byte[]) | `DirectCast(...Item("logo"), Byte())` | `@logo` when `IMG1=True` |
| `pic_water`/`bmp2` | PictureBox/Image | `watermark` (Byte[]) | `DirectCast(...Item("watermark"), Byte())` | `@logo1` when `IMG2=True` |

---

## Validation and Input Constraints

### Required Fields

| Field | Rule | Error Message |
|-------|------|---------------|
| company_name | Must not be empty | "Please enter company name" |
| company_code | Must not be empty | "Please enter company code" |
| company_code | Must be unique | "Company code already exists" |

---

## Image Handling (Logo + Watermark)

### Runtime Flags

- `IMG1` tracks logo change state.
- `IMG2` tracks watermark change state.
- Both set `False` during load and reset after successful update.

### Loading from DB (`Byte()` -> `Image`)

```vb
Dim imageData As Byte()
imageData = DirectCast(ds.Tables(0).Rows(0).Item("logo"), Byte())
If Not imageData Is Nothing Then
    Using ms As New MemoryStream(imageData, 0, imageData.Length)
        ms.Write(imageData, 0, imageData.Length)
        pic_logo.Image = Image.FromStream(ms, True)
        bmp = Image.FromStream(ms, True)
        Dim temp_img As String
        temp_img = Application.StartupPath & "\tmp_logo.jpg"
        pic_logo.Image.Save(temp_img)
    End Using
End If
```

Same pattern is repeated for watermark (`imageData1`, `watermark`, `pic_water`, `bmp2`).

### Selecting Files

Logo (`Button3_Click`) and watermark (`Button4_Click`) use `OpenFileDialog1` and set flags:

```vb
pic_logo.Image = Image.FromFile(strfilename)
bmp = pic_logo.Image
IMG1 = True
```

```vb
pic_water.Image = Image.FromFile(strfilename)
bmp2 = pic_water.Image
IMG2 = True
```

---

## Save Logic (`saved_sql`)

### Clear Form

```vb
Public Sub ClearForm()
    company_name.Clear()
    company_short_name.Clear()
    company_code.Clear()
    address.Clear()
    city.Clear()
    telephone.Clear()
    email.Clear()
    facebook_url.Clear()
    brn.Clear()
    vat.Clear()
    note1.Clear()
    note2.Clear()
    note3.Clear()
    thanks1.Clear()
    thanks2.Clear()
    currency.SelectedIndex = 0
    is_active.Checked = True
    pic_logo.Image = Nothing
    pic_water.Image = Nothing
    IMG1 = False
    IMG2 = False
    mode = "add"
    company_id = 0
    Button1.Text = "Save"
End Sub
```

### Update Mode (mode = "edit")

Core pattern:

- Build `variable` map from text fields + currency + is_active.
- Conditionally include image placeholders:
  - `variable.Add("logo", "@logo")` when `IMG1=True`
  - `variable.Add("watermark", "@logo1")` when `IMG2=True`
- Choose one of four `SQL_Update` overload calls based on flag combination.

```vb
If IMG1 = True And IMG2 = True Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "@logo", "@logo1")
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Call LoadCompanyList()
    Call ClearForm()
    Exit Sub
End If
If IMG1 = True Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "@logo")
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Call LoadCompanyList()
    Call ClearForm()
    Exit Sub
End If
If IMG2 = True Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "", "@logo1")
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Call LoadCompanyList()
    Call ClearForm()
    Exit Sub
End If
If IMG1 = False And IMG2 = False Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id)
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Call LoadCompanyList()
    Call ClearForm()
    Exit Sub
End If
```

### Insert Mode (mode = "add")

Insert always sends both image parameters:

```vb
variable.Add("logo", "@logo")
variable.Add("watermark", "@logo1")
Dim d As Integer = SQL_Insert("tbl_company", variable, "@logo", "@logo1")
MsgBox("Company Details Saved!", vbInformation)
Call LoadCompanyList()
Call ClearForm()
```

---

## SQL Pattern Notes

- Record fetch:
  - `SQL_Select("tbl_company", "", "id='" & company_id & "'")`
- Update:
  - `SQL_Update("tbl_company", variable, "id=" & company_id, ...optional image params...)`
- Insert:
  - `SQL_Insert("tbl_company", variable, "@logo", "@logo1")`
- List:
  - `SELECT ID, company_name, company_code, is_active FROM tbl_company WHERE is_active = 1`

The code relies on helper implementations of `SQL_Update` / `SQL_Insert` to bind `@logo` and `@logo1` from in-memory image objects (`bmp`, `bmp2`).

---

## Number Sequence / Single Record Strategy (CHANGES)

**Previous:** Single-company settings — always resolved latest row by max id.

**New:** Multi-company maintenance:

1. `company_id = 0` → New company (INSERT)
2. `company_id > 0` → Edit existing company (UPDATE)
3. Grid double-click → Load company for editing
4. "New" button → Clear form for new entry
5. All active companies appear in dropdowns across the application

---

## Backward Compatibility

- Existing single-company record remains with ID=1
- Reports with `company_id=1` continue to work
- Auto-migration sets `company_code='XPI'` on existing record