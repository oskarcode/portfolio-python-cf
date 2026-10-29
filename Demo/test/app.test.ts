// Application ownership: Application-owned ts module in test.
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { OWNER_PROMPT, VISITOR_PROMPT } from "../src/agent/prompt";
import { createSkillTools, type SkillHubCaller } from "../src/skills/tools";
import { notifyOwnerOfBooking, notifyOwnerOfHandoff } from "../src/notifications/email";
import { bookingIcs } from "../src/calendar/ics";

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

  it("returns a JSON 404 for unknown API routes", async () => {
    const response = await app.request("https://portfolio.example.com/api/missing", {}, {} as Env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
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
    await notifyOwnerOfBooking(env, { ...value, bookingId: value.id, origin: "https://portfolio.example.com" });
    expect(sent?.subject).toBe("New consultation booking from Visitor");
    expect(sent?.text).toContain("/admin/calendar");
    const calendar = bookingIcs(value);
    expect(calendar).toContain("TRIGGER:-PT24H");
    expect(calendar).toContain("DTSTART:20300102T150000Z");
  });
});

describe("agent controls", () => {
  it("keeps visitor and owner responsibilities separate", () => {
    expect(VISITOR_PROMPT).toContain("Never ask for personal information");
    expect(VISITOR_PROMPT).toContain("cannot edit content or skills");
    expect(VISITOR_PROMPT).toContain("Never execute arbitrary commands");
    expect(OWNER_PROMPT).toContain("private portfolio content agent");
    expect(OWNER_PROMPT).toContain("Never invent credentials");
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
