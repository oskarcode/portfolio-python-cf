// Application ownership: Scalable Cloudflare Worker-style portfolio with one canonical module per topic.
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { BlogPost, SiteSection } from "../../shared/types";
import { Layout } from "../components/Layout";

type Item = {
  id?: string;
  title?: string;
  company?: string;
  institution?: string;
  period?: string;
  location?: string;
  body?: string;
  summary?: string;
  tags?: string[];
  url?: string;
};

type Link = { label?: string; href?: string };
type ModuleId = "profile" | "focus" | "work" | "experience" | "teaching" | "writing" | "consulting" | "contact";
type FocusId = "cloud" | "cybersecurity" | "infrastructure" | "networking" | "agentic-ai" | "agent-harness" | "technical-teaching" | "b2b-technical-sales";

type ContentBlock =
  | { type: "profile"; achievements: string[]; education: Item[] }
  | { type: "focus"; areas: FocusArea[] }
  | { type: "projects"; projects: Item[] }
  | { type: "timeline"; roles: Item[] }
  | { type: "teaching"; body: string; topics: string[]; link: string }
  | { type: "writing"; posts: BlogPost[] }
  | { type: "consulting"; intro: string; services: Item[]; packages: Item[]; payments: string[]; reasons: Item[]; bookingUrl: string }
  | { type: "contact"; links: Link[]; bookingUrl: string };

type PortfolioModule = {
  id: ModuleId;
  file: string;
  path: string;
  language: "ts";
  kicker: string;
  title: string;
  summary: string;
  code: string;
  blocks: ContentBlock[];
};

type FocusArea = {
  id: FocusId;
  title: string;
  summary: string;
  evidence: string[];
};

const MODULE_ORDER: ModuleId[] = ["profile", "focus", "work", "experience", "teaching", "writing", "consulting", "contact"];
const string = (value: unknown) => typeof value === "string" ? value : "";
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const items = (section: SiteSection | undefined, key = "items") => section && Array.isArray(section.content[key]) ? section.content[key] as Item[] : [];
const sectionById = (sections: SiteSection[], id: string) => sections.find((section) => section.id === id);
const isModuleId = (value: string): value is ModuleId => MODULE_ORDER.includes(value as ModuleId);

function focusAreas(capabilities: Item[]): FocusArea[] {
  const capability = (id: string) => capabilities.find((item) => item.id === id);
  return [
    { id: "cloud", title: "Cloud platforms", summary: capability("cloudflare")?.body ?? "I build full-stack, serverless agentic workflows on Cloudflare using open-source harnesses and the Workers developer platform.", evidence: capability("cloudflare")?.tags ?? ["Workers", "Durable Objects", "D1", "R2", "Workers AI", "AI Gateway"] },
    { id: "cybersecurity", title: "Cybersecurity", summary: capability("security")?.body ?? "I identify common application and API threats, then design layered mitigations with Cloudflare application security services.", evidence: capability("security")?.tags ?? ["DDoS", "SQL injection", "RCE", "API abuse", "Bot scraping"] },
    { id: "infrastructure", title: "Infrastructure", summary: capability("infrastructure")?.body ?? "I build full-stack applications on AWS and design Well-Architected foundations across compute, storage, and networking services.", evidence: capability("infrastructure")?.tags ?? ["AWS", "Compute", "Storage", "Networking", "Well-Architected"] },
    { id: "networking", title: "Networking", summary: capability("networking")?.body ?? "I troubleshoot DNS and TCP/IP issues, protect Layer 3 traffic, and design corporate networks that connect, secure, and scale.", evidence: capability("networking")?.tags ?? ["DNS", "TCP/IP", "Layer 3", "Network architecture"] },
    { id: "agentic-ai", title: "Agentic AI", summary: capability("agents")?.body ?? "I integrate model APIs and tune model parameters to improve quality, reliability, cost, and latency for agentic applications.", evidence: capability("agents")?.tags ?? ["Model APIs", "Inference parameters", "Workers AI", "AI Gateway"] },
    { id: "agent-harness", title: "Agent harness", summary: capability("agent-harness")?.body ?? "I work with LangChain, Pi, and OpenCode; explain the components around a model; and build basic harnesses with an agent loop, tools, memory, and guardrails.", evidence: capability("agent-harness")?.tags ?? ["LangChain", "Pi", "OpenCode", "Agent loops", "Tools", "Memory"] },
    { id: "technical-teaching", title: "Technical teaching", summary: capability("technical-teaching")?.body ?? "I built a full-stack teaching platform where students can use AI safely to learn, review, and extend their knowledge, supported by practical technical curriculum design.", evidence: capability("technical-teaching")?.tags ?? ["Teaching platform", "AI-assisted learning", "Curriculum design", "Cloud labs"] },
    { id: "b2b-technical-sales", title: "B2B technical sales", summary: capability("b2b-technical-sales")?.body ?? "Technical discovery, value translation, demonstrations, and enterprise sales strategy across global markets.", evidence: capability("b2b-technical-sales")?.tags ?? ["Discovery", "Solutions engineering", "Enterprise sales"] },
  ];
}

