"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { DailyMissionTabs } from "../components/daily-mission-tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhoneIcon } from "../components/phone-icon";
import { CATALOG_CITIES, normalizeCatalogCity } from "@/lib/catalog-hierarchy";
import "./carteira.css";
import "./carteira-fixes.css";

type Contact = {
  clientId?: number;
  id: number;
  name: string;
  phone: string;
  email: string;
  origin: string;
  interest: string;
  status: "Pendente" | "Em atendimento" | "Concluído";
  attempts: number;
  last: string;
};

const initialContacts: Contact[] = [
  {
    id: 1,
    name: "José Paulo de Sousa",
    phone: "558699631167",
    email: "josepaulo@email.com",
    origin: "Lista fria · Canopus",
    interest: "Village dos Pássaros",
    status: "Pendente",
    attempts: 0,
    last: "Nunca trabalhado",
  },
  {
    id: 2,
    name: "Júlia Martins",
    phone: "5586998103886",
    email: "juliamartins@email.com",
    origin: "Lead · Instagram Garden",
    interest: "Village Natureza",
    status: "Em atendimento",
    attempts: 1,
    last: "Ligação há 18 min",
  },
  {
    id: 3,
    name: "David Vilanova",
    phone: "5586995273251",
    email: "davidvilanova@email.com",
    origin: "Lista fria · Betacon",
    interest: "Village Natureza",
    status: "Pendente",
    attempts: 0,
    last: "Nunca trabalhado",
  },
  {
    id: 4,
    name: "Maria Ivonete Oliveira",
    phone: "5599981155427",
    email: "mariaivonete@email.com",
    origin: "Lead · Facebook Natureza",
    interest: "Village Natureza",
    status: "Pendente",
    attempts: 0,
    last: "Nunca trabalhado",
  },
  {
    id: 5,
    name: "Herbert Santos",
    phone: "5586999029598",
    email: "herbertsantos@email.com",
    origin: "Lead · Instagram Garden",
    interest: "Village Garden II",
    status: "Concluído",
    attempts: 2,
    last: "Qualificado às 09:42",
  },
  {
    id: 6,
    name: "Odilon Mendes Neto",
    phone: "558999355117",
    email: "odilonneto@email.com",
    origin: "Lista fria · Canopus",
    interest: "Village Garden II",
    status: "Pendente",
    attempts: 0,
    last: "Nunca trabalhado",
  },
];
initialContacts.splice(0);
const emptyContact: Contact = {
  clientId: 0,
  id: 0,
  name: "Nenhum contato distribuído",
  phone: "",
  email: "",
  origin: "—",
  interest: "—",
  status: "Pendente",
  attempts: 0,
  last: "Aguardando próximo dia útil",
};

const outcomes = [
  "Não atendeu",
  "Não respondeu",
  "Em atendimento",
  "Qualificado",
  "Pasta recebida",
  "Sem interesse",
  "Número inválido",
  "Cliente desistiu",
  "Cliente bloqueou o corretor",
];

function Wpp({ size = 18 }: { size?: number }) {
  return (
    <Image src="/whatsapp.svg" alt="WhatsApp" width={size} height={size} />
  );
}

