"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { DailyMissionTabs } from "../components/daily-mission-tabs";
import { useEffect, useMemo, useState } from "react";
import "./agenda.css";
import "./agenda-history.css";
import "./attendance-outcome.css";

type Kind =
  | "Visita ao imóvel"
  | "Atendimento presencial"
  | "Apresentação de proposta"
  | "Gravação de imóvel"
  | "Stories / conteúdo"
  | "Tarefa interna";
type Status =
  | "Confirmado"
  | "A confirmar"
  | "Compareceu"
  | "Não compareceu"
  | "Concluído";
type Event = {
  id: number;
  dbId?: number;
  clientId?: number;
  startsAt?: string;
  nextAt?: string;
  time: string;
  end: string;
  title: string;
  kind: Kind;
  status: Status;
  client?: string;
  phone?: string;
  project?: string;
  stage: string;
  place: string;
  objective: string;
  next: string;
  color: string;
};

const initialEvents: Event[] = [
  {
    id: 1,
    time: "08:00",
    end: "08:30",
    title: "Confirmação de visitas do dia",
    kind: "Tarefa interna",
    status: "Concluído",
    stage: "Operação",
    place: "Monteiro CRM",
    objective: "Confirmar presença e reduzir faltas",
    next: "Atualizar confirmação de cada cliente",
    color: "blue",
  },
  {
    id: 2,
    time: "09:00",
    end: "10:00",
    title: "Visita ao decorado",
    kind: "Visita ao imóvel",
    status: "Compareceu",
    client: "Camila Monteiro",
    phone: "5586998112233",
    project: "Village Garden II",
    stage: "Visita",
    place: "Stand MC Engenharia",
    objective: "Validar aderência e avançar para proposta",
    next: "Montar proposta hoje às 14:00",
    color: "green",
  },
  {
    id: 3,
    time: "10:30",
    end: "11:15",
    title: "Atendimento de qualificação",
    kind: "Atendimento presencial",
    status: "Confirmado",
    client: "Rodrigo Santos",
    phone: "5586984664369",
    project: "Village dos Pássaros II",
    stage: "Agendamento",
    place: "Escritório Monteiro",
    objective: "Concluir perfil MCMV e solicitar pré-análise",
    next: "Registrar comparecimento ao finalizar",
    color: "gold",
  },
  {
    id: 4,
    time: "12:00",
    end: "12:40",
    title: "Gravação da unidade decorada",
    kind: "Gravação de imóvel",
    status: "Confirmado",
    project: "Village Natureza",
    stage: "Produção de conteúdo",
    place: "Canopus · Timon",
    objective: "Produzir vídeo vertical e tour rápido",
    next: "Editar e programar publicação",
    color: "purple",
  },
  {
    id: 5,
    time: "14:00",
    end: "15:00",
    title: "Apresentação da proposta",
    kind: "Apresentação de proposta",
    status: "A confirmar",
    client: "Nicolle Cristine",
    phone: "5586999964566",
    project: "Village dos Pássaros II",
    stage: "Proposta",
    place: "Escritório Monteiro",
    objective: "Apresentar composição e buscar fechamento",
    next: "Confirmar presença até 12:00",
    color: "orange",
  },
  {
    id: 6,
    time: "16:30",
    end: "17:30",
    title: "Visita de resgate",
    kind: "Visita ao imóvel",
    status: "Não compareceu",
    client: "Fernanda Souza",
    phone: "5586997443322",
    project: "Alto Belo Leste",
    stage: "Visita",
    place: "Stand de vendas",
    objective: "Retomar cliente aprovado sem fechamento",
    next: "Entrar na cadência D1 e reagendar",
    color: "red",
  },
  {
    id: 7,
    time: "18:00",
    end: "18:30",
    title: "Stories: condições da semana",
    kind: "Stories / conteúdo",
    status: "A confirmar",
    stage: "Produção de conteúdo",
    place: "Instagram",
    objective: "Gerar novos leads qualificados",
    next: "Registrar leads originados pelo conteúdo",
    color: "purple",
  },
];

