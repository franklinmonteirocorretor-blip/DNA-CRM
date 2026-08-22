"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CrmNavigation } from "../../components/crm-navigation";
import { PhoneIcon } from "../../components/phone-icon";
import "../clientes.css";
import "./ficha.css";

type Client = Record<string, unknown> & {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  origin_type: string;
  origin_detail: string | null;
  project_interest: string | null;
  funnel_stage: string;
  finance_stage: string;
  post_sale_stage: string | null;
  next_action: string | null;
  created_at: string;
};
type Event = {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  occurred_at: string;
};
type Appointment = {
  id: number;
  kind: string;
  starts_at: string;
  status: string;
  outcome: string | null;
  notes: string | null;
};
type Document = {
  id: number;
  document_type: string;
  file_name: string;
  created_at: string;
  url: string | null;
};
type Source = {
  origin_type: string;
  origin_detail: string | null;
  project_interest: string | null;
  source_file: string | null;
  created_at: string;
};
type Detail = {
  client: Client;
  events: Event[];
  appointments: Appointment[];
  documents: Document[];
  sources: Source[];
  sales: Array<Record<string, unknown>>;
};
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
const money = (value: unknown) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const buttonStyle = {
  height: 36,
  padding: "0 15px",
  border: "1px solid #9b7419",
  borderRadius: 6,
  background: "#d9aa3d",
  color: "#080808",
  fontWeight: 700,
  fontSize: 10,
  cursor: "pointer",
} as const;

