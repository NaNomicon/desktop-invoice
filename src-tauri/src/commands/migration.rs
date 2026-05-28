use base64::Engine;
use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tiberius::{AuthMethod, Client, Config, EncryptionLevel, Row};
use tokio::net::{TcpStream, UdpSocket};
use tokio::time::{timeout, Duration};
use tokio_util::compat::TokioAsyncReadCompatExt;

// ─── Public Types ────────────────────────────────────────────────────────────

/// Connection configuration for the source SQL Server database.
/// Defaults to the Docker container `xpress-sql` on port 1433.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SqlServerConfig {
    pub host: String,
    pub port: u16,
    pub instance: Option<String>,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl Default for SqlServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".into(),
            port: 1433,
            instance: None,
            user: "sa".into(),
            password: "XpressBackup123!".into(),
            database: "XPressDB".into(),
        }
    }
}

/// Progress event emitted during migration.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MigrationProgress {
    pub table_name: String,
    pub rows_migrated: u32,
    pub total_rows: u32,
    pub phase: String,
    pub error: Option<String>,
}

/// Result for a single table migration.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TableMigrationResult {
    pub table_name: String,
    pub rows_migrated: u32,
    pub success: bool,
    pub error: Option<String>,
}

/// Overall migration result returned to the frontend.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MigrationResult {
    pub results: Vec<TableMigrationResult>,
    pub total_rows: u32,
    pub success: bool,
    pub error: Option<String>,
}

const MIGRATION_EVENT: &str = "migration-progress";
const SQL_BROWSER_PORT: u16 = 1434;
const SQL_BROWSER_TIMEOUT: Duration = Duration::from_secs(3);

// ─── Table Specification ──────────────────────────────────────────────────────

struct TableSpec {
    name: &'static str,
    cols: &'static [&'static str],
    money: &'static [&'static str],
    dates: &'static [&'static str],
    blobs: &'static [&'static str],
}

