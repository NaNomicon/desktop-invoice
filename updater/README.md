# XPress Billing Updater

Cloudflare Worker that proxies Tauri auto-update checks and installer downloads from the private `NaNomicon/desktop-invoice` GitHub repository.

## How It Works

```
App → GET /v1/{target}/{arch}/{version} → Worker → GitHub API (private, token auth)
                                                  ↓
App ← { version, url, signature, ... }  ←────────┘

App → GET /download/{filename} → Worker → GitHub asset (token auth) → streams back
```

The app never touches GitHub directly. The GitHub token lives only in Cloudflare secrets.

## Endpoint

```
GET /v1/:target/:arch/:currentVersion
```

Returns `200 + JSON` if an update is available, `204 No Content` if already up to date.

```
GET /download/:filename
```

Proxies the installer download from the private GitHub release with auth.

## Initial Setup

### 1. Generate Tauri signing keypair

Run once on your machine and store the output securely:

```bash
npm run tauri signer generate -- -w ~/.tauri/xpress-billing.key
```

This outputs a private key file and a public key string. The public key goes into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.

### 2. Add GitHub Actions secrets

In `NaNomicon/desktop-invoice` → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/xpress-billing.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password you chose during key generation |

### 3. Create a GitHub fine-grained PAT

Go to GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token:

- Repository access: `NaNomicon/desktop-invoice` only
- Permissions: `Contents: Read-only`

### 4. Deploy the Cloudflare Worker

```bash
cd updater

# Authenticate with Cloudflare
npx wrangler login

# Add the GitHub token as a secret (never stored in wrangler.toml)
npx wrangler secret put GITHUB_TOKEN
# Paste the PAT from step 3 when prompted

# Deploy
npx wrangler deploy
```

The worker deploys to `https://xpress-billing-updater.nanomicon.workers.dev`.

### 5. Set the updater public key

In `src-tauri/tauri.conf.json`, replace `YOUR_UPDATER_PUBLIC_KEY_HERE` with the public key from step 1:

```json
"updater": {
  "active": true,
  "endpoints": ["https://xpress-billing-updater.nanomicon.workers.dev/v1/{{target}}/{{arch}}/{{current_version}}"],
  "dialog": true,
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6..."
}
```

## Local Development

```bash
cd updater
npm install
npx wrangler dev
```

The worker runs at `http://localhost:8787`. Test an update check:

```bash
curl http://localhost:8787/v1/windows/x86_64/0.0.1
```

Set a local `GITHUB_TOKEN` for dev:

```bash
echo "GITHUB_TOKEN=ghp_..." > .dev.vars
```

## Updating the Worker

```bash
cd updater
npx wrangler deploy
```

No app release needed — the worker is independent of the app version.