function buildModules(sections: SiteSection[], posts: BlogPost[]): Record<ModuleId, PortfolioModule> {
  const about = sectionById(sections, "about");
  const capabilities = items(sectionById(sections, "capabilities"));
  const projects = items(sectionById(sections, "projects"));
  const roles = items(sectionById(sections, "experience"));
  const teaching = sectionById(sections, "teaching");
  const credentials = sectionById(sections, "credentials");
  const service = sectionById(sections, "work");
  const consulting = sectionById(sections, "consulting");
  const contact = sectionById(sections, "contact");
  const focus = focusAreas(capabilities);
  const education = items(credentials, "education").filter((item) => !/bachelor/i.test(item.title ?? ""));
  const certifications = strings(credentials?.content.certifications);
  const links = Array.isArray(contact?.content.links) ? contact.content.links as Link[] : [];

  return {
    profile: {
      id: "profile", file: "profile.ts", path: "src/profile.ts", language: "ts", kicker: "CANONICAL PROFILE",
      title: "Senior Customer Engineer at Cloudflare",
      summary: "I hold a Master of Engineering in Cloud Computing and specialize in cloud security, agentic AI, cybersecurity, infrastructure, and networking—connecting technical expertise with business transformation.",
      code: `export const oskar: CustomerEngineer = {
  company: "Cloudflare",
  regions: ["APAC", "EMEA", "North America"],
  experience: ["AWS", "Alibaba Cloud", "Tencent Cloud", "Cloudflare"],
  recognition: ["top 10% performer", "AI Wizard"],
};`,
      blocks: [{ type: "profile", achievements: ["Top-10% enterprise performer", "$1M+ quota achievement", "Cloudflare-recognized AI Wizard", "Experience across APAC, EMEA, and North America", ...certifications.slice(0, 3)], education }],
    },
    focus: {
      id: "focus", file: "focus.ts", path: "src/focus.ts", language: "ts", kicker: "TECHNICAL FOCUS",
      title: "Main expertise",
      summary: "Eight areas where hands-on engineering, customer work, teaching, and technical sales come together.",
      code: `export const focus: FocusArea[] = [
  cloud,
  cybersecurity,
  infrastructure,
  networking,
  agenticAI,
  agentHarness,
  technicalTeaching,
  b2bTechnicalSales,
];`,
      blocks: [{ type: "focus", areas: focus }],
    },
    work: {
      id: "work", file: "selected-work.ts", path: "src/selected-work.ts", language: "ts", kicker: "WORKING EVIDENCE",
      title: "Selected technical work",
      summary: "Projects are presented as evidence: the problem, system, and demonstrated outcome—not another repetition of the professional summary.",
      code: `export const selectedWork = projects.filter(
  ({ outcome }) => outcome.isDemonstrated
);`,
      blocks: [{ type: "projects", projects }],
    },
    experience: {
      id: "experience", file: "experience.ts", path: "src/experience.ts", language: "ts", kicker: "EXECUTION HISTORY",
      title: "Professional experience",
      summary: "Professional history stays here. Recognition remains in profile.ts, and teaching remains in teaching.ts, so each file answers one question.",
      code: `export const experience: Experience[] = [
  cloudflare,
  tencentCloud,
  alibabaCloud,
  aws,
];`,
      blocks: [{ type: "timeline", roles }],
    },
    teaching: {
      id: "teaching", file: "teaching.ts", path: "src/teaching.ts", language: "ts", kicker: "TEACHING + MENTORSHIP",
      title: "Teaching and mentorship",
      summary: "University teaching and career mentorship share one purpose: helping people build the technical confidence to make their next move.",
      code: `export function mentor(goal: CareerGoal): NextStep {
  return goal
    .buildTechnicalConfidence()
    .translateExperience()
    .developTechSalesSkills()
    .moveIntoTechnology();
}`,
      blocks: [{ type: "teaching", body: string(teaching?.content.body), topics: strings(teaching?.content.topics), link: string(teaching?.content.link) }],
    },
    writing: {
      id: "writing", file: "writing.ts", path: "src/writing.ts", language: "ts", kicker: "TECHNICAL EXPLANATIONS",
      title: "Technical writing",
      summary: "Practical explanations across cloud, security, architecture, AI, and solutions engineering.",
      code: `export const articles = await getWriting({
  topics: ["cloud", "security", "AI", "architecture"],
  limit: 6,
});`,
      blocks: [{ type: "writing", posts: posts.slice(0, 6) }],
    },
    consulting: {
      id: "consulting", file: "consulting.ts", path: "src/consulting.ts", language: "ts", kicker: "CONSULTING SERVICES",
      title: consulting?.title ?? "Consulting for technical careers and global growth",
      summary: consulting?.summary ?? "Practical guidance for technical careers, solutions engineering, B2B sales, technical education, and international expansion.",
      code: `export const consulting = {
  experience: "9+ years",
  markets: ["APAC", "EMEA", "North America"],
  services: [careerDevelopment, solutionsEngineering, globalExpansion, training],
};`,
      blocks: [{
        type: "consulting",
        intro: string(consulting?.content.intro),
        services: items(consulting, "services"),
        packages: items(consulting, "packages"),
        payments: strings(consulting?.content.payments),
        reasons: items(consulting, "reasons"),
        bookingUrl: string(consulting?.content.bookingUrl) || string(service?.content.bookingUrl),
      }],
    },
    contact: {
      id: "contact", file: "contact.ts", path: "src/contact.ts", language: "ts", kicker: "NEXT STEP",
      title: contact?.title ?? "Let’s start with what you need.",
      summary: string(contact?.content.body) || "Bring a system, requirement, or technical idea. We can make the next decision clear.",
      code: `export async function nextStep() {
  const context = await understandYourNeed();
  return startPrivateConversation(context);
}`,
      blocks: [{ type: "contact", links, bookingUrl: string(service?.content.bookingUrl) }],
    },
  };
}

