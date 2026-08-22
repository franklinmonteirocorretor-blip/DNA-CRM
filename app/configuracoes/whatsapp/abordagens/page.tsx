"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CrmNavigation } from "../../../components/crm-navigation";
import "../whatsapp.css";
import "../layout-fixes.css";
import "./approaches.css";

type Cadence = { id: string; name: string; description?: string; active: boolean; steps: { id: string; step_key: string; day_offset: number }[] };
type Approach = { id: string; name: string; objective: string; cadence_id: string; active: boolean };
type Template = { id: string; approach_id: string; name: string; active: boolean; versions: { version: number; body: string; active: boolean }[] };
type Library = { cadences: Cadence[]; approaches: Approach[]; templates: Template[] };

const empty: Library = { cadences: [], approaches: [], templates: [] };
const panel = { border: "1px solid #332b1d", background: "#0e0e0e", padding: 20, marginBottom: 16 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 };
const field = { background: "#080808", border: "1px solid #806529", color: "#fff", padding: 10, width: "100%" };
const button = { background: "linear-gradient(135deg,#e7bd61,#a87b26)", border: 0, color: "#080808", fontWeight: 800, padding: "10px 15px", cursor: "pointer" };

export default function WhatsAppApproachesPage() {
  const [library, setLibrary] = useState<Library>(empty), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [cadence, setCadence] = useState({ name: "", description: "", days: "0,1,3,7,15,30" });
  const [approach, setApproach] = useState({ name: "", objective: "", cadenceId: "" });
  const [template, setTemplate] = useState({ approachId: "", name: "", body: "" });

  const load = useCallback(async () => {
    const response = await fetch("/api/whatsapp-dispatcher/library", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Falha ao carregar configurações."); return; }
    setLibrary(data);
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function submit(event: FormEvent, payload: Record<string, unknown>, reset: () => void) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/whatsapp-dispatcher/library", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setMessage(response.ok ? "Cadastro salvo. Nenhuma mensagem foi enviada." : data.error || "Falha ao salvar.");
    if (response.ok) { reset(); await load(); }
    setBusy(false);
  }
  async function toggle(entity: "cadence" | "approach" | "template", id: string, active: boolean) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/whatsapp-dispatcher/library", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id, active }) });
    const data = await response.json();
    setMessage(response.ok ? "Estado atualizado. Nenhuma mensagem foi enviada." : data.error || "Falha ao atualizar.");
    if (response.ok) await load(); setBusy(false);
  }

  return <main className="wa-shell"><aside className="wa-sidebar"><div className="wa-brand"><Image src="/monteiro-logo.png" alt="Monteiro CRM" width={58} height={64}/><b>MONTEIRO</b><span>CRM</span></div><CrmNavigation /><div className="wa-user"><i>FM</i><div><b>Franklin Monteiro</b><span>Corretor + Gestor</span></div></div></aside><section className="wa-main"><header className="wa-header"><div><span>Configurações / WhatsApp / Abordagens</span><h1>Biblioteca de disparos</h1><p>Abordagens, modelos versionados e cadências. Esta tela nunca envia mensagens.</p></div><div className="wa-status offline"><small>Segurança</small><b>CONFIGURAÇÃO APENAS</b></div></header><div className="wa-content wa-library">
    {message && <div className="wa-message" role="status" aria-live="polite">{message}</div>}
    <section style={panel}><h2>Nova cadência</h2><form style={grid} onSubmit={(event) => submit(event, { action: "createCadence", name: cadence.name, description: cadence.description, dayOffsets: cadence.days.split(",").map((value) => Number(value.trim())) }, () => setCadence({ name: "", description: "", days: "0,1,3,7,15,30" }))}><input style={field} aria-label="Nome da cadência" placeholder="Nome" value={cadence.name} onChange={(event) => setCadence({ ...cadence, name: event.target.value })} required /><input style={field} aria-label="Descrição da cadência" placeholder="Descrição" value={cadence.description} onChange={(event) => setCadence({ ...cadence, description: event.target.value })} /><input style={field} aria-label="Dias da cadência" placeholder="0,1,3,7,15,30" value={cadence.days} onChange={(event) => setCadence({ ...cadence, days: event.target.value })} required /><button style={button} disabled={busy}>Salvar cadência</button></form></section>
    <section style={panel}><h2>Nova abordagem</h2><form style={grid} onSubmit={(event) => submit(event, { action: "createApproach", ...approach }, () => setApproach({ name: "", objective: "", cadenceId: "" }))}><input style={field} aria-label="Nome da abordagem" placeholder="Nome" value={approach.name} onChange={(event) => setApproach({ ...approach, name: event.target.value })} required /><input style={field} aria-label="Objetivo da abordagem" placeholder="Objetivo" value={approach.objective} onChange={(event) => setApproach({ ...approach, objective: event.target.value })} required /><select style={field} aria-label="Cadência da abordagem" value={approach.cadenceId} onChange={(event) => setApproach({ ...approach, cadenceId: event.target.value })} required><option value="" disabled>Selecione a cadência</option>{library.cadences.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button style={button} disabled={busy}>Salvar abordagem</button></form></section>
    <section style={panel}><h2>Novo modelo ou versão</h2><form style={grid} onSubmit={(event) => submit(event, { action: "createTemplate", ...template }, () => setTemplate({ approachId: "", name: "", body: "" }))}><select style={field} aria-label="Abordagem do modelo" value={template.approachId} onChange={(event) => setTemplate({ ...template, approachId: event.target.value })} required><option value="" disabled>Selecione a abordagem</option>{library.approaches.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input style={field} aria-label="Nome do modelo" placeholder="Nome; repita para criar nova versão" value={template.name} onChange={(event) => setTemplate({ ...template, name: event.target.value })} required /><textarea style={{ ...field, minHeight: 86 }} aria-label="Texto do modelo" placeholder="Olá, {{primeiro_nome}}..." value={template.body} onChange={(event) => setTemplate({ ...template, body: event.target.value })} required /><button style={button} disabled={busy}>Salvar modelo</button></form></section>
    <section style={panel}><h2>Cadências</h2>{library.cadences.map((item) => <article key={item.id} style={{ ...grid, borderTop: "1px solid #2c261b", padding: "12px 0", alignItems: "center" }}><div><b>{item.name}</b><p>{item.steps.map((step) => step.step_key).join(" · ")}</p></div><span>{item.active ? "Ativa" : "Inativa"}</span><button style={button} disabled={busy} onClick={() => toggle("cadence", item.id, !item.active)}>{item.active ? "Desativar" : "Ativar"}</button></article>)}</section>
    <section style={panel}><h2>Abordagens e modelos</h2>{library.approaches.map((item) => <article key={item.id} style={{ borderTop: "1px solid #2c261b", padding: "12px 0" }}><div style={grid}><div><b>{item.name}</b><p>{item.objective}</p></div><span>{item.active ? "Ativa" : "Inativa"}</span><button style={button} disabled={busy} onClick={() => toggle("approach", item.id, !item.active)}>{item.active ? "Desativar" : "Ativar"}</button></div>{library.templates.filter((model) => model.approach_id === item.id).map((model) => <div key={model.id} style={{ ...grid, background: "#141414", padding: 10, alignItems: "center" }}><div><strong>{model.name}</strong><small style={{ display: "block", color: "#aaa" }}>Versão {model.versions[0]?.version || 0}: {model.versions[0]?.body || "Sem conteúdo"}</small></div><span>{model.active ? "Ativo" : "Inativo"}</span><button style={button} disabled={busy} onClick={() => toggle("template", model.id, !model.active)}>{model.active ? "Desativar" : "Ativar"}</button></div>)}</article>)}</section>
  </div></section></main>;
}
