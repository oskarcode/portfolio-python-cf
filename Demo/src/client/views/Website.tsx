// Application ownership: Data-driven technical portfolio presented as readable TypeScript concepts.
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
type TokenKind = "keyword" | "type" | "string" | "property" | "comment";
type FocusArea = {
  id: "cloud" | "cybersecurity" | "agentic-ai" | "teaching" | "technical-bridge";
  file: string;
  title: string;
  shortTitle: string;
  summary: string;
  connects: string;
  outcomes: string[];
};

const FOCUS_AREAS: FocusArea[] = [
  {
    id: "cloud",
    file: "cloud.ts",
    title: "Cloud systems that are practical to operate",
    shortTitle: "Cloud",
    summary: "I turn platform capabilities into architectures teams can understand, ship, secure, and maintain.",
    connects: "strategy → architecture → implementation",
    outcomes: ["Cloudflare Workers", "Distributed systems", "Platform adoption"],
  },
  {
    id: "cybersecurity",
    file: "security.ts",
    title: "Cybersecurity designed into the system",
    shortTitle: "Cybersecurity",
    summary: "I connect identity, application security, Zero Trust, and operational constraints instead of treating security as a final checkpoint.",
    connects: "risk → controls → usable security",
    outcomes: ["Zero Trust", "Application security", "Secure access"],
  },
  {
    id: "agentic-ai",
    file: "agents.ts",
    title: "Agentic AI with clear tools and boundaries",
    shortTitle: "Agentic AI",
    summary: "I build durable agents that can reason, use approved tools, collaborate with people, and recover without hiding how the system works.",
    connects: "models → tools → durable workflows",
    outcomes: ["AI agents", "Tool orchestration", "Human handoff"],
  },
  {
    id: "teaching",
    file: "teaching.ts",
    title: "Teaching that makes technical ideas usable",
    shortTitle: "Teaching",
    summary: "I translate architecture into workshops, examples, and explanations that help technical and non-technical teams make better decisions.",
    connects: "complexity → understanding → confidence",
    outcomes: ["Workshops", "Technical writing", "Enablement"],
  },
  {
    id: "technical-bridge",
    file: "bridge.ts",
    title: "A technical bridge between customers and vendors",
    shortTitle: "Customer ↔ Vendor",
    summary: "I help both sides align requirements, product capabilities, security concerns, and delivery plans in language everyone can act on.",
    connects: "customer needs ↔ vendor capabilities",
    outcomes: ["Discovery", "Solution design", "Shared execution"],
  },
];

const string = (value: unknown) => typeof value === "string" ? value : "";
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const items = (section: SiteSection, key = "items") => Array.isArray(section.content[key]) ? section.content[key] as Item[] : [];

/** Renders one syntax-colored fragment without introducing a syntax-highlighting dependency. */
function Token({ kind, children }: { kind: TokenKind; children: ReactNode }) {
  return <span className={`token-${kind}`}>{children}</span>;
}

/** Provides the shared file bar and code surface used by focused TypeScript examples. */
function CodePanel({ file, label, children, className = "" }: { file: string; label: string; children: ReactNode; className?: string }) {
  return <aside className={`code-panel ${className}`} aria-label={label}>
    <div className="code-filebar" aria-hidden="true"><span/><span/><span/><code>{file}</code></div>
    <div className="code-panel-body">{children}</div>
  </aside>;
}

/** Introduces each content section as a small, valid-looking TypeScript function. */
function CodeSection({ section, signature, children, className = "" }: { section: SiteSection; signature: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`content-section code-section ${className}`} id={section.slug}>
    <header className="section-heading">
      <span className="section-kicker">{String(section.sortOrder).padStart(2, "0")} / {section.slug}.ts</span>
      <h2>{section.title}</h2>
      {section.summary && <p>{section.summary}</p>}
    </header>
    <div className="section-code" aria-hidden="true">{signature} <span className="code-brace">{"{"}</span></div>
    <div className="section-result">{children}</div>
    <div className="section-code section-code-close" aria-hidden="true"><span className="code-brace">{"}"}</span></div>
  </section>;
}

