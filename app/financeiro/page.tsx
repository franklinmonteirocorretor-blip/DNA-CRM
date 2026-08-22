"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import { CrmCenterTabs } from "../components/crm-center-tabs";
import {
  CurrencyInput,
  PercentageInput,
} from "../components/formatted-number-input";
import {
  deleteClientDocument,
  uploadClientDocument,
} from "@/lib/upload-client-document";
import { CATALOG_CITIES, normalizeCatalogCity } from "@/lib/catalog-hierarchy";
import "../pos-venda/pos-venda.css";
import "./financeiro.css";

type Project = { id: number; name: string; city: string; region?: string };
type Builder = { id: number; name: string; projects: Project[] };
type DocumentItem = {
  id: number;
  document_type: string;
  file_name: string;
  url: string | null;
};
type Sale = {
  id: number;
  clientId: number;
  projectId: number;
  client: string;
  project: string;
  builder: string;
  vgv: number;
  rate: number;
  invoiceDiscount: number;
  bonus: number;
  advance: number;
  received: number;
  status: string;
  closedAt: string;
  paymentDate: string;
  advanceDate: string;
  paymentNote: string;
  campaign: string;
  origin: string;
  city: string;
  projectKind: string;
  builderCategory: string;
  contractCaixaAt: string;
  cancelledAt: string;
  cancellationReason: string;
  cancellationNotes: string;
  cancellationActor: string;
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value || undefined;
const gross = (sale: Sale) => (sale.vgv * sale.rate) / 100;
const deduction = (sale: Sale) => (gross(sale) * sale.invoiceDiscount) / 100;
const net = (sale: Sale) => gross(sale) - deduction(sale);
const earning = (sale: Sale) => net(sale) + sale.bonus;
const balance = (sale: Sale) => Math.max(0, earning(sale) - sale.received);
const paymentState = (sale: Sale) => {
  const due = earning(sale);
  const paid = Math.max(0, sale.received);
  if (due > 0 && paid >= due - 0.01) return { label: "Recebida", tone: "paid" };
  if (paid > 0) return { label: "Parcial", tone: "partial" };
  return { label: "Aguardando pagamento", tone: "unpaid" };
};
const currentMonth = new Date().toISOString().slice(0, 7);
const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const isHouseSale = (sale: Sale) => {
  const classification = plain(`${sale.projectKind} ${sale.builderCategory}`);
  return (
    classification.includes("casa") && !classification.includes("apartamento")
  );
};
const paymentDeadline = (sale: Sale) => {
  if (!sale.contractCaixaAt) return null;
  const date = new Date(sale.contractCaixaAt);
  date.setDate(date.getDate() + (isHouseSale(sale) ? 7 : 30));
  return date;
};
const deadlineLabel = (sale: Sale) => {
  const deadline = paymentDeadline(sale);
  if (!deadline)
    return { text: "Aguardando assinatura do contrato CAIXA", tone: "waiting" };
  const days = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  const limit = isHouseSale(sale) ? 7 : 30;
  if (days < 0)
    return {
      text: `${Math.abs(days)} dia(s) em atraso · prazo ${limit} dias`,
      tone: "overdue",
    };
  if (days === 0)
    return { text: `Vence hoje · prazo ${limit} dias`, tone: "overdue" };
  return { text: `Vence em ${days} dia(s) · prazo ${limit} dias`, tone: "due" };
};

function normalizeSale(raw: any): Sale {
  const client = one(raw.clients);
  const project = one(raw.projects);
  const builder = one(project?.builders);
  const meta = raw.financeMeta || {};
  return {
    id: Number(raw.id),
    clientId: Number(raw.client_id),
    projectId: Number(raw.project_id),
    client: client?.name || "Cliente sem nome",
    project: project?.name || "Empreendimento não informado",
    builder: builder?.name || "Construtora não informada",
    city: normalizeCatalogCity(project?.city, project?.region),
    vgv: Number(raw.vgv || 0),
    rate: Number(raw.commission_rate || 0),
    invoiceDiscount: Number(raw.invoice_discount || 0),
    bonus: Number(raw.bonus || 0),
    advance: Number(raw.advance || 0),
    received: Number(raw.received || 0),
    status: raw.status || "Aguardando pagamento",
    closedAt: raw.closed_at || "",
    paymentDate: raw.payment_date || meta.paymentDate || "",
    advanceDate: meta.advanceDate || "",
    paymentNote: meta.paymentNote || "",
    campaign: meta.campaign || "",
    origin:
      [client?.origin_type, client?.origin_detail]
        .filter(Boolean)
        .join(" · ") || "Origem não informada",
    projectKind: project?.kind || "",
    builderCategory: builder?.category || "",
    contractCaixaAt: raw.contractCaixaAt || "",
    cancelledAt: raw.cancelled_at || "",
    cancellationReason: raw.cancellation_reason || "",
    cancellationNotes: raw.cancellation_notes || "",
    cancellationActor: raw.cancellation_actor || "",
  };
}

export default function FinanceiroPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [catalog, setCatalog] = useState<Builder[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [city, setCity] = useState("all");
  const [builder, setBuilder] = useState("all");
  const [project, setProject] = useState("all");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);

  const load = async () => {
    const [salesResponse, catalogResponse] = await Promise.all([
      fetch("/api/finance", { cache: "no-store" }),
      fetch("/api/catalog", { cache: "no-store" }),
    ]);
    const salesData = await salesResponse.json();
    const catalogData = await catalogResponse.json();
    if (!salesResponse.ok)
      throw new Error(salesData.error || "Falha ao carregar vendas.");
    setSales(salesData.map(normalizeSale));
    setCatalog(Array.isArray(catalogData) ? catalogData : []);
  };
  useEffect(() => {
    const timer = window.setTimeout(
      () => load().catch((error) => setMessage(error.message)),
      0,
    );
    return () => window.clearTimeout(timer);
    // Initial server-backed load.
  }, []);
  const selected = sales.find((sale) => sale.id === selectedId) || null;
  useEffect(() => {
    if (!selected) {
      const timer = window.setTimeout(() => setDocuments([]), 0);
      return () => window.clearTimeout(timer);
    }
    fetch(`/api/documents?clientId=${selected.clientId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]));
  }, [selected]);

  const cityCatalog =
    city === "all"
      ? catalog
      : catalog.filter((item) =>
          item.projects.some(
            (entry) => normalizeCatalogCity(entry.city, entry.region) === city,
          ),
        );
  const projects =
    builder === "all"
      ? []
      : (
          catalog.find((item) => String(item.id) === builder)?.projects || []
        ).filter(
          (entry) =>
            city === "all" ||
            normalizeCatalogCity(entry.city, entry.region) === city,
        );
  const businessSales = useMemo(
    () =>
      sales.filter((sale) => {
        if (sale.cancelledAt) return false;
        if (month && sale.closedAt.slice(0, 7) !== month) return false;
        if (city !== "all" && sale.city !== city) return false;
        const chosenBuilder = catalog.find(
          (item) => String(item.id) === builder,
        );
        if (chosenBuilder && sale.builder !== chosenBuilder.name) return false;
        if (project !== "all" && sale.projectId !== Number(project))
          return false;
        return true;
      }),
    [sales, month, city, builder, project, catalog],
  );
  const visible =
    statusFilter === "Canceladas"
      ? sales.filter((sale) => {
          if (!sale.cancelledAt) return false;
          if (month && sale.closedAt.slice(0, 7) !== month) return false;
          if (city !== "all" && sale.city !== city) return false;
          return true;
        })
      : statusFilter === "Todos"
        ? businessSales
        : businessSales.filter((sale) =>
            statusFilter.startsWith("Diverg")
              ? sale.status.startsWith("Diverg")
              : paymentState(sale).label === statusFilter,
          );
  const paymentPipeline = useMemo(
    () =>
      sales
        .filter((sale) => {
          if (sale.cancelledAt) return false;
          if (city !== "all" && sale.city !== city) return false;
          const chosenBuilder = catalog.find(
            (item) => String(item.id) === builder,
          );
          if (chosenBuilder && sale.builder !== chosenBuilder.name)
            return false;
          if (project !== "all" && sale.projectId !== Number(project))
            return false;
          return balance(sale) > 0.01;
        })
        .sort(
          (a, b) =>
            (paymentDeadline(a)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (paymentDeadline(b)?.getTime() ?? Number.MAX_SAFE_INTEGER),
        ),
    [sales, city, builder, project, catalog],
  );
  const totals = useMemo(
    () =>
      businessSales.reduce(
        (acc, sale) => ({
          vgv: acc.vgv + sale.vgv,
          gross: acc.gross + gross(sale),
          discount: acc.discount + deduction(sale),
          bonus: acc.bonus + sale.bonus,
          received: acc.received + sale.received,
          pending: acc.pending + balance(sale),
        }),
        { vgv: 0, gross: 0, discount: 0, bonus: 0, received: 0, pending: 0 },
      ),
    [businessSales],
  );
  const openSale = (sale: Sale) => {
    setSelectedId(sale.id);
    setTimeout(
      () =>
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      50,
    );
  };
  const updateSelected = (key: keyof Sale, value: string | number) =>
    setSales((items) =>
      items.map((item) =>
        item.id === selectedId ? { ...item, [key]: value } : item,
      ),
    );

  const save = async () => {
    if (!selected) return setMessage("Selecione uma venda real.");
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId: selected.id,
        invoiceDiscount: selected.invoiceDiscount,
        bonus: selected.bonus,
        advance: selected.advance,
        received: selected.received,
        advanceDate: selected.advanceDate,
        paymentDate: selected.paymentDate,
        paymentNote: selected.paymentNote,
        campaign: selected.campaign,
        status: selected.status,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.error || "Falha ao salvar.");
    setMessage("Conferência financeira salva.");
    await load();
  };
  const cancelSale = async () => {
    if (!selected || selected.cancelledAt) return;
    if (!cancelReason || !cancelNotes.trim()) {
      setMessage("Informe o motivo e descreva o que ocorreu.");
      return;
    }
    if (
      !confirm(
        "Cancelar esta venda e retirar seu VGV e comissão dos resultados? O histórico será preservado.",
      )
    )
      return;
    setCancelling(true);
    setMessage("");
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        saleId: selected.id,
        reason: cancelReason,
        notes: cancelNotes,
      }),
    });
    const result = await response.json();
    setCancelling(false);
    if (!response.ok)
      return setMessage(result.error || "Falha ao cancelar a venda.");
    setMessage("Venda cancelada. VGV e comissão retirados dos resultados.");
    setCancelReason("");
    setCancelNotes("");
    await load();
  };
  const exportCsv = () => {
    const rows = [
      [
        "Cliente",
        "Cidade",
        "Construtora",
        "Empreendimento",
        "Fechamento",
        "VGV",
        "Comissão %",
        "Desconto NF %",
        "Bônus",
        "Adiantado",
        "Recebido",
        "Saldo",
        "Status",
      ],
      ...businessSales.map((sale) => [
        sale.client,
        sale.city,
        sale.builder,
        sale.project,
        sale.closedAt,
        sale.vgv,
        sale.rate,
        sale.invoiceDiscount,
        sale.bonus,
        sale.advance,
        sale.received,
        balance(sale),
        sale.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `monteiro-vgv-${month || "geral"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const docType = (label: string) =>
    selected ? `Financeiro | Venda ${selected.id} | ${label}` : "";
  const financialDoc = (label: string) =>
    documents.find((document) => document.document_type === docType(label));
  const upload = async (
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selected || !event.target.files?.length) return;
    setMessage(`Enviando ${event.target.files.length} arquivo(s)...`);
    try {
      await uploadClientDocument({
        clientId: selected.clientId,
        documentType: docType(label),
        files: Array.from(event.target.files),
      });
      setMessage(`${label} anexado e unificado em PDF.`);
      const response = await fetch(
        `/api/documents?clientId=${selected.clientId}`,
        { cache: "no-store" },
      );
      setDocuments(await response.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no anexo.");
    } finally {
      event.target.value = "";
    }
  };
  const removeDoc = async (label: string) => {
    if (!selected || !confirm(`Excluir ${label}?`)) return;
    await deleteClientDocument(selected.clientId, docType(label));
    setDocuments((items) =>
      items.filter((item) => item.document_type !== docType(label)),
    );
    setMessage("Anexo excluído.");
  };
  const statuses = [
    "Todos",
    "Aguardando pagamento",
    "Parcial",
    "Recebida",
    "Divergência",
    "Canceladas",
  ];
  const chart = useMemo(() => {
    const ordered = [...businessSales].sort((a, b) =>
      a.closedAt.localeCompare(b.closedAt),
    );
    const max = Math.max(totals.vgv, 1);
    return ordered
      .map((sale, index) => {
        const sum = ordered
          .slice(0, index + 1)
          .reduce((total, item) => total + item.vgv, 0);
        return `${ordered.length === 1 ? 100 : 20 + (index * 660) / Math.max(1, ordered.length - 1)},${210 - (sum / max) * 175}`;
      })
      .join(" ");
  }, [businessSales, totals.vgv]);

  return (
    <main className="after-shell financial-shell">
      <aside className="after-sidebar">
        <div className="after-brand">
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
        <div className="after-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="after-main">
        <header className="after-header financial-header">
          <div>
            <span>Central financeira · produção comercial</span>
            <h1>VGV e Comissões</h1>
            <p>
              Somente vendas, recebimentos e datas efetivamente confirmados.
            </p>
          </div>
        </header>
        <div className="after-content financial-content">
          <CrmCenterTabs />
          <div className="crm-page-toolbar financial-actions">
            <button
              onClick={() =>
                selected
                  ? openSale(selected)
                  : setMessage("Selecione uma venda para registrar o ajuste.")
              }
            >
              ＋ Registrar ajuste
            </button>
            <button onClick={exportCsv}>Exportar relatório</button>
          </div>
          {message && <div className="financial-notice">{message}</div>}
          <section className="financial-filters">
            <label>
              <span>Mês do fechamento</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
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
                <option value="all">Todas as cidades</option>
                {CATALOG_CITIES.map((item) => (
                  <option key={item}>{item}</option>
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
                <option value="all">Todas as construtoras</option>
                {cityCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Empreendimento</span>
              <select
                value={project}
                disabled={builder === "all"}
                onChange={(e) => setProject(e.target.value)}
              >
                <option value="all">VGV geral da construtora</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="financial-sales-goals">
            <header>
              <span>Meta comercial do mês</span>
              <b>{businessSales.length} venda(s) confirmada(s)</b>
              <small>
                O painel responde ao mês, construtora e empreendimento
                selecionados.
              </small>
            </header>
            {[
              { goal: 5, label: "Meta base" },
              { goal: 7, label: "Meta forte" },
              { goal: 10, label: "Alta performance" },
              { goal: 12, label: "Excelência" },
            ].map((level) => (
              <article key={level.goal}>
                <i>{level.goal}</i>
                <div>
                  <b>{level.label}</b>
                  <span>
                    {Math.min(
                      100,
                      (businessSales.length / level.goal) * 100,
                    ).toFixed(0)}
                    % concluído
                  </span>
                </div>
                <em>
                  {level.goal > businessSales.length
                    ? `faltam ${level.goal - businessSales.length}`
                    : "superada"}
                </em>
              </article>
            ))}
          </section>
          <section className="financial-kpis">
            <article className="primary">
              <span>VGV confirmado</span>
              <strong>{brl.format(totals.vgv)}</strong>
              <small>{businessSales.length} venda(s) no recorte</small>
            </article>
            <article>
              <span>Comissão bruta</span>
              <strong>{brl.format(totals.gross)}</strong>
              <small>Percentuais negociados</small>
            </article>
            <article>
              <span>Desconto de NF</span>
              <strong>{brl.format(totals.discount)}</strong>
              <small>Aplicado venda a venda</small>
            </article>
            <article className="bonus">
              <span>Bônus</span>
              <strong>{brl.format(totals.bonus)}</strong>
              <small>Campanhas confirmadas</small>
            </article>
            <article className="received">
              <span>Total recebido</span>
              <strong>{brl.format(totals.received)}</strong>
              <small>Caixa confirmado</small>
            </article>
            <article className="pending">
              <span>A receber</span>
              <strong>{brl.format(totals.pending)}</strong>
              <small>
                {businessSales.filter((sale) => balance(sale) > 0).length}{" "}
                pagamento(s) aberto(s)
              </small>
            </article>
          </section>
          <section className="financial-dashboard">
            <article className="vgv-chart">
              <header>
                <div>
                  <span>Evolução do VGV</span>
                  <h2>Produção acumulada confirmada</h2>
                </div>
                <aside>
                  <b>{brl.format(totals.vgv)}</b>
                  <small>Sem projeções ou valores fictícios</small>
                </aside>
              </header>
              <div className="chart-area">
                {chart ? (
                  <svg viewBox="0 0 720 230" preserveAspectRatio="none">
                    <path
                      className="grid"
                      d="M0 35H720M0 80H720M0 125H720M0 170H720M0 210H720"
                    />
                    <polyline className="line" points={chart} />
                  </svg>
                ) : (
                  <div className="financial-empty">
                    Nenhuma venda confirmada neste recorte.
                  </div>
                )}
              </div>
            </article>
            <article className="commission-flow">
              <header>
                <span>Fluxo das comissões</span>
                <h2>Do fechamento ao caixa</h2>
              </header>
              <div>
                {[
                  ["Comissão bruta", totals.gross],
                  ["Desconto da NF", -totals.discount],
                  ["Bônus", totals.bonus],
                  ["Recebido", totals.received],
                  ["Em aberto", totals.pending],
                ].map(([label, value], i) => (
                  <article key={String(label)}>
                    <i>{i + 1}</i>
                    <span>
                      <b>{label}</b>
                      <small>Valor confirmado</small>
                    </span>
                    <strong>{brl.format(Number(value))}</strong>
                  </article>
                ))}
              </div>
            </article>
          </section>
          <section className="financial-alerts">
            <article>
              <i>!</i>
              <div>
                <b>
                  {
                    businessSales.filter(
                      (sale) => sale.status === "Divergência",
                    ).length
                  }{" "}
                  divergência(s)
                </b>
                <span>Vendas que exigem conferência.</span>
              </div>
              <button
                onClick={() => {
                  setStatusFilter("Divergência");
                  listRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Conferir agora
              </button>
            </article>
            <article>
              <i>⌛</i>
              <div>
                <b>
                  {businessSales.filter((sale) => balance(sale) > 0).length}{" "}
                  pagamento(s) pendente(s)
                </b>
                <span>Sem data estimada: apenas confirmação real.</span>
              </div>
              <button
                onClick={() => {
                  setStatusFilter("Aguardando pagamento");
                  listRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Ver pendências
              </button>
            </article>
          </section>
          <section className="permanent-payment-pipeline">
            <header>
              <div>
                <span>Esteira permanente de pagamentos</span>
                <h2>Comissões abertas de todos os meses</h2>
                <p>
                  O filtro mensal altera o VGV, mas nenhuma comissão desaparece
                  antes da quitação integral.
                </p>
              </div>
              <strong>
                {paymentPipeline.length} aberta(s) ·{" "}
                {brl.format(
                  paymentPipeline.reduce((sum, sale) => sum + balance(sale), 0),
                )}
              </strong>
            </header>
            <div>
              {paymentPipeline.length ? (
                paymentPipeline.map((sale) => {
                  const state = paymentState(sale);
                  const deadline = deadlineLabel(sale);
                  return (
                    <button
                      type="button"
                      key={sale.id}
                      className={`pipeline-payment ${state.tone}`}
                      onClick={() => openSale(sale)}
                    >
                      <span>
                        <b>{sale.client}</b>
                        <small>
                          {sale.builder} · {sale.project}
                        </small>
                      </span>
                      <span>
                        <b>{brl.format(balance(sale))}</b>
                        <small>saldo pendente</small>
                      </span>
                      <span className={deadline.tone}>
                        <b>{deadline.text}</b>
                        <small>
                          {sale.contractCaixaAt
                            ? `Contrato CAIXA: ${new Date(sale.contractCaixaAt).toLocaleDateString("pt-BR")}`
                            : "Prazo inicia na assinatura"}
                        </small>
                      </span>
                      <i>{state.label}</i>
                    </button>
                  );
                })
              ) : (
                <div className="financial-empty">
                  Nenhuma comissão pendente. Todas as vendas estão integralmente
                  quitadas.
                </div>
              )}
            </div>
          </section>
          <section className="receivables" ref={listRef}>
            <header>
              <div>
                <span>Vendas do mês selecionado</span>
                <h2>Rastreabilidade financeira mensal</h2>
              </div>
              <div>
                {statuses.map((item) => (
                  <button
                    key={item}
                    className={statusFilter === item ? "active" : ""}
                    onClick={() => setStatusFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </header>
            <div className="receivable-head">
              <span>Cliente e produto</span>
              <span>Fechamento</span>
              <span>VGV</span>
              <span>Líquido + bônus</span>
              <span>Recebido</span>
              <span>Situação</span>
              <span />
            </div>
            {visible.length ? (
              visible.map((sale) => (
                <article
                  key={sale.id}
                  className={selectedId === sale.id ? "selected-sale" : ""}
                >
                  <div>
                    <b>{sale.client}</b>
                    <span>{sale.project}</span>
                    <small>
                      {sale.builder} · {sale.origin}
                    </small>
                  </div>
                  <span>
                    {sale.closedAt
                      ? new Date(
                          `${sale.closedAt}T12:00:00`,
                        ).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                  <strong>{brl.format(sale.vgv)}</strong>
                  <strong>
                    {brl.format(earning(sale))}
                    <small>
                      {sale.rate}% · NF {sale.invoiceDiscount}% · bônus{" "}
                      {brl.format(sale.bonus)}
                    </small>
                  </strong>
                  <strong className="received-value">
                    {brl.format(sale.received)}
                  </strong>
                  <div>
                    <i
                      className={sale.status.toLowerCase().replaceAll(" ", "-")}
                    >
                      {sale.cancelledAt ? "Cancelada" : sale.status}
                    </i>
                    <small>{sale.paymentNote || "Sem observação"}</small>
                  </div>
                  <button onClick={() => openSale(sale)}>Detalhes →</button>
                </article>
              ))
            ) : (
              <div className="financial-empty">
                Nenhuma venda real encontrada neste recorte.
              </div>
            )}
          </section>
          {selected && (
            <section className="sale-detail" ref={detailRef}>
              <header>
                <div>
                  <span>Venda individual</span>
                  <h2>{selected.client}</h2>
                  <p>
                    {selected.builder} · {selected.project}
                  </p>
                </div>
                {selected.cancelledAt ? (
                  <i className="cancelled-badge">VENDA CANCELADA</i>
                ) : (
                  <select
                    value={selected.status}
                    onChange={(e) => updateSelected("status", e.target.value)}
                  >
                    {statuses.slice(1, -1).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                )}
              </header>
              <div className="sale-detail-grid">
                <article>
                  <span>VGV confirmado</span>
                  <strong>{brl.format(selected.vgv)}</strong>
                </article>
                <article>
                  <span>Comissão</span>
                  <strong>{selected.rate}%</strong>
                  <small>{brl.format(gross(selected))}</small>
                </article>
                <article>
                  <span>Desconto NF</span>
                  <strong>{selected.invoiceDiscount}%</strong>
                  <small>- {brl.format(deduction(selected))}</small>
                </article>
                <article>
                  <span>Bônus</span>
                  <strong>{brl.format(selected.bonus)}</strong>
                </article>
                <article>
                  <span>Total devido</span>
                  <strong>{brl.format(earning(selected))}</strong>
                </article>
                <article>
                  <span>Saldo pendente</span>
                  <strong>{brl.format(balance(selected))}</strong>
                </article>
              </div>
              {selected.cancelledAt && (
                <div className="sale-cancellation-record">
                  <div>
                    <span>Motivo do cancelamento</span>
                    <strong>{selected.cancellationReason}</strong>
                  </div>
                  <p>{selected.cancellationNotes}</p>
                  <small>
                    Registrado em{" "}
                    {new Date(selected.cancelledAt).toLocaleString("pt-BR")}
                    {selected.cancellationActor
                      ? ` por ${selected.cancellationActor}`
                      : ""}
                  </small>
                </div>
              )}
              {!selected.cancelledAt && (
                <div className="financial-conference">
                  <header>
                    <div>
                      <span>Conferência individual</span>
                      <h3>Valores, datas confirmadas e documentos fiscais</h3>
                    </div>
                    <small>Nenhuma previsão automática.</small>
                  </header>
                  <div className="conference-fields">
                    <label>
                      <span>Desconto da nota fiscal</span>
                      <PercentageInput
                        value={selected.invoiceDiscount}
                        onValueChange={(value) =>
                          updateSelected("invoiceDiscount", value)
                        }
                      />
                    </label>
                    <label>
                      <span>Bônus da venda</span>
                      <CurrencyInput
                        value={selected.bonus}
                        onValueChange={(value) =>
                          updateSelected("bonus", value)
                        }
                      />
                    </label>
                    <label>
                      <span>Valor adiantado</span>
                      <CurrencyInput
                        value={selected.advance}
                        onValueChange={(value) =>
                          updateSelected("advance", value)
                        }
                      />
                    </label>
                    <label>
                      <span>Total recebido</span>
                      <CurrencyInput
                        value={selected.received}
                        onValueChange={(value) =>
                          updateSelected("received", value)
                        }
                      />
                    </label>
                    {[
                      [
                        "Data do adiantamento",
                        "advanceDate",
                        selected.advanceDate,
                        "date",
                      ],
                      [
                        "Data do pagamento final",
                        "paymentDate",
                        selected.paymentDate,
                        "date",
                      ],
                      [
                        "Campanha / origem do bônus",
                        "campaign",
                        selected.campaign,
                        "text",
                      ],
                      [
                        "Observação do pagamento",
                        "paymentNote",
                        selected.paymentNote,
                        "text",
                      ],
                    ].map(([label, key, value, type]) => (
                      <label key={String(key)}>
                        <span>{label}</span>
                        <input
                          type={String(type)}
                          value={String(value)}
                          onChange={(e) =>
                            updateSelected(key as keyof Sale, e.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="proof-uploads">
                    {[
                      "Comprovante de adiantamento",
                      "Comprovante de pagamento final",
                      "Nota fiscal",
                    ].map((label) => {
                      const doc = financialDoc(label);
                      return (
                        <div
                          className={`finance-proof ${doc ? "attached" : ""}`}
                          key={label}
                        >
                          <label>
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              multiple
                              onChange={(e) => upload(label, e)}
                            />
                            <b>{label}</b>
                            <small>
                              {doc?.file_name ||
                                "PDF, JPG ou PNG · múltiplos arquivos"}
                            </small>
                            <em>{doc ? "ANEXADO" : "SELECIONAR"}</em>
                          </label>
                          {doc && (
                            <div className="finance-document-actions">
                              <a
                                href={doc.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visualizar
                              </a>
                              <button onClick={() => removeDoc(label)}>
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <footer>
                    <span>
                      O desconto da NF, o adiantamento e os comprovantes ficam
                      vinculados a esta venda.
                    </span>
                    <button className="gold" onClick={save} disabled={saving}>
                      {saving ? "Salvando..." : "Salvar conferência financeira"}
                    </button>
                  </footer>
                  <section className="sale-cancellation">
                    <header>
                      <div>
                        <span>Desfecho obrigatório</span>
                        <h3>Por que esta venda não foi concluída?</h3>
                        <p>
                          O VGV e a comissão saem dos resultados, mas o registro
                          permanece na ficha do cliente para auditoria.
                        </p>
                      </div>
                      <div className="cancellation-reasons" aria-label="Motivo do cancelamento">
                        {[
                          "Cliente desistiu",
                          "Banco/CCA barrou",
                          "Cliente sem contato",
                          "Cliente bloqueou o corretor",
                          "Problema documental",
                          "Imóvel indisponível",
                          "Venda duplicada",
                          "Outro",
                        ].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            className={cancelReason === reason ? "active" : ""}
                            aria-pressed={cancelReason === reason}
                            onClick={() => setCancelReason(reason)}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    </header>
                    <div className="sale-cancellation-body">
                      <label>
                        <span>Descrição obrigatória</span>
                        <textarea
                          value={cancelNotes}
                          onChange={(event) => setCancelNotes(event.target.value)}
                          placeholder="Registre a causa real, o que ocorreu e qualquer condição para retomada."
                        />
                      </label>
                      <aside>
                        <small>
                          Ação auditável. Motivo, data e valores ficam preservados.
                        </small>
                        <button
                          className="cancel-sale-button"
                          onClick={cancelSale}
                          disabled={cancelling || !cancelReason || !cancelNotes.trim()}
                        >
                          {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
                        </button>
                      </aside>
                    </div>
                  </section>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
