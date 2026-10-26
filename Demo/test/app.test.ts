// Application ownership: Application-owned ts module in test.
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { OWNER_PROMPT, VISITOR_PROMPT } from "../src/agent/prompt";
import { createSkillTools, type SkillHubCaller } from "../src/skills/tools";

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
