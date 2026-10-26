import type { BlogPost, ChatMessage, Lead, SiteSection } from "../shared/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json() as T & { error?: string; detail?: string };
  if (!response.ok) throw new Error(body.detail ?? body.error ?? `Request failed (${response.status})`);
  return body;
}

export const api = {
  content: () => request<{ sections: SiteSection[] }>("/api/content"),
  posts: () => request<{ posts: BlogPost[] }>("/api/blog"),
  post: (slug: string) => request<BlogPost>(`/api/blog/${encodeURIComponent(slug)}`),
  chat: (messages: ChatMessage[]) => request<{ answer: string }>("/api/chat", { method: "POST", body: JSON.stringify({ messages }) }),
  handoff: (input: { name: string; email: string; company: string; intent: string; transcript: ChatMessage[]; consent: boolean }) =>
    request<{ workspaceId: string; leadId: string; answer: string }>("/api/handoff", { method: "POST", body: JSON.stringify(input) }),
  workspaceChat: (id: string, message: string) => request<{ answer: string }>(`/api/workspaces/${id}/chat`, { method: "POST", body: JSON.stringify({ message, requestId: crypto.randomUUID() }) }),
  workspaceHistory: (id: string) => request<{ messages: ChatMessage[] }>(`/api/workspaces/${id}`),
  adminContent: () => request<{ sections: SiteSection[]; posts: BlogPost[] }>("/api/admin/content"),
  leads: () => request<{ leads: Lead[] }>("/api/admin/leads"),
  workspace: (id: string) => request<{ messages: ChatMessage[] }>(`/api/admin/workspaces/${id}`),
  ownerChat: (message: string) => request<{ answer: string }>("/api/admin/agent", { method: "POST", body: JSON.stringify({ message, requestId: crypto.randomUUID() }) }),
  importMedium: () => request<{ imported: number; skipped: number }>("/api/admin/blog/import-medium", { method: "POST" }),
};
