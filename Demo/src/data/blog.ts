// Application ownership: D1 blog persistence plus bounded Medium RSS import.
import type { BlogPost } from "../shared/types";

interface BlogRow {
  id: string; slug: string; title: string; excerpt: string | null; content_markdown: string;
  cover_image_url: string | null; tags_json: string; status: BlogPost["status"];
  source: BlogPost["source"]; source_url: string | null; published_at: string | null; updated_at: string;
}

const parseTags = (value: string): string[] => {
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : []; }
  catch { return []; }
};

const toPost = (row: BlogRow): BlogPost => ({
  id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt,
  contentMarkdown: row.content_markdown, coverImageUrl: row.cover_image_url,
  tags: parseTags(row.tags_json), status: row.status, source: row.source,
  sourceUrl: row.source_url, publishedAt: row.published_at, updatedAt: row.updated_at,
});

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It reads and returns an ordered collection.
 */
export async function listPosts(db: D1Database, includeDrafts = false): Promise<BlogPost[]> {
  const where = includeDrafts ? "status != 'archived'" : "status = 'published'";
  const result = await db.prepare(`SELECT * FROM blog_posts WHERE ${where} ORDER BY COALESCE(published_at, updated_at) DESC`).all<BlogRow>();
  return result.results.map(toPost);
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It reads one matching record.
 */
export async function getPost(db: D1Database, slug: string, includeDrafts = false): Promise<BlogPost | null> {
  const where = includeDrafts ? "status != 'archived'" : "status = 'published'";
  const row = await db.prepare(`SELECT * FROM blog_posts WHERE slug = ? AND ${where}`).bind(slug).first<BlogRow>();
  return row ? toPost(row) : null;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It validates and persists the requested state.
 */
export async function savePost(db: D1Database, input: Omit<BlogPost, "updatedAt">, actor: string): Promise<BlogPost> {
  const existing = await db.prepare("SELECT * FROM blog_posts WHERE id = ?").bind(input.id).first<BlogRow>();
  const now = new Date().toISOString();
  const revision = existing
    ? db.prepare("INSERT INTO content_revisions (id, resource_type, resource_id, previous_value, change_summary, changed_by, created_at) VALUES (?, 'blog', ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), input.id, JSON.stringify(toPost(existing)), `Updated ${input.title}`, actor, now)
    : null;
  const upsert = db.prepare(`INSERT INTO blog_posts
    (id, slug, title, excerpt, content_markdown, cover_image_url, tags_json, status, source, source_url, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, title=excluded.title, excerpt=excluded.excerpt,
      content_markdown=excluded.content_markdown, cover_image_url=excluded.cover_image_url,
      tags_json=excluded.tags_json, status=excluded.status, source=excluded.source,
      source_url=excluded.source_url, published_at=excluded.published_at, updated_at=excluded.updated_at`)
    .bind(input.id, input.slug, input.title, input.excerpt, input.contentMarkdown, input.coverImageUrl,
      JSON.stringify(input.tags), input.status, input.source, input.sourceUrl, input.publishedAt, now, now);
  await db.batch(revision ? [revision, upsert] : [upsert]);
  return { ...input, updatedAt: now };
}

const text = (value: string): string => value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It retrieves external data and stores safe local records.
 */
export async function importMediumFeed(db: D1Database, actor: string): Promise<{ imported: number; skipped: number }> {
  const response = await fetch("https://medium.com/feed/@rnwqyzxnn", { headers: { "User-Agent": "OskarPortfolioImporter/1.0" } });
  if (!response.ok) throw new Error(`Medium returned ${response.status}`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  let imported = 0; let skipped = 0;
  for (const item of items) {
    const find = (tag: string): string => item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "";
    const title = text(find("title"));
    const sourceUrl = text(find("link"));
    if (!title || !sourceUrl) continue;
    const exists = await db.prepare("SELECT id FROM blog_posts WHERE source_url = ?").bind(sourceUrl).first();
    if (exists) { skipped++; continue; }
    const rawContent = find("content:encoded") || find("description");
    const excerpt = text(rawContent).slice(0, 220);
    const id = `medium-${crypto.randomUUID()}`;
    const publishedAt = new Date(text(find("pubDate")) || Date.now()).toISOString();
    await savePost(db, {
      id, slug: slugify(title), title, excerpt, contentMarkdown: text(rawContent), coverImageUrl: null,
      tags: [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/g)].map((m) => text(m[1])).filter(Boolean),
      status: "draft", source: "medium", sourceUrl, publishedAt,
    }, actor);
    imported++;
  }
  return { imported, skipped };
}
