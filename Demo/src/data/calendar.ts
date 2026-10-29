// Application ownership: D1-backed consultation availability and collision-safe bookings.
// Shared contracts keep D1 row mapping consistent with Worker and browser payloads.
import type { CalendarBooking, CalendarSlot } from "../shared/types";

type SlotRow = { id: string; starts_at: string; ends_at: string; status: CalendarSlot["status"] };
type BookingRow = { id: string; slot_id: string; workspace_id: string | null; name: string; email: string; topic: string; status: CalendarBooking["status"]; starts_at: string; ends_at: string; created_at: string };

/**
 * Input:
 * - The typed values shown in slot’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It maps one D1 slot row from snake_case columns into the shared browser contract.
 */
const slot = (row: SlotRow): CalendarSlot => ({ id: row.id, startsAt: row.starts_at, endsAt: row.ends_at, status: row.status });
/**
 * Input:
 * - The typed values shown in booking’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It maps one joined D1 booking row into the shared booking contract.
 */
const booking = (row: BookingRow): CalendarBooking => ({ id: row.id, slotId: row.slot_id, workspaceId: row.workspace_id, name: row.name, email: row.email, topic: row.topic, status: row.status, startsAt: row.starts_at, endsAt: row.ends_at, createdAt: row.created_at });

/** Validate and normalize agent- or browser-supplied availability before it reaches D1. */
const availabilityRange = (startsAt: string, endsAt: string): { startsAt: string; endsAt: string } => {
  const hasTimezone = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  if (!hasTimezone(startsAt) || !hasTimezone(endsAt) || Number.isNaN(starts.valueOf()) || Number.isNaN(ends.valueOf()) || starts <= new Date() || ends <= starts || ends.valueOf() - starts.valueOf() > 8 * 60 * 60 * 1_000) {
    throw new Error("Choose a future start and an end no more than eight hours later, both with an explicit timezone.");
  }
  return { startsAt: starts.toISOString(), endsAt: ends.toISOString() };
};

/**
 * Input:
 * - The typed values shown in listOpenSlots’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It returns future slots that visitors may currently select.
 */
export async function listOpenSlots(db: D1Database): Promise<CalendarSlot[]> {
  const rows = await db.prepare("SELECT id, starts_at, ends_at, status FROM calendar_slots WHERE status = 'open' AND datetime(starts_at) > datetime('now') ORDER BY starts_at LIMIT 60").all<SlotRow>();
  return rows.results.map(slot);
}

/**
 * Input:
 * - The typed values shown in listCalendar’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It loads the combined slot and booking view used by the Access-protected calendar.
 */
export async function listCalendar(db: D1Database): Promise<{ slots: CalendarSlot[]; bookings: CalendarBooking[] }> {
  const [slots, bookings] = await Promise.all([
    db.prepare("SELECT id, starts_at, ends_at, status FROM calendar_slots WHERE datetime(ends_at) > datetime('now', '-1 day') ORDER BY starts_at LIMIT 200").all<SlotRow>(),
    db.prepare("SELECT b.id, b.slot_id, b.workspace_id, b.name, b.email, b.topic, b.status, s.starts_at, s.ends_at, b.created_at FROM calendar_bookings b JOIN calendar_slots s ON s.id = b.slot_id WHERE datetime(s.ends_at) > datetime('now', '-1 day') ORDER BY s.starts_at LIMIT 200").all<BookingRow>(),
  ]);
  return { slots: slots.results.map(slot), bookings: bookings.results.map(booking) };
}

/**
 * Input:
 * - The typed values shown in createSlot’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It rejects overlap, creates one open slot, and returns its public shape.
 */
export async function createSlot(db: D1Database, startsAt: string, endsAt: string): Promise<CalendarSlot> {
  const range = availabilityRange(startsAt, endsAt);
  const overlap = await db.prepare("SELECT id FROM calendar_slots WHERE status != 'cancelled' AND datetime(starts_at) < datetime(?) AND datetime(ends_at) > datetime(?) LIMIT 1").bind(range.endsAt, range.startsAt).first();
  if (overlap) throw new Error("That time overlaps an existing calendar slot.");
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO calendar_slots (id, starts_at, ends_at) VALUES (?, ?, ?)").bind(id, range.startsAt, range.endsAt).run();
  return { id, ...range, status: "open" };
}

/** Move an open slot while preserving its identity; confirmed or cancelled slots are immutable. */
export async function rescheduleSlot(db: D1Database, id: string, startsAt: string, endsAt: string): Promise<CalendarSlot> {
  const range = availabilityRange(startsAt, endsAt);
  const overlap = await db.prepare("SELECT id FROM calendar_slots WHERE id != ? AND status != 'cancelled' AND datetime(starts_at) < datetime(?) AND datetime(ends_at) > datetime(?) LIMIT 1").bind(id, range.endsAt, range.startsAt).first();
  if (overlap) throw new Error("That time overlaps an existing calendar slot.");
  const result = await db.prepare("UPDATE calendar_slots SET starts_at = ?, ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'").bind(range.startsAt, range.endsAt, id).run();
  if (result.meta.changes === 0) throw new Error("Only open consultation times can be rescheduled.");
  return { id, ...range, status: "open" };
}

/**
 * Input:
 * - The typed values shown in cancelSlot’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It marks an open slot cancelled without changing a confirmed booking.
 */
export async function cancelSlot(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare("UPDATE calendar_slots SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'").bind(id).run();
  return result.meta.changes > 0;
}

/**
 * Input:
 * - The typed values shown in createBooking’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It validates identity fields and atomically claims one still-open future slot.
 */
export async function createBooking(db: D1Database, input: { slotId: string; workspaceId?: string | null; name: string; email: string; topic: string }): Promise<CalendarBooking> {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().slice(0, 254);
  const topic = input.topic.trim().slice(0, 1_000);
  if (!input.slotId || !name || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || !topic) throw new Error("A time, name, valid email, and topic are required.");
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.prepare("UPDATE calendar_slots SET status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open' AND datetime(starts_at) > datetime('now')").bind(input.slotId),
      db.prepare("INSERT INTO calendar_bookings (id, slot_id, workspace_id, name, email, topic) SELECT ?, id, ?, ?, ?, ? FROM calendar_slots WHERE id = ? AND status = 'booked'").bind(id, input.workspaceId ?? null, name, email, topic, input.slotId),
    ]);
  } catch {
    throw new Error("That time is no longer available. Please choose another slot.");
  }
  const row = await db.prepare("SELECT b.id, b.slot_id, b.workspace_id, b.name, b.email, b.topic, b.status, s.starts_at, s.ends_at, b.created_at FROM calendar_bookings b JOIN calendar_slots s ON s.id = b.slot_id WHERE b.id = ?").bind(id).first<BookingRow>();
  if (!row) throw new Error("That time is no longer available. Please choose another slot.");
  return booking(row);
}

/**
 * Input:
 * - The typed values shown in getBooking’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It loads one joined booking for calendar download or returns null.
 */
export async function getBooking(db: D1Database, id: string): Promise<CalendarBooking | null> {
  const row = await db.prepare("SELECT b.id, b.slot_id, b.workspace_id, b.name, b.email, b.topic, b.status, s.starts_at, s.ends_at, b.created_at FROM calendar_bookings b JOIN calendar_slots s ON s.id = b.slot_id WHERE b.id = ?").bind(id).first<BookingRow>();
  return row ? booking(row) : null;
}
