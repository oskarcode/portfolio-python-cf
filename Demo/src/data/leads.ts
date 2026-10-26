import type { Lead } from "../shared/types";

interface LeadRow {
  id: string; workspace_id: string; name: string; email: string; company: string | null;
  intent: string; status: Lead["status"]; summary: string | null; assessment_json: string | null;
  created_at: string; updated_at: string;
}

const toLead = (row: LeadRow): Lead => ({
  id: row.id, workspaceId: row.workspace_id, name: row.name, email: row.email,
  company: row.company, intent: row.intent, status: row.status, summary: row.summary,
  assessment: row.assessment_json ? JSON.parse(row.assessment_json) as Record<string, unknown> : null,
  createdAt: row.created_at, updatedAt: row.updated_at,
});

export async function createLead(db: D1Database, input: {
  workspaceId: string; name: string; email: string; company?: string; intent: string;
  summary?: string; assessment?: Record<string, unknown>;
}): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: crypto.randomUUID(), workspaceId: input.workspaceId, name: input.name.trim(), email: input.email.trim().toLowerCase(),
    company: input.company?.trim() || null, intent: input.intent.trim(), status: "new",
    summary: input.summary?.trim() || null, assessment: input.assessment ?? null, createdAt: now, updatedAt: now,
  };
  await db.prepare(`INSERT INTO leads
    (id, workspace_id, name, email, company, intent, status, summary, assessment_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(lead.id, lead.workspaceId, lead.name, lead.email, lead.company, lead.intent, lead.status,
      lead.summary, lead.assessment ? JSON.stringify(lead.assessment) : null, now, now).run();
  return lead;
}

export async function listLeads(db: D1Database): Promise<Lead[]> {
  const result = await db.prepare("SELECT * FROM leads ORDER BY updated_at DESC").all<LeadRow>();
  return result.results.map(toLead);
}

export async function updateLeadStatus(db: D1Database, id: string, status: Lead["status"]): Promise<void> {
  await db.prepare("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id).run();
}
