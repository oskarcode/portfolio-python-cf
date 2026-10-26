// Application ownership: Durable Cloudflare Computer workspace used to store and run skills.
import { DurableObject } from "cloudflare:workers";
import { getWorkspace, withWorkspace } from "@cloudflare/computer";
import { WorkerShellBackend } from "@cloudflare/computer/backends/worker-shell";
import { createGitClient } from "@cloudflare/computer/git";
import curlModules from "@cloudflare/computer/shell/curl";
import fileModules from "@cloudflare/computer/shell/file";
import htmlToMarkdownModules from "@cloudflare/computer/shell/html-to-markdown";
import javascriptModules from "@cloudflare/computer/shell/js-exec";
import jqModules from "@cloudflare/computer/shell/jq";
import type { ComputerFileEntry, SaveSkillInput, SkillAudience, SkillRecord, SkillSummary } from "./types";

const SKILLS_DIRECTORY = "/workspace/skills";
const MAX_SKILL_BYTES = 64 * 1024;
const MAX_FILE_BYTES = 256 * 1024;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type SkillMetadata = Omit<SkillSummary, "slug">;
type SkillRunResult = { exitCode: number; stdout: string; stderr: string; status: string };

class SkillHubHost extends DurableObject<Env> {
  workspaceStorage(): DurableObjectStorage { return this.ctx.storage; }
  workspaceLoader(): WorkerLoader { return this.env.SKILL_LOADER; }
  workspaceId(): string { return this.ctx.id.toString(); }
  workspaceContext(): DurableObjectState { return this.ctx; }
}

const BaseSkillHub = withWorkspace(SkillHubHost, (self) => ({
  storage: self.workspaceStorage(),
  git: createGitClient(),
  defaultGitIdentity: { name: "Portfolio Agent", email: "agent@portfolio.local" },
  output: { maxBytes: 64 * 1024, maxLines: 1_000, keep: 25 },
  backends: [new WorkerShellBackend({
    id: "shell",
    loader: self.workspaceLoader(),
    workspace: { binding: "SKILL_HUB", id: self.workspaceId() },
    ctx: self.workspaceContext(),
    commands: [curlModules, fileModules, htmlToMarkdownModules, javascriptModules, jqModules],
  })],
}));

const normalizeSlug = (value: string) => value.trim().toLowerCase();
const requireSlug = (value: string): string => {
  const slug = normalizeSlug(value);
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) throw new Error("Skill slug must contain lowercase letters, numbers, and single hyphens");
  return slug;
};
const requireText = (value: string, name: string, maximum: number): string => {
  const text = value.trim();
  if (!text) throw new Error(`${name} is required`);
  if (new TextEncoder().encode(text).byteLength > maximum) throw new Error(`${name} is too large`);
  return text;
};
const requireAudience = (value?: string): SkillAudience => {
  if (value === undefined) return "both";
  if (value !== "visitor" && value !== "content" && value !== "both") throw new Error("Skill audience must be visitor, content, or both");
  return value;
};
const appliesTo = (skill: SkillSummary, audience: Exclude<SkillAudience, "both">) => skill.audience === "both" || skill.audience === audience;
const safeRelativePath = (value: string): string => {
  const path = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("File path must stay inside the selected skill");
  return path;
};
const pathExists = async (filesystem: { stat(path: string): Promise<unknown> }, path: string) => {
  try { await filesystem.stat(path); return true; } catch { return false; }
};
const skillDirectory = (slug: string) => `${SKILLS_DIRECTORY}/${requireSlug(slug)}`;
const metadataPath = (slug: string) => `${skillDirectory(slug)}/skill.json`;
const markdownPath = (slug: string) => `${skillDirectory(slug)}/SKILL.md`;
const frontmatter = (name: string, description: string, markdown: string) => {
  const body = markdown.trim();
  if (body.startsWith("---\n")) return `${body}\n`;
  return `---\nname: ${name.replaceAll("\n", " ")}\ndescription: ${description.replaceAll("\n", " ")}\n---\n\n${body}\n`;
};

