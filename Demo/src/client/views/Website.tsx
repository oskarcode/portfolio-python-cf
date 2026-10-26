import { useEffect, useState } from "react";
import { api } from "../api";
import type { BlogPost, SiteSection } from "../../shared/types";
import { Layout } from "../components/Layout";

type Item = {
  id?: string; title?: string; company?: string; institution?: string; period?: string; location?: string;
  body?: string; summary?: string; tags?: string[]; url?: string;
};
type Link = { label?: string; href?: string };
const string = (value: unknown) => typeof value === "string" ? value : "";
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const items = (section: SiteSection, key = "items") => Array.isArray(section.content[key]) ? section.content[key] as Item[] : [];

function SectionHeader({ section }: { section: SiteSection }) {
  return <header className="section-heading"><span className="section-kicker">{String(section.sortOrder).padStart(2, "0")} / {section.slug}</span><h2>{section.title}</h2>{section.summary && <p>{section.summary}</p>}</header>;
}

function Hero({ section }: { section: SiteSection }) {
  return <section className="tech-hero" id="home"><div className="hero-grid"><div><span className="section-kicker">{string(section.content.eyebrow)}</span><h1>{string(section.content.headline)}</h1><p className="hero-summary">{string(section.content.body)}</p><div className="hero-actions"><a className="button primary" href="#projects">View technical work</a><a className="button secondary" href="/chat">Ask a specific question</a></div></div><aside className="hero-terminal" aria-label="Technical focus"><div className="terminal-bar"><span/><span/><span/><code>focus.json</code></div><pre>{`{
  "platform": "Cloudflare",
  "domains": [
    "cloud architecture",
    "application security",
    "AI agent systems",
    "solutions engineering"
  ],
  "approach": "clear + practical"
}`}</pre></aside></div><div className="tech-strip"><span>Cloudflare Workers</span><span>Durable Objects</span><span>Zero Trust</span><span>Workers AI</span><span>Python / Django</span><span>AWS</span></div></section>;
}

function About({ section }: { section: SiteSection }) {
  const highlights = strings(section.content.highlights);
  return <section className="content-section about-section" id={section.slug}><SectionHeader section={section}/><div className="about-grid"><p className="large-copy">{string(section.content.body)}</p><ul className="data-list">{highlights.map((highlight) => <li key={highlight}><span>✓</span>{highlight}</li>)}</ul></div></section>;
}

function Capabilities({ section }: { section: SiteSection }) {
  return <section className="content-section" id={section.slug}><SectionHeader section={section}/><div className="technical-grid">{items(section).map((item, index) => <article className="technical-card" key={item.id ?? item.title}><span className="card-index">{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p><div className="tag-list">{item.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div></section>;
}

function Projects({ section }: { section: SiteSection }) {
  return <section className="content-section muted-section" id={section.slug}><SectionHeader section={section}/><div className="project-grid">{items(section).map((item) => <a className="project-card" href={item.url} key={item.id} target="_blank" rel="noreferrer"><div className="project-top"><span className="code-icon">&lt;/&gt;</span><span>↗</span></div><h3>{item.title}</h3><p>{item.summary}</p><div className="tag-list">{item.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></a>)}</div></section>;
}

function Timeline({ section }: { section: SiteSection }) {
  return <section className="content-section" id={section.slug}><SectionHeader section={section}/><div className="timeline">{items(section).map((item) => <article key={`${item.company}-${item.title}`}><div className="timeline-meta"><strong>{item.period}</strong><span>{item.location}</span></div><div><h3>{item.title}</h3><h4>{item.company}</h4><p>{item.body}</p></div></article>)}</div></section>;
}

function Teaching({ section }: { section: SiteSection }) {
  const topics = strings(section.content.topics);
  return <section className="content-section muted-section" id={section.slug}><SectionHeader section={section}/><div className="teaching-grid"><div><p className="large-copy">{string(section.content.body)}</p><a className="text-link" href={string(section.content.link)} target="_blank" rel="noreferrer">View course repository ↗</a></div><ol className="topic-list">{topics.map((topic, index) => <li key={topic}><span>{String(index + 1).padStart(2, "0")}</span>{topic}</li>)}</ol></div></section>;
}

function Credentials({ section }: { section: SiteSection }) {
  const education = items(section, "education");
  const certifications = strings(section.content.certifications);
  const languages = strings(section.content.languages);
  return <section className="content-section" id={section.slug}><SectionHeader section={section}/><div className="credential-grid"><div><h3>Education</h3>{education.map((item) => <div className="credential-item" key={item.title}><strong>{item.title}</strong><span>{item.company ?? item.institution}</span><small>{item.period}</small></div>)}</div><div><h3>Certifications</h3>{certifications.map((item) => <div className="credential-line" key={item}>✓ {item}</div>)}</div><div><h3>Languages</h3>{languages.map((item) => <div className="credential-line" key={item}>{item}</div>)}</div></div></section>;
}

function Writing({ section, posts }: { section: SiteSection; posts: BlogPost[] }) {
  return <section className="content-section dark-section" id={section.slug}><SectionHeader section={section}/><div className="writing-list">{posts.slice(0, 6).map((post) => <a href={`/blog/${post.slug}`} key={post.id}><div><span>{post.tags.slice(0, 2).join(" · ")}</span><h3>{post.title}</h3><p>{post.excerpt}</p></div><strong>Read →</strong></a>)}</div><a className="button outline-light" href="/blog">View all {posts.length} articles</a></section>;
}

function Services({ section }: { section: SiteSection }) {
  return <section className="content-section services-section" id={section.slug}><SectionHeader section={section}/><p className="service-intro">{string(section.content.intro)}</p><div className="service-list">{items(section).map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div><div className="hero-actions"><a className="button primary" href="/chat">Describe what you need</a><a className="button secondary" href={string(section.content.bookingUrl)} target="_blank" rel="noreferrer">Schedule a conversation ↗</a></div></section>;
}

function Contact({ section }: { section: SiteSection }) {
  const links = Array.isArray(section.content.links) ? section.content.links as Link[] : [];
  return <section className="contact-section" id={section.slug}><span className="section-kicker">CONTACT / NEXT STEP</span><h2>{section.title}</h2><p>{string(section.content.body)}</p><div className="contact-actions"><a className="button primary" href="/chat">Open private chat</a>{links.map((link) => <a href={link.href} key={link.label} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div></section>;
}

function RenderSection({ section, posts }: { section: SiteSection; posts: BlogPost[] }) {
  switch (section.type) {
    case "hero": return <Hero section={section}/>;
    case "cards": return <Capabilities section={section}/>;
    case "projects": return <Projects section={section}/>;
    case "timeline": return <Timeline section={section}/>;
    case "credentials": return <Credentials section={section}/>;
    case "writing": return <Writing section={section} posts={posts}/>;
    case "services": return <Services section={section}/>;
    case "contact": return <Contact section={section}/>;
    default: return section.id === "teaching" ? <Teaching section={section}/> : <About section={section}/>;
  }
}

export function Website() {
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.content(), api.posts()]).then(([content, writing]) => {
      setSections(content.sections); setPosts(writing.posts);
    }).catch((failure: Error) => setError(failure.message));
  }, []);
  return <Layout>{error ? <div className="state-message">{error}</div> : sections.length === 0 ? <div className="state-message">Loading portfolio…</div> : sections.map((section) => <RenderSection section={section} posts={posts} key={section.id}/>)}</Layout>;
}