/** Lets visitors inspect the five connected focus areas without requiring technical knowledge. */
function FocusExplorer() {
  const [activeId, setActiveId] = useState<FocusArea["id"]>("cloud");
  const active = FOCUS_AREAS.find((area) => area.id === activeId) ?? FOCUS_AREAS[0];

  return <div className="focus-explorer">
    <header className="focus-explorer-bar">
      <div><span className="status-light"/><code>focus.runtime.ts</code></div>
      <span>SELECT A FOCUS AREA</span>
      <strong>● AVAILABLE</strong>
    </header>
    <div className="focus-workbench">
      <nav className="focus-files" aria-label="Primary focus areas">
        {FOCUS_AREAS.map((area, index) => <button type="button" className={area.id === active.id ? "active" : ""} onClick={() => setActiveId(area.id)} aria-pressed={area.id === active.id} key={area.id}>
          <span>{String(index + 1).padStart(2, "0")}</span><strong>{area.shortTitle}</strong><small>{area.file}</small>
        </button>)}
      </nav>
      <div className="focus-output" key={active.id}>
        <div className="focus-output-code" aria-hidden="true"><span className="line-number">01</span><Token kind="keyword">export function</Token> <Token kind="property">{active.id.replace("-", "_")}</Token>() <span>{"{"}</span></div>
        <div className="focus-output-content">
          <span className="section-kicker">PRIMARY FOCUS / {active.file}</span>
          <h2>{active.title}</h2>
          <p>{active.summary}</p>
          <div className="bridge-line"><span>bridge</span><strong>{active.connects}</strong></div>
          <div className="focus-outcomes">{active.outcomes.map((outcome) => <span key={outcome}>{outcome}</span>)}</div>
        </div>
        <div className="focus-output-code" aria-hidden="true"><span className="line-number">08</span><Token kind="keyword">return</Token> <Token kind="string">"clear, secure, useful"</Token>;<br/><span className="line-number">09</span><span>{"}"}</span></div>
      </div>
    </div>
  </div>;
}

/** Presents the portfolio identity and the connected technical focus system. */
function Hero({ section }: { section: SiteSection }) {
  return <section className="tech-hero" id="home">
    <div className="hero-grid">
      <div className="hero-copy">
        <span className="section-kicker">SOLUTIONS ENGINEERING / SYSTEMS + PEOPLE</span>
        <h1>Cloud, cybersecurity, and agentic AI—made clear and useful.</h1>
        <p className="hero-summary">I teach, design, and build the technical bridge between customers, vendors, and the systems they need to trust.</p>
        <div className="hero-actions">
          <a className="button primary" href="#projects">View technical work</a>
          <a className="button secondary" href="/chat">Ask a specific question</a>
        </div>
        <div className="hero-status" aria-label="Professional focus"><span>Cloud</span><span>Cybersecurity</span><span>Agentic AI</span><span>Teaching</span></div>
      </div>
      <CodePanel file="portfolio.ts" label="Portfolio focus written as TypeScript" className="hero-terminal">
        <pre><code><Token kind="keyword">const</Token> <Token kind="property">mission</Token>: <Token kind="type">TechnicalBridge</Token> = {`{`}{"\n"}  connect: [{"\n"}    <Token kind="string">"customers"</Token>,{"\n"}    <Token kind="string">"vendors"</Token>,{"\n"}    <Token kind="string">"technical teams"</Token>,{"\n"}  ],{"\n"}  through: [{"\n"}    <Token kind="string">"cloud"</Token>,{"\n"}    <Token kind="string">"cybersecurity"</Token>,{"\n"}    <Token kind="string">"agentic AI"</Token>,{"\n"}    <Token kind="string">"teaching"</Token>,{"\n"}  ],{"\n"}  outcome: <Token kind="string">"shared understanding"</Token>,{"\n"}{`}`};</code></pre>
      </CodePanel>
    </div>
    <FocusExplorer/>
  </section>;
}

