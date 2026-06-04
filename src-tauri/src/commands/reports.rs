use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;
use tauri::Manager;

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReportTable {
    rows: Vec<Vec<String>>,
    has_header: bool,
}

#[derive(Debug, Deserialize, specta::Type)]
pub struct SaveReportPdfRequest {
    pub html: String,
    pub output_path: String,
}

fn validate_output_path(output_path: &str) -> Result<PathBuf, String> {
    let trimmed = output_path.trim();
    if trimmed.is_empty() {
        return Err("Output path is required".into());
    }

    let path = PathBuf::from(trimmed);
    if path.extension().and_then(|ext| ext.to_str()) != Some("pdf") {
        return Err("Output path must end with .pdf".into());
    }

    Ok(path)
}

#[cfg(target_os = "windows")]
fn bundled_typst_relative_paths() -> &'static [&'static str] {
    &["binaries/typst/windows/typst.exe"]
}

#[cfg(target_os = "macos")]
fn bundled_typst_relative_paths() -> &'static [&'static str] {
    &["binaries/typst/macos/typst"]
}

#[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
fn bundled_typst_relative_paths() -> &'static [&'static str] {
    &["binaries/typst/linux/typst"]
}

fn resolve_bundled_typst(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resolver = app.path();
    bundled_typst_relative_paths()
        .iter()
        .find_map(|relative_path| {
            resolver
                .resolve(relative_path, tauri::path::BaseDirectory::Resource)
                .ok()
                .filter(|candidate| candidate.exists())
        })
}

