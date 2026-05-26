import { describe, expect, it } from 'vitest'
import { REQUIRED_COLUMNS, SCHEMA_STATEMENTS, TABLES } from './schema'

describe('db schema derivation', () => {
  it('exports one required column list per table', () => {
    expect(Object.keys(REQUIRED_COLUMNS)).toEqual(Object.keys(TABLES))
  })

  it('does not include primary key id columns in reconciliation lists', () => {
    for (const columns of Object.values(REQUIRED_COLUMNS)) {
      expect(columns.some((column) => column.name === 'id')).toBe(false)
    }
  })

  it('keeps foreign key references in create statements', () => {
    expect(SCHEMA_STATEMENTS).toContain(
      `CREATE TABLE IF NOT EXISTS tbl_product (\n  id INTEGER PRIMARY KEY,\n  product_id TEXT,\n  product_name TEXT NOT NULL,\n  type_id INTEGER REFERENCES tbl_product_type(id),\n  company_id INTEGER DEFAULT 1,\n  price INTEGER DEFAULT 0,\n  is_deleted INTEGER DEFAULT 0\n)`
    )
    expect(SCHEMA_STATEMENTS).toContain(
      `CREATE TABLE IF NOT EXISTS tbl_invoice_sub (\n  id INTEGER PRIMARY KEY,\n  main_id INTEGER REFERENCES tbl_invoice_main(id),\n  qty INTEGER DEFAULT 0,\n  product_id INTEGER REFERENCES tbl_product(id),\n  unit_price INTEGER DEFAULT 0,\n  row_total INTEGER DEFAULT 0,\n  s_no INTEGER DEFAULT 0,\n  company_id INTEGER DEFAULT 1,\n  is_deleted INTEGER DEFAULT 0\n)`
    )
  })

  it('preserves important unique and index statements', () => {
    expect(SCHEMA_STATEMENTS).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_type ON tbl_email(template_type)'
    )
    expect(SCHEMA_STATEMENTS).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_identify ON tbl_whatsapp(identify)'
    )
    expect(SCHEMA_STATEMENTS).toContain(
      'CREATE INDEX IF NOT EXISTS idx_receipt_date ON tbl_receipt(receipt_date)'
    )
  })
})
