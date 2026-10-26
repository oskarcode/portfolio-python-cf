import { useEffect, useState } from "react";
import { api } from "../api";
import type { SiteSection } from "../../shared/types";
import { Layout } from "../components/Layout";

type Item = { id?: string; title?: string; body?: string; summary?: string; tags?: string[]; url?: string };
type Link = { label?: string; href?: string };
const string = (value: unknown) => typeof value === "string" ? value : "";
const items = (section: SiteSection) => Array.isArray(section.content.items) ? section.content.items as Item[] : [];

function Hero({ section }: { section: SiteSection }) {
  return <section className="hero" id="home"><div className="hero-copy"><span className="eyebrow">{string(section.content.eyebrow)}</span><h1>{string(section.content.headline)}</h1><p>{string(section.content.body)}</p><div className="hero-actions"><a className="button primary" href="#projects">Explore my work</a><a className="button secondary" href="/chat">Start a conversation</a></div></div><div className="hero-aside"><div className="availability"><span className="status-dot"/>Available for thoughtful conversations</div><blockquote>“The best technical solution is the one people can understand, trust, and use.”</blockquote><div className="coordinates">NEW YORK · GLOBAL PERSPECTIVE</div></div></section>;
}

function RichText({ section }: { section: SiteSection }) {
  const highlights = Array.isArray(section.content.highlights) ? section.content.highlights as string[] : [];
  return <section className="split-section" id={section.slug}><div><span className="section-number">{String(section.sortOrder / 10).padStart(2, "0")}</span><h2>{section.title}</h2></div><div className="section-body"><p className="lead">{string(section.content.body)}</p>{highlights.length > 0 && <ul className="fact-list">{highlights.map((value) => <li key={value}>{value}</li>)}</ul>}{string(section.content.link) && <a className="text-link" href={string(section.content.link)}>View course materials ↗</a>}</div></section>;
}

function Cards({ section }: { section: SiteSection }) {
  return <section className="stack-section" id={section.slug}><div className="section-heading"><span className="section-number">{String(section.sortOrder / 10).padStart(2, "0")}</span><h2>{section.title}</h2><p>{section.summary}</p></div><div className="card-grid">{items(section).map((item, index) => <article className="capability-card" key={item.id ?? item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>;
}

function Projects({ section }: { section: SiteSection }) {
  return <section className="stack-section projects-section" id={section.slug}><div className="section-heading"><span className="section-number">{String(section.sortOrder / 10).padStart(2, "0")}</span><h2>{section.title}</h2><p>{section.summary}</p></div><div className="project-list">{items(section).map((item) => <a className="project-row" href={item.url} key={item.id} target="_blank" rel="noreferrer"><div><h3>{item.title}</h3><p>{item.summary}</p></div><div className="tag-list">{item.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div><span className="arrow">↗</span></a>)}</div></section>;
}

function Services({ section }: { section: SiteSection }) {
  return <section className="work-section" id={section.slug}><div className="section-heading light"><span className="section-number">{String(section.sortOrder / 10).padStart(2, "0")}</span><h2>{section.title}</h2><p>{string(section.content.intro)}</p></div><div className="services-grid">{items(section).map((item) => <div key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div><div className="work-actions"><a className="button pale" href="/chat">Tell me what you need</a><a className="button ghost" href={string(section.content.bookingUrl)} target="_blank" rel="noreferrer">Book a conversation ↗</a></div></section>;
}

function Contact({ section }: { section: SiteSection }) {
  const links = Array.isArray(section.content.links) ? section.content.links as Link[] : [];
  return <section className="contact-section" id={section.slug}><span className="eyebrow">START A CONVERSATION</span><h2>{section.title}</h2><p>{string(section.content.body)}</p><a className="big-chat-link" href="/chat">Ask my portfolio <span>→</span></a><div className="social-row">{links.map((link) => <a href={link.href} key={link.label}>{link.label} ↗</a>)}</div></section>;
}

function RenderSection({ section }: { section: SiteSection }) {
  if (section.type === "hero") return <Hero section={section}/>;
  if (section.type === "cards") return <Cards section={section}/>;
  if (section.type === "projects") return <Projects section={section}/>;
  if (section.type === "services") return <Services section={section}/>;
  if (section.type === "contact") return <Contact section={section}/>;
  return <RichText section={section}/>;
}

export function Website() {
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api.content().then((data) => setSections(data.sections)).catch((e: Error) => setError(e.message)); }, []);
  return <Layout>{error ? <div className="state-message">{error}</div> : sections.length === 0 ? <div className="state-message">Loading portfolio…</div> : sections.map((section) => <RenderSection section={section} key={section.id}/>)}</Layout>;
}
