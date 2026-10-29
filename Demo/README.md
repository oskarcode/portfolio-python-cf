# Cloudflare Portfolio Workspace

A Cloudflare-native professional portfolio that combines a technical website, local blog, private visitor chat, consent-based durable collaboration, an Access-protected admin workspace, and a Computer-backed skill system. It demonstrates how Workers, D1, Durable Objects, Workers AI, AI Gateway, Static Assets, R2, Access, and Worker Loader can operate as one maintainable application.

## What It Does

- Publishes a structured technical portfolio and ten-article local blog.
- Answers anonymous portfolio questions without storing the browser conversation.
- Converts a chat into a persistent visitor/Oskar/agent workspace only after explicit consent.
- Gives the admin one chat interface for managed workspaces and visitor collaborations.
- Attaches web search, one-time scheduling, and reusable skills independently to each workspace.
- Stores reusable skill files in a durable Cloudflare Computer workspace and runs approved Worker Shell commands.
- Lets the private content agent update portfolio sections and blog posts with revision history.

## How It Works

```text
Browser route
  -> React view
  -> typed client API
  -> Hono Worker route
  -> D1 / Pi Durable / Cloudflare Computer / Workers AI
  -> JSON response
  -> updated website, transcript, or admin workspace
```

Anonymous chat sends bounded message history directly to Workers AI and keeps state only in React memory. A consented handoff creates a D1 lead and a named `PortfolioSession` Durable Object. Admin workspaces use the same durable agent runtime, while D1 controls which skills and tools are available in each workspace.

## Technology Stack

| Technology | Role |
| --- | --- |
| Cloudflare Workers + Hono | HTTP API, validation, routing, and error mapping |
| React + Vite + Static Assets | Website, blog, visitor chat, admin workspace, and Skill Hub |
| Workers AI + AI Gateway | GLM 5.2 inference, web search, and web-page conversion |
| Pi Durable | Durable transcripts, agent tool execution, tasks, and recovery |
| Durable Objects SQLite | One persistent `PortfolioSession` per workspace and one global `SkillHub` |
| D1 | Portfolio content, posts, revisions, leads, participants, managed workspaces, and capability attachments |
| Cloudflare Computer + Worker Loader | Git-versioned skill filesystem and isolated Worker Shell execution |
| Durable Object alarms | One-time scheduled workspace instructions |
| Cloudflare Access | Production authentication boundary for `/admin*` and `/api/admin/*` |
| R2 | Bound media bucket reserved for portfolio uploads |

## Project Structure

| Path | Purpose |
| --- | --- |
| `src/app.ts` | All Hono HTTP routes and admin authorization middleware |
| `src/agent/` | Prompts, model calls, Pi Durable session, tools, web access, and scheduling |
| `src/data/` | D1 repositories for content, posts, leads, and workspaces |
| `src/skills/` | Cloudflare Computer Skill Hub, skill contracts, and agent tools |
| `src/client/` | React views, components, typed API client, and styling |
| `src/shared/types.ts` | Browser/Worker TypeScript contracts |
| `migrations/` | Immutable D1 schema and content migrations |
| `test/app.test.ts` | API-boundary and deterministic permission tests |
| `wrangler.jsonc` | Worker bindings, Durable Object migrations, assets, and runtime variables |

Generated or downloaded directories such as `node_modules/`, `dist/`, and `.wrangler/` are reproducible and are not application source.

## APIs and Interfaces

### Public routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Verify D1 and report configured services |
| `GET` | `/api/content`, `/api/content/:slug` | Read published portfolio content |
| `GET` | `/api/blog`, `/api/blog/:slug` | Read published local articles |
| `POST` | `/api/chat` | Stateless anonymous portfolio answer |
| `POST` | `/api/handoff` | Consent-based creation of a durable visitor workspace |
| `GET` | `/api/workspaces/:id` | Restore an active capability URL workspace |
| `POST` | `/api/workspaces/:id/messages` | Explicitly message Oskar or ask the workspace agent |

### Access-protected admin routes