static TABLES: &[TableSpec] = &[
    TableSpec {
        name: "tbl_company",
        cols: &[
            "id",
            "company_name",
            "company_short_name",
            "company_code",
            "contact_person",
            "address",
            "city",
            "telephone",
            "email",
            "facebook_url",
            "brn",
            "vat",
            "note1",
            "note2",
            "note3",
            "thanks1",
            "thanks2",
            "currency",
            "logo",
            "watermark",
            "is_active",
        ],
        money: &[],
        dates: &[],
        blobs: &["logo", "watermark"],
    },
    TableSpec {
        name: "tbl_user",
        cols: &[
            "id",
            "user_id",
            "password",
            "des",
            "company_id",
            "is_deleted",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_setting",
        cols: &[
            "id",
            "isvat",
            "vat_per",
            "invoice_path",
            "quo_path",
            "report_path",
            "invoice_days",
            "back_path",
            "backup_path",
            "cash",
            "cheque",
            "other",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_numbers",
        cols: &["id", "invoice_no", "quo_no", "receipt_no"],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_product_type",
        cols: &["id", "type_name", "is_deleted"],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_customer",
        cols: &[
            "id",
            "customer_name",
            "contact",
            "customer_type",
            "telephone",
            "address",
            "email",
            "due_amount",
            "title_name",
            "reg_date",
            "ad_due",
            "brn",
            "vat",
            "company_id",
            "is_deleted",
        ],
        money: &["due_amount"],
        dates: &["reg_date"],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_product",
        cols: &[
            "id",
            "product_id",
            "product_name",
            "type_id",
            "company_id",
            "price",
            "is_deleted",
        ],
        money: &["price"],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_email",
        cols: &[
            "id",
            "template_type",
            "subject",
            "body",
            "sender_email",
            "sender_pass",
            "client_email",
            "sender",
            "identify",
            "sub_subject",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_wa_template",
        cols: &[
            "id",
            "template_name",
            "template_id",
            "body",
            "status",
            "created_at",
            "updated_at",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_whatsapp",
        cols: &[
            "id",
            "identify",
            "content_sid",
            "body",
            "header_type",
            "header_url",
            "footer",
            "status",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_whatsapp_settings",
        cols: &[
            "id",
            "company_id",
            "phone_id",
            "waba_id",
            "access_token",
            "display_name",
            "is_active",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_whatsapp_log",
        cols: &[
            "id",
            "customer_id",
            "identify",
            "recipient_phone",
            "message_sid",
            "status",
            "error_code",
            "error_message",
            "sent_at",
        ],
        money: &[],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_invoice_main",
        cols: &[
            "id",
            "customer_id",
            "invoice_no",
            "checklist_no",
            "company_id",
            "sub_total",
            "amount_due",
            "vat",
            "discount",
            "total",
            "per",
            "invoice_date",
            "case_debit",
            "paid_amount",
            "balance",
            "no",
            "cr_dr",
            "identify",
            "print_due",
            "is_deleted",
        ],
        money: &[
            "sub_total",
            "amount_due",
            "vat",
            "discount",
            "total",
            "paid_amount",
            "balance",
        ],
        dates: &["invoice_date"],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_invoice_sub",
        cols: &[
            "id",
            "main_id",
            "qty",
            "product_id",
            "unit_price",
            "row_total",
            "s_no",
            "company_id",
            "is_deleted",
        ],
        money: &["unit_price", "row_total"],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_quotation_main",
        cols: &[
            "id",
            "customer_id",
            "quo_no",
            "checklist_no",
            "company_id",
            "sub_total",
            "amount_due",
            "vat",
            "discount",
            "total",
            "per",
            "quo_date",
            "case_debit",
            "paid_amount",
            "balance",
            "no",
            "cr_dr",
            "identify",
            "is_deleted",
        ],
        money: &[
            "sub_total",
            "amount_due",
            "vat",
            "discount",
            "total",
            "paid_amount",
            "balance",
        ],
        dates: &["quo_date"],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_quotation_sub",
        cols: &[
            "id",
            "main_id",
            "qty",
            "product_id",
            "unit_price",
            "row_total",
            "s_no",
            "is_deleted",
        ],
        money: &["unit_price", "row_total"],
        dates: &[],
        blobs: &[],
    },
    TableSpec {
        name: "tbl_receipt",
        cols: &[
            "id",
            "receipt_no",
            "receipt_date",
            "customer_id",
            "company_id",
            "due_amount",
            "amount_received",
            "cheque_no",
            "no",
            "balance",
            "cr_dr",
            "invoice_no",
            "pre_load",
            "cash",
            "cheque",
            "other",
        ],
        money: &["due_amount", "amount_received", "balance"],
        dates: &["receipt_date"],
        blobs: &[],
    },
];

// ─── Type Extraction ──────────────────────────────────────────────────────────

#[derive(Clone, Copy)]
enum SourceColumnKind {
    Money,
    Date,
    Blob,
    Text,
    Integer,
    Float,
    Boolean,
    Other,
}

struct SourceColumnInfo {
    kind: SourceColumnKind,
}

fn source_column_kind(data_type: &str, spec_kind: SourceColumnKind) -> SourceColumnKind {
    match spec_kind {
        SourceColumnKind::Money | SourceColumnKind::Date | SourceColumnKind::Blob => spec_kind,
        _ => match data_type.to_ascii_lowercase().as_str() {
            "money" | "smallmoney" | "decimal" | "numeric" => SourceColumnKind::Money,
            "date" | "datetime" | "datetime2" | "smalldatetime" | "datetimeoffset" => {
                SourceColumnKind::Date
            }
            "image" | "binary" | "varbinary" => SourceColumnKind::Blob,
            "bit" => SourceColumnKind::Boolean,
            "tinyint" | "smallint" | "int" | "bigint" => SourceColumnKind::Integer,
            "real" | "float" => SourceColumnKind::Float,
            "char" | "nchar" | "varchar" | "nvarchar" | "text" | "ntext" | "uniqueidentifier"
            | "xml" => SourceColumnKind::Text,
            _ => SourceColumnKind::Other,
        },
    }
}

fn spec_column_kind(
    col_name: &str,
    money_set: &std::collections::HashSet<&str>,
    date_set: &std::collections::HashSet<&str>,
    blob_set: &std::collections::HashSet<&str>,
) -> SourceColumnKind {
    if money_set.contains(col_name) {
        SourceColumnKind::Money
    } else if date_set.contains(col_name) {
        SourceColumnKind::Date
    } else if blob_set.contains(col_name) {
        SourceColumnKind::Blob
    } else {
        SourceColumnKind::Other
    }
}

async fn load_source_schema(
    client: &mut Client<impl futures::io::AsyncRead + futures::io::AsyncWrite + Unpin + Send>,
    table_name: &str,
    money_set: &std::collections::HashSet<&str>,
    date_set: &std::collections::HashSet<&str>,
    blob_set: &std::collections::HashSet<&str>,
) -> Result<std::collections::HashMap<String, SourceColumnInfo>, String> {
    let rows: Vec<Row> = client
        .query(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @P1 ORDER BY ORDINAL_POSITION",
            &[&table_name],
        )
        .await
        .map_err(|e| format!("{table_name}: schema query failed: {e}"))?
        .into_first_result()
        .await
        .map_err(|e| format!("{table_name}: schema fetch failed: {e}"))?;

    rows.into_iter()
        .map(|row| {
            let name = row
                .try_get::<&str, usize>(0)
                .map_err(|e| format!("{table_name}: COLUMN_NAME read failed: {e}"))?
                .ok_or_else(|| format!("{table_name}: COLUMN_NAME was NULL"))?
                .to_string();
            let data_type = row
                .try_get::<&str, usize>(1)
                .map_err(|e| format!("{table_name}: DATA_TYPE read failed for {name}: {e}"))?
                .ok_or_else(|| format!("{table_name}: DATA_TYPE was NULL for {name}"))?;
            let spec_kind = spec_column_kind(&name, money_set, date_set, blob_set);
            Ok((
                name,
                SourceColumnInfo {
                    kind: source_column_kind(data_type, spec_kind),
                },
            ))
        })
        .collect()
}

fn extract_cell(row: &Row, idx: usize, kind: SourceColumnKind) -> Option<String> {
    if idx >= row.columns().len() {
        return None;
    }

    match kind {
        SourceColumnKind::Money => extract_money(row, idx),
        SourceColumnKind::Date => extract_date(row, idx),
        SourceColumnKind::Blob => extract_blob(row, idx),
        SourceColumnKind::Text => extract_text(row, idx),
        SourceColumnKind::Integer => extract_integer(row, idx),
        SourceColumnKind::Float => extract_float(row, idx),
        SourceColumnKind::Boolean => extract_bool(row, idx),
        SourceColumnKind::Other => extract_plain(row, idx),
    }
}

fn extract_money(row: &Row, idx: usize) -> Option<String> {
    // NUMERIC/DECIMAL with decimal places → cents
    if let Ok(Some(val)) = row.try_get::<f64, usize>(idx) {
        let cents = (val * 100.0).round() as i64;
        return Some(cents.to_string());
    }
    // BIGINT/INT (stored as whole numbers, treat as cents already)
    // Or legacy: some money fields might be stored as plain integers
    if let Ok(Some(val)) = row.try_get::<i64, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<i32, usize>(idx) {
        return Some((val as i64).to_string());
    }
    None
}

fn extract_date(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<NaiveDate, usize>(idx) {
        return Some(val.format("%Y-%m-%d").to_string());
    }
    if let Ok(Some(val)) = row.try_get::<NaiveDateTime, usize>(idx) {
        return Some(val.format("%Y-%m-%d").to_string());
    }
    // Fallback: try as string and truncate to date part
    if let Ok(Some(val)) = row.try_get::<&str, usize>(idx) {
        let end = val.len().min(10);
        return Some(val[..end].to_string());
    }
    None
}

fn extract_blob(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<&[u8], usize>(idx) {
        let encoded = base64::engine::general_purpose::STANDARD.encode(val);
        return Some(encoded);
    }
    // Already a string (pre-encoded)?
    if let Ok(Some(val)) = row.try_get::<&str, usize>(idx) {
        return Some(val.to_string());
    }
    None
}

fn extract_text(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<&str, usize>(idx) {
        return Some(val.to_string());
    }
    extract_plain(row, idx)
}

fn extract_integer(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<i64, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<i32, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<i16, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<u8, usize>(idx) {
        return Some(val.to_string());
    }
    extract_plain(row, idx)
}

fn extract_float(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<f64, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<f32, usize>(idx) {
        return Some(val.to_string());
    }
    extract_plain(row, idx)
}

fn extract_bool(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<bool, usize>(idx) {
        return Some(if val { "1" } else { "0" }.to_string());
    }
    extract_integer(row, idx)
}

fn extract_plain(row: &Row, idx: usize) -> Option<String> {
    if let Ok(Some(val)) = row.try_get::<&str, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<i64, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<i32, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<f64, usize>(idx) {
        return Some(val.to_string());
    }
    if let Ok(Some(val)) = row.try_get::<bool, usize>(idx) {
        return Some(if val { "1" } else { "0" }.to_string());
    }
    None
}

fn build_col_index(row: &Row) -> std::collections::HashMap<String, usize> {
    row.columns()
        .iter()
        .enumerate()
        .map(|(i, col)| (col.name().to_string(), i))
        .collect()
}

// ─── SQLite Schema ───────────────────────────────────────────────────────────

fn ensure_sqlite_schema(conn: &Mutex<rusqlite::Connection>) -> Result<(), String> {
    let conn = conn.lock().map_err(|e| format!("mutex lock failed: {e}"))?;
    let schemas = &[
        "CREATE TABLE IF NOT EXISTS tbl_company (
            id INTEGER PRIMARY KEY, company_name TEXT, company_short_name TEXT,
            company_code TEXT, contact_person TEXT, address TEXT, city TEXT,
            telephone TEXT, email TEXT, facebook_url TEXT, brn TEXT, vat TEXT,
            note1 TEXT, note2 TEXT, note3 TEXT, thanks1 TEXT, thanks2 TEXT,
            currency TEXT, bank_name TEXT, bank_account TEXT, bank_branch TEXT,
            logo TEXT, watermark TEXT, is_active INTEGER DEFAULT 1
        )",
        "CREATE TABLE IF NOT EXISTS tbl_user (
            id INTEGER PRIMARY KEY, user_id TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, des TEXT, company_id INTEGER DEFAULT 1,
            is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_setting (
            id INTEGER PRIMARY KEY, isvat INTEGER DEFAULT 1,
            vat_per INTEGER DEFAULT 5, invoice_path TEXT, quo_path TEXT,
            report_path TEXT, invoice_days TEXT, back_path TEXT,
            backup_path TEXT, cash TEXT, cheque TEXT, other TEXT,
            wa_access_token TEXT, wa_phone_number_id TEXT
        )",
        "CREATE TABLE IF NOT EXISTS tbl_numbers (
            id INTEGER PRIMARY KEY, invoice_no INTEGER DEFAULT 1,
            quo_no INTEGER DEFAULT 1, receipt_no INTEGER DEFAULT 1
        )",
        "CREATE TABLE IF NOT EXISTS tbl_product_type (
            id INTEGER PRIMARY KEY, type_name TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_customer (
            id INTEGER PRIMARY KEY, customer_name TEXT NOT NULL, contact TEXT,
            customer_type TEXT, telephone TEXT, address TEXT, email TEXT,
            due_amount INTEGER DEFAULT 0, title_name TEXT, reg_date TEXT,
            ad_due TEXT DEFAULT 'Advance', brn TEXT, vat TEXT,
            company_id INTEGER DEFAULT 1, is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_product (
            id INTEGER PRIMARY KEY, product_id TEXT, product_name TEXT NOT NULL,
            type_id INTEGER, company_id INTEGER DEFAULT 1,
            price INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_email (
            id INTEGER PRIMARY KEY, template_type TEXT, subject TEXT, body TEXT,
            sender_email TEXT, sender_pass TEXT, client_email TEXT,
            sender TEXT, identify TEXT, sub_subject TEXT
        )",
        "CREATE TABLE IF NOT EXISTS tbl_wa_template (
            id INTEGER PRIMARY KEY, template_name TEXT NOT NULL,
            template_id TEXT NOT NULL, body TEXT, status TEXT DEFAULT 'PENDING',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        "CREATE TABLE IF NOT EXISTS tbl_whatsapp (
            id INTEGER PRIMARY KEY, identify TEXT NOT NULL,
            content_sid TEXT NOT NULL, body TEXT NOT NULL,
            header_type TEXT, header_url TEXT, footer TEXT, status TEXT
        )",
        "CREATE TABLE IF NOT EXISTS tbl_whatsapp_settings (
            id INTEGER PRIMARY KEY, company_id INTEGER DEFAULT 1,
            phone_id TEXT NOT NULL, waba_id TEXT NOT NULL,
            access_token TEXT NOT NULL, display_name TEXT,
            is_active INTEGER DEFAULT 1
        )",
        "CREATE TABLE IF NOT EXISTS tbl_whatsapp_log (
            id INTEGER PRIMARY KEY, customer_id INTEGER, identify TEXT,
            recipient_phone TEXT NOT NULL, message_sid TEXT, status TEXT,
            error_code TEXT, error_message TEXT,
            sent_at TEXT DEFAULT (datetime('now'))
        )",
        "CREATE TABLE IF NOT EXISTS tbl_invoice_main (
            id INTEGER PRIMARY KEY, customer_id INTEGER, invoice_no TEXT,
            checklist_no TEXT, company_id INTEGER DEFAULT 1,
            sub_total INTEGER DEFAULT 0, amount_due INTEGER DEFAULT 0,
            vat INTEGER DEFAULT 0, discount INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0, per INTEGER DEFAULT 0,
            invoice_date TEXT, case_debit TEXT,
            paid_amount INTEGER DEFAULT 0, balance INTEGER DEFAULT 0,
            no TEXT, cr_dr TEXT, identify TEXT, print_due TEXT,
            is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_invoice_sub (
            id INTEGER PRIMARY KEY, main_id INTEGER, qty INTEGER DEFAULT 0,
            product_id INTEGER, unit_price INTEGER DEFAULT 0,
            row_total INTEGER DEFAULT 0, s_no INTEGER DEFAULT 0,
            company_id INTEGER DEFAULT 1, is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_quotation_main (
            id INTEGER PRIMARY KEY, customer_id INTEGER, quo_no TEXT,
            checklist_no TEXT, company_id INTEGER DEFAULT 1,
            sub_total INTEGER DEFAULT 0, amount_due INTEGER DEFAULT 0,
            vat INTEGER DEFAULT 0, discount INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0, per INTEGER DEFAULT 0, quo_date TEXT,
            case_debit TEXT, paid_amount INTEGER DEFAULT 0,
            balance INTEGER DEFAULT 0, no TEXT, cr_dr TEXT, identify TEXT,
            is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_quotation_sub (
            id INTEGER PRIMARY KEY, main_id INTEGER, qty INTEGER DEFAULT 0,
            product_id INTEGER, unit_price INTEGER DEFAULT 0,
            row_total INTEGER DEFAULT 0, s_no INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS tbl_receipt (
            id INTEGER PRIMARY KEY, receipt_no TEXT, receipt_date TEXT,
            customer_id INTEGER, company_id INTEGER DEFAULT 1,
            due_amount INTEGER DEFAULT 0, amount_received INTEGER DEFAULT 0,
            cheque_no TEXT, no TEXT, balance INTEGER DEFAULT 0,
            cr_dr TEXT, invoice_no TEXT, pre_load TEXT,
            cash TEXT DEFAULT '0', cheque TEXT DEFAULT '0', other TEXT DEFAULT '0',
            payment_mode TEXT, bank_name TEXT, invoice_reference TEXT, notes TEXT
        )",
    ];

    for sql in schemas {
        conn.execute(sql, ())
            .map_err(|e| format!("schema setup failed: {e}"))?;
    }

    let indexes = &[
        "CREATE INDEX IF NOT EXISTS idx_invoice_cust ON tbl_invoice_main(customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_invoice_company ON tbl_invoice_main(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_invoice_date ON tbl_invoice_main(invoice_date)",
        "CREATE INDEX IF NOT EXISTS idx_invoice_sub_main ON tbl_invoice_sub(main_id)",
        "CREATE INDEX IF NOT EXISTS idx_receipt_cust ON tbl_receipt(customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_receipt_company ON tbl_receipt(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_receipt_date ON tbl_receipt(receipt_date)",
        "CREATE INDEX IF NOT EXISTS idx_product_company ON tbl_product(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_product_type ON tbl_product(type_id)",
        "CREATE INDEX IF NOT EXISTS idx_quotation_cust ON tbl_quotation_main(customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_customer_name ON tbl_customer(customer_name)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_type ON tbl_email(template_type)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_email_identify ON tbl_email(identify)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_name ON tbl_wa_template(template_name)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_template_id ON tbl_wa_template(template_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_identify ON tbl_whatsapp(identify)",
        "CREATE INDEX IF NOT EXISTS idx_whatsapp_log_customer ON tbl_whatsapp_log(customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_whatsapp_log_status ON tbl_whatsapp_log(status)",
    ];

    for sql in indexes {
        conn.execute(sql, ())
            .map_err(|e| format!("index setup failed: {e}"))?;
    }

    Ok(())
}

async fn resolve_sql_server_addr(cfg: &SqlServerConfig) -> Result<(String, u16), String> {
    let Some(instance) = cfg
        .instance
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    else {
        return Ok((format!("{}:{}", cfg.host, cfg.port), cfg.port));
    };

    let instance = instance.trim();
    let socket = UdpSocket::bind("0.0.0.0:0")
        .await
        .map_err(|e| format!("SQL Server Browser socket setup failed: {e}"))?;

    let mut request = Vec::with_capacity(instance.len() + 2);
    request.push(0x04);
    request.extend_from_slice(instance.as_bytes());
    request.push(0x00);
    let browser_addr = format!("{}:{SQL_BROWSER_PORT}", cfg.host);
    socket
        .send_to(&request, &browser_addr)
        .await
        .map_err(|e| format!("SQL Server Browser query failed for {browser_addr}: {e}"))?;

    let mut response = [0u8; 4096];
    let (size, _) = timeout(SQL_BROWSER_TIMEOUT, socket.recv_from(&mut response))
        .await
        .map_err(|_| {
            format!(
                "Timed out resolving SQL Server instance '{instance}' on {}. Enable SQL Server Browser, TCP/IP, and UDP {SQL_BROWSER_PORT} in Windows Firewall.",
                cfg.host
            )
        })?
        .map_err(|e| format!("SQL Server Browser response failed: {e}"))?;

    let text = String::from_utf8_lossy(&response[..size]);
    let parts: Vec<&str> = text.split(';').collect();
    let tcp_port = parts
        .windows(2)
        .find_map(|pair| {
            if pair[0].eq_ignore_ascii_case("tcp") {
                pair[1].parse::<u16>().ok()
            } else {
                None
            }
        })
        .ok_or_else(|| {
            format!(
                "SQL Server Browser did not return a TCP port for {}\\{instance}. Enable TCP/IP for the instance or set a fixed port.",
                cfg.host
            )
        })?;

    Ok((format!("{}:{tcp_port}", cfg.host), tcp_port))
}

// ─── Per-Table Migration ─────────────────────────────────────────────────────

fn is_invalid_object_name_error(error: &tiberius::error::Error) -> bool {
    error.to_string().contains("Invalid object name")
}

async fn migrate_table(
    client: &mut Client<impl futures::io::AsyncRead + futures::io::AsyncWrite + Unpin + Send>,
    sqlite_conn: &Mutex<rusqlite::Connection>,
    spec: &TableSpec,
    emitter: &AppHandle,
) -> Result<TableMigrationResult, String> {
    let table_name = spec.name;

    let _ = emitter.emit(
        MIGRATION_EVENT,
        MigrationProgress {
            table_name: table_name.into(),
            rows_migrated: 0,
            total_rows: 0,
            phase: "reading".into(),
            error: None,
        },
    );

    let query_str = format!("SELECT * FROM [{}]", table_name);
    let rows: Vec<Row> = match client.query(query_str, &[]).await {
        Ok(stream) => stream
            .into_first_result()
            .await
            .map_err(|e| format!("{table_name}: row fetch failed: {e}"))?,
        Err(e) if is_invalid_object_name_error(&e) => {
            log::warn!("Skipping {table_name}: source table does not exist");
            let _ = emitter.emit(
                MIGRATION_EVENT,
                MigrationProgress {
                    table_name: table_name.into(),
                    rows_migrated: 0,
                    total_rows: 0,
                    phase: "skipped".into(),
                    error: Some("source table does not exist".into()),
                },
            );
            return Ok(TableMigrationResult {
                table_name: table_name.into(),
                rows_migrated: 0,
                success: true,
                error: None,
            });
        }
        Err(e) => return Err(format!("{table_name}: query failed: {e}")),
    };

    let total = rows.len() as u32;
    if total == 0 {
        return Ok(TableMigrationResult {
            table_name: table_name.into(),
            rows_migrated: 0,
            success: true,
            error: None,
        });
    }

    let _ = emitter.emit(
        MIGRATION_EVENT,
        MigrationProgress {
            table_name: table_name.into(),
            rows_migrated: 0,
            total_rows: total,
            phase: "writing".into(),
            error: None,
        },
    );

    let col_index = build_col_index(&rows[0]);
    let money_set: std::collections::HashSet<&str> = spec.money.iter().copied().collect();
    let date_set: std::collections::HashSet<&str> = spec.dates.iter().copied().collect();
    let blob_set: std::collections::HashSet<&str> = spec.blobs.iter().copied().collect();
    let source_schema =
        load_source_schema(client, table_name, &money_set, &date_set, &blob_set).await?;

    let present_cols: Vec<&str> = spec
        .cols
        .iter()
        .copied()
        .filter(|c| col_index.contains_key(*c))
        .collect();

    if present_cols.is_empty() {
        return Err(format!("{table_name}: no matching columns found in source"));
    }

    let placeholders: Vec<String> = (0..present_cols.len()).map(|_| "?".to_string()).collect();
    let insert_sql = format!(
        "INSERT OR REPLACE INTO [{}] ({}) VALUES ({})",
        table_name,
        present_cols.join(", "),
        placeholders.join(", "),
    );

    let conn = sqlite_conn
        .lock()
        .map_err(|e| format!("{table_name}: mutex lock failed: {e}"))?;
    conn.execute("BEGIN", ())
        .map_err(|e| format!("{table_name}: begin tx failed: {e}"))?;

    let mut committed = 0u32;
    for row in &rows {
        let col_map = if row.columns().len() == rows[0].columns().len() {
            &col_index
        } else {
            // Some rows may have different column count — rebuild map
            let dynamic = build_col_index(row);
            // This leaks, but it's bounded by migration lifetime
            Box::leak(Box::new(dynamic))
        };

        let mut values: Vec<String> = Vec::with_capacity(present_cols.len());
        for col_name in &present_cols {
            if let Some(&idx) = col_map.get(*col_name) {
                let kind = source_schema
                    .get(*col_name)
                    .map(|info| info.kind)
                    .unwrap_or_else(|| {
                        spec_column_kind(col_name, &money_set, &date_set, &blob_set)
                    });
                match extract_cell(row, idx, kind) {
                    Some(v) => values.push(v),
                    None => values.push(String::new()),
                }
            } else {
                values.push(String::new());
            }
        }

        let params: Vec<&dyn rusqlite::types::ToSql> = values
            .iter()
            .map(|v| v as &dyn rusqlite::types::ToSql)
            .collect();

        conn.execute(&insert_sql, params.as_slice())
            .map_err(|e| format!("{table_name}: insert failed: {e}"))?;

        committed += 1;
    }

    conn.execute("COMMIT", ())
        .map_err(|e| format!("{table_name}: commit failed: {e}"))?;

    let _ = emitter.emit(
        MIGRATION_EVENT,
        MigrationProgress {
            table_name: table_name.into(),
            rows_migrated: committed,
            total_rows: total,
            phase: "done".into(),
            error: None,
        },
    );

    log::info!("Migrated {table_name}: {committed} rows");

    Ok(TableMigrationResult {
        table_name: table_name.into(),
        rows_migrated: committed,
        success: true,
        error: None,
    })
}

// ─── Tauri Command ───────────────────────────────────────────────────────────

/// Migrate all data from the local Docker SQL Server (`xpress-sql`)
/// into the app's SQLite database. Optionally accepts custom connection config.
///
/// Emits `migration-progress` events for frontend progress tracking.
/// Creates SQLite tables if they don't exist.
#[tauri::command]
#[specta::specta]
pub async fn migrate_from_sqlserver(
    app: AppHandle,
    config: Option<SqlServerConfig>,
) -> Result<MigrationResult, String> {
    let cfg = config.unwrap_or_default();

    // ── resolve SQLite path ─────────────────────────────────────────────────
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {e}"))?;

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create app config dir: {e}"))?;

    let sqlite_path = config_dir.join("xpress.db");

    log::info!(
        "Starting SQL Server → SQLite migration (target: {})",
        sqlite_path.display()
    );

    // ── open SQLite ─────────────────────────────────────────────────────────
    let sqlite_conn = Arc::new(Mutex::new(
        rusqlite::Connection::open(&sqlite_path)
            .map_err(|e| format!("Failed to open SQLite database: {e}"))?,
    ));

    {
        let conn = sqlite_conn
            .lock()
            .map_err(|e| format!("mutex lock failed: {e}"))?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=OFF;")
            .map_err(|e| format!("SQLite pragma failed: {e}"))?;
    }

    ensure_sqlite_schema(&sqlite_conn)?;
    log::info!("SQLite schema ready");

    // ── connect to SQL Server ───────────────────────────────────────────────
    let (sql_server_addr, sql_server_port) = resolve_sql_server_addr(&cfg).await?;
    let mut tiberius_config = Config::new();
    tiberius_config.host(&cfg.host);
    tiberius_config.port(sql_server_port);
    tiberius_config.authentication(AuthMethod::sql_server(&cfg.user, &cfg.password));
    tiberius_config.database(&cfg.database);
    tiberius_config.encryption(EncryptionLevel::NotSupported);

    log::info!(
        "Connecting to SQL Server at {}/{}{}",
        sql_server_addr,
        cfg.database,
        cfg.instance
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(|instance| format!(" ({instance})"))
            .unwrap_or_default()
    );

    let tcp = TcpStream::connect(&sql_server_addr)
        .await
        .map_err(|e| {
            format!(
                "Cannot reach SQL Server at {sql_server_addr}. For Docker, make sure the container is running. For SQLEXPRESS, enable TCP/IP and firewall access. {e}"
            )
        })?;

    tcp.set_nodelay(true)
        .map_err(|e| format!("TCP setup failed: {e}"))?;

    let mut client = Client::connect(tiberius_config, tcp.compat())
        .await
        .map_err(|e| format!("SQL Server connection failed: {e}"))?;

    log::info!("Connected to SQL Server");

    // ── migrate each table ─────────────────────────────────────────────────
    let mut results = Vec::with_capacity(TABLES.len());
    let mut total_rows = 0u32;

    for spec in TABLES {
        let result = match migrate_table(&mut client, &sqlite_conn, spec, &app).await {
            Ok(r) => r,
            Err(e) => {
                log::error!("Migration failed for {}: {e}", spec.name);
                let _ = app.emit(
                    MIGRATION_EVENT,
                    MigrationProgress {
                        table_name: spec.name.into(),
                        rows_migrated: 0,
                        total_rows: 0,
                        phase: "error".into(),
                        error: Some(e.clone()),
                    },
                );
                TableMigrationResult {
                    table_name: spec.name.into(),
                    rows_migrated: 0,
                    success: false,
                    error: Some(e),
                }
            }
        };
        total_rows += result.rows_migrated;
        results.push(result);
    }

    // ── finalize ────────────────────────────────────────────────────────────
    {
        let conn = sqlite_conn
            .lock()
            .map_err(|e| format!("mutex lock failed: {e}"))?;
        let _ = conn.execute("PRAGMA foreign_keys=ON", ());
        let _ = conn.execute("ANALYZE", ());
    }

    let overall_success = results.iter().all(|r| r.success);

    log::info!(
        "Migration complete: {total_rows} rows across {} tables",
        results.len()
    );

    Ok(MigrationResult {
        results,
        total_rows,
        success: overall_success,
        error: None,
    })
}
