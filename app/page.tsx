"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "./components/crm-navigation";
import { useEffect, useState } from "react";
import "./dashboard-nav.css";
import "./dashboard-funnel.css";
import "./dashboard-funnel-fix.css";
import "./dashboard-interactions.css";
import "./dashboard-action-fixes.css";

type IconName =
  | "home"
  | "funnel"
  | "calendar"
  | "users"
  | "check"
  | "file"
  | "chart"
  | "settings"
  | "phone"
  | "whatsapp"
  | "bell"
  | "plus"
  | "arrow"
  | "menu"
  | "clock"
  | "alert";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  if (name === "whatsapp")
    return (
      <Image
        className="icon whatsapp-logo"
        src="/whatsapp.svg"
        alt="WhatsApp"
        width={size}
        height={size}
      />
    );
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    funnel: <path d="M4 4h16l-6 7v6l-4 3v-9Z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M14 2v6h6M9 13h6M9 17h6" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15.03 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.74a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />
    ),
    whatsapp: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.9L3 21l1.7-5a8.4 8.4 0 1 1 16.3-4.5Z" />
        <path d="M8.5 8.5c.7 3 2 4.3 5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

const dailyKpis = [
  { label: "Ligações", value: 0, goal: 50, icon: "phone" as IconName },
  {
    label: "Conversas qualificadas",
    value: 0,
    goal: 15,
    icon: "users" as IconName,
  },
  { label: "Novos follow-ups", value: 0, goal: 10, icon: "clock" as IconName },
  {
    label: "Próxima ação definida",
    value: 0,
    goal: 32,
    icon: "check" as IconName,
  },
  {
    label: "Leads quentes acompanhados",
    value: 0,
    goal: 1,
    icon: "alert" as IconName,
  },
  {
    label: "Interações registradas",
    value: 0,
    goal: 1,
    icon: "file" as IconName,
  },
];

const priorities: Array<{name:string;reason:string;age:string;phone:string;channel:IconName}> = [];

const appointments: Array<{time:string;name:string;type:string;place:string}> = [];

const commercialFunnel = [
  { label: "Prospecção", reference: 100, current: 0, color: "#53d4d8" },
  { label: "Agendamento", reference: 60, current: 0, color: "#3fb3cd" },
  { label: "Visita", reference: 30, current: 0, color: "#318bb9" },
  { label: "Pasta", reference: 25, current: 0, color: "#315f9e" },
  { label: "Fechamento", reference: 20, current: 0, color: "#303e7f" },
  { label: "Venda", reference: 18, current: 0, color: "#2e2c69" },
];

const financingStages = [
  "Aguardando documentos",
  "Em análise",
  "Restrição",
  "Condicionado",
  "Aprovado",
  "Fechado",
  "Entrega das chaves",
  "Pós-venda",
];

