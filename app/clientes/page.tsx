"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import { CrmCenterTabs } from "../components/crm-center-tabs";
import "./clientes.css";

type Client = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  project_interest: string | null;
  funnel_stage: string | null;
  finance_stage: string | null;
  post_sale_stage: string | null;
  origin_type: string | null;
  origin_detail: string | null;
  next_action: string | null;
  updated_at: string;
  created_at: string;
};
type Builder = {
  id: number;
  name: string;
  projects: Array<{ id: number; name: string; city: string }>;
};
type Enriched = Client & {
  projects: string[];
  builders: string[];
  cities: string[];
};

const clean = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(condominio|residencial|empreendimento)\b/g, " ")
    .replace(/\b(timon|teresina)[-\s]*(ma|pi)?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const projectFamily = (value: string) => {
  const key = clean(value);
  if (key.includes("village garden")) return "Village Garden";
  if (key.includes("village dos passaros")) return "Village dos Pássaros II";
  if (key.includes("village natureza")) return "Village Natureza";
  return value.trim();
};

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]),
    [catalog, setCatalog] = useState<Builder[]>([]),
    [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""),
    [city, setCity] = useState("all"),
    [project, setProject] = useState("all"),
    [builder, setBuilder] = useState("all"),
    [service, setService] = useState("all"),
    [finance, setFinance] = useState("all"),
    [situation, setSituation] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [segment, setSegment] = useState<"all" | "lead" | "cold">("all");
  useEffect(() => {
    Promise.all([
      fetch("/api/clients?limit=5000", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch("/api/catalog", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([rows, cat]) => {
        setClients(rows);
        setCatalog(cat);
      })
      .finally(() => setLoading(false));
  }, []);
  const enriched = useMemo<Enriched[]>(
    () =>
      clients.map((c) => {
        const raw = (c.project_interest || "")
          .split("|")
          .map((v) => v.trim())
          .filter(Boolean);
        const matched = new Map<string, { builder: string; city: string }>();
        for (const item of raw) {
          const normalized = clean(item);
          let found = false;
          for (const b of catalog)
            for (const p of b.projects) {
              const pk = clean(p.name);
              if (
                pk &&
                (normalized.includes(pk) ||
                  (pk.includes(normalized) && normalized.length > 5))
              ) {
                matched.set(projectFamily(p.name), {
                  builder: b.name,
                  city: p.city,
                });
                found = true;
              }
            }
          if (!found)
            matched.set(projectFamily(item), { builder: "", city: "" });
        }
        return {
          ...c,
          projects: [...matched.keys()],
          builders: [
            ...new Set(
              [...matched.values()].map((v) => v.builder).filter(Boolean),
            ),
          ],
          cities: [
            ...new Set(
              [...matched.values()].map((v) => v.city).filter(Boolean),
            ),
          ],
        };
      }),
    [clients, catalog],
  );
  const projects = useMemo(
    () =>
      [...new Set(enriched.flatMap((c) => c.projects))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [enriched],
  );
  const cities = useMemo(
    () =>
      [...new Set(catalog.flatMap((b) => b.projects.map((p) => p.city)))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [catalog],
  );
  const stages = (
    field: "funnel_stage" | "finance_stage" | "post_sale_stage",
  ) =>
    [
      ...new Set(clients.map((c) => c[field]).filter(Boolean) as string[]),
    ].sort();
  const filtered = useMemo(() => {
    const text = search.trim().toLocaleLowerCase("pt-BR"),
      digits = text.replace(/\D/g, "");
    return enriched.filter((c) => {
      const date = new Date(c.created_at || c.updated_at);
      const origin = clean(c.origin_type || "");
      const segmentOk =
        segment === "all" ||
        (segment === "lead" && origin.includes("lead")) ||
        (segment === "cold" &&
          (origin.includes("lista") || origin.includes("fria")));
      return (
        segmentOk &&
        (!text ||
          c.name.toLocaleLowerCase("pt-BR").includes(text) ||
          (c.email || "").toLocaleLowerCase("pt-BR").includes(text) ||
          (digits && c.phone.replace(/\D/g, "").includes(digits)) ||
          (c.funnel_stage || "").toLocaleLowerCase("pt-BR").includes(text) ||
          (c.finance_stage || "").toLocaleLowerCase("pt-BR").includes(text) ||
          (c.post_sale_stage || "")
            .toLocaleLowerCase("pt-BR")
            .includes(text)) &&
        (project === "all" || c.projects.includes(project)) &&
        (city === "all" || c.cities.includes(city)) &&
        (builder === "all" || c.builders.includes(builder)) &&
        (service === "all" || c.funnel_stage === service) &&
        (finance === "all" || c.finance_stage === finance) &&
        (situation === "all" || c.post_sale_stage === situation) &&
        (!from || date >= new Date(`${from}T00:00:00`)) &&
        (!to || date <= new Date(`${to}T23:59:59`))
      );
    });
  }, [
    enriched,
    search,
    project,
    city,
    builder,
    service,
    finance,
    situation,
    from,
    to,
    segment,
  ]);
  const clear = () => {
    setSearch("");
    setCity("all");
    setProject("all");
    setBuilder("all");
    setService("all");
    setFinance("all");
    setSituation("all");
    setFrom("");
    setTo("");
  };
  const countSegment = (kind: "lead" | "cold") =>
    clients.filter((c) => {
      const origin = clean(c.origin_type || "");
      return kind === "lead"
        ? origin.includes("lead")
        : origin.includes("lista") || origin.includes("fria");
    }).length;
  return (
    <main className="clients-shell">
      <aside className="clients-sidebar">
        <div className="clients-brand">
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
        <div className="clients-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="clients-main">
        <header className="clients-header">
          <div>
            <span>Cadastro único e histórico integrado</span>
            <h1>Central de Clientes</h1>
            <p>
              Banco completo: cadastrados, não trabalhados e clientes em todas
              as jornadas.
            </p>
          </div>
          <strong>{clients.length.toLocaleString("pt-BR")} cadastros</strong>
        </header>
        <CrmCenterTabs />
        <div className="clients-content">
          <nav className="client-segments">
            <button
              className={segment === "all" ? "active" : ""}
              onClick={() => setSegment("all")}
            >
              Todos <b>{clients.length.toLocaleString("pt-BR")}</b>
            </button>
            <button
              className={segment === "lead" ? "active" : ""}
              onClick={() => setSegment("lead")}
            >
              Leads <b>{countSegment("lead").toLocaleString("pt-BR")}</b>
            </button>
            <button
              className={segment === "cold" ? "active" : ""}
              onClick={() => setSegment("cold")}
            >
              Listas frias <b>{countSegment("cold").toLocaleString("pt-BR")}</b>
            </button>
            <p>
              <strong>Origem preservada:</strong> lead não vira lista fria.
              Temperatura: novo até 24h; cadência D1–D7; esfriando D8–D15;
              reativação após D15 sem avanço.
            </p>
          </nav>
          <section className="clients-filters">
            <label className="clients-search">
              <span>Pesquisar cliente</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, telefone, etapa ou situação"
              />
            </label>
            <label>
              <span>Cidade</span>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setBuilder("all");
                  setProject("all");
                }}
              >
                <option value="all">Todas</option>
                {cities.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Construtora</span>
              <select
                value={builder}
                onChange={(e) => {
                  setBuilder(e.target.value);
                  setProject("all");
                }}
              >
                <option value="all">Todas</option>
                {catalog
                  .filter(
                    (v) =>
                      city === "all" ||
                      v.projects.some((project) => project.city === city),
                  )
                  .map((v) => (
                    <option key={v.id}>{v.name}</option>
                  ))}
              </select>
            </label>
            <label>
              <span>Empreendimento</span>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                <option value="all">Todos</option>
                {projects
                  .filter(
                    (p) =>
                      builder === "all" ||
                      enriched.some(
                        (c) =>
                          c.projects.includes(p) &&
                          c.builders.includes(builder),
                      ),
                  )
                  .filter(
                    (p) =>
                      city === "all" ||
                      enriched.some(
                        (c) =>
                          c.projects.includes(p) && c.cities.includes(city),
                      ),
                  )
                  .map((v) => (
                    <option key={v}>{v}</option>
                  ))}
              </select>
            </label>
            <label>
              <span>Jornada de atendimento</span>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="all">Todas</option>
                {stages("funnel_stage").map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Jornada de financiamento</span>
              <select
                value={finance}
                onChange={(e) => setFinance(e.target.value)}
              >
                <option value="all">Todas</option>
                {stages("finance_stage").map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Situação no pós-venda</span>
              <select
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
              >
                <option value="all">Todas</option>
                {stages("post_sale_stage").map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Cadastrado de</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              <span>Até</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </section>
          <div className="clients-result">
            <span>Resultado do recorte</span>
            <b>{filtered.length.toLocaleString("pt-BR")} clientes</b>
            <button onClick={clear}>Limpar filtros</button>
          </div>
          <section className="clients-table">
            <header>
              <span>Cliente e contato</span>
              <span>Empreendimento / construtora</span>
              <span>Atendimento</span>
              <span>Financiamento</span>
              <span>Próxima ação</span>
              <span>Ficha</span>
            </header>
            {loading && (
              <div className="clients-empty">Carregando banco completo...</div>
            )}
            {!loading && !filtered.length && (
              <div className="clients-empty">
                Nenhum cliente encontrado neste recorte.
              </div>
            )}
            {filtered.map((c) => (
              <article key={c.id}>
                <div>
                  <b>{c.name}</b>
                  <span>{c.phone}</span>
                  <small>{c.email || "E-mail não informado"}</small>
                </div>
                <div>
                  <b>{c.projects.join(" · ") || "Não informado"}</b>
                  <small>
                    {c.builders.join(" · ") ||
                      [c.origin_type, c.origin_detail]
                        .filter(Boolean)
                        .join(" · ") ||
                      "Construtora não identificada"}
                  </small>
                </div>
                <span className="stage gold">
                  {c.funnel_stage || "Não trabalhado"}
                </span>
                <span
                  className={`stage ${c.finance_stage === "Aprovado" ? "green" : c.finance_stage === "Restrição" ? "red" : "gold"}`}
                >
                  {c.finance_stage || "Não iniciado"}
                </span>
                <div>
                  <b>{c.next_action || "Realizar primeiro contato"}</b>
                  <small>
                    Cadastro:{" "}
                    {new Date(c.created_at || c.updated_at).toLocaleDateString(
                      "pt-BR",
                    )}
                  </small>
                </div>
                <Link href={`/clientes/${c.id}`}>Abrir ficha →</Link>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