const days = [
  { d: "10", w: "SEG" },
  { d: "11", w: "TER" },
  { d: "12", w: "QUA" },
  { d: "13", w: "QUI" },
  { d: "14", w: "SEX" },
  { d: "15", w: "SÁB" },
  { d: "16", w: "DOM" },
];
initialEvents.splice(0);
const kinds = ["Todos", "Comercial", "Conteúdo", "Interno"] as const;
const history = [
  {
    date: "08/08/2026",
    time: "15:00",
    client: "Lucas Almeida",
    event: "Assinatura da proposta",
    type: "Apresentação de proposta",
    status: "Compareceu",
    stage: "Fechamento",
    result: "Venda confirmada",
  },
  {
    date: "07/08/2026",
    time: "09:30",
    client: "Mariana Costa",
    event: "Visita ao decorado",
    type: "Visita ao imóvel",
    status: "Compareceu",
    stage: "Visita",
    result: "Proposta enviada",
  },
  {
    date: "06/08/2026",
    time: "16:00",
    client: "Aline Ribeiro",
    event: "Atendimento presencial",
    type: "Atendimento presencial",
    status: "Não compareceu",
    stage: "Agendamento",
    result: "Resgate D1 criado",
  },
  {
    date: "05/08/2026",
    time: "11:00",
    client: "Felipe Sousa",
    event: "Apresentação de simulação",
    type: "Apresentação de proposta",
    status: "Compareceu",
    stage: "Proposta",
    result: "Em negociação",
  },
  {
    date: "03/08/2026",
    time: "10:00",
    client: "Camila Monteiro",
    event: "Visita de qualificação",
    type: "Visita ao imóvel",
    status: "Compareceu",
    stage: "Visita",
    result: "Pré-análise solicitada",
  },
  {
    date: "01/08/2026",
    time: "17:30",
    client: "—",
    event: "Gravação Village Garden",
    type: "Gravação de imóvel",
    status: "Concluído",
    stage: "Conteúdo",
    result: "6 leads originados",
  },
];
history.splice(0);
const periodData = {
  Semana: {
    scheduled: 18,
    confirmed: 14,
    attended: 10,
    noShow: 4,
    sales: 4,
    label: "10–16 de agosto",
  },
  Mês: {
    scheduled: 72,
    confirmed: 57,
    attended: 41,
    noShow: 16,
    sales: 9,
    label: "Agosto de 2026",
  },
  Trimestre: {
    scheduled: 196,
    confirmed: 151,
    attended: 108,
    noShow: 43,
    sales: 21,
    label: "3º trimestre de 2026",
  },
  Ano: {
    scheduled: 684,
    confirmed: 532,
    attended: 377,
    noShow: 155,
    sales: 68,
    label: "Ano de 2026",
  },
};
Object.values(periodData).forEach((period) =>
  Object.assign(period, {
    scheduled: 0,
    confirmed: 0,
    attended: 0,
    noShow: 0,
    sales: 0,
  }),
);

const emptyEvent: Event = {
  id: 0,
  time: "--:--",
  end: "--:--",
  title: "Nenhum compromisso selecionado",
  kind: "Tarefa interna",
  status: "A confirmar",
  stage: "Agenda",
  place: "Sem local definido",
  objective: "Cadastre o primeiro compromisso real",
  next: "Use o botão Novo compromisso",
  color: "gold",
};

