import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { ChatMessage, Lead } from "../../shared/types";

export function Admin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Tell me what you want to change. I’ll inspect the current content, propose a precise update, and use the approved content tools." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState("");
  const load = () => api.leads().then((data) => setLeads(data.leads)).catch((e: Error) => setNotice(e.message));
  useEffect(() => { void load(); }, []);

  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!input.trim() || busy) return;
    const text = input; setInput(""); setMessages((v) => [...v, { role: "user", content: text }]); setBusy(true);
    try { const result = await api.ownerChat(text); setMessages((v) => [...v, { role: "assistant", content: result.answer }]); }
    catch (error) { setMessages((v) => [...v, { role: "assistant", content: error instanceof Error ? error.message : "Request failed" }]); }
    finally { setBusy(false); }
  };
  const openLead = async (lead: Lead) => { setSelected(lead); const data = await api.workspace(lead.workspaceId); setTranscript(data.messages); };
  const importMedium = async () => { setBusy(true); try { const result = await api.importMedium(); setNotice(`Medium import complete: ${result.imported} imported, ${result.skipped} already present.`); } catch (e) { setNotice(e instanceof Error ? e.message : "Import failed"); } finally { setBusy(false); } };

  return <div className="admin-shell"><aside className="admin-sidebar"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Mission control</span></a><nav><a className="active" href="#agent">Content agent</a><a href="#inbox">Inbox <span>{leads.filter((l) => l.status === "new").length}</span></a><a href="/">View website ↗</a></nav><button onClick={importMedium} disabled={busy}>Import Medium articles</button></aside><main className="admin-main"><header><div><span className="eyebrow">PRIVATE ADMIN</span><h1>Portfolio mission control</h1></div><span className="admin-auth">Protected by Cloudflare Access</span></header>{notice && <div className="notice">{notice}</div>}<div className="admin-grid"><section className="admin-agent" id="agent"><h2>Content agent</h2><div className="admin-messages">{messages.map((m, i) => <div className={`message ${m.role}`} key={i}><span>{m.role === "assistant" ? "AGENT" : "YOU"}</span><div>{m.content}</div></div>)}{busy && <p>Working…</p>}</div><form onSubmit={send}><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Example: Draft a new capability section about durable AI agents…"/><button disabled={busy}>Send</button></form></section><section className="admin-inbox" id="inbox"><div className="inbox-heading"><h2>Conversations</h2><span>{leads.length} total</span></div>{leads.length === 0 ? <p className="empty">No visitors have added you yet.</p> : leads.map((lead) => <button className="lead-row" onClick={() => void openLead(lead)} key={lead.id}><div><strong>{lead.name}</strong><span>{lead.email}</span></div><p>{lead.intent}</p><time>{new Date(lead.updatedAt).toLocaleDateString()}</time></button>)}</section></div></main>{selected && <div className="lead-drawer"><button onClick={() => setSelected(null)}>×</button><span className="eyebrow">SHARED WORKSPACE</span><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}>{selected.email}</a><p>{selected.intent}</p><div className="drawer-transcript">{transcript.map((m, i) => <div className={`message ${m.role}`} key={i}><span>{m.role}</span><div>{m.content}</div></div>)}</div></div>}</div>;
}
