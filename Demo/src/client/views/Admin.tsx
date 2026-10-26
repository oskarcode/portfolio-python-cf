import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { ChatMessage, Lead, WorkspaceMessage } from "../../shared/types";

export function Admin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Tell me what you want to change. I’ll inspect the current content, propose a precise update, and use the approved content tools." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [transcript, setTranscript] = useState<WorkspaceMessage[]>([]);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => api.leads().then((data) => setLeads(data.leads)).catch((e: Error) => setNotice(e.message));
  const refreshWorkspace = async (lead: Lead) => {
    const data = await api.workspace(lead.workspaceId);
    setTranscript(data.messages);
  };
  useEffect(() => { void load(); }, []);

  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!input.trim() || busy) return;
    const text = input; setInput(""); setMessages((value) => [...value, { role: "user", content: text }]); setBusy(true);
    try { const result = await api.ownerChat(text); setMessages((value) => [...value, { role: "assistant", content: result.answer }]); }
    catch (error) { setMessages((value) => [...value, { role: "assistant", content: error instanceof Error ? error.message : "Request failed" }]); }
    finally { setBusy(false); }
  };
  const openLead = async (lead: Lead) => { setSelected(lead); await refreshWorkspace(lead); };
  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !reply.trim()) return;
    setBusy(true);
    try { await api.ownerReply(selected.workspaceId, reply); setReply(""); await refreshWorkspace(selected); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Reply failed"); }
    finally { setBusy(false); }
  };
  const toggleArchive = async () => {
    if (!selected) return;
    if (selected.workspaceStatus === "archived") await api.restoreWorkspace(selected.workspaceId);
    else await api.archiveWorkspace(selected.workspaceId);
    const next = { ...selected, workspaceStatus: selected.workspaceStatus === "archived" ? "active" as const : "archived" as const };
    setSelected(next); await load();
  };
  const removeWorkspace = async () => {
    if (!selected || !confirm(`Permanently delete the workspace with ${selected.name}? This cannot be undone.`)) return;
    await api.deleteWorkspace(selected.workspaceId); setSelected(null); setTranscript([]); await load();
  };
  const importMedium = async () => {
    setBusy(true);
    try { const result = await api.importMedium(); setNotice(`Medium import complete: ${result.imported} imported, ${result.skipped} already present.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Import failed"); }
    finally { setBusy(false); }
  };

  return <div className="admin-shell"><aside className="admin-sidebar"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Mission control</span></a><nav><a className="active" href="#agent">Content agent</a><a href="#inbox">Inbox <span>{leads.filter((lead) => lead.status === "new").length}</span></a><a href="/">View website ↗</a></nav><button onClick={importMedium} disabled={busy}>Import Medium articles</button></aside><main className="admin-main"><header><div><span className="eyebrow">PRIVATE ADMIN</span><h1>Portfolio mission control</h1></div><span className="admin-auth">Protected by Cloudflare Access</span></header>{notice && <div className="notice">{notice}</div>}<div className="admin-grid"><section className="admin-agent" id="agent"><h2>Content agent</h2><div className="admin-messages">{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span>{message.role === "assistant" ? "AGENT" : "YOU"}</span><div>{message.content}</div></div>)}{busy && <p>Working…</p>}</div><form onSubmit={send}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Example: Draft a new capability section about durable AI agents…"/><button disabled={busy}>Send</button></form></section><section className="admin-inbox" id="inbox"><div className="inbox-heading"><h2>Conversations</h2><span>{leads.length} total</span></div>{leads.length === 0 ? <p className="empty">No visitors have added you yet.</p> : leads.map((lead) => <button className={`lead-row ${lead.workspaceStatus}`} onClick={() => void openLead(lead)} key={lead.id}><div><strong>{lead.name}</strong><span>{lead.workspaceStatus}</span></div><p>{lead.intent}</p><time>{new Date(lead.updatedAt).toLocaleDateString()}</time></button>)}</section></div></main>{selected && <aside className="lead-drawer"><button className="drawer-close" onClick={() => setSelected(null)}>×</button><span className="eyebrow">{selected.workspaceStatus === "archived" ? "ARCHIVED WORKSPACE" : "SHARED WORKSPACE"}</span><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}>{selected.email}</a><p>{selected.intent}</p><div className="workspace-actions"><button onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/chat/${selected.workspaceId}`)}>Copy invite URL</button><button onClick={() => void toggleArchive()}>{selected.workspaceStatus === "archived" ? "Restore" : "Archive"}</button><button className="danger" onClick={() => void removeWorkspace()}>Delete</button></div><div className="drawer-transcript">{transcript.map((message) => <div className={`message ${message.sender === "visitor" ? "user" : "assistant"} ${message.sender}`} key={message.id}><span>{message.senderName}{message.audience === "owner" && message.sender === "visitor" ? " → YOU" : ""}</span><div>{message.content}</div></div>)}</div>{selected.workspaceStatus === "active" && <form className="owner-reply" onSubmit={sendReply}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${selected.name} as Oskar…`}/><button disabled={busy || !reply.trim()}>Send reply</button></form>}</aside>}</div>;
}
