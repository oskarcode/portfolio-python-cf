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
      <nav aria-label="Main navigation">
        <a href="/#profile">Profile</a>
        <a href="/#focus">Focus</a>
        <a href="/#work">Selected work</a>
        <a href="/#experience">Experience</a>
        <a href="/#writing">Writing</a>
        <a href="/#consulting">Consulting</a>
      </nav>
      <a className={`header-blog-link ${path.startsWith("/blog") ? "active" : ""}`} href="/blog">Blog</a>
      <a className="chat-link" href="/chat">Chat <span>↗</span></a>
    </header>
    <main>{children}</main>
    <footer><div><strong>Oskar Ablimit</strong><p>Cloud · Security · AI · Solutions Engineering</p></div><div className="footer-links"><a href="https://www.linkedin.com/in/cloudflareoskar/">LinkedIn</a><a href="https://github.com/oskarcode">GitHub</a><a href="/blog">Technical writing</a><a href="/chat">Chat</a></div></footer>
  </>;
}