const followupStages = [
  {
    label: "Não atendeu",
    count: 0, overdue: 0, client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Parou de responder",
    count: 0, overdue: 0, client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Aguardando documentação",
    count: 0, overdue: 0, client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Não enviou documentos",
    count: 0, overdue: 0, client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Aprovado sem compra",
    count: 0, overdue: 0, client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Restrição · longo prazo",
    count: 0,
    overdue: 0,
    client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Condicionado",
    count: 0, overdue: 0, client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
  {
    label: "Desistiu · reativação",
    count: 0,
    overdue: 0,
    client: "", phone: "", timing: "Sem clientes nesta etapa",
  },
];

function KpiCard({ item }: { item: (typeof dailyKpis)[number] }) {
  const pct = Math.min(100, Math.round((item.value / item.goal) * 100));
  return (
    <article className="kpi-mini">
      <div className="kpi-mini-top">
        <span>
          <Icon name={item.icon} size={16} />
          {item.label}
        </span>
        <b>
          {item.value}
          <i>/{item.goal}</i>
        </b>
      </div>
      <div className="mini-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <small>
        {item.goal - item.value > 0
          ? `faltam ${item.goal - item.value}`
          : "meta concluída"}{" "}
        · {pct}%
      </small>
    </article>
  );
}

function ProgressCard({
  icon,
  label,
  value,
  goal,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  goal: number;
  tone?: string;
}) {
  const pct = Math.round((value / goal) * 100);
  return (
    <section className="metric-card">
      <div className="metric-copy">
        <div className="eyebrow">
          <span className={tone}>
            <Icon name={icon} size={19} />
          </span>
          {label}
        </div>
        <div className="metric-number">
          {value}
          <span>/ {goal}</span>
        </div>
        <p>{goal - value} restantes</p>
      </div>
      <div
        className="ring"
        style={{ "--progress": `${pct * 3.6}deg` } as React.CSSProperties}
      >
        <span>{pct}%</span>
      </div>
      <div className="bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <small>Meta diária</small>
    </section>
  );
}

export default function Home() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState(3);
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("Olá");
  const [operationLabel, setOperationLabel] = useState("Operação comercial");
  const [dailyQuote, setDailyQuote] = useState("");
  const [monthLabel, setMonthLabel] = useState("");
  useEffect(() => {
    const quotes = [
      "Disciplina transforma intenção em resultado.",
      "Faça bem o trabalho de hoje; o resultado acumula.",
      "O obstáculo mostra onde concentrar esforço.",
      "Consistência vence intensidade sem direção.",
      "Controle o processo; o resultado será consequência.",
      "Quem define a próxima ação não perde o controle da jornada.",
      "Excelência é repetir o essencial sem negociar o padrão.",
    ];
    const updateClock = () => {
      const now = new Date();
      setDate(new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "America/Fortaleza",
      }).format(now));
      const parts = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, weekday: "long", timeZone: "America/Fortaleza" }).formatToParts(now);
      const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
      const weekday = parts.find((part) => part.type === "weekday")?.value || "Hoje";
      setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");
      setMonthLabel(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" }).format(now));
      setOperationLabel(`${weekday} · operação comercial`);
      const dayKey = Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "America/Fortaleza" }).format(now));
      setDailyQuote(quotes[dayKey % quotes.length]);
    };
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <main className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <button
          className="close-mobile"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        >
          ×
        </button>
        <div className="brand">
          <div className="brand-mark">
            <Image
              src="/monteiro-logo.png"
              alt="Brasão Monteiro"
              width={70}
              height={74}
              priority
            />
          </div>
          <strong>MONTEIRO</strong>
          <span>CRM</span>
        </div>
        <CrmNavigation />
        <div className="profile" role="button" tabIndex={0} title="Alterar foto do perfil">
          <div className="avatar">FM</div>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor de imóveis</span>
          </div>
        </div>
      </aside>

      <div className="content">
        <header>
          <button
            className="menu-mobile"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Icon name="menu" />
          </button>
          <div>
            <span className="mobile-logo">
              <Image
                src="/monteiro-logo.png"
                alt="Monteiro"
                width={34}
                height={38}
              />
            </span>
            <h1>Dashboard</h1>
          </div>
          <div className="header-tools">
            <span className="date">
              <Icon name="calendar" size={17} />
              {date}
            </span>
            <button
              className="bell"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="Notificações"
            >
              <Icon name="bell" size={21} />
              {notice > 0 && <i>{notice}</i>}
            </button>
            {notificationsOpen && <section className="notifications-panel"><header><b>Notificações</b><button onClick={() => setNotice(0)}>Marcar todas como lidas</button></header>{notice ? <><Link href="/follow-ups"><strong>Follow-ups pendentes</strong><span>Abrir fila de próximas ações.</span></Link><Link href="/agenda"><strong>Agenda operacional</strong><span>Conferir compromissos e atendimentos.</span></Link><Link href="/analises"><strong>Processos de análise</strong><span>Verificar retornos e prazos dos CCAs.</span></Link></> : <p>Nenhuma notificação não lida.</p>}</section>}
          </div>
        </header>

        <div className="workspace">
          <section className="hero">
            <div>
              <p className="kicker">{operationLabel}</p>
              <h2>
                {greeting}, <em>Franklin.</em>
              </h2>
              <p>{dailyQuote}</p>
            </div>
            <div className="day-score">
              <span>Meta do dia</span>
              <b>0%</b>
            </div>
            <Link className="primary" href="/carteira">
              <Icon name="users" />
              Abrir carteira do dia
            </Link>
          </section>

          <section className="distribution-strip">
            <div>
              <span className="distribution-icon">
                <Icon name="check" size={17} />
              </span>
              <div>
                <b>Distribuição aguardando dia útil</b>
                <p>
                  Prospecção automática somente de segunda a sexta-feira
                </p>
              </div>
            </div>
            <div className="distribution-stats">
              <span>
                <b>0</b> recebidos
              </span>
              <span>
                <b>0</b> trabalhados
              </span>
              <span>
                <b>0</b> pendentes
              </span>
            </div>
          </section>

          <section className="daily-production panel">
            <div className="panel-head">
              <div>
                <span className="section-index">01</span>
                <h3>Meu dia · o que falta para bater a meta</h3>
              </div>
              <Link href="/carteira"><button>Registrar produção</button></Link>
            </div>
            <div className="kpi-grid">
              {dailyKpis.map((item) => (
                <KpiCard item={item} key={item.label} />
              ))}
            </div>
          </section>

          <section className="strategy-scoreboard panel">
            <div className="panel-head">
              <div>
                <span className="section-index">MÊS</span>
                <h3>Plano estratégico · {monthLabel}</h3>
              </div>
              <Link href="/indicadores"><button>Ver metodologia completa</button></Link>
            </div>
            <div className="strategy-body">
              <article className="monthly-call-goal">
                <span>Tentativas de ligação</span>
                <strong>
                  0 <i>/ 1.100</i>
                </strong>
                <div>
                  <b style={{ width: "0%" }} />
                </div>
                <small>Meta real: 50 por dia útil · faltam 1.100</small>
              </article>
              <article>
                <span>Contatos efetivos</span>
                <strong>0</strong>
                <small>Sem contatos efetivos registrados</small>
              </article>
              <article>
                <span>Conversas qualificadas</span>
                <strong>
                  0 <i>/ 220–330</i>
                </strong>
                <small>Produção inicia com o primeiro atendimento real</small>
              </article>
              <article>
                <span>Próximas ações</span>
                <strong>0%</strong>
                <small>Nenhum atendimento registrado</small>
              </article>
            </div>
            <div className="sales-levels">
              <header>
                <span>Escala de vendas mensal</span>
                <b>0 vendas confirmadas</b>
              </header>
              {[
                { n: 5, label: "Meta", tone: "base" },
                { n: 7, label: "Forte", tone: "strong" },
                { n: 10, label: "Alta performance", tone: "high" },
                { n: 12, label: "Excelência", tone: "elite" },
              ].map((level) => (
                <article className={level.tone} key={level.n}>
                  <i>{level.n}</i>
                  <span>{level.label}</span>
                  <b>
                    {0 >= level.n
                      ? "ATINGIDO"
                      : `${level.n} restante${level.n > 1 ? "s" : ""}`}
                  </b>
                </article>
              ))}
            </div>
            <footer>
              <b>
                Ligações → contatos efetivos → conversas qualificadas → leads
                qualificados → análises → aprovações → visitas → propostas →
                vendas → comissão
              </b>
              <span>
                A meta não bloqueia produção: resultados acima de 100% continuam
                sendo registrados.
              </span>
            </footer>
          </section>

          <section className="command-grid">
            <div className="panel priority-panel">
              <div className="panel-head">
                <div>
                  <span className="section-index">02</span>
                  <h3>Carteira do dia · próximos contatos</h3>
                </div>
                <Link href="/carteira"><button>Ver carteira</button></Link>
              </div>
              <div className="priority-list">
                {!priorities.length && <p>Nenhum contato trabalhado. A carteira abre no próximo dia útil.</p>}
                {priorities.map((client) => (
                  <article key={client.name}>
                    <span className="client-signal">
                      <Icon name={client.channel} />
                    </span>
                    <div>
                      <b>{client.name}</b>
                      <span>{client.reason}</span>
                      <small>{client.age}</small>
                    </div>
                    <div className="contact-actions">
                      <a
                        href={`tel:+${client.phone}`}
                        aria-label={`Ligar para ${client.name}`}
                      >
                        <Icon name="phone" size={15} />
                      </a>
                      <a
                        href={`https://wa.me/${client.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`WhatsApp para ${client.name}`}
                      >
                        <Icon name="whatsapp" size={16} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="panel agenda-panel">
              <div className="panel-head">
                <div>
                  <span className="section-index">03</span>
                  <h3>Agenda de hoje</h3>
                </div>
                <Link href="/agenda"><button>Ver agenda</button></Link>
              </div>
              <div className="agenda-list">
                {!appointments.length && <p>Nenhum compromisso registrado.</p>}
                {appointments.map((item) => (
                  <article key={item.time}>
                    <time>{item.time}</time>
                    <span></span>
                    <div>
                      <b>{item.name}</b>
                      <strong>{item.type}</strong>
                      <small>{item.place}</small>
                    </div>
                  </article>
                ))}
              </div>
              <Link href="/agenda" className="agenda-add dashboard-action-link">
                <Icon name="plus" size={16} />
                Agendar compromisso
              </Link>
            </div>
          </section>

          <section className="panel followup-panel">
            <div className="panel-head">
              <div>
                <span className="section-index">04</span>
                <h3>Central de follow-ups · carteira em tratamento</h3>
              </div>
              <Link href="/follow-ups"><button>Ver todos os clientes</button></Link>
            </div>
            <div className="followup-summary">
              <div>
                <strong>0</strong>
                <span>clientes em acompanhamento</span>
              </div>
              <p>
                Nenhum cliente é perdido. Cada contato permanece em uma cadência
                até avançar, pausar ou reativar.
              </p>
              <Link href="/follow-ups" className="dashboard-action-link execute-queue">
                <Icon name="check" size={15} />
                Executar fila de hoje
              </Link>
            </div>
            <div className="followup-grid">
              {followupStages.map((stage) => (
                <article key={stage.label}>
                  <div className="followup-stage-head">
                    <span>{stage.label}</span>
                    <strong>{stage.count}</strong>
                  </div>
                  {stage.count > 0 && <div className="followup-client">
                    <b>{stage.client}</b>
                    <small>{stage.timing}</small>
                  </div>}
                  <div className="followup-actions">
                    {stage.overdue > 0 ? (
                      <span>{stage.overdue} atrasados</span>
                    ) : (
                      <span className="scheduled">programados</span>
                    )}
                    {stage.count > 0 && <a
                      href={`https://wa.me/${stage.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp para ${stage.client}`}
                    >
                      <Icon name="whatsapp" size={18} />
                    </a>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel funnel-panel">
            <div className="panel-head">
              <div>
                <span className="section-index">05</span>
                <h3>Funil comercial Monteiro · método de alta conversão</h3>
              </div>
              <Link href="/funil"><button>Ver análise completa</button></Link>
            </div>
            <div className="executive-funnel">
              <div className="funnel-core">
                <div className="funnel-aura"></div>
                {commercialFunnel.map((stage, index) => (
                  <article
                    className={`executive-slice slice-${index + 1}`}
                    key={stage.label}
                  >
                    <span className="slice-step">0{index + 1}</span>
                    <div>
                      <b>{stage.label}</b>
                      <small>
                        {index === 0
                          ? "Entrada da carteira"
                          : `${Math.round((stage.reference / commercialFunnel[index - 1].reference) * 100)}% de conversão esperada`}
                      </small>
                    </div>
                    <strong>
                      {stage.current}
                      <i> atuais</i>
                    </strong>
                  </article>
                ))}
              </div>
              <aside className="funnel-command">
                <span className="method-label">Controle de conversão</span>
                <h4>Da prospecção à venda</h4>
                <p>Referência da Sugestão 01 aplicada à carteira ativa.</p>
                {commercialFunnel.map((stage) => (
                  <div key={stage.label}>
                    <span>{stage.label}</span>
                    <b>{stage.reference}</b>
                  </div>
                ))}
                <footer>
                  <span>Conversão final esperada</span>
                  <strong>18%</strong>
                </footer>
              </aside>
            </div>
            <div className="process-track">
              <div>
                <span>Processo após pasta</span>
                <b>Financiamento e relacionamento até o pós-venda</b>
              </div>
              <div className="process-stages">
                {financingStages.map((stage, index) => (
                  <span key={stage}>
                    <i>{index + 1}</i>
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="goals-panel">
            <div className="goal-copy">
              <span>Metas por corretor</span>
              <b>Resultado que importa</b>
              <p>KPI diário só tem valor quando produz avanço real no funil.</p>
            </div>
            <article>
              <strong>10</strong>
              <span>comparecimentos</span>
              <small>meta semanal</small>
            </article>
            <article>
              <strong>30</strong>
              <span>comparecimentos</span>
              <small>meta mensal</small>
            </article>
            <article>
              <strong>10</strong>
              <span>aprovações</span>
              <small>meta mensal</small>
            </article>
            <article className="final-goal">
              <strong>5</strong>
              <span>vendas</span>
              <small>meta base mensal</small>
            </article>
          </section>
        </div>
        <nav className="bottom-nav">
          <button className="active">
            <Icon name="home" />
            <span>Início</span>
          </button>
          <button>
            <Icon name="funnel" />
            <span>Funil</span>
          </button>
          <button className="add">
            <Icon name="plus" size={26} />
          </button>
          <button>
            <Icon name="calendar" />
            <span>Agenda</span>
          </button>
          <button>
            <Icon name="menu" />
            <span>Mais</span>
          </button>
        </nav>
      </div>
      {menuOpen && (
        <button
          className="overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}
    </main>
  );
}
