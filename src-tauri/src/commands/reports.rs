use std::{
    env, fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;
use tauri::Manager;

#[derive(Debug, Clone, Copy)]
enum BrowserSource {
    Bundled,
}

#[derive(Debug)]
struct BrowserBinary {
    path: PathBuf,
    source: BrowserSource,
}

#[derive(Debug, Deserialize, specta::Type)]
pub struct SaveReportPdfRequest {
    pub html: String,
    pub output_path: String,
}

#[tauri::command]
#[specta::specta]
pub fn validate_bundled_pdf_renderer(app: tauri::AppHandle) -> Result<String, String> {
    let path = resolve_bundled_browser(&app).ok_or_else(|| {
        "Bundled PDF renderer is missing. Add the platform Chromium binary under src-tauri/binaries before exporting PDFs."
            .to_string()
    })?;

    Ok(path.to_string_lossy().to_string())
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
fn bundled_browser_relative_paths() -> &'static [&'static str] {
    &[
        "binaries/chromium/windows/chrome.exe",
        "binaries/chromium/windows/msedge.exe",
    ]
}

#[cfg(target_os = "macos")]
fn bundled_browser_relative_paths() -> &'static [&'static str] {
    &[
        "binaries/chromium/macos/Chromium.app/Contents/MacOS/Chromium",
        "binaries/chromium/macos/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    ]
}

#[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
fn bundled_browser_relative_paths() -> &'static [&'static str] {
    &[
        "binaries/chromium/linux/chrome",
        "binaries/chromium/linux/chromium",
    ]
}

fn resolve_bundled_browser(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resolver = app.path();
    bundled_browser_relative_paths()
        .iter()
        .find_map(|relative_path| {
            resolver
                .resolve(relative_path, tauri::path::BaseDirectory::Resource)
                .ok()
                .filter(|candidate| candidate.exists())
        })
}

fn find_browser_binary(app: &tauri::AppHandle) -> Option<BrowserBinary> {
    resolve_bundled_browser(app).map(|path| BrowserBinary {
        path,
        source: BrowserSource::Bundled,
    })
}

fn write_temp_html(temp_dir: &Path, html: &str) -> Result<PathBuf, String> {
    fs::create_dir_all(temp_dir)
        .map_err(|e| format!("Failed to create temporary report directory: {e}"))?;

    let unique_suffix = format!(
        "{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    );
    let html_path = temp_dir.join(format!("report-preview-{unique_suffix}.html"));
    fs::write(&html_path, html).map_err(|e| format!("Failed to write temporary HTML: {e}"))?;
    Ok(html_path)
}

#[tauri::command]
#[specta::specta]
pub async fn save_report_pdf(
    app: tauri::AppHandle,
    request: SaveReportPdfRequest,
) -> Result<String, String> {
    let output_path = validate_output_path(&request.output_path)?;
    let browser = find_browser_binary(&app).ok_or_else(|| {
        "Could not find the bundled Chromium renderer for PDF generation. Add the platform binary under src-tauri/binaries before building the app."
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
    let html_path = write_temp_html(&temp_dir, &request.html)?;
    let saved_path = output_path.to_string_lossy().to_string();
    let browser_path = browser.path.clone();
    let browser_source = browser.source;

    let browser_output = tauri::async_runtime::spawn_blocking(move || {
        let mut command = std::process::Command::new(&browser_path);
        command
            .arg("--headless=new")
            .arg("--disable-gpu")
            .arg("--no-pdf-header-footer")
            .arg(format!("--print-to-pdf={}", output_path.display()))
            .arg(html_path.as_os_str());

        if matches!(browser_source, BrowserSource::Bundled) {
            command.env("HOME", env::temp_dir());
            command.env("TMPDIR", env::temp_dir());
        }

        command.output()
    })
    .await
    .map_err(|e| format!("Failed to join PDF generation task: {e}"))?
    .map_err(|e| format!("Failed to start browser for PDF generation: {e}"))?;

    if !browser_output.status.success() {
        let stderr = String::from_utf8_lossy(&browser_output.stderr);
        let stdout = String::from_utf8_lossy(&browser_output.stdout);
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
