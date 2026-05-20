# Print Pipeline & Excel Export Module

## 09 Printer Export

---

### PRINTER_SETTING.vb

**File:** `XPress/PRINTER_SETTING.vb` (130 lines)
**Purpose:** Rendering pipeline for Microsoft RDLC `LocalReport` → EMF → `PrintDocument`
**Type:** VB.NET module, no class instantiation required

---

## Architecture

```
LocalReport → Export() → EMF streams → PrintPage handler → PrintDocument → Printer
```

### State

| Field | Type | Purpose |
|---|---|---|
| `m_streams` | `IList(Of Stream)` | One stream per rendered page (EMF) |
| `m_currentPageIndex` | `Integer` | Tracks current page during print |
| `printdoc` | `PrintDocument` | Active print job |

---

## print_microsoft_report() Overloads

### Overload 1 — Custom dimensions

```vb
Public Sub print_microsoft_report(
    ByRef report As LocalReport,
    ByVal page_width As Integer,
    ByVal page_height As Integer,
    Optional ByVal islandscap As Boolean = False,
    Optional ByVal printer_name As String = Nothing
)
```

- `page_width`, `page_height` in hundredths of an inch (e.g., 11000 = 11 inches)
- Creates `PaperSize("Custom", page_width, page_height)`
- No form disposal (caller manages lifecycle)

### Overload 2 — PaperKind enum

```vb
Public Sub print_microsoft_report(
    ByVal report As LocalReport,
    ByRef frm As Form,
    Optional ByVal paperkind As String = "A4",
    Optional ByVal islandscap As Boolean = False,
    Optional ByVal printer_name As String = Nothing
)
```

- `paperkind` is a string matching `System.Drawing.Printing.PaperKind` enum name (e.g., `"A4"`, `"Letter"`)
- Enumerates `printdoc.PrinterSettings.PaperSizes` to find matching `Kind`
- **Disposes `frm` after print** — caller must pass a disposable form reference
- Throws if paper size not found in printer's supported list

### Common behavior

Both overloads:
1. Validate printer via `printdoc.PrinterSettings.IsValid`
2. Set `printdoc.DefaultPageSettings.Landscape = islandscap`
3. Call `Export(report)` then `Print()`

---

## Export() — RDLC → EMF Rendering

```vb
Private Sub Export(ByVal report As LocalReport)
```

### Steps

1. **Swap W/H for landscape** (line 78-83)
   - When `Landscape = True`, swap `Height` ↔ `Width` so rendered page matches physical orientation

2. **Build DeviceInfo XML** (line 85-93)
   ```xml
   <DeviceInfo>
     <OutputFormat>EMF</OutputFormat>
     <PageWidth>{w/100}in</PageWidth>
     <PageHeight>{h/100}in</PageHeight>
     <MarginTop>0.0in</MarginTop>
     <MarginLeft>0.0in</MarginLeft>
     <MarginRight>0.0in</MarginRight>
     <MarginBottom>0.0in</MarginBottom>
   </DeviceInfo>
   ```
   - All margins hard-coded to 0 (margins handled in PrintPage)
   - Units: inches (pixel_size = 100)

3. **Render** (line 96)
   ```vb
   report.Render("Image", deviceInfo, AddressOf CreateStream, warnings)
   ```
   - Format: EMF (Enhanced Metafile) — vector, printer-ready
   - `CreateStream` callback: one stream per page

4. **Reset stream positions** (line 97-99)
   - All streams rewound to position 0

---

## PrintPage Handler

```vb
Private Sub PrintPage(ByVal sender As Object, ByVal ev As PrintPageEventArgs)
```

### Flow

1. **Load metafile** — `New Metafile(m_streams(m_currentPageIndex))`

2. **Margin adjustment** (line 107-110)
   ```vb
   Dim adjustedRect As New Rectangle(
       ev.PageBounds.Left - CInt(ev.PageSettings.HardMarginX),
       ev.PageBounds.Top - CInt(ev.PageSettings.HardMarginY),
       ev.PageBounds.Width,
       ev.PageBounds.Height
   )
   ```
   - Offsets rectangle by hardware hard-margin values
   - Accounts for printer unprintable area

