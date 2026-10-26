// Application ownership: Cloudflare web search and page-fetch adapters for Pi Durable.
import type { ToolRegistration } from "@earendil-works/pi-durable";
import { webFetchTool } from "agents/webfetch/pi";
import { webSearchTool } from "agents/websearch/pi";

type AgentsToolResult = Awaited<ReturnType<ToolRegistration["execute"]>> & { content?: Awaited<ReturnType<ToolRegistration["execute"]>>["output"] };
const currentPiOutput = (tool: ToolRegistration): ToolRegistration => ({
  ...tool,
  execute: async (args, api, context) => {
    const result = await tool.execute(args, api, context) as AgentsToolResult;
    if (result.content === undefined) return result;
    const { content, ...rest } = result;
    return { ...rest, output: content };
  },
});

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It constructs and persists a new record.
 */
export function createWebTools(env: Pick<Env, "AI" | "AI_GATEWAY_ID">): ToolRegistration[] {
  return [
    currentPiOutput(webSearchTool({ binding: env.AI, gateway: env.AI_GATEWAY_ID, provider: "exa", limit: 8, timeoutMs: 30_000, maxDescriptionChars: 800 })),
    currentPiOutput(webFetchTool({ binding: env.AI, timeoutMs: 30_000, pageChars: 20_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 5, userAgent: "OskarPortfolio/1.0" })),
  ];
}
