import { DurableObject } from "cloudflare:workers";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { createAI } from "agents/models/pi-ai";
import {
  AssistantEntry,
  createRegistry,
  defineExtension,
  Harness,
  section,
  UserEntry,
  type Conversation,
} from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import { createOwnerTools, createPortfolioTools } from "./tools";
import { OWNER_PROMPT, VISITOR_PROMPT } from "./prompt";

const MODEL = "@cf/zai-org/glm-5.2";

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
    const extension = defineExtension({
      name: "portfolio",
      tools: [...publicTools, ...ownerTools],
      sections: [section("preamble", () => VISITOR_PROMPT, { tag: false })],
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
    const conversation = await this.#harness.root(BACKGROUND_CONTEXT, {
      agent: {
        model: { provider: "cloudflare", modelId: MODEL },
        thinkingLevel: "high",
        tools: owner ? [...publicTools, ...ownerTools] : [...publicTools],
        instructions: owner ? OWNER_PROMPT : null,
      },
    });
    await conversation.configure({
      model: { provider: "cloudflare", modelId: MODEL },
      thinkingLevel: "high",
      tools: owner ? [...publicTools, ...ownerTools] : [...publicTools],
      instructions: owner ? OWNER_PROMPT : null,
    }, BACKGROUND_CONTEXT);
    return conversation;
  }

  async chat(message: string, requestId: string, owner = false): Promise<{ answer: string }> {
    const content = message.trim().slice(0, 16_000);
    if (!content) throw new Error("Message is required");
    const conversation = await this.#conversation(owner);
    const submission = await conversation.submit({ type: "input", content, requestId }, BACKGROUND_CONTEXT);
    const settled = await submission.wait(BACKGROUND_CONTEXT);
    if (settled.status !== "done" || settled.type !== "input") {
      throw new Error(`Agent did not answer: ${settled.status}`);
    }
    const entry = await conversation.commit((tx) => tx.entry(AssistantEntry, settled.answer), BACKGROUND_CONTEXT);
    return { answer: messageText(entry?.model?.[0]?.content) };
  }

  async history(): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
    const conversation = await this.#conversation(false);
    const page = await conversation.entries({ order: "ascending" }, 200, undefined, BACKGROUND_CONTEXT);
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const entry of page.items) {
      if (UserEntry.is(entry)) messages.push({ role: "user", content: messageText(entry.model?.[0]?.content) });
      if (AssistantEntry.is(entry)) messages.push({ role: "assistant", content: messageText(entry.model?.[0]?.content) });
    }
    return messages;
  }
}
