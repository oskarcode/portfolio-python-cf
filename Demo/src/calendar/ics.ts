// Application ownership: Downloadable calendar confirmations with a local 24-hour reminder.
import type { CalendarBooking } from "../shared/types";

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const stamp = (value: string | Date) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function bookingIcs(value: CalendarBooking): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Oskar Ablimit//Portfolio Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${value.id}@portfolio.oskarcode.com`, `DTSTAMP:${stamp(value.createdAt)}`, `DTSTART:${stamp(value.startsAt)}`, `DTEND:${stamp(value.endsAt)}`,
    "SUMMARY:Consultation with Oskar Ablimit", `DESCRIPTION:${escapeIcs(value.topic)}\\nBooked for ${escapeIcs(value.name)} (${escapeIcs(value.email)})`,
    "BEGIN:VALARM", "TRIGGER:-PT24H", "ACTION:DISPLAY", "DESCRIPTION:Consultation with Oskar Ablimit tomorrow", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
