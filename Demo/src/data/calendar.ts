// Application ownership: D1-backed consultation availability and collision-safe bookings.
import type { CalendarBooking, CalendarSlot } from "../shared/types";

type SlotRow = { id: string; starts_at: string; ends_at: string; status: CalendarSlot["status"] };
type BookingRow = { id: string; slot_id: string; workspace_id: string | null; name: string; email: string; topic: string; status: CalendarBooking["status"]; starts_at: string; ends_at: string; created_at: string };

const slot = (row: SlotRow): CalendarSlot => ({ id: row.id, startsAt: row.starts_at, endsAt: row.ends_at, status: row.status });
const booking = (row: BookingRow): CalendarBooking => ({ id: row.id, slotId: row.slot_id, workspaceId: row.workspace_id, name: row.name, email: row.email, topic: row.topic, status: row.status, startsAt: row.starts_at, endsAt: row.ends_at, createdAt: row.created_at });

export async function listOpenSlots(db: D1Database): Promise<CalendarSlot[]> {
  const rows = await db.prepare("SELECT id, starts_at, ends_at, status FROM calendar_slots WHERE status = 'open' AND datetime(starts_at) > datetime('now') ORDER BY starts_at LIMIT 60").all<SlotRow>();
  return rows.results.map(slot);
}

export async function listCalendar(db: D1Database): Promise<{ slots: CalendarSlot[]; bookings: CalendarBooking[] }> {
  const [slots, bookings] = await Promise.all([
    db.prepare("SELECT id, starts_at, ends_at, status FROM calendar_slots WHERE datetime(ends_at) > datetime('now', '-1 day') ORDER BY starts_at LIMIT 200").all<SlotRow>(),
    db.prepare("SELECT b.id, b.slot_id, b.workspace_id, b.name, b.email, b.topic, b.status, s.starts_at, s.ends_at, b.created_at FROM calendar_bookings b JOIN calendar_slots s ON s.id = b.slot_id WHERE datetime(s.ends_at) > datetime('now', '-1 day') ORDER BY s.starts_at LIMIT 200").all<BookingRow>(),
  ]);
  return { slots: slots.results.map(slot), bookings: bookings.results.map(booking) };
}

export async function createSlot(db: D1Database, startsAt: string, endsAt: string): Promise<CalendarSlot> {
  const overlap = await db.prepare("SELECT id FROM calendar_slots WHERE status != 'cancelled' AND datetime(starts_at) < datetime(?) AND datetime(ends_at) > datetime(?) LIMIT 1").bind(endsAt, startsAt).first();
  if (overlap) throw new Error("That time overlaps an existing calendar slot.");
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO calendar_slots (id, starts_at, ends_at) VALUES (?, ?, ?)").bind(id, startsAt, endsAt).run();
  return { id, startsAt, endsAt, status: "open" };
}

export async function cancelSlot(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare("UPDATE calendar_slots SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'").bind(id).run();
  return result.meta.changes > 0;
}

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

export async function getBooking(db: D1Database, id: string): Promise<CalendarBooking | null> {
  const row = await db.prepare("SELECT b.id, b.slot_id, b.workspace_id, b.name, b.email, b.topic, b.status, s.starts_at, s.ends_at, b.created_at FROM calendar_bookings b JOIN calendar_slots s ON s.id = b.slot_id WHERE b.id = ?").bind(id).first<BookingRow>();
  return row ? booking(row) : null;
}
