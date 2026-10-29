// Application ownership: Compile-time contracts shared by the surrounding feature.
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

export interface AdminWorkspaceSummary {
  id: string;
  title: string;
  purpose: string;
  kind: "managed" | "visitor";
  status: "active" | "archived";
  updatedAt: string;
  visitorName?: string;
  visitorEmail?: string;
}

export interface WorkspaceCapabilities {
  webSearch: boolean;
  scheduling: boolean;
  skillSlugs: string[];
}

export interface CalendarSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "open" | "booked" | "cancelled";
}

export interface CalendarBooking {
  id: string;
  slotId: string;
  workspaceId: string | null;
  name: string;
  email: string;
  topic: string;
  status: "confirmed" | "cancelled";
  startsAt: string;
  endsAt: string;
  createdAt: string;
}
