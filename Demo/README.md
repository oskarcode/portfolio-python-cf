# Professional Portfolio

A Cloudflare-native portfolio for Oskar Ablimit with a professional website, an ephemeral visitor chat, durable opt-in conversations, a local blog, and an Access-protected content agent.

## Architecture

- **Cloudflare Worker + Hono** — API and application routing
- **React + Vite + Workers Static Assets** — website, chat, blog, and admin UI
- **Workers AI (`@cf/zai-org/glm-5.2`) + AI Gateway** — conversational inference
- **Pi Durable + Durable Object SQLite** — persistent opt-in and owner workspaces
- **Cloudflare Computer + Worker Loader** — durable, Git-versioned skill files and isolated Worker Shell commands
- **Pi Durable tasks + Durable Object alarms** — workspace-local scheduled agent instructions
- **Workers AI web search/fetch tools** — optional current-web research attached per workspace
- **D1** — sections, blog posts, leads, revisions, managed workspaces, and capability attachments
- **R2** — media binding for future uploads
- **Cloudflare Access** — required for production `/api/admin/*` requests

Anonymous messages are held only in React state and sent as bounded context to a stateless endpoint. They disappear on refresh. When a visitor explicitly adds Oskar and consents, the transcript moves into a Pi Durable workspace and a D1 lead points to it. The opaque `/chat/:workspaceId` URL acts as the visitor's private invitation: it restores history and lets the visitor explicitly choose **Message Oskar** or **Ask the agent** for every message.

## Routes

| Route | Purpose |
|---|---|
| `/` | Professional portfolio |
| `/chat` | Ephemeral conversational portfolio |
| `/chat/:workspaceId` | Consented persistent visitor/Oskar/agent workspace |
| `/blog` and `/blog/:slug` | Local writing |
| `/admin` | Unified admin chat with managed and visitor workspaces |
| `/admin/skills` | Cloudflare Computer Skill Hub |
| `/api/*` | Hono APIs |

## Local development

```bash
npm install
npm run db:migrate:local
npm run dev
```

The Workers AI binding is remote during local development and can incur inference charges.

## Validation

```bash
npm test
npm run check
```

`npm run check` generates binding types, type-checks Worker and client code, builds both bundles, and runs a Wrangler dry-run.

## Deployment

The project intentionally uses the existing `portfolio-mission-control` Worker and D1 database. The previous source folder remains untouched as a rollback reference.

```bash
npm run db:migrate:remote
npm run deploy
```

The immutable Durable Object migration history is preserved. Migration `v5` introduces `PortfolioSession` and retires the former `WebMcpChat` class. Migration `v6` adds the global `SkillHub` Durable Object and its Cloudflare Computer workspace.

## Admin security

Production admin APIs require the `Cf-Access-Authenticated-User-Email` header. Configure a Cloudflare Access application/policy for `/admin*` and `/api/admin/*`. Localhost is allowed for development.

## Content model

- `site_sections` stores flexible, ordered page sections.
- `blog_posts` stores native and Medium-imported posts.
- `leads` contains only conversations where a visitor explicitly involved Oskar and tracks active/archived workspace state.
- `workspace_participants` records the visitor, Oskar, and portfolio agent.
- `content_revisions` records the previous value before agent or API updates.

The owner agent receives content mutation tools only in the fixed private `owner-content` Pi Durable workspace. Shared visitor workspaces receive read-only portfolio tools. Direct visitor/Oskar messages are durable transcript entries without model inference; either participant can explicitly choose **Ask the agent** to start a GLM 5.2 turn using that workspace's history. Admin can reply as Oskar, ask the workspace agent, copy the invitation URL, archive/restore a workspace, or permanently delete its D1 and Durable Object records.

## Skill Hub and Computer permissions

`/admin/skills` is Access-protected and lets Oskar create, edit, enable, scope, test, and delete reusable skill definitions. A skill can be eligible for **Visitor durable chat**, **Content agent**, or **Both agents**. Skills are stored under `/workspace/skills/<slug>` in one deployment-global Cloudflare Computer workspace; changes are committed to its internal Git repository.

Skill availability is not global. The admin opens **Tools & skills** in a workspace and explicitly attaches skill definitions, web search, or scheduling to that workspace. The Pi Durable session reads these attachments on every turn. A tool or skill added to one workspace is unavailable in every other workspace until separately attached.

Attached skills can read supporting files and execute the bundled Worker Shell commands (`curl`, file tools, HTML-to-Markdown, JavaScript, and `jq`) inside their own skill directory. Only managed agents and the Access-protected admin can author skills or supporting files. Visitor agents are deterministically denied skill-writing tools and arbitrary visitor-supplied commands.

The admin interface has two surfaces: one unified chat with a workspace switcher, and the Skill Hub. **Portfolio management** is the initial managed workspace. Additional managed workspaces can be created for other jobs. Visitor workspaces appear automatically when a visitor consents and adds Oskar. Each workspace keeps an independent Pi Durable transcript and independent tool attachments.
