// Application ownership: D1 lead, participant, and visitor-workspace lifecycle operations.
import type { Lead, WorkspaceParticipant } from "../shared/types";

interface LeadRow {
  id: string; workspace_id: string; name: string; email: string; company: string | null;
  intent: string; status: Lead["status"]; workspace_status: Lead["workspaceStatus"];
  summary: string | null; assessment_json: string | null; created_at: string; updated_at: string;
}

const toLead = (row: LeadRow): Lead => ({
  id: row.id, workspaceId: row.workspace_id, name: row.name, email: row.email,
  company: row.company, intent: row.intent, status: row.status, workspaceStatus: row.workspace_status,
  summary: row.summary,
  assessment: row.assessment_json ? JSON.parse(row.assessment_json) as Record<string, unknown> : null,
  createdAt: row.created_at, updatedAt: row.updated_at,
});

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It constructs and persists a new record.
 */
export async function createLead(db: D1Database, input: {
  workspaceId: string; name: string; email: string; company?: string; intent: string;
  summary?: string; assessment?: Record<string, unknown>;
}): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: crypto.randomUUID(), workspaceId: input.workspaceId, name: input.name.trim(), email: input.email.trim().toLowerCase(),
    company: input.company?.trim() || null, intent: input.intent.trim(), status: "new", workspaceStatus: "active",
    summary: input.summary?.trim() || null, assessment: input.assessment ?? null, createdAt: now, updatedAt: now,
  };
  await db.batch([
    db.prepare(`INSERT INTO leads
      (id, workspace_id, name, email, company, intent, status, workspace_status, summary, assessment_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`)
      .bind(lead.id, lead.workspaceId, lead.name, lead.email, lead.company, lead.intent, lead.status,
        lead.summary, lead.assessment ? JSON.stringify(lead.assessment) : null, now, now),
    db.prepare("INSERT INTO workspace_participants (workspace_id, participant_type, name, email, created_at) VALUES (?, 'visitor', ?, ?, ?)")
      .bind(lead.workspaceId, lead.name, lead.email, now),
    db.prepare("INSERT INTO workspace_participants (workspace_id, participant_type, name, email, created_at) VALUES (?, 'owner', 'Oskar Ablimit', NULL, ?)")
      .bind(lead.workspaceId, now),
    db.prepare("INSERT INTO workspace_participants (workspace_id, participant_type, name, email, created_at) VALUES (?, 'agent', 'Portfolio Agent', NULL, ?)")
      .bind(lead.workspaceId, now),
  ]);
  return lead;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It reads and returns an ordered collection.
 */
export async function listLeads(db: D1Database): Promise<Lead[]> {
  const result = await db.prepare("SELECT * FROM leads ORDER BY updated_at DESC").all<LeadRow>();
  return result.results.map(toLead);
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It validates and changes existing state.
 */
export async function updateLeadStatus(db: D1Database, id: string, status: Lead["status"]): Promise<void> {
  await db.prepare("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id).run();
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the workspaceRecord operation for this module.
 */
export async function workspaceRecord(db: D1Database, workspaceId: string): Promise<Lead | null> {
  const row = await db.prepare("SELECT * FROM leads WHERE workspace_id = ?").bind(workspaceId).first<LeadRow>();
  return row ? toLead(row) : null;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the workspaceParticipants operation for this module.
 */
export async function workspaceParticipants(db: D1Database, workspaceId: string): Promise<WorkspaceParticipant[]> {
  const result = await db.prepare("SELECT participant_type, name, email FROM workspace_participants WHERE workspace_id = ? ORDER BY CASE participant_type WHEN 'visitor' THEN 1 WHEN 'owner' THEN 2 ELSE 3 END")
    .bind(workspaceId).all<{ participant_type: WorkspaceParticipant["type"]; name: string; email: string | null }>();
  return result.results.map((row) => ({ type: row.participant_type, name: row.name, email: row.email }));
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It marks the selected state as archived.
 */
export async function archiveWorkspace(db: D1Database, workspaceId: string): Promise<void> {
  await db.prepare("UPDATE leads SET workspace_status = 'archived', updated_at = ? WHERE workspace_id = ?")
    .bind(new Date().toISOString(), workspaceId).run();
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It returns archived state to active use.
 */
export async function restoreWorkspace(db: D1Database, workspaceId: string): Promise<void> {
  await db.prepare("UPDATE leads SET workspace_status = 'active', updated_at = ? WHERE workspace_id = ?")
    .bind(new Date().toISOString(), workspaceId).run();
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It permanently removes the selected state.
 */
export async function deleteWorkspaceRecord(db: D1Database, workspaceId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM workspace_participants WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM leads WHERE workspace_id = ?").bind(workspaceId),
  ]);
}
