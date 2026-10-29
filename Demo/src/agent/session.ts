// Application ownership: Pi Durable workspace lifecycle, transcript persistence, tools, and alarms.
import { DurableObject } from "cloudflare:workers";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { createAI } from "agents/models/pi-ai";
import {
  AssistantEntry,
  createRegistry,
  defineEntry,
  defineExtension,
  Harness,
  UserEntry,
  type Conversation,
  type ConversationId,
  type TaskId,
} from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import type { ChatMessage, WorkspaceMessage } from "../shared/types";
import { createOwnerTools, createPortfolioTools } from "./tools";
import { createSkillTools } from "../skills/tools";
import { OWNER_PROMPT, VISITOR_PROMPT } from "./prompt";
import { createWebTools } from "./web-tools";
import { createScheduleTools, DeliverScheduledInstruction, matchesSchedule, scheduledDeadline } from "./scheduling";
import { managedWorkspace, workspaceCapabilities } from "../data/workspaces";

const MODEL = "@cf/zai-org/glm-5.2";

type WorkspaceMessageData = {
  text: string;
  sender: "visitor" | "owner" | "agent";
  senderName: string;
  audience: "owner" | "visitor" | "agent" | "all";
  timestamp: number;
};

const WorkspaceMessageEntry = defineEntry<WorkspaceMessageData>("portfolio.workspace-message");
const WorkspaceAgentRequestEntry = defineEntry<WorkspaceMessageData>("portfolio.agent-request");

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the messageText operation for this module.
 */
function messageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") return part.text;
    return "";
  }).join("");
}

