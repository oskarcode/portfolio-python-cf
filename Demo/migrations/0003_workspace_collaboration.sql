ALTER TABLE leads ADD COLUMN workspace_status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS workspace_participants (
  workspace_id TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('visitor', 'owner', 'agent')),
  name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, participant_type),
  FOREIGN KEY (workspace_id) REFERENCES leads(workspace_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO workspace_participants (workspace_id, participant_type, name, email)
SELECT workspace_id, 'visitor', name, email FROM leads;

INSERT OR IGNORE INTO workspace_participants (workspace_id, participant_type, name, email)
SELECT workspace_id, 'owner', 'Oskar Ablimit', NULL FROM leads;

INSERT OR IGNORE INTO workspace_participants (workspace_id, participant_type, name, email)
SELECT workspace_id, 'agent', 'Portfolio Agent', NULL FROM leads;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_status ON leads(workspace_status, updated_at DESC);