export default function ClientRecordPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const load = () =>
    fetch(`/api/clients/${params.id}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setDetail(data);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // Reload ficha when route client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);
  const timeline = useMemo(() => {
    if (!detail) return [];
    return [
      ...detail.events.map((v) => ({
        ...v,
        when: v.occurred_at,
        kind: "Atendimento / processo",
      })),
      ...detail.appointments.map((v) => ({
        id: `a${v.id}`,
        title: v.kind,
        description: [v.status, v.outcome, v.notes].filter(Boolean).join(" · "),
        when: v.starts_at,
        kind: "Agenda",
      })),
    ].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }, [detail]);
  if (error) return <div className="record-state">{error}</div>;
  if (!detail)
    return <div className="record-state">Carregando ficha completa...</div>;
  const c = detail.client;
  const removeDocument = async (document: Document) => {
    if (!confirm(`Excluir ${document.file_name}?`)) return;
    const response = await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: c.id,
        documentType: document.document_type,
      }),
    });
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Falha ao excluir arquivo.");
    await load();
  };
  const startService = async () => {
    setStarting(true);
    setError("");
    const response = await fetch("/api/daily-portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start-client", clientId: c.id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Não foi possível iniciar o atendimento.");
      setStarting(false);
      return;
    }
    router.push(`/carteira?clientId=${c.id}`);
  };
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
        <header className="clients-header record-header">
          <div>
            <Link href="/clientes">‹ Todos os clientes</Link>
            <h1>{c.name}</h1>
            <p>
              Ficha única · qualificação, cadastro, documentos e histórico
              integral
            </p>
          </div>
          <div className="record-contact">
            <button
              style={buttonStyle}
              onClick={startService}
              disabled={starting}
            >
              {starting ? "Iniciando..." : "Iniciar atendimento"}
            </button>
            <a href={`tel:+${c.phone}`}>
              <PhoneIcon /> Ligar
            </a>
            <a
              className="wpp"
              href={`https://wa.me/${c.phone}`}
              target="_blank"
              rel="noreferrer"
            >
              <Image src="/whatsapp.svg" alt="" width={15} height={15} />{" "}
              WhatsApp
            </a>
          </div>
        </header>
        <div className="record-content">
          <section className="record-summary">
            <article>
              <span>Atendimento</span>
              <b>{c.funnel_stage || "Não iniciado"}</b>
            </article>
            <article>
              <span>Financiamento</span>
              <b>{c.finance_stage || "Não iniciado"}</b>
            </article>
            <article>
              <span>Pós-venda</span>
              <b>{c.post_sale_stage || "Não iniciado"}</b>
            </article>
            <article>
              <span>Próxima ação</span>
              <b>{c.next_action || "Definir próxima ação"}</b>
            </article>
          </section>
          <div className="record-grid">
            <section className="record-card">
              <header>
                <span>Qualificação MCMV</span>
                <h2>Dados do atendimento</h2>
              </header>
              <dl>
                <div>
                  <dt>E-mail</dt>
                  <dd>{c.email || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Sexo</dt>
                  <dd>{String(c.sex || "Não informado")}</dd>
                </div>
                <div>
                  <dt>Estado civil</dt>
                  <dd>{String(c.marital_status || "Não informado")}</dd>
                </div>
                <div>
                  <dt>Profissão / renda</dt>
                  <dd>{String(c.profession || "Não informado")}</dd>
                </div>
                <div>
                  <dt>Renda mensal</dt>
                  <dd>{c.income ? money(c.income) : "Não informada"}</dd>
                </div>
                <div>
                  <dt>Região de interesse</dt>
                  <dd>{String(c.region_interest || "Não informada")}</dd>
                </div>
                <div>
                  <dt>Empreendimento</dt>
                  <dd>{c.project_interest || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Origem preservada</dt>
                  <dd>
                    {[c.origin_type, c.origin_detail]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="record-card">
              <header>
                <span>Cadastro documental</span>
                <h2>Dados confirmados</h2>
              </header>
              <div className="record-notice">
                CPF, endereço, nascimento, vínculo profissional e dependentes
                aparecem aqui quando forem extraídos e confirmados pelos
                documentos. O CRM não inventa dado ausente.
              </div>
              <dl>
                <div>
                  <dt>Nome</dt>
                  <dd>{c.name}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{c.phone}</dd>
                </div>
                <div>
                  <dt>Qualidade cadastral</dt>
                  <dd>{String(c.data_quality || "Não avaliada")}</dd>
                </div>
                <div>
                  <dt>Documentos anexados</dt>
                  <dd>{detail.documents.length}</dd>
                </div>
              </dl>
            </section>
          </div>
          <div className="record-grid">
            <section className="record-card">
              <header>
                <span>Origens e interesses</span>
                <h2>Histórico das bases</h2>
              </header>
              {detail.sources.length ? (
                detail.sources.map((v, i) => (
                  <article className="record-row" key={i}>
                    <b>
                      {v.origin_type} ·{" "}
                      {v.origin_detail || v.source_file || "Origem"}
                    </b>
                    <span>
                      {v.project_interest || "Interesse não informado"}
                    </span>
                    <small>{date(v.created_at)}</small>
                  </article>
                ))
              ) : (
                <p className="record-empty">Nenhuma origem adicional.</p>
              )}
            </section>
            <section className="record-card">
              <header>
                <span>Documentos</span>
                <h2>Arquivos do cliente</h2>
              </header>
              {detail.documents.length ? (
                detail.documents.map((v) => (
                  <article className="record-row" key={v.id}>
                    <b>{v.document_type}</b>
                    <span>{v.file_name}</span>
                    <small>{date(v.created_at)}</small>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noreferrer">
                        Visualizar
                      </a>
                    )}
                    <button onClick={() => removeDocument(v)}>Excluir</button>
                  </article>
                ))
              ) : (
                <p className="record-empty">Nenhum documento anexado.</p>
              )}
            </section>
          </div>
          <section className="record-card record-timeline">
            <header>
              <span>Linha do tempo única</span>
              <h2>Todo o histórico do cliente</h2>
            </header>
            {timeline.length ? (
              timeline.map((v) => (
                <article key={String(v.id)}>
                  <i />
                  <div>
                    <span>{v.kind}</span>
                    <b>{v.title}</b>
                    <p>{v.description || "Registro sem observação."}</p>
                    <small>{date(v.when)}</small>
                  </div>
                </article>
              ))
            ) : (
              <p className="record-empty">
                Nenhum atendimento ou processo registrado.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
