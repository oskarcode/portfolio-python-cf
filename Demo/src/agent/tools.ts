// Application ownership: Model-callable tool registrations and deterministic permissions.
import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-durable";
import { getSection, listSections, saveSection } from "../data/content";
import { getPost, listPosts, savePost } from "../data/blog";
import { listDynamicBlogRevisions, publishDynamicBlog, saveDynamicBlogDraft } from "../data/dynamic-blogs";
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
  const saveDynamicPost = defineTool({
    name: "admin_save_dynamic_blog",
    description: "Create or update a draft blog as a complete isolated frontend. Write a single self-contained JavaScript Worker module that exports a default fetch handler and returns the full responsive HTML/CSS/JS experience. Inline every style, script, and required asset; network access and external browser resources are blocked. Design it as an immersive iframe viewport with its own title, readable navigation, responsive internal scrolling, and no dependency on the portfolio page around it. Save only as a draft; use admin_publish_dynamic_blog after Oskar reviews the preview.",
    parameters: Type.Object({
      id: Type.String(), slug: Type.String(), title: Type.String(), summary: Type.Union([Type.String(), Type.Null()]),
      contentMarkdown: Type.String({ description: "Plain-text or Markdown fallback and searchable article content." }),
      coverImageUrl: Type.Union([Type.String(), Type.Null()]), tags: Type.Array(Type.String()),
      sourceUrl: Type.Union([Type.String(), Type.Null()]), workerSource: Type.String({ minLength: 1, maxLength: 262_144 }),
    }),
    execute: async ({ summary, workerSource, ...args }) => {
      const post = await savePost(db, { ...args, excerpt: summary, status: "draft", source: "native", publishedAt: null }, "owner-agent");
      const value = await saveDynamicBlogDraft(db, post.id, workerSource, "owner-agent");
      return output({ post, revision: { ...value, workerSource: undefined }, previewUrl: `/api/admin/blog/${encodeURIComponent(post.id)}/preview` });
    },
  });
  const listDynamicRevisions = defineTool({
    name: "admin_list_dynamic_blog_revisions",
    description: "List immutable frontend revisions for one dynamic blog before publishing or rolling back.",
    parameters: Type.Object({ postId: Type.String() }), replay: "safe",
    execute: async ({ postId }) => output(await listDynamicBlogRevisions(db, postId)),
  });
  const publishDynamicPost = defineTool({
    name: "admin_publish_dynamic_blog",
    description: "Publish the latest draft or a selected prior frontend revision only after Oskar explicitly confirms publication. Selecting an older revision performs a rollback.",
    parameters: Type.Object({ postId: Type.String(), revisionId: Type.Optional(Type.String()) }),
    execute: async ({ postId, revisionId }) => {
      const value = await publishDynamicBlog(db, postId, revisionId);
      const post = (await listPosts(db, true)).find((item) => item.id === postId);
      return output({ published: true, revisionId: value.id, publicUrl: post ? `/blog/${post.slug}` : null });
    },
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
  return [listAll, upsertSection, upsertPost, saveDynamicPost, listDynamicRevisions, publishDynamicPost, listAdminCalendar, addCalendarSlot, editCalendarSlot, removeCalendarSlot] as const;
}
