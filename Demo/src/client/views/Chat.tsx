import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ChatMessage, WorkspaceMessage } from "../../shared/types";
import { ChatResponse, responseActions } from "../components/ChatResponse";

type DisplayMessage = ChatMessage & {
  sender?: WorkspaceMessage["sender"];
  senderName?: string;
  audience?: WorkspaceMessage["audience"];
};

const suggestions = ["What does Oskar build?", "Can he help with Cloudflare architecture?", "Show me relevant projects", "I want to work with Oskar"];
const displayWorkspace = (message: WorkspaceMessage): DisplayMessage => ({
  role: message.sender === "visitor" ? "user" : "assistant",
  content: message.content,
  sender: message.sender,
  senderName: message.senderName,
  audience: message.audience,
});

export function Chat() {
  const initialWorkspace = window.location.pathname.match(/^\/chat\/([^/]+)/)?.[1] ?? null;
  const [messages, setMessages] = useState<DisplayMessage[]>([{
    role: "assistant", sender: "agent", senderName: "Portfolio Agent",
    content: "Hi — tell me what you’re trying to learn, build, or solve. I’ll point you to the most relevant parts of Oskar’s work.",
  }]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspace);
  const [recipient, setRecipient] = useState<"owner" | "agent">("owner");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", company: "", intent: "" });
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    const refresh = () => api.workspaceHistory(workspaceId).then((data) => {
      if (active) setMessages(data.messages.map(displayWorkspace));
    }).catch(() => undefined);
    void refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [workspaceId]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    if (!workspaceId && /\b(add|talk to|contact|include|meet)\s+(oskar|him|you)\b/i.test(text)) {
      setContact((value) => ({ ...value, intent: text }));
      setMessages((value) => [...value,
        { role: "user", sender: "visitor", senderName: "You", content: text },
        { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: "Absolutely. I can create a private, persistent workspace and share this conversation with Oskar. I’ll need your name, email, and consent first." },
      ]);
      setHandoff(true); setInput(""); return;
    }

    const next: DisplayMessage[] = [...messages, {
      role: "user", sender: "visitor", senderName: "You", audience: workspaceId ? recipient : "agent", content: text,
    }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      if (workspaceId) {
        const result = await api.workspaceMessage(workspaceId, text, recipient);
        const answer = result.answer;
        if (answer) setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: answer }]);
      } else {
        const result = await api.chat(next.map(({ role, content }) => ({ role, content })));
        setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: result.answer }]);
      }
    } catch (error) {
      setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `I hit a temporary problem: ${error instanceof Error ? error.message : "Please try again."}` }]);
    } finally { setBusy(false); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const createHandoff = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const transcript = messages.map(({ role, content }) => ({ role, content }));
      const result = await api.handoff({ ...contact, transcript, consent: true });
      setWorkspaceId(result.workspaceId);
      history.replaceState(null, "", `/chat/${result.workspaceId}`);
      setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: result.answer }]);
      setHandoff(false);
    } catch (error) { alert(error instanceof Error ? error.message : "Could not create workspace"); }
    finally { setBusy(false); }
  };

  return <div className="chat-shell">
    <header className="chat-header"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Oskar Ablimit</span></a><div className="chat-status"><span className="status-dot"/>{workspaceId ? "Oskar + Agent · Persistent" : "Private · Clears on refresh"}</div><a href="/" className="close-chat">Website view ×</a></header>
    <div className="chat-main"><aside className="chat-intro"><span className="eyebrow">CONVERSATIONAL PORTFOLIO</span><h1>What can I help you find?</h1><p>Ask about capabilities, projects, writing, teaching, or ways to work together.</p><div className="privacy-note"><strong>{workspaceId ? "Shared workspace" : "Private by default"}</strong><p>{workspaceId ? "Use the two recipient buttons to message Oskar directly or ask the agent. Anyone with this private link can return to the workspace." : "This conversation lives only in this page and disappears when you refresh."}</p></div></aside>
      <section className="conversation" aria-live="polite"><div className="messages">{messages.map((message, index) => {
          const isAgent = message.role === "assistant" && (message.sender === "agent" || !message.sender);
          const actions = isAgent && index === messages.length - 1 ? responseActions(message.content, Boolean(workspaceId)) : [];
          return <div className={`message ${message.role} ${message.sender ?? ""}`} key={index}><span>{message.senderName ?? (message.role === "assistant" ? "AGENT" : "YOU")}{message.audience === "owner" && message.sender === "visitor" ? " → OSKAR" : ""}</span><div className="message-body">{isAgent ? <ChatResponse content={message.content}/> : message.content.split("\n").map((line, i) => <p key={i}>{line || <br/>}</p>)}{actions.length > 0 && <div className="response-actions">{actions.map((action) => action.href ? <a href={action.href} key={action.label}>{action.label} <span>→</span></a> : <button type="button" key={action.label} onClick={() => setHandoff(true)}>{action.label} <span>+</span></button>)}</div>}</div></div>;
        })}{busy && <div className="message assistant agent"><span>{workspaceId && recipient === "owner" ? "SENDING" : "AGENT"}</span><div className="thinking">{workspaceId && recipient === "owner" ? "Delivering to Oskar" : "Thinking"}<span>…</span></div></div>}<div ref={end}/></div>
        {!workspaceId && messages.length <= 2 && <div className="suggestions">{suggestions.map((value) => <button onClick={() => void send(value)} key={value}>{value}<span>→</span></button>)}</div>}
        {workspaceId && <div className="recipient-switch" role="group" aria-label="Message recipient"><button type="button" className={recipient === "owner" ? "active" : ""} onClick={() => setRecipient("owner")}><strong>Message Oskar</strong><span>No agent response</span></button><button type="button" className={recipient === "agent" ? "active" : ""} onClick={() => setRecipient("agent")}><strong>Ask the agent</strong><span>Get an immediate answer</span></button></div>}
        <form className="composer" onSubmit={submit}><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} placeholder={workspaceId ? (recipient === "owner" ? "Write a message to Oskar…" : "Ask the portfolio agent…") : "Ask a question or describe what you need…"} rows={2}/><div>{workspaceId ? <button type="button" className="add-oskar" onClick={() => void navigator.clipboard.writeText(window.location.href)}>Copy workspace link</button> : <button type="button" className="add-oskar" onClick={() => setHandoff(true)}>+ Add Oskar</button>}<button className="send-button" disabled={busy || !input.trim()} aria-label="Send">↑</button></div></form>
      </section></div>
    {handoff && <div className="modal-backdrop"><form className="handoff-modal" onSubmit={createHandoff}><button type="button" className="modal-close" onClick={() => setHandoff(false)}>×</button><span className="eyebrow">ADD OSKAR</span><h2>Turn this into a shared workspace</h2><p>Your conversation will become persistent and visible to Oskar. You can return with the private workspace link and choose whether each message goes to Oskar or the agent.</p><label>Name<input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}/></label><label>Email<input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}/></label><label>Company <small>optional</small><input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })}/></label><label>What would you like help with?<textarea required value={contact.intent} onChange={(e) => setContact({ ...contact, intent: e.target.value })}/></label><label className="consent"><input required type="checkbox"/> I consent to save and share this conversation with Oskar.</label><button className="button primary" disabled={busy}>Create shared workspace</button></form></div>}
  </div>;
}