/** Returns the profile narrative and its strongest supporting facts. */
function About({ section }: { section: SiteSection }) {
  const highlights = strings(section.content.highlights);
  return <CodeSection section={section} signature={<><Token kind="keyword">function</Token> <Token kind="property">about</Token>(): <Token kind="type">Profile</Token></>}>
    <div className="about-grid">
      <div><div className="result-label"><Token kind="keyword">return</Token> <span>{"{"}</span></div><p className="large-copy">{string(section.content.body)}</p></div>
      <div><div className="property-label">strengths: [</div><ul className="data-list">{highlights.map((highlight) => <li key={highlight}><span>✓</span><span>"{highlight}"</span></li>)}</ul><div className="property-label">]</div></div>
    </div>
  </CodeSection>;
}

/** Maps the capability array into compact, readable technical cards. */
function Capabilities({ section }: { section: SiteSection }) {
  return <CodeSection section={section} signature={<><Token kind="keyword">function</Token> <Token kind="property">capabilities</Token>(): <Token kind="type">Capability[]</Token></>}>
    <div className="inline-code-note" aria-hidden="true"><Token kind="keyword">return</Token> capabilities.<Token kind="property">map</Token>(renderCapability);</div>
    <div className="technical-grid">{items(section).map((item, index) => <article className="technical-card" key={item.id ?? item.title}>
      <div className="card-code-head"><span>capabilities[{index}]</span><span>{"{"}</span></div>
      <h3>{item.title}</h3><p>{item.body}</p>
      <div className="tag-list">{item.tags?.map((tag) => <span key={tag}>"{tag}"</span>)}</div>
      <span className="card-code-end">{"}"},</span>
    </article>)}</div>
  </CodeSection>;
}

/** Presents each project as a typed buildProject call with a visible outcome. */
function Projects({ section }: { section: SiteSection }) {
  return <CodeSection section={section} signature={<><Token kind="keyword">const</Token> <Token kind="property">projects</Token>: <Token kind="type">Project[]</Token> =</>} className="muted-section">
    <div className="project-grid">{items(section).map((item) => <a className="project-card" href={item.url} key={item.id} target="_blank" rel="noreferrer">
      <div className="project-top"><span><Token kind="property">buildProject</Token>({"{"}</span><span>↗</span></div>
      <div className="project-field">name:</div><h3>"{item.title}"</h3>
      <div className="project-field">outcome:</div><p>{item.summary}</p>
      <div className="tag-list">{item.tags?.map((tag) => <span key={tag}>"{tag}"</span>)}</div>
      <span className="card-code-end">{"}"});</span>
    </a>)}</div>
  </CodeSection>;
}

/** Adds each role to an execution-history timeline. */
function Timeline({ section }: { section: SiteSection }) {
  return <CodeSection section={section} signature={<><Token kind="keyword">function</Token> <Token kind="property">career</Token>(): <Token kind="type">Experience[]</Token></>}>
    <div className="timeline">{items(section).map((item) => <article key={`${item.company}-${item.title}`}>
      <div className="timeline-meta"><strong>{item.period}</strong><span>{item.location}</span></div>
      <div className="timeline-call"><span className="call-open"><Token kind="property">experience.add</Token>({"{"}</span><h3>{item.title}</h3><h4>{item.company}</h4><p>{item.body}</p><span className="card-code-end">{"}"});</span></div>
    </article>)}</div>
  </CodeSection>;
}

/** Uses a generic teaching function to frame the course topics. */
function Teaching({ section }: { section: SiteSection }) {
  const topics = strings(section.content.topics);
  return <CodeSection section={section} signature={<><Token kind="keyword">function</Token> <Token kind="property">teach</Token>&lt;<Token kind="type">Topic</Token>&gt;(topics: <Token kind="type">Topic[]</Token>)</>} className="muted-section">
    <div className="teaching-grid"><div><div className="result-label"><Token kind="keyword">return</Token> <Token kind="string">"complex ideas made practical"</Token>;</div><p className="large-copy">{string(section.content.body)}</p><a className="text-link" href={string(section.content.link)} target="_blank" rel="noreferrer">View course repository <span aria-hidden="true">→ openRepository()</span></a></div>
      <div><div className="property-label">teach([</div><ol className="topic-list">{topics.map((topic, index) => <li key={topic}><span>{String(index + 1).padStart(2, "0")}</span><span>"{topic}",</span></li>)}</ol><div className="property-label">]);</div></div>
    </div>
  </CodeSection>;
}

