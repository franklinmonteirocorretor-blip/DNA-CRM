"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { useMemo, useState } from "react";
import "./funil.css";
import "./funil-fixes.css";

type Card = {
  name: string;
  phone: string;
  origin: string;
  interest: string;
  next: string;
  due: string;
  risk?: boolean;
  value?: string;
};
type Stage = { name: string; target: string; color: string; cards: Card[] };

const commercial: Stage[] = [
  {
    name: "Prospecção",
    target: "100 ref.",
    color: "#c99226",
    cards: [
      {
        name: "Júlia Martins",
        phone: "5586998103886",
        origin: "Lead · Instagram",
        interest: "Village Natureza",
        next: "Ligação inicial",
        due: "Hoje 09:20",
      },
      {
        name: "David Vilanova",
        phone: "5586995273251",
        origin: "Lista fria · Betacon",
        interest: "Teresina Leste",
        next: "Primeira abordagem",
        due: "Hoje 10:10",
      },
      {
        name: "Maria Ivonete",
        phone: "5599981155427",
        origin: "Lead · Facebook",
        interest: "Village Garden II",
        next: "WhatsApp inicial",
        due: "Hoje 11:00",
      },
    ],
  },
  {
    name: "Agendamento",
    target: "60%",
    color: "#bc8421",
    cards: [
      {
        name: "Camila Monteiro",
        phone: "5586998112233",
        origin: "Lead · Instagram",
        interest: "Village Garden II",
        next: "Confirmar apresentação",
        due: "Hoje 10:30",
        risk: true,
      },
      {
        name: "Lucas Almeida",
        phone: "5586998554411",
        origin: "Lista fria · Canopus",
        interest: "Timon",
        next: "Enviar localização",
        due: "Hoje 13:15",
      },
    ],
  },
  {
    name: "Visita",
    target: "50%",
    color: "#aa731d",
    cards: [
      {
        name: "Fernanda Souza",
        phone: "5586997443322",
        origin: "Lead · Facebook",
        interest: "Alto Belo Leste",
        next: "Confirmar comparecimento",
        due: "Amanhã 09:00",
      },
      {
        name: "Renan Ribeiro",
        phone: "5586996332211",
        origin: "Indicação",
        interest: "Aquisição + construção",
        next: "Visita técnica",
        due: "Amanhã 15:30",
      },
    ],
  },
  {
    name: "Pasta",
    target: "83%",
    color: "#96611a",
    cards: [
      {
        name: "Nicolle",
        phone: "5586999964566",
        origin: "Lista fria · Canopus",
        interest: "Teresina Leste",
        next: "Cobrar extrato FGTS",
        due: "Vencido há 1d",
        risk: true,
      },
    ],
  },
  {
    name: "Fechamento",
    target: "80%",
    color: "#805017",
    cards: [
      {
        name: "Rodrigo Santos",
        phone: "5586984664369",
        origin: "Lista fria · Betacon",
        interest: "Residencial Jóia",
        next: "Revisar fluxo",
        due: "Hoje 16:00",
        value: "R$ 217.500",
      },
    ],
  },
  {
    name: "Venda",
    target: "90%",
    color: "#d9aa3d",
    cards: [
      {
        name: "Herbert Santos",
        phone: "5586999029598",
        origin: "Lead · Instagram",
        interest: "Village Garden II",
        next: "Iniciar documentação",
        due: "Concluído",
        value: "R$ 228.900",
      },
    ],
  },
];

