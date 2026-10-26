-- Admin workspace catalog and workspace-local tool/skill attachments.
CREATE TABLE IF NOT EXISTS admin_workspaces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_capabilities (
  workspace_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, capability)
);

INSERT INTO admin_workspaces (id, title, purpose)
VALUES ('owner-content', 'Portfolio management', 'Manage website sections, technical writing, portfolio data, and reusable content operations.')
ON CONFLICT(id) DO NOTHING;

INSERT INTO workspace_capabilities (workspace_id, capability, enabled)
VALUES
  ('owner-content', 'web-search', 1),
  ('owner-content', 'scheduling', 1)
ON CONFLICT(workspace_id, capability) DO NOTHING;