export default function CarteiraPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selected, setSelected] = useState<Contact>(emptyContact);
  const [prospectingDay, setProspectingDay] = useState(true);
  const [outcome, setOutcome] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [saved, setSaved] = useState(false);
  const [incomeType, setIncomeType] = useState("");
  const [clientSex, setClientSex] = useState<"Feminino" | "Masculino" | "">("");
  const [selfEmployedActivity, setSelfEmployedActivity] = useState("");
  const [selfEmployedSince, setSelfEmployedSince] = useState("");
  const [today] = useState(() =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeZone: "America/Fortaleza",
    }).format(new Date()),
  );
  const [page, setPage] = useState(0);
  const [metrics, setMetrics] = useState({
    appointments: 0,
    appearances: 0,
    folders: 0,
  });
  const [basePanel, setBasePanel] = useState(false);
  const [catalog, setCatalog] = useState<{
    projects: Array<{
      name: string;
      city: string;
      region?: string;
      builders: { name: string } | Array<{ name: string }>;
    }>;
  }>({ projects: [] });
  const [city, setCity] = useState("all");
  const [builder, setBuilder] = useState("all");
  const [project, setProject] = useState("all");
  const [stage, setStage] = useState("all");
  const [baseNotice, setBaseNotice] = useState("");
  const [journeyStage, setJourneyStage] = useState("Aguardando documentação");
  const [nextContactDate, setNextContactDate] = useState("");
  const [nextContactTime, setNextContactTime] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const nextContactDateRef = useRef<HTMLInputElement>(null);
  const nextContactTimeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch("/api/daily-portfolio")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setProspectingDay(Boolean(data?.prospectingDay));
        if (!data?.rows?.length) {
          setContacts([]);
          setSelected(emptyContact);
          return;
        }
        const loaded: Contact[] = data.rows.map(
          (row: Record<string, unknown>) => ({
            id: Number(row.assignment_id),
            clientId: Number(row.id),
            name: String(row.name),
            phone: String(row.phone),
            email: String(row.email || ""),
            origin: `${row.origin_type} · ${row.origin_detail || "Base inicial"}`,
            interest: String(row.project_interest || "Não informado"),
            status: String(row.status) as Contact["status"],
            attempts: Number(row.attempts),
            last: String(row.last_result),
          }),
        );
        setContacts(loaded);
        const requestedClient = Number(
          new URLSearchParams(window.location.search).get("clientId"),
        );
        setSelected(
          loaded.find((item) => item.clientId === requestedClient) || loaded[0],
        );
      })
      .catch(() => {});
    fetch("/api/metrics")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const events = data?.eventCounts || {};
        const appointments = data?.appointmentCounts || {};
        const appointmentTotal = Object.values(
          appointments as Record<string, number>,
        ).reduce<number>((sum, value) => sum + Number(value || 0), 0);
        const appearanceTotal = Object.entries(
          appointments as Record<string, number>,
        ).reduce<number>(
          (sum, [status, value]) =>
            /compareceu|conclu/i.test(status) ? sum + Number(value || 0) : sum,
          0,
        );
        setMetrics({
          appointments: Number(events.appointment || 0) + appointmentTotal,
          appearances: Number(events.appearance || 0) + appearanceTotal,
          folders: Number(events.folder_sent || 0),
        });
      })
      .catch(() => {});
    fetch("/api/bases")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCatalog({ projects: data.projects || [] }))
      .catch(() => {});
  }, []);
  const worked = contacts.filter((contact) => contact.attempts > 0).length;
  const pendingCount = contacts.filter(
    (contact) => contact.status === "Pendente",
  ).length;
  const qualified = contacts.filter((contact) =>
    contact.last.includes("Qualificado"),
  ).length;
  const attempts = contacts.reduce(
    (total, contact) => total + contact.attempts,
    0,
  );
  const leads = contacts.filter((contact) =>
    contact.origin.toLowerCase().includes("lead"),
  ).length;
  const coldLists = contacts.filter((contact) =>
    contact.origin.toLowerCase().includes("lista"),
  ).length;
  const filtered = useMemo(
    () =>
      filter === "Todos"
        ? contacts
        : contacts.filter((c) => c.status === filter),
    [filter, contacts],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const safePage = Math.min(page, pageCount - 1);
  const visibleContacts = filtered.slice(safePage * 10, safePage * 10 + 10);
  const cityProjects = useMemo(
    () =>
      catalog.projects.filter(
        (p) =>
          city === "all" || normalizeCatalogCity(p.city, p.region) === city,
      ),
    [catalog, city],
  );
  const builders = useMemo(
    () =>
      [
        ...new Set(
          cityProjects
            .flatMap((p) =>
              Array.isArray(p.builders)
                ? p.builders.map((b) => b.name)
                : [p.builders?.name],
            )
            .filter(Boolean),
        ),
      ] as string[],
    [cityProjects],
  );
  const projects = useMemo(
    () =>
      cityProjects.filter(
        (p) =>
          builder === "all" ||
          (Array.isArray(p.builders)
            ? p.builders.some((b) => b.name === builder)
            : p.builders?.name === builder),
      ),
    [cityProjects, builder],
  );
  const receiveBase = async () => {
    setBaseNotice("Distribuindo contatos...");
    const response = await fetch("/api/bases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "distribute",
        city,
        builder,
        project,
        stage,
        quantity: 50,
        broker: "Franklin Monteiro",
        assignedDate: new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Fortaleza",
        }),
      }),
    });
    const data = await response.json();
    setBaseNotice(
      response.ok
        ? `${data.assigned} contatos recebidos na carteira.`
        : data.error || "Falha ao receber base.",
    );
    if (response.ok) setTimeout(() => location.reload(), 700);
  };
  const saveCurrent = async () => {
    if (!outcome) return;
    const savedDate = nextContactDateRef.current?.value || nextContactDate;
    const savedTime =
      nextContactTimeRef.current?.value || nextContactTime || "09:00";
    const nextActionAt = savedDate ? `${savedDate}T${savedTime}` : null;
    const response = await fetch("/api/daily-portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: selected.id,
        result: outcome,
        journeyStage:
          outcome === "Pasta recebida"
            ? "Pasta recebida"
            : outcome === "Cliente desistiu"
              ? "Desistiu"
              : outcome === "Cliente bloqueou o corretor"
                ? "Contato bloqueado"
                : journeyStage,
        nextAction:
          outcome === "Pasta recebida"
            ? "Conferir pasta e iniciar análise"
            : journeyStage === "Aguardando documentação"
              ? "Receber e conferir documentação"
              : `Dar continuidade: ${journeyStage}`,
        nextActionAt,
        notes: serviceNotes,
        qualification: {
          sex: clientSex,
          incomeType,
          selfEmployedActivity,
          selfEmployedSince,
        },
      }),
    });
    if (!response.ok) return;
    const nextStatus: Contact["status"] = [
      "Qualificado",
      "Pasta recebida",
      "Sem interesse",
      "Número inválido",
      "Cliente desistiu",
      "Cliente bloqueou o corretor",
    ].includes(outcome)
      ? "Concluído"
      : "Em atendimento";
    const updated = contacts.map((contact) =>
      contact.id === selected.id
        ? {
            ...contact,
            status: nextStatus,
            attempts: contact.attempts + 1,
            last: outcome,
          }
        : contact,
    );
    setContacts(updated);
    setSaved(true);
    const next = updated.find((contact) => contact.status === "Pendente");
    if (next)
      setTimeout(() => {
        setSelected(next);
        setOutcome("");
        setSaved(false);
      }, 500);
  };

  return (
    <main className="wallet-shell">
      <aside className="wallet-sidebar">
        <div className="wallet-brand">
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
        <div className="wallet-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor de imóveis</span>
          </div>
        </div>
      </aside>

      <section className="wallet-main">
        <header className="wallet-header">
          <div>
            <Link href="/">‹ Voltar</Link>
            <span>Operação diária</span>
            <h1>Carteira do Dia</h1>
            <p>
              Contatos distribuídos para prospecção, qualificação e avanço da
              jornada.
            </p>
          </div>
          <div className="wallet-date">{today}</div>
        </header>
        <div className="wallet-content">
          <DailyMissionTabs />
          <section className="wallet-overview">
            <div>
              <span>Distribuição automática</span>
              <h2>{contacts.length} contatos únicos</h2>
              <p>
                {prospectingDay
                  ? "Distribuição real do dia útil."
                  : "Sábado e domingo: prospecção suspensa; use a Agenda."}
              </p>
              <div className="origin-mix">
                <i>{leads} Leads</i>
                <i>{coldLists} Listas frias</i>
              </div>
            </div>
            <div className="wallet-progress">
              <div>
                <strong>{worked}</strong>
                <span>trabalhados</span>
              </div>
              <div>
                <strong>{pendingCount}</strong>
                <span>pendentes</span>
              </div>
              <div>
                <strong>{qualified}</strong>
                <span>qualificados</span>
              </div>
              <i>
                <span
                  style={{
                    width: `${contacts.length ? (worked / contacts.length) * 100 : 0}%`,
                  }}
                />
              </i>
            </div>
          </section>

          <section className="daily-base-control">
            <button onClick={() => setBasePanel((v) => !v)}>
              Receber base do dia
            </button>
            {basePanel && (
              <div className="daily-base-fields">
                <label>
                  Cidade
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setBuilder("all");
                      setProject("all");
                    }}
                  >
                    <option value="all">Todas</option>
                    {CATALOG_CITIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Construtora
                  <select
                    value={builder}
                    onChange={(e) => {
                      setBuilder(e.target.value);
                      setProject("all");
                    }}
                  >
                    <option value="all">Todas</option>
                    {builders.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Empreendimento
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {projects.map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo da carteira
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    <option value="all">Prospecção geral</option>
                    <option value="approved-not-closed">
                      Aprovados sem fechamento
                    </option>
                    <option>Restrição</option>
                    <option>Condicionado</option>
                    <option>Em análise</option>
                  </select>
                </label>
                <button onClick={receiveBase}>Confirmar 50 contatos</button>
              </div>
            )}
            {baseNotice && <span>{baseNotice}</span>}
          </section>

          <section className="wallet-targets">
            <header>
              <div>
                <span>Metas da carteira · hoje</span>
                <b>Produção sem teto</b>
              </div>
              <small>Ultrapassar a meta não encerra a contagem</small>
            </header>
            <div>
              <article>
                <span>Tentativas de ligação</span>
                <strong>
                  {attempts} <i>/50</i>
                </strong>
                <b>
                  <i style={{ width: `${Math.min(100, attempts * 2)}%` }} />
                </b>
                <small>{Math.max(0, 50 - attempts)} restantes</small>
              </article>
              <article>
                <span>Contatos efetivos</span>
                <strong>{worked}</strong>
                <small>
                  {attempts
                    ? `${((worked / attempts) * 100).toFixed(1)}% das tentativas`
                    : "Nenhum contato registrado"}
                </small>
              </article>
              <article>
                <span>Conversas qualificadas</span>
                <strong>
                  {qualified} <i>/15</i>
                </strong>
                <b>
                  <i
                    style={{
                      width: `${Math.min(100, (qualified / 15) * 100)}%`,
                    }}
                  />
                </b>
                <small>
                  {qualified
                    ? "Produção real registrada"
                    : "Nenhuma qualificação registrada"}
                </small>
              </article>
              <article>
                <span>Novos follow-ups</span>
                <strong>
                  {
                    contacts.filter(
                      (contact) => contact.status === "Em atendimento",
                    ).length
                  }{" "}
                  <i>/10</i>
                </strong>
                <b>
                  <i
                    style={{
                      width: `${Math.min(100, contacts.filter((contact) => contact.status === "Em atendimento").length * 10)}%`,
                    }}
                  />
                </b>
                <small>Somente registros reais</small>
              </article>
              <article className="quality">
                <span>Próxima ação definida</span>
                <strong>
                  0 <i>/{worked}</i>
                </strong>
                <b>
                  <i style={{ width: "0%" }} />
                </b>
                <small>Será contado após registrar a próxima ação</small>
              </article>
              <article className="hot">
                <span>Leads quentes sem acompanhamento</span>
                <strong>0</strong>
                <small>Meta: permanecer zerado</small>
              </article>
              <article>
                <span>Agendamentos</span>
                <strong>{metrics.appointments}</strong>
                <small>Compromissos registrados</small>
              </article>
              <article>
                <span>Comparecimentos</span>
                <strong>{metrics.appearances}</strong>
                <small>Atendimentos realizados</small>
              </article>
              <article>
                <span>Pastas enviadas</span>
                <strong>{metrics.folders}</strong>
                <small>Enviadas para análise</small>
              </article>
            </div>
          </section>

          <div className="wallet-grid">
            <section className="contact-queue">
              <div className="queue-head">
                <div>
                  <h3>Fila de atendimento</h3>
                  <span>Ordem definida automaticamente</span>
                </div>
                <div className="queue-filters">
                  {["Todos", "Pendente", "Em atendimento", "Concluído"].map(
                    (item) => (
                      <button
                        className={filter === item ? "active" : ""}
                        onClick={() => {
                          setFilter(item);
                          setPage(0);
                        }}
                        key={item}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="queue-list">
                {!filtered.length && (
                  <div className="wallet-empty">
                    {prospectingDay
                      ? "Nenhum contato distribuído ainda."
                      : "Fim de semana sem fila de prospecção. Use Agenda para visitas, feirões e atendimentos."}
                  </div>
                )}
                {visibleContacts.map((contact, index) => (
                  <button
                    className={selected.id === contact.id ? "selected" : ""}
                    onClick={() => {
                      setSelected(contact);
                      setSaved(false);
                      setOutcome("");
                    }}
                    key={contact.id}
                  >
                    <span className="queue-position">
                      {String(page * 10 + index + 1).padStart(2, "0")}
                    </span>
                    <div className="queue-person">
                      <b>{contact.name}</b>
                      <span>
                        {contact.interest} · {contact.origin}
                      </span>
                    </div>
                    <div className="queue-history">
                      <b>{contact.last}</b>
                      <span>
                        {contact.attempts} tentativa
                        {contact.attempts !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <i
                      className={`status ${contact.status.toLowerCase().replace(" ", "-")}`}
                    >
                      {contact.status}
                    </i>
                    <span className="queue-arrow">›</span>
                  </button>
                ))}
              </div>
              {filtered.length > 10 && (
                <nav className="queue-pages" aria-label="Páginas da fila">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      className={page === i ? "active" : ""}
                      onClick={() => setPage(i)}
                      key={i}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={page === pageCount - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </section>

            <aside className="service-panel">
              <div className="service-title">
                <span>Atendimento atual</span>
                <strong>
                  {selected.id
                    ? `#${String(selected.id).padStart(2, "0")}`
                    : "—"}
                </strong>
              </div>
              <div className="client-profile">
                <i>
                  {selected.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </i>
                <div>
                  <h3>{selected.name}</h3>
                  <span>{selected.phone}</span>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  <small>{selected.interest}</small>
                  <em>{selected.origin}</em>
                </div>
              </div>
              {selected.id > 0 && (
                <div className="contact-buttons">
                  <a href={`tel:+${selected.phone}`}>
                    <PhoneIcon /> <span>Ligar agora</span>
                  </a>
                  <a
                    href={`https://wa.me/${selected.phone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Wpp />
                    <span>Abrir WhatsApp</span>
                  </a>
                  <Link href={`/clientes/${selected.clientId}`}>
                    Abrir ficha completa
                  </Link>
                </div>
              )}
              <div className="service-form">
                <label>Resultado do contato</label>
                <div className="outcome-grid">
                  {outcomes.map((item) => (
                    <button
                      className={outcome === item ? "selected" : ""}
                      onClick={() => setOutcome(item)}
                      key={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label>Qualificação Minha Casa Minha Vida</label>
                <input
                  type="email"
                  defaultValue={selected.email}
                  aria-label="E-mail do cliente"
                  placeholder="E-mail do cliente"
                />
                <div className="form-row">
                  <select
                    aria-label="Sexo do cliente"
                    value={clientSex}
                    onChange={(e) =>
                      setClientSex(e.target.value as typeof clientSex)
                    }
                  >
                    <option value="" disabled>
                      Sexo
                    </option>
                    <option>Feminino</option>
                    <option>Masculino</option>
                  </select>
                  <select defaultValue="">
                    <option value="" disabled>
                      Estado civil
                    </option>
                    <option>Solteiro(a)</option>
                    <option>Casado(a)</option>
                    <option>Divorciado(a)</option>
                    <option>Viúvo(a)</option>
                  </select>
                </div>
                <select
                  aria-label="Profissão / forma de renda"
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value)}
                >
                  <option value="" disabled>
                    Profissão / forma de renda
                  </option>
                  <option>Carteira assinada (CLT)</option>
                  <option>Autônomo</option>
                  <option>Empresa própria</option>
                  <option>Servidor público</option>
                </select>
                {incomeType === "Autônomo" && (
                  <div className="autonomous-details">
                    <span>Dados obrigatórios para análise CAIXA</span>
                    <div className="form-row">
                      <input
                        aria-label="Atividade autônoma exercida"
                        value={selfEmployedActivity}
                        onChange={(e) =>
                          setSelfEmployedActivity(e.target.value)
                        }
                        placeholder="Atividade exercida (ex.: manicure)"
                      />
                      <input
                        aria-label="Tempo na atividade autônoma"
                        value={selfEmployedSince}
                        onChange={(e) => setSelfEmployedSince(e.target.value)}
                        placeholder="Tempo na atividade (ex.: 4 anos)"
                      />
                    </div>
                    <small>
                      Esses dados serão puxados automaticamente para o texto de
                      análise.
                    </small>
                  </div>
                )}
                <div className="form-row">
                  <input
                    inputMode="decimal"
                    placeholder="Renda mensal aproximada"
                  />
                  <input
                    type="date"
                    aria-label="Data de nascimento"
                    title="Data de nascimento"
                  />
                </div>
                <div className="form-row">
                  <select defaultValue="">
                    <option value="" disabled>
                      Mais de 3 anos de carteira?
                    </option>
                    <option>Sim</option>
                    <option>Não</option>
                    <option>Não se aplica</option>
                  </select>
                  <select defaultValue="">
                    <option value="" disabled>
                      Filhos menores de 18 anos?
                    </option>
                    <option>Sim</option>
                    <option>Não</option>
                  </select>
                </div>
                <label>Interesse e condução</label>
                <div className="form-row">
                  <select defaultValue="">
                    <option value="" disabled>
                      Região de interesse
                    </option>
                    <option>Teresina Leste</option>
                    <option>Teresina Norte</option>
                    <option>Teresina Sul</option>
                    <option>Teresina Sudeste</option>
                    <option>Timon</option>
                    <option>Altos</option>
                    <option>Demerval Lobão</option>
                  </select>
                  <select
                    value={journeyStage}
                    onChange={(e) => setJourneyStage(e.target.value)}
                  >
                    <option>Aguardando documentação</option>
                    <option>Agendamento</option>
                    <option>Follow-up</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="dated-field">
                    <span>Próximo contato</span>
                    <input
                      ref={nextContactDateRef}
                      type="date"
                      aria-label="Data do próximo contato"
                      value={nextContactDate}
                      onChange={(e) => setNextContactDate(e.target.value)}
                    />
                  </div>
                  <div className="dated-field">
                    <span>Horário</span>
                    <input
                      type="time"
                      aria-label="Horário do próximo contato"
                      ref={nextContactTimeRef}
                      value={nextContactTime}
                      onChange={(e) => setNextContactTime(e.target.value)}
                    />
                  </div>
                </div>
                <label>Observação</label>
                <textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="Registre somente informação útil para próxima ação"
                />
                <button
                  className="save-service"
                  disabled={!outcome}
                  onClick={saveCurrent}
                >
                  {saved
                    ? "Atendimento salvo"
                    : "Salvar e abrir próximo contato"}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
