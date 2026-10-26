import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ChatMessage } from "../../shared/types";

const suggestions = ["What does Oskar build?", "Can he help with Cloudflare architecture?", "Show me relevant projects", "I want to work with Oskar"];

export function Chat() {
  const initialWorkspace = window.location.pathname.match(/^\/chat\/([^/]+)/)?.[1] ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi — tell me what you’re trying to learn, build, or solve. I’ll point you to the most relevant parts of Oskar’s work." }]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspace);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", company: "", intent: "" });
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (!initialWorkspace) return;
    api.workspaceHistory(initialWorkspace).then((data) => setMessages(data.messages.length ? data.messages : messages)).catch(() => undefined);
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    if (/\b(add|talk to|contact|include|meet)\s+(oskar|him|you)\b/i.test(text)) {
      setContact((value) => ({ ...value, intent: text }));
      setMessages((value) => [...value, { role: "user", content: text }, { role: "assistant", content: "Absolutely. I can create a private, persistent workspace and share this conversation with Oskar. I’ll need your name, email, and consent first." }]);
      setHandoff(true); setInput(""); return;
    }
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const result = workspaceId ? await api.workspaceChat(workspaceId, text) : await api.chat(next);
      setMessages((value) => [...value, { role: "assistant", content: result.answer }]);
    } catch (error) {
      setMessages((value) => [...value, { role: "assistant", content: `I hit a temporary problem: ${error instanceof Error ? error.message : "Please try again."}` }]);
    } finally { setBusy(false); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const createHandoff = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api.handoff({ ...contact, transcript: messages, consent: true });
      setWorkspaceId(result.workspaceId);
      history.replaceState(null, "", `/chat/${result.workspaceId}`);
      setMessages((value) => [...value, { role: "assistant", content: result.answer }]);
      setHandoff(false);
    } catch (error) { alert(error instanceof Error ? error.message : "Could not create workspace"); }
    finally { setBusy(false); }
  };

  return <div className="chat-shell">
    <header className="chat-header"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Oskar Ablimit</span></a><div className="chat-status"><span className="status-dot"/>{workspaceId ? "Oskar is included · Persistent" : "Private · Clears on refresh"}</div><a href="/" className="close-chat">Website view ×</a></header>
    <div className="chat-main"><aside className="chat-intro"><span className="eyebrow">CONVERSATIONAL PORTFOLIO</span><h1>What can I help you find?</h1><p>Ask about capabilities, projects, writing, teaching, or ways to work together.</p><div className="privacy-note"><strong>{workspaceId ? "Persistent workspace" : "Private by default"}</strong><p>{workspaceId ? "This conversation is saved because you added Oskar." : "This conversation lives only in this page and disappears when you refresh."}</p></div></aside>
      <section className="conversation" aria-live="polite"><div className="messages">{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span>{message.role === "assistant" ? "OA" : "YOU"}</span><div>{message.content.split("\n").map((line, i) => <p key={i}>{line || <br/>}</p>)}</div></div>)}{busy && <div className="message assistant"><span>OA</span><div className="thinking">Thinking<span>…</span></div></div>}<div ref={end}/></div>
        {messages.length <= 2 && <div className="suggestions">{suggestions.map((value) => <button onClick={() => void send(value)} key={value}>{value}<span>→</span></button>)}</div>}
        <form className="composer" onSubmit={submit}><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} placeholder="Ask a question or describe what you need…" rows={2}/><div><button type="button" className="add-oskar" onClick={() => setHandoff(true)}>+ Add Oskar</button><button className="send-button" disabled={busy || !input.trim()} aria-label="Send">↑</button></div></form>
      </section></div>
    {handoff && <div className="modal-backdrop"><form className="handoff-modal" onSubmit={createHandoff}><button type="button" className="modal-close" onClick={() => setHandoff(false)}>×</button><span className="eyebrow">ADD OSKAR</span><h2>Turn this into a shared workspace</h2><p>Your conversation will become persistent and visible to Oskar. Nothing is saved until you submit this form.</p><label>Name<input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}/></label><label>Email<input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}/></label><label>Company <small>optional</small><input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })}/></label><label>What would you like help with?<textarea required value={contact.intent} onChange={(e) => setContact({ ...contact, intent: e.target.value })}/></label><label className="consent"><input required type="checkbox"/> I consent to save and share this conversation with Oskar.</label><button className="button primary" disabled={busy}>Create shared workspace</button></form></div>}
  </div>;
}
