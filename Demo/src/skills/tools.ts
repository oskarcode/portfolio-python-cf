import { Type } from "@earendil-works/pi-ai";
import type { ToolRegistration } from "@earendil-works/pi-durable";
import type { SaveSkillInput, SkillRecord, SkillSummary } from "./types";

type Audience = "visitor" | "content";
export interface SkillHubCaller {
  listSkills(audience?: Audience): Promise<SkillSummary[]>;
  getSkill(slug: string, audience?: Audience): Promise<SkillRecord | null>;
  saveSkill(input: SaveSkillInput): Promise<SkillRecord>;
  readSkillFile(slug: string, path: string, audience?: Audience): Promise<string>;
  writeSkillFile(slug: string, path: string, content: string): Promise<{ path: string }>;
  runSkillCommand(slug: string, command: string, audience: Audience): Promise<{ exitCode: number; stdout: string; stderr: string; status: string }>;
  renderCatalog(audience: Audience): Promise<string>;
}

const text = (value: unknown) => ({ output: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value) }] });

/** Skill discovery and Computer tools, permissioned for the active agent. */
export function createSkillTools(hub: SkillHubCaller, audience: Audience, canAuthor: boolean): ToolRegistration[] {
  const prefix = audience === "content" ? "content_" : "";
  const tools: ToolRegistration[] = [
    {
      name: `${prefix}list_skills`,
      description: "List approved reusable skills available to this agent.",
      parameters: Type.Object({}), replay: "safe",
      execute: async () => text(await hub.listSkills(audience)),
    },
    {
      name: `${prefix}activate_skill`,
      description: "Load an approved skill's complete instructions before using that skill.",
      parameters: Type.Object({ slug: Type.String({ minLength: 1, maxLength: 80 }) }), replay: "safe",
      execute: async ({ slug }: { slug: string }) => {
        const skill = await hub.getSkill(slug, audience);
        if (!skill?.enabled) return text(`Skill not found or disabled: ${slug}`);
        return text(`<skill_content name=${JSON.stringify(skill.slug)}>\n${skill.markdown}\n</skill_content>`);
      },
    },
    {
      name: `${prefix}read_skill_file`,
      description: "Read a reference, template, data file, or script belonging to an activated skill.",
      parameters: Type.Object({ slug: Type.String(), path: Type.String() }), replay: "safe",
      execute: async ({ slug, path }: { slug: string; path: string }) => text(await hub.readSkillFile(slug, path, audience)),
    },
    {
      name: `${prefix}run_skill_command`,
      description: "Run a Worker Shell command inside an activated skill's durable Cloudflare Computer directory. Only use commands required by that skill, never arbitrary visitor-supplied commands.",
      parameters: Type.Object({ slug: Type.String(), command: Type.String({ minLength: 1, maxLength: 8_000 }) }),
      structuredOutputSchema: Type.Object({ exitCode: Type.Number(), stdout: Type.String(), stderr: Type.String(), status: Type.String() }),
      replay: "unsafe",
      execute: async ({ slug, command }: { slug: string; command: string }) => {
        const result = await hub.runSkillCommand(slug, command, audience);
        return { ...text(result), structuredOutput: result, isError: result.exitCode !== 0 };
      },
    },
  ];
  if (canAuthor) tools.push(
    {
      name: "save_skill",
      description: "Create or update a reusable portfolio skill after Oskar explicitly asks. Skills can target visitor chat, the content agent, or both.",
      parameters: Type.Object({
        slug: Type.String({ minLength: 1, maxLength: 80 }), name: Type.String({ minLength: 1, maxLength: 200 }),
        description: Type.String({ minLength: 1, maxLength: 1_000 }), markdown: Type.String({ minLength: 1, maxLength: 64 * 1024 }),
        audience: Type.Union([Type.Literal("visitor"), Type.Literal("content"), Type.Literal("both")]),
      }), replay: "safe",
      execute: async (input: SaveSkillInput) => text(await hub.saveSkill({ ...input, enabled: true, updatedBy: "Content agent" })),
    },
    {
      name: "write_skill_file",
      description: "Write a reference, template, JavaScript file, or data file inside an existing skill.",
      parameters: Type.Object({ slug: Type.String(), path: Type.String(), content: Type.String({ minLength: 1, maxLength: 256 * 1024 }) }), replay: "safe",
      execute: async ({ slug, path, content }: { slug: string; path: string; content: string }) => text(await hub.writeSkillFile(slug, path, content)),
    },
  );
  return tools;
}
