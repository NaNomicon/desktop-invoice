# Database Migration — SQL Server to SQLite

## Overview

| Item | Value |
|------|-------|
| Source | SQL Server (Docker container `xpress-sql`) |
| Target | SQLite (`.db` file, Tauri app) |
| Source DB | `XPressDB` on `127.0.0.1:1433` |
| Migration tool | Python (`pymssql` → `sqlite3`) |

---

## Source Data (Live SQL Server)

| Table | Rows |
|-------|------|
| `tbl_company` | 1 |
| `tbl_customer` | 2,519 |
| `tbl_email` | 4 |
| `tbl_invoice_main` | 7,199 |
| `tbl_invoice_sub` | 22,137 |
| `tbl_numbers` | 1 |
| `tbl_product` | 1,077 |
| `tbl_product_type` | 26 |
| `tbl_quotation_main` | 241 |
| `tbl_quotation_sub` | 820 |
| `tbl_receipt` | 5,404 |
| `tbl_setting` | 1 |
| `tbl_user` | 1 |

**Total: ~39,226 rows** across 13 tables.

---

## Connection

```python
server='127.0.0.1'
port=1433
user='sa'
password='XpressBackup123!'
database='XPressDB'
```

Connection confirmed working. Use `TrustServerCertificate=True` (ODBC SSL issue).

---

## Type Conversions

| SQL Server | SQLite | Action |
|-----------|--------|--------|
| `BIGINT IDENTITY` | `INTEGER PRIMARY KEY` | AUTOINCREMENT |
| `NUMERIC(18,2)` | `INTEGER` (cents) | `int(val * 100)` for money fields |
| `VARCHAR(n)` / `VARCHAR(MAX)` | `TEXT` | Direct |
| `DATE` | `TEXT` | ISO 8601 (`YYYY-MM-DD`) |
| `IMAGE` (logo/watermark) | `BLOB` | Binary as-is |
| `BIT` | `INTEGER` | 0 or 1 |
| `NUMERIC(18,0)` | `INTEGER` | Direct |

**Money fields** (must convert to cents):
- `sub_total`, `amount_due`, `vat`, `discount`, `total`
- `paid_amount`, `balance`
- `due_amount` (customer)
- `price` (product)
- `amount_received` (receipt)
- `row_total`, `unit_price` (line items)

**Date fields** (must convert to ISO 8601):
- `invoice_date`, `quo_date`, `receipt_date`, `reg_date`

**Image fields** (store as hex or BLOB):
- `logo`, `watermark` in `tbl_company` — store as base64 TEXT in SQLite

---

## Migration Script

### `migrate.py`

