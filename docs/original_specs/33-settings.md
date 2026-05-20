# Settings Form Specification (`Settings.vb`)

## Purpose
`Settings.vb` is the central configuration form for the desktop invoice application. It is responsible for loading and saving global runtime settings from `tbl_setting` and number sequence counters from `tbl_numbers`.

This spec expands and complements `docs/specs/14-settings-email-utility.md` with field-level mappings and implementation details directly reflected in `docs/xpress/legacy-code/XPress/Setting/Settings.vb`.

## Form Lifecycle and Record Selection
On `Settings_Load`:
- Calls `set_fonr(Me, Label2)` and `con_sql()`.
- Enables keyboard preview (`Me.KeyPreview = True`).
- Resolves current settings record via `setting_id = get_max_number("id", "tbl_setting")`.
- Resolves current numbers record via `invoice_id1 = get_max_number("id", "tbl_numbers")`.
- Calls `load_data()`.

**Important behavior:** both tables are treated as single-record configuration stores, and the code always targets the row with the maximum `id`.

## `tbl_setting` Schema (All Columns)
As used by `Settings.vb` and documented in existing specs:

| Column | Type (legacy schema) | Usage in `Settings.vb` |
|---|---|---|
| `id` | `BIGINT IDENTITY PK` | Lookup/update key (`setting_id`) |
| `isvat` | `NUMERIC(18,0)` | VAT enabled state (`0`/`1`) |
| `vat_per` | `NUMERIC(18,0)` | VAT percentage |
| `invoice_path` | `VARCHAR(MAX)` | Invoice output folder |
| `quo_path` | `VARCHAR(MAX)` | Quotation output folder |
| `report_path` | `VARCHAR(MAX)` | Report output folder |
| `invoice_days` | `VARCHAR(100)` | Invoice edit window days |
| `back_path` | `VARCHAR(MAX)` | Logo/background image file path |
| `backup_path` | `VARCHAR(MAX)` | Backup destination folder |
| `cash` | `VARCHAR(MAX)` | Payment mode label for cash |
| `cheque` | `VARCHAR(MAX)` | Payment mode label for cheque |
| `other` | `VARCHAR(MAX)` | Payment mode label for other |

## Settings Field Mapping (UI <-> DB)
`load_data()` and `Button1_Click` implement the following mappings:

| UI control | DB column | Load behavior | Save behavior |
|---|---|---|---|
| `isvat` (CheckBox) | `isvat` | Reads numeric value; `0` -> unchecked/red/"Deactive", `1` -> checked | Converts checked state to numeric (`1` or `0`) |
| `vat_per` (TextBox) | `vat_per` | `Val(...)` conversion | Saves as `Val(vat_per.Text)` |
| `invoice_path` (TextBox) | `invoice_path` | Direct string | Direct string |
| `quo_path` (TextBox) | `quo_path` | Direct string | Direct string |
| `report_path` (TextBox) | `report_path` | Direct string | Direct string |
| `invoice_days` (TextBox) | `invoice_days` | Direct string | Direct string |
| `backup_path` (TextBox) | `backup_path` | Direct string | Direct string |
| `TextBox3` | `cash` | Direct string | Direct string |
| `TextBox2` | `cheque` | Direct string | Direct string |
| `TextBox1` | `other` | Direct string | Direct string |
| `pic_logo` (Image) via `strfilename` | `back_path` | If `back_path` exists and file exists on disk, loads image into `pic_logo` | Saved **only when** `strfilename <> ""` (new selection in current session) |

## VAT Configuration (`isvat`, `vat_per`)
- `isvat` is persisted as numeric flag (`0` or `1`).
- `isvat.CheckedChanged` updates visual state:
  - Checked: Green, text `Active`
  - Unchecked: Red, text `Deactive`
- `vat_per` is saved with `Val(...)`, so non-numeric input collapses to `0` semantics.