const financing: Stage[] = [
  {
    name: "Aguardando docs",
    target: "9 clientes",
    color: "#b78528",
    cards: [
      {
        name: "Nicolle",
        phone: "5586999964566",
        origin: "Lista fria · Canopus",
        interest: "Teresina Leste",
        next: "Carteira digital + FGTS",
        due: "Vencido",
        risk: true,
      },
    ],
  },
  {
    name: "Em análise",
    target: "6 clientes",
    color: "#a97825",
    cards: [
      {
        name: "Rodrigo Santos",
        phone: "5586984664369",
        origin: "Lista fria · Betacon",
        interest: "Residencial Jóia",
        next: "Retorno do CCA",
        due: "48h sem movimento",
        risk: true,
      },
    ],
  },
  {
    name: "Restrição",
    target: "8 clientes",
    color: "#8e6627",
    cards: [
      {
        name: "Roberta Mendes",
        phone: "5589981474578",
        origin: "Lead · Instagram",
        interest: "Village Garden II",
        next: "Revisão de débitos",
        due: "18 ago",
      },
    ],
  },
  {
    name: "Condicionado",
    target: "3 clientes",
    color: "#795b2c",
    cards: [
      {
        name: "Carlos Oliveira",
        phone: "5586997221100",
        origin: "Lead · Facebook",
        interest: "Villa Ametista",
        next: "Comprovar renda",
        due: "12 ago",
      },
    ],
  },
  {
    name: "Aprovado",
    target: "4 clientes",
    color: "#846923",
    cards: [
      {
        name: "Camila Monteiro",
        phone: "5586998112233",
        origin: "Lead · Instagram",
        interest: "Village Garden II",
        next: "Apresentar unidade",
        due: "Hoje 11:30",
      },
    ],
  },
  {
    name: "Fechado",
    target: "2 clientes",
    color: "#a78025",
    cards: [
      {
        name: "Herbert Santos",
        phone: "5586999029598",
        origin: "Lead · Instagram",
        interest: "Village Garden II",
        next: "Contrato construtora",
        due: "13 ago",
        value: "R$ 228.900",
      },
    ],
  },
  {
    name: "Chaves",
    target: "1 cliente",
    color: "#c99b31",
    cards: [
      {
        name: "Ana Marielly",
        phone: "5586995947875",
        origin: "Lista fria · Parceiro",
        interest: "Moradas de Timon",
        next: "Agendar entrega",
        due: "20 ago",
      },
    ],
  },
  {
    name: "Pós-venda",
    target: "3 clientes",
    color: "#d9aa3d",
    cards: [
      {
        name: "Anderson Guilherme",
        phone: "5586995216936",
        origin: "Lista fria · Parceiro",
        interest: "Teresina Norte",
        next: "Solicitar indicação",
        due: "25 ago",
      },
    ],
  },
];

// A produção inicia vazia; os cartões entram somente por eventos reais do CRM.
commercial.forEach((stage) => stage.cards.splice(0));
financing.forEach((stage) => { stage.cards.splice(0); stage.target = "0 clientes"; });

