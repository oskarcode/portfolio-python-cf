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
  classNumber?: number;
  content?: string;
  project?: string;
};

type Link = { label?: string; href?: string };
type ModuleId = "chat" | "profile" | "expertise" | "work" | "experience" | "teaching" | "writing" | "consulting" | "contact";
type ExpertiseId = "cloud" | "cybersecurity" | "infrastructure" | "networking" | "agentic-ai" | "agent-harness" | "technical-teaching" | "b2b-technical-sales";

type ContentBlock =
  | { type: "chat-guide"; bookingUrl: string }
  | { type: "profile"; achievements: string[]; education: Item[] }
  | { type: "expertise"; areas: ExpertiseArea[] }
  | { type: "projects"; projects: Item[] }
  | { type: "timeline"; roles: Item[] }
  | { type: "teaching"; school: string; audience: string; course: string; body: string; outcomes: string[]; syllabus: Item[]; feedbackSummary: string; feedbackHighlights: string[]; feedbackImprovements: string[]; links: Link[] }
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

type ExpertiseArea = {
  id: ExpertiseId;
  title: string;
  summary: string;
  evidence: string[];
};

const MODULE_ORDER: ModuleId[] = ["chat", "profile", "expertise", "work", "experience", "teaching", "writing", "consulting", "contact"];
const CHAT_STARTERS = [
  "Give me a quick overview of Oskar’s profile.",
  "What are Oskar’s main areas of expertise?",
  "How can Oskar help through consulting?",
  "Recommend a technical article from Oskar’s blog.",
  "Show me Oskar’s most relevant agentic AI projects.",
  "Tell me about Oskar’s graduate cloud computing course.",
  "I want to check availability for a technical sales consultation.",
  "I want to add Oskar and start a persistent conversation.",
];
const chatHref = (prompt: string) => `/chat?prompt=${encodeURIComponent(prompt)}`;
const CHAT_PROMPTS = {
  start: "Help me explore Oskar’s portfolio and find the most relevant place to start.",
  consulting: "I’m interested in consulting with Oskar. Help me understand which service best fits my needs.",
  booking: "I want to check availability and book a consultation.",
  contact: "I want to contact Oskar about working together and start a private conversation.",
};
const string = (value: unknown) => typeof value === "string" ? value : "";
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const items = (section: SiteSection | undefined, key = "items") => section && Array.isArray(section.content[key]) ? section.content[key] as Item[] : [];
const sectionById = (sections: SiteSection[], id: string) => sections.find((section) => section.id === id);
const isModuleId = (value: string): value is ModuleId => MODULE_ORDER.includes(value as ModuleId);

