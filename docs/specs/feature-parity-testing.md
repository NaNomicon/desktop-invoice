# XPress Billing — Feature Parity Testing Plan

Track testing progress with ✅ (pass) / ❌ (fail) / ⚠️ (partial) per app.

---

## 1. Authentication & Session

| # | Test | Original (VB.NET) | New (Tauri/React) | Original Status | New Status |
|---|------|-------------------|-------------------|-----------------|------------|
| 1.1 | Login with valid credentials | Launch app → Login form → select user from dropdown → enter password → click Login | Launch app → splash screen → Login page → select user from dropdown → enter password → click Login | - [x] | - [ ] |
| 1.2 | Wrong password | Enter incorrect password → expect error message, stay on login | Enter incorrect password → expect error/toast, stay on login | - [x] | - [ ] |
| 1.3 | Admin vs User role | Login as admin → MASTERS > USER menu visible, delete buttons visible; login as regular user → USER menu hidden, delete buttons hidden | Login as admin → Users page accessible, delete buttons visible; login as regular user → Users page inaccessible, delete buttons hidden | - [z] | - [ ] |
| 1.4 | Logout | SETTING > EXIT > LOGOUT → returns to Login form | Sidebar logout → returns to Login page, session cleared | - [z] | - [ ] |
| 1.5 | Session persistence | Close and reopen app → should return to login (no session persistence in original) | Close and reopen app → verify if session persists or requires re-login | - [x] | - [ ] |
| 1.6 | Exit with backup prompt | Close HOME window → "Do You Want to Get Backup Now?" dialog appears | Close app → no such prompt (new app has manual backup only) | - [x] | - [ ] |


---

## 2. Invoice — Create & Edit

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 2.1 | Open invoice form | BILLING > INVOICE → View_Invoice → click New | Sidebar > Invoices → click New Invoice | - [ ] | - [ ] |
| 2.2 | Invoice number auto-generated | Form opens with next invoice number pre-filled from tbl_numbers | Form opens with next invoice number pre-filled | - [ ] | - [ ] |
| 2.3 | Customer search | Type in Customer Name field → dropdown appears → search by name/phone/contact/address | Type in Customer field → dropdown appears → search by name/phone/email/address | - [ ] | - [ ] |
| 2.4 | Customer due/advance loads | Select customer → "Due Amount" or "Advance Amount" label appears with value; total adjusts | Select customer → due/advance amount shown; verify total adjusts accordingly | - [ ] | - [ ] |
| 2.5 | Add line item | Click in Product Name cell → type product name → arrow keys to navigate → Enter to select | Click in Product Name cell → type → arrow keys → Enter to select | - [ ] | - [ ] |
| 2.6 | Product type filter | load_type ComboBox filters products by type; all_type checkbox shows all | Product type filter available in product search | - [ ] | - [ ] |
| 2.7 | Keyboard shortcuts | Ctrl+I adds row, Ctrl+D deletes row | Ctrl+I adds row, Ctrl+D deletes row | - [ ] | - [ ] |
| 2.8 | Qty/price calculation | Edit Qty → Total = Qty × UnitPrice; sub_total updates | Edit Qty → row total updates; sub_total updates | - [ ] | - [ ] |
| 2.9 | VAT calculation | If VAT enabled in settings: VAT = sub_total × vat_per%; grand total updates | VAT toggle on form; VAT = sub_total × vat_per%; grand total updates | - [ ] | - [ ] |
| 2.10 | Discount % | Enter % in per field → discount = (sub_total + vat) × per%; total updates | Enter discount % → discount amount calculated; total updates | - [ ] | - [ ] |
| 2.11 | Manual discount | Leave per = 0 → type directly in discount field | Enter discount amount directly when % is 0 | - [ ] | - [ ] |
| 2.12 | CASH mode | Set case_debit = CASH → paid_amount field becomes enabled | Set case to CASH → paid amount field enabled | - [ ] | - [ ] |
| 2.13 | CREDIT mode | Set case_debit = CREDIT → paid_amount field disabled | Set case to CREDIT → paid amount field disabled | - [ ] | - [ ] |
| 2.14 | Print Due Amount toggle | chk1 checkbox → controls whether due amount prints on invoice PDF | Verify "Print Due Amount" toggle exists and affects PDF output | - [ ] | - [ ] |
| 2.15 | Checklist# and Ref# | Fill checklist_no → saved and visible in list | Fill checklist# and ref# → saved and visible in list | - [ ] | - [ ] |
| 2.16 | Save & Print | Button1 → saves → generates PDF → saves to {Invoice_path}/{Month}/INV{no}-{name}.pdf → opens | Save & Print → saves → PDF generated → opens print preview | - [ ] | - [ ] |
| 2.17 | Save & Preview | Button4 → saves → opens preview window | Save & Preview → saves → navigates to invoice preview | - [ ] | - [ ] |
| 2.18 | Save & Email | Button6 → saves → PDF generated → direct_email form opens pre-filled with customer email, template body, PDF attached | Send button → saves → email sent with PDF attachment using INVOICE template | - [ ] | - [ ] |
| 2.19 | Add Receipt from invoice | Button8 → opens Add_Edit_Receipt with customer pre-loaded | "Create Receipt" button → receipt form pre-filled with customer | - [ ] | - [ ] |
| 2.20 | New Customer inline | Button3 → opens Add_Edit_Customer → after save, customer auto-selected in invoice | "New Customer" button → opens customer form → after save, customer selected | - [ ] | - [ ] |
| 2.21 | New Product inline | Button7 → opens Add_Edit_Product → after save, product auto-inserted as line item | "New Product" button → opens product form → after save, product added to line | - [ ] | - [ ] |
| 2.22 | Edit invoice | View_Invoice → select row → Edit button or double-click → form opens with data | Invoice list → click row → edit → form opens with data | - [ ] | - [ ] |
| 2.23 | Edit-lock (late edit) | If editing invoice older than invoice_days setting → new invoice number assigned | If invoice has receipts → duplicate created with new number | - [ ] | - [ ] |
| 2.24 | Delete invoice | View_Invoice → select → Delete → confirm → customer balance reversed → record removed | Invoice list → delete (admin) → confirm → customer balance reversed → removed | - [ ] | - [ ] |
| 2.25 | Split invoice (multi-company) | Not present in original — single company only | Add line items from 2 companies → save → 2 separate invoices created | N/A | - [ ] |


