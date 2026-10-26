import type { SiteSection } from "../shared/types";

interface SectionRow {
  id: string;
  type: string;
  title: string;
  slug: string;
  summary: string | null;
  content_json: string;
  sort_order: number;
  status: SiteSection["status"];
  updated_at: string;
}

const parseJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const toSection = (row: SectionRow): SiteSection => ({
  id: row.id,
  type: row.type,
  title: row.title,
  slug: row.slug,
  summary: row.summary,
  content: parseJson<Record<string, unknown>>(row.content_json, {}),
  sortOrder: row.sort_order,
  status: row.status,
  updatedAt: row.updated_at,
});

export async function listSections(db: D1Database, includeDrafts = false): Promise<SiteSection[]> {
  const query = includeDrafts
    ? "SELECT * FROM site_sections WHERE status != 'archived' ORDER BY sort_order, title"
    : "SELECT * FROM site_sections WHERE status = 'published' ORDER BY sort_order, title";
  const result = await db.prepare(query).all<SectionRow>();
  return result.results.map(toSection);
}

export async function getSection(db: D1Database, slug: string, includeDrafts = false): Promise<SiteSection | null> {
  const query = includeDrafts
    ? "SELECT * FROM site_sections WHERE slug = ? AND status != 'archived'"
    : "SELECT * FROM site_sections WHERE slug = ? AND status = 'published'";
  const row = await db.prepare(query).bind(slug).first<SectionRow>();
  return row ? toSection(row) : null;
}

export async function saveSection(
  db: D1Database,
  input: Omit<SiteSection, "updatedAt">,
  actor: string,
): Promise<SiteSection> {
  const existing = await db.prepare("SELECT * FROM site_sections WHERE id = ?").bind(input.id).first<SectionRow>();
  const now = new Date().toISOString();
  const revision = existing
    ? db.prepare("INSERT INTO content_revisions (id, resource_type, resource_id, previous_value, change_summary, changed_by, created_at) VALUES (?, 'section', ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), input.id, JSON.stringify(toSection(existing)), `Updated ${input.title}`, actor, now)
    : null;
  const upsert = db.prepare(`
    INSERT INTO site_sections (id, type, title, slug, summary, content_json, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET type=excluded.type, title=excluded.title, slug=excluded.slug,
      summary=excluded.summary, content_json=excluded.content_json, sort_order=excluded.sort_order,
      status=excluded.status, updated_at=excluded.updated_at
  `).bind(input.id, input.type, input.title, input.slug, input.summary, JSON.stringify(input.content), input.sortOrder, input.status, now, now);
  await db.batch(revision ? [revision, upsert] : [upsert]);
  return { ...input, updatedAt: now };
}

export async function archiveSection(db: D1Database, id: string, actor: string): Promise<void> {
  const row = await db.prepare("SELECT * FROM site_sections WHERE id = ?").bind(id).first<SectionRow>();
  if (!row) throw new Error("Section not found");
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO content_revisions (id, resource_type, resource_id, previous_value, change_summary, changed_by, created_at) VALUES (?, 'section', ?, ?, 'Archived section', ?, ?)")
      .bind(crypto.randomUUID(), id, JSON.stringify(toSection(row)), actor, now),
    db.prepare("UPDATE site_sections SET status = 'archived', updated_at = ? WHERE id = ?").bind(now, id),
  ]);
}

export function portfolioContext(sections: SiteSection[]): string {
  return sections.map((section) => `${section.title}\n${section.summary ?? ""}\n${JSON.stringify(section.content)}`).join("\n\n").slice(0, 24_000);
}
