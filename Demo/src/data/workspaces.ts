// Application ownership: D1 admin workspace catalog and workspace-local capability attachments.
import type { AdminWorkspaceSummary, WorkspaceCapabilities } from "../shared/types";

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It reads and returns an ordered collection.
 */
export async function listAdminWorkspaces(db: D1Database): Promise<AdminWorkspaceSummary[]> {
  const [managed, visitors] = await Promise.all([
    db.prepare("SELECT a.id, a.title, a.purpose, a.status, a.updated_at, (SELECT email FROM workspace_members WHERE workspace_id = a.id ORDER BY invited_at LIMIT 1) AS guest_email, (SELECT display_name FROM workspace_members WHERE workspace_id = a.id ORDER BY invited_at LIMIT 1) AS guest_name FROM admin_workspaces a ORDER BY a.updated_at DESC").all<{ id: string; title: string; purpose: string; status: "active" | "archived"; updated_at: string; guest_email: string | null; guest_name: string | null }>(),
    db.prepare("SELECT workspace_id, name, email, intent, workspace_status, updated_at FROM leads ORDER BY updated_at DESC").all<{ workspace_id: string; name: string; email: string; intent: string; workspace_status: "active" | "archived"; updated_at: string }>(),
  ]);
  return [
    ...managed.results.map((row) => ({ id: row.id, title: row.title, purpose: row.purpose, kind: "managed" as const, status: row.status, updatedAt: row.updated_at, visitorName: row.guest_name ?? undefined, visitorEmail: row.guest_email ?? undefined })),
    ...visitors.results.map((row) => ({ id: row.workspace_id, title: row.name, purpose: row.intent, kind: "visitor" as const, status: row.workspace_status, updatedAt: row.updated_at, visitorName: row.name, visitorEmail: row.email })),
  ];
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It constructs and persists a new record.
 */
export async function createAdminWorkspace(db: D1Database, input: { title: string; purpose: string; guestEmail?: string; guestName?: string; capabilities: WorkspaceCapabilities }): Promise<AdminWorkspaceSummary> {
  const id = `admin-${crypto.randomUUID()}`;
  const title = input.title.trim().slice(0, 120);
  const purpose = input.purpose.trim().slice(0, 2_000);
  const guestEmail = input.guestEmail?.trim().toLowerCase().slice(0, 254) || null;
  const guestName = input.guestName?.trim().slice(0, 120) || guestEmail?.split("@")[0] || null;
  if (!title || !purpose) throw new Error("Workspace title and purpose are required");
  if (guestEmail && !guestEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error("A valid guest email is required");
  const values = capabilityValues(input.capabilities);
  await db.batch([
    db.prepare("INSERT INTO admin_workspaces (id, title, purpose) VALUES (?, ?, ?)").bind(id, title, purpose),
    ...values.map((value) => db.prepare("INSERT INTO workspace_capabilities (workspace_id, capability, enabled) VALUES (?, ?, 1)").bind(id, value)),
    ...(guestEmail && guestName ? [db.prepare("INSERT INTO workspace_members (workspace_id, email, display_name) VALUES (?, ?, ?)").bind(id, guestEmail, guestName)] : []),
  ]);
  return { id, title, purpose, kind: "managed", status: "active", updatedAt: new Date().toISOString(), visitorName: guestName ?? undefined, visitorEmail: guestEmail ?? undefined };
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the managedWorkspace operation for this module.
 */
export async function managedWorkspace(db: D1Database, id: string): Promise<{ id: string; title: string; purpose: string; status: "active" | "archived" } | null> {
  return db.prepare("SELECT id, title, purpose, status FROM admin_workspaces WHERE id = ?").bind(id).first();
}

export async function workspaceGuest(db: D1Database, workspaceId: string): Promise<{ name: string; email: string } | null> {
  const row = await db.prepare("SELECT display_name, email FROM workspace_members WHERE workspace_id = ? AND role = 'guest' ORDER BY invited_at LIMIT 1").bind(workspaceId).first<{ display_name: string; email: string }>();
  return row ? { name: row.display_name, email: row.email } : null;
}

export async function saveWorkspaceGuest(db: D1Database, workspaceId: string, emailValue: string, nameValue?: string): Promise<{ name: string; email: string }> {
  const email = emailValue.trim().toLowerCase().slice(0, 254);
  const name = nameValue?.trim().slice(0, 120) || email.split("@")[0];
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error("A valid guest email is required");
  await db.batch([
    db.prepare("DELETE FROM workspace_members WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("INSERT INTO workspace_members (workspace_id, email, display_name) VALUES (?, ?, ?)").bind(workspaceId, email, name),
  ]);
  return { name, email };
}

/** Permanently remove one managed workspace catalog record and all D1 capability attachments. */
export async function deleteManagedWorkspaceRecord(db: D1Database, workspaceId: string): Promise<void> {
  await db.batch([
    db.prepare("UPDATE calendar_bookings SET workspace_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM workspace_members WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM workspace_capabilities WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM admin_workspaces WHERE id = ?").bind(workspaceId),
  ]);
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the workspaceCapabilities operation for this module.
 */
export async function workspaceCapabilities(db: D1Database, workspaceId: string): Promise<WorkspaceCapabilities> {
  const rows = await db.prepare("SELECT capability FROM workspace_capabilities WHERE workspace_id = ? AND enabled = 1").bind(workspaceId).all<{ capability: string }>();
  const values = new Set(rows.results.map((row) => row.capability));
  return {
    portfolioRead: values.has("portfolio-read"),
    blogRead: values.has("blog-read"),
    consultation: values.has("consultation"),
    webSearch: values.has("web-search"),
    scheduling: values.has("scheduling"),
    skillSlugs: [...values].filter((value) => value.startsWith("skill:")).map((value) => value.slice(6)).sort(),
  };
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It validates and persists the requested state.
 */
const capabilityValues = (capabilities: WorkspaceCapabilities): string[] => [
  ...(capabilities.portfolioRead ? ["portfolio-read"] : []),
  ...(capabilities.blogRead ? ["blog-read"] : []),
  ...(capabilities.consultation ? ["consultation"] : []),
  ...(capabilities.webSearch ? ["web-search"] : []),
  ...(capabilities.scheduling ? ["scheduling"] : []),
  ...capabilities.skillSlugs.map((slug) => `skill:${slug}`),
];

export async function saveWorkspaceCapabilities(db: D1Database, workspaceId: string, capabilities: WorkspaceCapabilities): Promise<WorkspaceCapabilities> {
  const values = capabilityValues(capabilities);
  const statements = [db.prepare("DELETE FROM workspace_capabilities WHERE workspace_id = ?").bind(workspaceId), ...values.map((value) => db.prepare("INSERT INTO workspace_capabilities (workspace_id, capability, enabled) VALUES (?, ?, 1)").bind(workspaceId, value))];
  await db.batch(statements);
  return workspaceCapabilities(db, workspaceId);
}
