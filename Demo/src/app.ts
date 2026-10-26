import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPost, importMediumFeed, listPosts, savePost } from "./data/blog";
import { getSection, listSections, saveSection, archiveSection } from "./data/content";
import {
  archiveWorkspace, createLead, deleteWorkspaceRecord, listLeads, restoreWorkspace,
  updateLeadStatus, workspaceParticipants, workspaceRecord,
} from "./data/leads";
import { anonymousChat } from "./agent/anonymous";
import type { BlogPost, ChatMessage, Lead, SiteSection } from "./shared/types";
import type { SaveSkillInput } from "./skills/types";
import { createAdminWorkspace, listAdminWorkspaces, managedWorkspace, saveWorkspaceCapabilities, workspaceCapabilities } from "./data/workspaces";
import type { WorkspaceCapabilities } from "./shared/types";

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
  const stub = c.env.PORTFOLIO_SESSION.getByName(workspaceId);
  const imported = await stub.initializeWorkspace(
    (input.transcript ?? []).filter((message): message is ChatMessage =>
      (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
    ),
    input.name.trim(),
    input.intent ?? "Talk with Oskar",
  );
  const lead = await createLead(c.env.DB, {
    workspaceId, name: input.name, email: input.email, company: input.company,
    intent: input.intent ?? "Talk with Oskar", summary: input.summary,
  });
  return c.json({ workspaceId, leadId: lead.id, answer: imported.answer }, 201);
});

app.get("/api/workspaces/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  if (lead.workspaceStatus === "archived") return c.json({ error: "This workspace has been archived" }, 410);
  return c.json({
    workspaceId,
    status: lead.workspaceStatus,
    participants: await workspaceParticipants(c.env.DB, workspaceId),
    messages: await c.env.PORTFOLIO_SESSION.getByName(workspaceId).history(),
  });
});

app.post("/api/workspaces/:id/messages", async (c) => {
  const input = await c.req.json<{ message?: string; requestId?: string; recipient?: "owner" | "agent" }>();
  if (!input.message?.trim()) return c.json({ error: "message is required" }, 400);
  if (input.recipient !== "owner" && input.recipient !== "agent") return c.json({ error: "recipient must be owner or agent" }, 400);
  const workspaceId = c.req.param("id");
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  if (lead.workspaceStatus === "archived") return c.json({ error: "This workspace has been archived" }, 410);
  const stub = c.env.PORTFOLIO_SESSION.getByName(workspaceId);
  if (input.recipient === "owner") {
    await stub.sendHumanMessage(input.message, "visitor", lead.name);
    return c.json({ delivered: true, recipient: "owner" });
  }
  return c.json({
    delivered: true,
    recipient: "agent",
    ...await stub.chat(input.message, input.requestId ?? crypto.randomUUID(), false, lead.name),
  });
});

