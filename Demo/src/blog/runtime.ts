// Application ownership: safely load immutable AI-authored blog frontends into isolated Dynamic Workers.
import type { BlogWorkerRevision } from "../data/dynamic-blogs";

const workerCode = (source: string): WorkerLoaderWorkerCode => ({
  compatibilityDate: "2026-10-24",
  compatibilityFlags: ["nodejs_compat"],
  mainModule: "index.js",
  modules: { "index.js": { js: source } },
  globalOutbound: null,
  limits: { cpuMs: 30, subRequests: 0 },
});

const secured = (response: Response, published: boolean): Response => {
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; media-src data:; object-src 'none'; frame-ancestors 'self'; form-action 'none'; base-uri 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", published ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export async function renderDynamicBlog(loader: WorkerLoader, value: BlogWorkerRevision, request: Request, published: boolean): Promise<Response> {
  const worker = published
    ? loader.get(`blog:${value.postId}:${value.id}`, () => workerCode(value.workerSource))
    : loader.load(workerCode(value.workerSource));
  const response = await worker.getEntrypoint().fetch(request);
  return secured(response, published);
}
