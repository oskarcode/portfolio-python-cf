// Application ownership: Path-based client view selection for this single-page application.
import { Admin } from "./views/Admin";
import { Article, Blog } from "./views/Blog";
import { Chat } from "./views/Chat";
import { Website } from "./views/Website";

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the App operation for this module.
 */
export function App() {
  const path = window.location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return <Admin/>;
  if (path === "/chat" || path.startsWith("/chat/")) return <Chat/>;
  if (path === "/blog") return <Blog/>;
  const article = path.match(/^\/blog\/([^/]+)\/?$/);
  if (article) return <Article slug={decodeURIComponent(article[1])}/>;
  return <Website/>;
}
