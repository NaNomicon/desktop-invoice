use std::{env, path::PathBuf};

fn bundled_renderer_path(manifest_dir: &str, target_os: &str) -> PathBuf {
    let relative = match target_os {
        "windows" => "binaries/chromium/windows/chrome.exe",
        "macos" => "binaries/chromium/macos/Chromium.app/Contents/MacOS/Chromium",
        _ => "binaries/chromium/linux/chrome",
    };

    PathBuf::from(manifest_dir).join(relative)
}

fn enforce_bundled_renderer() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is missing");
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_else(|_| env::consts::OS.to_string());
    let profile = env::var("PROFILE").unwrap_or_else(|_| "unknown".to_string());
    let renderer_path = bundled_renderer_path(&manifest_dir, &target_os);

    println!("cargo:rerun-if-changed={}", renderer_path.display());
    println!("cargo:rerun-if-changed=binaries");

    let enforce_for_profile = matches!(profile.as_str(), "release")
        || env::var_os("TAURI_FORCE_BUNDLED_CHROMIUM_CHECK").is_some();
    if !enforce_for_profile {
        return;
    }

    if !renderer_path.exists() {
        panic!(
            "Missing standalone bundled Chromium for target OS `{target_os}`. Expected renderer at `{}`. Add the platform binary under src-tauri/binaries before building.",
            renderer_path.display()
        );
    }
}

fn main() {
    enforce_bundled_renderer();
    tauri_build::build()
}
