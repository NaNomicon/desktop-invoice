# Tech Stack — Tauri 2.x + React + SQLite

## Overview

| Layer | Choice | Status |
|-------|--------|--------|
| Desktop shell | **Tauri 2.x** | Native performance, ~10MB bundle |
| Frontend | **React 19 + TypeScript** | Reactive UI, strong typing |
| UI components | **shadcn/ui + Tailwind CSS v4** | Headless Radix primitives, copy-paste |
| Data tables | **TanStack Table v8 + react-virtual** | Headless, MIT, free |
| Forms | **react-hook-form + Zod** | Uncontrolled, type-safe schemas |
| State | **Zustand v5 + TanStack Query v5** | Global UI state + server state |
| DB | **SQLite** via **tauri-plugin-sql** | Official plugin, single `.db` file |
| Reports/PDF | **HTML + Tera + headless Chrome** | Crystal Reports replacement |
| Build target | Windows `.exe` | Single-platform |

---

## Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (React 19 + TypeScript)               │
│                                                              │
│  shadcn/ui (Radix)     TanStack Table  react-hook-form+Zod  │
│  react-resizable-panels   Zustand    TanStack Query v5    │
│  react-virtual (lists)    Lucide icons                      │
├─────────────────────────────────────────────────────────────┤
│                 Tauri IPC (invoke / emit)                   │
├─────────────────────────────────────────────────────────────┤
│                 Rust Backend (Tauri 2.x)                     │
│                                                              │
│  tauri-plugin-sql (SQLite)    tauri-plugin-fs             │
│  tauri-plugin-shell (Chrome)   tauri-plugin-dialog         │
│  tauri-plugin-notification     tauri-plugin-window-state  │
├─────────────────────────────────────────────────────────────┤
│                 SQLite (.db file)                           │
│  %APPDATA%\com.ramma.xpress\xpress.db                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tauri Plugins

```rust
// Cargo.toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
tauri-plugin-notification = "2"
tauri-plugin-window-state = "2"

// tauri.conf.json capabilities
{
  "plugins": {
    "sql": {},
    "shell": {
      "scope": [
        { "name": "chromium", "cmd": "chrome", "args": true },
        { "name": "chromium-path", "cmd": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "args": true }
      ]
    }
  }
}
```

---

## Frontend Components

### shadcn/ui + Tailwind CSS v4

**Why shadcn/ui**: You own the code (copy into `/src/components/ui`), no npm lock-in, Tailwind-native. Closest to VB.NET WinForms feel with modern DX.

**Components needed for invoice app**:
```
Button, Input, Label, Select, Dialog, Table, Tabs,
Checkbox, DropdownMenu, Popover, Calendar, Badge,
Separator, ScrollArea, Sheet (sidebar), Toast
```

### Data Table — TanStack Table v8

For: invoice list, customer list, product list, reports.

```typescript
import { createColumnHelper, getCoreRowModel } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

// Column definitions
const col = createColumnHelper<InvoiceRow>();
const columns = [
  col.accessor('invoice_no', { header: 'Invoice #' }),
  col.accessor('invoice_date', { header: 'Date' }),
  col.accessor('total', {
    header: 'Total',
    cell: ({ getValue }) => formatMoney(getValue()),
  }),
];

// Virtualized rows for 7,000+ invoices
const rowVirtualizer = useVirtualizer({
  count: paginatedData.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 40,
});
```

**Why not AG Grid**: $999/dev/yr for enterprise features. TanStack covers 95% of needs at $0.

### Forms — react-hook-form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const invoiceSchema = z.object({
  customer_id: z.number(),
  invoice_date: z.string(),
  per: z.number().optional(),
  items: z.array(z.object({
    qty: z.number(),
    product_id: z.number(),
    unit_price: z.number(),  // cents
  })),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

// Dynamic line items via useFieldArray
const { fields, append, remove } = useFieldArray({
  control,
  name: 'items',
});
```

**Money fields**: Always cents (INTEGER in DB), convert in UI:
```typescript
// Display: cents → currency string
const fmt = (cents: number) =>
  new Intl.NumberFormat('en-MU', { style: 'currency', currency: 'MUR' }).format(cents / 100);

