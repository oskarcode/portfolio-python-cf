// Application ownership: Transactional owner notifications sent through Cloudflare Email Service.

const OWNER_NOTIFICATION_ADDRESS = "oskarmansanqu@icloud.com";
const SENDER_ADDRESS = "portfolio@oskarcode.com";

/**
 * Input:
 * - The typed values shown in escapeHtml’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It escapes visitor-controlled text before interpolation into fixed HTML templates.
 */
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
})[character] ?? character);

/**
 * Input:
 * - The typed values shown in utcMeetingTime’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It renders one deterministic UTC time range for transactional email.
 */
const utcMeetingTime = (startsAt: string, endsAt: string) => {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(startsAt));
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return `${day} · ${time.format(new Date(startsAt))}–${time.format(new Date(endsAt))} UTC`;
};

/**
 * Input:
 * - The typed values shown in sendBookingConfirmation’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It sends the visitor the fixed booking, Meet, and calendar reminder message.
 */
export async function sendBookingConfirmation(env: Pick<Env, "NOTIFICATION_EMAIL">, input: {
  bookingId: string; name: string; email: string; topic: string; startsAt: string; endsAt: string; origin: string; meetingUrl: string;
}): Promise<void> {
  const when = utcMeetingTime(input.startsAt, input.endsAt);
  const calendarUrl = `${input.origin}/api/calendar/bookings/${encodeURIComponent(input.bookingId)}/calendar.ics`;
  const meetingUrl = escapeHtml(input.meetingUrl);
  await env.NOTIFICATION_EMAIL.send({
    from: { email: "calendar@oskarcode.com", name: "Oskar Ablimit" },
    to: input.email,
    subject: "Confirmed: your consultation with Oskar Ablimit",
    text: `Hi ${input.name},\n\nYour consultation with Oskar Ablimit is confirmed.\n\nDATE AND TIME\n${when}\n\nTOPIC\n${input.topic}\n\nJOIN GOOGLE MEET\n${input.meetingUrl}\n\nADD TO CALENDAR\n${calendarUrl}\nThe calendar event includes a 24-hour reminder.\n\nSee you then,\nOskar`,
    html: `<div style="margin:0;padding:32px 16px;background:#f3f6f8;color:#172b3a;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;overflow:hidden;border:1px solid #d8e0e5;border-radius:12px;background:#ffffff"><div style="padding:28px 32px;background:#0f1b24;color:#ffffff"><div style="margin-bottom:14px;color:#f6821f;font-size:12px;font-weight:700;letter-spacing:.08em">MEETING CONFIRMED</div><h1 style="margin:0;font-size:27px;line-height:1.2">Your consultation with Oskar is booked</h1></div><div style="padding:30px 32px"><p style="margin:0 0 22px;font-size:16px;line-height:1.6">Hi ${escapeHtml(input.name)},<br>Your meeting is confirmed. Everything you need is below.</p><div style="margin:0 0 22px;padding:20px;border:1px solid #e1e7eb;border-radius:8px;background:#f8fafb"><div style="margin-bottom:6px;color:#697b88;font-size:11px;font-weight:700;letter-spacing:.06em">DATE AND TIME</div><div style="font-size:17px;font-weight:700;line-height:1.5">${escapeHtml(when)}</div><div style="margin:18px 0 6px;color:#697b88;font-size:11px;font-weight:700;letter-spacing:.06em">TOPIC</div><div style="font-size:15px;line-height:1.5">${escapeHtml(input.topic)}</div></div><a href="${meetingUrl}" style="display:block;margin-bottom:10px;padding:14px 18px;border-radius:7px;background:#f6821f;color:#ffffff;font-size:15px;font-weight:700;text-align:center;text-decoration:none">Join Google Meet</a><a href="${escapeHtml(calendarUrl)}" style="display:block;padding:13px 18px;border:1px solid #b8c4cc;border-radius:7px;color:#172b3a;font-size:14px;font-weight:700;text-align:center;text-decoration:none">Add to calendar + 24-hour reminder</a><p style="margin:24px 0 0;color:#697b88;font-size:12px;line-height:1.6">You received this transactional email because you booked through Oskar’s portfolio chat.</p></div></div></div>`,
  });
}