## File Paths (`invoice_path`, `quo_path`, `report_path`)
Browse handlers:
- `Button3_Click` -> `invoice_path`
- `Button4_Click` -> `quo_path`
- `Button5_Click` -> `report_path`

Each opens `FolderBrowserDialog1` and writes `SelectedPath` directly. The trailing-slash conditional exists but both branches assign the same value.

## Payment Mode Labels (`cash`, `cheque`, `other`)
Mapped textboxes:
- `TextBox3` -> `cash`
- `TextBox2` -> `cheque`
- `TextBox1` -> `other`

These are free-form labels used by the application to display payment mode names.

## Edit Window Days (`invoice_days`)
- Stored in `tbl_setting.invoice_days`.
- Loaded/saved as plain text (no numeric validation in `Settings.vb`).
- Intended meaning: number of days invoice edit is allowed after creation (as documented in existing spec).

## Backup Path (`back_path`, `backup_path`)
Two distinct fields:

1. `backup_path` (folder path)
   - Selected by `Button7_Click` via `FolderBrowserDialog1`.
   - Used by backup flows elsewhere (e.g., auto-backup logic from HOME module per existing spec).

2. `back_path` (image file path)
   - Selected by `Button6_Click` via `OpenFileDialog1` image filter.
   - File path cached in `strfilename`; image preview shown in `pic_logo`.
   - During load, if DB value is non-empty and file exists, image is loaded.
   - During save, `back_path` is updated only when a new file is selected this session (`strfilename <> ""`).

## Save Logic (`SQL_Update` for Existing Record)
Save entry point: `Button1_Click`.

### Step-by-step
1. Converts VAT checkbox to numeric (`ischeck`).
2. Builds a `Dictionary(Of String, String)` named `variable` with setting column values.
3. Conditionally includes `back_path` only if `strfilename` is not empty.
4. Persists settings row:
   - If `setting_id > 0`: `SQL_Update("tbl_setting", variable, "id=" & setting_id)`
   - Else: `SQL_Insert("tbl_setting", variable)`
5. Persists number row (see next section).
6. Shows success message, refreshes HOME by calling `HOME.HOME_Load(sender, e)`, then closes form.

### Implementation details
- Existing-record path is update-first (`SQL_Update`) and is the normal path after first setup.
- Insert path is fallback for first-run/empty-table scenarios.
- SQL payload values are assembled as quoted strings; numeric normalization relies on `Val(...)` where used.

## `tbl_numbers` Management (`invoice_no`, `quo_no`, `receipt_no`)
`Settings.vb` reads/writes number sequences from `tbl_numbers` using `invoice_id1` (max `id`).

### Schema context
Existing schema (from prior spec):
- `id` (PK)
- `invoice_no`
- `quo_no`
- `receipt_no`

### Actual `Settings.vb` coverage
- **Loaded in `load_data()`:**
  - `invoice_no.Text <- tbl_numbers.invoice_no`
  - `quo_no.Text <- tbl_numbers.quo_no`
- **Saved in `Button1_Click`:**
  - `invoice_no` and `quo_no` only
  - Update/insert logic mirrors `tbl_setting` pattern:
    - `SQL_Update("tbl_numbers", variable1, "id=" & invoice_id1)` when record exists
    - `SQL_Insert("tbl_numbers", variable1)` otherwise

### Missing/important gap
- `receipt_no` exists in `tbl_numbers` schema but is **not loaded or saved** by `Settings.vb`.
- Consequence: receipt sequence must be managed elsewhere, or it remains unchanged when saving settings.

## Related Form Behavior
- `Esc` key closes the form.
- `Label6_Click` and `Button2_Click` both close form.
- `Settings_Move` calls `moved(Me)`.
- `Settings_Disposed` calls `last_form_close(Me)`.

## Cross-Reference
For broader module context (email templates, backup/restore workflow, and table definitions), see:
- `docs/specs/14-settings-email-utility.md`
- Source: `docs/xpress/legacy-code/XPress/Setting/Settings.vb`
