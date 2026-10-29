// Application ownership: Unified Access-protected workspace chat and capability management UI.
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { AdminWorkspaceSummary, WorkspaceCapabilities, WorkspaceMessage } from "../../shared/types";
import type { SkillSummary } from "../../skills/types";
import { AdminSkills } from "../components/AdminSkills";
import { AdminCalendar } from "../components/AdminCalendar";
import { ChatResponse } from "../components/ChatResponse";

const emptyCapabilities: WorkspaceCapabilities = { webSearch: false, scheduling: false, skillSlugs: [] };

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the Admin operation for this module.
 */
export function Admin() {
  const skillsPage = window.location.pathname === "/admin/skills";
  const calendarPage = window.location.pathname === "/admin/calendar";
  const managementPage = skillsPage || calendarPage;
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceSummary[]>([]);
  const [selectedId, setSelectedId] = useState(new URLSearchParams(location.search).get("workspace") ?? "owner-content");
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [capabilities, setCapabilities] = useState<WorkspaceCapabilities>(emptyCapabilities);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState<"visitor" | "agent">("agent");
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const selected = workspaces.find((workspace) => workspace.id === selectedId);

  /**
   * Input:
   * - No parameters; the current selected workspace comes from React state.
   * Output:
   * - A Promise that replaces the complete managed and visitor workspace list.
   * What this function does:
   * - It reloads the authoritative D1 catalog and repairs a selection that no longer exists.
   */
  const loadWorkspaces = async () => {
    const data = await api.adminWorkspaces();
    setWorkspaces(data.workspaces);
    if (!data.workspaces.some((item) => item.id === selectedId) && data.workspaces[0]) setSelectedId(data.workspaces[0].id);
  };
  const loadWorkspace = async (id: string) => {
    const [snapshot, tools, skillData] = await Promise.all([api.workspace(id), api.workspaceCapabilities(id), api.skills()]);
    setMessages(snapshot.messages); setCapabilities(tools); setSkills(skillData.skills); setNotice("");
  };
  useEffect(() => {
    if (managementPage) return;
    const refresh = () => void loadWorkspaces().catch((error: Error) => setNotice(error.message));
    refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => window.clearInterval(timer);
  }, [managementPage, selectedId]);
  useEffect(() => {
    if (managementPage || !selectedId) return;
    setRecipient("agent"); void loadWorkspace(selectedId).catch((error: Error) => setNotice(error.message));
    const timer = window.setInterval(() => void api.workspace(selectedId).then((snapshot) => setMessages(snapshot.messages)).catch(() => undefined), 5_000);
    return () => window.clearInterval(timer);
  }, [selectedId, managementPage]);

  const chooseWorkspace = (id: string) => { setSelectedId(id); setSettings(false); history.replaceState(null, "", `/admin?workspace=${encodeURIComponent(id)}`); };
  const createWorkspace = async () => {
    const title = prompt("Workspace name"); if (!title?.trim()) return;
    const purpose = prompt("What should this workspace help with?"); if (!purpose?.trim()) return;
    const workspace = await api.createAdminWorkspace(title, purpose); await loadWorkspaces(); chooseWorkspace(workspace.id);
  };
  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!input.trim() || !selected || busy) return;
    const text = input; setInput(""); setBusy(true);
    try { await api.ownerWorkspaceMessage(selected.id, text, selected.kind === "managed" ? "agent" : recipient); await loadWorkspace(selected.id); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Message failed"); }
    finally { setBusy(false); }
  };
  const saveCapabilities = async (next: WorkspaceCapabilities) => {
    setCapabilities(next);
    try { setCapabilities(await api.saveWorkspaceCapabilities(selectedId, next)); setNotice("Workspace tools updated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update tools"); }
  };
  const archive = async () => {
    if (!selected || selected.kind !== "visitor") return;
    if (selected.status === "archived") await api.restoreWorkspace(selected.id); else await api.archiveWorkspace(selected.id);
    await loadWorkspaces();
  };
  const remove = async () => {
    if (!selected || selected.kind !== "visitor" || !confirm(`Permanently delete ${selected.title}'s workspace?`)) return;
    await api.deleteWorkspace(selected.id); setSelectedId("owner-content"); await loadWorkspaces();
  };

  const managed = workspaces.filter((workspace) => workspace.kind === "managed");
  const visitors = workspaces.filter((workspace) => workspace.kind === "visitor");
  return <div className="admin-shell unified-admin">
    <aside className="admin-sidebar"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Admin</span></a><nav><a className={!managementPage ? "active" : ""} href="/admin">Workspaces</a><a className={calendarPage ? "active" : ""} href="/admin/calendar">Calendar</a><a className={skillsPage ? "active" : ""} href="/admin/skills">Skill Hub</a></nav><a className="admin-view-site" href="/">View website ↗</a></aside>
    <main className="admin-main">{calendarPage ? <><header><div><span className="eyebrow">PORTFOLIO ADMIN</span><h1>Consultation calendar</h1></div><span className="admin-auth">Cloudflare Access</span></header><AdminCalendar/></> : skillsPage ? <><header><div><span className="eyebrow">PORTFOLIO ADMIN</span><h1>Skill Hub</h1></div><span className="admin-auth">Cloudflare Access</span></header><AdminSkills/></> : <div className="workspace-console">
      <aside className="workspace-list"><header><div><span className="eyebrow">WORKSPACES</span><strong>{workspaces.length}</strong></div><span className="workspace-list-actions"><button type="button" aria-label="Refresh workspaces" title="Refresh workspaces" onClick={() => void loadWorkspaces().catch((error: Error) => setNotice(error.message))}>↻</button><button type="button" aria-label="Create workspace" title="Create workspace" onClick={() => void createWorkspace()}>+</button></span></header><div className="workspace-group"><span>Managed</span>{managed.map((workspace) => <button className={selectedId === workspace.id ? "active" : ""} onClick={() => chooseWorkspace(workspace.id)} key={workspace.id}><i>M</i><div><strong>{workspace.title}</strong><small>{workspace.purpose}</small></div></button>)}</div><div className="workspace-group"><span>Visitor collaboration</span>{visitors.length === 0 ? <p>No visitor workspaces.</p> : visitors.map((workspace) => <button className={`${selectedId === workspace.id ? "active" : ""} ${workspace.status}`} onClick={() => chooseWorkspace(workspace.id)} key={workspace.id}><i>{workspace.title.slice(0,1).toUpperCase()}</i><div><strong>{workspace.title}</strong><small>{workspace.purpose}</small></div><b/></button>)}</div></aside>
      <section className="workspace-chat">{selected ? <><header><div><span className="eyebrow">{selected.kind === "managed" ? "MANAGED WORKSPACE" : "VISITOR WORKSPACE"}</span><h1>{selected.title}</h1><p>{selected.purpose}</p></div><div className="workspace-header-actions"><button onClick={() => setSettings(!settings)}>Tools & skills</button>{selected.kind === "visitor" && <button onClick={() => void archive()}>{selected.status === "archived" ? "Restore" : "Archive"}</button>}</div></header>{notice && <div className="notice">{notice}</div>}<div className="workspace-transcript">{messages.length === 0 && <div className="workspace-welcome"><span>&gt;_</span><h2>Start this workspace</h2><p>The agent keeps this workspace's history and uses only the tools and skills attached here.</p></div>}{messages.map((message) => <div className={`message ${message.sender === "owner" ? "user" : "assistant"} ${message.sender}`} key={message.id}><span>{message.senderName}</span><div className="message-body">{message.sender === "agent" ? <ChatResponse content={message.content}/> : <p>{message.content}</p>}</div></div>)}{busy && <div className="message assistant agent"><span>AGENT</span><div className="thinking">Working…</div></div>}</div>{selected.status === "active" && <form className="workspace-composer" onSubmit={send}>{selected.kind === "visitor" && <div className="recipient-switch"><button type="button" className={recipient === "visitor" ? "active" : ""} onClick={() => setRecipient("visitor")}><strong>Message visitor</strong><span>No agent inference</span></button><button type="button" className={recipient === "agent" ? "active" : ""} onClick={() => setRecipient("agent")}><strong>Ask workspace agent</strong><span>Use this context</span></button></div>}<div><textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={selected.kind === "visitor" && recipient === "visitor" ? `Reply to ${selected.title}…` : "Message this workspace agent…"}/><button disabled={busy || !input.trim()}>↑</button></div></form>}</> : <div className="state-message">Loading workspace…</div>}</section>
      {settings && selected && <aside className="workspace-settings"><header><div><span className="eyebrow">WORKSPACE CONFIGURATION</span><h2>Tools & skills</h2></div><button onClick={() => setSettings(false)}>×</button></header><p>Attachments apply only to <strong>{selected.title}</strong>. Other workspaces are unchanged.</p><div className="capability-list"><label><div><strong>Web search</strong><span>Search and fetch current public pages</span></div><input type="checkbox" checked={capabilities.webSearch} onChange={(event) => void saveCapabilities({ ...capabilities, webSearch: event.target.checked })}/></label><label><div><strong>Scheduling</strong><span>Run an instruction later in this workspace</span></div><input type="checkbox" checked={capabilities.scheduling} onChange={(event) => void saveCapabilities({ ...capabilities, scheduling: event.target.checked })}/></label></div><div className="workspace-skills"><header><strong>Attached skills</strong><a href="/admin/skills">Manage definitions →</a></header>{skills.length === 0 ? <p>No skills in the Skill Hub.</p> : skills.map((skill) => <label key={skill.slug}><input type="checkbox" checked={capabilities.skillSlugs.includes(skill.slug)} onChange={(event) => void saveCapabilities({ ...capabilities, skillSlugs: event.target.checked ? [...capabilities.skillSlugs, skill.slug] : capabilities.skillSlugs.filter((slug) => slug !== skill.slug) })}/><div><strong>{skill.name}</strong><span>{skill.description}</span><small>{skill.audience}</small></div></label>)}</div>{selected.kind === "visitor" && <div className="workspace-danger"><button onClick={() => void remove()}>Delete workspace permanently</button></div>}</aside>}
    </div>}</main>
  </div>;
}
