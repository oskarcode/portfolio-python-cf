CREATE TABLE IF NOT EXISTS site_sections (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_markdown TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'native' CHECK (source IN ('native', 'medium', 'imported')),
  source_url TEXT UNIQUE,
  source_id TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'scheduled', 'closed')),
  summary TEXT,
  assessment_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  previous_value TEXT NOT NULL,
  change_summary TEXT,
  changed_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sections_status_order ON site_sections(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_status_published ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_resource ON content_revisions(resource_type, resource_id, created_at DESC);

INSERT OR IGNORE INTO site_sections (id, type, title, slug, summary, content_json, sort_order, status) VALUES
('hero', 'hero', 'Cloud, security, and AI—made practical.', 'home', 'Solutions engineering grounded in customer outcomes.', '{"eyebrow":"Senior Sales Engineer · Adjunct Professor · Builder","headline":"I turn complex technology into clear, useful outcomes.","body":"I’m Oskar Ablimit. I help teams understand, design, and adopt cloud, security, and AI solutions—then teach what I learn.","actions":[{"label":"Explore my work","href":"#projects"},{"label":"Ask my portfolio","href":"/chat"}]}', 10, 'published'),
('about', 'richText', 'A technical operator with a customer-first perspective.', 'about', 'About Oskar Ablimit.', '{"body":"I am a Senior Sales Engineer with 9+ years across Cloudflare, AWS, Tencent Cloud, and Alibaba Cloud. My work sits at the intersection of solution architecture, technical communication, enterprise transformation, and hands-on building. I also teach graduate cloud computing at Yeshiva University.","highlights":["9+ years in cloud and technical sales","Senior Sales Engineer at Cloudflare","Adjunct Professor at Yeshiva University","Master of Engineering in Cloud Computing"]}', 20, 'published'),
('capabilities', 'cards', 'Capabilities', 'capabilities', 'Areas where experience, teaching, and hands-on work come together.', '{"items":[{"id":"cloudflare","title":"Cloudflare architecture","body":"Workers, Durable Objects, D1, R2, Zero Trust, application security, and edge architecture."},{"id":"agents","title":"AI agents and MCP","body":"Durable agents, MCP integrations, tool design, and customer-focused conversational experiences."},{"id":"solutions","title":"Solutions engineering","body":"Discovery, architecture, technical demonstrations, proofs of concept, and executive communication."},{"id":"teaching","title":"Technical teaching","body":"Cloud curriculum, workshops, hands-on labs, and practical technical mentorship."}]}', 30, 'published'),
('projects', 'projects', 'Selected work', 'projects', 'Projects that demonstrate practical engineering and teaching.', '{"items":[{"id":"portfolio-agent","title":"Agent-powered portfolio","summary":"A Cloudflare-native portfolio combining durable conversations, content tools, and interactive experiences.","tags":["Cloudflare Workers","AI Agents","Durable Objects"],"url":"https://github.com/oskarcode/portfolio_combined"},{"id":"security-demo","title":"Cloudflare security demo","summary":"A deliberately vulnerable commerce application for demonstrating WAF, bot, rate-limiting, DDoS, and Access controls.","tags":["Cloudflare Security","Django","Docker"],"url":"https://demo.oskarcode.com/"},{"id":"course-review","title":"GWU Course Review","summary":"A full-stack academic guidance platform for engineering students.","tags":["Django","REST API","Education"],"url":"https://gwu-course-review.mycodeforever.com/"}]}', 40, 'published'),
('teaching', 'richText', 'Teaching cloud by building it.', 'teaching', 'Graduate cloud computing education.', '{"body":"At Yeshiva University’s Katz School, I teach graduate students the foundations and practice of cloud computing. The course covers networking, compute, storage, databases, containers, serverless, security, data, and AI—with a hands-on project for each topic.","link":"https://github.com/oskarcode/yuteaching.git"}', 50, 'published'),
('work', 'services', 'Work with me', 'work-with-me', 'Start with the problem—not a predefined package.', '{"intro":"If you are evaluating Cloudflare, designing an AI agent, modernizing an application, preparing a technical workshop, or navigating a cloud career, tell me what you are trying to accomplish.","items":[{"title":"Architecture and advisory","body":"Clarify options, risks, and an actionable technical path."},{"title":"Implementation support","body":"Move from design to a focused proof of concept or working implementation."},{"title":"Workshops and teaching","body":"Make a complex technical topic understandable and useful for your team."},{"title":"Career mentoring","body":"Practical guidance for cloud, technical sales, and solutions engineering careers."}],"bookingUrl":"https://calendar.google.com/calendar/appointments/schedules/AcZssZ1xHKYdvcfsUs7Oj4wKIW8UOZmpNdOAyNYtDq0vI_WNlV_m_vuKA7QkDmlNYhgmXGHueVxGDPgw?gv=true"}', 60, 'published'),
('contact', 'contact', 'Let’s start with what you need.', 'contact', 'Contact and social links.', '{"body":"Use chat for a quick, private conversation. Add me only when you want a response or a meeting.","links":[{"label":"LinkedIn","href":"https://www.linkedin.com/in/cloudflareoskar/"},{"label":"GitHub","href":"https://github.com/oskarcode"},{"label":"Medium","href":"https://medium.com/@rnwqyzxnn"}]}', 90, 'published');

INSERT OR IGNORE INTO blog_posts (id, slug, title, excerpt, content_markdown, tags_json, status, source, source_url, published_at) VALUES
('medium-f21f19674717', 'building-your-first-mcp-server', 'Building Your First MCP Server: A Weather API Integration with Claude', 'A practical introduction to Model Context Protocol through a weather integration.', 'This article was imported from Medium. Open the original article while the full local copy is prepared.', '["MCP","AI","Claude"]', 'published', 'medium', 'https://medium.com/@rnwqyzxnn/building-your-first-mcp-server-a-weather-api-integration-with-claude-f21f19674717', '2025-01-01T00:00:00Z'),
('medium-de6f6f76c900', 'building-an-ai-powered-portfolio-with-mcp', 'Building an AI-Powered Portfolio with MCP', 'How a portfolio can become an interactive, agent-powered experience.', 'This article was imported from Medium. Open the original article while the full local copy is prepared.', '["MCP","Portfolio","AI"]', 'published', 'medium', 'https://medium.com/@rnwqyzxnn/building-an-ai-powered-portfolio-with-mcp-a-complete-guide-de6f6f76c900', '2025-01-02T00:00:00Z'),
('medium-7d373985ac66', 'security-first-ecommerce-demo', 'Building a Security-First E-commerce Demo', 'A deliberately vulnerable application for demonstrating Cloudflare security controls.', 'This article was imported from Medium. Open the original article while the full local copy is prepared.', '["Cloudflare","Security","Django"]', 'published', 'medium', 'https://medium.com/@rnwqyzxnn/building-a-security-first-e-commerce-demo-how-i-created-a-vulnerability-testing-platform-with-7d373985ac66', '2025-01-03T00:00:00Z');