fn unique_report_stem() -> String {
    format!(
        "report-preview-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    )
}

fn strip_html_to_text(html: &str) -> String {
    let mut text = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut current_tag = String::new();
    let mut ignored_tag: Option<String> = None;
    let mut last_was_space = true;

    for char in html.chars() {
        if in_tag {
            if char == '>' {
                let tag = current_tag
                    .trim_start_matches('/')
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_ascii_lowercase();
                let is_closing_tag = current_tag.trim_start().starts_with('/');

                if matches!(tag.as_str(), "style" | "script" | "noscript" | "head") {
                    ignored_tag = if is_closing_tag { None } else { Some(tag) };
                } else if ignored_tag.is_none() {
                    if matches!(
                        tag.as_str(),
                        "br" | "p"
                            | "div"
                            | "section"
                            | "article"
                            | "header"
                            | "footer"
                            | "tr"
                            | "table"
                            | "h1"
                            | "h2"
                            | "h3"
                            | "h4"
                            | "h5"
                            | "h6"
                            | "li"
                    ) {
                        push_newline(&mut text, &mut last_was_space);
                    } else if matches!(tag.as_str(), "td" | "th") && !last_was_space {
                        text.push_str("  ");
                        last_was_space = true;
                    }
                }
                current_tag.clear();
                in_tag = false;
            } else {
                current_tag.push(char);
            }
            continue;
        }

        match char {
            '<' => in_tag = true,
            _ if ignored_tag.is_some() => {}
            '&' => {
                text.push('&');
                last_was_space = false;
            }
            c if c.is_whitespace() => {
                if !last_was_space {
                    text.push(' ');
                    last_was_space = true;
                }
            }
            c => {
                text.push(c);
                last_was_space = false;
            }
        }
    }

    decode_html_entities(&text)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn push_newline(text: &mut String, last_was_space: &mut bool) {
    while text.ends_with(' ') {
        text.pop();
    }
    if !text.ends_with('\n') {
        text.push('\n');
    }
    *last_was_space = true;
}

fn decode_html_entities(value: &str) -> String {
    value
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

fn escape_typst_text(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace('#', "\\#")
}

fn extract_title(html: &str) -> Option<String> {
    let heading_re = regex::Regex::new(r"(?is)<h1\b[^>]*>(.*?)</h1>").ok()?;
    heading_re
        .captures(html)
        .and_then(|captures| captures.get(1))
        .map(|heading| strip_html_to_text(heading.as_str()))
        .filter(|heading| !heading.trim().is_empty())
}

fn remove_html_tables(html: &str) -> String {
    regex::Regex::new(r"(?is)<table\b[^>]*>.*?</table>")
        .map(|table_re| table_re.replace_all(html, "\n").into_owned())
        .unwrap_or_else(|_| html.to_string())
}

fn extract_report_tables(html: &str) -> Vec<ReportTable> {
    let table_re = match regex::Regex::new(r"(?is)<table\b[^>]*>(.*?)</table>") {
        Ok(re) => re,
        Err(_) => return Vec::new(),
    };
    let row_re = match regex::Regex::new(r"(?is)<tr\b[^>]*>(.*?)</tr>") {
        Ok(re) => re,
        Err(_) => return Vec::new(),
    };
    let cell_re = match regex::Regex::new(r"(?is)<t([dh])\b[^>]*>(.*?)</t[dh]>") {
        Ok(re) => re,
        Err(_) => return Vec::new(),
    };

    table_re
        .captures_iter(html)
        .filter_map(|table_capture| {
            let table_html = table_capture.get(1)?.as_str();
            let mut has_header = false;
            let rows = row_re
                .captures_iter(table_html)
                .filter_map(|row_capture| {
                    let row_html = row_capture.get(1)?.as_str();
                    let cells = cell_re
                        .captures_iter(row_html)
                        .filter_map(|cell_capture| {
                            if cell_capture
                                .get(1)
                                .is_some_and(|tag| tag.as_str().eq_ignore_ascii_case("h"))
                            {
                                has_header = true;
                            }
                            cell_capture
                                .get(2)
                                .map(|cell| strip_html_to_text(cell.as_str()))
                                .filter(|cell| !cell.trim().is_empty())
                        })
                        .collect::<Vec<_>>();

                    if cells.is_empty() {
                        None
                    } else {
                        Some(cells)
                    }
                })
                .collect::<Vec<_>>();

            if rows.is_empty() {
                None
            } else {
                Some(ReportTable { rows, has_header })
            }
        })
        .collect()
}

fn typst_table_source(table: &ReportTable) -> String {
    let column_count = table.rows.iter().map(Vec::len).max().unwrap_or(1).max(1);
    let columns = std::iter::repeat_n("auto", column_count)
        .collect::<Vec<_>>()
        .join(", ");

    let mut source = format!(
        r#"#table(
  columns: ({columns}),
  stroke: 0.5pt + rgb("888888"),
  inset: 5pt,
"#
    );

    for row in &table.rows {
        for column_index in 0..column_count {
            let cell = row.get(column_index).map(String::as_str).unwrap_or("");
            let escaped = cell
                .replace('\\', "\\\\")
                .replace('[', "\\[")
                .replace(']', "\\]")
                .replace('#', "\\#");
            source.push_str(&format!("  [{}],\n", escaped));
        }
    }

    source.push_str(")\n");
    source
}

fn report_summary_text(html: &str) -> String {
    let without_tables = remove_html_tables(html);
    let mut lines = strip_html_to_text(&without_tables)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect::<Vec<_>>();

    if let Some(title) = extract_title(html) {
        lines.retain(|line| line != &title);
    }

    lines.join("\n")
}

fn extract_meta_lines(html: &str) -> Vec<String> {
    let div_re = match regex::Regex::new(r"(?is)<div\b[^>]*>(.*?)</div>") {
        Ok(re) => re,
        Err(_) => return Vec::new(),
    };
    let strong_re = match regex::Regex::new(r"(?is)<strong[^>]*>(.*?)</strong>\s*(.*)") {
        Ok(re) => re,
        Err(_) => return Vec::new(),
    };

    let mut meta = Vec::new();
    for cap in div_re.captures_iter(html) {
        let content = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        if let Some(strong_cap) = strong_re.captures(content) {
            let label = strip_html_to_text(strong_cap.get(1).map(|m| m.as_str()).unwrap_or(""))
                .trim()
                .to_string();
            let value = strip_html_to_text(strong_cap.get(2).map(|m| m.as_str()).unwrap_or(""))
                .trim()
                .to_string();
            if !label.is_empty() && !value.is_empty() {
                meta.push(format!("{} {}", label, value));
            }
        }
    }
    meta
}

fn report_typst_source(html: &str) -> String {
    let title = extract_title(html).unwrap_or_else(|| "Report".to_string());
    let summary = report_summary_text(html);
    let meta = extract_meta_lines(html);
    let tables = extract_report_tables(html);

    let mut body = format!("= {}\n\n", escape_typst_text(&title));

    if !meta.is_empty() {
        for line in &meta {
            body.push_str(&format!("{}\n", escape_typst_text(line)));
        }
        body.push('\n');
    } else if !summary.trim().is_empty() {
        body.push_str(&format!("#block[{}]\n\n", escape_typst_text(&summary)));
    }

    for table in tables {
        body.push_str(&typst_table_source(&table));
        body.push('\n');
    }

    format!(
        r#"#set page(paper: "a4", margin: 15mm)
#set text(font: "Noto Sans", size: 9pt)
#set par(leading: 0.65em, spacing: 0.5em)
#show heading.where(level: 1): set text(size: 20pt, weight: "bold")

{body}
"#
    )
}

fn write_temp_typst(temp_dir: &Path, html: &str) -> Result<PathBuf, String> {
    fs::create_dir_all(temp_dir)
        .map_err(|e| format!("Failed to create temporary report directory: {e}"))?;

    let typst_path = temp_dir.join(format!("{}.typ", unique_report_stem()));
    fs::write(&typst_path, report_typst_source(html))
        .map_err(|e| format!("Failed to write temporary Typst report: {e}"))?;
    Ok(typst_path)
}

#[tauri::command]
#[specta::specta]
pub async fn save_report_pdf(
    app: tauri::AppHandle,
    request: SaveReportPdfRequest,
) -> Result<String, String> {
    let output_path = validate_output_path(&request.output_path)?;
    let typst_path = resolve_bundled_typst(&app).ok_or_else(|| {
        "Could not find the bundled Typst renderer for PDF generation. Add the platform Typst binary under src-tauri/binaries before building the app."
            .to_string()
    })?;

    let parent = output_path
        .parent()
        .ok_or_else(|| "Output path must include a parent directory".to_string())?;
    fs::create_dir_all(parent).map_err(|e| {
        format!(
            "Failed to create report directory `{}`: {e}",
            parent.display()
        )
    })?;

    let temp_dir = app
        .path()
        .temp_dir()
        .map_err(|e| format!("Failed to get temp directory: {e}"))?
        .join("report-pdf");
    let typst_source_path = write_temp_typst(&temp_dir, &request.html)?;
    let saved_path = output_path.to_string_lossy().to_string();

    let typst_output = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new(&typst_path)
            .arg("compile")
            .arg(&typst_source_path)
            .arg(&output_path)
            .output()
    })
    .await
    .map_err(|e| format!("Failed to join PDF generation task: {e}"))?
    .map_err(|e| format!("Failed to start Typst for PDF generation: {e}"))?;

    if !typst_output.status.success() {
        let stderr = String::from_utf8_lossy(&typst_output.stderr);
        let stdout = String::from_utf8_lossy(&typst_output.stdout);
        let stderr_trimmed = stderr.trim();
        let stdout_trimmed = stdout.trim();
        let details = if !stderr_trimmed.is_empty() {
            stderr_trimmed
        } else if !stdout_trimmed.is_empty() {
            stdout_trimmed
        } else {
            "unknown error"
        };
        return Err(format!("PDF generation failed: {details}"));
    }

    Ok(saved_path)
}

#[cfg(test)]
mod tests {
    use super::{extract_report_tables, report_typst_source, strip_html_to_text};

    #[test]
    fn strip_html_to_text_ignores_head_style_and_script_content() {
        let html = r#"<!doctype html>
<html>
<head>
<title>Invoice 8352</title>
<style>
@page { margin: 14mm; size: A4 portrait; }
body { color: #111827; }
</style>
<script>window.print()</script>
</head>
<body><main><h1>Tax Invoice</h1><p>Total &amp; Due</p></main></body>
</html>"#;

        let text = strip_html_to_text(html);

        assert!(text.contains("Tax Invoice"));
        assert!(text.contains("Total & Due"));
        assert!(!text.contains("@page"));
        assert!(!text.contains("#111827"));
        assert!(!text.contains("window.print"));
        assert!(!text.contains("Invoice 8352"));
    }

    #[test]
    fn report_typst_source_does_not_emit_css_as_typst_markup() {
        let typst = report_typst_source(
            r#"<style>@page { margin: 14mm; } body { color: #111827; }</style><h1>Invoice 8352</h1>"#,
        );

        assert!(typst.contains("Invoice 8352"));
        assert!(!typst.contains("@page"));
        assert!(!typst.contains("#111827"));
    }

    #[test]
    fn extract_report_tables_preserves_headers_and_cells() {
        let tables = extract_report_tables(
            r#"<table><thead><tr><th>#</th><th>Product</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>Shirt &amp; Coat</td><td class="amount">$10.00</td></tr></tbody></table>"#,
        );

        assert_eq!(tables.len(), 1);
        assert!(tables[0].has_header);
        assert_eq!(tables[0].rows[0], vec!["#", "Product", "Total"]);
        assert_eq!(tables[0].rows[1], vec!["1", "Shirt & Coat", "$10.00"]);
    }

    #[test]
    fn report_typst_source_emits_structured_table_markup() {
        let typst = report_typst_source(
            r#"<main><h1>Tax Invoice</h1><div><strong>Invoice #:</strong> INV-1</div><table><tr><th>Product</th><th>Total</th></tr><tr><td>Ironing</td><td>50.00</td></tr></table></main>"#,
        );

        assert!(typst.contains("= Tax Invoice"));
        assert!(typst.contains("#table("));
        assert!(typst.contains("Product"));
        assert!(typst.contains("Ironing"));
        assert!(typst.contains("50.00"));
        assert!(!typst.contains("<table"));
    }
}
