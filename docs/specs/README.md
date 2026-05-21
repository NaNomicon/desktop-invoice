# XPress Billing — New Feature Specifications

## Tech Stack

- **[01 Tech Stack](01-tech-stack.md)** — Tauri 2.x + React + TypeScript + SQLite
- **[02 Database Migration](02-database-migration.md)** — SQL Server → SQLite (full Python script)

## Architecture

- **[00 Multi-Company Support](00-multi-company-support.md)** — Split-invoice, dual product lists, `company_id` on transactions

## Modules

- **[26 Company Settings](26-company-settings.md)** — Multi-company profile management

## Communication Channels

- **[40 WhatsApp Integration](40-whatsapp-integration.md)** — WhatsApp Business API (Meta Cloud API direct, template-based, PDF attachments)

---

## File List

| File | Description |
|------|-------------|
| `00-multi-company-support.md` | Core multi-company architecture |
| `01-tech-stack.md` | Tauri + React + SQLite stack, plugin setup, type mapping |
| `02-database-migration.md` | SQL Server → SQLite: schema, Python script, post-migration steps |
| `03-database.md` | Full SQLite schema (all tables, indexes, relationships) |
| `26-company-settings.md` | Multi-company CRUD UI |
| `40-whatsapp-integration.md` | WhatsApp Business API |
| `tools/migrate.py` | Python migration script (run against live SQL Server, outputs `xpress.db`) |

---

Original app specs: `docs/original_specs/`