3. **Fill white background** — `ev.Graphics.FillRectangle(Brushes.White, adjustedRect)`

4. **Draw metafile** — `ev.Graphics.DrawImage(pageImage, adjustedRect)`

5. **Advance page** — `m_currentPageIndex++`, `ev.HasMorePages = (m_currentPageIndex < m_streams.Count)`

---

## Print() Routine

```vb
Private Sub Print()
    AddHandler printdoc.PrintPage, AddressOf PrintPage
    m_currentPageIndex = 0
    printdoc.Print()
```

- Subscribes `PrintPage` handler
- Resets index to 0
- Fires `PrintDocument.Print()`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| EMF instead of PNG/JPEG | Vector format → no quality loss at any DPI |
| Hard 0 margins in DeviceInfo | Margins handled as offset in `PrintPage`, not at render |
| Stream-per-page instead of single file | Simple multi-page support without file I/O |
| `AddressOf CreateStream` callback | RDLC renderer calls back per page — one stream per page |

---

## Known Issues / Limitations

- **No dispose of streams** — `m_streams` not explicitly disposed after print (memory leak for many prints)
- **No warning inspection** — `warnings()` array from `Render()` is captured but never used
- **Form disposal coupling** — Overload 2 forcibly disposes `frm` — breaks if caller needs form after print
- **No page count metadata** — Caller cannot know page count before print starts

---

---

### Export.vb

**File:** `XPress/Export.vb` (16 lines)
**Purpose:** Shared Excel interop state for report → Excel export across multiple forms
**Type:** VB.NET module (singleton — shared global state)

---

## Global Variables

```vb
Public tables As DataTableCollection        ' Data source for exports
Public source1 As New BindingSource          ' Binding source

Public APP As New Excel.Application         ' Excel process
Public worksheet As Excel.Worksheet         ' Active worksheet
Public workbook As Excel.Workbook           ' Active workbook

Public xlWorkBook As Excel.Workbook         ' Secondary workbook ref
Public xlWorkSheet As Excel.Worksheet       ' Secondary worksheet ref
Public misValue As Object = System.Reflection.Missing.Value

Public xlApp As Excel.Application = New Microsoft.Office.Interop.Excel.Application()
```

| Field | Purpose |
|---|---|
| `tables` | Holds `DataTable` collection — data source for export |
| `source1` | `BindingSource` bound to data |
| `APP` / `xlApp` | Excel `Application` instance (two refs to same concept) |
| `worksheet` / `xlWorkSheet` | Active `Worksheet` in current workbook |
| `workbook` / `xlWorkBook` | Active `Workbook` in current application |
| `misValue` | `System.Reflection.Missing.Value` — used for optional Excel API params |

---

## Usage Pattern

This module is **shared** — imported by multiple report forms that need Excel export:

```vb
' Typical usage in a report form:
Import XPress.Export

' Initialize export
xlApp.Workbooks.Add()
xlWorkBook = xlApp.ActiveWorkbook
xlWorkSheet = xlWorkBook.Worksheets(1)

' Populate cells
xlWorkSheet.Range("A1").Value = "Report Title"

' Export/save
xlWorkBook.SaveAs(filename, xlOpenXMLWorkbook)
```

---

## Excel Process Lifecycle

| Phase | Action |
|---|---|
| **Init** | `xlApp = New Excel.Application()` (app-level, once) |
| **New workbook** | `xlApp.Workbooks.Add()` |
| **Populate** | `xlWorkSheet.Range(...).Value = ...` |
| **Save** | `xlWorkBook.SaveAs(path, format)` |
| **Cleanup** | `xlWorkBook.Close()`, `xlApp.Quit()`, `GC.Collect()` |

> **No cleanup in module** — each form using Export.vb is responsible for closing workbooks and quitting the Excel process.

---

## Cross-Form Shared State Risk

Since `Export` is a module (not a class), all fields are **global singletons**:

- `xlWorkBook` overwritten if Form A starts export before Form B finishes
- Only one active workbook at a time
- No thread safety

Forms using this module must coordinate export sequencing or risk overwriting shared state.

---

## Dependencies

```xml
Microsoft.Office.Interop.Excel
```

Requires Excel installed on the machine. COM interop binding.

---