/** Line-numbered code preview keeps code structural rather than duplicating prose. */
function CodeBlock({ code }: { code: string }) {
  return <div className="cp-code" aria-label="Code example">{code.trim().split("\n").map((line, index) => <div key={`${index}-${line}`}><span>{String(index + 1).padStart(2, "0")}</span><code>{line || " "}</code></div>)}</div>;
}

function FileIcon() {
  return <span className="cp-file-icon ts">TS</span>;
}

/** A single src tree keeps every portfolio section visible and purposeful. */
function Explorer({ modules, active, srcOpen, onToggle, onOpen }: { modules: Record<ModuleId, PortfolioModule>; active: ModuleId; srcOpen: boolean; onToggle: () => void; onOpen: (id: ModuleId) => void }) {
  const file = (id: ModuleId) => <button type="button" className={active === id ? "active" : ""} onClick={() => onOpen(id)} aria-current={active === id ? "page" : undefined} key={id}><FileIcon/><span>{modules[id].file}</span></button>;
  return <div className="cp-tree"><button type="button" className="cp-folder cp-src-root" onClick={onToggle} aria-expanded={srcOpen}><span>{srcOpen ? "⌄" : "›"}</span><strong>src</strong><small>{MODULE_ORDER.length}</small></button>{srcOpen && <div className="cp-src">{MODULE_ORDER.map(file)}</div>}</div>;
}