function expertiseAreas(capabilities: Item[]): ExpertiseArea[] {
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
  const expertise = expertiseAreas(capabilities);
  const education = items(credentials, "education").filter((item) => !/bachelor/i.test(item.title ?? ""));
  const certifications = strings(credentials?.content.certifications);
  const links = Array.isArray(contact?.content.links) ? contact.content.links as Link[] : [];

  return {
    chat: {
      id: "chat", file: "chat.ts", path: "src/chat.ts", language: "ts", kicker: "START HERE",
      title: "Start with the portfolio chat",
      summary: "Ask about Oskar’s profile, expertise, projects, teaching, writing, or consulting. Stay anonymous for quick research, or explicitly create a persistent workspace when you want Oskar involved.",
      code: `export const portfolioChat = {
  anonymous: { stored: false, access: ["public portfolio", "published writing"] },
  persistent: { consent: true, participants: ["you", "Oskar", "workspace agent"] },
  tools: "workspace-scoped only",
};`,
      blocks: [{ type: "chat-guide", bookingUrl: string(service?.content.bookingUrl) }],
    },
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
    expertise: {
      id: "expertise", file: "main-expertise.ts", path: "src/main-expertise.ts", language: "ts", kicker: "MAIN EXPERTISE",
      title: "Main expertise",
      summary: "Eight areas where hands-on engineering, customer work, teaching, and technical sales come together.",
      code: `export const mainExpertise: ExpertiseArea[] = [
  cloud,
  cybersecurity,
  infrastructure,
  networking,
  agenticAI,
  agentHarness,
  technicalTeaching,
  b2bTechnicalSales,
];`,
      blocks: [{ type: "expertise", areas: expertise }],
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
      blocks: [{
        type: "teaching",
        school: string(teaching?.content.school),
        audience: string(teaching?.content.audience),
        course: string(teaching?.content.course),
        body: string(teaching?.content.body),
        outcomes: strings(teaching?.content.outcomes),
        syllabus: items(teaching, "syllabus"),
        feedbackSummary: string(teaching?.content.feedbackSummary),
        feedbackHighlights: strings(teaching?.content.feedbackHighlights),
        feedbackImprovements: strings(teaching?.content.feedbackImprovements),
        links: Array.isArray(teaching?.content.links) ? teaching.content.links as Link[] : [],
      }],
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

function ExpertiseBlock({ areas }: { areas: ExpertiseArea[] }) {
  return <div className="cp-expertise-grid">{areas.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.summary}</p><small>{item.evidence.join(" · ")}</small></article>)}</div>;
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "chat-guide": return <div className="cp-chat-guide"><section className="cp-chat-can"><span>WHAT IT CAN DO</span><h2>A guide to the public portfolio</h2><div><article><strong>Find the right context</strong><p>Ask about Oskar’s profile, main expertise, professional experience, projects, teaching, consulting, or published articles.</p></article><article><strong>Compare and recommend</strong><p>Describe what you need and the agent can connect it to relevant experience, work, writing, or a practical next step.</p></article><article><strong>Bring Oskar in</strong><p>When you explicitly choose Add Oskar, the chat asks for consent and creates a private, persistent collaboration workspace.</p></article></div></section><section className="cp-chat-modes"><span>CHOOSE A MODE</span><h2>Anonymous first. Persistent only by choice.</h2><div><article><header><b>01</b><strong>Anonymous chat</strong><small>Default</small></header><p>Use it immediately without an account. The model receives the published portfolio and article catalog as context.</p><ul><li>Conversation stays in this browser page</li><li>Nothing is saved as a visitor workspace</li><li>It disappears when you refresh or leave</li><li>It cannot message Oskar directly</li><li>No private data, arbitrary commands, or ambient tools</li></ul></article><article><header><b>02</b><strong>Persistent workspace</strong><small>Explicit consent</small></header><p>Choose Add Oskar, provide your contact details and intent, and consent to import the current transcript.</p><ul><li>Transcript is stored in a Pi Durable workspace</li><li>Return through the private, opaque workspace URL</li><li>Choose Message Oskar for direct human delivery</li><li>Choose Ask the agent for an immediate model response</li><li>Tools and skills work only when Oskar attaches them to this workspace</li></ul></article></div></section>{block.bookingUrl && <section className="cp-chat-calendar"><span>BOOK THROUGH CHAT</span><div><div><h2>Check live consulting availability</h2><p>Ask the chat for Oskar’s available times, choose one by number, and complete the booking conversationally.</p><small>Your confirmation appears immediately in chat and arrives by email, with a calendar download and 24-hour reminder. Cloudflare Email Service also notifies Oskar.</small></div><a href={chatHref(CHAT_PROMPTS.booking)}>Check availability in chat →</a></div></section>}<section className="cp-chat-steps"><span>QUICK START</span><h2>Four steps</h2><ol><li><b>1</b><div><strong>Open the chat</strong><p>No sign-in is required for anonymous questions.</p></div></li><li><b>2</b><div><strong>Pick a starter or write your own question</strong><p>Share enough context for a useful, grounded answer.</p></div></li><li><b>3</b><div><strong>Stay anonymous or add Oskar</strong><p>Persistence begins only after you choose it and provide consent.</p></div></li><li><b>4</b><div><strong>Keep the private link</strong><p>In a workspace, select Oskar or the agent before each message. Anyone with the link can access the conversation, so treat it as private.</p></div></li></ol></section><section className="cp-chat-starters"><span>TRY A STARTER</span><h2>Choose what you want to learn</h2><div>{CHAT_STARTERS.map((prompt) => <a href={`/chat?prompt=${encodeURIComponent(prompt)}`} key={prompt}><span>{prompt}</span><b>→</b></a>)}</div></section><div className="cp-chat-actions"><a href={chatHref(CHAT_PROMPTS.start)}>Explore through chat</a>{block.bookingUrl && <a className="calendar" href={chatHref(CHAT_PROMPTS.booking)}>Book through chat</a>}<small>No account · clears on refresh · persistence requires consent</small></div></div>;
    case "profile": return <div className="cp-profile"><section><h2>Professional achievements</h2>{block.achievements.map((item) => <p key={item}>✓ {item}</p>)}</section><section><h2>Education</h2>{block.education.map((item) => <div key={item.title}><strong>{item.title}</strong><span>{item.company ?? item.institution}</span><small>{item.period}</small></div>)}</section></div>;
    case "expertise": return <ExpertiseBlock areas={block.areas}/>;
    case "projects": return <div className="cp-projects">{block.projects.map((project, index) => <a href={project.url} target="_blank" rel="noreferrer" key={project.id ?? project.title}><header><span>{String(index + 1).padStart(2, "0")}</span><b>↗</b></header><h2>{project.title}</h2><p>{project.summary}</p><div>{project.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></a>)}</div>;
    case "timeline": return <div className="cp-timeline">{block.roles.map((role) => <article key={`${role.company}-${role.title}`}><time>{role.period}</time><div><h2>{role.title}</h2><strong>{role.company}</strong><small>{role.location}</small><p>{role.body}</p></div></article>)}</div>;
    case "teaching": return <div className="cp-teaching"><div className="cp-teaching-context"><article><span>WHERE</span><strong>{block.school}</strong><small>{block.course}</small></article><article><span>WHO</span><strong>{block.audience}</strong><small>Graduate cloud computing</small></article></div><p className="cp-teaching-overview">{block.body}</p><section><span>LEARNING OUTCOMES</span><h2>What students leave able to do</h2><div className="cp-outcomes">{block.outcomes.map((outcome) => <p key={outcome}>✓ {outcome}</p>)}</div></section><section><span>COURSE SYLLABUS</span><h2>Concepts paired with implementation</h2><div className="cp-syllabus">{block.syllabus.map((lesson) => <article key={lesson.classNumber ?? lesson.title}><b>{String(lesson.classNumber ?? "").padStart(2, "0")}</b><div><h3>{lesson.title}</h3><p>{lesson.content}</p><small>{lesson.project && lesson.project !== "N/A" ? `Project: ${lesson.project}` : "Concept session"}</small></div></article>)}</div></section><section><span>STUDENT FEEDBACK</span><h2>What students reported</h2><p className="cp-feedback-summary">{block.feedbackSummary}</p><div className="cp-feedback-grid"><article><strong>Highlights</strong>{block.feedbackHighlights.map((item) => <p key={item}>✓ {item}</p>)}</article><article><strong>Opportunities to improve</strong>{block.feedbackImprovements.map((item) => <p key={item}>→ {item}</p>)}</article></div></section><div className="cp-teaching-links">{block.links.map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label} ↗</a>)}</div></div>;
    case "writing": return <div className="cp-writing">{block.posts.map((post, index) => <a href={`/blog/${post.slug}`} key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{post.tags.slice(0, 2).join(" · ")}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><b>Read →</b></a>)}</div>;
    case "consulting": return <div className="cp-consulting"><p className="cp-consulting-intro">{block.intro}</p><section><span>SERVICES</span><h2>Ways I can help</h2><div className="cp-consulting-grid">{block.services.map((service) => <article key={service.title}><h3>{service.title}</h3><p>{service.body}</p></article>)}</div></section><section><span>PRICING + PACKAGES</span><h2>Choose the right engagement</h2><div className="cp-consulting-packages">{block.packages.map((item) => <article key={item.title}><h3>{item.title}</h3><strong>{item.summary}</strong><p>{item.body}</p>{item.tags?.map((tag) => <small key={tag}>✓ {tag}</small>)}</article>)}</div>{block.payments.length > 0 && <p className="cp-payments"><strong>Payment options</strong>{block.payments.join(" · ")}</p>}</section><section><span>WHY WORK WITH ME</span><h2>Experience across roles, regions, and classrooms</h2><div className="cp-consulting-reasons">{block.reasons.map((reason) => <article key={reason.title}><h3>{reason.title}</h3><p>{reason.body}</p></article>)}</div></section><a className="cp-consulting-cta" href={chatHref(CHAT_PROMPTS.consulting)}>Discuss consulting in chat →</a></div>;
    case "contact": return <div className="cp-contact"><a href={chatHref(CHAT_PROMPTS.contact)}>Start a private conversation</a>{block.bookingUrl && <a className="secondary" href={chatHref(CHAT_PROMPTS.booking)}>Check availability in chat</a>}{block.links.map((link) => <a className="text" href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label} ↗</a>)}</div>;
  }
}

