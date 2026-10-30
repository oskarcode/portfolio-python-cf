// Application ownership: Hono route composition and security boundaries for every Worker API.
// Hono provides the Worker router and CORS middleware; application modules below own domain behavior.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPost, importMediumFeed, listPosts, savePost } from "./data/blog";
import { getSection, listSections, saveSection, archiveSection } from "./data/content";
import {
  createLead, deleteWorkspaceRecord, listLeads, updateLeadStatus, workspaceParticipants, workspaceRecord,
} from "./data/leads";
import { anonymousChat } from "./agent/anonymous";
import type { BlogPost, ChatMessage, Lead, SiteSection } from "./shared/types";
import type { SaveSkillInput } from "./skills/types";
import { claimWorkspaceOnboarding, createAdminWorkspace, deleteManagedWorkspaceRecord, initializeWorkspaceCapabilities, listAdminWorkspaces, managedWorkspace, markWorkspaceInvitation, releaseWorkspaceOnboarding, saveWorkspaceCapabilities, saveWorkspaceGuest, touchWorkspacePresence, workspaceCapabilities, workspaceGuest, workspacePresence } from "./data/workspaces";
import type { WorkspaceCapabilities } from "./shared/types";
import { notifyOwnerOfBooking, notifyOwnerOfHandoff, sendBookingConfirmation, sendWorkspaceInvitation } from "./notifications/email";
import { bookingIcs } from "./calendar/ics";
import { cancelSlot, createBooking, createSlot, getBooking, listCalendar, listOpenSlots } from "./data/calendar";

const app = new Hono<{ Bindings: Env }>();
app.use("/api/*", cors({ origin: (origin) => origin, credentials: true }));
app.use("/api/workspaces/*", async (c, next) => { await next(); c.header("Cache-Control", "private, no-store"); });

const isLocal = (request: Request) => ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
const adminEmail = (request: Request) => request.headers.get("Cf-Access-Authenticated-User-Email");
const isRecentlyOnline = (value: string | null) => value !== null && Date.now() - Date.parse(`${value.replace(" ", "T")}Z`) < 20_000;
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
 * - GET /api/calendar/slots without visitor identity.
 * Output:
 * - JSON containing currently open consultation slots.
 * What this function does:
 * - It exposes availability while leaving booking identity inside persistent workspaces.
 */
app.get("/api/calendar/slots", async (c) => c.json({ slots: await listOpenSlots(c.env.DB) }));

/**
 * Input:
 * - A confirmed booking ID in the calendar download URL.
 * Output:
 * - An iCalendar attachment or a JSON 404.
 * What this function does:
 * - It renders the fixed Meet URL and 24-hour alarm for one confirmed booking.
 */
