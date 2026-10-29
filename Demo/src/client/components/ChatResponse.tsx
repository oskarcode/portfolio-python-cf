// Application ownership: Safe lightweight Markdown-like rendering and contextual chat actions.
import { Fragment, type ReactNode } from "react";

type Action = { label: string; href?: string; prompt?: string };

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It parses safe inline response formatting.
 */
function inline(text: string): ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(https?:\/\/[^\s,)]+))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    if (match[2] && match[3]) nodes.push(<a href={match[3]} target={match[3].startsWith("http") ? "_blank" : undefined} rel="noreferrer" key={index}>{match[2]} ↗</a>);
    else if (match[4]) nodes.push(<strong key={index}>{inline(match[4])}</strong>);
    else if (match[5]) nodes.push(<code key={index}>{match[5]}</code>);
    else if (match[6]) nodes.push(<a href={match[6]} target="_blank" rel="noreferrer" key={index}>{match[6].replace(/^https?:\/\//, "")} ↗</a>);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It submits one model turn and persists its result.
 */
export function ChatResponse({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; values: string[] } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const children = list.values.map((value, index) => <li key={index}>{inline(value)}</li>);
    blocks.push(list.ordered ? <ol key={`l-${blocks.length}`}>{children}</ol> : <ul key={`l-${blocks.length}`}>{children}</ul>);
    list = null;
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^#{1,3}\s+(.+)/);
    const bullet = line.match(/^[-*•]\s+(.+)/);
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    const quote = line.match(/^>\s?(.+)/);
    if (heading) { flushParagraph(); flushList(); blocks.push(<h3 key={`h-${blocks.length}`}>{inline(heading[1])}</h3>); }
    else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered); const value = (bullet ?? numbered)![1];
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, values: [] }; }
      list.values.push(value);
    } else if (quote) { flushParagraph(); flushList(); blocks.push(<blockquote key={`q-${blocks.length}`}>{inline(quote[1])}</blockquote>); }
    else if (/^---+$/.test(line)) { flushParagraph(); flushList(); blocks.push(<hr key={`r-${blocks.length}`}/>); }
    else paragraph.push(line);
  });
  flushParagraph(); flushList();
  return <div className="response-content">{blocks.map((block, index) => <Fragment key={index}>{block}</Fragment>)}</div>;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It derives presentation behavior from agent response content.
 */
export function responseActions(content: string, persistent: boolean): Action[] {
  const text = content.toLowerCase();
  const actions: Action[] = [];
  const add = (action: Action) => { if (!actions.some((item) => item.label === action.label) && actions.length < 3) actions.push(action); };
  if (/project|built|implementation|portfolio/.test(text)) add({ label: "View projects", href: "/#projects" });
  if (/article|blog|writing|medium/.test(text)) add({ label: "Browse technical writing", href: "/blog" });
  if (/teach|course|student|education|workshop/.test(text)) add({ label: "See teaching", href: "/#teaching" });
  if (/experience|career|sales engineer|background/.test(text)) add({ label: "View experience", href: "/#experience" });
  if (/cloudflare|security|zero trust|worker|agent|architecture/.test(text)) add({ label: "Explore main expertise", href: "/#expertise" });
  if (!persistent && /oskar|contact|work together|help you|next step|conversation/.test(text)) add({ label: "Add Oskar", prompt: "I want to add Oskar to this conversation" });
  return actions;
}