```python
import pymssql
import sqlite3
import base64
import json
from datetime import date, datetime

# Connection
MSSQL = {
    'server': '127.0.0.1',
    'user': 'sa',
    'password': 'XpressBackup123!',
    'database': 'XPressDB'
}
SQLITE_DB = 'xpress.db'

def connect_mssql():
    return pymssql.connect(**MSSQL)

def connect_sqlite():
    return sqlite3.connect(SQLITE_DB)

# Type conversions
def to_cents(val):
    """NUMERIC(18,2) → INTEGER (cents)"""
    if val is None:
        return 0
    return int(round(float(val) * 100))

def to_date(val):
    """DATE → ISO 8601 string"""
    if val is None:
        return None
    if isinstance(val, (datetime,)):
        return val.strftime('%Y-%m-%d')
    if isinstance(val, str):
        return val[:10]
    return str(val)

def to_text(val):
    """Generic text conversion"""
    if val is None:
        return ''
    return str(val)

def to_int(val):
    """INT/BIGINT conversion"""
    if val is None:
        return 0
    return int(val)

def to_bool(val):
    """BIT → INTEGER"""
    if val is None:
        return 0
    return 1 if val else 0

def to_blob(val):
    """IMAGE → base64 TEXT for SQLite"""
    if val is None:
        return None
    if isinstance(val, bytes):
        return base64.b64encode(val).decode('ascii')
    return val  # already string

# Table migration map
# key: table name
# value: (columns, conversion dict, cents_fields, date_fields, blob_fields)
TABLES = {
    'tbl_company': {
        'cols': ['id', 'company_name', 'company_short_name', 'company_code',
                 'address', 'city', 'telephone', 'email', 'facebook_url',
                 'brn', 'vat', 'note1', 'note2', 'note3', 'thanks1', 'thanks2',
                 'currency', 'logo', 'watermark', 'is_active'],
        'convert': {
            'id': to_int,
            'company_name': to_text, 'address': to_text, 'city': to_text,
            'telephone': to_text, 'email': to_text, 'facebook_url': to_text,
            'brn': to_text, 'vat': to_text, 'note1': to_text, 'note2': to_text,
            'note3': to_text, 'thanks1': to_text, 'thanks2': to_text,
            'currency': to_text, 'company_short_name': to_text, 'company_code': to_text,
            'is_active': to_bool,
        },
        'blob': ['logo', 'watermark'],
        'id': 'id',
    },
    'tbl_customer': {
        'cols': ['id', 'customer_name', 'contact', 'customer_type', 'telephone',
                 'address', 'email', 'due_amount', 'title_name', 'reg_date',
                 'ad_due', 'brn', 'vat'],
        'convert': {
            'id': to_int, 'customer_name': to_text, 'contact': to_text,
            'customer_type': to_text, 'telephone': to_text, 'address': to_text,
            'email': to_text, 'title_name': to_text, 'ad_due': to_text,
            'brn': to_text, 'vat': to_text,
        },
        'cents': ['due_amount'],
        'date': ['reg_date'],
        'id': 'id',
    },
    'tbl_user': {
        'cols': ['id', 'user_id', 'password', 'des'],
        'convert': {
            'id': to_int, 'user_id': to_text, 'password': to_text, 'des': to_text,
        },
        'id': 'id',
    },
    'tbl_setting': {
        'cols': ['id', 'isvat', 'vat_per', 'invoice_path', 'quo_path',
                 'report_path', 'invoice_days', 'back_path', 'backup_path',
                 'cash', 'cheque', 'other'],
        'convert': {
            'id': to_int, 'isvat': to_int, 'vat_per': to_int,
            'invoice_path': to_text, 'quo_path': to_text, 'report_path': to_text,
            'invoice_days': to_text, 'back_path': to_text, 'backup_path': to_text,
            'cash': to_text, 'cheque': to_text, 'other': to_text,
        },
        'id': 'id',
    },
    'tbl_numbers': {
        'cols': ['id', 'invoice_no', 'quo_no', 'receipt_no'],
        'convert': {
            'id': to_int, 'invoice_no': to_int, 'quo_no': to_int, 'receipt_no': to_int,
        },
        'id': 'id',
    },
    'tbl_product_type': {
        'cols': ['id', 'type_name'],
        'convert': {'id': to_int, 'type_name': to_text},
        'id': 'id',
    },
    'tbl_product': {
        'cols': ['id', 'product_id', 'product_name', 'type_id', 'company_id', 'price'],
        'convert': {
            'id': to_int, 'product_id': to_text, 'product_name': to_text,
            'type_id': to_int, 'company_id': to_int,
        },
        'cents': ['price'],
        'id': 'id',
    },
    'tbl_email': {
        'cols': ['id', 'client_email', 'sender', 'subject', 'body',
                 'sender_pass', 'identify', 'sub_subject'],
        'convert': {
            'id': to_int, 'client_email': to_text, 'sender': to_text,
            'subject': to_text, 'body': to_text, 'sender_pass': to_text,
            'identify': to_text, 'sub_subject': to_text,
        },
        'id': 'id',
    },
    'tbl_invoice_main': {
        'cols': ['id', 'customer_id', 'invoice_no', 'checklist_no', 'company_id',
                 'sub_total', 'amount_due', 'vat', 'discount', 'total',
                 'per', 'invoice_date', 'case_debit', 'paid_amount', 'balance',
                 'no', 'cr_dr', 'identify', 'print_due'],
        'convert': {
            'id': to_int, 'customer_id': to_int, 'invoice_no': to_text,
            'checklist_no': to_text, 'company_id': to_int,
            'per': to_int, 'case_debit': to_text, 'no': to_text,
            'cr_dr': to_text, 'identify': to_text, 'print_due': to_text,
        },
        'cents': ['sub_total', 'amount_due', 'vat', 'discount', 'total',
                  'paid_amount', 'balance'],
        'date': ['invoice_date'],
        'id': 'id',
    },
    'tbl_invoice_sub': {
        'cols': ['id', 'main_id', 'qty', 'product_id', 'unit_price', 'row_total', 's_no'],
        'convert': {
            'id': to_int, 'main_id': to_int, 'qty': to_int,
            'product_id': to_int, 's_no': to_int,
        },
        'cents': ['unit_price', 'row_total'],
        'id': 'id',
    },
    'tbl_quotation_main': {
        'cols': ['id', 'customer_id', 'quo_no', 'checklist_no', 'company_id',
                 'sub_total', 'amount_due', 'vat', 'discount', 'total', 'per', 'quo_date'],
        'convert': {
            'id': to_int, 'customer_id': to_int, 'quo_no': to_text,
            'checklist_no': to_text, 'company_id': to_int, 'per': to_int,
        },
        'cents': ['sub_total', 'amount_due', 'vat', 'discount', 'total'],
        'date': ['quo_date'],
        'id': 'id',
    },
    'tbl_quotation_sub': {
        'cols': ['id', 'main_id', 'qty', 'product_id', 'unit_price', 'row_total', 's_no'],
        'convert': {
            'id': to_int, 'main_id': to_int, 'qty': to_int,
            'product_id': to_int, 's_no': to_int,
        },
        'cents': ['unit_price', 'row_total'],
        'id': 'id',
    },
    'tbl_receipt': {
        'cols': ['id', 'receipt_no', 'receipt_date', 'customer_id', 'company_id',
                 'due_amount', 'amount_received', 'cheque_no', 'no', 'balance',
                 'cr_dr', 'invoice_no', 'pre_load', 'cash', 'cheque', 'other'],
        'convert': {
            'id': to_int, 'receipt_no': to_text, 'customer_id': to_int,
            'company_id': to_int, 'cheque_no': to_text, 'no': to_text,
            'cr_dr': to_text, 'invoice_no': to_text, 'pre_load': to_text,
            'cash': to_text, 'cheque': to_text, 'other': to_text,
        },
        'cents': ['due_amount', 'amount_received', 'balance'],
        'date': ['receipt_date'],
        'id': 'id',
    },
}

def migrate_table(mssql_conn, sqlite_conn, table_name, spec):
    """Migrate one table from SQL Server to SQLite."""
    print(f"  Migrating {table_name}...", end=' ', flush=True)
    
    cursor_mssql = mssql_conn.cursor(as_dict=True)
    cursor_sqlite = sqlite_conn.cursor()
    
    # Select all rows
    cursor_mssql.execute(f"SELECT * FROM [{table_name}]")
    rows = cursor_mssql.fetchall()
    
    if not rows:
        print("empty, skipping")
        return
    
    # Build insert statement
    cols = spec['cols']
    placeholders = ', '.join(['?' for _ in cols])
    insert_sql = f"INSERT OR REPLACE INTO [{table_name}] ({', '.join(cols)}) VALUES ({placeholders})"
    
    converted = 0
    for row in rows:
        values = []
        convert = spec.get('convert', {})
        cents_fields = spec.get('cents', [])
        date_fields = spec.get('date', [])
        blob_fields = spec.get('blob', [])
        
        for col in cols:
            val = row.get(col)
            if col in cents_fields:
                values.append(to_cents(val))
            elif col in date_fields:
                values.append(to_date(val))
            elif col in blob_fields:
                values.append(to_blob(val))
            elif col in convert:
                values.append(convert[col](val))
            else:
                values.append(val if val is not None else '')
        
        try:
            cursor_sqlite.execute(insert_sql, values)
            converted += 1
        except Exception as e:
            print(f"\n  ERROR on row {converted}: {e}")
            break
    
    sqlite_conn.commit()
    print(f"{converted:,} rows")

def create_schemas(sqlite_conn):
    """Create all SQLite tables."""
    schemas = [
        # Core
        """CREATE TABLE IF NOT EXISTS tbl_company (
            id INTEGER PRIMARY KEY,
            company_name TEXT, company_short_name TEXT, company_code TEXT,
            address TEXT, city TEXT, telephone TEXT, email TEXT,
            facebook_url TEXT, brn TEXT, vat TEXT,
            note1 TEXT, note2 TEXT, note3 TEXT,
            thanks1 TEXT, thanks2 TEXT,
            currency TEXT, logo TEXT, watermark TEXT, is_active INTEGER DEFAULT 1
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_customer (
            id INTEGER PRIMARY KEY,
            customer_name TEXT, contact TEXT, customer_type TEXT,
            telephone TEXT, address TEXT, email TEXT,
            due_amount INTEGER DEFAULT 0,
            title_name TEXT, reg_date TEXT,
            ad_due TEXT DEFAULT 'Advance', brn TEXT, vat TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_user (
            id INTEGER PRIMARY KEY,
            user_id TEXT, password TEXT, des TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_setting (
            id INTEGER PRIMARY KEY,
            isvat INTEGER, vat_per INTEGER,
            invoice_path TEXT, quo_path TEXT, report_path TEXT,
            invoice_days TEXT, back_path TEXT, backup_path TEXT,
            cash TEXT, cheque TEXT, other TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_numbers (
            id INTEGER PRIMARY KEY,
            invoice_no INTEGER DEFAULT 1, quo_no INTEGER DEFAULT 1, receipt_no INTEGER DEFAULT 1
        )""",
        # Products
        """CREATE TABLE IF NOT EXISTS tbl_product_type (
            id INTEGER PRIMARY KEY, type_name TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_product (
            id INTEGER PRIMARY KEY,
            product_id TEXT, product_name TEXT,
            type_id INTEGER, company_id INTEGER DEFAULT 1,
            price INTEGER
        )""",
        # Email
        """CREATE TABLE IF NOT EXISTS tbl_email (
            id INTEGER PRIMARY KEY,
            client_email TEXT, sender TEXT, subject TEXT, body TEXT,
            sender_pass TEXT, identify TEXT, sub_subject TEXT
        )""",
        # Transactions
        """CREATE TABLE IF NOT EXISTS tbl_invoice_main (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER, invoice_no TEXT, checklist_no TEXT,
            company_id INTEGER DEFAULT 1,
            sub_total INTEGER, amount_due INTEGER, vat INTEGER,
            discount INTEGER, total INTEGER, per INTEGER,
            invoice_date TEXT,
            case_debit TEXT, paid_amount INTEGER, balance INTEGER,
            no TEXT, cr_dr TEXT, identify TEXT, print_due TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_invoice_sub (
            id INTEGER PRIMARY KEY,
            main_id INTEGER, qty INTEGER, product_id INTEGER,
            unit_price INTEGER, row_total INTEGER, s_no INTEGER
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_quotation_main (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER, quo_no TEXT, checklist_no TEXT,
            company_id INTEGER DEFAULT 1,
            sub_total INTEGER, amount_due INTEGER, vat INTEGER,
            discount INTEGER, total INTEGER, per INTEGER, quo_date TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_quotation_sub (
            id INTEGER PRIMARY KEY,
            main_id INTEGER, qty INTEGER, product_id INTEGER,
            unit_price INTEGER, row_total INTEGER, s_no INTEGER
        )""",
        """CREATE TABLE IF NOT EXISTS tbl_receipt (
            id INTEGER PRIMARY KEY,
            receipt_no TEXT, receipt_date TEXT, customer_id INTEGER,
            company_id INTEGER DEFAULT 1,
            due_amount INTEGER, amount_received INTEGER,
            cheque_no TEXT, no TEXT, balance INTEGER,
            cr_dr TEXT, invoice_no TEXT, pre_load TEXT,
            cash TEXT DEFAULT '0', cheque TEXT DEFAULT '0', other TEXT DEFAULT '0'
        )""",
        # Indexes
        "CREATE INDEX IF NOT EXISTS idx_invoice_cust ON tbl_invoice_main(customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_invoice_company ON tbl_invoice_main(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_invoice_date ON tbl_invoice_main(invoice_date)",
        "CREATE INDEX IF NOT EXISTS idx_invoice_sub_main ON tbl_invoice_sub(main_id)",
        "CREATE INDEX IF NOT EXISTS idx_receipt_cust ON tbl_receipt(customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_receipt_company ON tbl_receipt(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_product_company ON tbl_product(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_quotation_cust ON tbl_quotation_main(customer_id)",
    ]
    
    for sql in schemas:
        sqlite_conn.execute(sql)
    sqlite_conn.commit()
    print("  Schemas created.")

def main():
    print("=== SQL Server → SQLite Migration ===\n")
    
    # Connect
    print("Connecting to SQL Server...")
    mssql_conn = connect_mssql()
    print("Connecting to SQLite...")
    sqlite_conn = connect_sqlite()
    
    # Create schemas
    print("\nCreating SQLite schemas...")
    create_schemas(sqlite_conn)
    
    # Migrate tables
    print("\nMigrating tables...")
    for table_name, spec in TABLES.items():
        try:
            migrate_table(mssql_conn, sqlite_conn, table_name, spec)
        except Exception as e:
            print(f"  ERROR: {e}")
    
    # Verify
    print("\n=== Verification ===")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    for (t,) in tables:
        cursor.execute(f"SELECT COUNT(*) FROM [{t}]")
        cnt = cursor.fetchone()[0]
        print(f"  {t}: {cnt:,} rows")
    
    mssql_conn.close()
    sqlite_conn.close()
    print(f"\nDone. SQLite database saved to: {SQLITE_DB}")

if __name__ == '__main__':
    main()
```