/** Notify a visitor that Oskar cancelled a previously confirmed consultation. */
export async function sendBookingCancellation(env: Pick<Env, "NOTIFICATION_EMAIL">, input: {
  name: string; email: string; topic: string; startsAt: string; endsAt: string;
}): Promise<void> {
  const when = utcMeetingTime(input.startsAt, input.endsAt);
  await env.NOTIFICATION_EMAIL.send({
    from: { email: "calendar@oskarcode.com", name: "Oskar Ablimit" },
    to: input.email,
    subject: "Cancelled: your consultation with Oskar Ablimit",
    text: `Hi ${input.name},\n\nYour consultation with Oskar Ablimit has been cancelled.\n\nDATE AND TIME\n${when}\n\nTOPIC\n${input.topic}\n\nPlease remove the event from your calendar. Reply to your private workspace conversation if you would like to discuss another time.\n\nOskar`,
    html: `<div style="margin:0;padding:32px 16px;background:#f3f6f8;color:#172b3a;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;overflow:hidden;border:1px solid #d8e0e5;border-radius:12px;background:#ffffff"><div style="padding:28px 32px;background:#0f1b24;color:#ffffff"><div style="margin-bottom:14px;color:#f6821f;font-size:12px;font-weight:700;letter-spacing:.08em">MEETING CANCELLED</div><h1 style="margin:0;font-size:27px;line-height:1.2">Your consultation with Oskar has been cancelled</h1></div><div style="padding:30px 32px"><p style="margin:0 0 22px;font-size:16px;line-height:1.6">Hi ${escapeHtml(input.name)},<br>This meeting is no longer scheduled.</p><div style="margin:0 0 22px;padding:20px;border:1px solid #e1e7eb;border-radius:8px;background:#f8fafb"><div style="margin-bottom:6px;color:#697b88;font-size:11px;font-weight:700;letter-spacing:.06em">ORIGINAL DATE AND TIME</div><div style="font-size:17px;font-weight:700;line-height:1.5">${escapeHtml(when)}</div><div style="margin:18px 0 6px;color:#697b88;font-size:11px;font-weight:700;letter-spacing:.06em">TOPIC</div><div style="font-size:15px;line-height:1.5">${escapeHtml(input.topic)}</div></div><p style="margin:0;font-size:14px;line-height:1.6">Please remove the event from your calendar. You can reply in your private workspace if you would like to discuss another time.</p></div></div></div>`,
  });
}

/**
 * Input:
 * - The typed values shown in notifyOwnerOfBooking’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It sends Oskar the fixed owner alert for a confirmed consultation.
 */
export async function notifyOwnerOfBooking(env: Pick<Env, "NOTIFICATION_EMAIL">, input: {
  bookingId: string; name: string; email: string; topic: string; startsAt: string; endsAt: string; origin: string; meetingUrl: string;
}): Promise<void> {
  const when = utcMeetingTime(input.startsAt, input.endsAt);
  const adminUrl = `${input.origin}/admin/calendar`;
  await env.NOTIFICATION_EMAIL.send({
    from: { email: SENDER_ADDRESS, name: "Portfolio Calendar" },
    to: OWNER_NOTIFICATION_ADDRESS,
    subject: `New consultation booking from ${input.name.replace(/[\r\n]+/g, " ").trim()}`,
    text: `A consultation was booked.\n\nVisitor: ${input.name}\nEmail: ${input.email}\nWhen: ${when}\nTopic: ${input.topic}\nGoogle Meet: ${input.meetingUrl}\nBooking: ${input.bookingId}\n\nManage calendar: ${adminUrl}`,
    html: `<h1>New consultation booking</h1><p><strong>Visitor:</strong> ${escapeHtml(input.name)}</p><p><strong>Email:</strong> ${escapeHtml(input.email)}</p><p><strong>When:</strong> ${escapeHtml(when)}</p><p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p><p><a href="${escapeHtml(input.meetingUrl)}">Join Google Meet</a></p><p><a href="${escapeHtml(adminUrl)}">Manage calendar</a></p>`,
  });
}

/**
 * Input:
 * - The typed values shown in notifyOwnerOfHandoff’s signature.
 * Output:
 * - The declared value or Promise; failures follow the caller’s existing boundary.
 * What this function does:
 * - It sends Oskar the fixed owner alert for a consent-created workspace.
 */
