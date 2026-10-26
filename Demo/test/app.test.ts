import { describe, expect, it } from "vitest";
import app from "../src/app";
import { OWNER_PROMPT, VISITOR_PROMPT } from "../src/agent/prompt";

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

  it("returns a JSON 404 for unknown API routes", async () => {
    const response = await app.request("https://portfolio.example.com/api/missing", {}, {} as Env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });
});

describe("agent controls", () => {
  it("keeps visitor and owner responsibilities separate", () => {
    expect(VISITOR_PROMPT).toContain("Never ask for personal information");
    expect(VISITOR_PROMPT).toContain("cannot edit content");
    expect(OWNER_PROMPT).toContain("private portfolio content agent");
    expect(OWNER_PROMPT).toContain("Never invent credentials");
  });
});