function FocusBlock({ areas }: { areas: FocusArea[] }) {
  return <div className="cp-focus-grid">{areas.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.summary}</p><small>{item.evidence.join(" · ")}</small></article>)}</div>;
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "profile": return <div className="cp-profile"><section><h2>Professional achievements</h2>{block.achievements.map((item) => <p key={item}>✓ {item}</p>)}</section><section><h2>Education</h2>{block.education.map((item) => <div key={item.title}><strong>{item.title}</strong><span>{item.company ?? item.institution}</span><small>{item.period}</small></div>)}</section></div>;
    case "focus": return <FocusBlock areas={block.areas}/>;
    case "projects": return <div className="cp-projects">{block.projects.map((project, index) => <a href={project.url} target="_blank" rel="noreferrer" key={project.id ?? project.title}><header><span>{String(index + 1).padStart(2, "0")}</span><b>↗</b></header><h2>{project.title}</h2><p>{project.summary}</p><div>{project.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></a>)}</div>;
    case "timeline": return <div className="cp-timeline">{block.roles.map((role) => <article key={`${role.company}-${role.title}`}><time>{role.period}</time><div><h2>{role.title}</h2><strong>{role.company}</strong><small>{role.location}</small><p>{role.body}</p></div></article>)}</div>;
    case "teaching": return <div className="cp-teaching"><p>{block.body}</p><div>{block.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>{block.link && <a href={block.link} target="_blank" rel="noreferrer">View teaching repository ↗</a>}</div>;
    case "writing": return <div className="cp-writing">{block.posts.map((post, index) => <a href={`/blog/${post.slug}`} key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{post.tags.slice(0, 2).join(" · ")}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><b>Read →</b></a>)}</div>;
    case "consulting": return <div className="cp-consulting"><p className="cp-consulting-intro">{block.intro}</p><section><span>SERVICES</span><h2>Ways I can help</h2><div className="cp-consulting-grid">{block.services.map((service) => <article key={service.title}><h3>{service.title}</h3><p>{service.body}</p></article>)}</div></section><section><span>PRICING + PACKAGES</span><h2>Choose the right engagement</h2><div className="cp-consulting-packages">{block.packages.map((item) => <article key={item.title}><h3>{item.title}</h3><strong>{item.summary}</strong><p>{item.body}</p>{item.tags?.map((tag) => <small key={tag}>✓ {tag}</small>)}</article>)}</div>{block.payments.length > 0 && <p className="cp-payments"><strong>Payment options</strong>{block.payments.join(" · ")}</p>}</section><section><span>WHY WORK WITH ME</span><h2>Experience across roles, regions, and classrooms</h2><div className="cp-consulting-reasons">{block.reasons.map((reason) => <article key={reason.title}><h3>{reason.title}</h3><p>{reason.body}</p></article>)}</div></section>{block.bookingUrl && <a className="cp-consulting-cta" href={block.bookingUrl} target="_blank" rel="noreferrer">Book a consultation ↗</a>}</div>;
    case "contact": return <div className="cp-contact"><a href="/chat">Start a private conversation</a>{block.bookingUrl && <a className="secondary" href={block.bookingUrl} target="_blank" rel="noreferrer">Schedule a conversation</a>}{block.links.map((link) => <a className="text" href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label} ↗</a>)}</div>;
  }
}

