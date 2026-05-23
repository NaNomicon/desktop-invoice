/**
 * TypeScript types for XPress Billing database
 * All money fields: INTEGER cents (e.g., 125000 = $1,250.00)
 * All date fields: TEXT ISO 8601 (YYYY-MM-DD)
 */

// tbl_company: Company settings
export interface Company {
  id: number;
  company_name: string | null;
  contact_person: string | null;
  address: string | null;
  telephone: string | null;
  email: string | null;
  brn: string | null;
  vat: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  logo: string | null;
  watermark: string | null;
  is_active: number;
}

// tbl_user: Users
export interface User {
  id: number;
  user_id: string;
  password: string;
  des: string | null;
  company_id: number;
  is_deleted: number;
}

// tbl_setting: App settings
export interface Setting {
  id: number;
  isvat: number;
  vat_per: number;
  invoice_days: string | null;
  invoice_path: string | null;
  quo_path: string | null;
  report_path: string | null;
  back_path: string | null;
  backup_path: string | null;
  cash: string | null;
  cheque: string | null;
  other: string | null;
}

// tbl_numbers: Auto-increment counters
export interface NumberSequence {
  id: number;
  invoice_no: number;
  quo_no: number;
  receipt_no: number;
}

// tbl_product_type: Product categories
export interface ProductType {
  id: number;
  type_name: string;
  is_deleted: number;
}

// tbl_customer: Customer master
export interface Customer {
  id: number;
  customer_name: string;
  contact: string | null;
  telephone: string | null;
  address: string | null;
  email: string | null;
  due_amount: number; // INTEGER cents
  title_name: string | null;
  reg_date: string | null; // ISO 8601
  ad_due: string; // 'Advance' | 'Due' | ''
  brn: string | null;
  vat: string | null;
  company_id: number;
  is_deleted: number;
}

// tbl_product: Products/Services
export interface Product {
  id: number;
  product_id: string | null;
  product_name: string;
  type_id: number | null;
  company_id: number;
  price: number; // INTEGER cents
  is_deleted: number;
}

// tbl_invoice_main: Invoice header
export interface InvoiceMain {
  id: number;
  customer_id: number;
  invoice_no: string;
  checklist_no: string | null;
  company_id: number;
  sub_total: number; // INTEGER cents
  amount_due: number; // INTEGER cents
  vat: number; // INTEGER cents
  discount: number; // INTEGER cents
  total: number; // INTEGER cents
  per: number;
  invoice_date: string; // ISO 8601
  case_debit: string | null;
  paid_amount: number; // INTEGER cents
  balance: number; // INTEGER cents
  no: string | null;
  cr_dr: string | null; // 'Cr.' | 'Dr.' | null
  identify: string | null;
  print_due: string | null;
  is_deleted: number;
}

// tbl_invoice_sub: Invoice line items
export interface InvoiceSub {
  id: number;
  main_id: number;
  qty: number;
  product_id: number | null;
  unit_price: number; // INTEGER cents
  row_total: number; // INTEGER cents
  s_no: number;
  company_id: number;
  is_deleted: number;
}

// tbl_quotation_main: Quotation header
export interface QuotationMain {
  id: number;
  customer_id: number;
  quo_no: string;
  company_id: number;
  sub_total: number; // INTEGER cents
  amount_due: number; // INTEGER cents
  vat: number; // INTEGER cents
  discount: number; // INTEGER cents
  total: number; // INTEGER cents
  per: number;
  quo_date: string; // ISO 8601
  case_debit: string | null;
  paid_amount: number; // INTEGER cents
  balance: number; // INTEGER cents
  no: string | null;
  cr_dr: string | null;
  identify: string | null;
  is_deleted: number;
}

// tbl_quotation_sub: Quotation line items
export interface QuotationSub {
  id: number;
  main_id: number;
  qty: number;
  product_id: number | null;
  unit_price: number; // INTEGER cents
  row_total: number; // INTEGER cents
  s_no: number;
  is_deleted: number;
}

// tbl_receipt: Payment receipts
export interface Receipt {
  id: number;
  receipt_no: string;
  customer_id: number;
  amount_received: number; // INTEGER cents
  payment_mode: string | null;
  cheque_no: string | null;
  bank_name: string | null;
  invoice_reference: string | null;
  cr_dr: string | null;
  receipt_date: string; // ISO 8601
  notes: string | null;
  company_id: number;
}

// tbl_email: Email templates
export interface EmailTemplate {
  id: number;
  template_type: string;
  subject: string | null;
  body: string | null;
  sender_email: string | null;
  sender_pass: string | null;
}

// tbl_wa_template: WhatsApp templates
export interface WhatsAppTemplate {
  id: number;
  template_name: string;
  template_id: string;
  body: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}
