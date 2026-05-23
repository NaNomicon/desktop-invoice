/**
 * TypeScript types for XPress Billing database
 * All money fields: INTEGER cents (e.g., 125000 = $1,250.00)
 * All date fields: TEXT ISO 8601 (YYYY-MM-DD)
 */

export interface Company {
  id: number;
  company_name: string | null;
  company_short_name: string | null;
  company_code: string | null;
  contact_person: string | null;
  address: string | null;
  city: string | null;
  telephone: string | null;
  email: string | null;
  facebook_url: string | null;
  brn: string | null;
  vat: string | null;
  note1: string | null;
  note2: string | null;
  note3: string | null;
  thanks1: string | null;
  thanks2: string | null;
  currency: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  logo: string | null;
  watermark: string | null;
  is_active: number;
}

export interface User {
  id: number;
  user_id: string;
  password: string;
  des: string | null;
  company_id: number;
  is_deleted: number;
}

export interface UserRoleOption {
  value: 'admin' | 'USER';
  label: string;
}

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
  wa_access_token?: string | null;
  wa_phone_number_id?: string | null;
}

export interface NumberSequence {
  id: number;
  invoice_no: number;
  quo_no: number;
  receipt_no: number;
}

export interface ProductType {
  id: number;
  type_name: string;
  is_deleted: number;
}

export interface Customer {
  id: number;
  customer_name: string;
  contact: string | null;
  customer_type?: string | null;
  telephone: string | null;
  address: string | null;
  email: string | null;
  due_amount: number;
  title_name: string | null;
  reg_date: string | null;
  ad_due: string;
  brn: string | null;
  vat: string | null;
  company_id: number;
  is_deleted: number;
}

export interface Product {
  id: number;
  product_id: string | null;
  product_name: string;
  type_id: number | null;
  company_id: number;
  price: number;
  is_deleted: number;
}

export interface InvoiceMain {
  id: number;
  customer_id: number;
  invoice_no: string;
  checklist_no: string | null;
  company_id: number;
  sub_total: number;
  amount_due: number;
  vat: number;
  discount: number;
  total: number;
  per: number;
  invoice_date: string;
  case_debit: string | null;
  paid_amount: number;
  balance: number;
  no: string | null;
  cr_dr: string | null;
  identify: string | null;
  print_due: string | null;
  is_deleted: number;
}

export interface InvoiceSub {
  id: number;
  main_id: number;
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
  company_id: number;
  is_deleted: number;
}

export interface QuotationMain {
  id: number;
  customer_id: number;
  quo_no: string;
  checklist_no?: string | null;
  company_id: number;
  sub_total: number;
  amount_due: number;
  vat: number;
  discount: number;
  total: number;
  per: number;
  quo_date: string;
  case_debit: string | null;
  paid_amount: number;
  balance: number;
  no: string | null;
  cr_dr: string | null;
  identify: string | null;
  is_deleted: number;
}

export interface QuotationSub {
  id: number;
  main_id: number;
  qty: number;
  product_id: number | null;
  unit_price: number;
  row_total: number;
  s_no: number;
  is_deleted: number;
}

export interface Receipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  customer_id: number;
  company_id: number;
  due_amount?: number;
  amount_received: number;
  cheque_no: string | null;
  no?: string | null;
  balance?: number;
  cr_dr: string | null;
  invoice_no?: string | null;
  pre_load?: string | null;
  cash?: string | null;
  cheque?: string | null;
  other?: string | null;
  payment_mode: string | null;
  bank_name: string | null;
  invoice_reference: string | null;
  notes: string | null;
}

export interface EmailTemplate {
  id: number;
  template_type: string | null;
  subject: string | null;
  body: string | null;
  sender_email: string | null;
  sender_pass: string | null;
  client_email?: string | null;
  sender?: string | null;
  identify?: string | null;
  sub_subject?: string | null;
}

export interface WhatsAppTemplate {
  id: number;
  template_name: string;
  template_id: string;
  body: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}
