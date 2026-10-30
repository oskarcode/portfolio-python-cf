-- Application ownership: Optional invited guests for admin-created workspaces and explicit guest-safe tool selection.
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest')),
  invited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  joined_at TEXT,
  PRIMARY KEY (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Preserve the guest capabilities that existed implicitly before tools became explicitly selectable.
INSERT OR IGNORE INTO workspace_capabilities (workspace_id, capability, enabled)
SELECT id, capability, 1
FROM admin_workspaces
CROSS JOIN (
  SELECT 'portfolio-read' AS capability
  UNION ALL SELECT 'blog-read'
  UNION ALL SELECT 'consultation'
);

INSERT OR IGNORE INTO workspace_capabilities (workspace_id, capability, enabled)
SELECT workspace_id, capability, 1
FROM leads
CROSS JOIN (
  SELECT 'portfolio-read' AS capability
  UNION ALL SELECT 'blog-read'
  UNION ALL SELECT 'consultation'
);
