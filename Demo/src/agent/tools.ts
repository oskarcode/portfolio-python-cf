// Application ownership: Model-callable tool registrations and deterministic permissions.
import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-durable";
import { getSection, listSections, saveSection } from "../data/content";
import { getPost, listPosts, savePost } from "../data/blog";
import { createBooking, listOpenSlots } from "../data/calendar";
import { notifyOwnerOfBooking, sendBookingConfirmation } from "../notifications/email";

const output = (value: unknown) => ({ output: [{ type: "text" as const, text: JSON.stringify(value) }] });

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It constructs and persists a new record.
 */
export function createPortfolioTools(env: Pick<Env, "DB" | "NOTIFICATION_EMAIL" | "PUBLIC_URL">) {
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
    description: "Book one open consultation time only after the visitor explicitly chooses the exact time and confirms their name, email, and topic. Never guess or invent these values.",
    parameters: Type.Object({ slotId: Type.String(), name: Type.String(), email: Type.String(), topic: Type.String(), workspaceId: Type.Optional(Type.String()) }),
    execute: async (args) => {
      const value = await createBooking(db, args);
      const emailInput = { ...value, bookingId: value.id, origin: env.PUBLIC_URL };
      const [ownerEmail, visitorEmail] = await Promise.allSettled([notifyOwnerOfBooking(env, emailInput), sendBookingConfirmation(env, emailInput)]);
      if (ownerEmail.status === "rejected") console.error(JSON.stringify({ event: "booking_owner_notification_failed", bookingId: value.id, error: String(ownerEmail.reason) }));
      if (visitorEmail.status === "rejected") console.error(JSON.stringify({ event: "booking_confirmation_failed", bookingId: value.id, error: String(visitorEmail.reason) }));
      return output({ booking: value, calendarUrl: `/api/calendar/bookings/${value.id}/calendar.ics`, confirmationEmail: visitorEmail.status === "fulfilled" ? "sent" : "failed", reminder: "The calendar download includes a 24-hour reminder." });
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
export function createOwnerTools(db: D1Database) {
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
  return [listAll, upsertSection, upsertPost] as const;
}