/** PortfolioSession owns this Durable Object lifecycle, its collaborators, and its persisted workspace state. */
export class PortfolioSession extends DurableObject<Env> {
  #harness!: Harness;
  #ready: Promise<void>;
  #workspaceId: string;
  #alarmUpdate: Promise<void> = Promise.resolve();
  #alarmTaskWatches = new Set<TaskId>();

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the constructor operation for this module.
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.#workspaceId = ctx.id.name ?? ctx.id.toString();
    this.#ready = ctx.blockConcurrencyWhile(() => this.#initialize());
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the attachedSkillSlugs operation for this module.
   */
  async #attachedSkillSlugs(): Promise<string[]> {
    return (await workspaceCapabilities(this.env.DB, this.#workspaceId)).skillSlugs;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It opens required durable resources and runtime registrations.
   */
  async #initialize(): Promise<void> {
    const storage = await openDurableObjectSqliteStorage(this.ctx.storage);
    const models = createModels();
    const workersAI = createAI({ binding: this.env.AI, id: this.env.AI_GATEWAY_ID });
    models.setProvider(workersAI.provider);
    const publicTools = createPortfolioTools(this.env);
    const ownerTools = createOwnerTools(this.env.DB);
    const skillHub = this.env.SKILL_HUB.getByName("global");
    const allowedSkills = () => this.#attachedSkillSlugs();
    const visitorSkillTools = createSkillTools(skillHub, "visitor", false, allowedSkills);
    const contentSkillTools = createSkillTools(skillHub, "content", true, allowedSkills);
    const webTools = createWebTools(this.env);
    const scheduleTools = createScheduleTools(
      (timestamp) => this.#setAlarmNoLaterThan(timestamp),
      (conversationId, scheduleId) => this.#cancelSchedule(conversationId, scheduleId),
    );
    const extension = defineExtension({
      name: "portfolio",
      tasks: [DeliverScheduledInstruction],
      tools: [...publicTools, ...ownerTools, ...visitorSkillTools, ...contentSkillTools, ...webTools, ...scheduleTools],
      sections: [],
    });
    const registry = createRegistry();
    registry.install(extension);
    this.#harness = await Harness.open(storage, {
      models,
      registry,
      settings: { documentRetentionMs: 0 },
      onReport: (error) => console.error(JSON.stringify({ event: "pi_durable_error", error: String(error) })),
    }, BACKGROUND_CONTEXT);
    void this.#harness.closed.then((end) => {
      if (end.reason === "failed") this.ctx.abort("Pi Durable harness failed");
    });
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the conversation operation for this module.
   */
  async #conversation(owner: boolean): Promise<Conversation> {
    await this.#ready;
    const publicTools = createPortfolioTools(this.env);
    const ownerTools = createOwnerTools(this.env.DB);
    const skillHub = this.env.SKILL_HUB.getByName("global");
    const capabilities = await workspaceCapabilities(this.env.DB, this.#workspaceId);
    const skillTools = createSkillTools(skillHub, owner ? "content" : "visitor", owner, () => this.#attachedSkillSlugs());
    const webTools = capabilities.webSearch ? createWebTools(this.env) : [];
    const scheduleTools = capabilities.scheduling ? createScheduleTools((timestamp) => this.#setAlarmNoLaterThan(timestamp), (conversationId, scheduleId) => this.#cancelSchedule(conversationId, scheduleId)) : [];
    const tools = owner ? [...publicTools, ...ownerTools, ...skillTools, ...webTools, ...scheduleTools] : [...publicTools, ...skillTools, ...webTools, ...scheduleTools];
    const availableSkills = (await skillHub.listSkills(owner ? "content" : "visitor")).filter((skill) => skill.enabled && capabilities.skillSlugs.includes(skill.slug));
    const skillCatalog = availableSkills.length ? `Skills attached to this workspace:\n${availableSkills.map((skill) => `- ${skill.slug}: ${skill.description}`).join("\n")}\nActivate a matching skill before using it.` : "No reusable skills are attached to this workspace.";
    const managed = owner ? await managedWorkspace(this.env.DB, this.#workspaceId) : null;
    const workspaceContext = managed ? `Workspace purpose: ${managed.purpose}` : "This is a visitor collaboration workspace.";
    const toolContext = `Workspace tools: web search ${capabilities.webSearch ? "enabled" : "disabled"}; scheduling ${capabilities.scheduling ? "enabled" : "disabled"}.`;
    const instructions = `${owner ? OWNER_PROMPT : VISITOR_PROMPT}\n\n${workspaceContext}\n${toolContext}\n\n${skillCatalog}`;
    const conversation = await this.#harness.root(BACKGROUND_CONTEXT, {
      agent: {
        model: { provider: "cloudflare", modelId: MODEL },
        thinkingLevel: "high",
        tools,
        instructions,
      },
    });
    await conversation.configure({
      model: { provider: "cloudflare", modelId: MODEL },
      thinkingLevel: "high",
      tools,
      instructions,
    }, BACKGROUND_CONTEXT);
    return conversation;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It projects durable entries into display messages.
   */
  async #historyFrom(conversation: Conversation): Promise<WorkspaceMessage[]> {
    const page = await conversation.entries({ order: "ascending" }, 300, undefined, BACKGROUND_CONTEXT);
    const messages: WorkspaceMessage[] = [];
    for (const entry of page.items) {
      if (WorkspaceMessageEntry.is(entry) || WorkspaceAgentRequestEntry.is(entry)) {
        const data = entry.data;
        messages.push({ id: entry.id, sender: data.sender, senderName: data.senderName, audience: data.audience, content: data.text, timestamp: data.timestamp });
      } else if (UserEntry.is(entry)) {
        const content = messageText(entry.model?.[0]?.content);
        const scheduled = content.startsWith("Scheduled instruction due now: ");
        messages.push({ id: entry.id, sender: scheduled ? "agent" : "visitor", senderName: scheduled ? "Scheduled task" : "Visitor", audience: "agent", content: scheduled ? content.slice("Scheduled instruction due now: ".length) : content, timestamp: Number(entry.model?.[0]?.timestamp ?? Date.now()) });
      } else if (AssistantEntry.is(entry)) {
        const content = messageText(entry.model?.[0]?.content);
        if (content.trim()) messages.push({ id: entry.id, sender: "agent", senderName: "Portfolio Agent", audience: "all", content, timestamp: Number(entry.model?.[0]?.timestamp ?? Date.now()) });
      }
    }
    return messages;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It submits one model turn and persists its result.
   */
  async chat(
    message: string,
    requestId: string,
    owner = false,
    senderName = "Visitor",
    sender: "visitor" | "owner" = owner ? "owner" : "visitor",
  ): Promise<{ answer: string }> {
    const content = message.trim().slice(0, 16_000);
    if (!content) throw new Error("Message is required");
    const conversation = await this.#conversation(owner);
    const recent = (await this.#historyFrom(conversation)).slice(-30);
    const transcript = recent.map((item) => `${item.senderName} (${item.sender}): ${item.content}`).join("\n");
    const modelInput = transcript
      ? `<workspace_history>\n${transcript}\n</workspace_history>\n\n${senderName}: ${content}`
      : `${senderName}: ${content}`;
    const submission = await conversation.submit({
      type: "input",
      content: modelInput,
      entry: {
        kind: WorkspaceAgentRequestEntry.kind,
        data: { text: content, sender, senderName, audience: "agent", timestamp: Date.now() },
      },
      requestId,
    }, BACKGROUND_CONTEXT);
    const settled = await submission.wait(BACKGROUND_CONTEXT);
    if (settled.status !== "done" || settled.type !== "input") throw new Error(`Agent did not answer: ${settled.status}`);
    const entry = await conversation.commit((tx) => tx.entry(AssistantEntry, settled.answer), BACKGROUND_CONTEXT);
    return { answer: messageText(entry?.model?.[0]?.content) };
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It delivers a message through the selected route.
   */
  async sendHumanMessage(content: string, sender: "visitor" | "owner", senderName: string): Promise<void> {
    const text = content.trim().slice(0, 16_000);
    if (!text) throw new Error("Message is required");
    const conversation = await this.#conversation(false);
    const submission = await conversation.submit({
      type: "write",
      entry: {
        kind: WorkspaceMessageEntry.kind,
        data: { text, sender, senderName, audience: sender === "visitor" ? "owner" : "visitor", timestamp: Date.now() },
      },
      requestId: crypto.randomUUID(),
    }, BACKGROUND_CONTEXT);
    await submission.wait(BACKGROUND_CONTEXT);
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It opens required durable resources and runtime registrations.
   */
  async initializeWorkspace(transcript: ChatMessage[], visitorName: string, intent: string): Promise<{ answer: string }> {
    const conversation = await this.#conversation(false);
    for (const message of transcript.slice(-20)) {
      const sender = message.role === "user" ? "visitor" : "agent";
      const submission = await conversation.submit({
        type: "write",
        entry: {
          kind: WorkspaceMessageEntry.kind,
          data: {
            text: message.content.slice(0, 4_000), sender,
            senderName: sender === "visitor" ? visitorName : "Portfolio Agent",
            audience: "all", timestamp: Date.now(),
          },
        },
        requestId: crypto.randomUUID(),
      }, BACKGROUND_CONTEXT);
      await submission.wait(BACKGROUND_CONTEXT);
    }
    return this.chat(`I have added Oskar to this workspace. My goal is: ${intent}. Acknowledge the handoff briefly and explain that I can message Oskar directly or ask you for help.`, crypto.randomUUID(), false, visitorName);
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It projects durable entries into display messages.
   */
  async history(owner = false): Promise<WorkspaceMessage[]> {
    return this.#historyFrom(await this.#conversation(owner));
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the cancelSchedule operation for this module.
   */
  async #cancelSchedule(conversationId: ConversationId, scheduleId: string): Promise<number> {
    const { tasks } = await this.#harness.inspect(BACKGROUND_CONTEXT);
    const matches = tasks.filter((task) => matchesSchedule(task, conversationId, scheduleId));
    for (const task of matches) await this.#harness.abortTask(task.record.id, BACKGROUND_CONTEXT);
    await this.#refreshAlarm();
    return matches.length;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the refreshAlarm operation for this module.
   */
  async #refreshAlarm(): Promise<void> {
    await this.#ready;
    const { tasks } = await this.#harness.inspect(BACKGROUND_CONTEXT);
    const now = Date.now();
    let next: number | undefined;
    for (const task of tasks) {
      const deadline = scheduledDeadline(task);
      if (deadline === undefined) continue;
      if (deadline > now) next = next === undefined ? deadline : Math.min(next, deadline);
      else this.#watchTask(task.record.id);
    }
    await this.ctx.storage.transaction(async (transaction) => {
      if (next === undefined) await transaction.deleteAlarm();
      else await transaction.setAlarm(next);
    });
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the setAlarmNoLaterThan operation for this module.
   */
  #setAlarmNoLaterThan(timestamp: number): Promise<void> {
    const operation = () => this.ctx.storage.transaction(async (transaction) => {
      const current = await transaction.getAlarm();
      if (current === null || timestamp < current) await transaction.setAlarm(timestamp);
    });
    const update = this.#alarmUpdate.then(operation, operation);
    this.#alarmUpdate = update;
    return update;
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the watchTask operation for this module.
   */
  #watchTask(taskId: TaskId): void {
    if (this.#alarmTaskWatches.has(taskId)) return;
    this.#alarmTaskWatches.add(taskId);
    void this.#harness.waitForTask(taskId, BACKGROUND_CONTEXT).finally(() => {
      this.#alarmTaskWatches.delete(taskId);
      void this.#refreshAlarm();
    });
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It owns the alarm operation for this module.
   */
  override async alarm(): Promise<void> {
    await this.#refreshAlarm();
  }

  /**
   * Input:
   * - The typed parameters shown in the function signature.
   * Output:
   * - The declared return value or Promise; thrown errors follow the caller.
   * What this function does:
   * - It permanently removes the selected state.
   */
  async deleteWorkspace(): Promise<void> {
    await this.#ready;
    await this.#harness.close(BACKGROUND_CONTEXT);
    await this.ctx.storage.deleteAll();
  }
}
