# Company Settings — Specification

## Overview

| Property | Value |
|----------|-------|
| **File** | `Master/Add_Edit_Company.vb` (202 lines) |
| **Purpose** | Maintain single-company master data used in invoice/report headers and footer text |
| **Table** | `tbl_company` |
| **Pattern** | Single-record configuration (`company_id = get_max_number("id", "tbl_company")`) |

## Purpose

This form stores one logical company profile (name, address/contact, statutory fields, notes, thanks text, currency, logo, watermark). Report and print modules consume this data for header branding and footer lines.

The record-selection pattern is not list-based CRUD; it always resolves one active row by max id:

```vb
company_id = get_max_number("id", "tbl_company")
If company_id > 0 Then
    Call load_data()
End If
```

## Form Lifecycle and Load Logic

### Class Declaration

```vb
Public Class Add_Edit_Company
```

### Key Events

| Event | Behavior |
|-------|----------|
| `Add_Edit_Company_Load` | Initializes SQL connection, resets image flags, resolves current company row, loads data |
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
    company_id = get_max_number("id", "tbl_company")
    If company_id > 0 Then
        Call load_data()
    End If
End Sub
```

### Data Fetch (`load_data`)

`load_data()` uses `SQL_Select` with `id` filter and hydrates controls directly from `ds.Tables(0).Rows(0)`:

```vb
Public Sub load_data()
    Call SQL_Select("tbl_company", "", "id='" & company_id & "'")
    If ds.Tables(0).Rows.Count > 0 Then
        company_name.Text = ds.Tables(0).Rows(0).Item("company_name").ToString
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

## Field and DB Column Mapping (`tbl_company`)

The save logic builds a `Dictionary(Of String, String)` from all TextBox controls plus currency ComboBox; dictionary keys are expected to match DB column names.

| UI Control | Control Type | DB Column | Load assignment | Save source |
|------------|--------------|-----------|-----------------|-------------|
| `company_name` | TextBox | `company_name` | `.Item("company_name")` | auto via `GetAllControls(Me).OfType(Of TextBox)` |
| `address` | TextBox | `address` | `.Item("address")` | auto TextBox loop |
| `city` | TextBox | `city` | `.Item("city")` | auto TextBox loop |
| `telephone` | TextBox | `telephone` | `.Item("telephone")` | auto TextBox loop |
| `email` | TextBox | `email` | `.Item("email")` | auto TextBox loop |
| `facebook_url` | TextBox | `facebook_url` | `.Item("facebook_url")` | auto TextBox loop |
| `brn` | TextBox | `brn` | `.Item("brn")` | auto TextBox loop |
| `vat` | TextBox | `vat` | `.Item("vat")` | auto TextBox loop |
| `note1` | TextBox | `note1` | `.Item("note1")` | auto TextBox loop |
| `note2` | TextBox | `note2` | `.Item("note2")` | auto TextBox loop |
| `note3` | TextBox | `note3` | `.Item("note3")` | auto TextBox loop |
| `thanks1` | TextBox | `thanks1` | `.Item("thanks1")` | auto TextBox loop |
| `thanks2` | TextBox | `thanks2` | `.Item("thanks2")` | auto TextBox loop |
| `currency` | ComboBox | `currency` | `.Item("currency")` | explicit `variable.Add(currency.Name, ...)` |
| `pic_logo`/`bmp` | PictureBox/Image | `logo` (Byte[]) | `DirectCast(...Item("logo"), Byte())` | `@logo` parameter when `IMG1=True` |
| `pic_water`/`bmp2` | PictureBox/Image | `watermark` (Byte[]) | `DirectCast(...Item("watermark"), Byte())` | `@logo1` parameter when `IMG2=True` |

## Validation and Input Constraints

There is **no explicit required-field validation** in `Button1_Click` or `saved_sql()`. Save is allowed with empty strings.

What is validated/normalized:

- String escaping only: each TextBox value is escaped using `.Replace("'", "''")`.
- Currency is captured from ComboBox text, not index value.
- Image columns are conditionally included in update dictionary only when change flags are set.

Actual save collection code:

```vb
Dim variable As New Dictionary(Of String, String)
Dim textboxes = GetAllControls(Me).OfType(Of TextBox)().ToList()
For Each item As TextBox In textboxes
    variable.Add(item.Name, "'" & item.Text.Replace("'", "''") & "'")
Next
variable.Add(currency.Name, "'" & currency.Text.Replace("'", "''") & "'")
```

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

Note: `Button4_Click` contains duplicated `.ShowDialog = Forms.DialogResult.OK` block, causing repeated assignment path for watermark selection.

## Save Logic (`saved_sql`)

### Entry Point

```vb
Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
    Call saved_sql()
End Sub
```

### Update Mode (`company_id > 0`)

Core pattern:

- Build `variable` map from text fields + currency.
- Conditionally include image placeholders:
  - `variable.Add("logo", "@logo")` when `IMG1=True`
  - `variable.Add("watermark", "@logo1")` when `IMG2=True`
- Choose one of four `SQL_Update` overload calls based on flag combination.

Actual branching:

```vb
If IMG1 = True And IMG2 = True Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "@logo", "@logo1")
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Me.Dispose()
    Me.Close()
    Exit Sub
End If
If IMG1 = True Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "@logo")
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Me.Dispose()
    Me.Close()
    Exit Sub
End If
If IMG2 = True Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id, "", "@logo1")
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Me.Dispose()
    Me.Close()
    Exit Sub
End If
If IMG1 = False And IMG2 = False Then
    Dim d As String = SQL_Update("tbl_company", variable, "id=" & company_id)
    MsgBox("Company Details Saved!", vbInformation)
    IMG1 = False
    IMG2 = False
    Me.Dispose()
    Me.Close()
    Exit Sub
End If
```

### Insert Mode (`company_id = 0`)

Insert always sends both image parameters:

```vb
variable.Add("logo", "@logo")
variable.Add("watermark", "@logo1")
Dim d As Integer = SQL_Insert("tbl_company", variable, "@logo", "@logo1")
MsgBox("Company Details Saved!", vbInformation)
Me.Dispose()
Me.Close()
```

## SQL Pattern Notes

- Record fetch:
  - `SQL_Select("tbl_company", "", "id='" & company_id & "'")`
- Update:
  - `SQL_Update("tbl_company", variable, "id=" & company_id, ...optional image params...)`
- Insert:
  - `SQL_Insert("tbl_company", variable, "@logo", "@logo1")`

The code relies on helper implementations of `SQL_Update` / `SQL_Insert` to bind `@logo` and `@logo1` from in-memory image objects (`bmp`, `bmp2`).

## Number Sequence / Single Record Strategy

This form implements a **single-company settings** strategy rather than multi-row maintenance:

1. On load, `company_id` is derived using `get_max_number("id", "tbl_company")`.
2. If max id exists, form edits that row.
3. If no row exists, first save executes insert.
4. Future edits continue updating latest row by `id`.

This is effectively a singleton configuration model for company identity data shown across printed documents.
