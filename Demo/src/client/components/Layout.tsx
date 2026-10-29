// Application ownership: Shared public navigation and footer shell.
import type { ReactNode } from "react";

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the Layout operation for this module.
 */
export function Layout({ children }: { children: ReactNode }) {
  const path = window.location.pathname;
  return <>
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark">OA</span><span><strong>Oskar Ablimit</strong><small>Senior Customer Engineer</small></span></a>
      <a className="chat-link" href="/chat"><span className="chat-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M5 5h14v10H9l-4 4V5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg></span><span><strong>Start chat</strong><small>Anonymous by default</small></span><b>↗</b></a>
      <nav aria-label="Main navigation">
        <a href="/#chat">Chat guide</a>
        <a href="/#profile">Profile</a>
        <a href="/#expertise">Main expertise</a>
        <a href="/#work">Selected work</a>
        <a href="/#experience">Experience</a>
        <a href="/#writing">Writing</a>
        <a href="/#consulting">Consulting</a>
      </nav>
      <a className={`header-blog-link ${path.startsWith("/blog") ? "active" : ""}`} href="/blog">Blog</a>
    </header>
    <main>{children}</main>
    <footer><div><strong>Oskar Ablimit</strong><p>Cloud · Security · AI · Solutions Engineering</p></div><div className="footer-links"><a href="https://www.linkedin.com/in/cloudflareoskar/">LinkedIn</a><a href="https://github.com/oskarcode">GitHub</a><a href="/blog">Technical writing</a><a href="/chat">Chat</a></div></footer>
  </>;
}