/** Groups education, certifications, and languages under one interface-shaped result. */
function Credentials({ section }: { section: SiteSection }) {
  const education = items(section, "education");
  const certifications = strings(section.content.certifications);
  const languages = strings(section.content.languages);
  return <CodeSection section={section} signature={<><Token kind="keyword">interface</Token> <Token kind="type">Credentials</Token></>}>
    <div className="credential-grid">
      <div><h3>credentials.education</h3>{education.map((item) => <div className="credential-item" key={item.title}><strong>{item.title}</strong><span>{item.company ?? item.institution}</span><small>{item.period}</small></div>)}</div>
      <div><h3>credentials.certifications</h3>{certifications.map((item) => <div className="credential-line" key={item}>✓ {item}</div>)}</div>
      <div><h3>credentials.languages</h3>{languages.map((item) => <div className="credential-line" key={item}>"{item}"</div>)}</div>
    </div>
  </CodeSection>;
}

/** Renders recent D1 articles as the result of an asynchronous content query. */
function Writing({ section, posts }: { section: SiteSection; posts: BlogPost[] }) {
  return <CodeSection section={section} signature={<><Token kind="keyword">const</Token> <Token kind="property">articles</Token> = <Token kind="keyword">await</Token> <Token kind="property">getWriting</Token>()</>} className="dark-section">
    <div className="inline-code-note" aria-hidden="true"><Token kind="comment">// The latest technical notes, returned from D1.</Token></div>
    <div className="writing-list">{posts.slice(0, 6).map((post, index) => <a href={`/blog/${post.slug}`} key={post.id}><div><span>articles[{index}] · {post.tags.slice(0, 2).join(" · ")}</span><h3>"{post.title}"</h3><p>{post.excerpt}</p></div><strong>Read →</strong></a>)}</div>
    <a className="button outline-light" href="/blog">View all {posts.length} articles</a>
  </CodeSection>;
}

/** Describes consulting services as a clear sequence from problem to outcome. */
function Services({ section }: { section: SiteSection }) {
  return <CodeSection section={section} signature={<><Token kind="keyword">function</Token> <Token kind="property">solve</Token>(problem: <Token kind="type">TechnicalProblem</Token>): <Token kind="type">Outcome</Token></>} className="services-section">
    <p className="service-intro">{string(section.content.intro)}</p>
    <div className="service-list">{items(section).map((item, index) => <article key={item.title}><span className="service-call">.{["clarify", "design", "implement", "enable", "scale"][index] ?? "solve"}()</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
    <div className="hero-actions"><a className="button primary" href="/chat">Describe what you need</a><a className="button secondary" href={string(section.content.bookingUrl)} target="_blank" rel="noreferrer">Schedule a conversation ↗</a></div>
  </CodeSection>;
}

/** Closes the page with an understandable async invitation rather than a decorative terminal. */
function Contact({ section }: { section: SiteSection }) {
  const links = Array.isArray(section.content.links) ? section.content.links as Link[] : [];
  return <section className="contact-section" id={section.slug}>
    <span className="section-kicker">CONTACT / contact.ts</span>
    <div className="contact-signature" aria-hidden="true"><Token kind="keyword">async function</Token> <Token kind="property">startConversation</Token>() <span>{"{"}</span></div>
    <h2>{section.title}</h2><p>{string(section.content.body)}</p>
    <div className="contact-actions"><a className="button primary" href="/chat">Start a private conversation</a>{links.map((link) => <a href={link.href} key={link.label} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div>
    <div className="contact-signature contact-close" aria-hidden="true"><Token kind="comment">// Opens a private visitor workspace.</Token><br/><span>{"}"}</span></div>
  </section>;
}

/** Selects the renderer corresponding to each D1-managed section type. */
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

/** Loads public D1 content once and renders the data-driven homepage. */
export function Website() {
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.content(), api.posts()]).then(([content, writing]) => {
      setSections(content.sections);
      setPosts(writing.posts);
    }).catch((failure: Error) => setError(failure.message));
  }, []);

  return <Layout>{error
    ? <div className="state-message">{error}</div>
    : sections.length === 0
      ? <div className="state-message">Loading portfolio…</div>
      : sections.map((section) => <RenderSection section={section} posts={posts} key={section.id}/>)}</Layout>;
}
