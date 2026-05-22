#!/usr/bin/env python3
"""
SQL Server → SQLite Migration Tool for XPress Billing
Run: python tools/migrate.py [--demo]
"""

import argparse
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'xpress.db'

def get_connection():
    return sqlite3.connect(str(DB_PATH))

def create_tables(conn):
    """Create all tables from migration SQL."""
    migration_sql = Path(__file__).parent.parent / 'src-tauri' / 'migrations' / '001_initial.sql'
    if not migration_sql.exists():
        print(f"ERROR: {migration_sql} not found")
        sys.exit(1)
    
    with open(migration_sql, 'r') as f:
        sql = f.read()
    
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if not stmt or stmt.startswith('--'):
            continue
        try:
            conn.execute(stmt)
        except sqlite3.OperationalError as e:
            if 'already exists' not in str(e):
                raise
    
    conn.commit()
    print("  Tables created")

def count_tables(conn):
    """Count rows in all tables."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    print("\n=== Row Counts ===")
    for (t,) in tables:
        cursor.execute(f"SELECT COUNT(*) FROM [{t}]")
        cnt = cursor.fetchone()[0]
        print(f"  {t}: {cnt:,} rows")

def migrate_from_sqlserver(conn):
    """Migrate from SQL Server (requires pymssql + Docker)."""
    try:
        import pymssql
    except ImportError:
        print("ERROR: pymssql not installed. Run: pip install pymssql")
        sys.exit(1)
    
    MSSQL = {
        'server': '127.0.0.1',
        'user': 'sa',
        'password': 'XpressBackup123!',
        'database': 'XPressDB'
    }
    
    print("Connecting to SQL Server...")
    mssql_conn = pymssql.connect(**MSSQL)
    
    # Type conversions
    def to_cents(val):
        if val is None: return 0
        return int(round(float(val) * 100))
    
    def to_date(val):
        if val is None: return None
        if hasattr(val, 'strftime'):
            return val.strftime('%Y-%m-%d')
        return str(val)[:10]
    
    def to_text(val):
        if val is None: return ''
        return str(val)
    
    def to_int(val):
        if val is None: return 0
        return int(val)
    
    def to_blob(val):
        if val is None: return None
        if isinstance(val, bytes):
            import base64
            return base64.b64encode(val).decode('ascii')
        return val
    
    TABLES = {
        'tbl_company': {
            'cols': ['id', 'company_name', 'contact_person', 'address', 'telephone', 'email',
                     'brn', 'vat', 'bank_name', 'bank_account', 'bank_branch', 'logo', 'watermark', 'is_active'],
            'cents': [], 'date': [], 'blob': ['logo', 'watermark'],
        },
        'tbl_customer': {
            'cols': ['id', 'customer_name', 'contact', 'telephone', 'address', 'email',
                     'due_amount', 'title_name', 'reg_date', 'ad_due', 'brn', 'vat', 'company_id', 'is_deleted'],
            'cents': ['due_amount'], 'date': ['reg_date'], 'blob': [],
        },
        'tbl_user': {
            'cols': ['id', 'user_id', 'password', 'des', 'company_id', 'is_deleted'],
            'cents': [], 'date': [], 'blob': [],
        },
        'tbl_setting': {
            'cols': ['id', 'isvat', 'vat_per', 'invoice_days', 'invoice_path', 'quo_path',
                     'report_path', 'back_path', 'backup_path', 'cash', 'cheque', 'other'],
            'cents': ['vat_per'], 'date': [], 'blob': [],
        },
        'tbl_numbers': {
            'cols': ['id', 'invoice_no', 'quo_no', 'receipt_no'],
            'cents': [], 'date': [], 'blob': [],
        },
        'tbl_product_type': {
            'cols': ['id', 'type_name', 'is_deleted'],
            'cents': [], 'date': [], 'blob': [],
        },
        'tbl_product': {
            'cols': ['id', 'product_id', 'product_name', 'type_id', 'company_id', 'price', 'is_deleted'],
            'cents': ['price'], 'date': [], 'blob': [],
        },
        'tbl_email': {
            'cols': ['id', 'template_type', 'subject', 'body', 'sender_email', 'sender_pass'],
            'cents': [], 'date': [], 'blob': [],
        },
        'tbl_invoice_main': {
            'cols': ['id', 'customer_id', 'invoice_no', 'checklist_no', 'company_id',
                     'sub_total', 'amount_due', 'vat', 'discount', 'total', 'per', 'invoice_date',
                     'case_debit', 'paid_amount', 'balance', 'no', 'cr_dr', 'identify', 'print_due', 'is_deleted'],
            'cents': ['sub_total', 'amount_due', 'vat', 'discount', 'total', 'paid_amount', 'balance'],
            'date': ['invoice_date'], 'blob': [],
        },
        'tbl_invoice_sub': {
            'cols': ['id', 'main_id', 'qty', 'product_id', 'unit_price', 'row_total', 's_no', 'company_id', 'is_deleted'],
            'cents': ['unit_price', 'row_total'], 'date': [], 'blob': [],
        },
        'tbl_quotation_main': {
            'cols': ['id', 'customer_id', 'quo_no', 'company_id',
                     'sub_total', 'amount_due', 'vat', 'discount', 'total', 'per', 'quo_date',
                     'case_debit', 'paid_amount', 'balance', 'no', 'cr_dr', 'identify', 'is_deleted'],
            'cents': ['sub_total', 'amount_due', 'vat', 'discount', 'total', 'paid_amount', 'balance'],
            'date': ['quo_date'], 'blob': [],
        },
        'tbl_quotation_sub': {
            'cols': ['id', 'main_id', 'qty', 'product_id', 'unit_price', 'row_total', 's_no', 'is_deleted'],
            'cents': ['unit_price', 'row_total'], 'date': [], 'blob': [],
        },
        'tbl_receipt': {
            'cols': ['id', 'receipt_no', 'customer_id', 'amount_received', 'payment_mode',
                     'cheque_no', 'bank_name', 'invoice_reference', 'cr_dr', 'receipt_date',
                     'notes', 'company_id'],
            'cents': ['amount_received'], 'date': ['receipt_date'], 'blob': [],
        },
    }
    
    print("\nMigrating tables...")
    cursor_mssql = mssql_conn.cursor(as_dict=True)
    cursor_sqlite = conn.cursor()
    
    for table_name, spec in TABLES.items():
        print(f"  {table_name}...", end=' ', flush=True)
        try:
            cursor_mssql.execute(f"SELECT * FROM [{table_name}]")
            rows = cursor_mssql.fetchall()
            if not rows:
                print("empty")
                continue
            
            cols = spec['cols']
            placeholders = ', '.join(['?' for _ in cols])
            insert_sql = f"INSERT OR REPLACE INTO [{table_name}] ({', '.join(cols)}) VALUES ({placeholders})"
            
            converted = 0
            for row in rows:
                values = []
                for col in cols:
                    val = row.get(col)
                    if col in spec['cents']:
                        values.append(to_cents(val))
                    elif col in spec['date']:
                        values.append(to_date(val))
                    elif col in spec['blob']:
                        values.append(to_blob(val))
                    else:
                        values.append(to_int(val) if val is not None else 0)
                
                cursor_sqlite.execute(insert_sql, values)
                converted += 1
            
            conn.commit()
            print(f"{converted:,} rows")
        except Exception as e:
            print(f"ERROR: {e}")
    
    mssql_conn.close()

def seed_demo_data(conn):
    """Insert demo data for testing."""
    print("\nSeeding demo data...")
    
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM tbl_company")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tbl_company (id, company_name, contact_person, address, is_active)
            VALUES (1, 'Demo Company', 'Mr Demo', 'Test Address', 1)
        """)
        print("  tbl_company: 1 row")
    
    cursor.execute("SELECT COUNT(*) FROM tbl_user")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tbl_user (id, user_id, password, des, company_id)
            VALUES (1, 'ADMIN', 'admin', 'Administrator', 1)
        """)
        print("  tbl_user: admin/admin")
    
    cursor.execute("SELECT COUNT(*) FROM tbl_setting")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tbl_setting (id, isvat, vat_per, invoice_days, cash, cheque, other)
            VALUES (1, 1, 5, '7', 'Cash', 'Cheque', 'Other')
        """)
        print("  tbl_setting: VAT 5%")
    
    cursor.execute("SELECT COUNT(*) FROM tbl_numbers")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tbl_numbers (id, invoice_no, quo_no, receipt_no)
            VALUES (1, 1, 1, 1)
        """)
        print("  tbl_numbers: all 1")
    
    cursor.execute("SELECT COUNT(*) FROM tbl_product_type")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO tbl_product_type (id, type_name) VALUES (1, 'Ironing')")
        cursor.execute("INSERT INTO tbl_product_type (id, type_name) VALUES (2, 'Dryclean')")
        print("  tbl_product_type: Ironing, Dryclean")
    
    cursor.execute("SELECT COUNT(*) FROM tbl_customer")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tbl_customer (id, customer_name, contact, telephone, ad_due, company_id)
            VALUES (1, 'Mr Demo Customer', 'John Doe', '12345678', 'Advance', 1)
        """)
        print("  tbl_customer: Mr Demo Customer")
    
    cursor.execute("SELECT COUNT(*) FROM tbl_product")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tbl_product (id, product_name, type_id, company_id, price)
            VALUES (1, 'Ironing Service', 1, 1, 10000)
        """)
        cursor.execute("""
            INSERT INTO tbl_product (id, product_name, type_id, company_id, price)
            VALUES (2, 'Dryclean Shirt', 2, 1, 15000)
        """)
        print("  tbl_product: Ironing Service (100.00 MUR), Dryclean Shirt (150.00 MUR)")
    
    conn.commit()
    print("  Demo data seeded")

def main():
    parser = argparse.ArgumentParser(description='Migrate SQL Server to SQLite')
    parser.add_argument('--demo', action='store_true', help='Seed demo data only')
    parser.add_argument('--sqlserver', action='store_true', help='Migrate from SQL Server')
    args = parser.parse_args()
    
    print("=== XPress Billing Migration Tool ===\n")
    print(f"Database: {DB_PATH}")
    
    conn = get_connection()
    
    create_tables(conn)
    
    if args.demo:
        seed_demo_data(conn)
    elif args.sqlserver:
        migrate_from_sqlserver(conn)
    else:
        print("\nOptions:")
        print("  --demo     Seed demo data (no SQL Server)")
        print("  --sqlserver Migrate from SQL Server (requires Docker)")
    
    count_tables(conn)
    conn.close()
    print(f"\nDone!")

if __name__ == '__main__':
    main()