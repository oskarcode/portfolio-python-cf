# Portfolio on Cloudflare Workers

Portfolio website built with Python Workers, Jinja2, D1 Database, and AI-powered chatbot using Claude MCP.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              CLOUDFLARE PYTHON WORKER                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Python Application (entry.py)                    │  │
│  │  ├── Frontend (Jinja2 templates)                  │  │
│  │  ├── REST API endpoints                           │  │
│  │  └── AI Chatbot (Claude MCP Connector)            │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│              ┌───────────┼───────────┐                  │
│              ▼           ▼           ▼                  │
│           ┌─────┐    ┌─────┐    ┌─────────┐            │
│           │ D1  │    │ MCP │    │ Claude  │            │
│           │(DB) │    │Server│   │  API    │            │
│           └─────┘    └─────┘    └─────────┘            │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
12-portfolio-python-cf/
├── src/
│   ├── entry.py              # Main Worker - Routes, Views, APIs
│   ├── index.py              # Worker export
│   ├── mcp/
│   │   └── claude.py         # Claude API + MCP integration
│   └── templates/            # Jinja2 HTML templates
├── schema.sql                # D1 database schema
├── seed_data.sql             # Initial data
├── wrangler.toml             # Worker config
├── DOCUMENTATION.md          # Full documentation
└── pyproject.toml            # Python dependencies
```

## Quick Start

```bash
# Deploy
npx wrangler deploy

# Set API key for chatbot
npx wrangler secret put ANTHROPIC_API_KEY
```

## Key Features

- **Python Workers**: Native Python on Cloudflare edge
- **D1 Database**: Serverless SQLite
- **AI Chatbot**: Claude with MCP Connector for portfolio Q&A
- **Jinja2 Templates**: Bootstrap 5 responsive design
- **REST API**: Full CRUD at `/api/*`

## URLs

| Resource | URL |
|----------|-----|
| Production | https://portfolio.oskarcode.com |
| Workers | https://portfolio-python-cf.oskarmansanqu.workers.dev |
| MCP Server | https://portfolio-mcp.oskarmansanqu.workers.dev |

## Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for full details on architecture, deployment, maintenance, and adding new content.
