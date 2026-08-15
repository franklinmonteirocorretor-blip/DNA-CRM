"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { deleteClientDocument, uploadClientDocument } from "@/lib/upload-client-document";
import "./analises.css";
import "./distribution.css";
import "./distribution-override.css";
import "./analysis-queue.css";
import "./management-metrics.css";

type Status =
  | "Em análise"
  | "Restrição"
  | "Condicionado"
  | "Aprovado"
  | "Aprovado sem fechamento"
  | "Fechado";
type Process = {
  id: number;
  name: string;
  status: Status;
  detail: string;
  next: string;
  due: string;
  bank: string;
  value: string;
  origin: string;
  phone: string;
  cadence: string;
  cca: string;
  sentAt: string;
  waiting: string;
};

const seedProcesses: Process[] = [
  {
    id: 6,
    name: "Larissa Carvalho",
    status: "Em análise",
    detail: "Sem retorno dentro do prazo combinado",
    next: "Cobrar posicionamento do CCA Centro",
    due: "Vencido · há 6h",
    bank: "Relacionamento iniciado",
    value: "Em avaliação",
    origin: "Lead · Instagram",
    phone: "5586996543210",
    cadence: "Aguardando CCA",
    cca: "CCA Centro",
    sentAt: "07 ago · 15:42",
    waiting: "2 dias · SLA vencido",
  },
  {
    id: 7,
    name: "João Victor",
    status: "Em análise",
    detail: "Documentação recebida pelo correspondente",
    next: "Aguardar até o término do SLA",
    due: "Hoje · 17:00",
    bank: "Open Finance concluído",
    value: "Em avaliação",
    origin: "Lista fria · Canopus",
    phone: "5586996123456",
    cadence: "Aguardando CCA",
    cca: "CCA Zona Leste",
    sentAt: "Hoje · 09:18",
    waiting: "4 horas · no prazo",
  },
  {
    id: 1,
    name: "Roberta Mendes",
    status: "Restrição",
    detail: "SCR com baixa por prejuízo",
    next: "Confirmar negociação com credor original",
    due: "Hoje · 09:30",
    bank: "Relacionamento pendente",
    value: "R$ 0",
    origin: "Lead · Instagram",
    phone: "5589981474578",
    cadence: "D30",
    cca: "CCA Centro",
    sentAt: "01 ago · 10:15",
    waiting: "Resultado em 1 dia",
  },
  {
    id: 2,
    name: "Rodrigo Santos",
    status: "Condicionado",
    detail: "Comprometimento de renda · 38%",
    next: "Simular entrada para recompor margem",
    due: "Hoje · 10:00",
    bank: "Open Finance pendente",
    value: "R$ 168 mil",
    origin: "Lista fria · Betacon",
    phone: "5586984664369",
    cadence: "D15",
    cca: "CCA Zona Leste",
    sentAt: "04 ago · 11:20",
    waiting: "Resultado em 6 horas",
  },
  {
    id: 3,
    name: "Nicolle Cristine",
    status: "Aprovado",
    detail: "Crédito aprovado · Tabela PRICE",
    next: "Montar proposta e agendar apresentação",
    due: "Hoje · 14:30",
    bank: "Relacionamento em andamento",
    value: "R$ 192 mil",
    origin: "Lista fria · Canopus",
    phone: "5586999964566",
    cadence: "D0",
    cca: "CCA Centro",
    sentAt: "07 ago · 10:05",
    waiting: "Resultado em 1 dia",
  },
  {
    id: 4,
    name: "Camila Monteiro",
    status: "Aprovado sem fechamento",
    detail: "Não encontrou unidade adequada",
    next: "Apresentar Village Natureza",
    due: "Hoje · 16:30",
    bank: "Relacionamento ativo",
    value: "R$ 205 mil",
    origin: "Lead · Facebook",
    phone: "5586998112233",
    cadence: "D30",
    cca: "CCA Centro",
    sentAt: "20 jul · 09:00",
    waiting: "Aprovada há 18 dias",
  },
  {
    id: 5,
    name: "Lucas Almeida",
    status: "Fechado",
    detail: "Village Garden II · unidade 204",
    next: "Conferir dossiê e acompanhar assinatura",
    due: "Amanhã · 11:00",
    bank: "Relacionamento ativo",
    value: "R$ 214 mil",
    origin: "Lead · Instagram",
    phone: "5586997734551",
    cadence: "Pós-venda",
    cca: "CCA Zona Leste",
    sentAt: "18 jul · 14:10",
    waiting: "Fechado em 12 dias",
  },
];
seedProcesses.splice(0);
const emptyProcess: Process = {id:0,name:"Nenhum processo registrado",status:"Em análise",detail:"Aguardando envio real ao CCA",next:"Cadastre o primeiro processo",due:"—",bank:"Não iniciado",value:"R$ 0,00",origin:"—",phone:"",cadence:"—",cca:"Nenhum CCA",sentAt:"—",waiting:"—"};