function ModuleDocument({ module }: { module: PortfolioModule }) {
  return <article className="cp-document"><span className="cp-kicker">{module.kicker}</span><h1>{module.title}</h1><p className="cp-lead">{module.summary}</p>{module.id === "chat" && <div className="cp-chat-launch"><a href={chatHref(CHAT_PROMPTS.start)}><span aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19"><path d="M5 5h14v10H9l-4 4V5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg></span><div><strong>Start portfolio chat</strong><small>Anonymous by default · clears on refresh</small></div><b>→</b></a><p>Ask about Oskar’s work, check consultation availability, or book a meeting conversationally.</p></div>}<CodeBlock code={module.code}/>{module.blocks.map((block, index) => <BlockRenderer block={block} key={`${block.type}-${index}`}/>)}</article>;
}

function CommandPalette({ modules, onClose, onOpen }: { modules: Record<ModuleId, PortfolioModule>; onClose: () => void; onOpen: (id: ModuleId) => void }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const results = MODULE_ORDER.filter((id) => `${modules[id].file} ${modules[id].title} ${modules[id].summary}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="cp-palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="cp-palette" role="dialog" aria-modal="true" aria-label="Open portfolio file"><header><span>⌕</span><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expertise, projects, or experience…"/><kbd>ESC</kbd></header><div>{results.map((id) => <button type="button" onClick={() => onOpen(id)} key={id}><FileIcon/><span><strong>{modules[id].file}</strong><small>{modules[id].title}</small></span><b>↵</b></button>)}</div></div></div>;
}

/** Loads public content and operates the portfolio as one Cloudflare Worker project. */
export function Website() {
  const initial = window.location.hash.slice(1);
  const initialModule = initial === "focus" ? "expertise" : initial;
  const [activeId, setActiveId] = useState<ModuleId>(isModuleId(initialModule) ? initialModule : "chat");
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
    const sync = () => { const hash = window.location.hash.slice(1); const value = hash === "focus" ? "expertise" : hash; if (isModuleId(value)) setActiveId(value); };
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
