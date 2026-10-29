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
    db.prepare("SELECT id, title, purpose, status, updated_at FROM admin_workspaces ORDER BY updated_at DESC").all<{ id: string; title: string; purpose: string; status: "active" | "archived"; updated_at: string }>(),
    db.prepare("SELECT workspace_id, name, email, intent, workspace_status, updated_at FROM leads ORDER BY updated_at DESC").all<{ workspace_id: string; name: string; email: string; intent: string; workspace_status: "active" | "archived"; updated_at: string }>(),
  ]);
  return [
    ...managed.results.map((row) => ({ id: row.id, title: row.title, purpose: row.purpose, kind: "managed" as const, status: row.status, updatedAt: row.updated_at })),
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
export async function createAdminWorkspace(db: D1Database, input: { title: string; purpose: string }): Promise<AdminWorkspaceSummary> {
  const id = `admin-${crypto.randomUUID()}`;
  const title = input.title.trim().slice(0, 120);
  const purpose = input.purpose.trim().slice(0, 2_000);
  if (!title || !purpose) throw new Error("Workspace title and purpose are required");
  await db.prepare("INSERT INTO admin_workspaces (id, title, purpose) VALUES (?, ?, ?)").bind(id, title, purpose).run();
  return { id, title, purpose, kind: "managed", status: "active", updatedAt: new Date().toISOString() };
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

/** Permanently remove one managed workspace catalog record and all D1 capability attachments. */
export async function deleteManagedWorkspaceRecord(db: D1Database, workspaceId: string): Promise<void> {
  await db.batch([
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
export async function saveWorkspaceCapabilities(db: D1Database, workspaceId: string, capabilities: WorkspaceCapabilities): Promise<WorkspaceCapabilities> {
  const values = [
    ...(capabilities.webSearch ? ["web-search"] : []),
    ...(capabilities.scheduling ? ["scheduling"] : []),
    ...capabilities.skillSlugs.map((slug) => `skill:${slug}`),
  ];
  const statements = [db.prepare("DELETE FROM workspace_capabilities WHERE workspace_id = ?").bind(workspaceId), ...values.map((value) => db.prepare("INSERT INTO workspace_capabilities (workspace_id, capability, enabled) VALUES (?, ?, 1)").bind(workspaceId, value))];
  await db.batch(statements);
  return workspaceCapabilities(db, workspaceId);
}
