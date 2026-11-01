// Application ownership: immutable Dynamic Worker revisions and publication pointers for interactive blog frontends.

export interface BlogWorkerRevision {
  id: string;
  postId: string;
  workerSource: string;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
}

type RevisionRow = { id: string; post_id: string; worker_source: string; created_by: string; created_at: string; published_at: string | null };
const revision = (row: RevisionRow): BlogWorkerRevision => ({ id: row.id, postId: row.post_id, workerSource: row.worker_source, createdBy: row.created_by, createdAt: row.created_at, publishedAt: row.published_at });

const validatedSource = (value: string): string => {
  const source = value.trim();
  const bytes = new TextEncoder().encode(source).byteLength;
  if (!source || bytes > 256 * 1024) throw new Error("Dynamic blog Worker source must be between 1 byte and 256 KiB.");
  if (!/export\s+default/.test(source) || !/\bfetch\s*\(/.test(source)) throw new Error("Dynamic blog source must export a default Worker with a fetch handler.");
  return source;
};

export async function saveDynamicBlogDraft(db: D1Database, postId: string, workerSource: string, actor: string): Promise<BlogWorkerRevision> {
  const post = await db.prepare("SELECT id FROM blog_posts WHERE id = ? AND status != 'archived'").bind(postId).first();
  if (!post) throw new Error("Save the blog metadata before creating its frontend.");
  const id = crypto.randomUUID();
  const source = validatedSource(workerSource);
  await db.batch([
    db.prepare("INSERT INTO blog_worker_revisions (id, post_id, worker_source, created_by) VALUES (?, ?, ?, ?)").bind(id, postId, source, actor),
    db.prepare("UPDATE blog_posts SET render_mode = 'dynamic', draft_worker_revision_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id, postId),
  ]);
  const saved = await getBlogWorkerRevision(db, id);
  if (!saved) throw new Error("Dynamic blog revision was not saved.");
  return saved;
}

export async function publishDynamicBlog(db: D1Database, postId: string, revisionId?: string): Promise<BlogWorkerRevision> {
  const row = await db.prepare("SELECT COALESCE(?, draft_worker_revision_id) AS revision_id FROM blog_posts WHERE id = ? AND render_mode = 'dynamic'").bind(revisionId ?? null, postId).first<{ revision_id: string | null }>();
  if (!row?.revision_id) throw new Error("This blog has no dynamic draft to publish.");
  const selected = await db.prepare("SELECT id FROM blog_worker_revisions WHERE id = ? AND post_id = ?").bind(row.revision_id, postId).first();
  if (!selected) throw new Error("The selected dynamic blog revision does not belong to this post.");
  await db.batch([
    db.prepare("UPDATE blog_worker_revisions SET published_at = COALESCE(published_at, CURRENT_TIMESTAMP) WHERE id = ?").bind(row.revision_id),
    db.prepare("UPDATE blog_posts SET status = 'published', published_worker_revision_id = ?, published_at = COALESCE(published_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.revision_id, postId),
  ]);
  const published = await getBlogWorkerRevision(db, row.revision_id);
  if (!published) throw new Error("Dynamic blog revision could not be published.");
  return published;
}

export async function listDynamicBlogRevisions(db: D1Database, postId: string): Promise<Array<Omit<BlogWorkerRevision, "workerSource">>> {
  const rows = await db.prepare("SELECT id, post_id, created_by, created_at, published_at FROM blog_worker_revisions WHERE post_id = ? ORDER BY created_at DESC LIMIT 50").bind(postId).all<Omit<RevisionRow, "worker_source">>();
  return rows.results.map((row) => ({ id: row.id, postId: row.post_id, createdBy: row.created_by, createdAt: row.created_at, publishedAt: row.published_at }));
}

export async function getBlogWorkerRevision(db: D1Database, id: string): Promise<BlogWorkerRevision | null> {
  const row = await db.prepare("SELECT * FROM blog_worker_revisions WHERE id = ?").bind(id).first<RevisionRow>();
  return row ? revision(row) : null;
}

export async function getPublishedDynamicBlog(db: D1Database, slug: string): Promise<BlogWorkerRevision | null> {
  const row = await db.prepare("SELECT r.* FROM blog_posts p JOIN blog_worker_revisions r ON r.id = p.published_worker_revision_id WHERE p.slug = ? AND p.status = 'published' AND p.render_mode = 'dynamic'").bind(slug).first<RevisionRow>();
  return row ? revision(row) : null;
}

export async function getDraftDynamicBlog(db: D1Database, postId: string): Promise<BlogWorkerRevision | null> {
  const row = await db.prepare("SELECT r.* FROM blog_posts p JOIN blog_worker_revisions r ON r.id = p.draft_worker_revision_id WHERE p.id = ? AND p.render_mode = 'dynamic'").bind(postId).first<RevisionRow>();
  return row ? revision(row) : null;
}
