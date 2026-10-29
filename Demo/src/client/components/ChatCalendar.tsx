// Application ownership: In-chat consultation availability, booking, and calendar reminder download.
import { FormEvent, useEffect, useState } from "react";
import type { CalendarBooking, CalendarSlot } from "../../shared/types";
import { api } from "../api";

const format = (value: string) => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));

export function ChatCalendar({ workspaceId, onClose }: { workspaceId: string | null; onClose: () => void }) {
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", topic: "" });
  const [result, setResult] = useState<{ booking: CalendarBooking; calendarUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => { void api.calendarSlots().then((data) => setSlots(data.slots)).catch((reason: Error) => setError(reason.message)).finally(() => setBusy(false)); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { setResult(await api.bookCalendarSlot({ slotId, workspaceId: workspaceId ?? undefined, ...form })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not reserve this time"); }
    finally { setBusy(false); }
  };
  return <div className="chat-calendar-panel"><header><div><span className="eyebrow">CONSULTATION CALENDAR</span><h2>{result ? "Your meeting is booked" : "Book a time with Oskar"}</h2></div><button onClick={onClose} aria-label="Close calendar">×</button></header>{result ? <div className="booking-confirmation"><span>CONFIRMED</span><h3>{format(result.booking.startsAt)}</h3><p><strong>{result.booking.name}</strong><br/>{result.booking.topic}</p><p>A confirmation email is being sent to <strong>{result.booking.email}</strong>, and Oskar has been notified through Cloudflare Email Service.</p><a className="button primary" href={result.calendarUrl}>Add to calendar + 24-hour reminder</a><button onClick={onClose}>Return to chat</button></div> : <>{busy && slots.length === 0 ? <p>Loading available times…</p> : slots.length === 0 ? <div className="calendar-empty"><strong>No open times right now</strong><p>Message Oskar in a persistent workspace to request another time.</p></div> : <form onSubmit={submit}><fieldset><legend>1. Choose a time</legend><div className="slot-options">{slots.map((slot) => <label className={slotId === slot.id ? "selected" : ""} key={slot.id}><input type="radio" name="slot" required value={slot.id} checked={slotId === slot.id} onChange={() => setSlotId(slot.id)}/><strong>{format(slot.startsAt)}</strong><span>{Math.round((new Date(slot.endsAt).valueOf() - new Date(slot.startsAt).valueOf()) / 60_000)} minutes</span></label>)}</div></fieldset><fieldset><legend>2. Your details</legend><label>Name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Email<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><label>What should you discuss?<textarea required maxLength={1000} rows={3} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}/></label></fieldset>{error && <div className="notice">{error}</div>}<button className="button primary" disabled={busy || !slotId}>{busy ? "Booking…" : "Confirm meeting"}</button></form>}</>}</div>;
}
