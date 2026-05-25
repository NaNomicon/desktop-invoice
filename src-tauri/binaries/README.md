# Bundled PDF renderer

Place platform-specific standalone Chromium payloads here so the packaged app can generate PDFs without relying on any system-installed browser.

Expected launcher paths checked by the app:

- `src-tauri/binaries/chromium/windows/chrome.exe`
- `src-tauri/binaries/chromium/macos/Chromium.app/Contents/MacOS/Chromium`
- `src-tauri/binaries/chromium/linux/chrome`

These are launcher entrypoints, not necessarily the only files you need to ship. In practice, each platform payload must include the launcher plus the Chromium runtime files it depends on.

Recommended distributable layout:

- `src-tauri/binaries/chromium/windows/`
  - `chrome.exe`
  - Chromium `.dll` files
  - resource/data folders such as `locales/`, `resources/`, and any other files required by the chosen Chromium build
- `src-tauri/binaries/chromium/macos/`
  - full `Chromium.app/` bundle
  - do not copy only the inner executable; keep the app bundle structure intact
- `src-tauri/binaries/chromium/linux/`
  - `chrome`
  - required shared libraries or sidecar files if your Chromium build is not fully system-linked
  - resource/data folders such as `locales/`, `resources/`, and similar runtime assets

Runtime behavior:

- the app only uses these bundled Chromium resources for PDF generation
- if they are missing, PDF export fails with a renderer error
- on startup, the frontend calls `validateBundledPdfRenderer` and shows a warning toast if the renderer entrypoint is missing

Build and installer behavior:

- `src-tauri/tauri.conf.json` includes `binaries` in `bundle.resources`, so Tauri copies this directory into packaged app resources
- release builds fail in `src-tauri/build.rs` when the current platform renderer entrypoint is missing
- set `TAURI_FORCE_BUNDLED_CHROMIUM_CHECK=1` to enforce the same check during non-release builds
- the build guard checks only the expected launcher path; you are still responsible for bundling the full Chromium payload needed by that launcher

Packaging checklist:

1. Choose one Chromium distribution per target OS that you are allowed to redistribute.
2. Copy the full runtime payload into the matching `src-tauri/binaries/chromium/<platform>/` directory.
3. Verify the expected launcher path exists exactly as listed above.
4. Run `TAURI_FORCE_BUNDLED_CHROMIUM_CHECK=1 cargo check` in `src-tauri`.
5. Build the installer with `npm run tauri:build`.
6. Test PDF export on a clean machine that does not have Chrome installed.

Current repo status:

- Windows now has a real bundled Chrome for Testing payload under `src-tauri/binaries/chromium/windows/`
  - verified launcher path: `src-tauri/binaries/chromium/windows/chrome.exe`
  - current downloaded payload version in this repo: `149.0.7827.22` (`win64`)
- Linux now has a real bundled Chrome for Testing payload under `src-tauri/binaries/chromium/linux/`
  - verified launcher path: `src-tauri/binaries/chromium/linux/chrome`
  - current downloaded payload version in this repo: `149.0.7827.22` (`linux64`)
- the code path is ready for true standalone packaging

Clean-machine validation checklist:

Windows:

1. Build from Windows or a Windows-targeted CI runner with `npm run tauri:build`.
2. Confirm `npm run tauri:check` passes before packaging.
3. Install the produced `.msi` on a clean Windows machine with no system Chrome requirement.
4. Launch the app and confirm no bundled-renderer warning toast appears on startup.
5. Open each PDF-capable flow at least once: outstanding report, list outstanding, sales report, statement preview, quotation preview.
6. Verify PDF export succeeds, the file opens automatically, and no `Failed to generate PDF` toast appears.
7. Disconnect or ignore any system Chrome installation and repeat one PDF export to confirm the bundled payload is actually being used.

Linux:

1. Build from Linux or a Linux-targeted CI runner with `npm run tauri:build`.
2. Run `TAURI_FORCE_BUNDLED_CHROMIUM_CHECK=1 cargo check` in `src-tauri` before packaging.
3. Install the produced package (`.deb` or AppImage flow) on a clean Linux machine without relying on system Chrome.
4. Launch the app and confirm no bundled-renderer warning toast appears on startup.
5. Open each PDF-capable flow at least once: outstanding report, list outstanding, sales report, statement preview, quotation preview.
6. Verify PDF export succeeds, the file opens automatically, and no renderer warning/error toast appears.
7. Confirm the installed app can still export PDFs after removing any local Chrome/Chromium package assumptions.

Known unverified installer risks:

- We have verified payload presence, build guards, runtime lookup, `cargo check`, and `npm run typecheck`, but not a full clean-machine installer run from this session.
- We have not yet exercised a packaged Windows `.msi` or Linux `.deb`/AppImage end-to-end in a VM or fresh host.
- macOS payload and validation are still not prepared.
