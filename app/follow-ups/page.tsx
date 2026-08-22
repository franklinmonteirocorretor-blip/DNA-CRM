"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import { DailyMissionTabs } from "../components/daily-mission-tabs";
import "./followups.css";

type Client = {
  id: number;
  name: string;
  phone: string | null;
  project_interest: string | null;
  funnel_stage: string | null;
  finance_stage: string | null;
  origin_type: string | null;
  next_action: string | null;
  next_action_at: string | null;
  due_at: string;
  cadence_step: string;
  queue_status: "overdue" | "today" | "scheduled";
};
type Event = {
  id: number;
  title: string;
  description: string | null;
  occurred_at: string;
};
const cadence = ["D0", "D1", "D3", "D7", "D15", "D30"];
const results = [
  "Não atendeu",
  "Não respondeu",
  "Retomou atendimento",
  "Agendou",
  "Enviar depois",
  "Pausar e programar retorno",
  "Cliente sem contato",
  "Cliente desistiu",
  "Cliente bloqueou o corretor",
];

function cadenceFor(client: Client) {
  if (client.cadence_step) return client.cadence_step;
  const when = client.next_action_at ? new Date(client.next_action_at) : null;
  if (!when) return "D0";
  const days = Math.max(
    0,
    Math.round((when.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000),
  );
  return days <= 0
    ? "D0"
    : days <= 1
      ? "D1"
      : days <= 3
        ? "D3"
        : days <= 7
          ? "D7"
          : days <= 15
            ? "D15"
            : "D30";
}

export default function FollowupsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tab, setTab] = useState("Hoje");
  const [result, setResult] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/follow-ups", { cache: "no-store" });
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    setClients(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const selected = clients.find((c) => c.id === selectedId) || null;
  useEffect(() => {
    if (!selectedId) {
      const timer = window.setTimeout(() => setEvents([]), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    fetch(`/api/clients/${selectedId}/events`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setEvents([]);
      });
    return () => controller.abort();
  }, [selectedId]);
  const now = new Date();
  const filtered = clients.filter((client) => {
    if (tab === "Vencidos") return client.queue_status === "overdue";
    if (tab === "Programados") return client.queue_status === "scheduled";
    return client.queue_status === "today";
  });
  const counts = {
    overdue: clients.filter((c) => c.queue_status === "overdue").length,
    today: clients.filter((c) => c.queue_status === "today").length,
    week: clients.filter(
      (c) => new Date(c.due_at).getTime() <= now.getTime() + 604800000,
    ).length,
    long: clients.filter((c) => cadenceFor(c) === "D30").length,
  };
  async function save() {
    const terminal = [
      "Cliente desistiu",
      "Cliente bloqueou o corretor",
    ].includes(result);
    if (!selected || !result || (!terminal && (!nextAction || !date))) {
      setNotice(
        terminal
          ? "Selecione o resultado."
          : "Defina resultado, próxima ação e data.",
      );
      return;
    }
    if ((terminal || result === "Cliente sem contato") && !note.trim()) {
      setNotice("Registre o contexto desse resultado.");
      return;
    }
    const nextActionAt = terminal
      ? null
      : new Date(`${date}T${time || "09:00"}:00`).toISOString();
    const newStage =
      result === "Cliente desistiu"
        ? "Desistiu"
        : result === "Cliente bloqueou o corretor"
          ? "Contato bloqueado"
          : result === "Cliente sem contato"
            ? "Reativação"
            : selected.funnel_stage;
    const response = await fetch(`/api/clients/${selected.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "FOLLOW_UP",
        title: `Follow-up: ${result}`,
        description: note,
        newStage,
        nextAction: terminal ? null : nextAction,
        nextActionAt,
        metricKey: terminal ? null : "follow_up",
      }),
    });
    if (!response.ok) {
      setNotice("Não foi possível salvar o follow-up.");
      return;
    }
    setNotice(
      terminal
        ? "Saída registrada na ficha e removida da fila ativa."
        : "Follow-up salvo e próxima ação programada.",
    );
    setResult("");
    setNextAction("");
    setNote("");
    await load();
  }
  const phone = selected?.phone?.replace(/\D/g, "") || "";
  const active = selected ? cadence.indexOf(cadenceFor(selected)) : 0;
  return (
    <main className="fu-shell">
      <aside className="fu-sidebar">
        <div className="fu-brand">
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro CRM"
            width={58}
            height={64}
          />
          <b>MONTEIRO</b>
          <span>CRM</span>
        </div>
        <CrmNavigation />
        <div className="fu-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor de imóveis</span>
          </div>
        </div>
      </aside>
      <section className="fu-main">
        <header className="fu-header">
          <div>
            <Link href="/">‹ Voltar</Link>
            <span>Recuperação e continuidade</span>
            <h1>Central de Follow-ups</h1>
            <p>
              Cadência inteligente, prioridade por vencimento e histórico do
              atendimento.
            </p>
          </div>
          <div className="fu-header-rule">
            <span>Regra operacional</span>
            <b>Nenhum cliente sem próxima ação</b>
          </div>
        </header>
        <DailyMissionTabs />
        <div className="fu-content">
          <section className="fu-scoreboard">
            <article className="critical">
              <span>Vencidos</span>
              <strong>{counts.overdue}</strong>
              <small>Ação imediata</small>
            </article>
            <article>
              <span>Para hoje</span>
              <strong>{counts.today}</strong>
              <small>Fila do dia</small>
            </article>
            <article>
              <span>Próximos 7 dias</span>
              <strong>{counts.week}</strong>
              <small>Cadência ativa</small>
            </article>
            <article>
              <span>Longo prazo</span>
              <strong>{counts.long}</strong>
              <small>Nutrição programada</small>
            </article>
            <div className="recovery">
              <span>Clientes em acompanhamento</span>
              <strong>{clients.length}</strong>
              <i>
                <span style={{ width: clients.length ? "100%" : "0%" }} />
              </i>
              <small>Somente registros reais</small>
            </div>
          </section>
          <section className="fu-workspace">
            <div className="fu-queue">
              <div className="fu-queue-head">
                <div>
                  <h2>Fila inteligente</h2>
                  <span>
                    Ordenada automaticamente pela cadência e pelo vencimento
                  </span>
                </div>
                <div>
                  {["Vencidos", "Hoje", "Programados"].map((item) => (
                    <button
                      className={tab === item ? "active" : ""}
                      onClick={() => setTab(item)}
                      key={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fu-list">
                {filtered.map((item) => (
                  <button
                    className={selectedId === item.id ? "selected" : ""}
                    onClick={() => {
                      setSelectedId(item.id);
                      setNotice("");
                    }}
                    key={item.id}
                  >
                    <i className="heat"></i>
                    <div className="fu-person">
                      <b>{item.name}</b>
                      <span>
                        {item.funnel_stage || "Em acompanhamento"} ·{" "}
                        {cadenceFor(item)}
                      </span>
                      <small>
                        {item.next_action || "Definir próxima ação"}
                      </small>
                    </div>
                    <div className="fu-due">
                      <b>
                        {new Date(item.due_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Fortaleza",
                        })}
                      </b>
                    </div>
                  </button>
                ))}
                {!filtered.length && (
                  <p className="fu-empty">
                    Nenhum follow-up real neste recorte.
                  </p>
                )}
              </div>
            </div>
            <div className="fu-focus">
              {selected ? (
                <>
                  <div className="fu-focus-head">
                    <div>
                      <span>Próxima melhor ação · {cadenceFor(selected)}</span>
                      <h2>{selected.name}</h2>
                      <p>{selected.next_action || "Defina a próxima ação"}</p>
                    </div>
                  </div>
                  <div className="fu-client-meta">
                    <span>
                      <b>Atendimento</b>
                      {selected.funnel_stage || "Não iniciado"}
                    </span>
                    <span>
                      <b>Financiamento</b>
                      {selected.finance_stage || "Não iniciado"}
                    </span>
                    <span>
                      <b>Cadência</b>
                      {cadenceFor(selected)}
                    </span>
                    <span>
                      <b>Origem</b>
                      {selected.origin_type || "Não informada"}
                    </span>
                  </div>
                  <div className="fu-actions">
                    <a href={phone ? `tel:+${phone}` : "#"}>
                      ☎ <span>Ligar agora</span>
                    </a>
                    <a
                      href={phone ? `https://wa.me/${phone}` : "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        src="/whatsapp.svg"
                        alt="WhatsApp"
                        width={18}
                        height={18}
                      />
                      <span>Abrir WhatsApp</span>
                    </a>
                  </div>
                  <section className="fu-script">
                    <div>
                      <span>Abordagem recomendada</span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            `Olá, ${selected.name.split(" ")[0]}. Estou retomando nosso atendimento. Posso falar com você agora?`,
                          )
                        }
                      >
                        Copiar mensagem
                      </button>
                    </div>
                    <p>
                      Olá, {selected.name.split(" ")[0]}. Estou retomando nosso
                      atendimento. Posso falar com você agora?
                    </p>
                  </section>
                  <section className="fu-result">
                    <label>Resultado desta tentativa</label>
                    <div>
                      {results.map((item) => (
                        <button
                          className={result === item ? "selected" : ""}
                          onClick={() => setResult(item)}
                          key={item}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="fu-next">
                      <label>
                        <span>Próxima ação obrigatória</span>
                        <select
                          value={nextAction}
                          onChange={(e) => setNextAction(e.target.value)}
                        >
                          <option value="">Selecione</option>
                          <option>Nova ligação</option>
                          <option>Mensagem WhatsApp</option>
                          <option>Enviar opção de imóvel</option>
                          <option>Cobrar documentos</option>
                          <option>Agendar visita</option>
                          <option>Revisar regularização</option>
                        </select>
                      </label>
                      <label>
                        <span>Data</span>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Horário</span>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </label>
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Registre contexto útil para a próxima abordagem"
                    />
                    <button className="fu-save" onClick={save}>
                      Salvar e avançar para o próximo
                    </button>
                    {notice && <small>{notice}</small>}
                  </section>
                </>
              ) : (
                <div className="fu-empty">Selecione um cliente da fila.</div>
              )}
            </div>
            <aside className="fu-context">
              <section>
                <div className="context-head">
                  <span>Cadência individual</span>
                  <b>{selected?.name || "Nenhum cliente"}</b>
                </div>
                <div className="cadence">
                  {cadence.map((day, index) => (
                    <article
                      className={
                        index === active
                          ? "active"
                          : index < active
                            ? "done"
                            : ""
                      }
                      key={day}
                    >
                      <i>{index < active ? "✓" : day}</i>
                      <div>
                        <b>{day}</b>
                        <span>
                          {index === active
                            ? selected?.next_action
                            : index < active
                              ? "ação registrada"
                              : "aguarda etapa anterior"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section>
                <div className="context-head">
                  <span>Histórico</span>
                  <b>Linha do tempo</b>
                </div>
                <div className="fu-timeline">
                  {events.map((item) => (
                    <article key={item.id}>
                      <i></i>
                      <div>
                        <span>
                          {new Date(item.occurred_at).toLocaleString("pt-BR")}
                        </span>
                        <b>{item.title}</b>
                        <p>{item.description}</p>
                      </div>
                    </article>
                  ))}
                  {!events.length && (
                    <p className="fu-empty">Nenhum movimento registrado.</p>
                  )}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}
