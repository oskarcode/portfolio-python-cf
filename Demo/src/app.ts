import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPost, importMediumFeed, listPosts, savePost } from "./data/blog";
import { getSection, listSections, saveSection, archiveSection } from "./data/content";
import { createLead, listLeads, updateLeadStatus } from "./data/leads";
import { anonymousChat } from "./agent/anonymous";
import type { BlogPost, ChatMessage, Lead, SiteSection } from "./shared/types";

const app = new Hono<{ Bindings: Env }>();
app.use("/api/*", cors({ origin: (origin) => origin, credentials: true }));

const isLocal = (request: Request) => ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
const adminEmail = (request: Request) => request.headers.get("Cf-Access-Authenticated-User-Email");
const requireAdmin = async (c: { req: { raw: Request }; json: (body: unknown, status?: 401) => Response }, next: () => Promise<void>) => {
  if (!isLocal(c.req.raw) && !adminEmail(c.req.raw)) return c.json({ error: "Cloudflare Access authentication required" }, 401);
  await next();
};

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ ok: row?.ok === 1, services: { d1: "ok", ai: "configured", durableObjects: "configured" } });
});

app.get("/api/content", async (c) => c.json({ sections: await listSections(c.env.DB) }));
app.get("/api/content/:slug", async (c) => {
  const section = await getSection(c.env.DB, c.req.param("slug"));
  return section ? c.json(section) : c.json({ error: "Not found" }, 404);
});
app.get("/api/blog", async (c) => c.json({ posts: await listPosts(c.env.DB) }));
app.get("/api/blog/:slug", async (c) => {
  const post = await getPost(c.env.DB, c.req.param("slug"));
  return post ? c.json(post) : c.json({ error: "Not found" }, 404);
});

app.post("/api/chat", async (c) => {
  const input = await c.req.json<{ messages?: ChatMessage[] }>();
  if (!Array.isArray(input.messages) || input.messages.length === 0) return c.json({ error: "messages are required" }, 400);
  const messages = input.messages.filter((message): message is ChatMessage =>
    (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.length <= 4_000,
  );
  if (messages.length === 0) return c.json({ error: "No valid messages" }, 400);
  return c.json({ answer: await anonymousChat(c.env, messages) });
});

app.post("/api/handoff", async (c) => {
  const input = await c.req.json<{
    name?: string; email?: string; company?: string; intent?: string; summary?: string;
    transcript?: ChatMessage[]; consent?: boolean;
  }>();
  if (input.consent !== true) return c.json({ error: "Consent is required" }, 400);
  if (!input.name?.trim() || !input.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return c.json({ error: "A valid name and email are required" }, 400);
  }
  const workspaceId = crypto.randomUUID();
  const transcript = (input.transcript ?? []).slice(-12).map((m) => `${m.role}: ${m.content.slice(0, 2_000)}`).join("\n");
  const stub = c.env.PORTFOLIO_SESSION.getByName(workspaceId);
  const imported = await stub.chat(
    `This visitor explicitly consented to add Oskar. Preserve this prior conversation as context.\n\n${transcript}\n\nVisitor intent: ${input.intent ?? "Talk with Oskar"}. Acknowledge the handoff briefly and offer a useful next step.`,
    crypto.randomUUID(),
    false,
  );
  const lead = await createLead(c.env.DB, {
    workspaceId, name: input.name, email: input.email, company: input.company,
    intent: input.intent ?? "Talk with Oskar", summary: input.summary,
  });
  return c.json({ workspaceId, leadId: lead.id, answer: imported.answer }, 201);
});

app.get("/api/workspaces/:id", async (c) => {
  const lead = await c.env.DB.prepare("SELECT id FROM leads WHERE workspace_id = ?").bind(c.req.param("id")).first();
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  return c.json({ messages: await c.env.PORTFOLIO_SESSION.getByName(c.req.param("id")).history() });
});

app.post("/api/workspaces/:id/chat", async (c) => {
  const input = await c.req.json<{ message?: string; requestId?: string }>();
  if (!input.message?.trim()) return c.json({ error: "message is required" }, 400);
  const lead = await c.env.DB.prepare("SELECT id FROM leads WHERE workspace_id = ?").bind(c.req.param("id")).first();
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  return c.json(await c.env.PORTFOLIO_SESSION.getByName(c.req.param("id")).chat(input.message, input.requestId ?? crypto.randomUUID(), false));
});

app.use("/api/admin/*", requireAdmin);
app.get("/api/admin/me", (c) => c.json({ email: adminEmail(c.req.raw) ?? "local-development" }));
app.get("/api/admin/content", async (c) => c.json({ sections: await listSections(c.env.DB, true), posts: await listPosts(c.env.DB, true) }));
app.put("/api/admin/sections/:id", async (c) => {
  const input = await c.req.json<Omit<SiteSection, "id" | "updatedAt">>();
  return c.json(await saveSection(c.env.DB, { ...input, id: c.req.param("id") }, adminEmail(c.req.raw) ?? "local"));
});
app.delete("/api/admin/sections/:id", async (c) => {
  await archiveSection(c.env.DB, c.req.param("id"), adminEmail(c.req.raw) ?? "local");
  return c.body(null, 204);
});
app.put("/api/admin/blog/:id", async (c) => {
  const input = await c.req.json<Omit<BlogPost, "id" | "updatedAt">>();
  return c.json(await savePost(c.env.DB, { ...input, id: c.req.param("id") }, adminEmail(c.req.raw) ?? "local"));
});
app.post("/api/admin/blog/import-medium", async (c) => c.json(await importMediumFeed(c.env.DB, adminEmail(c.req.raw) ?? "local")));
app.get("/api/admin/leads", async (c) => c.json({ leads: await listLeads(c.env.DB) }));
app.patch("/api/admin/leads/:id", async (c) => {
  const input = await c.req.json<{ status?: Lead["status"] }>();
  if (!input.status || !["new", "reviewing", "scheduled", "closed"].includes(input.status)) return c.json({ error: "Invalid status" }, 400);
  await updateLeadStatus(c.env.DB, c.req.param("id"), input.status);
  return c.json({ ok: true });
});
app.get("/api/admin/workspaces/:id", async (c) => c.json({ messages: await c.env.PORTFOLIO_SESSION.getByName(c.req.param("id")).history() }));
app.post("/api/admin/agent", async (c) => {
  const input = await c.req.json<{ message?: string; requestId?: string }>();
  if (!input.message?.trim()) return c.json({ error: "message is required" }, 400);
  return c.json(await c.env.PORTFOLIO_SESSION.getByName("owner-content").chat(input.message, input.requestId ?? crypto.randomUUID(), true));
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((error, c) => {
  console.error(JSON.stringify({ event: "request_error", path: c.req.path, message: error.message }));
  return c.json({ error: "Request failed", detail: error.message }, 500);
});

export default app;
