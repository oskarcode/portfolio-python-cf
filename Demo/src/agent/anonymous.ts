import { listPosts } from "../data/blog";
import { listSections, portfolioContext } from "../data/content";
import type { ChatMessage } from "../shared/types";
import { VISITOR_PROMPT } from "./prompt";

const responseText = (result: unknown): string => {
  if (typeof result === "string") return result;
  if (typeof result !== "object" || result === null) return "I couldn't produce a response. Please try again.";
  const value = result as Record<string, unknown>;
  if (typeof value.response === "string" && value.response.trim()) return value.response;
  if (typeof value.result === "string" && value.result.trim()) return value.result;
  if (typeof value.output_text === "string" && value.output_text.trim()) return value.output_text;
  if (Array.isArray(value.choices)) {
    const first = value.choices[0] as { message?: { content?: unknown }; text?: unknown } | undefined;
    const content = first?.message?.content ?? first?.text;
    if (typeof content === "string" && content.trim()) return content;
  }
  console.error(JSON.stringify({ event: "unexpected_ai_response", result: value }));
  return "I couldn't produce a response. Please try again.";
};

export async function anonymousChat(env: Env, messages: ChatMessage[]): Promise<string> {
  const safeMessages = messages.slice(-12).map((message) => ({ role: message.role, content: message.content.slice(0, 4_000) }));
  const [sections, posts] = await Promise.all([listSections(env.DB), listPosts(env.DB)]);
  const context = `${portfolioContext(sections)}\n\nPublished articles:\n${posts.map((post) => `${post.title}: ${post.excerpt ?? ""}`).join("\n")}`;
  const result = await env.AI.run("@cf/zai-org/glm-5.2", {
    messages: [
      { role: "system", content: `${VISITOR_PROMPT}\n\n<portfolio>\n${context}\n</portfolio>` },
      ...safeMessages,
    ],
    max_tokens: 900,
  }, { gateway: { id: env.AI_GATEWAY_ID } });
  return responseText(result);
}
