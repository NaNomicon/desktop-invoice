import { handleUpdateCheck, handleDownload, fetchLatestRelease } from "./handler";
import type { Env } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const workerUrl = `${url.protocol}//${url.host}`;

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const updateMatch = path.match(/^\/v1\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (updateMatch) {
      const [, target, arch, version] = updateMatch;
      return handleUpdateCheck(target, arch, version, env, workerUrl);
    }

    const downloadMatch = path.match(/^\/download\/(.+)$/);
    if (downloadMatch) {
      const filename = decodeURIComponent(downloadMatch[1]);
      const release = await fetchLatestRelease(env);
      return handleDownload(filename, env, release);
    }

    return new Response(
      JSON.stringify({ name: "xpress-billing-updater", status: "ok" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  },
} satisfies ExportedHandler<Env>;
