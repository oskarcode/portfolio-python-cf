-- Portfolio Django on Cloudflare Workers - D1 Schema
-- Run: wrangler d1 execute portfolio-django-db --file=schema.sql

-- ===========================================
-- CORE TABLES (matching Django models)
-- ===========================================

-- Links table
CREATE TABLE IF NOT EXISTS portfolioapp_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    link_name TEXT,
    styling TEXT  -- JSON stored as TEXT
);

-- Skills table
CREATE TABLE IF NOT EXISTS portfolioapp_skill (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill TEXT,
    example TEXT,
    styling TEXT  -- JSON stored as TEXT
);

-- Skills-Links M2M relationship
CREATE TABLE IF NOT EXISTS portfolioapp_skill_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id INTEGER NOT NULL,
    link_id INTEGER NOT NULL,
    FOREIGN KEY (skill_id) REFERENCES portfolioapp_skill(id) ON DELETE CASCADE,
    FOREIGN KEY (link_id) REFERENCES portfolioapp_link(id) ON DELETE CASCADE,
    UNIQUE (skill_id, link_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS portfolioapp_project (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    use_case TEXT,
    frontend TEXT,
    backend TEXT,
    hosting TEXT,
    description TEXT,
    link TEXT,
    created_date DATE,
    styling TEXT  -- JSON stored as TEXT
);

-- Projects-Skills M2M relationship
CREATE TABLE IF NOT EXISTS portfolioapp_project_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES portfolioapp_project(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES portfolioapp_skill(id) ON DELETE CASCADE,
    UNIQUE (project_id, skill_id)
);

-- Self Introduction table
CREATE TABLE IF NOT EXISTS portfolioapp_self_intro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT,
    experiences TEXT,
    education TEXT,
    styling TEXT  -- JSON stored as TEXT
);

-- Self_Intro-Skills M2M relationship
CREATE TABLE IF NOT EXISTS portfolioapp_self_intro_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    self_intro_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    FOREIGN KEY (self_intro_id) REFERENCES portfolioapp_self_intro(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES portfolioapp_skill(id) ON DELETE CASCADE,
    UNIQUE (self_intro_id, skill_id)
);

-- Published Content table
CREATE TABLE IF NOT EXISTS portfolioapp_publishedcontent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    styling TEXT  -- JSON stored as TEXT
);

-- Consulting Info table
CREATE TABLE IF NOT EXISTS portfolioapp_consultinginfo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intro TEXT NOT NULL,
    consulting_services TEXT,
    included_details TEXT,
    why_me TEXT,
    success_criteria TEXT,
    booking_url TEXT,
    styling TEXT  -- JSON stored as TEXT
);

-- Contact Me table
CREATE TABLE IF NOT EXISTS portfolioapp_contactme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    styling TEXT  -- JSON stored as TEXT
);

-- Resume table
CREATE TABLE IF NOT EXISTS portfolioapp_resume (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT,
    employment_history TEXT,  -- JSON stored as TEXT
    education TEXT,           -- JSON stored as TEXT
    certifications TEXT,      -- JSON stored as TEXT
    my_skills TEXT,
    languages TEXT,           -- JSON stored as TEXT
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    styling TEXT  -- JSON stored as TEXT
);

-- Teaching table
CREATE TABLE IF NOT EXISTS portfolioapp_teaching (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    course_overview TEXT,
    teaching_school TEXT,
    learning_outcomes TEXT,   -- JSON stored as TEXT
    syllabus TEXT,            -- JSON stored as TEXT
    hands_on_projects TEXT,
    students_feedback TEXT,   -- JSON stored as TEXT
    created_date DATE,
    styling TEXT  -- JSON stored as TEXT
);

-- ===========================================
-- DJANGO REQUIRED TABLES
-- ===========================================

-- Django migrations tracking
CREATE TABLE IF NOT EXISTS django_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app TEXT NOT NULL,
    name TEXT NOT NULL,
    applied DATETIME NOT NULL
);

-- Django content types
CREATE TABLE IF NOT EXISTS django_content_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_label TEXT NOT NULL,
    model TEXT NOT NULL,
    UNIQUE (app_label, model)
);

-- Django sessions
CREATE TABLE IF NOT EXISTS django_session (
    session_key TEXT PRIMARY KEY,
    session_data TEXT NOT NULL,
    expire_date DATETIME NOT NULL
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_project_title ON portfolioapp_project(title);
CREATE INDEX IF NOT EXISTS idx_skill_skill ON portfolioapp_skill(skill);
CREATE INDEX IF NOT EXISTS idx_published_platform ON portfolioapp_publishedcontent(platform);
CREATE INDEX IF NOT EXISTS idx_contact_platform ON portfolioapp_contactme(platform);
CREATE INDEX IF NOT EXISTS idx_session_expire ON django_session(expire_date);
