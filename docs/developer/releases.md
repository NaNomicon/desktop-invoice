# Releases

Release process, version management, installer builds, and auto-update via Cloudflare Worker proxy.

## Overview

The release system provides:

- PR quality gates for TypeScript, ESLint, Prettier, ast-grep, Vitest, Rust fmt, clippy, Rust tests, and Tauri integration checks
- Release Please automation for version bumps, changelog updates, release PRs, tags, and draft GitHub releases
- Tauri GitHub Actions builds for installer artifacts
- Cross-platform bundles for Windows, macOS, and Linux
- Private GitHub Releases distribution with installers and SHA256 checksums
- Auto-update via Cloudflare Worker proxy (`updater/`) that authenticates to the private repo server-side

## Initial Setup

Auto-update requires a Tauri signing keypair and a deployed Cloudflare Worker. See [updater/README.md](../../updater/README.md) for the full setup guide.

Required secrets in `NaNomicon/desktop-invoice` → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/xpress-billing.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password chosen during key generation |

Required Cloudflare Worker secret (set via `wrangler secret put GITHUB_TOKEN`):
- A GitHub fine-grained PAT with `Contents: Read-only` on `NaNomicon/desktop-invoice`

Do not embed GitHub tokens in the desktop app. The Cloudflare Worker holds the token server-side.

## Release Please Flow

Normal releases are driven by Conventional Commits and Release Please.

1. Merge feature and fix PRs into `main` using Conventional Commit messages.
2. `.github/workflows/release-please.yml` opens or updates a release PR.
3. The release PR updates:
   - `CHANGELOG.md`
   - `package.json`
   - `package-lock.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
   - `.release-please-manifest.json`
4. Review and merge the release PR when ready.
5. Release Please creates a tag and draft GitHub Release.
6. `.github/workflows/release.yml` builds and uploads Tauri installers for that release.
7. Download and test installers from the draft release.
8. Publish the private GitHub Release after manual QA passes.

## Commit Convention

Release Please calculates the next version from Conventional Commits.

| Commit type | Version impact |
| ----------- | -------------- |
| `fix:` | Patch release |
| `feat:` | Minor release |
| `feat!:` or `BREAKING CHANGE:` | Major release |
| `docs:`, `chore:`, `test:`, `refactor:` | No release unless included with release-worthy changes |

Examples:

```text
fix: prevent duplicate invoice numbers
feat: add customer import flow
feat!: change invoice storage format
```

## Manual Emergency Release

Use the manual script only when Release Please is unavailable or an urgent release must be cut outside the normal flow.

```bash
npm run release:prepare v1.0.1
```

This script updates version files and runs local checks, but the preferred production path is still the Release Please PR flow.

## Version Strategy

Semantic versioning uses `vX.Y.Z` tags:

- **Major** (`1.x.x`): breaking changes or incompatible data migrations
- **Minor** (`x.1.x`): backwards-compatible features
- **Patch** (`x.x.1`): bug fixes

All version files must match in release PRs:

- `package.json` -> `"version": "1.0.0"`
- `src-tauri/Cargo.toml` -> `version = "1.0.0"`
- `src-tauri/tauri.conf.json` -> `"version": "1.0.0"`
- `.release-please-manifest.json` -> `".": "1.0.0"`

## CI Quality Gate

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`.

Required checks:

```bash
npm ci
npm run check:all
npm run tauri:check
```

Do not merge release PRs or feature PRs while CI is failing.

## Release Build Workflow

`.github/workflows/release.yml` runs when a `v*` tag is pushed or manually via `workflow_dispatch` with a tag.

The workflow:

1. Checks out the release tag.
2. Installs Node, Rust, and Linux system dependencies.
3. Runs `npm run tauri:check`.
4. Builds platform installers with `tauri-apps/tauri-action`.
5. Uploads installer artifacts, `latest.json` updater manifest, and `SHA256SUMS.txt` to the private draft release.

Release candidates and beta tags containing `-rc.`, `-beta.`, or `-alpha.` are marked prerelease.

## Auto-Update System

Auto-update is served via a Cloudflare Worker proxy at `updater/`. The worker authenticates to the private GitHub repo using a server-side PAT — the desktop app never holds a GitHub token.

Flow:

1. App checks `https://xpress-billing-updater.nanomicon.workers.dev/v1/{{target}}/{{arch}}/{{current_version}}`
2. Worker fetches the latest release from GitHub API using `GITHUB_TOKEN` secret
3. Worker returns `{ version, url, signature, notes, pub_date }` or `204 No Content`
4. If an update is available, app downloads the installer via `/download/{filename}` — also proxied through the worker
5. Tauri verifies the `.sig` signature against the public key embedded in the app before installing

Current config in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://xpress-billing-updater.nanomicon.workers.dev/v1/{{target}}/{{arch}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "<your-public-key>"
    }
  }
}
```

To update the worker without shipping a new app version:

```bash
cd updater
npx wrangler deploy
```


## Manual QA Before Publishing

Treat this checklist as a release blocker before publishing the draft release.

1. Install the Windows `.msi` on a clean Windows machine or VM.
2. Launch the app and create or open the local SQLite database.
3. Validate customer, product, invoice, quotation, receipt, and report flows.
4. Validate PDF export and confirm the saved PDF opens automatically.
5. Validate backup and restore flows if changed.
6. Validate migration or import flows if changed.
7. Trigger an update check in the running app and confirm the update dialog appears.
8. Install the update and confirm the app restarts at the new version.
9. Confirm `SHA256SUMS.txt` is attached to the release.

## Standalone PDF Renderer Validation

The app bundles Chromium payloads under `src-tauri/binaries/` for standalone PDF export.

Before shipping a release for Windows or Linux:

1. Run `npm run tauri:check`.
2. Run `TAURI_FORCE_BUNDLED_CHROMIUM_CHECK=1 cargo check` in `src-tauri` when validating the local target payload.
3. Build with `npm run tauri:build` on the target OS or target-specific CI runner.
4. Install the packaged app on a clean machine that does not need a system Chrome installation.
5. Launch the app and confirm no bundled-renderer warning toast appears.
6. Exercise PDF export from the main report flows and confirm the saved PDF opens automatically.
7. Treat Windows `.msi` and Linux AppImage verification as release blockers until they pass on clean machines.

## Release Artifacts

Each production release should include:

- **Windows**: `.msi` installer
- **macOS**: `.dmg` installer
- **Linux**: `.AppImage` bundle
- **Integrity**: `SHA256SUMS.txt`

## Rollback Strategy

- Do not replace assets on a published release.
- If a bad release ships, publish a higher patch version with the fix.
- Keep the previous stable installer available in GitHub Releases.
- Back up user data before destructive migrations.

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| Release PR is not created | Confirm commits use Conventional Commit types that trigger a release |
| Tauri build does not run | Confirm Release Please created a GitHub Release and tag |
| Build fails before bundling | Check CI failures locally with `npm run check:all` and `npm run tauri:check` |
| Auto-update dialog does not appear | Confirm `TAURI_SIGNING_PRIVATE_KEY` secret is set and `pubkey` in `tauri.conf.json` matches the keypair |
| Download fails | Confirm `GITHUB_TOKEN` Cloudflare secret has `Contents: Read-only` on `NaNomicon/desktop-invoice` |
