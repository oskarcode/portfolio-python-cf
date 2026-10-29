// Application ownership: Access-protected availability and booking management.
import { FormEvent, useEffect, useState } from "react";
import type { CalendarBooking, CalendarSlot } from "../../shared/types";
import { api } from "../api";

const localInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 16);
};
const format = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function AdminCalendar() {
  const initial = new Date(Date.now() + 60 * 60 * 1_000); initial.setMinutes(0, 0, 0);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [start, setStart] = useState(localInput(initial));
  const [duration, setDuration] = useState(30);
  const [notice, setNotice] = useState("");
  const load = async () => { const data = await api.adminCalendar(); setSlots(data.slots); setBookings(data.bookings); };
  useEffect(() => { void load().catch((error: Error) => setNotice(error.message)); }, []);
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try { const starts = new Date(start); await api.createCalendarSlot(starts.toISOString(), new Date(starts.valueOf() + duration * 60_000).toISOString()); setNotice("Bookable time added."); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not add time"); }
  };
  const remove = async (id: string) => { try { await api.cancelCalendarSlot(id); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not remove time"); } };
  const bookingFor = (id: string) => bookings.find((item) => item.slotId === id && item.status === "confirmed");
  return <div className="admin-calendar"><section className="calendar-create"><span className="eyebrow">AVAILABILITY</span><h2>Add a bookable time</h2><p>Times use your browser’s timezone. Visitors see them in their own local timezone.</p><form onSubmit={add}><label>Start<input type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)}/></label><label>Duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label><button className="button primary">Add time</button></form>{notice && <div className="notice">{notice}</div>}</section><section className="calendar-schedule"><header><div><span className="eyebrow">UPCOMING</span><h2>Schedule</h2></div><strong>{slots.filter((item) => item.status === "open").length} open</strong></header>{slots.length === 0 ? <p>No upcoming times yet.</p> : <div>{slots.map((slot) => { const reserved = bookingFor(slot.id); return <article className={slot.status} key={slot.id}><time>{format(slot.startsAt)}</time><span>{Math.round((new Date(slot.endsAt).valueOf() - new Date(slot.startsAt).valueOf()) / 60_000)} min</span><div>{reserved ? <><strong>{reserved.name}</strong><small>{reserved.email} · {reserved.topic}</small></> : <><strong>{slot.status === "open" ? "Available" : "Removed"}</strong><small>{slot.status === "open" ? "Visible in visitor chat" : "Not bookable"}</small></>}</div>{slot.status === "open" && <button onClick={() => void remove(slot.id)}>Remove</button>}</article>; })}</div>}</section></div>;
}
