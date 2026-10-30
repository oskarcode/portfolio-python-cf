// Application ownership: shared Pi model registration for ephemeral and durable portfolio agents.
import { createModels } from "@earendil-works/pi-ai/models";
import { createAI } from "agents/models/pi-ai";

export const PORTFOLIO_MODEL = "@cf/zai-org/glm-5.2";

/** Register the Cloudflare Workers AI provider with the portfolio's AI Gateway. */
export function createPortfolioModels(env: Pick<Env, "AI" | "AI_GATEWAY_ID">) {
  const models = createModels();
  const workersAI = createAI({ binding: env.AI, id: env.AI_GATEWAY_ID });
  models.setProvider(workersAI.provider);
  return models;
}

/** Extract plain text from Pi model content without depending on one provider's wire shape. */
export function messageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") return part.text;
    return "";
  }).join("");
}