// Input: string → cents
const parse = (s: string) => Math.round(parseFloat(s.replace(/[^0-9.]/g, '')) * 100;
```

### State Management — Zustand v5 + TanStack Query v5

```typescript
// Zustand — global UI state (no persistence needed)
const useAppStore = create((set) => ({
  sidebarOpen: true,
  currentCompanyId: 1,
  setCurrentCompany: (id) => set({ currentCompanyId: id }),
}));

// TanStack Query — server state (wraps tauri invoke)
const { data: invoices } = useQuery({
  queryKey: ['invoices', companyId],
  queryFn: () => db.select<InvoiceRow>(
    'SELECT * FROM tbl_invoice_main WHERE company_id = $1 ORDER BY invoice_date DESC',
    [companyId]
  ),
});
```

---

## Report / PDF Generation

### Crystal Reports → HTML + Tera + Headless Chrome

Original uses Crystal Reports RDLC (`.rdlc` files + 3 datasets per report). Replacement:

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│ Invoice data │ ──▶ │ Tera template │ ──▶ │ Headless Chrome │ ──▶ PDF
└──────────────┘     │  (invoice.html)│     │ --print-to-pdf  │
                     └──────────────┘     └────────────────┘
```

**Why**: CSS layout = closest to Crystal Reports' visual template model. Template inheritance via Tera `{% extends %}`.

### Template Structure

```
src-tauri/
├── templates/
│   ├── base.html              ← header, footer, logo, @page CSS
│   ├── invoice.html           ← {% extends "base.html" %}
│   ├── quotation.html
│   ├── statement.html
│   └── receipt.html
```

**base.html**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { margin: 15mm; size: A4; }
    body { font-family: 'DejaVu Sans', sans-serif; }
    .header { display: flex; justify-content: space-between; }
    .footer { position: fixed; bottom: 0; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  {% block header %}{% endblock %}
  {% block content %}{% endblock %}
  {% block footer %}{% endblock %}
</body>
</html>
```

**invoice.html**:
```html
{% extends "base.html" %}
{% block header %}
  <div class="header">
    <img src="{{ company_logo_base64 }}" height="60"/>
    <div>{{ company_name }}<br/>{{ company_address }}</div>
  </div>
{% endblock %}

{% block content %}
  <h2>Invoice #{{ invoice_no }}</h2>
  <p>Date: {{ invoice_date }}<br>Customer: {{ customer_name }}</p>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>
    {% for item in line_items %}
      <tr>
        <td>{{ item.product_name }}</td>
        <td>{{ item.qty }}</td>
        <td>{{ item.unit_price | currency }}</td>
        <td>{{ item.row_total | currency }}</td>
      </tr>
    {% endfor %}
    </tbody>
  </table>
{% endblock %}
```

### Rust Command (generate PDF)

```rust
#[tauri::command]
async fn generate_invoice_pdf(
    invoice_id: i64,
    app: AppHandle,
) -> Result<String, String> {
    let db = app.state::<Db>();

    // 1. Load invoice data from SQLite
    let invoice = db.select_one(
        "SELECT * FROM tbl_invoice_main WHERE id = $1",
        [invoice_id]
    ).await.map_err(|e| e.to_string())?;

    // 2. Render HTML with Tera
    let tera = app.state::<Tera>();
    let html = tera.render("invoice.html", &invoice)
        .map_err(|e| e.to_string())?;

    // 3. Write temp HTML
    let temp_dir = app.path().temp_dir().map_err(|e| e.to_string())?;
    let html_path = temp_dir.join("invoice.html");
    let pdf_path = temp_dir.join("invoice.pdf");
    fs::write(&html_path, html).map_err(|e| e.to_string())?;

    // 4. Headless Chrome → PDF
    let output = Command::new("chrome")
        .args([
            "--headless", "--disable-gpu",
            &format!("--print-to-pdf={}", pdf_path.display()),
            &format!("{}", html_path.display()),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    // 5. Copy to user documents
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    let dest = docs.join(format!("invoices/{}.pdf", invoice.invoice_no));
    fs::create_dir_all(dest.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::copy(&pdf_path, &dest).map_err(|e| e.to_string())?;

    Ok(dest.to_string_lossy().into())
}
```

### PDF Libraries (Rust fallback)

If Chrome is unavailable:

| Crate | Status | Layout | Tables |
|-------|--------|--------|--------|
| `printpdf` v0.8.1 | Active | Manual x/y | No |
| `genpdf` v0.2.0 | **Abandoned** (2021) | Elements tree | Basic |
| `krilla` v0.7.0 | Active (Mar 2026) | None (PDF primitives) | No |

Use `printpdf` only for simple receipts. Don't use `genpdf` (abandoned).

---

## Desktop UI Patterns

### Custom Titlebar (frameless window)

```typescript
// tauri.conf.json
{ "windows": [{ "decorations": false }] }

// React titlebar
<div data-tauri-drag-region className="h-8 bg-slate-900 flex items-center justify-between">
  <span className="text-white text-sm px-3">XPress Billing</span>
  <div className="flex">
    <button onClick={() => appWindow.minimize()} className="px-3 py-1 text-white hover:bg-slate-700">─</button>
    <button onClick={() => appWindow.toggleMaximize()} className="px-3 py-1 text-white hover:bg-slate-700">□</button>
    <button onClick={() => appWindow.close()} className="px-3 py-1 text-white hover:bg-red-600">✕</button>
  </div>
</div>
```

### Window State Persistence

```rust
// cargo.toml
tauri-plugin-window-state = "2"

tauri::Builder::default()
    .plugin(tauri_plugin_window_state::Builder::default().build())
// Window size/position auto-saved and restored
```

### Three-Panel Layout

```
┌────────────────────────────────────────────────────────┐
│  [Titlebar]                                            │
├─────────┬──────────────────────────┬─────────────────┤
│         │                          │                 │
│  Nav    │   Main Content           │  Preview/Pane   │
│  (200px│   (flexible)             │  (300px)        │
│         │                          │                 │
│ Invoice │   Invoice Entry Form      │  Live PDF        │
│ Customer│   or DataGrid            │  Preview        │
│ Product │                          │                 │
│ Reports │                          │                 │
│         │                          │                 │
└─────────┴──────────────────────────┴─────────────────┘
```

Use `react-resizable-panels` for splitters between panes.

---

## Starter Template

**Use**: `dannysmith/tauri-template` (⭐251, updated Mar 2026)

Includes: Tauri v2 + React 19 + shadcn/ui + Tailwind v4 + Zustand + TanStack Query + custom titlebar + system tray + `tauri-specta` (type-safe invoke bridge).

```bash
npx degit dannysmith/tauri-template my-app
cd my-app && npm install
# Purge demo, keep architecture
```

---

## Key Tauri APIs (Frontend)

```typescript
import { invoke } from '@tauri-apps/api/core';
import { appWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { save } from '@tauri-apps/plugin-dialog';
import Database from '@tauri-apps/plugin-sql';

// DB query
const db = await Database.load('sqlite:xpress.db');
const invoices = await db.select('SELECT * FROM tbl_invoice_main');

// Invoke Rust command
const pdfPath = await invoke<string>('generate_invoice_pdf', { invoiceId: 42 });

// Open file in system viewer
import { openPath } from '@tauri-apps/plugin-shell';
await open(pdfPath);

// Save dialog for export
const path = await save({ defaultPath: 'INV-042.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
```

---

## Type-Safe Bridge — tauri-specta

```rust
// Rust side
#[tauri::command]
async fn get_invoices(company_id: i64) -> Result<Vec<Invoice>, String> {
    // ...
}

specta::export(
    specta::ts::ts(),
    &get_invoices,
).unwrap();
```

```typescript
// Frontend — auto-generated types, full autocomplete
const invoices = await invoker.get_invoices({ company_id: 1 });
// TypeScript types auto-derived from Rust structs
```

---

## Data Directory

```
%APPDATA%\com.ramma.xpress\
├── xpress.db              ← SQLite
├── xpress.db-wal          ← WAL (auto)
├── logs\                   ← App logs
├── invoices\               ← Generated PDFs
│   ├── INV-2024-0001.pdf
│   └── ...
└── backups\               ← Auto-backups (last 5)
    └── xpress_2026-05-21.db
```

App creates dirs on first launch. `tauri-plugin-window-state` persists window size/position.

---

## What NOT to Use

| Avoid | Reason |
|-------|--------|
| AG Grid (paid) | $999/dev/yr. TanStack covers 95% needs. |
| Formik + Yup | Legacy. RHF + Zod is the 2026 standard. |
| Redux | Overkill. Zustand covers desktop app state. |
| genpdf | Abandoned 2021. No updates. |
| PGlite | 15-20MB overhead. No Tauri-native plugin. |
| Mantine (if shadcn available) | Good but shadcn is zero-bundle, more flexible. |