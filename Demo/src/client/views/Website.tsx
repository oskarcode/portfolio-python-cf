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
type ModuleId = "profile" | "focus" | "bridge" | "work" | "experience" | "teaching" | "writing" | "contact";
type FocusId = "cloud" | "cybersecurity" | "infrastructure" | "networking" | "agentic-ai" | "agent-harness";

type InspectorData = {
  status: string;
  type: string;
  domains?: string[];
  bindings?: string[];
  regions?: string[];
  evidence?: string[];
  related?: ModuleId[];
};

type ContentBlock =
  | { type: "profile"; achievements: string[]; education: Item[] }
  | { type: "focus" }
  | { type: "bridge"; services: Item[] }
  | { type: "projects"; projects: Item[] }
  | { type: "timeline"; roles: Item[] }
  | { type: "teaching"; body: string; topics: string[]; link: string }
  | { type: "writing"; posts: BlogPost[] }
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
  inspector: InspectorData;
};

type FocusArea = {
  id: FocusId;
  title: string;
  summary: string;
  bridge: string;
  evidence: string[];
  bindings: string[];
};

const MODULE_ORDER: ModuleId[] = ["profile", "focus", "bridge", "work", "experience", "teaching", "writing", "contact"];
const string = (value: unknown) => typeof value === "string" ? value : "";
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const items = (section: SiteSection | undefined, key = "items") => section && Array.isArray(section.content[key]) ? section.content[key] as Item[] : [];
const sectionById = (sections: SiteSection[], id: string) => sections.find((section) => section.id === id);
const isModuleId = (value: string): value is ModuleId => MODULE_ORDER.includes(value as ModuleId);

function focusAreas(capabilities: Item[]): FocusArea[] {
  const capability = (id: string) => capabilities.find((item) => item.id === id);
  return [
    { id: "cloud", title: "Cloud platforms", summary: capability("cloudflare")?.body ?? "Cloud architecture designed for teams to operate and evolve.", bridge: "strategy → architecture → operations", evidence: capability("cloudflare")?.tags ?? ["Workers", "D1", "R2"], bindings: ["Workers", "D1", "Durable Objects"] },
    { id: "cybersecurity", title: "Cybersecurity", summary: capability("security")?.body ?? "Security designed into architecture rather than added after delivery.", bridge: "risk → controls → usable security", evidence: capability("security")?.tags ?? ["Zero Trust", "WAF"], bindings: ["Access", "WAF", "Zero Trust"] },
    { id: "infrastructure", title: "Infrastructure", summary: "Reliable application, data, and platform foundations that connect technical requirements to operations.", bridge: "requirements → systems → reliability", evidence: ["Distributed systems", "Serverless", "Data services"], bindings: ["Workers", "AWS", "D1"] },
    { id: "networking", title: "Networking", summary: "Connectivity, traffic paths, performance, and security controls explained as one system.", bridge: "users → network → applications", evidence: ["Connectivity", "Performance", "Network security"], bindings: ["Cloudflare Network", "Zero Trust"] },
    { id: "agentic-ai", title: "Agentic AI", summary: capability("agents")?.body ?? "Durable agents that reason, use approved tools, and collaborate with people.", bridge: "models → tools → durable workflows", evidence: capability("agents")?.tags ?? ["Agents", "MCP"], bindings: ["Workers AI", "AI Gateway", "Durable Objects"] },
    { id: "agent-harness", title: "Agent harness", summary: "The runtime around the model: tools, memory, policy, evaluation, observability, human approval, and recovery.", bridge: "model → harness → governed outcome", evidence: ["Tools", "Memory", "Guardrails", "Evaluation", "Recovery"], bindings: ["Pi Durable", "AI Gateway", "Cloudflare Computer"] },
  ];
}

