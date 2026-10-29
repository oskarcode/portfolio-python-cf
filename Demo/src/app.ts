// Application ownership: Hono route composition and security boundaries for every Worker API.
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
import { notifyOwnerOfBooking, notifyOwnerOfHandoff, sendBookingConfirmation } from "./notifications/email";
import { bookingIcs } from "./calendar/ics";
import { cancelSlot, createBooking, createSlot, getBooking, listCalendar, listOpenSlots } from "./data/calendar";

const app = new Hono<{ Bindings: Env }>();
app.use("/api/*", cors({ origin: (origin) => origin, credentials: true }));
app.use("/api/workspaces/*", async (c, next) => { await next(); c.header("Cache-Control", "private, no-store"); });

const isLocal = (request: Request) => ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
const adminEmail = (request: Request) => request.headers.get("Cf-Access-Authenticated-User-Email");
const requireAdmin = async (c: { req: { raw: Request }; json: (body: unknown, status?: 401) => Response }, next: () => Promise<void>) => {
  if (!isLocal(c.req.raw) && !adminEmail(c.req.raw)) return c.json({ error: "Cloudflare Access authentication required" }, 401);
  await next();
};

/**
 * Input:
 * - GET /api/health with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ ok: row?.ok === 1, services: { d1: "ok", ai: "configured", durableObjects: "configured" } });
});

/**
 * Input:
 * - GET /api/content with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/content", async (c) => c.json({ sections: await listSections(c.env.DB) }));
/**
 * Input:
 * - GET /api/content/:slug with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/content/:slug", async (c) => {
  const section = await getSection(c.env.DB, c.req.param("slug"));
  return section ? c.json(section) : c.json({ error: "Not found" }, 404);
});
/**
 * Input:
 * - GET /api/blog with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/blog", async (c) => c.json({ posts: await listPosts(c.env.DB) }));
/**
 * Input:
 * - GET /api/blog/:slug with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/blog/:slug", async (c) => {
  const post = await getPost(c.env.DB, c.req.param("slug"));
  return post ? c.json(post) : c.json({ error: "Not found" }, 404);
});

/**
 * Input:
 * - POST /api/chat with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/chat", async (c) => {
  const input = await c.req.json<{ messages?: ChatMessage[] }>();
  if (!Array.isArray(input.messages) || input.messages.length === 0) return c.json({ error: "messages are required" }, 400);
  const messages = input.messages.filter((message): message is ChatMessage =>
    (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.length <= 4_000,
  );
  if (messages.length === 0) return c.json({ error: "No valid messages" }, 400);
  return c.json({ answer: await anonymousChat(c.env, messages) });
});

/**
 * Input:
 * - POST /api/handoff with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/calendar/slots", async (c) => c.json({ slots: await listOpenSlots(c.env.DB) }));

app.get("/api/calendar/bookings/:id/calendar.ics", async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Booking not found" }, 404);
  const value = await getBooking(c.env.DB, id);
  if (!value || value.status !== "confirmed") return c.json({ error: "Booking not found" }, 404);
  return new Response(bookingIcs(value, c.env.MEETING_URL), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="oskar-consultation-${value.id}.ics"` } });
});

app.post("/api/calendar/bookings", async (c) => {
  const input = await c.req.json<{ slotId?: string; workspaceId?: string; name?: string; email?: string; topic?: string }>();
  if (!input.slotId || !input.name?.trim() || !input.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || !input.topic?.trim()) return c.json({ error: "A time, name, valid email, and topic are required" }, 400);
  try {
    const value = await createBooking(c.env.DB, { slotId: input.slotId, workspaceId: input.workspaceId, name: input.name.trim().slice(0, 120), email: input.email.trim().slice(0, 254), topic: input.topic.trim().slice(0, 1_000) });
    const emailInput = { ...value, bookingId: value.id, origin: new URL(c.req.url).origin, meetingUrl: c.env.MEETING_URL };
    c.executionCtx.waitUntil(Promise.all([
      notifyOwnerOfBooking(c.env, emailInput).catch((error: unknown) => console.error(JSON.stringify({ event: "booking_owner_notification_failed", bookingId: value.id, error: error instanceof Error ? error.message : String(error) }))),
      sendBookingConfirmation(c.env, emailInput).catch((error: unknown) => console.error(JSON.stringify({ event: "booking_confirmation_failed", bookingId: value.id, error: error instanceof Error ? error.message : String(error) }))),
    ]).then(() => undefined));
    return c.json({ booking: value, calendarUrl: `/api/calendar/bookings/${value.id}/calendar.ics`, meetingUrl: c.env.MEETING_URL }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Could not book this time" }, 409);
  }
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
  const intent = input.intent ?? "Talk with Oskar";
  const lead = await createLead(c.env.DB, {
    workspaceId, name: input.name, email: input.email, company: input.company,
    intent, summary: input.summary,
  });
  c.executionCtx.waitUntil(notifyOwnerOfHandoff(c.env, {
    name: input.name,
    email: input.email,
    company: input.company,
    intent,
    workspaceId,
    origin: new URL(c.req.url).origin,
  }).catch((error: unknown) => console.error(JSON.stringify({
    event: "handoff_notification_failed",
    workspaceId,
    error: error instanceof Error ? error.message : String(error),
  }))));
  return c.json({ workspaceId, leadId: lead.id, answer: imported.answer }, 201);
});

/**
 * Input:
 * - GET /api/workspaces/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
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
    bookingProfile: { name: lead.name, email: lead.email, topic: lead.intent },
  });
});

/**
 * Input:
 * - POST /api/workspaces/:id/messages with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
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
/**
 * Input:
 * - GET /api/admin/me with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/me", (c) => c.json({ email: adminEmail(c.req.raw) ?? "local-development" }));
app.get("/api/admin/calendar", async (c) => c.json(await listCalendar(c.env.DB)));
app.post("/api/admin/calendar/slots", async (c) => {
  const input = await c.req.json<{ startsAt?: string; endsAt?: string }>();
  const starts = input.startsAt ? new Date(input.startsAt) : null;
  const ends = input.endsAt ? new Date(input.endsAt) : null;
  if (!starts || !ends || Number.isNaN(starts.valueOf()) || Number.isNaN(ends.valueOf()) || starts <= new Date() || ends <= starts || ends.valueOf() - starts.valueOf() > 8 * 60 * 60 * 1_000) return c.json({ error: "Choose a future start and an end no more than eight hours later" }, 400);
  try { return c.json(await createSlot(c.env.DB, starts.toISOString(), ends.toISOString()), 201); }
  catch (error) { return c.json({ error: error instanceof Error ? error.message : "Could not add this time" }, 409); }
});
app.delete("/api/admin/calendar/slots/:id", async (c) => {
  const cancelled = await cancelSlot(c.env.DB, c.req.param("id"));
  return cancelled ? c.json({ cancelled: true }) : c.json({ error: "Only open times can be removed" }, 409);
});
/**
 * Input:
 * - GET /api/admin/skills with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/skills", async (c) => c.json({ skills: await c.env.SKILL_HUB.getByName("global").listSkills() }));
/**
 * Input:
 * - GET /api/admin/skills/:slug with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/skills/:slug", async (c) => {
  const skill = await c.env.SKILL_HUB.getByName("global").getSkill(c.req.param("slug"));
  return skill ? c.json(skill) : c.json({ error: "Skill not found" }, 404);
});
/**
 * Input:
 * - POST /api/admin/skills with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/admin/skills", async (c) => {
  const input = await c.req.json<SaveSkillInput>();
  return c.json(await c.env.SKILL_HUB.getByName("global").saveSkill({ ...input, updatedBy: adminEmail(c.req.raw) ?? "local-development" }), 201);
});
/**
 * Input:
 * - PUT /api/admin/skills/:slug with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.put("/api/admin/skills/:slug", async (c) => {
  const input = await c.req.json<Omit<SaveSkillInput, "slug">>();
  return c.json(await c.env.SKILL_HUB.getByName("global").saveSkill({ ...input, slug: c.req.param("slug"), updatedBy: adminEmail(c.req.raw) ?? "local-development" }));
});
/**
 * Input:
 * - DELETE /api/admin/skills/:slug with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.delete("/api/admin/skills/:slug", async (c) => {
  const deleted = await c.env.SKILL_HUB.getByName("global").deleteSkill(c.req.param("slug"));
  return deleted ? c.json({ deleted: true }) : c.json({ error: "Skill not found" }, 404);
});
/**
 * Input:
 * - POST /api/admin/skills/:slug/command with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/admin/skills/:slug/command", async (c) => {
  const input = await c.req.json<{ command?: string }>();
  if (!input.command?.trim()) return c.json({ error: "command is required" }, 400);
  return c.json(await c.env.SKILL_HUB.getByName("global").runSkillCommand(c.req.param("slug"), input.command, "content"));
});
/**
 * Input:
 * - GET /api/admin/computer with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/computer", async (c) => c.json({ root: "/workspace/skills", entries: await c.env.SKILL_HUB.getByName("global").listComputerFiles() }));
/**
 * Input:
 * - GET /api/admin/computer/file with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/computer/file", async (c) => {
  const path = c.req.query("path");
  return path ? c.json(await c.env.SKILL_HUB.getByName("global").readComputerFile(path)) : c.json({ error: "path is required" }, 400);
});
/**
 * Input:
 * - GET /api/admin/content with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/content", async (c) => c.json({ sections: await listSections(c.env.DB, true), posts: await listPosts(c.env.DB, true) }));
/**
 * Input:
 * - PUT /api/admin/sections/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.put("/api/admin/sections/:id", async (c) => {
  const input = await c.req.json<Omit<SiteSection, "id" | "updatedAt">>();
  return c.json(await saveSection(c.env.DB, { ...input, id: c.req.param("id") }, adminEmail(c.req.raw) ?? "local"));
});
/**
 * Input:
 * - DELETE /api/admin/sections/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.delete("/api/admin/sections/:id", async (c) => {
  await archiveSection(c.env.DB, c.req.param("id"), adminEmail(c.req.raw) ?? "local");
  return c.body(null, 204);
});
/**
 * Input:
 * - PUT /api/admin/blog/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.put("/api/admin/blog/:id", async (c) => {
  const input = await c.req.json<Omit<BlogPost, "id" | "updatedAt">>();
  return c.json(await savePost(c.env.DB, { ...input, id: c.req.param("id") }, adminEmail(c.req.raw) ?? "local"));
});
/**
 * Input:
 * - POST /api/admin/blog/import-medium with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/admin/blog/import-medium", async (c) => c.json(await importMediumFeed(c.env.DB, adminEmail(c.req.raw) ?? "local")));
/**
 * Input:
 * - GET /api/admin/leads with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/leads", async (c) => c.json({ leads: await listLeads(c.env.DB) }));
/**
 * Input:
 * - GET /api/admin/workspaces with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/workspaces", async (c) => c.json({ workspaces: await listAdminWorkspaces(c.env.DB) }));
/**
 * Input:
 * - POST /api/admin/workspaces with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/admin/workspaces", async (c) => c.json(await createAdminWorkspace(c.env.DB, await c.req.json<{ title: string; purpose: string }>()), 201));
/**
 * Input:
 * - GET /api/admin/workspaces/:id/capabilities with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/workspaces/:id/capabilities", async (c) => c.json(await workspaceCapabilities(c.env.DB, c.req.param("id"))));
/**
 * Input:
 * - PUT /api/admin/workspaces/:id/capabilities with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.put("/api/admin/workspaces/:id/capabilities", async (c) => {
  const input = await c.req.json<WorkspaceCapabilities>();
  return c.json(await saveWorkspaceCapabilities(c.env.DB, c.req.param("id"), { webSearch: input.webSearch === true, scheduling: input.scheduling === true, skillSlugs: Array.isArray(input.skillSlugs) ? input.skillSlugs.filter((slug): slug is string => typeof slug === "string") : [] }));
});
/**
 * Input:
 * - PATCH /api/admin/leads/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.patch("/api/admin/leads/:id", async (c) => {
  const input = await c.req.json<{ status?: Lead["status"] }>();
  if (!input.status || !["new", "reviewing", "scheduled", "closed"].includes(input.status)) return c.json({ error: "Invalid status" }, 400);
  await updateLeadStatus(c.env.DB, c.req.param("id"), input.status);
  return c.json({ ok: true });
});
/**
 * Input:
 * - GET /api/admin/workspaces/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.get("/api/admin/workspaces/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const managed = await managedWorkspace(c.env.DB, workspaceId);
  if (managed) return c.json({ workspaceId, status: managed.status, participants: [{ type: "owner", name: "Oskar Ablimit", email: adminEmail(c.req.raw) }, { type: "agent", name: "Portfolio Agent", email: null }], messages: await c.env.PORTFOLIO_SESSION.getByName(workspaceId).history(true) });
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  return c.json({ workspaceId, status: lead.workspaceStatus, participants: await workspaceParticipants(c.env.DB, workspaceId), messages: await c.env.PORTFOLIO_SESSION.getByName(workspaceId).history() });
});
/**
 * Input:
 * - POST /api/admin/workspaces/:id/messages with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
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
/**
 * Input:
 * - POST /api/admin/workspaces/:id/archive with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/admin/workspaces/:id/archive", async (c) => {
  await archiveWorkspace(c.env.DB, c.req.param("id"));
  return c.json({ archived: true });
});
/**
 * Input:
 * - POST /api/admin/workspaces/:id/restore with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.post("/api/admin/workspaces/:id/restore", async (c) => {
  await restoreWorkspace(c.env.DB, c.req.param("id"));
  return c.json({ restored: true });
});
/**
 * Input:
 * - DELETE /api/admin/workspaces/:id with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
app.delete("/api/admin/workspaces/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  await c.env.PORTFOLIO_SESSION.getByName(workspaceId).deleteWorkspace();
  await deleteWorkspaceRecord(c.env.DB, workspaceId);
  return c.body(null, 204);
});
/**
 * Input:
 * - POST /api/admin/agent with path, query, or JSON values defined in the handler.
 * Output:
 * - A JSON response or empty success response with an explicit HTTP status.
 * What this function does:
 * - It enforces the route boundary, calls the owning service, and maps failures through Hono.
 */
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
