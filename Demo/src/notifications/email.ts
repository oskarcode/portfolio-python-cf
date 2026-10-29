// Application ownership: Transactional owner notifications sent through Cloudflare Email Service.

const OWNER_NOTIFICATION_ADDRESS = "oskarmansanqu@icloud.com";
const SENDER_ADDRESS = "portfolio@oskarcode.com";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
})[character] ?? character);

/** Sends Oskar a transactional alert after a consultation is booked. */
export async function notifyOwnerOfBooking(env: Pick<Env, "NOTIFICATION_EMAIL">, input: {
  bookingId: string; name: string; email: string; topic: string; startsAt: string; endsAt: string; origin: string;
}): Promise<void> {
  const when = `${new Date(input.startsAt).toUTCString()}–${new Date(input.endsAt).toUTCString()}`;
  const adminUrl = `${input.origin}/admin/calendar`;
  await env.NOTIFICATION_EMAIL.send({
    from: { email: SENDER_ADDRESS, name: "Portfolio Calendar" },
    to: OWNER_NOTIFICATION_ADDRESS,
    subject: `New consultation booking from ${input.name.replace(/[\r\n]+/g, " ").trim()}`,
    text: `A consultation was booked.\n\nVisitor: ${input.name}\nEmail: ${input.email}\nWhen: ${when}\nTopic: ${input.topic}\nBooking: ${input.bookingId}\n\nManage calendar: ${adminUrl}`,
    html: `<h1>New consultation booking</h1><p><strong>Visitor:</strong> ${escapeHtml(input.name)}</p><p><strong>Email:</strong> ${escapeHtml(input.email)}</p><p><strong>When:</strong> ${escapeHtml(when)}</p><p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p><p><a href="${escapeHtml(adminUrl)}">Manage calendar</a></p>`,
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
