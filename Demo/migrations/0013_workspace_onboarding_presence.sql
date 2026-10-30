-- Application ownership: Invitation lifecycle, lightweight member presence, and default consultation onboarding.
ALTER TABLE workspace_members ADD COLUMN invitation_status TEXT NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'sent', 'failed'));

CREATE TABLE IF NOT EXISTS workspace_presence (
  workspace_id TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('owner', 'visitor')),
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, participant_type)
);

CREATE TABLE IF NOT EXISTS workspace_onboarding (
  workspace_id TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO workspace_capabilities (workspace_id, capability, enabled)
SELECT id, 'skill:consultation-onboarding', 1 FROM admin_workspaces;

INSERT OR IGNORE INTO workspace_capabilities (workspace_id, capability, enabled)
SELECT workspace_id, 'skill:consultation-onboarding', 1 FROM leads;