app.get("/api/calendar/bookings/:id/calendar.ics", async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Booking not found" }, 404);
  const value = await getBooking(c.env.DB, id);
  if (!value || value.status !== "confirmed") return c.json({ error: "Booking not found" }, 404);
  return new Response(bookingIcs(value, c.env.MEETING_URL), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="oskar-consultation-${value.id}.ics"` } });
});

/**
 * Input:
 * - A consultation slot ID and opaque active workspace ID.
 * Output:
 * - The confirmed booking, calendar URL, and meeting URL.
 * What this function does:
 * - It ignores browser identity fields, reuses verified D1 lead details, persists confirmation, and queues transactional email.
 */
app.post("/api/calendar/bookings", async (c) => {
  const input = await c.req.json<{ slotId?: string; workspaceId?: string }>();
  if (!input.slotId || !input.workspaceId) return c.json({ error: "A persistent workspace and consultation time are required" }, 400);
  const [lead, managed, guest] = await Promise.all([workspaceRecord(c.env.DB, input.workspaceId), managedWorkspace(c.env.DB, input.workspaceId), workspaceGuest(c.env.DB, input.workspaceId)]);
  const profile = lead ? { name: lead.name, email: lead.email, topic: lead.intent } : managed && guest ? { name: guest.name, email: guest.email, topic: managed.purpose } : null;
  if (!profile) return c.json({ error: "Workspace not found" }, 404);
  try {
    const value = await createBooking(c.env.DB, { slotId: input.slotId, workspaceId: input.workspaceId, ...profile });
    const calendarUrl = `/api/calendar/bookings/${value.id}/calendar.ics`;
    const confirmation = `**Your meeting is confirmed.**\n\n**When:** ${value.startsAt}\n\n**Topic:** ${value.topic}\n\nA confirmation email is being sent to **${value.email}**, and Oskar has been notified. [Join the Google Meet](${c.env.MEETING_URL}) or [add the meeting to your calendar with a 24-hour reminder](${calendarUrl}).`;
    await c.env.PORTFOLIO_SESSION.getByName(input.workspaceId).recordAgentMessage(confirmation).catch((error: unknown) => {
      console.error(JSON.stringify({ event: "booking_transcript_write_failed", bookingId: value.id, workspaceId: input.workspaceId, error: error instanceof Error ? error.message : String(error) }));
    });
    const emailInput = { ...value, bookingId: value.id, origin: new URL(c.req.url).origin, meetingUrl: c.env.MEETING_URL };
    c.executionCtx.waitUntil(Promise.all([
      notifyOwnerOfBooking(c.env, emailInput).catch((error: unknown) => console.error(JSON.stringify({ event: "booking_owner_notification_failed", bookingId: value.id, error: error instanceof Error ? error.message : String(error) }))),
      sendBookingConfirmation(c.env, emailInput).catch((error: unknown) => console.error(JSON.stringify({ event: "booking_confirmation_failed", bookingId: value.id, error: error instanceof Error ? error.message : String(error) }))),
    ]).then(() => undefined));
    return c.json({ booking: value, calendarUrl, meetingUrl: c.env.MEETING_URL }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Could not book this time" }, 409);
  }
});

/**
 * Input:
 * - Consented contact details, intent, and an optional anonymous transcript.
 * Output:
 * - The new workspace and lead IDs plus the durable agent acknowledgement.
 * What this function does:
 * - It creates the capability URL workspace, D1 lead, durable transcript, participants, and owner alert.
 */
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
  const intent = input.intent ?? "Talk with Oskar";
  const lead = await createLead(c.env.DB, {
    workspaceId, name: input.name, email: input.email, company: input.company,
    intent, summary: input.summary,
  });
  const skillHub = c.env.SKILL_HUB.getByName("global");
  const defaultSkills = (await skillHub.listSkills()).filter((skill) => skill.enabled).map((skill) => skill.slug);
  await initializeWorkspaceCapabilities(c.env.DB, workspaceId, defaultSkills);
  const imported = await stub.initializeWorkspace(
    (input.transcript ?? []).filter((message): message is ChatMessage =>
      (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
    ),
    input.name.trim(),
    intent,
  );
  await claimWorkspaceOnboarding(c.env.DB, workspaceId);
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
  const [lead, managed, initialGuest] = await Promise.all([workspaceRecord(c.env.DB, workspaceId), managedWorkspace(c.env.DB, workspaceId), workspaceGuest(c.env.DB, workspaceId)]);
  if (!lead && (!managed || !initialGuest)) return c.json({ error: "Workspace not found" }, 404);
  await touchWorkspacePresence(c.env.DB, workspaceId, "visitor");
  const stub = c.env.PORTFOLIO_SESSION.getByName(workspaceId);
  if (await claimWorkspaceOnboarding(c.env.DB, workspaceId)) {
    c.executionCtx.waitUntil(stub.onboardInvitedGuest(lead?.name ?? initialGuest!.name, lead?.intent ?? managed?.purpose).catch(async (error: unknown) => {
      await releaseWorkspaceOnboarding(c.env.DB, workspaceId);
      console.error(JSON.stringify({ event: "workspace_onboarding_failed", workspaceId, error: error instanceof Error ? error.message : String(error) }));
    }).then(() => undefined));
  }
  const [presence, guest, storedParticipants, messages] = await Promise.all([
    workspacePresence(c.env.DB, workspaceId),
    managed ? workspaceGuest(c.env.DB, workspaceId) : Promise.resolve(null),
    lead ? workspaceParticipants(c.env.DB, workspaceId) : Promise.resolve([]),
    stub.history(),
  ]);
  const participants = lead ? storedParticipants.map((participant) => ({ ...participant, online: participant.type === "visitor" ? isRecentlyOnline(presence.visitor) : participant.type === "owner" ? isRecentlyOnline(presence.owner) : true, lastSeenAt: participant.type === "visitor" ? presence.visitor : participant.type === "owner" ? presence.owner : null, status: participant.type === "visitor" ? "joined" as const : participant.type === "owner" ? "joined" as const : "available" as const })) : [
    { type: "visitor" as const, name: guest!.name, email: guest!.email, online: isRecentlyOnline(presence.visitor), lastSeenAt: presence.visitor, status: guest!.joinedAt ? "joined" as const : guest!.invitationStatus === "failed" ? "email-failed" as const : "invited" as const },
    { type: "owner" as const, name: "Oskar Ablimit", email: null, online: isRecentlyOnline(presence.owner), lastSeenAt: presence.owner, status: "joined" as const },
    { type: "agent" as const, name: "Portfolio Agent", email: null, online: true, lastSeenAt: null, status: "available" as const },
  ];
  return c.json({
    workspaceId,
    status: lead?.workspaceStatus ?? managed!.status,
    participants,
    messages,
    bookingProfile: lead ? { name: lead.name, email: lead.email, topic: lead.intent } : { name: guest!.name, email: guest!.email, topic: managed!.purpose },
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
  const [lead, managed, guest] = await Promise.all([workspaceRecord(c.env.DB, workspaceId), managedWorkspace(c.env.DB, workspaceId), workspaceGuest(c.env.DB, workspaceId)]);
  const visitorName = lead?.name ?? (managed && guest ? guest.name : null);
  if (!visitorName) return c.json({ error: "Workspace not found" }, 404);
  const stub = c.env.PORTFOLIO_SESSION.getByName(workspaceId);
  if (input.recipient === "owner") {
    await stub.sendHumanMessage(input.message, "visitor", visitorName);
    return c.json({ delivered: true, recipient: "owner" });
  }
  return c.json({
    delivered: true,
    recipient: "agent",
    ...await stub.chat(input.message, input.requestId ?? crypto.randomUUID(), false, visitorName),
  });
});

app.use("/api/admin/*", requireAdmin);
app.use("/api/admin/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});
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
app.get("/api/admin/skills", async (c) => {
  const skillHub = c.env.SKILL_HUB.getByName("global");
  return c.json({ skills: await skillHub.listSkills() });
});
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
app.post("/api/admin/workspaces", async (c) => {
  const input = await c.req.json<{ title: string; purpose: string; guestEmail?: string; guestName?: string }>();
  const skillHub = c.env.SKILL_HUB.getByName("global");
  const skills = await skillHub.listSkills();
  const workspace = await createAdminWorkspace(c.env.DB, {
    ...input,
    capabilities: { portfolioRead: true, blogRead: true, consultation: true, webSearch: true, scheduling: true, skillSlugs: skills.filter((skill) => skill.enabled).map((skill) => skill.slug) },
  });
  let invitationEmail: "not-requested" | "sent" | "failed" = "not-requested";
  if (workspace.visitorEmail && workspace.visitorName) {
    try {
      await sendWorkspaceInvitation(c.env, { email: workspace.visitorEmail, name: workspace.visitorName, workspaceTitle: workspace.title, purpose: workspace.purpose, workspaceId: workspace.id, origin: new URL(c.req.url).origin });
      await markWorkspaceInvitation(c.env.DB, workspace.id, "sent");
      invitationEmail = "sent";
    } catch (error) {
      invitationEmail = "failed";
      await markWorkspaceInvitation(c.env.DB, workspace.id, "failed");
      console.error(JSON.stringify({ event: "workspace_invitation_failed", workspaceId: workspace.id, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  return c.json({ ...workspace, invitationEmail }, 201);
});
app.post("/api/admin/workspaces/:id/invite", async (c) => {
  const workspaceId = c.req.param("id");
  const workspace = await managedWorkspace(c.env.DB, workspaceId);
  if (!workspace) return c.json({ error: "Only admin-created workspaces support email invitations" }, 400);
  const input = await c.req.json<{ email?: string; name?: string }>();
  if (!input.email) return c.json({ error: "Guest email is required" }, 400);
  const guest = await saveWorkspaceGuest(c.env.DB, workspaceId, input.email, input.name);
  try {
    await sendWorkspaceInvitation(c.env, { email: guest.email, name: guest.name, workspaceTitle: workspace.title, purpose: workspace.purpose, workspaceId, origin: new URL(c.req.url).origin });
    await markWorkspaceInvitation(c.env.DB, workspaceId, "sent");
    return c.json({ ...guest, invitationEmail: "sent" });
  } catch (error) {
    await markWorkspaceInvitation(c.env.DB, workspaceId, "failed");
    console.error(JSON.stringify({ event: "workspace_invitation_failed", workspaceId, error: error instanceof Error ? error.message : String(error) }));
    return c.json({ ...guest, invitationEmail: "failed" });
  }
});
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
  const workspaceId = c.req.param("id");
  const input = await c.req.json<WorkspaceCapabilities>();
  return c.json(await saveWorkspaceCapabilities(c.env.DB, workspaceId, {
    portfolioRead: input.portfolioRead === true, blogRead: input.blogRead === true, consultation: input.consultation === true,
    webSearch: input.webSearch === true, scheduling: input.scheduling === true,
    skillSlugs: Array.isArray(input.skillSlugs) ? input.skillSlugs.filter((slug): slug is string => typeof slug === "string") : [],
  }));
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
  const [managed, lead] = await Promise.all([managedWorkspace(c.env.DB, workspaceId), workspaceRecord(c.env.DB, workspaceId)]);
  if (!managed && !lead) return c.json({ error: "Workspace not found" }, 404);
  await touchWorkspacePresence(c.env.DB, workspaceId, "owner");
  const [presence, guest, storedParticipants, messages] = await Promise.all([
    workspacePresence(c.env.DB, workspaceId),
    managed ? workspaceGuest(c.env.DB, workspaceId) : Promise.resolve(null),
    lead ? workspaceParticipants(c.env.DB, workspaceId) : Promise.resolve([]),
    c.env.PORTFOLIO_SESSION.getByName(workspaceId).history(Boolean(managed)),
  ]);
  const participants = managed ? [
    ...(guest ? [{ type: "visitor" as const, name: guest.name, email: guest.email, online: isRecentlyOnline(presence.visitor), lastSeenAt: presence.visitor, status: guest.joinedAt ? "joined" as const : guest.invitationStatus === "failed" ? "email-failed" as const : "invited" as const }] : []),
    { type: "owner" as const, name: "Oskar Ablimit", email: adminEmail(c.req.raw), online: true, lastSeenAt: presence.owner, status: "joined" as const },
    { type: "agent" as const, name: "Portfolio Agent", email: null, online: true, lastSeenAt: null, status: "available" as const },
  ] : storedParticipants.map((participant) => ({ ...participant, online: participant.type === "visitor" ? isRecentlyOnline(presence.visitor) : participant.type === "owner" ? true : true, lastSeenAt: participant.type === "visitor" ? presence.visitor : participant.type === "owner" ? presence.owner : null, status: participant.type === "visitor" ? "joined" as const : participant.type === "owner" ? "joined" as const : "available" as const }));
  return c.json({ workspaceId, status: managed?.status ?? lead!.workspaceStatus, participants, messages });
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
    if (input.recipient === "visitor") {
      if (!(await workspaceGuest(c.env.DB, workspaceId))) return c.json({ error: "This workspace has no invited guest" }, 400);
      await stub.sendHumanMessage(input.message, "owner", "Oskar Ablimit");
      return c.json({ delivered: true, recipient: "visitor" });
    }
    return c.json({ delivered: true, recipient: "agent", ...await stub.chat(input.message, input.requestId ?? crypto.randomUUID(), true, "Oskar Ablimit", "owner") });
  }
  const lead = await workspaceRecord(c.env.DB, workspaceId);
  if (!lead) return c.json({ error: "Workspace not found" }, 404);
  if (input.recipient === "visitor") {
    await stub.sendHumanMessage(input.message, "owner", "Oskar Ablimit");
    return c.json({ delivered: true, recipient: "visitor" });
  }
  return c.json({
    delivered: true,
    recipient: "agent",
    ...await stub.chat(input.message, input.requestId ?? crypto.randomUUID(), true, "Oskar Ablimit", "owner"),
  });
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
  const [managed, lead] = await Promise.all([managedWorkspace(c.env.DB, workspaceId), workspaceRecord(c.env.DB, workspaceId)]);
  if (!managed && !lead) return c.json({ error: "Workspace not found" }, 404);

  // Delete durable state first. If that fails, retain the catalog record so the owner can retry.
  await c.env.PORTFOLIO_SESSION.getByName(workspaceId).deleteWorkspace();
  if (managed) await deleteManagedWorkspaceRecord(c.env.DB, workspaceId);
  else await deleteWorkspaceRecord(c.env.DB, workspaceId);
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
