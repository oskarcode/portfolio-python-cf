-- Application ownership: Internal chat calendar availability and confirmed consultation bookings.
CREATE TABLE calendar_slots (
  id TEXT PRIMARY KEY,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'booked', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_slots_start_status ON calendar_slots(starts_at, status);

CREATE TABLE calendar_bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL UNIQUE REFERENCES calendar_slots(id) ON DELETE RESTRICT,
  workspace_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_bookings_workspace ON calendar_bookings(workspace_id);
CREATE INDEX idx_calendar_bookings_email ON calendar_bookings(email);
