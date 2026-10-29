// Application ownership: Anonymous and durable visitor chat UI, routing, polling, and handoff.
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { CalendarSlot, ChatMessage, WorkspaceMessage } from "../../shared/types";
import { ChatResponse, responseActions } from "../components/ChatResponse";

type DisplayMessage = ChatMessage & {
  sender?: WorkspaceMessage["sender"];
  senderName?: string;
  audience?: WorkspaceMessage["audience"];
};

type BookingFlow =
  | { step: "slot"; slots: CalendarSlot[] }
  | { step: "name"; slot: CalendarSlot }
  | { step: "email"; slot: CalendarSlot; name: string }
  | { step: "topic"; slot: CalendarSlot; name: string; email: string };

const formatSlot = (value: string) => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));

const suggestions = [
  "Give me a quick overview of Oskar’s profile.",
  "What are Oskar’s main areas of expertise?",
  "How can Oskar help through consulting?",
  "Recommend a technical article from Oskar’s blog.",
  "Show me Oskar’s most relevant agentic AI projects.",
  "Tell me about Oskar’s graduate cloud computing course.",
  "I want to check availability for a technical sales consultation.",
  "I want to add Oskar and start a persistent conversation.",
];
const displayWorkspace = (message: WorkspaceMessage): DisplayMessage => ({
  role: message.sender === "visitor" ? "user" : "assistant",
  content: message.content,
  sender: message.sender,
  senderName: message.senderName,
  audience: message.audience,
});

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It submits one model turn and persists its result.
 */