---

## 3. Quotation — Create & Edit

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 3.1 | Open quotation form | BILLING > QUOTATION → View_Quotation → New | Sidebar > Quotations → New Quotation | - [ ] | - [ ] |
| 3.2 | Quotation number auto-generated | Next quo_no from tbl_numbers pre-filled | Next quotation number pre-filled | - [ ] | - [ ] |
| 3.3 | Customer search | Same type-ahead as invoice | Same type-ahead as invoice | - [ ] | - [ ] |
| 3.4 | Customer due shown | amount_due field shows customer balance (read-only, no total adjustment) | Customer due displayed (quotations don't adjust total based on balance) | - [ ] | - [ ] |
| 3.5 | Line items, calc, VAT, discount | Same as invoice | Same as invoice | - [ ] | - [ ] |
| 3.6 | Save & PDF | Button1 → saves → PDF to {quo_path}/{Month}/{customer}/QUO{no}-{name}.pdf | Save → PDF generated to configured quotation path | - [ ] | - [ ] |
| 3.7 | Save & Preview | Button4 → saves → opens quotation preview | Save & Preview → navigates to quotation preview | - [ ] | - [ ] |
| 3.8 | Save & Email | Button6 → saves → PDF → direct_email opens with QUOTATION template (replaces date, contact person) | Send → saves → email with QUOTATION template, PDF attached | - [ ] | - [ ] |
| 3.9 | Edit quotation | View_Quotation → select → Edit or double-click | Quotation list → click → edit | - [ ] | - [ ] |
| 3.10 | Delete quotation | Select → Delete → confirm → removed (no balance adjustment) | Delete (admin) → confirm → removed | - [ ] | - [ ] |
| 3.11 | Convert to invoice | View_Quotation → double-click row → opens Add_Edit_Invoice pre-filled with all quotation data | Quotation list → double-click or Convert button → invoice form pre-filled | - [ ] | - [ ] |
| 3.12 | Checklist# | Fill checklist_no → saved and visible in list | Fill checklist# → saved and visible | - [ ] | - [ ] |
| 3.13 | Split quotation | Not present in original | Multi-company lines → save → separate quotations | N/A | - [ ] |

---

## 4. Receipt & Payment

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 4.1 | Open receipt form | BILLING > RECEIPT → View_List_of_Receipt → New; or from Outstanding → Receipt Voucher | Sidebar > History → New; or from Outstanding → Receipt Voucher | - [ ] | - [ ] |
| 4.2 | Customer search | Type-ahead in customer_name field | Type-ahead in customer field | - [ ] | - [ ] |
| 4.3 | Due amount loads | Select customer → amount_received pre-filled with customer's due amount | Select customer → amount pre-filled with due amount | - [ ] | - [ ] |
| 4.4 | Transaction history grid | DataGridView2 shows all invoices + receipts for customer with running balance (UNION query) | Side panel shows all invoices + receipts for customer with running balance | - [ ] | - [ ] |
| 4.5 | Payment method | cash, cheque, other checkboxes — multi-select allowed (can check all three) | Cash/Cheque/Other selector — verify if multi-select is supported | - [ ] | - [ ] |
| 4.6 | Cheque number | Enter cheque_no when cheque is checked | Cheque# field appears when Cheque selected | - [ ] | - [ ] |
| 4.7 | Balance calculation | due_amount = customer balance - amount_received; shows new balance | New balance = old balance - amount received | - [ ] | - [ ] |
| 4.8 | Save receipt | Button1 → saves → PDF auto-generated to {report_path}/Receipt/{Month}/{customer}/PAY{no}-{name}.pdf → refreshes Outstanding/Receipt lists | Save → receipt saved → customer balance updated | - [ ] | - [ ] |
| 4.9 | Edit receipt | View_List_of_Receipt → select → Edit or double-click | Receipt list → select → edit | - [ ] | - [ ] |
| 4.10 | Delete receipt | Select → Delete → customer balance NOT adjusted (original bug) | Delete → verify if customer balance is restored (new app may fix this) | - [ ] | - [ ] |
| 4.11 | Preview receipt | Button5 → PDF preview | Preview button → receipt report opens | - [ ] | - [ ] |
| 4.12 | Email receipt | Button6 → PDF → direct_email with RECEIPT template | Email button → receipt PDF sent with RECEIPT template | - [ ] | - [ ] |
| 4.13 | Print PDF | Button7 → PDF saved to path → message shown with path | Save PDF button → PDF saved to configured path | - [ ] | - [ ] |
| 4.14 | Payment label customization | Labels show custom text from Settings | Payment mode labels reflect Settings values | - [ ] | - [ ] |

---

## 5. Outstanding Balances

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 5.1 | View outstanding | BILLING > OUTSTANDING → ListOutStanding | Sidebar > Outstanding | - [ ] | - [ ] |
| 5.2 | Due amounts shown | Customers with due_amount > 0; Due = positive (red), Advance = negative (green) | Customers with due/advance; Due in red, Advance in green | - [ ] | - [ ] |
| 5.3 | Total due / advance | No totals row in original list | Totals shown at bottom (new app feature) | N/A | - [ ] |
| 5.4 | Search | Type in find → filters by customer name | Search field → filters by customer name | - [ ] | - [ ] |
| 5.5 | New Receipt | BtnNewReceipt → blank receipt form | New Receipt button → blank receipt form | - [ ] | - [ ] |
| 5.6 | Receipt Voucher | Select customer → BtnReceiptVoucher → receipt pre-filled with customer | Select customer → Receipt Voucher → receipt pre-filled | - [ ] | - [ ] |
| 5.7 | Double-click | Double-click row → receipt form for that customer | Double-click row → receipt form for that customer | - [ ] | - [ ] |
| 5.8 | Print/Preview | BtnPrint → opens Preview_Outstanding_Report | Print button → browser print dialog | - [ ] | - [ ] |
| 5.9 | View PDF | BtnViewPDF → PDF saved to {report_path}/Outstanding Reports/{timestamp}.pdf → opens | PDF button → PDF generated and opens | - [ ] | - [ ] |
| 5.10 | Export Excel | BtnExport → Excel Interop → .xlsx (requires Excel installed) | Export → .xls download (no Excel required) | - [ ] | - [ ] |


---

## 6. Sales Report

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 6.1 | Open sales report | REPORTS > SALES REPORT | Sidebar > Reports > Sales | - [ ] | - [ ] |
| 6.2 | Date range filter | fromdate (first of month default) + todate → grid refreshes | Date range pickers → grid refreshes | - [ ] | - [ ] |
| 6.3 | Search | find field → filters by customer name, invoice#, checklist# | Search field → same filters | - [ ] | - [ ] |
| 6.4 | Grid columns | Customer Name, Customer Type, Invoice No, Invoice Date, Discount, Bill Amount, Checklist No | Invoice#, Date, Customer, Subtotal, VAT, Discount, Total | - [ ] | - [ ] |
| 6.5 | Preview report | Button5 → opens Preview_Sales_Report | PDF export button → PDF generated | - [ ] | - [ ] |
| 6.6 | Print selected PDF | Button2 → select row → PDF saved to {report_path}/Sales Reports/Sales{timestamp}.pdf → opens | Select invoice → open invoice preview | - [ ] | - [ ] |
| 6.7 | Export Excel | Button7 → SaveFileDialog → .xlsx via Excel Interop | Export → .xls download | - [ ] | - [ ] |

---

## 7. Quotation Report

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 7.1 | Open quotation report | REPORTS > QUOTATION REPORT | Sidebar > Reports > Quotations | - [ ] | - [ ] |
| 7.2 | Date range + search | Same pattern as sales report | Same pattern | - [ ] | - [ ] |
| 7.3 | Preview / PDF / Excel | Same buttons as sales report | PDF export, Excel export | - [ ] | - [ ] |

---

## 8. Statement of Account

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 8.1 | Open statement | REPORTS > STATEMENT OF ACCOUNT | Sidebar > Reports > Statement | - [ ] | - [ ] |
| 8.2 | Select customer + date range | Customer picker + from/to dates | Customer picker + from/to dates | - [ ] | - [ ] |
| 8.3 | Opening balance | Statement shows opening balance before date range | Opening balance shown | - [ ] | - [ ] |
| 8.4 | Transactions listed | All invoices + receipts in range with running balance | All invoices + receipts with running balance | - [ ] | - [ ] |
| 8.5 | Closing balance | Final balance at bottom | Closing balance shown | - [ ] | - [ ] |
| 8.6 | PDF / Print | PDF generation + print | PDF export + print | - [ ] | - [ ] |
| 8.7 | Email statement | Not directly from statement form (uses direct_email) | Email button → STATEMENT template + PDF | - [ ] | - [ ] |

---

## 9. Customer Management

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 9.1 | Open customers | MASTERS > CUSTOMER → View_Customer | Sidebar > Customers | - [ ] | - [ ] |
| 9.2 | Add customer | New button → Add_Edit_Customer form | New button → customer dialog | - [ ] | - [ ] |
| 9.3 | Title field | title_name ComboBox: Mr / Mrs / Miss | Title: Mr / Mrs / Ms / Dr | - [ ] | - [ ] |
| 9.4 | Customer type | Residential / Corporate / Ironing | Individual / Corporate — verify if "Ironing" type exists | - [ ] | - [ ] |
| 9.5 | BRN field | brn TextBox | BRN field present | - [ ] | - [ ] |
| 9.6 | VAT field | vat TextBox | VAT field present | - [ ] | - [ ] |
| 9.7 | Contact person | contact TextBox | Contact field present | - [ ] | - [ ] |
| 9.8 | Email validation | Only enforced for Corporate type | Verify email validation behavior | - [ ] | - [ ] |
| 9.9 | Edit customer | Select → Edit → form opens filled | Select → edit dialog opens filled | - [ ] | - [ ] |
| 9.10 | Delete customer | Admin only → soft-delete | Admin only → soft-delete | - [ ] | - [ ] |
| 9.11 | After save → auto-select in invoice | Save new customer → customer auto-selected in open invoice form | Save new customer → customer auto-selected in invoice form | - [ ] | - [ ] |
| 9.12 | Import from Excel | Not in original | Import .xlsx → bulk insert | N/A | - [ ] |
| 9.13 | Export to Excel | Not in original | Export .xlsx | N/A | - [ ] |

---

## 10. Product Management

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 10.1 | Open products | MASTERS > PRODUCT → View_Product | Sidebar > Products | - [ ] | - [ ] |
| 10.2 | Add product | New → Add_Edit_Product | New → product dialog | - [ ] | - [ ] |
| 10.3 | Product ID (code) | product_id TextBox (alphanumeric SKU) | Product code field | - [ ] | - [ ] |
| 10.4 | Product type | ComboBox bound to tbl_product_type | Product type dropdown | - [ ] | - [ ] |
| 10.5 | Price field | price TextBox, validated as amount | Price field, numeric | - [ ] | - [ ] |
| 10.6 | Duplicate check | Same name + same type rejected | Verify duplicate check behavior | - [ ] | - [ ] |
| 10.7 | Inline add from invoice | Button7 in invoice → Add_Edit_Product → after save, product auto-inserted as line item | New Product button in invoice → after save, product added to line | - [ ] | - [ ] |
| 10.8 | "+ Add Type" inline | Button3 in product form → opens Add_Edit_Product_Type without leaving product form | Verify inline product type creation | - [ ] | - [ ] |
| 10.9 | Edit / Delete | Standard CRUD | Standard CRUD, admin-only delete | - [ ] | - [ ] |
| 10.10 | Import / Export Excel | Not in original | Import/export .xlsx | N/A | - [ ] |


---

## 11. Product Type Management

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 11.1 | Open product types | MASTERS > PRODUCT TYPE | Sidebar > Product Types | - [ ] | - [ ] |
| 11.2 | Add / Edit / Delete | Simple name field, CRUD | Simple name field, CRUD | - [ ] | - [ ] |
| 11.3 | After save → refreshes product form | Save new type → Add_Edit_Product type dropdown refreshes | Save new type → product form type dropdown refreshes | - [ ] | - [ ] |

---

## 12. Company Settings

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 12.1 | Open company | MASTERS > COMPANY → Add_Edit_Company | Sidebar > Companies | - [ ] | - [ ] |
| 12.2 | Single vs multi-company | Single company only (one record in tbl_company) | Multi-company supported | - [ ] | - [ ] |
| 12.3 | Company name, address, city, tel, email | All present | All present | - [ ] | - [ ] |
| 12.4 | Facebook URL | facebook_url field present | Facebook URL field present | - [ ] | - [ ] |
| 12.5 | BRN + VAT No | Both present | Both present | - [ ] | - [ ] |
| 12.6 | Note lines (3) | note1, note2, note3 — print on invoices | 3 note lines present and print on invoices | - [ ] | - [ ] |
| 12.7 | Thank you messages (2) | thanks1, thanks2 — print on invoices | 2 thank-you lines present and print on invoices | - [ ] | - [ ] |
| 12.8 | Currency symbol | ComboBox: € / $ / ₹ / £ | Currency field present | - [ ] | - [ ] |
| 12.9 | Logo upload | Upload image → stored as binary in DB → prints on invoices | Logo upload → stored → prints on invoices | - [ ] | - [ ] |
| 12.10 | Watermark upload | Upload image → stored as binary → appears on printed documents | Watermark upload → appears on printed documents | - [ ] | - [ ] |
| 12.11 | Bank details | Not in original company form | Bank name/account/branch fields present | N/A | - [ ] |
| 12.12 | Active/inactive toggle | Not in original | Active/inactive toggle present | N/A | - [ ] |

---

## 13. Application Settings

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 13.1 | Open settings | SETTING > SETTING | Sidebar > Settings | - [ ] | - [ ] |
| 13.2 | VAT toggle | isvat checkbox → shows "Active" (green) / "Deactive" (red) | VAT switch → on/off | - [ ] | - [ ] |
| 13.3 | VAT percentage | vat_per TextBox | VAT % input | - [ ] | - [ ] |
| 13.4 | Invoice number override | invoice_no TextBox → sets next invoice number | Invoice# override input | - [ ] | - [ ] |
| 13.5 | Quotation number override | quo_no TextBox | Quotation# override input | - [ ] | - [ ] |
| 13.6 | Receipt number override | Not in original | Receipt# override input (new app feature) | N/A | - [ ] |
| 13.7 | Invoice edit days | invoice_days TextBox → controls edit window | Invoice days input | - [ ] | - [ ] |
| 13.8 | Invoice save path | Folder picker → invoice_path | Folder picker → invoice path | - [ ] | - [ ] |
| 13.9 | Quotation save path | Folder picker → quo_path | Folder picker → quotation path | - [ ] | - [ ] |
| 13.10 | Report save path | Folder picker → report_path | Folder picker → report path | - [ ] | - [ ] |
| 13.11 | Backup path | Folder picker → backup_path | Folder picker → backup path | - [ ] | - [ ] |
| 13.12 | Payment label customization | TextBox1/2/3 → Cash/Cheque/Other label text | Payment mode label inputs | - [ ] | - [ ] |
| 13.13 | Home background image | Upload image → HOME form background changes | Upload image → home screen background changes | - [ ] | - [ ] |
| 13.14 | WhatsApp settings | Not in original | WA access token + phone number ID fields | N/A | - [ ] |

---

## 14. User Management

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 14.1 | Open users | MASTERS > USER (admin only) | Sidebar > Users (admin only) | - [ ] | - [ ] |
| 14.2 | Add user | New → user form | New → user dialog | - [ ] | - [ ] |
| 14.3 | Password field | Plain-text password; visible only to admin in email config | Plain-text password | - [ ] | - [ ] |
| 14.4 | Role | des field: USER / admin | Role: USER / admin | - [ ] | - [ ] |
| 14.5 | Edit / Delete | Standard CRUD | Standard CRUD | - [ ] | - [ ] |
| 14.6 | Change password | Not a separate form in original | Sidebar > Change Password → requires current password | N/A | - [ ] |


---

## 15. Email System

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 15.1 | Open email config | E-MAIL menu → emails form | Sidebar > Email Templates | - [ ] | - [ ] |
| 15.2 | 4 template types | Buttons: INVOICE / QUOTATION / STATEMENT / RECEIPT | 4 template types in list | - [ ] | - [ ] |
| 15.3 | Template fields | Sender ID, Sender Password, Subject, Header (sub_subject), Body | Sender email, password, subject, body | - [ ] | - [ ] |
| 15.4 | Sub-subject / Header field | sub_subject TextBox — separate header line | Verify if sub-subject/header field exists | - [ ] | - [ ] |
| 15.5 | Customer search in template | Type in receiver field → search customers → auto-fills "Dear {Title} {Name}" | Not applicable (templates only, no send from here) | - [ ] | - [ ] |
| 15.6 | Save template | SAVE button → updates tbl_email | Save → updates template | - [ ] | - [ ] |
| 15.7 | Direct email form | Separate direct_email form: To, From, Subject, Header, Body, multi-file attachments | Sidebar > Direct Email: receiver, sender, subject, body, attachments | - [ ] | - [ ] |
| 15.8 | Multi-file attachment | CheckedListBox1 → add multiple files | Multiple file attachments supported | - [ ] | - [ ] |
| 15.9 | Send from invoice | Invoice form → Save & Email → direct_email pre-filled | Invoice → Send → INVOICE template used, PDF attached | - [ ] | - [ ] |
| 15.10 | Send from quotation | Quotation form → Save & Email → direct_email pre-filled | Quotation → Send → QUOTATION template, PDF attached | - [ ] | - [ ] |
| 15.11 | Send from receipt | Receipt list → Email button → direct_email pre-filled | Receipt list → Email → RECEIPT template, PDF attached | - [ ] | - [ ] |
| 15.12 | Send from statement | Not directly from statement in original | Statement → Email → STATEMENT template, PDF attached | - [ ] | - [ ] |
| 15.13 | Template placeholders | <date>, <contact person>, <name> substituted | Same placeholders substituted | - [ ] | - [ ] |

---

## 16. Database Administration

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 16.1 | Open backup | SETTING > BACKUP | Sidebar > Backup | - [ ] | - [ ] |
| 16.2 | Select backup folder | FolderBrowserDialog → path set to {folder}\dd-MM-yyyy | Folder picker → backup path | - [ ] | - [ ] |
| 16.3 | Run backup | BACKUP button → SQL BACKUP DATABASE → file saved as .rar | Backup button → file copied to configured path with timestamp | - [ ] | - [ ] |
| 16.4 | Backup file format | .bak renamed to .rar | .db file copy | - [ ] | - [ ] |
| 16.5 | Progress indicator | ProgressBar animates to 100% | Verify progress feedback | - [ ] | - [ ] |
| 16.6 | Open restore | SETTING > RESTORE | Sidebar > Restore | - [ ] | - [ ] |
| 16.7 | Select backup file | OpenFileDialog → select .rar file | File picker → select .db file | - [ ] | - [ ] |
| 16.8 | Run restore | RESTORE → confirm → renames .rar to .bak → SQL RESTORE → app exits | Restore → confirm → file copied over → app relaunches | - [ ] | - [ ] |
| 16.9 | App restart after restore | Application.Exit() — app closes, must relaunch manually | App relaunches automatically | - [ ] | - [ ] |
| 16.10 | Auto-backup on exit | HOME close → "Do You Want to Get Backup Now?" → Yes → backup runs | No auto-backup prompt (manual only) | - [ ] | - [ ] |
| 16.11 | Migrate from SQL Server | Not in original | Sidebar > Migrate → SQL Server → SQLite migration with progress | N/A | - [ ] |

---

## 17. PDF & Print

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 17.1 | Invoice PDF path | {Invoice_path}/{MonthName}/INV{no}-{name}.pdf | Configured invoice path | - [ ] | - [ ] |
| 17.2 | Quotation PDF path | {quo_path}/{MonthName}/{customer}/QUO{no}-{name}.pdf | Configured quotation path | - [ ] | - [ ] |
| 17.3 | Receipt PDF path | {report_path}/Receipt/{MonthName}/{customer}/PAY{no}-{name}.pdf | Configured report path | - [ ] | - [ ] |
| 17.4 | PDF engine | Microsoft ReportViewer (RDLC) — requires .NET runtime | Typst CLI (bundled) | - [ ] | - [ ] |
| 17.5 | PDF auto-generated on save | Every save triggers PDF generation automatically | PDF generated on explicit print/preview action | - [ ] | - [ ] |
| 17.6 | Month subfolder creation | PDFs organized into {MonthName}/ subfolders automatically | Verify if month subfolders are created | - [ ] | - [ ] |
| 17.7 | Excel export | Excel Interop (requires Microsoft Excel installed) | XML-based .xls (no Excel required) | - [ ] | - [ ] |
| 17.8 | Print preview zoom | Not in original | 50-150% zoom in print preview | N/A | - [ ] |

---

## 18. UI Shell & Navigation

| # | Test | Original (VB.NET) | New (Tauri/React) | Original | New |
|---|------|-------------------|-------------------|----------|-----|
| 18.1 | Navigation structure | MDI container with MenuStrip (MASTERS / BILLING / REPORTS / SETTING / E-MAIL / EXIT) | Collapsible sidebar with groups | - [ ] | - [ ] |
| 18.2 | Multiple forms open | MDI — multiple child windows open simultaneously | Tab bar for report pages; single active page otherwise | - [ ] | - [ ] |
| 18.3 | Navigation breadcrumb | FlowLayoutPanel1 tracks open forms | No breadcrumb (tab bar instead) | - [ ] | - [ ] |
| 18.4 | Home background | Configurable background image on HOME form | Configurable background image on home screen | - [ ] | - [ ] |
| 18.5 | Command palette | Not in original | Cmd+K opens command palette | N/A | - [ ] |
| 18.6 | Quick pane | Not in original | Cmd+Shift+. floating mini-window | N/A | - [ ] |
| 18.7 | Theme switching | Not in original | Light/dark/system theme | N/A | - [ ] |
| 18.8 | Language switching | Not in original | EN/AR/FR with RTL support | N/A | - [ ] |
| 18.9 | Window state persistence | Not in original | Window position/size restored on relaunch | N/A | - [ ] |
| 18.10 | Single instance | Not in original | Second launch focuses existing window | N/A | - [ ] |
| 18.11 | Auto-updates | Not in original | GitHub Releases auto-update | N/A | - [ ] |

---

## 19. Known Differences (Not Bugs — Design Changes)

| # | Feature | Original App | New App |
|---|---------|-------------|--------|
| 19.1 | Company model | Single company | Multi-company with per-line-item company assignment |
| 19.2 | Customer type "Ironing" | Present | Likely absent — verify |
| 19.3 | Receipt delete balance | Does NOT restore customer balance (original bug) | Restores customer balance on delete |
| 19.4 | PDF auto-save on every save | Yes — PDF always generated on save | No — PDF only on explicit print/preview |
| 19.5 | Excel export engine | Excel Interop (requires Excel) | XML-based (no Excel required) |
| 19.6 | Backup format | .rar file | .db file copy |
| 19.7 | App restart after restore | Manual (app exits) | Automatic relaunch |
| 19.8 | Statement email | Via direct_email form manually | Direct email button on statement page |
| 19.9 | WhatsApp integration | Not present | Present (partially wired) |
| 19.10 | SQL Server migration | Not applicable | Built-in migration tool |

---

## Suggested Testing Order

1. Auth (section 1)
2. Invoice full lifecycle (section 2)
3. Quotation (section 3)
4. Receipt (section 4)
5. Outstanding (section 5)
6. Reports — Sales, Quotation, Statement (sections 6-8)
7. Customer / Product / Company (sections 9-12)
8. Settings (section 13)
9. Email (section 15)
10. DB Admin (section 16)
11. UI Shell (section 18)
