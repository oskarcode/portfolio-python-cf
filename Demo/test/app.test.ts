// Application ownership: Application-owned ts module in test.
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { OWNER_PROMPT, VISITOR_PROMPT } from "../src/agent/prompt";
import { createSkillTools, type SkillHubCaller } from "../src/skills/tools";
import { notifyOwnerOfBooking, notifyOwnerOfHandoff, sendBookingConfirmation } from "../src/notifications/email";
import { bookingIcs } from "../src/calendar/ics";
import { createOwnerTools } from "../src/agent/tools";
import { createScheduleTools } from "../src/agent/scheduling";
import { createSlot } from "../src/data/calendar";
import { deleteWorkspaceRecord } from "../src/data/leads";
import { listAdminWorkspaces } from "../src/data/workspaces";

describe("API boundaries", () => {
  it("protects admin APIs when Cloudflare Access identity is absent", async () => {
    const response = await app.request("https://portfolio.example.com/api/admin/me", {}, {} as Env);
    expect(response.status).toBe(401);
  });

  it("allows local admin development", async () => {
    const response = await app.request("http://localhost/api/admin/me", {}, {} as Env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "local-development" });
  });

  it("rejects persistent messages without an explicit recipient", async () => {
    const response = await app.request("https://portfolio.example.com/api/workspaces/private-id/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    }, {} as Env);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "recipient must be owner or agent" });
  });

  it("requires a persistent workspace before a consultation can be booked", async () => {
    const response = await app.request("https://portfolio.example.com/api/calendar/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: "slot-1" }),
    }, {} as Env);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "A persistent workspace and consultation time are required" });
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const response = await app.request("https://portfolio.example.com/api/missing", {}, {} as Env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("does not expose the removed workspace archive endpoints", async () => {
    const archive = await app.request("http://localhost/api/admin/workspaces/workspace-1/archive", { method: "POST" }, {} as Env);
    const restore = await app.request("http://localhost/api/admin/workspaces/workspace-1/restore", { method: "POST" }, {} as Env);
    expect(archive.status).toBe(404);
    expect(restore.status).toBe(404);
  });
});

describe("admin workspace catalog", () => {
  it("returns every managed and visitor workspace without truncation", async () => {
    const managed = Array.from({ length: 3 }, (_, index) => ({ id: `managed-${index}`, title: `Managed ${index}`, purpose: "Content", status: "active" as const, updated_at: `2030-01-0${index + 1}` }));
    const visitors = Array.from({ length: 7 }, (_, index) => ({ workspace_id: `visitor-${index}`, name: `Visitor ${index}`, email: `visitor${index}@example.com`, intent: "Consultation", workspace_status: "active" as const, updated_at: `2030-02-0${index + 1}` }));
    const db = {
      prepare: (sql: string) => ({ all: async () => ({ results: sql.includes("admin_workspaces") ? managed : visitors }) }),
    } as unknown as D1Database;

    const workspaces = await listAdminWorkspaces(db);
    expect(workspaces).toHaveLength(10);
    expect(workspaces.filter((workspace) => workspace.kind === "managed")).toHaveLength(3);
    expect(workspaces.filter((workspace) => workspace.kind === "visitor")).toHaveLength(7);
  });

  it("deletes a managed workspace Durable Object and D1 records", async () => {
    let durableDeleted = false;
    let batchSql: string[] = [];
    const db = {
      prepare: (sql: string) => ({ bind: () => ({ sql, first: async () => sql.includes("admin_workspaces") ? { id: "managed-1", title: "Managed", purpose: "Test", status: "active" } : null }) }),
      batch: async (statements: Array<{ sql: string }>) => { batchSql = statements.map((statement) => statement.sql); return []; },
    } as unknown as D1Database;
    const env = {
      DB: db,
      PORTFOLIO_SESSION: { getByName: () => ({ deleteWorkspace: async () => { durableDeleted = true; } }) },
    } as unknown as Env;

    const response = await app.request("http://localhost/api/admin/workspaces/managed-1", { method: "DELETE" }, env);
    expect(response.status).toBe(204);
    expect(durableDeleted).toBe(true);
    expect(batchSql.some((sql) => sql.includes("DELETE FROM workspace_capabilities"))).toBe(true);
    expect(batchSql.some((sql) => sql.includes("DELETE FROM admin_workspaces"))).toBe(true);
  });

  it("removes visitor workspace attachments while preserving standalone booking records", async () => {
    let batchSql: string[] = [];
    const db = {
      prepare: (sql: string) => ({ bind: () => ({ sql }) }),
      batch: async (statements: Array<{ sql: string }>) => { batchSql = statements.map((statement) => statement.sql); return []; },
    } as unknown as D1Database;
    await deleteWorkspaceRecord(db, "visitor-1");
    expect(batchSql).toEqual(expect.arrayContaining([
      expect.stringContaining("UPDATE calendar_bookings SET workspace_id = NULL"),
      expect.stringContaining("DELETE FROM workspace_capabilities"),
      expect.stringContaining("DELETE FROM workspace_participants"),
      expect.stringContaining("DELETE FROM leads"),
    ]));
  });
});

