
## Email send module
- DB: SQLite via Tauri plugin `@tauri-apps/plugin-sql`, helpers `query<T>` / `execute` from `@/lib/db`
- `EmailTemplate` type in `@/lib/types`: {id, template_type, subject, body, sender_email, sender_pass}
- tbl_email stores template_type INVOICE|QUOTATION|STATEMENT|RECEIPT with sender credentials
- nodemailer with Gmail SMTP (smtp.gmail.com:465, secure:true) - requires App Password
- Placeholder replacement uses case-insensitive regex (`/gi`): `<date>`, `<contact person>`, `<name>`