export default function FunilPage() {
  const [mode, setMode] = useState<"Comercial" | "Financiamento">("Comercial");
  const [period, setPeriod] = useState("Este mês");
  const [view, setView] = useState("Estoque atual");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Card | null>(null);
  const stages = mode === "Comercial" ? commercial : financing;
  const visible = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        cards: stage.cards.filter((c) =>
          c.name.toLowerCase().includes(query.toLowerCase()),
        ),
      })),
    [stages, query],
  );
  const total = stages.reduce((sum, s) => sum + s.cards.length, 0);
  return (
    <main className="pipe-shell">
      <aside className="pipe-sidebar">
        <div className="pipe-brand">
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro CRM"
            width={58}
            height={64}
            priority
          />
          <b>MONTEIRO</b>
          <span>CRM</span>
        </div>
        <CrmNavigation />
        <div className="pipe-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor de imóveis</span>
          </div>
        </div>
      </aside>
      <section className="pipe-main">
        <header className="pipe-header">
          <div>
            <Link href="/">‹ Voltar</Link>
            <span>Gestão da carteira ativa</span>
            <h1>Funil Operacional</h1>
          </div>
          <div className="pipe-actions">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente"
            />
          <button onClick={()=>document.querySelector<HTMLSelectElement>("#filtros-funil select")?.focus({preventScroll:true})}>Filtros</button>
          </div>
        </header>
        <div className="pipe-content">
          <section className="pipe-top">
            <div className="pipe-mode">
              <button
                className={mode === "Comercial" ? "active" : ""}
                onClick={() => setMode("Comercial")}
              >
                Funil comercial
              </button>
              <button
                className={mode === "Financiamento" ? "active" : ""}
                onClick={() => setMode("Financiamento")}
              >
                Esteira de financiamento
              </button>
            </div>
            <div className="pipe-kpis">
              <article>
                <span>Carteira ativa</span>
                <b>{total}</b>
              </article>
              <article>
                <span>Sem próxima ação</span>
                <b className="danger">0</b>
              </article>
              <article>
                <span>Em risco</span>
                <b>0</b>
              </article>
              <article>
                <span>VGV em negociação</span>
                <b>R$ 0,00</b>
              </article>
            </div>
          </section>
          <section className="period-control" id="filtros-funil">
            <div className="period-title">
              <span>Recorte de análise</span>
              <b>Separar desempenho sem perder histórico da carteira</b>
            </div>
            <div className="period-options">
              <label>
                <span>Período</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option>Hoje</option>
                  <option>Este mês</option>
                  <option>Este trimestre</option>
                  <option>Este ano</option>
                  <option>Personalizado</option>
                </select>
              </label>
              <label>
                <span>De</span>
                <input type="date" defaultValue="2026-08-01" />
              </label>
              <label>
                <span>Até</span>
                <input type="date" defaultValue="2026-08-31" />
              </label>
              <label>
                <span>Visão</span>
                <select value={view} onChange={(e) => setView(e.target.value)}>
                  <option>Estoque atual</option>
                  <option>Entraram no período</option>
                  <option>Movimentaram no período</option>
                  <option>Convertidos no período</option>
                </select>
              </label>
            </div>
            <div className="period-result">
              <span>{period}</span>
              <b>{view}</b>
              <small>Comparação disponível com período anterior</small>
            </div>
          </section>
          <section className="bottleneck">
            <div>
              <span>Gargalo identificado</span>
              <b>
                {mode === "Comercial"
                  ? "Sem produção suficiente para identificar gargalo"
                  : "Nenhum processo de financiamento iniciado"}
              </b>
            </div>
            <p>
              {mode === "Comercial"
                ? "Priorize confirmação 24h e 2h antes do compromisso."
                : "Cobrança objetiva com checklist individual hoje."}
            </p>
            <Link className="bottleneck-action" href={mode==="Comercial"?"/agenda":"/analises"}>Atuar no gargalo</Link>
          </section>
          <section
            className={`kanban ${mode === "Financiamento" ? "finance" : ""}`}
          >
            {visible.map((stage, index) => (
              <div className="kanban-column" key={stage.name}>
                <header
                  style={{ "--stage": stage.color } as React.CSSProperties}
                >
                  <div>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{stage.name}</b>
                  </div>
                  <strong>{stage.cards.length}</strong>
                  <small>{stage.target}</small>
                </header>
                <div className="kanban-cards">
                  {stage.cards.map((card) => (
                    <article
                      className={card.risk ? "risk" : ""}
                      onClick={() => setSelected(card)}
                      key={card.name}
                    >
                      <div className="card-top">
                        <span>{card.origin}</span>
                        {card.risk && <i>Em risco</i>}
                      </div>
                      <h3>{card.name}</h3>
                      <p>{card.interest}</p>
                      {card.value && <strong>{card.value}</strong>}
                      <div className="next-action">
                        <span>Próxima ação</span>
                        <b>{card.next}</b>
                        <small>{card.due}</small>
                      </div>
                      <div className="card-actions">
                        <a
                          href={`tel:+${card.phone}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ☎
                        </a>
                        <a
                          href={`https://wa.me/${card.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Image
                            src="/whatsapp.svg"
                            alt="WhatsApp"
                            width={17}
                            height={17}
                          />
                        </a>
                        <button>•••</button>
                      </div>
                    </article>
                  ))}
                </div>
                <Link className="column-action" href={mode==="Comercial"?"/carteira":"/analises"}>Ver etapa completa</Link>
              </div>
            ))}
          </section>
        </div>
      </section>
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="client-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)}>
              ×
            </button>
            <span>Resumo do cliente</span>
            <h2>{selected.name}</h2>
            <p>{selected.interest}</p>
            <div>
              <label>Origem</label>
              <b>{selected.origin}</b>
            </div>
            <div>
              <label>Próxima ação</label>
              <b>{selected.next}</b>
              <small>{selected.due}</small>
            </div>
            <div className="drawer-actions">
              <a href={`tel:+${selected.phone}`}>Ligar</a>
              <a
                href={`https://wa.me/${selected.phone}`}
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="/whatsapp.svg"
                  alt="WhatsApp"
                  width={17}
                  height={17}
                />
                WhatsApp
              </a>
            </div>
            <Link className="drawer-primary" href="/clientes">
              Abrir ficha completa
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
