import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const path = window.location.pathname;
  return <>
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark">OA</span><span><strong>Oskar Ablimit</strong><small>Solutions Engineer</small></span></a>
      <nav aria-label="Main navigation">
        <a href="/#capabilities">Capabilities</a>
        <a href="/#projects">Projects</a>
        <a href="/#experience">Experience</a>
        <a href="/#writing">Writing</a>
        <a href="/#work-with-me">Work with me</a>
      </nav>
      <a className={`header-blog-link ${path.startsWith("/blog") ? "active" : ""}`} href="/blog">Blog</a>
      <a className="chat-link" href="/chat">Chat <span>↗</span></a>
    </header>
    <main>{children}</main>
    <footer><div><strong>Oskar Ablimit</strong><p>Cloud · Security · AI · Solutions Engineering</p></div><div className="footer-links"><a href="https://www.linkedin.com/in/cloudflareoskar/">LinkedIn</a><a href="https://github.com/oskarcode">GitHub</a><a href="/blog">Technical writing</a><a href="/chat">Chat</a></div></footer>
  </>;
}