const filters = [
  "Todos",
  "Em análise",
  "Restrição",
  "Condicionado",
  "Aprovado",
  "Aprovado sem fechamento",
  "Fechado",
] as const;

export default function AnalisesPage() {
  const [processes, setProcesses] = useState<Process[]>(seedProcesses);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [documents, setDocuments] = useState<Array<{id:number;document_type:string;file_name:string;url:string|null}>>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selected, setSelected] = useState<Process>(emptyProcess);
  const [distributionOpen, setDistributionOpen] = useState(false);
  const [distributionSource, setDistributionSource] = useState<
    "Aprovado sem fechamento" | "Condicionado" | "Restrição"
  >("Aprovado sem fechamento");
  const [distributionQuantity, setDistributionQuantity] = useState(50);
  const [distributed, setDistributed] = useState(false);
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().slice(0, 10));
  const loadProcesses = async () => {
    setLoading(true);
    const response = await fetch(`/api/analyses?period=${period}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Falha ao carregar análises."); setLoading(false); return; }
    const rows: Process[] = data.map((client: any) => ({ id:Number(client.id), name:client.name, status:(client.finance_stage || "Em análise") as Status, detail:client.next_action || "Sem observação registrada", next:client.next_action || "Definir próxima ação", due:client.next_action_at ? new Date(client.next_action_at).toLocaleString("pt-BR") : "Sem prazo", bank:"Consultar ficha", value:"Em avaliação", origin:[client.origin_type,client.origin_detail].filter(Boolean).join(" · ") || "Não informada", phone:client.phone || "", cadence:"Ativa", cca:"Consultar prontuário", sentAt:new Date(client.updated_at).toLocaleDateString("pt-BR"), waiting:"Atualização registrada" }));
    setProcesses(rows); setSelected((current) => rows.find((row) => row.id === current.id) || rows[0] || emptyProcess); setLoading(false);
  };
  useEffect(() => { loadProcesses(); }, [period]);
  useEffect(() => { if (!selected.id) return setDocuments([]); fetch(`/api/documents?clientId=${selected.id}`, {cache:"no-store"}).then((r)=>r.json()).then((data)=>setDocuments(Array.isArray(data)?data:[])); }, [selected.id]);
  const analysisDocType = selected.id ? `Análises | Cliente ${selected.id} | Evidências` : "";
  const analysisDocument = documents.find((document) => document.document_type === analysisDocType);
  const uploadAnalysis = async (event: ChangeEvent<HTMLInputElement>) => { if (!selected.id || !event.target.files?.length) return; setMessage("Enviando anexos..."); try { await uploadClientDocument({clientId:selected.id,documentType:analysisDocType,files:Array.from(event.target.files)}); const response=await fetch(`/api/documents?clientId=${selected.id}`,{cache:"no-store"}); setDocuments(await response.json()); setMessage("Anexos enviados e unificados com sucesso."); } catch(error) { setMessage(error instanceof Error?error.message:"Falha no anexo."); } finally { event.target.value=""; } };
  const removeAnalysisDoc = async () => { if (!selected.id || !analysisDocument || !confirm("Excluir os anexos desta análise?")) return; await deleteClientDocument(selected.id,analysisDocType); setDocuments((items)=>items.filter((item)=>item.document_type!==analysisDocType)); setMessage("Anexo excluído."); };
  const distributeRecovery = async () => { setDistributed(false); setMessage("Distribuindo carteira..."); const response=await fetch("/api/analyses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stage:distributionSource,quantity:distributionQuantity,assignedDate:executionDate})}); const result=await response.json(); if(!response.ok)return setMessage(result.error||"Falha ao distribuir."); setDistributed(true); setMessage(`${result.distributed} cliente(s) enviados para a carteira de ${new Date(`${result.assignedDate}T12:00:00`).toLocaleDateString("pt-BR")}.`); };
  const visible = useMemo(
    () =>
      filter === "Todos"
        ? processes
        : processes.filter((item) => item.status === filter),
    [filter],
  );
  const guidance =
    selected.status === "Em análise"
      ? [
          "Conferir prazo acordado",
          "Cobrar o CCA responsável",
          "Registrar retorno e protocolo",
          "Notificar corretor quando houver resultado",
        ]
      : selected.status === "Restrição"
        ? [
            "Consultar SCR/Registrato",
            "Negociar com credor original",
            "Guardar quitação",
            "Agendar nova análise",
          ]
        : selected.status === "Condicionado"
          ? [
              "Identificar condição exata",
              "Recalcular margem e entrada",
              "Regularizar compromissos",
              "Reenviar ao Gerente IMOB",
            ]
          : selected.status === "Aprovado"
            ? [
                "Enviar confirmação de aprovação",
                "Montar simulação e proposta",
                "Agendar atendimento presencial",
                "Apresentar imóveis aderentes",
              ]
            : selected.status === "Aprovado sem fechamento"
              ? [
                  "Registrar motivo obrigatório",
                  "Classificar gargalo",
                  "Apresentar nova solução",
                  "Manter cadência ativa",
                ]
              : [
                  "Conferir dossiê completo",
                  "Acompanhar assinatura",
                  "Registrar VGV e comissão",
                  "Iniciar pós-venda",
                ];
  return (
    <main className="analysis-shell">
      <aside className="analysis-sidebar">
        <div className="analysis-brand">
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
        <div className="analysis-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="analysis-main">
        <header className="analysis-header">
          <div>
            <span>Operação pós-análise</span>
            <h1>Central de Análises</h1>
            <p>
              Da resposta do Gerente IMOB até venda, assinatura e pós-venda.
            </p>
          </div>
          <div className="analysis-header-actions">
            <button
              onClick={() => {
                setDistributionOpen((value) => !value);
                setDistributed(false);
              }}
            >
              ＋ Gerar carteira de recuperação
            </button>
            <aside>
              <span>Visão atual</span>
              <b>Corretor + Gestor</b>
            </aside>
          </div>
        </header>
        <div className="analysis-content">
          {message && <div className="analysis-message">{message}</div>}
          <section className="analysis-kpis">
            <article className="total-folders">
              <span>Total de pastas enviadas</span>
              <strong>{processes.length}</strong>
              <small>base total do período · 100%</small>
            </article>
            <article
              className="analysis-waiting"
              onClick={() => setFilter("Em análise")}
            >
              <span>Em análise agora</span>
              <strong>0</strong>
              <small>21,7% · 2 com SLA vencido</small>
            </article>
            <article className="danger">
              <span>Com restrição</span>
              <strong>0</strong>
              <small>21,7% das pastas</small>
            </article>
            <article className="warning">
              <span>Condicionados</span>
              <strong>0</strong>
              <small>17,4% · R$ 612 mil potenciais</small>
            </article>
            <article className="success">
              <span>Aprovados</span>
              <strong>0</strong>
              <small>26,1% · 3 propostas pendentes</small>
            </article>
            <article>
              <span>Fechados no mês</span>
              <strong>0</strong>
              <small>13,0% · R$ 641 mil de VGV</small>
            </article>
          </section>
          <section className="management-insights">
            <article>
              <span>Resultado favorável</span>
              <strong>39,1%</strong>
              <small>9 de 23 chegaram a aprovado ou fechado</small>
              <i>
                <b style={{ width: "39.1%" }}></b>
              </i>
            </article>
            <article>
              <span>Conversão final</span>
              <strong>13,0%</strong>
              <small>3 vendas para 23 pastas enviadas</small>
              <i>
                <b style={{ width: "13%" }}></b>
              </i>
            </article>
            <article>
              <span>Aprovado → fechado</span>
              <strong>33,3%</strong>
              <small>3 fechamentos em 9 aprovações acumuladas</small>
              <i>
                <b style={{ width: "33.3%" }}></b>
              </i>
            </article>
            <aside>
              <span>Gargalo principal</span>
              <b>39,1% exigem recuperação</b>
              <p>
                5 restrições + 4 condicionados. Prioridade: reduzir
                comprometimento de renda, tratar SCR e fortalecer relacionamento
                CAIXA.
              </p>
            </aside>
          </section>
          <section className="analysis-filters">
            <div>
              <span>Período</span>
              <button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>Mês</button>
              <button className={period === "quarter" ? "active" : ""} onClick={() => setPeriod("quarter")}>Trimestre</button>
              <button className={period === "year" ? "active" : ""} onClick={() => setPeriod("year")}>Ano</button>
            </div>
            <div>
              {filters.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
          {distributionOpen && (
            <section className="distribution-builder">
              <header>
                <div>
                  <span>Comando do gestor</span>
                  <h2>Gerar carteira diária de recuperação</h2>
                  <p>
                    Selecione clientes com potencial e distribua diretamente
                    para a fila operacional do corretor.
                  </p>
                </div>
                <button onClick={() => setDistributionOpen(false)}>×</button>
              </header>
              <div className="distribution-form">
                <label>
                  <span>Público estratégico</span>
                  <select
                    value={distributionSource}
                    onChange={(e) => {
                      setDistributionSource(
                        e.target.value as typeof distributionSource,
                      );
                      setDistributed(false);
                    }}
                  >
                    <option>Aprovado sem fechamento</option>
                    <option>Condicionado</option>
                    <option>Restrição</option>
                  </select>
                  <small>
                    {distributionSource === "Aprovado sem fechamento"
                      ? "186 contatos elegíveis · maior chance de conversão"
                      : distributionSource === "Condicionado"
                        ? "94 contatos elegíveis · trabalhar condição e entrada"
                        : "137 contatos elegíveis · regularização e longo prazo"}
                  </small>
                </label>
                <label>
                  <span>Quantidade</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={distributionQuantity}
                    onChange={(e) =>
                      setDistributionQuantity(
                        Math.min(50, Math.max(1, Number(e.target.value))),
                      )
                    }
                  />
                  <small>Máximo diário por carteira: 50</small>
                </label>
                <label>
                  <span>Corretor responsável</span>
                  <select defaultValue="Franklin Monteiro">
                    <option>Franklin Monteiro</option>
                  </select>
                  <small>Receberá na Carteira do Dia</small>
                </label>
                <label>
                  <span>Data de execução</span>
                  <input type="date" value={executionDate} onChange={(e) => { setExecutionDate(e.target.value); setDistributed(false); }} />
                  <small>Distribuição automática às 08:00</small>
                </label>
              </div>
              <div className="distribution-rules">
                <article>
                  <i>✓</i>
                  <span>
                    <b>Sem contatos repetidos</b>
                    <small>
                      Bloqueia clientes já distribuídos ou trabalhados no
                      período.
                    </small>
                  </span>
                </article>
                <article>
                  <i>✓</i>
                  <span>
                    <b>Próxima ação obrigatória</b>
                    <small>
                      Cada contato entra com objetivo e roteiro da sua situação.
                    </small>
                  </span>
                </article>
                <article>
                  <i>✓</i>
                  <span>
                    <b>Retorno à esteira original</b>
                    <small>
                      Após atendimento, resultado atualiza análise e cadência.
                    </small>
                  </span>
                </article>
              </div>
              <footer>
                <div>
                  <span>Missão da carteira</span>
                  <b>
                    {distributionSource === "Aprovado sem fechamento"
                      ? "Converter aprovação em proposta, visita e venda."
                      : distributionSource === "Condicionado"
                        ? "Resolver condição ou negociar entrada viável."
                        : "Orientar regularização e preservar relacionamento."}
                  </b>
                </div>
                <button onClick={distributeRecovery}>
                  {distributed
                    ? `${distributionQuantity} clientes enviados para Franklin`
                    : `Distribuir ${distributionQuantity} clientes`}
                </button>
              </footer>
            </section>
          )}
          <div className="analysis-workspace">
            <section className="process-list">
              <header>
                <div>
                  <span>Esteira ativa</span>
                  <h2>
                    {filter === "Em análise"
                      ? "5 clientes aguardando retorno"
                      : `${visible.length} processos encontrados`}
                  </h2>
                </div>
                <small>Ordenados por SLA e próxima ação</small>
              </header>
              {loading && <div className="analysis-empty">Carregando processos reais...</div>}
              {!loading && !visible.length && <div className="analysis-empty">Nenhum processo encontrado neste período.</div>}
              {visible.map((item) => (
                <button
                  key={item.id}
                  className={selected.id === item.id ? "selected" : ""}
                  onClick={() => setSelected(item)}
                >
                  <i
                    className={`process-dot ${item.status.toLowerCase().replaceAll(" ", "-")}`}
                  ></i>
                  <div>
                    <b>{item.name}</b>
                    <span>
                      {item.status} · {item.cca}
                    </span>
                    <small>
                      {item.sentAt} · {item.waiting}
                    </small>
                  </div>
                  <em>{item.value}</em>
                  <aside>
                    <b>{item.due}</b>
                    <span>{item.next}</span>
                  </aside>
                </button>
              ))}
            </section>
            <section className="process-focus">
              <header>
                <div>
                  <span>Processo selecionado</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.detail}</p>
                </div>
                <strong
                  className={selected.status.toLowerCase().replaceAll(" ", "-")}
                >
                  {selected.status}
                </strong>
              </header>
              <div className="process-meta">
                <article>
                  <span>CCA responsável</span>
                  <b>{selected.cca}</b>
                </article>
                <article>
                  <span>Enviado em</span>
                  <b>{selected.sentAt}</b>
                </article>
                <article>
                  <span>Tempo de espera</span>
                  <b>{selected.waiting}</b>
                </article>
                <article>
                  <span>Relacionamento CAIXA</span>
                  <b>{selected.bank}</b>
                </article>
              </div>
              <section className="next-action">
                <span>Próxima ação obrigatória</span>
                <h3>{selected.next}</h3>
                <p>Prazo: {selected.due}</p>
                <div>
                  <a href={`tel:+${selected.phone}`}>☎ Ligar</a>
                  <a
                    href={`https://wa.me/${selected.phone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      src="/whatsapp.svg"
                      alt="WhatsApp"
                      width={15}
                      height={15}
                    />{" "}
                    WhatsApp
                  </a>
<Link href="/clientes">Abrir prontuário</Link>
                </div>
              </section>
              <section className="stage-playbook">
                <header>
                  <span>Metodologia aplicada</span>
                  <b>Plano para {selected.status.toLowerCase()}</b>
                </header>
                {guidance.map((item, index) => (
                  <article key={item}>
                    <i>{String(index + 1).padStart(2, "0")}</i>
                    <span>{item}</span>
                    <button>{index === 0 ? "Executar" : "Programar"}</button>
                  </article>
                ))}
              </section>
              <section className={`analysis-documents ${analysisDocument ? "attached" : ""}`}>
                <header><div><span>Documentos e evidências</span><b>Anexos da análise selecionada</b></div>{analysisDocument && <em>ANEXADO</em>}</header>
                <label><input type="file" accept="application/pdf,image/jpeg,image/png" multiple onChange={uploadAnalysis}/><span>{analysisDocument ? analysisDocument.file_name : "Selecionar PDFs ou fotos"}</span><small>É permitido selecionar vários arquivos; o CRM os reúne em um único PDF.</small></label>
                {analysisDocument && <div><a href={analysisDocument.url || "#"} target="_blank" rel="noreferrer">Visualizar anexo</a><button onClick={removeAnalysisDoc}>Excluir e substituir</button></div>}
              </section>
              <section className="bank-rule">
                <i>CAIXA</i>
                <div>
                  <b>Relacionamento bancário obrigatório</b>
                  <span>
                    Open Finance, movimentação saudável e estabilidade
                    financeira permanecem ativos em qualquer resultado.
                  </span>
                </div>
                <button>Enviar orientações</button>
              </section>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