function buildModules(sections: SiteSection[], posts: BlogPost[], activeFocus: FocusId): Record<ModuleId, PortfolioModule> {
  const about = sectionById(sections, "about");
  const capabilities = items(sectionById(sections, "capabilities"));
  const projects = items(sectionById(sections, "projects"));
  const roles = items(sectionById(sections, "experience"));
  const teaching = sectionById(sections, "teaching");
  const credentials = sectionById(sections, "credentials");
  const service = sectionById(sections, "work");
  const contact = sectionById(sections, "contact");
  const focus = focusAreas(capabilities);
  const selectedFocus = focus.find((area) => area.id === activeFocus) ?? focus[0];
  const education = items(credentials, "education");
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
      inspector: { status: "current", type: "CustomerEngineer", domains: ["Cloud security", "Agentic AI", "Infrastructure", "Networking"], regions: ["APAC", "EMEA", "North America"], evidence: ["AWS", "Alibaba Cloud", "Tencent Cloud", "Cloudflare"], related: ["experience", "teaching"] },
    },
    focus: {
      id: "focus", file: "focus.ts", path: "src/focus.ts", language: "ts", kicker: "TECHNICAL FOCUS",
      title: "Technical focus",
      summary: "Select a focus area to see its unique responsibility. The shared inspector shows related technologies without repeating tags throughout the page.",
      code: `export const focus: FocusArea[] = [
  cloud,
  cybersecurity,
  infrastructure,
  networking,
  agenticAI,
  agentHarness,
];`,
      blocks: [{ type: "focus" }],
      inspector: { status: "selected", type: "FocusArea", domains: [selectedFocus.title], bindings: selectedFocus.bindings, evidence: selectedFocus.evidence, related: ["bridge", "work", "writing"] },
    },
    bridge: {
      id: "bridge", file: "technical-bridge.ts", path: "src/technical-bridge.ts", language: "ts", kicker: "CUSTOMER ↔ VENDOR ↔ ENGINEERING",
      title: "Customer, vendor, and engineering alignment",
      summary: "The differentiator is not only knowing the technology. It is translating customer requirements, vendor capabilities, and engineering constraints into one plan people can execute.",
      code: `export function buildTechnicalBridge(
  customer: Requirements,
  vendor: Capabilities,
): SharedPlan {
  return discover(customer)
    .mapTo(vendor)
    .design()
    .demonstrate()
    .enable();
}`,
      blocks: [{ type: "bridge", services: items(service).slice(0, 4) }],
      inspector: { status: "available", type: "SharedPlan", domains: ["Discovery", "Architecture", "Demonstration", "Enablement"], related: ["profile", "focus", "work"] },
    },
    work: {
      id: "work", file: "selected-work.ts", path: "src/selected-work.ts", language: "ts", kicker: "WORKING EVIDENCE",
      title: "Selected technical work",
      summary: "Projects are presented as evidence: the problem, system, and demonstrated outcome—not another repetition of the professional summary.",
      code: `export const selectedWork = projects.filter(
  ({ outcome }) => outcome.isDemonstrated
);`,
      blocks: [{ type: "projects", projects }],
      inspector: { status: "published", type: "Project[]", domains: ["Cloud", "Security", "Agentic AI", "Education"], evidence: [`${projects.length} demonstrated projects`], related: ["focus", "bridge"] },
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
      inspector: { status: "verified", type: "Experience[]", regions: ["APAC", "EMEA", "North America"], evidence: ["Cloudflare", "Tencent Cloud", "Alibaba Cloud", "AWS"], related: ["profile", "teaching"] },
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
      inspector: { status: "active", type: "Teaching + Mentorship", domains: ["Cloud computing", "AWS", "Career transition", "Technical sales"], evidence: ["Yeshiva University", "Graduate instruction", "Career mentorship"], related: ["profile", "experience"] },
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
      inspector: { status: "published", type: "Article[]", domains: ["Cloud", "Security", "AI", "Architecture"], evidence: [`${posts.length} published articles`], related: ["focus", "teaching"] },
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
      inspector: { status: "available", type: "Conversation", domains: ["Architecture", "Cloudflare", "AI agents", "Mentorship"], related: ["profile", "bridge", "work"] },
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

function FocusBlock({ selected, onSelect }: { selected: FocusId; onSelect: (id: FocusId) => void }) {
  const focus = focusAreas([]);
  const active = focus.find((item) => item.id === selected) ?? focus[0];
  return <div className="cp-focus"><div className="cp-focus-grid">{focus.map((item) => <button type="button" className={item.id === selected ? "active" : ""} onClick={() => onSelect(item.id)} aria-pressed={item.id === selected} key={item.id}><span>0{focus.indexOf(item) + 1}</span><strong>{item.title}</strong><small>{item.bridge}</small></button>)}</div><article className="cp-focus-detail" key={active.id}><span>SELECTED MODULE</span><h2>{active.title}</h2><p>{active.summary}</p><dl><dt>Bridge</dt><dd>{active.bridge}</dd><dt>Evidence</dt><dd>{active.evidence.join(" · ")}</dd></dl></article></div>;
}

function BlockRenderer({ block, onOpen, selectedFocus, onFocus }: { block: ContentBlock; onOpen: (id: ModuleId) => void; selectedFocus: FocusId; onFocus: (id: FocusId) => void }) {
  switch (block.type) {
    case "profile": return <div className="cp-profile"><section><h2>Professional achievements</h2>{block.achievements.map((item) => <p key={item}>✓ {item}</p>)}</section><section><h2>Education</h2>{block.education.map((item) => <div key={item.title}><strong>{item.title}</strong><span>{item.company ?? item.institution}</span><small>{item.period}</small></div>)}</section></div>;
    case "focus": return <FocusBlock selected={selectedFocus} onSelect={onFocus}/>;
    case "bridge": return <><div className="cp-bridge-map"><div><span>CUSTOMER</span><strong>Requirements</strong><small>Risks · constraints · outcomes</small></div><b>↔</b><div className="center"><span>SHARED PLAN</span><strong>Architecture</strong><small>Demonstration · enablement</small></div><b>↔</b><div><span>VENDOR</span><strong>Capabilities</strong><small>Products · limits · roadmap</small></div></div><div className="cp-service-grid">{block.services.map((service, index) => <article key={service.title}><code>.{["discover", "translate", "design", "enable"][index]}()</code><h3>{service.title}</h3><p>{service.body}</p></article>)}</div></>;
    case "projects": return <div className="cp-projects">{block.projects.map((project, index) => <a href={project.url} target="_blank" rel="noreferrer" key={project.id ?? project.title}><header><span>{String(index + 1).padStart(2, "0")}</span><b>↗</b></header><h2>{project.title}</h2><p>{project.summary}</p><div>{project.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></a>)}</div>;
    case "timeline": return <div className="cp-timeline">{block.roles.map((role) => <article key={`${role.company}-${role.title}`}><time>{role.period}</time><div><h2>{role.title}</h2><strong>{role.company}</strong><small>{role.location}</small><p>{role.body}</p></div></article>)}</div>;
    case "teaching": return <div className="cp-teaching"><p>{block.body}</p><div>{block.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>{block.link && <a href={block.link} target="_blank" rel="noreferrer">View teaching repository ↗</a>}</div>;
    case "writing": return <div className="cp-writing">{block.posts.map((post, index) => <a href={`/blog/${post.slug}`} key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{post.tags.slice(0, 2).join(" · ")}</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><b>Read →</b></a>)}</div>;
    case "contact": return <div className="cp-contact"><a href="/chat">Start a private conversation</a>{block.bookingUrl && <a className="secondary" href={block.bookingUrl} target="_blank" rel="noreferrer">Schedule a conversation</a>}{block.links.map((link) => <a className="text" href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label} ↗</a>)}</div>;
  }
}

function ModuleDocument({ module, onOpen, selectedFocus, onFocus }: { module: PortfolioModule; onOpen: (id: ModuleId) => void; selectedFocus: FocusId; onFocus: (id: FocusId) => void }) {
  return <article className="cp-document"><span className="cp-kicker">{module.kicker}</span><h1>{module.title}</h1><p className="cp-lead">{module.summary}</p><CodeBlock code={module.code}/>{module.blocks.map((block, index) => <BlockRenderer block={block} onOpen={onOpen} selectedFocus={selectedFocus} onFocus={onFocus} key={`${block.type}-${index}`}/>)}</article>;
}

function Inspector({ module, compact = false, onOpen }: { module: PortfolioModule; compact?: boolean; onOpen: (id: ModuleId) => void }) {
  const groups: Array<[string, string[] | undefined]> = [["Domains", module.inspector.domains], ["Bindings", module.inspector.bindings], ["Regions", module.inspector.regions], ["Evidence", module.inspector.evidence]];
  return <aside className={`cp-inspector ${compact ? "compact" : ""}`}><header><strong>MODULE INSPECTOR</strong><span>•••</span></header><section><small>STATUS</small><p className="cp-status"><i/> {module.inspector.status}</p></section><section><small>TYPE</small><code>{module.inspector.type}</code></section>{groups.filter(([, values]) => values?.length).map(([label, values]) => <section key={label}><small>{label.toUpperCase()}</small><div className="cp-chips">{values?.map((value) => <span key={value}>{value}</span>)}</div></section>)}{module.inspector.related?.length && <section><small>RELATED FILES</small><div className="cp-related">{module.inspector.related.map((id) => <button type="button" onClick={() => onOpen(id)} key={id}>{id === "work" ? "selected-work" : id}.ts <span>→</span></button>)}</div></section>}</aside>;
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
  const [selectedFocus, setSelectedFocus] = useState<FocusId>("cloud");
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

  const modules = useMemo(() => buildModules(sections, posts, selectedFocus), [sections, posts, selectedFocus]);
  const active = modules[activeId];
  const openModule = (id: ModuleId) => { setActiveId(id); setMobileExplorer(false); setPaletteOpen(false); window.history.pushState(null, "", `#${id}`); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (error) return <Layout><div className="state-message">{error}</div></Layout>;
  if (sections.length === 0) return <Layout><div className="state-message">Loading portfolio worker…</div></Layout>;

  return <Layout><div className="control-plane">
    <div className="cp-deploybar"><div><span className="cp-cf-mark">CF</span><strong>portfolio-worker</strong><small>production</small></div><div><span><i/> DEPLOYED</span><span>D1 ●</span><span>AI ●</span><span>DO ●</span></div><button type="button" onClick={() => setPaletteOpen(true)}>⌘K Search</button></div>
    <button type="button" className="cp-mobile-explorer" onClick={() => setMobileExplorer((open) => !open)} aria-expanded={mobileExplorer}>☰ Explorer</button>
    <aside className={`cp-explorer ${mobileExplorer ? "open" : ""}`}><header><strong>FILES</strong><span>src/</span></header><Explorer modules={modules} active={activeId} srcOpen={srcOpen} onToggle={() => setSrcOpen((open) => !open)} onOpen={openModule}/><footer><span>main*</span><span>● online</span></footer></aside>
    <main className="cp-editor"><div className="cp-tab"><FileIcon/><span>{active.file}</span><b>×</b></div><div className="cp-breadcrumb">{active.path.split("/").map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <b>›</b>}</span>)}</div><div className="cp-scroll"><ModuleDocument module={active} onOpen={openModule} selectedFocus={selectedFocus} onFocus={setSelectedFocus}/><Inspector module={active} compact onOpen={openModule}/></div><div className="cp-statusbar"><span>main*</span><span>portfolio-chat</span><span>TypeScript</span><span>Cloudflare Workers</span></div></main>
    <Inspector module={active} onOpen={openModule}/>
  </div>{paletteOpen && <CommandPalette modules={modules} onClose={() => setPaletteOpen(false)} onOpen={openModule}/>}</Layout>;
}
