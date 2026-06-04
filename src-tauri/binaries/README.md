# Bundled PDF renderer

Place platform-specific Typst CLI binaries here so the packaged app can generate PDFs without relying on Chromium or any system-installed browser.

Expected launcher paths checked by the build guard and app:

- `src-tauri/binaries/typst/windows/typst.exe`
- `src-tauri/binaries/typst/macos/typst`
- `src-tauri/binaries/typst/linux/typst`

Runtime behavior:

- the app uses the bundled Typst CLI for PDF generation
- Rust writes a temporary `.typ` report document, runs `typst compile`, and opens the generated PDF through the existing frontend flow
- if the Typst binary is missing, PDF export fails with a renderer error

Build and installer behavior:

- `src-tauri/tauri.conf.json` includes `binaries` in `bundle.resources`, so Tauri copies this directory into packaged app resources
- release builds fail in `src-tauri/build.rs` when the current platform Typst entrypoint is missing
- set `TAURI_FORCE_BUNDLED_TYPST_CHECK=1` to enforce the same check during non-release builds

Packaging checklist:

1. Download the Typst CLI release for each target OS you support.
2. Copy the executable into the matching `src-tauri/binaries/typst/<platform>/` directory.
3. Verify the expected launcher path exists exactly as listed above.
4. Run `TAURI_FORCE_BUNDLED_TYPST_CHECK=1 cargo check` in `src-tauri`.
5. Build the installer with `npm run tauri:build`.
6. Test PDF export on a clean machine that does not have Typst installed globally.

Current repo status:

- the Chromium PDF renderer has been removed from the code path
- Typst binaries still need to be supplied under `src-tauri/binaries/typst/` before release packaging
- the first Typst pass converts existing HTML report output to text-based Typst documents; dedicated structured Typst templates can replace that compatibility layer later
