// Application ownership: Model-callable tool registrations and deterministic permissions.
import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-durable";
import { getSection, listSections, saveSection } from "../data/content";
import { getPost, listPosts, savePost } from "../data/blog";
import { cancelSlot, createBooking, createSlot, listCalendar, listOpenSlots, rescheduleSlot } from "../data/calendar";
import { notifyOwnerOfBooking, sendBookingCancellation, sendBookingConfirmation } from "../notifications/email";

const output = (value: unknown) => ({ output: [{ type: "text" as const, text: JSON.stringify(value) }] });

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It constructs and persists a new record.
 */
export function createPortfolioTools(env: Pick<Env, "DB" | "NOTIFICATION_EMAIL" | "PUBLIC_URL" | "MEETING_URL">) {
  const db = env.DB;
  const readPortfolio = defineTool({
    name: "read_portfolio",
    description: "Read all published portfolio sections. Use this before answering questions about Oskar.",
    parameters: Type.Object({}),
    replay: "safe",
    execute: async () => output(await listSections(db)),
  });
  const readSection = defineTool({
    name: "read_section",
    description: "Read one published portfolio section by slug.",
    parameters: Type.Object({ slug: Type.String() }),
    replay: "safe",
    execute: async ({ slug }) => output(await getSection(db, slug)),
  });
  const readBlog = defineTool({
    name: "read_blog",
    description: "List published blog posts or read one post by slug.",
    parameters: Type.Object({ slug: Type.Optional(Type.String()) }),
    replay: "safe",
    execute: async ({ slug }) => output(slug ? await getPost(db, slug) : await listPosts(db)),
  });
  const availability = defineTool({
    name: "list_consultation_times",
    description: "List Oskar's currently open consultation times. Times are UTC ISO timestamps; explain them clearly to the visitor.",
    parameters: Type.Object({}), replay: "safe",
    execute: async () => output(await listOpenSlots(db)),
  });
  const book = defineTool({
    name: "book_consultation",
    description: "Book one open consultation time only after the visitor explicitly chooses the exact time. In a persistent workspace, use the verified handoff name, email, intent/topic, and workspaceId supplied in system context instead of asking for them again. Never guess or invent missing values.",
    parameters: Type.Object({ slotId: Type.String(), name: Type.String(), email: Type.String(), topic: Type.String(), workspaceId: Type.Optional(Type.String()) }),
    execute: async (args) => {
      const value = await createBooking(db, args);
      const emailInput = { ...value, bookingId: value.id, origin: env.PUBLIC_URL, meetingUrl: env.MEETING_URL };
      const [ownerEmail, visitorEmail] = await Promise.allSettled([notifyOwnerOfBooking(env, emailInput), sendBookingConfirmation(env, emailInput)]);
      if (ownerEmail.status === "rejected") console.error(JSON.stringify({ event: "booking_owner_notification_failed", bookingId: value.id, error: String(ownerEmail.reason) }));
      if (visitorEmail.status === "rejected") console.error(JSON.stringify({ event: "booking_confirmation_failed", bookingId: value.id, error: String(visitorEmail.reason) }));
      return output({ booking: value, meetingUrl: env.MEETING_URL, calendarUrl: `/api/calendar/bookings/${value.id}/calendar.ics`, confirmationEmail: visitorEmail.status === "fulfilled" ? "sent" : "failed", reminder: "The calendar download includes the Google Meet link and a 24-hour reminder." });
    },
  });
  return [readPortfolio, readSection, readBlog, availability, book] as const;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It constructs and persists a new record.
 */
export function createOwnerTools(env: Pick<Env, "DB" | "NOTIFICATION_EMAIL">) {
  const db = env.DB;
  const listAll = defineTool({
    name: "admin_list_content",
    description: "List all portfolio sections and blog posts, including drafts.",
    parameters: Type.Object({}), replay: "safe",
    execute: async () => output({ sections: await listSections(db, true), posts: await listPosts(db, true) }),
  });
  const upsertSection = defineTool({
    name: "admin_save_section",
    description: "Create or update a portfolio section. This writes immediately and records a revision.",
    parameters: Type.Object({
      id: Type.String(), type: Type.String(), title: Type.String(), slug: Type.String(),
      summary: Type.Union([Type.String(), Type.Null()]), content: Type.Record(Type.String(), Type.Unknown()),
      sortOrder: Type.Number(), status: Type.Union([Type.Literal("draft"), Type.Literal("published"), Type.Literal("archived")]),
    }),
    execute: async (args) => output(await saveSection(db, args, "owner-agent")),
  });
  const upsertPost = defineTool({
    name: "admin_save_blog_post",
    description: "Create or update a blog post. This writes immediately and records a revision.",
    parameters: Type.Object({
      id: Type.String(), slug: Type.String(), title: Type.String(), summary: Type.Union([Type.String(), Type.Null()]),
      contentMarkdown: Type.String(), coverImageUrl: Type.Union([Type.String(), Type.Null()]),
      tags: Type.Array(Type.String()), status: Type.Union([Type.Literal("draft"), Type.Literal("review"), Type.Literal("published"), Type.Literal("archived")]),
      source: Type.Union([Type.Literal("native"), Type.Literal("medium"), Type.Literal("imported")]),
      sourceUrl: Type.Union([Type.String(), Type.Null()]), publishedAt: Type.Union([Type.String(), Type.Null()]),
    }),
    execute: async ({ summary, ...args }) => output(await savePost(db, { ...args, excerpt: summary }, "owner-agent")),
  });
  const listAdminCalendar = defineTool({
    name: "admin_list_calendar",
    description: "List upcoming consultation availability and confirmed bookings, including visitor details. This is private owner-only calendar data.",
    parameters: Type.Object({}), replay: "safe",
    execute: async () => output(await listCalendar(db)),
  });
  const addCalendarSlot = defineTool({
    name: "admin_create_calendar_slot",
    description: "Add one bookable consultation time after Oskar confirms the exact start and end. Use ISO 8601 timestamps with an explicit timezone. This writes immediately.",
    parameters: Type.Object({ startsAt: Type.String(), endsAt: Type.String() }),
    execute: async ({ startsAt, endsAt }) => output(await createSlot(db, startsAt, endsAt)),
  });
  const editCalendarSlot = defineTool({
    name: "admin_reschedule_calendar_slot",
    description: "Move one open consultation time after Oskar confirms the slot ID and exact replacement time. Booked and cancelled slots cannot be changed. This writes immediately.",
    parameters: Type.Object({ slotId: Type.String(), startsAt: Type.String(), endsAt: Type.String() }),
    execute: async ({ slotId, startsAt, endsAt }) => output(await rescheduleSlot(db, slotId, startsAt, endsAt)),
  });
  const removeCalendarSlot = defineTool({
    name: "admin_cancel_calendar_slot",
    description: "Cancel one open consultation time or confirmed booking after Oskar explicitly confirms the exact slot. Cancelling a confirmed booking also emails the visitor and retains the cancelled record for audit history. This writes immediately.",
    parameters: Type.Object({ slotId: Type.String() }),
    execute: async ({ slotId }) => {
      const cancellation = await cancelSlot(db, slotId);
      if (!cancellation) throw new Error("That calendar slot is already cancelled, missing, or changed before cancellation.");
      let cancellationEmail: "not-needed" | "sent" | "failed" = "not-needed";
      if (cancellation.booking) {
        try { await sendBookingCancellation(env, cancellation.booking); cancellationEmail = "sent"; }
        catch (error) {
          cancellationEmail = "failed";
          console.error(JSON.stringify({ event: "booking_cancellation_email_failed", bookingId: cancellation.booking.id, error: error instanceof Error ? error.message : String(error) }));
        }
      }
      return output({ cancelled: true, slotId, bookingId: cancellation.booking?.id ?? null, cancellationEmail });
    },
  });
  return [listAll, upsertSection, upsertPost, listAdminCalendar, addCalendarSlot, editCalendarSlot, removeCalendarSlot] as const;
}
