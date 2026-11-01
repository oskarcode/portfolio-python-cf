-- AI-authored per-blog frontend projects executed by isolated Dynamic Workers.
ALTER TABLE blog_posts ADD COLUMN render_mode TEXT NOT NULL DEFAULT 'article' CHECK (render_mode IN ('article', 'dynamic'));
ALTER TABLE blog_posts ADD COLUMN draft_worker_revision_id TEXT;
ALTER TABLE blog_posts ADD COLUMN published_worker_revision_id TEXT;

CREATE TABLE blog_worker_revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  worker_source TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE INDEX idx_blog_worker_revisions_post ON blog_worker_revisions(post_id, created_at DESC);
