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
} from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import type { ChatMessage, WorkspaceMessage } from "../shared/types";
import { createOwnerTools, createPortfolioTools } from "./tools";
import { createSkillTools } from "../skills/tools";
import { OWNER_PROMPT, VISITOR_PROMPT } from "./prompt";

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

function messageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") return part.text;
    return "";
  }).join("");
}

export class PortfolioSession extends DurableObject<Env> {
  #harness!: Harness;
  #ready: Promise<void>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.#ready = ctx.blockConcurrencyWhile(() => this.#initialize());
  }

  async #initialize(): Promise<void> {
    const storage = await openDurableObjectSqliteStorage(this.ctx.storage);
    const models = createModels();
    const workersAI = createAI({ binding: this.env.AI, id: this.env.AI_GATEWAY_ID });
    models.setProvider(workersAI.provider);
    const publicTools = createPortfolioTools(this.env.DB, this.env.BOOKING_URL);
    const ownerTools = createOwnerTools(this.env.DB);
    const skillHub = this.env.SKILL_HUB.getByName("global");
    const visitorSkillTools = createSkillTools(skillHub, "visitor", false);
    const contentSkillTools = createSkillTools(skillHub, "content", true);
    const extension = defineExtension({
      name: "portfolio",
      tools: [...publicTools, ...ownerTools, ...visitorSkillTools, ...contentSkillTools],
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

  async #conversation(owner: boolean): Promise<Conversation> {
    await this.#ready;
    const publicTools = createPortfolioTools(this.env.DB, this.env.BOOKING_URL);
    const ownerTools = createOwnerTools(this.env.DB);
    const skillHub = this.env.SKILL_HUB.getByName("global");
    const skillTools = createSkillTools(skillHub, owner ? "content" : "visitor", owner);
    const tools = owner ? [...publicTools, ...ownerTools, ...skillTools] : [...publicTools, ...skillTools];
    const skillCatalog = await skillHub.renderCatalog(owner ? "content" : "visitor");
    const instructions = `${owner ? OWNER_PROMPT : VISITOR_PROMPT}\n\n${skillCatalog}`;
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

  async #historyFrom(conversation: Conversation): Promise<WorkspaceMessage[]> {
    const page = await conversation.entries({ order: "ascending" }, 300, undefined, BACKGROUND_CONTEXT);
    const messages: WorkspaceMessage[] = [];
    for (const entry of page.items) {
      if (WorkspaceMessageEntry.is(entry) || WorkspaceAgentRequestEntry.is(entry)) {
        const data = entry.data;
        messages.push({ id: entry.id, sender: data.sender, senderName: data.senderName, audience: data.audience, content: data.text, timestamp: data.timestamp });
      } else if (UserEntry.is(entry)) {
        messages.push({ id: entry.id, sender: "visitor", senderName: "Visitor", audience: "agent", content: messageText(entry.model?.[0]?.content), timestamp: Number(entry.model?.[0]?.timestamp ?? Date.now()) });
      } else if (AssistantEntry.is(entry)) {
        messages.push({ id: entry.id, sender: "agent", senderName: "Portfolio Agent", audience: "all", content: messageText(entry.model?.[0]?.content), timestamp: Number(entry.model?.[0]?.timestamp ?? Date.now()) });
      }
    }
    return messages;
  }

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

  async history(): Promise<WorkspaceMessage[]> {
    return this.#historyFrom(await this.#conversation(false));
  }

  async deleteWorkspace(): Promise<void> {
    await this.#ready;
    await this.#harness.close(BACKGROUND_CONTEXT);
    await this.ctx.storage.deleteAll();
  }
}
