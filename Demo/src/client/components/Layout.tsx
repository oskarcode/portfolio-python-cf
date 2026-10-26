import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const path = window.location.pathname;
  return <>
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark">OA</span><span>Oskar Ablimit</span></a>
      <nav aria-label="Main navigation">
        <a href="/#capabilities">Capabilities</a>
        <a href="/#projects">Work</a>
        <a href="/blog" className={path.startsWith("/blog") ? "active" : ""}>Writing</a>
        <a href="/#work-with-me">Work with me</a>
      </nav>
      <a className="chat-link" href="/chat">Ask my portfolio <span>↗</span></a>
    </header>
    <main>{children}</main>
    <footer><div><strong>Oskar Ablimit</strong><p>Cloud, security, AI, and solutions engineering.</p></div><div className="footer-links"><a href="https://www.linkedin.com/in/cloudflareoskar/">LinkedIn</a><a href="https://github.com/oskarcode">GitHub</a><a href="/blog">Writing</a></div></footer>
  </>;
}
