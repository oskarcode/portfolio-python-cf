# Portfolio on Cloudflare Workers - Complete Documentation

> A serverless portfolio website built with Python Workers, D1 Database, and AI-powered chatbot using Claude MCP Connector.

**Live Site:** https://portfolio.oskarcode.com  
**Workers URL:** https://portfolio-python-cf.oskarmansanqu.workers.dev

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [File Structure](#file-structure)
4. [Key Components Explained](#key-components-explained)
5. [User Flow](#user-flow)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [AI Chatbot (MCP Integration)](#ai-chatbot-mcp-integration)
9. [Deployment Guide](#deployment-guide)
10. [Maintenance & Updates](#maintenance--updates)
11. [Adding New Content/Sections](#adding-new-contentsections)
12. [Future Scalability](#future-scalability)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Python Worker   │───▶│   D1 Database    │    │  MCP Server   │  │
│  │  (entry.py)      │    │  (SQLite Edge)   │    │  (TypeScript) │  │
│  │                  │    │                  │    │               │  │
│  │  - Jinja2 HTML   │    │  - Skills        │    │  - READ tools │  │
│  │  - REST APIs     │    │  - Projects      │    │  - WRITE tools│  │
│  │  - Chat Handler  │    │  - Resume        │    │               │  │
│  └────────┬─────────┘    │  - Consulting    │    └───────┬───────┘  │
│           │              │  - Teaching      │            │          │
│           │              │  - Contacts      │            │          │
│           │              └──────────────────┘            │          │
│           │                                              │          │
│           └──────────────────────────────────────────────┘          │
│                              │                                       │
│                              ▼                                       │
│                    ┌──────────────────┐                             │
│                    │   Claude API     │                             │
│                    │  (MCP Connector) │                             │
│                    └──────────────────┘                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **User visits site** → Cloudflare routes to Python Worker
2. **Worker renders page** → Fetches data from D1, renders Jinja2 template
3. **User uses chatbot** → Message sent to Worker → Claude API with MCP
4. **Claude calls MCP tools** → MCP Server fetches/updates D1 data
5. **Response returned** → Formatted and displayed to user

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Cloudflare Workers (Python/Pyodide) | Serverless compute at edge |
| **Database** | Cloudflare D1 (SQLite) | Persistent data storage |
| **Templating** | Jinja2 | Server-side HTML rendering |
| **Frontend** | Bootstrap 5.3 + Custom CSS | Responsive UI |
| **AI Chatbot** | Claude API + MCP Connector | Natural language portfolio assistant |
| **MCP Server** | TypeScript Worker | Tool definitions for Claude |

---

## File Structure

```
12-portfolio-python-cf/
├── src/
│   ├── entry.py              # Main router - request routing only
│   ├── index.py              # Worker export (required by Wrangler)
│   ├── utils/                # Utility functions
│   │   ├── __init__.py       # Exports all utilities
│   │   ├── db.py             # Database helpers (query_all, query_first)
│   │   └── response.py       # Response helpers (json_response, render, etc.)
│   ├── pages/                # Page handlers (HTML rendering)
│   │   ├── __init__.py       # Exports all page handlers
│   │   └── handlers.py       # home, projects, skills, teaching, etc.
│   ├── api/                  # REST API handlers
│   │   ├── __init__.py       # Exports all API handlers
│   │   ├── read.py           # GET endpoints (list, get by ID)
│   │   ├── write.py          # POST/PUT/DELETE endpoints
│   │   └── chat.py           # Claude MCP chat endpoint
│   ├── mcp/                  # MCP integration
│   │   ├── __init__.py
│   │   └── claude.py         # Claude API + MCP Connector
│   └── templates/            # Jinja2 HTML templates
│       ├── base.html         # Base layout + chatbot widget
│       ├── home.html         # Homepage
│       ├── skills.html       # Skills listing
│       ├── projects.html     # Projects showcase
│       ├── resume.html       # Resume/CV
│       ├── consulting.html   # Consulting services
│       ├── teaching.html     # Teaching courses
│       ├── contact_me.html   # Contact links
│       ├── content.html      # Published articles
│       └── chat.html         # Standalone chat page
├── schema.sql                # D1 database schema
├── seed_data.sql            # Sample data for testing
├── seed_live_data.sql       # Production data
├── wrangler.toml            # Cloudflare configuration
├── pyproject.toml           # Python dependencies
└── README.md                # Quick start guide
```

---

## Key Components Explained

### 1. Entry Point (`src/entry.py`)

The main router - handles request routing only, delegates to modules:

```python
from utils import render, get_id, get_request_json
from pages import home, projects, skills, teaching, consulting, content, resume, contact_me
from api import api_health, api_skills, api_create_skill, ...

class Default(WorkerEntrypoint):
    async def on_fetch(self, request):
        path = url.split("?")[0].rstrip("/")
        db = self.env.DB
        
        # Page routes - delegate to pages module
        if method == "GET":
            routes = {
                "/": lambda: home(db),
                "/projects": lambda: projects(db),
                "/skills": lambda: skills(db),
                # ...
            }
            if path in routes:
                return await routes[path]()
        
        # API routes - delegate to api module
        if path == "/api/skills":
            if method == "GET":
                return await api_skills(db)
            if method == "POST":
                return await api_create_skill(db, await get_request_json(request))
```

### 2. Utils Module (`src/utils/`)

**`db.py`** - Database helpers:
```python
async def query_all(db, sql):
    """Execute query and return all results as Python dicts"""
    return [dict(r.to_py()) for r in (await db.prepare(sql).all()).results]

async def query_first(db, sql):
    """Execute query and return first result or None"""
    r = await db.prepare(sql).first()
    return dict(r.to_py()) if r else None
```

**`response.py`** - Response helpers:
```python
def json_response(data, status=200):
    return Response(json.dumps(data), status=status, headers={"Content-Type": "application/json"})

def render(name, **ctx):
    return Response(templates.get_template(name).render(**ctx), headers={"Content-Type": "text/html"})

def parse_json(val):
    """Parse JSON stored in TEXT columns"""
    if isinstance(val, str) and val:
        try: return json.loads(val)
        except: pass
    return val
```

### 3. Pages Module (`src/pages/handlers.py`)

Page handlers render HTML templates with database data:
```python
async def home(db):
    intro = await query_first(db, "SELECT * FROM portfolioapp_self_intro LIMIT 1")
    return render("home.html", self_intro=intro or {})

async def skills(db):
    skills = await query_all(db, "SELECT * FROM portfolioapp_skill")
    for s in skills:
        s["styling"] = parse_json(s.get("styling"))
    return render("skills.html", skills=skills)
```

### 4. API Module (`src/api/`)

**`read.py`** - GET endpoints:
```python
async def api_skills(db):
    skills = await query_all(db, "SELECT * FROM portfolioapp_skill")
    return json_response(skills)
```

**`write.py`** - POST/PUT/DELETE endpoints:
```python
async def api_create_skill(db, body):
    result = await db.prepare(
        "INSERT INTO portfolioapp_skill (skill, example, styling) VALUES (?, ?, ?) RETURNING id"
    ).bind(js_get(body, "skill", ""), js_get(body, "example", ""), "").first()
    return json_response({"success": True, "id": dict(result.to_py())["id"]})
```

**`chat.py`** - Claude MCP chat endpoint:
```python
async def api_chat(request, env, is_admin=False):
    from mcp.claude import chat_with_claude
    body_dict = json.loads(await request.text())
    response = await chat_with_claude(body_dict["message"], env, body_dict.get("history", []), is_admin)
    return json_response({"response": response})
```

### 5. Claude MCP Integration (`src/mcp/claude.py`)

```python
# MCP Server configuration
MCP_URL = "https://portfolio-mcp.oskarmansanqu.workers.dev/sse"
MCP_SERVER_NAME = "portfolio"

# Tools allowed for public chatbot (READ-only)
READ_TOOLS = [
    "health_check", "get_self_intro", "list_skills", 
    "list_projects", "list_published_content", "get_consulting",
    "list_contact_me", "get_resume", "get_teaching"
]

async def chat_with_claude(message, env, history, is_admin=False):
    """Send message to Claude with MCP Connector"""
    
    # Build toolset config - allowlist pattern for public
    if is_admin:
        toolset = {"type": "mcp_toolset", "mcp_server_name": MCP_SERVER_NAME}
    else:
        toolset = {
            "type": "mcp_toolset",
            "mcp_server_name": MCP_SERVER_NAME,
            "default_config": {"enabled": False},
            "configs": {tool: {"enabled": True} for tool in READ_TOOLS}
        }
    
    body = {
        "model": "claude-sonnet-4-20250514",
        "mcp_servers": [{"type": "url", "url": MCP_URL, "name": MCP_SERVER_NAME}],
        "tools": [toolset],
        "messages": messages
    }
    
    # Call Claude API with MCP beta header
    response = await fetch(API_URL, {
        "headers": {
            "anthropic-beta": "mcp-client-2025-11-20",  # Required for MCP
            "x-api-key": api_key
        },
        "body": json.dumps(body)
    })
```

---

## User Flow

### Public User Flow

```
1. Visit homepage (/)
   ├── Worker fetches self_intro from D1
   ├── Renders home.html with Jinja2
   └── Returns HTML with chatbot widget

2. Navigate to section (e.g., /projects)
   ├── Worker fetches projects from D1
   ├── Renders projects.html
   └── Returns HTML

3. Use chatbot (bottom-right widget)
   ├── User types question
   ├── POST /api/chat with message
   ├── Worker calls Claude API with MCP
   ├── Claude uses READ tools via MCP Server
   ├── MCP Server queries D1 database
   └── Formatted response returned to user
```

### Admin Flow (Protected)

```
1. Access /admin-chat (Cloudflare Access protected)
   ├── User authenticates via email
   ├── Gets access to full chat interface

2. Admin commands via chat
   ├── "Add a new skill: Python - 10 years experience"
   ├── Claude uses create_skill MCP tool
   ├── MCP Server INSERTs into D1
   └── Confirmation returned
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `portfolioapp_skill` | Technical skills | skill, example, styling (JSON) |
| `portfolioapp_project` | Portfolio projects | title, use_case, frontend, backend, hosting, link |
| `portfolioapp_self_intro` | About me section | summary, experiences, education |
| `portfolioapp_resume` | Resume/CV | summary, employment_history (JSON), education (JSON), certifications (JSON) |
| `portfolioapp_consultinginfo` | Consulting services | intro, consulting_services, included_details, why_me, booking_url |
| `portfolioapp_teaching` | Teaching courses | title, course_overview, syllabus (JSON), learning_outcomes (JSON) |
| `portfolioapp_publishedcontent` | Blog/articles | platform, title, url |
| `portfolioapp_contactme` | Contact links | platform, url |

### JSON Fields

Complex data is stored as JSON in TEXT columns:

```sql
-- Example: Resume employment history
employment_history TEXT  -- Stored as JSON array
-- [{"company": "Cloudflare", "title": "Senior SE", "dates": "2024-Present"}, ...]
```

Parse in Python:
```python
resume["employment_history"] = parse_json_field(resume.get("employment_history"))
```

---

## API Reference

### Read Endpoints (GET)

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/self-intro` | Get self introduction |
| `GET /api/skills` | List all skills |
| `GET /api/skills/:id` | Get specific skill |
| `GET /api/projects` | List all projects |
| `GET /api/projects/:id` | Get specific project |
| `GET /api/published-content` | List articles |
| `GET /api/consulting` | Get consulting info |
| `GET /api/contact-me` | List contact links |
| `GET /api/resume` | Get resume |
| `GET /api/teaching` | Get teaching info |

### Write Endpoints (POST/PUT/DELETE)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills` | POST | Create skill |
| `/api/skills/:id` | PUT | Update skill |
| `/api/skills/:id` | DELETE | Delete skill |
| `/api/projects` | POST | Create project |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/self-intro` | PUT | Update intro |
| `/api/consulting` | PUT | Update consulting |
| `/api/resume` | PUT | Update resume |
| `/api/teaching` | PUT | Update teaching |

### Chat Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat` | Public chatbot (READ tools only) |
| `POST /api/admin-chat` | Admin chatbot (all tools) |

**Request Body:**
```json
{
  "message": "What skills does Oskar have?",
  "history": [{"text": "Hi", "isUser": true}, {"text": "Hello!", "isUser": false}]
}
```

---

## AI Chatbot (MCP Integration)

### How MCP Works

1. **MCP Server** (separate Worker) defines tools that map to portfolio APIs
2. **Claude API** connects to MCP Server via `mcp_servers` config
3. **Tool Filtering** controls which tools are available:
   - Public: READ tools only (allowlist pattern)
   - Admin: All tools enabled

### MCP Tool Configuration Patterns

```python
# Pattern 1: Enable all tools (admin)
toolset = {
    "type": "mcp_toolset",
    "mcp_server_name": "portfolio"
}

# Pattern 2: Allowlist - only specific tools (public)
toolset = {
    "type": "mcp_toolset",
    "mcp_server_name": "portfolio",
    "default_config": {"enabled": False},
    "configs": {
        "list_skills": {"enabled": True},
        "list_projects": {"enabled": True}
        # ... only READ tools
    }
}

# Pattern 3: Denylist - disable specific tools
toolset = {
    "type": "mcp_toolset",
    "mcp_server_name": "portfolio",
    "configs": {
        "delete_skill": {"enabled": False}
    }
}
```

---

## Deployment Guide

### Prerequisites

1. Cloudflare account with Workers paid plan
2. Wrangler CLI installed: `npm install -g wrangler`
3. Python + UV for local development

### Initial Setup

```bash
# 1. Clone and navigate
cd 12-portfolio-python-cf

# 2. Create D1 database
wrangler d1 create portfolio-django-db

# 3. Update wrangler.toml with database_id from step 2

# 4. Initialize schema
wrangler d1 execute portfolio-django-db --remote --file=schema.sql

# 5. Seed data
wrangler d1 execute portfolio-django-db --remote --file=seed_live_data.sql

# 6. Set API key secret
wrangler secret put ANTHROPIC_API_KEY
# Paste your Anthropic API key

# 7. Deploy
npx wrangler deploy
```

### Custom Domain Setup

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select `portfolio-python-cf`
3. Settings → Triggers → Custom Domains
4. Add domain: `portfolio.yourdomain.com`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for chatbot |
| `DB` | Auto | D1 database binding (configured in wrangler.toml) |

---

## Maintenance & Updates

### Updating Content via D1

```bash
# Update single field
wrangler d1 execute portfolio-django-db --remote --command \
  "UPDATE portfolioapp_consultinginfo SET booking_url = 'https://new-url.com' WHERE id = 2;"

# View current data
wrangler d1 execute portfolio-django-db --remote --command \
  "SELECT * FROM portfolioapp_skill;" --json
```

### Updating Content via API

```bash
# Create new skill
curl -X POST https://portfolio-python-cf.oskarmansanqu.workers.dev/api/skills \
  -H "Content-Type: application/json" \
  -d '{"skill": "Terraform", "example": "Infrastructure as Code"}'

# Update project
curl -X PUT https://portfolio-python-cf.oskarmansanqu.workers.dev/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "description": "New description"}'
```

### Updating Content via Admin Chat

1. Access `/admin-chat` (requires Cloudflare Access auth)
2. Use natural language: "Add a new project called 'AI Dashboard' with React frontend and Python backend"
3. Claude will use MCP tools to create the record

### Redeploying After Code Changes

```bash
npx wrangler deploy
```

### Viewing Logs

```bash
# Real-time logs
npx wrangler tail

# With formatting
npx wrangler tail --format=pretty
```

---

## Adding New Content/Sections

### Adding a New Page Section

**Step 1: Create database table**

```sql
-- Add to schema.sql
CREATE TABLE IF NOT EXISTS portfolioapp_awards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    organization TEXT,
    year INTEGER,
    description TEXT,
    styling TEXT
);
```

Apply:
```bash
wrangler d1 execute portfolio-django-db --remote --file=schema.sql
```

**Step 2: Add route in entry.py**

```python
# In on_fetch method, add page route
elif path == "/awards":
    return await self.awards(db)

# Add view method
async def awards(self, db):
    awards = await query_all(db, "SELECT * FROM portfolioapp_awards ORDER BY year DESC")
    return render("awards.html", awards=awards)

# Add API routes
if path == "/api/awards":
    if method == "GET":
        return await self.api_awards(db)
    elif method == "POST":
        body = await get_request_json(request)
        return await self.api_create_award(db, body)
```

**Step 3: Create template**

Create `src/templates/awards.html`:

```html
{% extends 'base.html' %}
{% block title %}Awards - Oskar Ablimit{% endblock %}
{% block content %}
<h2 class="page-header mb-4">Awards & Recognition</h2>
<div class="row g-4">
    {% for award in awards %}
    <div class="col-md-6">
        <div class="card h-100 p-4">
            <h5 class="fw-bold">{{ award.title }}</h5>
            <p class="text-muted">{{ award.organization }} • {{ award.year }}</p>
            <p>{{ award.description }}</p>
        </div>
    </div>
    {% else %}
    <div class="col-12">
        <p class="text-muted">No awards found.</p>
    </div>
    {% endfor %}
</div>
{% endblock %}
```

**Step 4: Add navigation link**

In `base.html`, add to navbar:
```html
<li class="nav-item">
    <a class="nav-link" href="/awards"><i class="bi bi-trophy me-1"></i>Awards</a>
</li>
```

**Step 5: Add MCP tools (optional)**

In the MCP Server (`12-portfolio-mcp/src/index.ts`):

```typescript
this.server.tool(
    "list_awards",
    "Get all awards and recognitions",
    {},
    async () => {
        const data = await this.callApi("/api/awards");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
);
```

**Step 6: Deploy**

```bash
npx wrangler deploy
```

---

## Future Scalability

### Adding More AI Features

1. **Multiple AI Models**
   ```python
   # In claude.py, support model switching
   MODELS = {
       "fast": "claude-3-haiku-20240307",
       "balanced": "claude-sonnet-4-20250514",
       "powerful": "claude-3-opus-20240229"
   }
   ```

2. **Caching Responses**
   ```python
   # Use Cloudflare KV for caching
   cached = await self.env.CACHE.get(f"chat:{hash(message)}")
   if cached:
       return json_response({"response": cached})
   ```

### Adding Media/File Uploads

1. Enable R2 bucket in wrangler.toml:
   ```toml
   [[r2_buckets]]
   binding = "MEDIA_BUCKET"
   bucket_name = "portfolio-media"
   ```

2. Add upload endpoint:
   ```python
   if path == "/api/upload":
       file_data = await request.arrayBuffer()
       await self.env.MEDIA_BUCKET.put(filename, file_data)
   ```

### Performance Optimizations

1. **Edge Caching**
   ```python
   # Add cache headers for static pages
   headers = {
       "Content-Type": "text/html",
       "Cache-Control": "public, max-age=3600"
   }
   ```

2. **Database Indexes**
   ```sql
   CREATE INDEX idx_project_created ON portfolioapp_project(created_date DESC);
   ```

### Multi-language Support

1. Add language detection
2. Store translations in D1
3. Use Accept-Language header to select

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Error 1101 - Worker threw exception** | Check Wrangler logs: `npx wrangler tail` |
| **Template not found** | Verify file exists in `src/templates/` |
| **D1 query fails** | Check table name matches schema |
| **Chatbot not responding** | Verify `ANTHROPIC_API_KEY` is set |
| **MCP tools not working** | Check MCP Server is deployed and URL correct |

### Debug Commands

```bash
# Check Worker status
npx wrangler whoami

# View D1 tables
wrangler d1 execute portfolio-django-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"

# Test API endpoint
curl https://portfolio-python-cf.oskarmansanqu.workers.dev/api/health

# View real-time logs
npx wrangler tail --format=pretty
```

### Jinja2 Syntax Notes

- Use `{% else %}` not `{% empty %}` for empty loops (Jinja2, not Django)
- Auto-escape is enabled, use `{{ var|safe }}` for HTML content
- Filters: `{{ text|truncate(100) }}`, `{{ list|length }}`

---

## Quick Reference

### Deploy Commands

```bash
npx wrangler deploy                    # Deploy Worker
wrangler d1 execute DB --remote --command "SQL"  # Run SQL
wrangler secret put KEY                # Set secret
wrangler tail                          # View logs
```

### URLs

| Resource | URL |
|----------|-----|
| Production Site | https://portfolio.oskarcode.com |
| Workers URL | https://portfolio-python-cf.oskarmansanqu.workers.dev |
| MCP Server | https://portfolio-mcp.oskarmansanqu.workers.dev/sse |
| API Health | https://portfolio-python-cf.oskarmansanqu.workers.dev/api/health |

---

*Documentation last updated: January 2026*