Save as `tools/migrate.py` in the project.

---

## Running the Migration

```bash
# Ensure pymssql is installed
pip install pymssql

# Run
python tools/migrate.py

# Output
# === SQL Server → SQLite Migration ===
#
# Creating SQLite schemas...
#   Schemas created.
#
# Migrating tables...
#   tbl_company: 1 rows
#   tbl_customer: 2,519 rows
#   tbl_user: 1 rows
#   tbl_setting: 1 rows
#   tbl_numbers: 1 rows
#   tbl_product_type: 26 rows
#   tbl_product: 1,077 rows
#   tbl_email: 4 rows
#   tbl_invoice_main: 7,199 rows
#   tbl_invoice_sub: 22,137 rows
#   tbl_quotation_main: 241 rows
#   tbl_quotation_sub: 820 rows
#   tbl_receipt: 5,404 rows
#
# Done. SQLite database saved to: xpress.db
```

---

## Post-Migration Steps

1. **Verify data**:
   ```python
   # Check money values are in cents
   cursor.execute("SELECT MAX(total) FROM tbl_invoice_main")
   # Should be large integer (e.g., 1716562670 = ~17M MUR), not float 17165626.70
   
   # Check dates are ISO format
   cursor.execute("SELECT invoice_date FROM tbl_invoice_main LIMIT 5")
   # Should be '2024-03-15' not 'Mar 15 2024'
   
   # Check customer count
   cursor.execute("SELECT COUNT(*) FROM tbl_customer")
   # Should be 2519
   ```

2. **Test with DB Browser for SQLite** — open `xpress.db` and verify key tables

3. **Ship with Tauri app** — bundle `xpress.db` in app resources or run migration on first launch

4. **Delete the tool** — migration script is one-time use, remove from final delivery

---

## Company ID Note

Original app has `tbl_company` with ID=1 (X-Press Ironing Ltd). Multi-company spec adds `company_id` to transaction tables — **all existing records have `company_id = 1`**. The split-invoice feature for XPW (X-Press Wash, ID=2) is planned for future.

---

## WhatsApp Tables (Future)

After initial migration, run additional migration for:
- `tbl_whatsapp` — WhatsApp templates
- `tbl_whatsapp_settings` — API credentials
- `tbl_whatsapp_log` — message history

Schema in `docs/specs/40-whatsapp-integration.md`.

---

## Files Created

- `tools/migrate.py` — Full migration script
- `xpress.db` — Resulting SQLite database (~15-20MB estimated)
- Ship `xpress.db` with Tauri app in `%APPDATA%\com.ramma.xpress\`