export function Chat() {
  const initialWorkspace = window.location.pathname.match(/^\/chat\/([^/]+)/)?.[1] ?? null;
  const starterPrompt = new URLSearchParams(window.location.search).get("prompt")?.slice(0, 400) ?? "";
  const [messages, setMessages] = useState<DisplayMessage[]>([{
    role: "assistant", sender: "agent", senderName: "Portfolio Agent",
    content: "Hi — ask about Oskar’s profile, expertise, projects, teaching, writing, or consulting. This chat is anonymous and clears on refresh unless you explicitly choose Add Oskar.",
  }]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspace);
  const [recipient, setRecipient] = useState<"owner" | "agent">("owner");
  const [input, setInput] = useState(starterPrompt);
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [bookingFlow, setBookingFlow] = useState<BookingFlow | null>(null);
  const [bookingProfile, setBookingProfile] = useState<{ name: string; email: string; topic: string } | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", company: "", intent: "" });
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    const refresh = () => api.workspaceHistory(workspaceId).then((data) => {
      if (active) { setMessages(data.messages.map(displayWorkspace)); setBookingProfile(data.bookingProfile ?? null); }
    }).catch(() => undefined);
    void refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [workspaceId]);

  const reserveSlot = async (slot: CalendarSlot, profile: { name: string; email: string; topic: string }) => {
    setBusy(true);
    try {
      const result = await api.bookCalendarSlot({ slotId: slot.id, workspaceId: workspaceId ?? undefined, ...profile });
      setBookingFlow(null);
      setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `**Your meeting is confirmed.**\n\n**When:** ${formatSlot(result.booking.startsAt)}\n\n**Topic:** ${result.booking.topic}\n\nA confirmation email is being sent to **${result.booking.email}**, and Oskar has been notified. [Add the meeting to your calendar with a 24-hour reminder](${result.calendarUrl}).` }]);
    } catch (error) { setBookingFlow(null); setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `I couldn’t reserve that time: ${error instanceof Error ? error.message : "Please try again."}` }]); }
    finally { setBusy(false); }
  };

  const send = async (text: string) => {
    const answer = text.trim();
    if (!answer || busy) return;
    if (bookingFlow) {
      const userMessage: DisplayMessage = { role: "user", sender: "visitor", senderName: "You", content: answer };
      setInput("");
      if (/^(cancel|stop|never mind)$/i.test(answer)) { setBookingFlow(null); setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: "No problem — I cancelled the booking process. No time was reserved." }]); return; }
      if (bookingFlow.step === "slot") {
        const selected = bookingFlow.slots[Number.parseInt(answer, 10) - 1];
        if (!selected) { setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `Please reply with a number from 1 to ${bookingFlow.slots.length}, or type **cancel**.` }]); return; }
        if (bookingProfile) {
          setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `Great — I’ll use the name, email, and topic from your handoff form to reserve **${formatSlot(selected.startsAt)}**.` }]);
          await reserveSlot(selected, bookingProfile); return;
        }
        setBookingFlow({ step: "name", slot: selected });
        setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `Great — **${formatSlot(selected.startsAt)}**. What name should I put on the meeting?` }]); return;
      }
      if (bookingFlow.step === "name") {
        setBookingFlow({ step: "email", slot: bookingFlow.slot, name: answer.slice(0, 120) });
        setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: "What email address should receive the confirmation and calendar reminder?" }]); return;
      }
      if (bookingFlow.step === "email") {
        if (!answer.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: "That email address does not look complete. Please enter a valid address, or type **cancel**." }]); return; }
        setBookingFlow({ step: "topic", slot: bookingFlow.slot, name: bookingFlow.name, email: answer.slice(0, 254) });
        setMessages((value) => [...value, userMessage, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: "Finally, what would you like to discuss with Oskar?" }]); return;
      }
      setMessages((value) => [...value, userMessage]);
      await reserveSlot(bookingFlow.slot, { name: bookingFlow.name, email: bookingFlow.email, topic: answer });
      return;
    }
    const repeatsAvailabilityCheck = /^(check|try|look)( again)?[.!]?$/i.test(answer)
      && messages.slice(-3).some((message) => /consultation times|available times|open consultation|public consultation times/i.test(message.content));
    if (/\b(check|show|book|schedule|see|want)\b.*\b(availability|available|calendar|consultation|meeting|time)\b/i.test(answer) || repeatsAvailabilityCheck) {
      setMessages((value) => [...value, { role: "user", sender: "visitor", senderName: "You", content: answer }]); setInput(""); setBusy(true);
      try {
        const { slots } = await api.calendarSlots();
        if (slots.length === 0) setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: "Oskar does not have any public consultation times open right now. You can use **Add Oskar** to request another time." }]);
        else { setBookingFlow({ step: "slot", slots }); setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `Here are Oskar’s available times in your timezone:\n\n${slots.map((slot, index) => `${index + 1}. **${formatSlot(slot.startsAt)}** · ${Math.round((new Date(slot.endsAt).valueOf() - new Date(slot.startsAt).valueOf()) / 60_000)} minutes`).join("\n")}\n\nReply with the **number** you want, or type **cancel**.` }]); }
      } catch (error) { setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: `I couldn’t load availability: ${error instanceof Error ? error.message : "Please try again."}` }]); }
      finally { setBusy(false); }
      return;
    }
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
      setBookingProfile({ name: contact.name, email: contact.email, topic: contact.intent });
      history.replaceState(null, "", `/chat/${result.workspaceId}`);
      setMessages((value) => [...value, { role: "assistant", sender: "agent", senderName: "Portfolio Agent", content: result.answer }]);
      setHandoff(false);
    } catch (error) { alert(error instanceof Error ? error.message : "Could not create workspace"); }
    finally { setBusy(false); }
  };

  return <div className="chat-shell">
    <header className="chat-header"><a className="brand" href="/"><span className="brand-mark">OA</span><span>Oskar Ablimit</span></a><div className="chat-status"><span className="status-dot"/>{workspaceId ? "Oskar + Agent · Persistent" : "Anonymous · Clears on refresh"}</div><a href="/" className="close-chat">Website view ×</a></header>
    <div className="chat-main"><aside className="chat-intro"><span className="eyebrow">CONVERSATIONAL PORTFOLIO</span><h1>What would you like to explore?</h1><p>The agent can use Oskar’s published portfolio and article catalog. It has no access to private information or workspace tools in anonymous mode.</p><div className="privacy-note"><strong>{workspaceId ? "Shared workspace" : "Private by default"}</strong><p>{workspaceId ? "Use the two recipient buttons to message Oskar directly or ask the agent. Anyone with this private link can return to the workspace." : "This conversation stays in browser memory and disappears when you refresh. Nothing is shared with Oskar unless you explicitly add him and consent."}</p></div></aside>
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