export async function sendWorkspaceInvitation(env: Pick<Env, "NOTIFICATION_EMAIL">, input: {
  email: string;
  name: string;
  workspaceTitle: string;
  purpose: string;
  workspaceId: string;
  origin: string;
}): Promise<void> {
  const workspaceUrl = `${input.origin}/chat/${encodeURIComponent(input.workspaceId)}`;
  const name = input.name.replace(/[\r\n]+/g, " ").trim();
  const title = input.workspaceTitle.replace(/[\r\n]+/g, " ").trim();
  await env.NOTIFICATION_EMAIL.send({
    from: { email: SENDER_ADDRESS, name: "Oskar Ablimit" },
    to: input.email,
    subject: `You’re invited to “${title}”`,
    text: [`Hi ${name},`, "", `Oskar invited you to the private workspace “${title}”.`, "", `Purpose: ${input.purpose}`, "", "Inside the workspace you can:", "- Message Oskar directly", "- Ask the workspace agent for help", "- Use only the tools and skills Oskar has approved for this workspace", "- Return to the persistent conversation with the private link", "", `Open workspace: ${workspaceUrl}`, "", "This URL is a private invitation. Do not forward or publish it."].join("\n"),
    html: `<div style="margin:0;padding:32px 16px;background:#f3f6f8;color:#172b3a;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;border:1px solid #d8e0e5;border-radius:12px;background:#fff;overflow:hidden"><div style="padding:28px 32px;background:#0f1b24;color:#fff"><div style="margin-bottom:12px;color:#9af5dc;font-size:12px;font-weight:700;letter-spacing:.08em">PRIVATE WORKSPACE INVITATION</div><h1 style="margin:0;font-size:26px">${escapeHtml(title)}</h1></div><div style="padding:30px 32px"><p>Hi ${escapeHtml(name)},</p><p>Oskar invited you to a private, persistent workspace.</p><p><strong>Purpose:</strong> ${escapeHtml(input.purpose)}</p><ul><li>Message Oskar directly</li><li>Ask the workspace agent for help</li><li>Use the tools and skills Oskar approved</li><li>Return later with the same private link</li></ul><a href="${escapeHtml(workspaceUrl)}" style="display:block;margin:24px 0;padding:14px 18px;border-radius:7px;background:#1267e5;color:#fff;font-weight:700;text-align:center;text-decoration:none">Open private workspace</a><p style="color:#697b88;font-size:12px">Keep this invitation URL private. Anyone with the link can open the workspace.</p></div></div></div>`,
  });
}

export async function notifyOwnerOfHandoff(env: Pick<Env, "NOTIFICATION_EMAIL">, input: {
  name: string;
  email: string;
  company?: string;
  intent: string;
  workspaceId: string;
  origin: string;
}): Promise<void> {
  const name = input.name.replace(/[\r\n]+/g, " ").trim();
  const company = input.company?.trim() || "Not provided";
  const intent = input.intent.trim() || "Talk with Oskar";
  const adminUrl = `${input.origin}/admin?workspace=${encodeURIComponent(input.workspaceId)}`;
  const workspaceUrl = `${input.origin}/chat/${encodeURIComponent(input.workspaceId)}`;

  await env.NOTIFICATION_EMAIL.send({
    from: { email: SENDER_ADDRESS, name: "Portfolio Agent" },
    to: OWNER_NOTIFICATION_ADDRESS,
    subject: `New persistent portfolio chat from ${name}`,
    text: [
      `${name} created a persistent portfolio workspace and added you to the conversation.`,
      "",
      `Email: ${input.email}`,
      `Company: ${company}`,
      `Intent: ${intent}`,
      "",
      `Open the Access-protected admin workspace: ${adminUrl}`,
      `Visitor workspace: ${workspaceUrl}`,
    ].join("\n"),
    html: `<h2>New persistent portfolio chat</h2><p><strong>${escapeHtml(name)}</strong> added you to a portfolio conversation.</p><dl><dt>Email</dt><dd>${escapeHtml(input.email)}</dd><dt>Company</dt><dd>${escapeHtml(company)}</dd><dt>Intent</dt><dd>${escapeHtml(intent)}</dd></dl><p><a href="${escapeHtml(adminUrl)}">Open the Access-protected admin workspace</a></p><p><small>Visitor workspace: <a href="${escapeHtml(workspaceUrl)}">${escapeHtml(workspaceUrl)}</a></small></p>`,
  });
}
