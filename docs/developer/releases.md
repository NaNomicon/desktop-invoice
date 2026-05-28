# Releases

Release process, version management, installer builds, and private GitHub Release distribution.

## Overview

The release system provides:

- PR quality gates for TypeScript, ESLint, Prettier, ast-grep, Vitest, Rust fmt, clippy, Rust tests, and Tauri integration checks
- Release Please automation for version bumps, changelog updates, release PRs, tags, and draft GitHub releases
- Tauri GitHub Actions builds for installer artifacts
- Cross-platform bundles for Windows, macOS, and Linux
- Private GitHub Releases distribution with installers and SHA256 checksums

## Initial Setup

No updater signing key is required while auto-update is disabled.

Configure normal GitHub Actions access only:

- Keep this source repository private.
- Allow Actions to create and write release assets with `contents: write`.
- Publish releases only to users who should have access to the private repository or to assets you distribute manually.

Do not embed GitHub tokens in the desktop app. A private GitHub Release requires GitHub authentication, and app-embedded tokens can be extracted by users.

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
5. Uploads installer artifacts and `SHA256SUMS.txt` to the private draft release.

Release candidates and beta tags containing `-rc.`, `-beta.`, or `-alpha.` are marked prerelease.

## Auto-Update System

Auto-update is intentionally disabled while releases stay private.

Why:

- Tauri signing verifies downloaded updates but does not authenticate the app to GitHub.
- Private GitHub Release assets require a GitHub credential.
- Embedding a GitHub token in the desktop app would expose the token to users.

Current config in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "createUpdaterArtifacts": false
  },
  "plugins": {
    "updater": {
      "active": false,
      "endpoints": [],
      "dialog": false,
      "pubkey": ""
    }
  }
}
```

To re-enable auto-update later, use one of these distribution models:

1. Public download location for signed artifacts, while keeping source private.
2. A NaNomicon-owned update backend that authenticates customers, checks entitlement, and serves signed artifacts.

In both models, Tauri update signing should still be enabled before auto-update ships.

## Manual QA Before Publishing

Treat this checklist as a release blocker before publishing the draft release.

1. Install the Windows `.msi` on a clean Windows machine or VM.
2. Launch the app and create or open the local SQLite database.
3. Validate customer, product, invoice, quotation, receipt, and report flows.
4. Validate PDF export and confirm the saved PDF opens automatically.
5. Validate backup and restore flows if changed.
6. Validate migration or import flows if changed.
7. Download the installer from the private GitHub Release as an authorized user.
8. Confirm `SHA256SUMS.txt` is attached to the release.

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
| Auto-update is unavailable | Expected while releases remain private and updater config is disabled |
| Download fails | Confirm the user has private repository access and the release asset exists |
