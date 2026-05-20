# XPress Billing — Specification Index

## Architecture Overview

- **[00 Multi-Company Support](00-multi-company-support.md)** — Core multi-company architecture and design decisions

## Database & Configuration

- **[01 Database Schema](03-database.md)** — Complete database schema with multi-company columns

## Core Modules

- **[10 Invoice](10-invoice.md)** — Invoice creation, editing, payment tracking, company selection
- **[11 Quotation](11-quotation.md)** — Quotation module with company support
- **[30 Receipt](30-receipt.md)** — Receipt/voucher module with company support
- **[26 Company Settings](26-company-settings.md)** — Multi-company profile management

## Reports (Original Specs — Copy from docs/original_specs/)

- **32 Preview Invoice Report** — Print/PDF generation with company branding
- **33 Settings** — Application configuration
- **34 Restore DB** — Database backup/restore

## Migration Notes

- Original specifications preserved in `docs/original_specs/`
- Multi-company additions marked with: `> **Multi-Company Support Added:**`
- All transaction tables (invoice, quotation, receipt) now include `company_id`
- Company selection added via ComboBox at form header level
- Existing data defaults to company_id=1 (X-Press Ironing Ltd)

## Quick Reference

| Feature | Original | Updated |
|---------|----------|---------|
| Company table | Single row | Multiple rows |
| Company selection | None (implicit) | ComboBox dropdown |
| Invoice header | Customer + number | Company + Customer + number |
| Number sequences | Shared | Shared (per-company optional) |
| Reports | Single branding | Company-specific branding |
| Customers | All company | Shared across companies |
| Products | All company | Shared across companies |