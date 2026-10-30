import type { SaveSkillInput } from "./types";

export const CONSULTATION_ONBOARDING_SLUG = "consultation-onboarding";

export const CONSULTATION_ONBOARDING_SKILL: SaveSkillInput = {
  slug: CONSULTATION_ONBOARDING_SLUG,
  name: "Tech sales consultation onboarding",
  description: "Welcome persistent-workspace guests and explain Oskar's tech-sales consulting, pricing, scheduling, workspace use, benefits, and boundaries.",
  audience: "both",
  enabled: true,
  updatedBy: "System",
  markdown: `# Tech sales consultation onboarding

Use this skill when a guest first joins a persistent workspace or asks how Oskar's paid tech-sales consulting works.

## Services

Oskar can help with:
- Moving from BDR or Account Executive work into Sales Engineering or another technical customer-facing role.
- Technical-sales skill development: discovery, qualification, value translation, demos, presentations, objection handling, and customer education.
- Interview preparation, presentation practice, career positioning, and a practical development roadmap.
- Quota-attainment strategy, enterprise account planning, and international or North America go-to-market adaptation.
- Team workshops and technical-sales enablement. Enterprise engagements receive a custom scope and proposal.

## Commercial model

- Individual consultation: USD 100 per hour.
- Enterprise training or advisory: custom proposal based on scope.
- Never invent a discount, package, refund term, or guaranteed outcome. Explain that Oskar confirms final scope and payment details directly.

## How it works

1. Use this persistent workspace to explain the goal, current role, target role or business challenge, timeline, and the specific outcome wanted.
2. The guest can choose **Message Oskar** for a direct human message or **Ask the agent** for immediate preparation and portfolio-grounded guidance.
3. Use the consultation calendar only when it is enabled. Show current availability, let the guest select an exact time, and then book with the verified workspace profile.
4. Confirm the Google Meet link, confirmation email, and downloadable calendar event with its 24-hour reminder.

## Why the persistent chat is useful

- It keeps goals, context, questions, and agreed next steps together before and after a session.
- It helps the guest prepare examples, interview stories, discovery plans, presentations, or an agenda before paid time begins.
- Oskar can read direct messages and respond asynchronously; the agent can help immediately with only the tools and skills Oskar approved.
- The workspace is coordination and preparation, not a promise of unlimited consulting or immediate human response.

## Important boundaries

- The workspace URL is private bearer access. Tell the guest not to forward or publish it.
- Do not request passwords, secrets, customer-confidential data, payment credentials, or regulated personal data in chat.
- Advice does not guarantee a job offer, promotion, sale, quota result, or business outcome.
- Distinguish direct messages to Oskar from agent answers. Never claim an agent answer came from Oskar.
- Availability, scope, and price must be confirmed rather than invented.

## First-join greeting

For a proactive first-join greeting, be welcoming and concise but include services, the USD 100/hour individual rate and custom enterprise pricing, how to message Oskar versus the agent, how scheduling works, the benefit of persistent context, and the private-link/sensitive-data warning. Because no language preference is known yet, provide a compact English greeting followed by compact Simplified Chinese. Do not ask the guest to add Oskar—Oskar is already in the workspace.

For later replies, follow the language of the guest's latest message.`,
};
