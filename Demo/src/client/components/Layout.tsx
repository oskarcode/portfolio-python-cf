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
  return <>
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark">OA</span><span><strong>Oskar Ablimit</strong><small>Senior Customer Engineer</small></span></a>

    </header>
    <main>{children}</main>
    <footer><div><strong>Oskar Ablimit</strong><p>Cloud · Security · AI · Solutions Engineering</p></div><div className="footer-links"><a href="https://www.linkedin.com/in/cloudflareoskar/">LinkedIn</a><a href="https://github.com/oskarcode">GitHub</a><a href="/blog">Technical writing</a><a href="/chat?prompt=Help%20me%20explore%20Oskar%E2%80%99s%20portfolio%20and%20find%20the%20most%20relevant%20place%20to%20start.">Chat</a></div></footer>
  </>;
}
