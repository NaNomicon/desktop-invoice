import semverValid from "semver/functions/valid";
import semverGt from "semver/functions/gt";
import type { Env } from "./env";
import type { GitHubRelease, GitHubAsset, TauriUpdateResponse } from "./types";

const PLATFORM_ASSET_PATTERNS: Record<string, RegExp[]> = {
  "darwin-x86_64": [/darwin.*x64|x64.*darwin|macos.*x64|x64.*macos/i, /\.tar\.gz$/i],
  "darwin-aarch64": [/darwin.*aarch64|aarch64.*darwin|macos.*arm|arm.*macos/i, /\.tar\.gz$/i],
  "linux-x86_64": [/linux.*x64|x64.*linux|amd64.*linux|linux.*amd64/i, /\.AppImage$/i],
  "windows-x86_64": [/windows.*x64|x64.*windows|win.*x64|x64.*win/i, /\.(msi|exe|zip)$/i],
};

function sanitizeVersion(tag: string): string {
  return tag.replace(/^v/, "");
}

function matchesTarget(target: string, arch: string, assetName: string): boolean {
  const key = `${target}-${arch}`;
  const patterns = PLATFORM_ASSET_PATTERNS[key];
  if (!patterns) return false;
  return patterns.some((p) => p.test(assetName));
}

async function fetchLatestRelease(env: Env): Promise<GitHubRelease> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xpress-billing-updater/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN}`;
  }
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_ACCOUNT}/${env.GITHUB_REPO}/releases/latest`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<GitHubRelease>;
}

async function fetchSignature(asset: GitHubAsset, allAssets: GitHubAsset[], env: Env): Promise<string> {
  const sigAsset = allAssets.find((a) => a.name === `${asset.name}.sig`);
  if (!sigAsset) throw new Error(`No signature found for ${asset.name}`);

  const headers: HeadersInit = {
    Accept: "application/octet-stream",
    "User-Agent": "xpress-billing-updater/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const res = await fetch(sigAsset.browser_download_url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch signature: ${res.status}`);
  return res.text();
}

async function proxyAssetDownload(asset: GitHubAsset, env: Env): Promise<Response> {
  const headers: HeadersInit = {
    Accept: "application/octet-stream",
    "User-Agent": "xpress-billing-updater/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN}`;
  }
  const upstream = await fetch(asset.browser_download_url, { headers, redirect: "follow" });
  if (!upstream.ok) {
    return new Response("Asset not found", { status: 404 });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asset.name}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function handleUpdateCheck(
  target: string,
  arch: string,
  currentVersion: string,
  env: Env,
  workerUrl: string
): Promise<Response> {
  if (!semverValid(currentVersion)) {
    return new Response("Invalid version", { status: 400 });
  }

  const release = await fetchLatestRelease(env);
  const remoteVersion = sanitizeVersion(release.tag_name);

  if (!semverValid(remoteVersion) || !semverGt(remoteVersion, currentVersion)) {
    return new Response(null, { status: 204 });
  }

  const asset = release.assets.find((a) => matchesTarget(target, arch, a.name));
  if (!asset) return new Response(null, { status: 204 });

  const signature = await fetchSignature(asset, release.assets, env);
  const downloadUrl = `${workerUrl}/download/${encodeURIComponent(asset.name)}`;

  const body: TauriUpdateResponse = {
    version: remoteVersion,
    url: downloadUrl,
    signature,
    notes: release.body ?? "",
    pub_date: release.published_at,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function handleDownload(
  filename: string,
  env: Env,
  release: GitHubRelease
): Promise<Response> {
  const asset = release.assets.find((a) => a.name === filename);
  if (!asset) return new Response("Asset not found", { status: 404 });
  return proxyAssetDownload(asset, env);
}

export { fetchLatestRelease };