`/api/admin/*` covers workspace management, tool/skill attachments, content mutations, Skill Hub CRUD, Computer file inspection, and command testing. The browser calls these routes through `src/client/api.ts`; route contracts live in `src/app.ts`.

## Run It Locally

Prerequisites:

- Node.js 22.18+ or 24.11+ recommended by current build dependencies
- npm
- A Cloudflare account authenticated through Wrangler
- Existing or replacement Workers AI, D1, R2, and AI Gateway resources

```bash
npm install
npm run db:migrate:local
npm run dev
```

Local admin APIs intentionally allow `localhost`; production requires Cloudflare Access. Workers AI remains a remote binding during local development and may incur usage.

Validation:

```bash
npm test
npm run check
npm audit --omit=dev
```

## Deploy Your Own Copy

1. Replace account-specific values in `wrangler.jsonc`:
   - `account_id`
   - D1 `database_id` and `database_name`
   - R2 `bucket_name`
   - `AI_GATEWAY_ID`
   - `PUBLIC_URL`
2. Preserve the Durable Object migration history. Add a new migration tag instead of editing old tags.
3. Create the D1 database, R2 bucket, AI Gateway, and Cloudflare Access application.
4. Apply and deploy:

```bash
npm run db:migrate:remote
npm run deploy
```

5. Verify `/api/health`, public pages, an anonymous chat, a consented handoff, Access login, workspace tools, and Skill Hub command execution.

## Security Notes

- Cloudflare Access must protect both `/admin*` and `/api/admin/*`; hiding admin links is not authorization.
- Anonymous chat is stateless on the server but still sends bounded conversation content to Workers AI.
- `/chat/:workspaceId` is an opaque capability URL. Anyone holding it can access that visitor workspace.
- Persistent storage begins only after explicit consent and contact validation.
- Visitor-to-owner messages bypass model inference.
- Workspace skill allowlists are checked by server-side tool implementations, not only by the UI.
- Cloudflare Computer and Worker Loader are preview technologies. Commands execute in an isolated Worker Shell with a bounded command set and timeout.
- The R2 binding exists, but uploads are not implemented.
- One-time schedules are implemented; recurring schedules and a schedule-management screen are not present.
- No application license is currently included.

## Customize It

| Goal | Start here | Also verify |
| --- | --- | --- |
| Change portfolio copy or section layout | `src/client/views/Website.tsx`, D1 `site_sections` | `src/data/content.ts`, content-agent tools |
| Change chat behavior | `src/agent/prompt.ts` | `src/agent/session.ts`, `src/client/views/Chat.tsx` |
| Add an agent tool | `src/agent/tools.ts` | registration and permission selection in `src/agent/session.ts` |
| Add a workspace integration | `src/data/workspaces.ts` | capability UI, D1 migration, session tool selection |
| Change skill execution | `src/skills/hub.ts` | `src/skills/tools.ts`, Worker Loader binding |
| Change admin workspace UX | `src/client/views/Admin.tsx` | corresponding calls in `src/client/api.ts` |
| Change persistence schema | add a new file in `migrations/` | local and remote migration status |
| Add recurring scheduling | `src/agent/scheduling.ts` | alarm reconciliation in `PortfolioSession` |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Admin redirects or returns 401 | Cloudflare Access application and policy for both admin path patterns |
| Agent answers without a tool | Workspace **Tools & skills** attachment and `workspace_capabilities` rows |
| Skill is unavailable | Skill enabled state, audience, and workspace attachment |
| Computer command fails | `SKILL_LOADER`, `experimental` compatibility flag, command availability, and stderr |
| Schedule never runs | Durable Object alarm state and `PortfolioSession.alarm()` logs |
| Content missing | Migration status and published rows returned by `/api/content` or `/api/blog` |
| Type errors after binding changes | Run `npm run types`, then `npm run check` |
| Deployment rejects a Durable Object change | Add a new immutable migration tag; never rewrite an applied tag |

## Official References

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Agents](https://developers.cloudflare.com/agents/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [D1](https://developers.cloudflare.com/d1/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/)
- [Hono](https://hono.dev/)
- [Vite](https://vite.dev/)

## License

No license file is currently included. Add one before distributing or accepting external contributions.