describe("transactional notifications", () => {
  it("sends a bounded owner alert for a consented handoff", async () => {
    let sent: Parameters<SendEmail["send"]>[0] | undefined;
    const env: Pick<Env, "NOTIFICATION_EMAIL"> = {
      NOTIFICATION_EMAIL: { send: async (message) => { sent = message; return { messageId: "test" }; } },
    };

    await notifyOwnerOfHandoff(env, {
      name: "Visitor <script>",
      email: "visitor@example.com",
      company: "Example & Co",
      intent: "Discuss technical sales",
      workspaceId: "private-id",
      origin: "https://portfolio.example.com",
    });

    expect(sent?.subject).toBe("New persistent portfolio chat from Visitor <script>");
    expect(sent?.to).toBe("oskarmansanqu@icloud.com");
    expect(sent?.html).toContain("Visitor &lt;script&gt;");
    expect(sent?.text).toContain("/admin?workspace=private-id");
  });

  it("builds a booking alert and a downloadable reminder", async () => {
    let sent: Parameters<SendEmail["send"]>[0] | undefined;
    const env: Pick<Env, "NOTIFICATION_EMAIL"> = { NOTIFICATION_EMAIL: { send: async (message) => { sent = message; return { messageId: "test" }; } } };
    const value = { id: "booking-1", slotId: "slot-1", workspaceId: null, name: "Visitor", email: "visitor@example.com", topic: "Sales engineering", status: "confirmed" as const, startsAt: "2030-01-02T15:00:00.000Z", endsAt: "2030-01-02T15:30:00.000Z", createdAt: "2030-01-01T12:00:00.000Z" };
    const emailInput = { ...value, bookingId: value.id, origin: "https://portfolio.example.com", meetingUrl: "https://meet.google.com/test-room" };
    await notifyOwnerOfBooking(env, emailInput);
    expect(sent?.subject).toBe("New consultation booking from Visitor");
    expect(sent?.text).toContain("/admin/calendar");
    const calendar = bookingIcs(value, emailInput.meetingUrl);
    expect(calendar).toContain("TRIGGER:-PT24H");
    expect(calendar).toContain("DTSTART:20300102T150000Z");
    expect(calendar).toContain("LOCATION:https://meet.google.com/test-room");

    await sendBookingConfirmation(env, emailInput);
    expect(sent?.to).toBe("visitor@example.com");
    expect(sent?.subject).toBe("Confirmed: your consultation with Oskar Ablimit");
    expect(sent?.text).toContain("/api/calendar/bookings/booking-1/calendar.ics");
    expect(sent?.text).toContain("https://meet.google.com/test-room");
    expect(sent?.html).toContain("Join Google Meet");
    expect(sent?.html).toContain("24-hour reminder");
  });
});

describe("agent controls", () => {
  it("keeps visitor and owner responsibilities separate", () => {
    expect(VISITOR_PROMPT).toContain("Never ask for personal information");
    expect(VISITOR_PROMPT).toContain("cannot edit content or skills");
    expect(VISITOR_PROMPT).toContain("Never execute arbitrary commands");
    expect(VISITOR_PROMPT).toContain("external Google Calendar appointment schedule is retired");
    expect(OWNER_PROMPT).toContain("private portfolio content agent");
    expect(OWNER_PROMPT).toContain("Never invent credentials");
    expect(OWNER_PROMPT).toContain("add, reschedule, or cancel open availability");
    expect(OWNER_PROMPT).toContain("require Oskar's explicit confirmation");
    expect(OWNER_PROMPT).toContain("always use admin_list_calendar");
    expect(OWNER_PROMPT).toContain("external Google Calendar appointment schedule is retired");
  });

  it("can list delayed workspace instructions separately from calendar availability", () => {
    const tools = createScheduleTools(async () => undefined, async () => 0, async () => []).map((tool) => tool.name);
    expect(tools).toEqual(["list_schedules", "schedule", "cancel_schedule"]);
  });

  it("gives the owner agent consultation calendar management tools", () => {
    const names = createOwnerTools({} as D1Database).map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining([
      "admin_list_calendar",
      "admin_create_calendar_slot",
      "admin_reschedule_calendar_slot",
      "admin_cancel_calendar_slot",
    ]));
  });

  it("rejects invalid agent-created availability before accessing D1", async () => {
    await expect(createSlot({} as D1Database, "not-a-date", "also-not-a-date")).rejects.toThrow("Choose a future start");
  });

  it("allows visitor agents to use approved skills without authoring them", () => {
    const hub = {} as SkillHubCaller;
    const visitorTools = createSkillTools(hub, "visitor", false).map((tool) => tool.name);
    const ownerTools = createSkillTools(hub, "content", true).map((tool) => tool.name);
    expect(visitorTools).toContain("activate_skill");
    expect(visitorTools).toContain("run_skill_command");
    expect(visitorTools).not.toContain("save_skill");
    expect(visitorTools).not.toContain("write_skill_file");
    expect(ownerTools).toContain("content_activate_skill");
    expect(ownerTools).toContain("content_run_skill_command");
    expect(ownerTools).toContain("save_skill");
    expect(ownerTools).toContain("write_skill_file");
  });
});