function ModuleDocument({ module }: { module: PortfolioModule }) {
  return <article className="cp-document"><span className="cp-kicker">{module.kicker}</span><h1>{module.title}</h1><p className="cp-lead">{module.summary}</p><CodeBlock code={module.code}/>{module.blocks.map((block, index) => <BlockRenderer block={block} key={`${block.type}-${index}`}/>)}</article>;
}

function CommandPalette({ modules, onClose, onOpen }: { modules: Record<ModuleId, PortfolioModule>; onClose: () => void; onOpen: (id: ModuleId) => void }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const results = MODULE_ORDER.filter((id) => `${modules[id].file} ${modules[id].title} ${modules[id].summary}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="cp-palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="cp-palette" role="dialog" aria-modal="true" aria-label="Open portfolio file"><header><span>⌕</span><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files, focus areas, or experience…"/><kbd>ESC</kbd></header><div>{results.map((id) => <button type="button" onClick={() => onOpen(id)} key={id}><FileIcon/><span><strong>{modules[id].file}</strong><small>{modules[id].title}</small></span><b>↵</b></button>)}</div></div></div>;
}

/** Loads public content and operates the portfolio as one Cloudflare Worker project. */
export function Website() {
  const initial = window.location.hash.slice(1);
  const [activeId, setActiveId] = useState<ModuleId>(isModuleId(initial) ? initial : "profile");
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [srcOpen, setSrcOpen] = useState(true);
  const [mobileExplorer, setMobileExplorer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.content(), api.posts()]).then(([content, writing]) => { setSections(content.sections); setPosts(writing.posts); }).catch((failure: Error) => setError(failure.message));
  }, []);

  useEffect(() => {
    const sync = () => { const value = window.location.hash.slice(1); if (isModuleId(value)) setActiveId(value); };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync); window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); window.removeEventListener("keydown", keyboard); };
  }, []);

  const modules = useMemo(() => buildModules(sections, posts), [sections, posts]);
  const active = modules[activeId];
  const openModule = (id: ModuleId) => { setActiveId(id); setMobileExplorer(false); setPaletteOpen(false); window.history.pushState(null, "", `#${id}`); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (error) return <Layout><div className="state-message">{error}</div></Layout>;
  if (sections.length === 0) return <Layout><div className="state-message">Loading portfolio worker…</div></Layout>;

  return <Layout><div className="control-plane">
    <div className="cp-deploybar"><div><span className="cp-cf-mark">CF</span><strong>portfolio-worker</strong><small>production</small></div><div><span><i/> DEPLOYED</span><span>D1 ●</span><span>AI ●</span><span>DO ●</span></div><button type="button" onClick={() => setPaletteOpen(true)}>⌘K Search</button></div>
    <button type="button" className="cp-mobile-explorer" onClick={() => setMobileExplorer((open) => !open)} aria-expanded={mobileExplorer}>☰ Explorer</button>
    <aside className={`cp-explorer ${mobileExplorer ? "open" : ""}`}><header><strong>FILES</strong><span>src/</span></header><Explorer modules={modules} active={activeId} srcOpen={srcOpen} onToggle={() => setSrcOpen((open) => !open)} onOpen={openModule}/><footer><span>main*</span><span>● online</span></footer></aside>
    <main className="cp-editor"><div className="cp-tab"><FileIcon/><span>{active.file}</span><b>×</b></div><div className="cp-breadcrumb">{active.path.split("/").map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <b>›</b>}</span>)}</div><div className="cp-scroll"><ModuleDocument module={active}/></div><div className="cp-statusbar"><span>main*</span><span>portfolio-chat</span><span>TypeScript</span><span>Cloudflare Workers</span></div></main>
  </div>{paletteOpen && <CommandPalette modules={modules} onClose={() => setPaletteOpen(false)} onOpen={openModule}/>}</Layout>;
}
