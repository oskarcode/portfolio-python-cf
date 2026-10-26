import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { BlogPost, ChatMessage, Lead, SiteSection, WorkspaceMessage } from "../../shared/types";
import { AdminSkills } from "../components/AdminSkills";

type AdminPage = "agent" | "inbox" | "content" | "blog" | "skills";
const pageFromPath = (): AdminPage => {
  const segment = window.location.pathname.split("/")[2];
  return segment === "inbox" || segment === "content" || segment === "blog" || segment === "skills" ? segment : "agent";
};

export function Admin() {
  const page = pageFromPath();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "What would you like to update? I can inspect, draft, and publish portfolio sections or blog content." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [transcript, setTranscript] = useState<WorkspaceMessage[]>([]);
  const [reply, setReply] = useState("");
  const [workspaceRecipient, setWorkspaceRecipient] = useState<"visitor" | "agent">("visitor");
  const [notice, setNotice] = useState("");

  const loadLeads = () => api.leads().then((data) => setLeads(data.leads)).catch((error: Error) => setNotice(error.message));
  const loadContent = () => api.adminContent().then((data) => { setSections(data.sections); setPosts(data.posts); }).catch((error: Error) => setNotice(error.message));
  const refreshWorkspace = async (lead: Lead) => setTranscript((await api.workspace(lead.workspaceId)).messages);
  useEffect(() => { if (page === "inbox") void loadLeads(); if (page === "content" || page === "blog") void loadContent(); }, [page]);

  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!input.trim() || busy) return;
    const text = input; setInput(""); setMessages((value) => [...value, { role: "user", content: text }]); setBusy(true);
    try { const result = await api.ownerChat(text); setMessages((value) => [...value, { role: "assistant", content: result.answer }]); }
    catch (error) { setMessages((value) => [...value, { role: "assistant", content: error instanceof Error ? error.message : "Request failed" }]); }
    finally { setBusy(false); }
  };
  const openLead = async (lead: Lead) => { setSelected(lead); setWorkspaceRecipient("visitor"); await refreshWorkspace(lead); };
  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !reply.trim()) return;
    setBusy(true);
    try { await api.ownerWorkspaceMessage(selected.workspaceId, reply, workspaceRecipient); setReply(""); await refreshWorkspace(selected); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Message failed"); }
    finally { setBusy(false); }
  };
  const toggleArchive = async () => {
    if (!selected) return;
    if (selected.workspaceStatus === "archived") await api.restoreWorkspace(selected.workspaceId);
    else await api.archiveWorkspace(selected.workspaceId);
    const next = { ...selected, workspaceStatus: selected.workspaceStatus === "archived" ? "active" as const : "archived" as const };
    setSelected(next); await loadLeads();
  };
  const removeWorkspace = async () => {
    if (!selected || !confirm(`Permanently delete the workspace with ${selected.name}?`)) return;
    await api.deleteWorkspace(selected.workspaceId); setSelected(null); setTranscript([]); await loadLeads();
  };
  const importMedium = async () => {
    setBusy(true);
    try { const result = await api.importMedium(); setNotice(`${result.imported} imported · ${result.skipped} already present`); await loadContent(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Import failed"); }
    finally { setBusy(false); }
  };

  const title = page === "agent" ? "Content agent" : page === "inbox" ? "Visitor workspaces" : page === "content" ? "Site content" : page === "blog" ? "Blog" : "Skill Hub";
  return <div className="admin-shell">
    <aside className="admin-sidebar"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Admin</span></a><nav><a className={page === "agent" ? "active" : ""} href="/admin">Content agent</a><a className={page === "inbox" ? "active" : ""} href="/admin/inbox">Inbox</a><a className={page === "content" ? "active" : ""} href="/admin/content">Site content</a><a className={page === "blog" ? "active" : ""} href="/admin/blog">Blog</a><a className={page === "skills" ? "active" : ""} href="/admin/skills">Skill Hub</a></nav><a className="admin-view-site" href="/">View website ↗</a></aside>
    <main className="admin-main"><header><div><span className="eyebrow">PORTFOLIO ADMIN</span><h1>{title}</h1></div><span className="admin-auth">Cloudflare Access</span></header>{notice && <div className="notice">{notice}</div>}
      {page === "agent" && <section className="admin-agent admin-page-panel"><div className="admin-messages">{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span>{message.role === "assistant" ? "AGENT" : "YOU"}</span><div>{message.content}</div></div>)}{busy && <p className="muted">Working…</p>}</div><form onSubmit={send}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Example: Update the Cloudflare capabilities section and show me the draft first."/><button disabled={busy}>Send</button></form></section>}
      {page === "inbox" && <section className="admin-page-panel"><div className="admin-toolbar"><p>Only visitors who explicitly added you appear here.</p><button onClick={() => void loadLeads()}>Refresh</button></div><div className="lead-table">{leads.length === 0 ? <p className="empty">No shared workspaces.</p> : leads.map((lead) => <button className={`lead-row ${lead.workspaceStatus}`} onClick={() => void openLead(lead)} key={lead.id}><div><strong>{lead.name}</strong><span>{lead.email}</span></div><p>{lead.intent}</p><span className={`status-badge ${lead.workspaceStatus}`}>{lead.workspaceStatus}</span><time>{new Date(lead.updatedAt).toLocaleDateString()}</time></button>)}</div></section>}
      {page === "content" && <section className="admin-page-panel"><div className="admin-toolbar"><p>{sections.length} structured sections. Use the content agent to edit or publish.</p><a href="/admin">Open content agent →</a></div><div className="resource-list">{sections.map((section) => <div key={section.id}><span className="resource-type">{section.type}</span><div><strong>{section.title}</strong><small>/{section.slug}</small></div><span className={`status-badge ${section.status}`}>{section.status}</span><span>{section.sortOrder}</span></div>)}</div></section>}
      {page === "blog" && <section className="admin-page-panel"><div className="admin-toolbar"><p>{posts.length} articles in the local blog.</p><div><button onClick={() => void importMedium()} disabled={busy}>Import Medium</button><a href="/admin">Draft with agent →</a></div></div><div className="resource-list">{posts.map((post) => <div key={post.id}><span className="resource-type">{post.source}</span><div><strong>{post.title}</strong><small>/{post.slug}</small></div><span className={`status-badge ${post.status}`}>{post.status}</span><span>{post.publishedAt ? new Date(post.publishedAt).getFullYear() : "—"}</span></div>)}</div></section>}
      {page === "skills" && <AdminSkills/>}
    </main>
    {selected && <aside className="lead-drawer"><button className="drawer-close" onClick={() => setSelected(null)}>×</button><span className="eyebrow">{selected.workspaceStatus === "archived" ? "ARCHIVED" : "SHARED WORKSPACE"}</span><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}>{selected.email}</a><p>{selected.intent}</p><div className="workspace-actions"><button onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/chat/${selected.workspaceId}`)}>Copy invite URL</button><button onClick={() => void toggleArchive()}>{selected.workspaceStatus === "archived" ? "Restore" : "Archive"}</button><button className="danger" onClick={() => void removeWorkspace()}>Delete</button></div><div className="drawer-transcript">{transcript.map((message) => <div className={`message ${message.sender === "visitor" ? "user" : "assistant"} ${message.sender}`} key={message.id}><span>{message.senderName}{message.audience === "owner" && message.sender === "visitor" ? " → YOU" : ""}</span><div>{message.content}</div></div>)}</div>{selected.workspaceStatus === "active" && <form className="owner-reply" onSubmit={sendReply}><div className="recipient-switch"><button type="button" className={workspaceRecipient === "visitor" ? "active" : ""} onClick={() => setWorkspaceRecipient("visitor")}><strong>Reply to visitor</strong><span>As Oskar</span></button><button type="button" className={workspaceRecipient === "agent" ? "active" : ""} onClick={() => setWorkspaceRecipient("agent")}><strong>Ask agent</strong><span>Use workspace context</span></button></div><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder={workspaceRecipient === "visitor" ? `Reply to ${selected.name}…` : "Ask the agent about this conversation…"}/><button className="owner-send" disabled={busy || !reply.trim()}>{workspaceRecipient === "visitor" ? "Send reply" : "Ask agent"}</button></form>}</aside>}
  </div>;
}