export default function AgendaPage() {
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState<(typeof kinds)[number]>("Todos");
  const [selected, setSelected] = useState<Event>(emptyEvent);
  const [formOpen, setFormOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    kind: "Visita ao imóvel",
    clientId: "",
    startsAt: "",
    place: "",
    objective: "",
    nextAction: "",
    nextActionAt: "",
  });
  const [day, setDay] = useState("10");
  const [view, setView] = useState<keyof typeof periodData>("Semana");
  const [search, setSearch] = useState("");
  const [historyType, setHistoryType] = useState("Todos os eventos");
  const [historyStatus, setHistoryStatus] = useState("Todos os resultados");
  const [outcome, setOutcome] = useState(
    "Vai enviar documentação para pré-análise",
  );
  const [attendanceNotes, setAttendanceNotes] = useState(
    "Cliente conheceu o empreendimento, confirmou interesse e solicitou simulação conforme o perfil MCMV.",
  );
  const [nextDate, setNextDate] = useState("2026-08-11T09:00");
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  useEffect(() => {
    fetch("/api/clients?limit=5000")
      .then((r) => (r.ok ? r.json() : []))
      .then(setClients)
      .catch(() => {});
  }, []);
  const loadAppointments = () => {
    fetch("/api/appointments")
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Array<Record<string, unknown>>) => {
        const synced = rows.map((row) => {
          const start = new Date(String(row.starts_at));
          const end = row.ends_at
            ? new Date(String(row.ends_at))
            : new Date(start.getTime() + 3600000);
          return {
            id: 10000 + Number(row.id),
            dbId: Number(row.id),
            clientId: row.client_id ? Number(row.client_id) : undefined,
            startsAt: String(row.starts_at),
            nextAt: row.next_action_at ? String(row.next_action_at) : undefined,
            time: start.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            end: end.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            title: String(row.kind),
            kind: String(row.kind) as Kind,
            status: String(row.status) as Status,
            client: row.client_name ? String(row.client_name) : undefined,
            phone: row.phone ? String(row.phone) : undefined,
            project: row.project_interest
              ? String(row.project_interest)
              : undefined,
            stage: "Pós-venda",
            place:
              String(row.notes || "")
                .match(/Local: ([^|]+)/)?.[1]
                ?.trim() || "A confirmar",
            objective:
              String(row.notes || "")
                .match(/Objetivo: (.+)$/)?.[1]
                ?.trim() || String(row.kind),
            next: String(row.next_action || "Registrar resultado"),
            color: "gold",
          } as Event;
        });
        setEvents(synced);
        if (synced.length)
          setSelected(
            (current) =>
              synced.find((item) => item.dbId === current.dbId) || synced[0],
          );
      })
      .catch(() => {});
  };
  useEffect(() => {
    loadAppointments();
  }, []);
  const setField = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectClient = async (value: string) => {
    setField("clientId", value);
    if (!value) return;
    const response = await fetch(`/api/appointments?cadenceClientId=${value}`);
    if (!response.ok) return;
    const recommendation = await response.json();
    setForm((current) => ({
      ...current,
      clientId: value,
      nextAction: recommendation.label,
      nextActionAt: String(recommendation.at).slice(0, 16),
    }));
  };
  const openNew = () => {
    const d = new Date(Date.now() + 3600000);
    d.setMinutes(0, 0, 0);
    setEditingId(null);
    setFormError("");
    setForm({
      kind: "Visita ao imóvel",
      clientId: "",
      startsAt: new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      place: "",
      objective: "",
      nextAction: "",
      nextActionAt: "",
    });
    setFormOpen(true);
  };
  const openEdit = () => {
    if (!selected.id) return;
    setEditingId(selected.dbId || null);
    setFormError("");
    const start = selected.startsAt ? new Date(selected.startsAt) : new Date();
    const next = selected.nextAt ? new Date(selected.nextAt) : null;
    const local = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    setForm({
      kind: selected.kind,
      clientId: selected.clientId ? String(selected.clientId) : "",
      startsAt: local(start),
      place: selected.place === "A confirmar" ? "" : selected.place,
      objective: selected.objective,
      nextAction: selected.next,
      nextActionAt: next ? local(next) : "",
    });
    setFormOpen(true);
    setTimeout(
      () =>
        document
          .querySelector(".quick-create")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
  };
  const saveAppointment = async () => {
    if (!form.kind || !form.startsAt || !form.objective.trim()) {
      setFormError("Preencha tipo, data, horário e objetivo.");
      return;
    }
    setSaving(true);
    setFormError("");
    const response = await fetch("/api/appointments", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...form }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setFormError(result.error || "Não foi possível salvar o compromisso.");
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    loadAppointments();
  };
  const deleteAppointment = async () => {
    if (!selected.dbId) return;
    if (
      !window.confirm(
        `Excluir o agendamento “${selected.title}”? Esta ação remove o compromisso da agenda e registra a exclusão na ficha do cliente.`,
      )
    )
      return;
    setSaving(true);
    const response = await fetch("/api/appointments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.dbId }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      window.alert(result.error || "Não foi possível excluir o agendamento.");
      return;
    }
    setSelected(emptyEvent);
    loadAppointments();
  };
  const visible = useMemo(
    () =>
      events.filter(
        (e) =>
          filter === "Todos" ||
          (filter === "Comercial" && !!e.client) ||
          (filter === "Conteúdo" && e.stage === "Produção de conteúdo") ||
          (filter === "Interno" && e.kind === "Tarefa interna"),
      ),
    [events, filter],
  );
  const commercial = events.filter((e) => e.client);
  const visits = commercial.filter(
    (e) => e.kind === "Visita ao imóvel" || e.kind === "Atendimento presencial",
  );
  const attended = visits.filter((e) => e.status === "Compareceu").length;
  const confirmed = visits.filter(
    (e) => e.status === "Confirmado" || e.status === "Compareceu",
  ).length;
  const noShow = visits.filter((e) => e.status === "Não compareceu").length;
  const period = periodData[view];
  const historyVisible = history.filter(
    (item) =>
      (!search ||
        Object.values(item)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (historyType === "Todos os eventos" || item.type === historyType) &&
      (historyStatus === "Todos os resultados" ||
        item.status === historyStatus),
  );
  const updateStatus = (status: Status) => {
    if (!selected.id) return;
    setEvents((current) =>
      current.map((e) => (e.id === selected.id ? { ...e, status } : e)),
    );
    setSelected({ ...selected, status });
    setAttendanceSaved(false);
  };
  return (
    <main className="agenda-shell">
      <aside className="agenda-sidebar">
        <div className="agenda-brand">
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
        <div className="agenda-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="agenda-main">
        <header className="agenda-header">
          <div>
            <span>Planejamento comercial e pessoal</span>
            <h1>Agenda Operacional</h1>
            <p>
              Cada compromisso comercial alimenta o funil, os comparecimentos e
              a próxima ação.
            </p>
          </div>
        </header>
        <div className="agenda-content">
          <DailyMissionTabs />
          <div className="crm-page-toolbar">
            <button onClick={openNew}>＋ Novo compromisso</button>
          </div>
          <section className="agenda-kpis">
            <article>
              <span>Visitas e atendimentos</span>
              <strong>{visits.length}</strong>
              <small>{confirmed} confirmados para hoje</small>
            </article>
            <article className="goal">
              <span>Comparecimentos hoje</span>
              <strong>
                {attended} <i>/ 2</i>
              </strong>
              <div>
                <b
                  style={{ width: `${Math.min(100, (attended / 2) * 100)}%` }}
                />
              </div>
              <small>Meta diária · produção acima de 100% permitida</small>
            </article>
            <article>
              <span>Comparecimentos na semana</span>
              <strong>
                {attended} <i>/ 10</i>
              </strong>
              <small>
                Faltam {Math.max(0, 10 - attended)} para a meta semanal
              </small>
            </article>
            <article className="danger">
              <span>Não compareceu</span>
              <strong>{noShow}</strong>
              <small>Cadência de resgate criada automaticamente</small>
            </article>
            <article>
              <span>Atividades de conteúdo</span>
              <strong>
                {
                  events.filter((e) => e.stage === "Produção de conteúdo")
                    .length
                }
              </strong>
              <small>Gravações e stories separados dos KPIs</small>
            </article>
          </section>
          <section className="agenda-period">
            <div>
              <span>Visualização</span>
              {(["Semana", "Mês", "Trimestre", "Ano"] as const).map((item) => (
                <button
                  className={view === item ? "active" : ""}
                  onClick={() => setView(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            <aside>
              <button>‹</button>
              <span>
                <b>{period.label}</b>
                <small>Atualizado com eventos concluídos e programados</small>
              </span>
              <button>›</button>
            </aside>
          </section>
          {view === "Semana" ? (
            <section className="week-strip">
              <button>‹</button>
              {days.map((item) => (
                <button
                  key={item.d}
                  className={day === item.d ? "active" : ""}
                  onClick={() => setDay(item.d)}
                >
                  <span>{item.w}</span>
                  <b>{item.d}</b>
                  <small>
                    {item.d === "10"
                      ? `${events.length} itens`
                      : item.d === "11"
                        ? "4 itens"
                        : "—"}
                  </small>
                </button>
              ))}
              <button>›</button>
            </section>
          ) : (
            <section className="period-overview">
              <header>
                <div>
                  <span>Visão consolidada</span>
                  <h2>{period.label}</h2>
                </div>
                <small>
                  Eventos comerciais e pessoais permanecem separados
                </small>
              </header>
              <div className="period-metrics">
                <article>
                  <span>Agendamentos</span>
                  <strong>{period.scheduled}</strong>
                  <i>
                    <b style={{ width: "100%" }} />
                  </i>
                </article>
                <article>
                  <span>Confirmados</span>
                  <strong>{period.confirmed}</strong>
                  <i>
                    <b
                      style={{
                        width: `${(period.confirmed / period.scheduled) * 100}%`,
                      }}
                    />
                  </i>
                  <small>
                    {((period.confirmed / period.scheduled) * 100)
                      .toFixed(1)
                      .replace(".", ",")}
                    % dos agendamentos
                  </small>
                </article>
                <article>
                  <span>Comparecimentos</span>
                  <strong>{period.attended}</strong>
                  <i>
                    <b
                      style={{
                        width: `${(period.attended / period.confirmed) * 100}%`,
                      }}
                    />
                  </i>
                  <small>
                    {((period.attended / period.confirmed) * 100)
                      .toFixed(1)
                      .replace(".", ",")}
                    % dos confirmados
                  </small>
                </article>
                <article className="lost">
                  <span>Ausências</span>
                  <strong>{period.noShow}</strong>
                  <i>
                    <b
                      style={{
                        width: `${(period.noShow / period.confirmed) * 100}%`,
                      }}
                    />
                  </i>
                  <small>Todos retornaram à cadência</small>
                </article>
                <article className="sales">
                  <span>Vendas originadas</span>
                  <strong>{period.sales}</strong>
                  <i>
                    <b
                      style={{
                        width: `${(period.sales / period.attended) * 100}%`,
                      }}
                    />
                  </i>
                  <small>
                    {((period.sales / period.attended) * 100)
                      .toFixed(1)
                      .replace(".", ",")}
                    % dos comparecimentos
                  </small>
                </article>
              </div>
              <div className="period-bars">
                {[58, 76, 49, 88, 67, 92, 74, 83, 61, 79, 95, 69]
                  .slice(0, view === "Mês" ? 4 : view === "Trimestre" ? 3 : 12)
                  .map((value, index) => (
                    <article key={index}>
                      <i>
                        <b style={{ height: `${value}%` }} />
                      </i>
                      <span>
                        {view === "Ano"
                          ? [
                              "Jan",
                              "Fev",
                              "Mar",
                              "Abr",
                              "Mai",
                              "Jun",
                              "Jul",
                              "Ago",
                              "Set",
                              "Out",
                              "Nov",
                              "Dez",
                            ][index]
                          : view === "Trimestre"
                            ? `Mês ${index + 1}`
                            : `Sem ${index + 1}`}
                      </span>
                    </article>
                  ))}
              </div>
            </section>
          )}
          {formOpen && (
            <section className="quick-create">
              <header>
                <div>
                  <span>Novo registro</span>
                  <h2>
                    {editingId ? "Editar compromisso" : "Agendar compromisso"}
                  </h2>
                </div>
                <button onClick={() => setFormOpen(false)}>×</button>
              </header>
              <div>
                <label>
                  <span>Tipo</span>
                  <select
                    value={form.kind}
                    onChange={(e) => setField("kind", e.target.value)}
                  >
                    <option>Visita ao imóvel</option>
                    <option>Atendimento presencial</option>
                    <option>Apresentação de proposta</option>
                    <option>Gravação de imóvel</option>
                    <option>Stories / conteúdo</option>
                    <option>Tarefa interna</option>
                  </select>
                </label>
                <label>
                  <span>Cliente</span>
                  <select
                    value={form.clientId}
                    onChange={(e) => selectClient(e.target.value)}
                  >
                    <option value="">Sem cliente vinculado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Data e horário</span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setField("startsAt", e.target.value)}
                  />
                </label>
                <label>
                  <span>Local / empreendimento</span>
                  <input
                    value={form.place}
                    onChange={(e) => setField("place", e.target.value)}
                    placeholder="Stand, escritório ou endereço"
                  />
                </label>
                <label className="wide">
                  <span>Objetivo obrigatório</span>
                  <input
                    value={form.objective}
                    onChange={(e) => setField("objective", e.target.value)}
                    placeholder="Qual avanço este compromisso deve produzir?"
                  />
                </label>
                <label>
                  <span>Próxima ação sugerida pelo CRM</span>
                  <input
                    value={form.nextAction}
                    onChange={(e) => setField("nextAction", e.target.value)}
                    placeholder="Selecione um cliente para calcular"
                  />
                </label>
                <label>
                  <span>Data da próxima ação</span>
                  <input
                    type="datetime-local"
                    value={form.nextActionAt}
                    onChange={(e) => setField("nextActionAt", e.target.value)}
                  />
                </label>
              </div>
              <footer>
                <small>
                  Eventos comerciais ficam vinculados ao cliente e à etapa atual
                  do funil.
                </small>
                <span className="form-error">{formError}</span>
                <button disabled={saving} onClick={saveAppointment}>
                  {saving
                    ? "Salvando..."
                    : editingId
                      ? "Salvar alterações"
                      : "Salvar compromisso"}
                </button>
              </footer>
            </section>
          )}
          <section className="agenda-workspace">
            <section className="schedule">
              <header>
                <div>
                  <span>Segunda-feira · 10 de agosto</span>
                  <h2>Roteiro do dia</h2>
                </div>
                <div>
                  {kinds.map((k) => (
                    <button
                      key={k}
                      className={filter === k ? "active" : ""}
                      onClick={() => setFilter(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </header>
              <div className="timeline">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    className={`event ${event.color} ${selected.id === event.id ? "selected" : ""}`}
                    onClick={() => setSelected(event)}
                  >
                    <time>
                      {event.time}
                      <small>{event.end}</small>
                    </time>
                    <i></i>
                    <div>
                      <span>
                        {event.kind} · {event.stage}
                      </span>
                      <b>{event.title}</b>
                      <p>
                        {event.client ? `${event.client} · ` : ""}
                        {event.project || event.place}
                      </p>
                    </div>
                    <aside>
                      <strong
                        className={event.status
                          .toLowerCase()
                          .replaceAll(" ", "-")}
                      >
                        {event.status}
                      </strong>
                      <small>{event.place}</small>
                    </aside>
                  </button>
                ))}
              </div>
            </section>
            <aside className="event-focus">
              <header>
                <span>Compromisso selecionado</span>
                <h2>{selected.title}</h2>
                <p>
                  {selected.time}–{selected.end} · {selected.place}
                </p>
              </header>
              <div className="event-stage">
                <span>Impacto no funil</span>
                <b>{selected.stage}</b>
                <small>
                  {selected.client
                    ? "O resultado atualiza automaticamente a jornada do cliente."
                    : "Atividade pessoal; não altera KPIs comerciais."}
                </small>
              </div>
              {selected.client && (
                <section className="event-client">
                  <div>
                    <i>
                      {selected.client
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </i>
                    <span>
                      <b>{selected.client}</b>
                      <small>{selected.project}</small>
                    </span>
                  </div>
                  <aside>
                    <a href={`tel:+${selected.phone}`}>☎</a>
                    <a
                      href={`https://wa.me/${selected.phone}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        src="/whatsapp.svg"
                        alt="WhatsApp"
                        width={14}
                        height={14}
                      />
                    </a>
                  </aside>
                </section>
              )}
              <section className="event-plan">
                <article>
                  <span>Objetivo</span>
                  <b>{selected.objective}</b>
                </article>
                <article>
                  <span>Próxima ação</span>
                  <b>{selected.next}</b>
                </article>
              </section>
              {selected.client && (
                <section className="attendance">
                  <span>Presença obrigatória</span>
                  <div>
                    <button
                      className={
                        selected.status === "Compareceu" ? "yes active" : "yes"
                      }
                      onClick={() => updateStatus("Compareceu")}
                    >
                      ✓ Compareceu
                    </button>
                    <button
                      className={
                        selected.status === "Não compareceu"
                          ? "no active"
                          : "no"
                      }
                      onClick={() => updateStatus("Não compareceu")}
                    >
                      × Não compareceu
                    </button>
                  </div>
                  <small>
                    Presença mede comparecimento. O resultado comercial é
                    registrado separadamente abaixo.
                  </small>
                </section>
              )}
              {selected.client && selected.status === "Compareceu" && (
                <section className="attendance-outcome">
                  <header>
                    <span>Feedback obrigatório do atendimento</span>
                    <b>O que este comparecimento produziu?</b>
                  </header>
                  <label>
                    <span>Resultado comercial</span>
                    <select
                      value={outcome}
                      onChange={(e) => {
                        setOutcome(e.target.value);
                        setAttendanceSaved(false);
                      }}
                    >
                      <option>Gerou pasta para pré-análise</option>
                      <option>Vai enviar documentação para pré-análise</option>
                      <option>Documentação recebida no atendimento</option>
                      <option>Vai continuar em acompanhamento</option>
                      <option>Visita realizada · quer proposta</option>
                      <option>Proposta apresentada · em negociação</option>
                      <option>Não avançou agora · manter cadência</option>
                      <option>Desistiu temporariamente · resgate futuro</option>
                    </select>
                  </label>
                  <label>
                    <span>Registro do que aconteceu</span>
                    <textarea
                      value={attendanceNotes}
                      onChange={(e) => {
                        setAttendanceNotes(e.target.value);
                        setAttendanceSaved(false);
                      }}
                    />
                  </label>
                  <label>
                    <span>Próxima ação e prazo</span>
                    <input
                      type="datetime-local"
                      value={nextDate}
                      onChange={(e) => {
                        setNextDate(e.target.value);
                        setAttendanceSaved(false);
                      }}
                    />
                  </label>
                  <div className="outcome-impact">
                    <article>
                      <span>Etapa atualizada</span>
                      <b>
                        {outcome.includes("pasta") ||
                        outcome.includes("Documentação")
                          ? "Aguardando documentação / Pré-análise"
                          : outcome.includes("proposta") ||
                              outcome.includes("Proposta")
                            ? "Proposta / Negociação"
                            : "Follow-up ativo"}
                      </b>
                    </article>
                    <article>
                      <span>KPI gerado</span>
                      <b>
                        {outcome.includes("pasta") ||
                        outcome.includes("Documentação")
                          ? "+1 pasta originada em comparecimento"
                          : outcome.includes("proposta") ||
                              outcome.includes("Proposta")
                            ? "+1 proposta originada"
                            : "+1 continuidade registrada"}
                      </b>
                    </article>
                  </div>
                  <button onClick={() => setAttendanceSaved(true)}>
                    {attendanceSaved
                      ? "✓ Feedback salvo no cadastro do cliente"
                      : "Salvar feedback e atualizar jornada"}
                  </button>
                  {attendanceSaved && (
                    <aside className="client-log-preview">
                      <span>Log criado automaticamente</span>
                      <p>
                        <b>
                          10/08/2026 · {selected.time} — {selected.client}{" "}
                          compareceu ao atendimento presencial.
                        </b>{" "}
                        {attendanceNotes} Resultado: {outcome}. Próxima ação
                        programada para{" "}
                        {new Date(nextDate).toLocaleString("pt-BR")}.
                      </p>
                    </aside>
                  )}
                </section>
              )}
              <footer>
                <button onClick={openEdit}>Editar compromisso</button>
                {selected.dbId && (
                  <button
                    className="delete-appointment"
                    onClick={deleteAppointment}
                    disabled={saving}
                  >
                    Excluir agendamento
                  </button>
                )}
                {selected.client && (
                  <Link href="/clientes">Abrir ficha do cliente →</Link>
                )}
              </footer>
            </aside>
          </section>
          <section className="agenda-conversion">
            <header>
              <div>
                <span>Conversão da agenda</span>
                <h2>Do agendamento ao fechamento</h2>
              </div>
              <small>Agosto 2026</small>
            </header>
            {[
              {
                n: commercial.length,
                label: "Agendamentos",
                rate: commercial.length ? "100%" : "0%",
              },
              {
                n: confirmed,
                label: "Confirmados",
                rate: commercial.length
                  ? `${((confirmed / commercial.length) * 100).toFixed(1).replace(".", ",")}%`
                  : "0%",
              },
              {
                n: attended,
                label: "Comparecimentos",
                rate: confirmed
                  ? `${((attended / confirmed) * 100).toFixed(1).replace(".", ",")}%`
                  : "0%",
              },
              { n: 0, label: "Propostas", rate: "0%" },
              { n: 0, label: "Vendas", rate: "0%" },
            ].map((item, index) => (
              <article key={item.label}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <strong>{item.n}</strong>
                <span>{item.label}</span>
                <b>{item.rate}</b>
              </article>
            ))}
            <aside>
              <span>Gargalo atual</span>
              <b>4 ausências após confirmação</b>
              <small>
                Atacar confirmação no D0 e lembrete duas horas antes.
              </small>
            </aside>
          </section>
          <section className="event-history">
            <header>
              <div>
                <span>Histórico completo</span>
                <h2>Pesquisar eventos anteriores</h2>
                <p>
                  Localize qualquer visita, comparecimento, atendimento ou
                  atividade registrada.
                </p>
              </div>
              <b>{historyVisible.length} registros encontrados</b>
            </header>
            <div className="history-filters">
              <label>
                <span>Pesquisa</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cliente, empreendimento, evento ou resultado"
                />
              </label>
              <label>
                <span>Tipo de evento</span>
                <select
                  value={historyType}
                  onChange={(e) => setHistoryType(e.target.value)}
                >
                  <option>Todos os eventos</option>
                  <option>Visita ao imóvel</option>
                  <option>Atendimento presencial</option>
                  <option>Apresentação de proposta</option>
                  <option>Gravação de imóvel</option>
                </select>
              </label>
              <label>
                <span>Resultado</span>
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                >
                  <option>Todos os resultados</option>
                  <option>Compareceu</option>
                  <option>Não compareceu</option>
                  <option>Concluído</option>
                </select>
              </label>
              <label>
                <span>Período personalizado</span>
                <div>
                  <input type="date" defaultValue="2026-08-01" />
                  <input type="date" defaultValue="2026-08-10" />
                </div>
              </label>
            </div>
            <div className="history-head">
              <span>Data</span>
              <span>Cliente / evento</span>
              <span>Tipo</span>
              <span>Etapa</span>
              <span>Resultado</span>
              <span>Desfecho</span>
            </div>
            {historyVisible.map((item) => (
              <article key={item.date + item.time}>
                <time>
                  {item.date}
                  <small>{item.time}</small>
                </time>
                <div>
                  <b>{item.client}</b>
                  <span>{item.event}</span>
                </div>
                <span>{item.type}</span>
                <span>{item.stage}</span>
                <strong
                  className={item.status.toLowerCase().replaceAll(" ", "-")}
                >
                  {item.status}
                </strong>
                <b>{item.result}</b>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
