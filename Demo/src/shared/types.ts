export type SectionStatus = "draft" | "published" | "archived";

export interface SiteSection {
  id: string;
  type: string;
  title: string;
  slug: string;
  summary: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  status: SectionStatus;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentMarkdown: string;
  coverImageUrl: string | null;
  tags: string[];
  status: SectionStatus | "review";
  source: "native" | "medium" | "imported";
  sourceUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  company: string | null;
  intent: string;
  status: "new" | "reviewing" | "scheduled" | "closed";
  workspaceStatus: "active" | "archived";
  summary: string | null;
  assessment: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WorkspaceMessage {
  id: number;
  sender: "visitor" | "owner" | "agent";
  senderName: string;
  audience: "owner" | "visitor" | "agent" | "all";
  content: string;
  timestamp: number;
}

export interface WorkspaceParticipant {
  type: "visitor" | "owner" | "agent";
  name: string;
  email: string | null;
}

export interface WorkspaceSnapshot {
  workspaceId: string;
  status: "active" | "archived";
  participants: WorkspaceParticipant[];
  messages: WorkspaceMessage[];
}

export const BOOKING_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1xHKYdvcfsUs7Oj4wKIW8UOZmpNdOAyNYtDq0vI_WNlV_m_vuKA7QkDmlNYhgmXGHueVxGDPgw?gv=true";
