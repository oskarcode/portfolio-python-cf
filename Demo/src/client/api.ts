// Application ownership: Typed browser HTTP client for public and Access-protected APIs.
import type { AdminWorkspaceSummary, BlogPost, CalendarBooking, CalendarSlot, ChatMessage, Lead, SiteSection, WorkspaceCapabilities, WorkspaceSnapshot } from "../shared/types";
import type { ComputerFileEntry, SaveSkillInput, SkillRecord, SkillSummary } from "../skills/types";

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the request operation for this module.
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (response.status === 204) return undefined as T;
  const body = await response.json() as T & { error?: string; detail?: string };
  if (!response.ok) throw new Error(body.detail ?? body.error ?? `Request failed (${response.status})`);
  return body;
}

export const api = {
  content: () => request<{ sections: SiteSection[] }>("/api/content"),
  posts: () => request<{ posts: BlogPost[] }>("/api/blog"),
  post: (slug: string) => request<BlogPost>(`/api/blog/${encodeURIComponent(slug)}`),
  chat: (messages: ChatMessage[]) => request<{ answer: string }>("/api/chat", { method: "POST", body: JSON.stringify({ messages }) }),
  calendarSlots: () => request<{ slots: CalendarSlot[] }>("/api/calendar/slots"),
  bookCalendarSlot: (input: { slotId: string; workspaceId?: string; name: string; email: string; topic: string }) => request<{ booking: CalendarBooking; calendarUrl: string }>("/api/calendar/bookings", { method: "POST", body: JSON.stringify(input) }),
  handoff: (input: { name: string; email: string; company: string; intent: string; transcript: ChatMessage[]; consent: boolean }) =>
    request<{ workspaceId: string; leadId: string; answer: string }>("/api/handoff", { method: "POST", body: JSON.stringify(input) }),
  workspaceMessage: (id: string, message: string, recipient: "owner" | "agent") =>
    request<{ delivered: boolean; recipient: "owner" | "agent"; answer?: string }>(`/api/workspaces/${id}/messages`, {
      method: "POST", body: JSON.stringify({ message, recipient, requestId: crypto.randomUUID() }),
    }),
  workspaceHistory: (id: string) => request<WorkspaceSnapshot>(`/api/workspaces/${id}`),
  adminContent: () => request<{ sections: SiteSection[]; posts: BlogPost[] }>("/api/admin/content"),
  adminCalendar: () => request<{ slots: CalendarSlot[]; bookings: CalendarBooking[] }>("/api/admin/calendar"),
  createCalendarSlot: (startsAt: string, endsAt: string) => request<CalendarSlot>("/api/admin/calendar/slots", { method: "POST", body: JSON.stringify({ startsAt, endsAt }) }),
  cancelCalendarSlot: (id: string) => request<{ cancelled: boolean }>(`/api/admin/calendar/slots/${encodeURIComponent(id)}`, { method: "DELETE" }),
  skills: () => request<{ skills: SkillSummary[] }>("/api/admin/skills"),
  skill: (slug: string) => request<SkillRecord>(`/api/admin/skills/${encodeURIComponent(slug)}`),
  saveSkill: (input: SaveSkillInput, existing = false) => request<SkillRecord>(existing ? `/api/admin/skills/${encodeURIComponent(input.slug)}` : "/api/admin/skills", { method: existing ? "PUT" : "POST", body: JSON.stringify(input) }),
  deleteSkill: (slug: string) => request<{ deleted: boolean }>(`/api/admin/skills/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  computerFiles: () => request<{ root: string; entries: ComputerFileEntry[] }>("/api/admin/computer"),
  computerFile: (path: string) => request<{ path: string; content: string }>(`/api/admin/computer/file?path=${encodeURIComponent(path)}`),
  runSkillCommand: (slug: string, command: string) => request<{ exitCode: number; stdout: string; stderr: string; status: string }>(`/api/admin/skills/${encodeURIComponent(slug)}/command`, { method: "POST", body: JSON.stringify({ command }) }),
  leads: () => request<{ leads: Lead[] }>("/api/admin/leads"),
  adminWorkspaces: () => request<{ workspaces: AdminWorkspaceSummary[] }>("/api/admin/workspaces"),
  createAdminWorkspace: (title: string, purpose: string) => request<AdminWorkspaceSummary>("/api/admin/workspaces", { method: "POST", body: JSON.stringify({ title, purpose }) }),
  workspaceCapabilities: (id: string) => request<WorkspaceCapabilities>(`/api/admin/workspaces/${id}/capabilities`),
  saveWorkspaceCapabilities: (id: string, capabilities: WorkspaceCapabilities) => request<WorkspaceCapabilities>(`/api/admin/workspaces/${id}/capabilities`, { method: "PUT", body: JSON.stringify(capabilities) }),
  workspace: (id: string) => request<WorkspaceSnapshot>(`/api/admin/workspaces/${id}`),
  ownerWorkspaceMessage: (id: string, message: string, recipient: "visitor" | "agent") =>
    request<{ delivered: boolean; recipient: "visitor" | "agent"; answer?: string }>(`/api/admin/workspaces/${id}/messages`, {
      method: "POST", body: JSON.stringify({ message, recipient, requestId: crypto.randomUUID() }),
    }),
  archiveWorkspace: (id: string) => request<{ archived: boolean }>(`/api/admin/workspaces/${id}/archive`, { method: "POST" }),
  restoreWorkspace: (id: string) => request<{ restored: boolean }>(`/api/admin/workspaces/${id}/restore`, { method: "POST" }),
  deleteWorkspace: (id: string) => request<void>(`/api/admin/workspaces/${id}`, { method: "DELETE" }),
  ownerChat: (message: string) => request<{ answer: string }>("/api/admin/agent", { method: "POST", body: JSON.stringify({ message, requestId: crypto.randomUUID() }) }),
  importMedium: () => request<{ imported: number; skipped: number }>("/api/admin/blog/import-medium", { method: "POST" }),
};
