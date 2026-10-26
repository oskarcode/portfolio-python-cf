# Professional Portfolio

A Cloudflare-native portfolio for Oskar Ablimit with a professional website, an ephemeral visitor chat, durable opt-in conversations, a local blog, and an Access-protected content agent.

## Architecture

- **Cloudflare Worker + Hono** — API and application routing
- **React + Vite + Workers Static Assets** — website, chat, blog, and admin UI
- **Workers AI (`@cf/zai-org/glm-5.2`) + AI Gateway** — conversational inference
- **Pi Durable + Durable Object SQLite** — persistent opt-in and owner workspaces
- **D1** — sections, blog posts, leads, and revisions
- **R2** — media binding for future uploads
- **Cloudflare Access** — required for production `/api/admin/*` requests

Anonymous messages are held only in React state and sent as bounded context to a stateless endpoint. They disappear on refresh. When a visitor explicitly adds Oskar and consents, the transcript moves into a Pi Durable workspace and a D1 lead points to it.

## Routes

| Route | Purpose |
|---|---|
| `/` | Professional portfolio |
| `/chat` | Ephemeral conversational portfolio |
| `/chat/:workspaceId` | Consented persistent conversation |
| `/blog` and `/blog/:slug` | Local writing |
| `/admin` | Content agent and lead inbox |
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

The immutable Durable Object migration history is preserved. Migration `v5` introduces `PortfolioSession` and retires the former `WebMcpChat` class.

## Admin security

Production admin APIs require the `Cf-Access-Authenticated-User-Email` header. Configure a Cloudflare Access application/policy for `/admin*` and `/api/admin/*`. Localhost is allowed for development.

## Content model

- `site_sections` stores flexible, ordered page sections.
- `blog_posts` stores native and Medium-imported posts.
- `leads` contains only conversations where a visitor explicitly involved Oskar.
- `content_revisions` records the previous value before agent or API updates.

The owner agent receives content mutation tools only in the fixed private `owner-content` Pi Durable workspace. Public durable workspaces receive read-only portfolio tools.