app.use("/api/admin/*", requireAdmin);
app.get("/api/admin/me", (c) => c.json({ email: adminEmail(c.req.raw) ?? "local-development" }));
app.get("/api/admin/skills", async (c) => c.json({ skills: await c.env.SKILL_HUB.getByName("global").listSkills() }));
app.get("/api/admin/skills/:slug", async (c) => {
  const skill = await c.env.SKILL_HUB.getByName("global").getSkill(c.req.param("slug"));
  return skill ? c.json(skill) : c.json({ error: "Skill not found" }, 404);
});
app.post("/api/admin/skills", async (c) => {
  const input = await c.req.json<SaveSkillInput>();
  return c.json(await c.env.SKILL_HUB.getByName("global").saveSkill({ ...input, updatedBy: adminEmail(c.req.raw) ?? "local-development" }), 201);
});
app.put("/api/admin/skills/:slug", async (c) => {
  const input = await c.req.json<Omit<SaveSkillInput, "slug">>();
  return c.json(await c.env.SKILL_HUB.getByName("global").saveSkill({ ...input, slug: c.req.param("slug"), updatedBy: adminEmail(c.req.raw) ?? "local-development" }));
});
app.delete("/api/admin/skills/:slug", async (c) => {
  const deleted = await c.env.SKILL_HUB.getByName("global").deleteSkill(c.req.param("slug"));
  return deleted ? c.json({ deleted: true }) : c.json({ error: "Skill not found" }, 404);
});
app.post("/api/admin/skills/:slug/command", async (c) => {
  const input = await c.req.json<{ command?: string }>();
  if (!input.command?.trim()) return c.json({ error: "command is required" }, 400);
  return c.json(await c.env.SKILL_HUB.getByName("global").runSkillCommand(c.req.param("slug"), input.command, "content"));
});
app.get("/api/admin/computer", async (c) => c.json({ root: "/workspace/skills", entries: await c.env.SKILL_HUB.getByName("global").listComputerFiles() }));
app.get("/api/admin/computer/file", async (c) => {
  const path = c.req.query("path");
  return path ? c.json(await c.env.SKILL_HUB.getByName("global").readComputerFile(path)) : c.json({ error: "path is required" }, 400);
});
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
app.get("/api/admin/workspaces", async (c) => c.json({ workspaces: await listAdminWorkspaces(c.env.DB) }));
app.post("/api/admin/workspaces", async (c) => c.json(await createAdminWorkspace(c.env.DB, await c.req.json<{ title: string; purpose: string }>()), 201));
app.get("/api/admin/workspaces/:id/capabilities", async (c) => c.json(await workspaceCapabilities(c.env.DB, c.req.param("id"))));
app.put("/api/admin/workspaces/:id/capabilities", async (c) => {
  const input = await c.req.json<WorkspaceCapabilities>();
  return c.json(await saveWorkspaceCapabilities(c.env.DB, c.req.param("id"), { webSearch: input.webSearch === true, scheduling: input.scheduling === true, skillSlugs: Array.isArray(input.skillSlugs) ? input.skillSlugs.filter((slug): slug is string => typeof slug === "string") : [] }));
});
app.patch("/api/admin/leads/:id", async (c) => {
  const input = await c.req.json<{ status?: Lead["status"] }>();
  if (!input.status || !["new", "reviewing", "scheduled", "closed"].includes(input.status)) return c.json({ error: "Invalid status" }, 400);
  await updateLeadStatus(c.env.DB, c.req.param("id"), input.status);
  return c.json({ ok: true });
});
app.get("/api/admin/workspaces/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const managed = await managedWorkspace(c.env.DB, workspaceId);
  if (managed) return c.json({ workspaceId, status: managed.status, participants: [{ type: "owner", name: "Oskar Ablimit", email: adminEmail(c.req.raw) }, { type: "agent", name: "Portfolio Agent", email: null }], messages: await c.env.PORTFOLIO_SESSION.getByName(workspaceId).history(true) });
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  return c.json({ workspaceId, status: lead.workspaceStatus, participants: await workspaceParticipants(c.env.DB, workspaceId), messages: await c.env.PORTFOLIO_SESSION.getByName(workspaceId).history() });
});
app.post("/api/admin/workspaces/:id/messages", async (c) => {
  const input = await c.req.json<{ message?: string; recipient?: "visitor" | "agent"; requestId?: string }>();
  if (!input.message?.trim()) return c.json({ error: "message is required" }, 400);
  if (input.recipient !== "visitor" && input.recipient !== "agent") return c.json({ error: "recipient must be visitor or agent" }, 400);
  const workspaceId = c.req.param("id");
  const managed = await managedWorkspace(c.env.DB, workspaceId);
  const stub = c.env.PORTFOLIO_SESSION.getByName(workspaceId);
  if (managed) {
    if (managed.status === "archived") return c.json({ error: "Restore the workspace before messaging" }, 409);
    if (input.recipient !== "agent") return c.json({ error: "Managed workspaces message the agent" }, 400);
    return c.json({ delivered: true, recipient: "agent", ...await stub.chat(input.message, input.requestId ?? crypto.randomUUID(), true, "Oskar Ablimit", "owner") });
  }
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  if (lead.workspaceStatus === "archived") return c.json({ error: "Restore the workspace before replying" }, 409);
  if (input.recipient === "visitor") {
    await stub.sendHumanMessage(input.message, "owner", "Oskar Ablimit");
    return c.json({ delivered: true, recipient: "visitor" });
  }
  return c.json({
    delivered: true,
    recipient: "agent",
    ...await stub.chat(input.message, input.requestId ?? crypto.randomUUID(), false, "Oskar Ablimit", "owner"),
  });
});
app.post("/api/admin/workspaces/:id/archive", async (c) => {
  await archiveWorkspace(c.env.DB, c.req.param("id"));
  return c.json({ archived: true });
});
app.post("/api/admin/workspaces/:id/restore", async (c) => {
  await restoreWorkspace(c.env.DB, c.req.param("id"));
  return c.json({ restored: true });
});
app.delete("/api/admin/workspaces/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  await c.env.PORTFOLIO_SESSION.getByName(workspaceId).deleteWorkspace();
  await deleteWorkspaceRecord(c.env.DB, workspaceId);
  return c.body(null, 204);
});
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
