// Application ownership: Access-protected availability and booking management.
// React supplies form events and local state/effect lifecycles for the operator screen.
import { FormEvent, useEffect, useState } from "react";
// Shared contracts describe the D1-backed slots and confirmed bookings rendered here.
import type { CalendarBooking, CalendarSlot } from "../../shared/types";
// The typed browser client is the only path from this component to protected APIs.
import { api } from "../api";

/**
 * Input:
 * - The typed values shown in localInput’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It converts a Date into the local value expected by datetime-local inputs.
 */
const localInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 16);
};
/**
 * Input:
 * - The typed values shown in format’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It formats stored UTC timestamps in the operator browser timezone.
 */
const format = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

/**
 * Input:
 * - The typed values shown in AdminCalendar’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It renders Access-protected availability creation and booking inspection.
 */
export function AdminCalendar() {
  const initial = new Date(Date.now() + 60 * 60 * 1_000); initial.setMinutes(0, 0, 0);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [start, setStart] = useState(localInput(initial));
  const [duration, setDuration] = useState(30);
  const [notice, setNotice] = useState("");
  /**
   * Input:
   * - The typed values shown in load’s signature.
   * Output:
   * - The declared value or Promise; failures follow the caller’s existing boundary.
   * What this function does:
   * - It refreshes both slots and confirmed bookings from the admin API.
   */
  const load = async () => { const data = await api.adminCalendar(); setSlots(data.slots); setBookings(data.bookings); };
  useEffect(() => { void load().catch((error: Error) => setNotice(error.message)); }, []);
  /**
   * Input:
   * - The typed values shown in add’s signature.
   * Output:
   * - The declared value or Promise; failures follow the caller’s existing boundary.
   * What this function does:
   * - It converts the local form time to UTC and creates a non-overlapping slot.
   */
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try { const starts = new Date(start); await api.createCalendarSlot(starts.toISOString(), new Date(starts.valueOf() + duration * 60_000).toISOString()); setNotice("Bookable time added."); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not add time"); }
  };
  /**
   * Input:
   * - The typed values shown in remove’s signature.
   * Output:
   * - The declared value or Promise; failures follow the caller’s existing boundary.
   * What this function does:
   * - It cancels open availability or a confirmed booking and reloads the schedule.
   */
  const remove = async (id: string, reserved?: CalendarBooking) => {
    if (reserved && !window.confirm(`Cancel ${reserved.name}'s confirmed booking and email them?`)) return;
    try {
      const result = await api.cancelCalendarSlot(id);
      setNotice(reserved ? `Booking cancelled. Visitor email ${result.cancellationEmail}.` : "Bookable time removed.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not remove time"); }
  };
  /**
   * Input:
   * - The typed values shown in bookingFor’s signature.
   * Output:
   * - The declared value or Promise; failures follow the caller’s existing boundary.
   * What this function does:
   * - It finds the confirmed booking associated with a displayed slot.
   */
  const bookingFor = (id: string) => bookings.find((item) => item.slotId === id && item.status === "confirmed");
  return <div className="admin-calendar"><section className="calendar-create"><span className="eyebrow">AVAILABILITY</span><h2>Add a bookable time</h2><p>Times use your browser’s timezone. Visitors see them in their own local timezone.</p><form onSubmit={add}><label>Start<input type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)}/></label><label>Duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label><button className="button primary">Add time</button></form>{notice && <div className="notice">{notice}</div>}</section><section className="calendar-schedule"><header><div><span className="eyebrow">UPCOMING</span><h2>Schedule</h2></div><strong>{slots.filter((item) => item.status === "open").length} open</strong></header>{slots.length === 0 ? <p>No upcoming times yet.</p> : <div>{slots.map((slot) => { const reserved = bookingFor(slot.id); return <article className={slot.status} key={slot.id}><time>{format(slot.startsAt)}</time><span>{Math.round((new Date(slot.endsAt).valueOf() - new Date(slot.startsAt).valueOf()) / 60_000)} min</span><div>{reserved ? <><strong>{reserved.name}</strong><small>{reserved.email} · {reserved.topic}</small></> : <><strong>{slot.status === "open" ? "Available" : "Removed"}</strong><small>{slot.status === "open" ? "Visible in visitor chat" : "Not bookable"}</small></>}</div>{(slot.status === "open" || reserved) && <button onClick={() => void remove(slot.id, reserved)}>{reserved ? "Cancel booking" : "Remove"}</button>}</article>; })}</div>}</section></div>;
}
