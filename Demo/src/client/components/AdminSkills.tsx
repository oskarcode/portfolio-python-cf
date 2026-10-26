// Application ownership: Access-protected skill editor, Computer explorer, and command tester.
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { ComputerFileEntry, SkillAudience, SkillRecord, SkillSummary } from "../../skills/types";

const blank = (): SkillRecord => ({ slug: "", name: "", description: "", audience: "both", enabled: true, markdown: "# Instructions\n\nDescribe when and how the agent should use this skill.", files: [], updatedAt: "", updatedBy: "" });

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the AdminSkills operation for this module.
 */
export function AdminSkills() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [files, setFiles] = useState<ComputerFileEntry[]>([]);
  const [root, setRoot] = useState("/workspace/skills");
  const [selected, setSelected] = useState<SkillRecord | null>(null);
  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null);
  const [command, setCommand] = useState("");
  const [commandResult, setCommandResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [skillData, computer] = await Promise.all([api.skills(), api.computerFiles()]);
    setSkills(skillData.skills); setFiles(computer.entries); setRoot(computer.root);
  };
  useEffect(() => { void load().catch((cause: Error) => setError(cause.message)); }, []);
  const openSkill = async (slug: string) => { setPreview(null); setSelected(await api.skill(slug)); setCommandResult(""); };
  const openFile = async (path: string) => { setSelected(null); setPreview(await api.computerFile(path)); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return; setBusy(true); setError("");
    try { const exists = skills.some((skill) => skill.slug === selected.slug); const saved = await api.saveSkill(selected, exists); setSelected(saved); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save skill"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await api.deleteSkill(selected.slug); setSelected(null); await load();
  };
  const run = async () => {
    if (!selected || !command.trim()) return; setBusy(true); setCommandResult("");
    try { const result = await api.runSkillCommand(selected.slug, command); setCommandResult(`exit ${result.exitCode} · ${result.status}\n${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`); }
    catch (cause) { setCommandResult(cause instanceof Error ? cause.message : "Command failed"); }
    finally { setBusy(false); }
  };

  return <section className="admin-page-panel skill-hub">
    <aside className="skill-browser"><div className="skill-browser-head"><strong>Skills</strong><button onClick={() => { setSelected(blank()); setPreview(null); }}>+ New</button></div>{skills.length === 0 ? <p className="empty">No skills yet.</p> : skills.map((skill) => <button className={`skill-list-row ${selected?.slug === skill.slug ? "active" : ""}`} onClick={() => void openSkill(skill.slug)} key={skill.slug}><strong>{skill.name}</strong><small>{skill.audience} · {skill.enabled ? "enabled" : "disabled"}</small><span>{skill.description}</span></button>)}<div className="computer-tree"><header><strong>Cloudflare Computer</strong><small>Connected</small></header><code>{root}</code>{files.map((file) => file.type === "dir" ? <div className="computer-dir" key={file.path}>▾ {file.path}</div> : <button onClick={() => void openFile(file.path)} key={file.path}>↳ {file.path}</button>)}</div></aside>
    <div className="skill-workspace">{error && <div className="notice error">{error}</div>}{preview ? <div className="file-preview"><span className="eyebrow">READ-ONLY COMPUTER FILE</span><h2>{preview.path}</h2><pre>{preview.content}</pre></div> : !selected ? <div className="skill-empty"><span>&gt;_</span><h2>Portfolio Skill Hub</h2><p>Create reusable behavior for visitor workspaces, the private content agent, or both. Each skill is stored as files in a durable Cloudflare Computer workspace.</p></div> : <form className="skill-form" onSubmit={save}><div className="skill-title"><div><span className="eyebrow">{skills.some((skill) => skill.slug === selected.slug) ? "EDIT SKILL" : "NEW SKILL"}</span><h2>{selected.name || "Untitled skill"}</h2></div><label className="toggle"><input type="checkbox" checked={selected.enabled} onChange={(event) => setSelected({ ...selected, enabled: event.target.checked })}/> Enabled</label></div><div className="skill-fields"><label>Name<input required value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })}/></label><label>Slug<input required disabled={skills.some((skill) => skill.slug === selected.slug)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={selected.slug} onChange={(event) => setSelected({ ...selected, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}/></label><label>Used by<select value={selected.audience} onChange={(event) => setSelected({ ...selected, audience: event.target.value as SkillAudience })}><option value="visitor">Visitor durable chat</option><option value="content">Content agent</option><option value="both">Both agents</option></select></label><label>Description<input required value={selected.description} onChange={(event) => setSelected({ ...selected, description: event.target.value })}/></label><label className="full">Skill instructions<textarea required rows={14} value={selected.markdown} onChange={(event) => setSelected({ ...selected, markdown: event.target.value })}/></label></div><div className="skill-actions"><button className="primary" disabled={busy}>Save skill</button>{skills.some((skill) => skill.slug === selected.slug) && <button type="button" className="danger" onClick={() => void remove()}>Delete</button>}</div>{skills.some((skill) => skill.slug === selected.slug) && <div className="command-runner"><header><div><strong>Test in Cloudflare Computer</strong><small>Runs inside /workspace/skills/{selected.slug}</small></div></header><div><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Example: jq . skill.json"/><button type="button" disabled={busy || !command.trim()} onClick={() => void run()}>Run command</button></div>{commandResult && <pre>{commandResult}</pre>}</div>}</form>}</div>
  </section>;
}