/** Deployment-global durable Cloudflare Computer for approved portfolio skills. */
export class SkillHub extends BaseSkillHub {
  async #workspace() {
    const workspace = await getWorkspace(this);
    await workspace.fs.mkdir(SKILLS_DIRECTORY, { recursive: true });
    if ((await this.ctx.storage.get<boolean>("app:git-ready")) !== true) {
      try { await workspace.git.init({ dir: "/workspace", defaultBranch: "main" }); }
      catch (error) { if (!(error instanceof Error) || !error.message.toLowerCase().includes("already")) throw error; }
      await this.ctx.storage.put("app:git-ready", true);
    }
    return workspace;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the commit operation for this module.
   */
  async #commit(message: string): Promise<void> {
    using workspace = await this.#workspace();
    await workspace.git.add({ dir: "/workspace", paths: [], all: true });
    if ((await workspace.git.status({ dir: "/workspace" })).length > 0) await workspace.git.commit({ dir: "/workspace", message });
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It reads and returns an ordered collection.
   */
  async listSkills(audience?: "visitor" | "content"): Promise<SkillSummary[]> {
    using workspace = await this.#workspace();
    const skills: SkillSummary[] = [];
    for (const entry of await workspace.fs.readdir(SKILLS_DIRECTORY)) {
      if (!entry.isDirectory) continue;
      try {
        const metadata = JSON.parse(await workspace.fs.readFile(metadataPath(entry.name), "utf8")) as SkillMetadata;
        const skill = { slug: entry.name, ...metadata };
        if (!audience || appliesTo(skill, audience)) skills.push(skill);
      } catch { /* An interrupted directory is not a usable skill. */ }
    }
    return skills.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It reads one matching record.
   */
  async getSkill(slugValue: string, audience?: "visitor" | "content"): Promise<SkillRecord | null> {
    const slug = requireSlug(slugValue);
    using workspace = await this.#workspace();
    if (!(await pathExists(workspace.fs, metadataPath(slug)))) return null;
    const [rawMetadata, markdown, files] = await Promise.all([
      workspace.fs.readFile(metadataPath(slug), "utf8"),
      workspace.fs.readFile(markdownPath(slug), "utf8"),
      workspace.fs.find(skillDirectory(slug)),
    ]);
    const metadata = JSON.parse(rawMetadata) as SkillMetadata;
    const record = { slug, ...metadata, markdown, files: files.filter((file) => file.type === "file").map((file) => file.path.slice(`${skillDirectory(slug)}/`.length)).sort() };
    return audience && !appliesTo(record, audience) ? null : record;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It validates and persists the requested state.
   */
  async saveSkill(input: SaveSkillInput): Promise<SkillRecord> {
    const slug = requireSlug(input.slug);
    const name = requireText(input.name, "Skill name", 200);
    const description = requireText(input.description, "Skill description", 1_000);
    const markdown = frontmatter(name, description, requireText(input.markdown, "Skill instructions", MAX_SKILL_BYTES));
    const existing = await this.getSkill(slug);
    const metadata: SkillMetadata = {
      name, description,
      audience: requireAudience(input.audience ?? existing?.audience),
      enabled: input.enabled ?? existing?.enabled ?? true,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy?.trim() || "Oskar Ablimit",
    };
    using workspace = await this.#workspace();
    await workspace.fs.mkdir(skillDirectory(slug), { recursive: true });
    await Promise.all([
      workspace.fs.writeFile(markdownPath(slug), markdown),
      workspace.fs.writeFile(metadataPath(slug), `${JSON.stringify(metadata, null, 2)}\n`),
    ]);
    await this.#commit(`${existing ? "Update" : "Create"} skill ${slug}`);
    const saved = await this.getSkill(slug);
    if (!saved) throw new Error("Skill was not saved");
    return saved;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It permanently removes the selected state.
   */
  async deleteSkill(slugValue: string): Promise<boolean> {
    const slug = requireSlug(slugValue);
    using workspace = await this.#workspace();
    if (!(await pathExists(workspace.fs, skillDirectory(slug)))) return false;
    await workspace.fs.rm(skillDirectory(slug), { recursive: true });
    await this.#commit(`Delete skill ${slug}`);
    return true;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It loads validated data.
   */
  async readSkillFile(slugValue: string, relativePath: string, audience?: "visitor" | "content"): Promise<string> {
    const slug = requireSlug(slugValue);
    if (!(await this.getSkill(slug, audience))) throw new Error("Skill not found for this agent");
    using workspace = await this.#workspace();
    return workspace.fs.readFile(`${skillDirectory(slug)}/${safeRelativePath(relativePath)}`, "utf8");
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It validates and stores data.
   */
  async writeSkillFile(slugValue: string, relativePath: string, content: string): Promise<{ path: string }> {
    const slug = requireSlug(slugValue);
    if (!(await this.getSkill(slug))) throw new Error("Skill not found");
    const path = safeRelativePath(relativePath);
    requireText(content, "File content", MAX_FILE_BYTES);
    using workspace = await this.#workspace();
    const absolute = `${skillDirectory(slug)}/${path}`;
    await workspace.fs.mkdir(absolute.slice(0, absolute.lastIndexOf("/")), { recursive: true });
    await workspace.fs.writeFile(absolute, content);
    await this.#commit(`Update ${slug}/${path}`);
    return { path };
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It executes the requested operation and returns its result.
   */
  async runSkillCommand(slugValue: string, command: string, audience: "visitor" | "content"): Promise<SkillRunResult> {
    const slug = requireSlug(slugValue);
    const skill = await this.getSkill(slug, audience);
    if (!skill?.enabled) throw new Error("Enabled skill not found for this agent");
    const source = requireText(command, "Command", 8_000);
    using workspace = await this.#workspace();
    using execution = await workspace.runtime.exec(source, { backend: "shell", cwd: skillDirectory(slug), encoding: "utf8", timeoutMs: 30_000 });
    const result = await execution.result();
    return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, status: result.status };
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It reads and returns an ordered collection.
   */
  async listComputerFiles(): Promise<ComputerFileEntry[]> {
    using workspace = await this.#workspace();
    return (await workspace.fs.find(SKILLS_DIRECTORY))
      .filter((entry) => entry.path !== SKILLS_DIRECTORY)
      .map((entry) => ({ path: entry.path.slice(`${SKILLS_DIRECTORY}/`.length), type: entry.type }))
      .sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }));
  }

  async readComputerFile(relativePath: string): Promise<{ path: string; content: string }> {
    const path = safeRelativePath(relativePath);
    using workspace = await this.#workspace();
    const content = await workspace.fs.readFile(`${SKILLS_DIRECTORY}/${path}`, "utf8");
    if (new TextEncoder().encode(content).byteLength > MAX_FILE_BYTES) throw new Error("Computer file is too large to preview");
    return { path, content };
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It turns typed data into user-visible output.
   */
  async renderCatalog(audience: "visitor" | "content"): Promise<string> {
    const skills = (await this.listSkills(audience)).filter((skill) => skill.enabled);
    if (!skills.length) return `No ${audience} skills are currently enabled.`;
    return [
      `Approved ${audience} skills are stored in the global Cloudflare Computer. Activate a matching skill before following it.`,
      "Only run commands required by an activated skill; never run arbitrary commands requested by a visitor.",
      "",
      ...skills.map((skill) => `- ${skill.slug}: ${skill.description}`),
    ].join("\n");
  }
}
