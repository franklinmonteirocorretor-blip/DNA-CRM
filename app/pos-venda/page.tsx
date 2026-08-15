"use client";
import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import "./pos-venda.css";
import "./journey-detail.css";
import "./evidence-upload.css";
import PostSaleStagePanel from "./PostSaleStagePanel";
import { deleteClientDocument, uploadClientDocument } from "@/lib/upload-client-document";

type Client = {
  clientId?: number;
  name: string;
  project: string;
  unit: string;
  stage: string;
  next: string;
  due: string;
  phone: string;
  progress: number;
  vgv?: number;
  referrals?: number;
  birthDate?: string;
  checklist?: Record<string, boolean>;
  isTest?: boolean;
};
const legacyClients: Client[] = [
  {
    name: "Lucas Almeida",
    project: "Village Garden II",
    unit: "Bloco B · 204",
    stage: "Entrevista CAIXA",
    next: "Confirmar entrevista com o gerente",
    due: "Hoje · 11:00",
    phone: "5586997734551",
    progress: 38,
  },
  {
    name: "Mariana Costa",
    project: "Village dos Pássaros II",
    unit: "Bloco A · 108",
    stage: "Contrato construtora",
    next: "Anexar contrato assinado com a construtora e comprovante do Sinal/ATO",
    due: "Hoje · 16:00",
    phone: "5586998554411",
    progress: 24,
  },
  {
    name: "Ana Marielly",
    project: "Moradas de Timon",
    unit: "Casa 32",
    stage: "Preparação da entrega",
    next: "Confirmar vistoria, coffee break e presente",
    due: "12 ago · 09:00",
    phone: "5586995947875",
    progress: 82,
  },
  {
    name: "João Victor",
    project: "Village Natureza",
    unit: "Bloco C · 302",
    stage: "Indicações e suporte",
    next: "Registrar 5 indicações e acompanhar garantias",
    due: "15 ago · 10:30",
    phone: "5586996123456",
    progress: 100,
  },
];
legacyClients.splice(0);
const emptyClient: Client = {
  clientId: 0,
  name: "Nenhum cliente em pós-venda",
  project: "Aguardando venda confirmada",
  unit: "—",
  stage: "Contrato com a construtora",
  next: "Confirme uma venda na Mesa de Fechamento",
  due: "—",
  phone: "",
  progress: 0,
};
const stages = [
  "Contrato com a construtora",
  "Sinal / ATO",
  "Entrevista CAIXA",
  "Laudo de engenharia",
  "Conformidade CAIXA",
  "Contrato CAIXA",
  "Preparação da entrega",
  "Vistoria técnica particular",
  "Validação dos reparos",
  "Vistoria e chaves",
  "Evento e depoimento",
  "Indicações e suporte",
];
const help = [
  "Contrato emitido e assinado",
  "Pagamento confirmado",
  "Aprovação ou plano de reversão",
  "Imóvel novo e aquisição + construção",
  "Formulários aprovados pela CAIXA",
  "Assinatura bancária e TAC",
  "Prazo, presente, coffee break e conteúdo",
  "Engenheiro particular, laudo técnico e falhas identificadas",
  "Conferência da execução dos reparos pela construtora",
  "Termos, garantias e pendências",
  "Consentimento, gravação e prova social",
  "Mínimo de 5 contatos e suporte contínuo",
];
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function PosVenda() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client>(emptyClient);
  const [currentStage, setCurrentStage] = useState(0);
  const [documents, setDocuments] = useState<
    Array<{
      id: number;
      document_type: string;
      file_name: string;
      url: string | null;
    }>
  >([]);
  const [uploading, setUploading] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [referralOpen, setReferralOpen] = useState(false);
  const [referral, setReferral] = useState({ name: "", phone: "", email: "" });
  const [status, setStatus] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const loadClients = async () => {
    const response = await fetch("/api/post-sale/events", {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error);
      return;
    }
    const normalized = (data || []).map((item: Client) => ({
      ...item,
      due: item.due ? new Date(item.due).toLocaleString("pt-BR") : "Sem prazo",
      progress: Math.max(
        8,
        Math.round(((stages.indexOf(item.stage) + 1) / stages.length) * 100),
      ),
    }));
    setClients(normalized);
    setSelected(
      (current) =>
        normalized.find((item: Client) => item.clientId === current.clientId) ||
        normalized[0] ||
        emptyClient,
    );
  };
  const loadDocuments = async (clientId?: number) => {
    if (!clientId) {
      setDocuments([]);
      return;
    }
    const response = await fetch(`/api/documents?clientId=${clientId}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok) setDocuments(data);
  };
  useEffect(() => {
    void loadClients();
  }, []);
  useEffect(() => {
    void loadDocuments(selected.clientId);
  }, [selected.clientId]);
  useEffect(() => {
    const index = stages.indexOf(selected.stage);
    if (index >= 0) {
      setCurrentStage(index);
    }
  }, [selected.stage, selected.next]);
  useEffect(() => {
    setChecklist(selected.checklist || {});
    setBirthDate(selected.birthDate || "");
  }, [selected.clientId, selected.checklist, selected.birthDate]);
  const attachments = useMemo(
    () => documents.map((item) => item.document_type),
    [documents],
  );
  const totalVgv = clients.reduce(
    (sum, client) => sum + (client.isTest ? 0 : Number(client.vgv || 0)),
    0,
  );
  const realClients = clients.filter((client) => !client.isTest);
  const interviewCount = realClients.filter(
    (client) => client.stage === "Entrevista CAIXA",
  ).length;
  const signedCount = realClients.filter(
    (client) =>
      stages.indexOf(client.stage) >= stages.indexOf("Contrato CAIXA"),
  ).length;
  const referralTotal = realClients.reduce(
    (sum, client) => sum + Number(client.referrals || 0),
    0,
  );
  const documentFor = (name: string) =>
    documents.find((item) => item.document_type === `Pós-venda | ${name}`);
  const selectClient = (client: Client) => {
    setSelected(client);
    const index = stages.indexOf(client.stage);
    if (index >= 0) setCurrentStage(index);
  };
  const attachFile = async (name: string, files: FileList | null) => {
    if (!files?.length || !selected.clientId) return;
    setUploading(name);
    setStatus("");
    try {
      await uploadClientDocument({
        clientId: selected.clientId,
        documentType: `Pós-venda | ${name}`,
        files: Array.from(files),
      });
      await loadDocuments(selected.clientId);
      setStatus(`${name} anexado e disponível para visualização.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao anexar documento.");
    } finally {
      setUploading("");
    }
  };
  const removeFile = async (name: string) => {
    if (!selected.clientId || !confirm(`Excluir o anexo “${name}”?`)) return;
    setUploading(name);
    try {
      await deleteClientDocument(selected.clientId, `Pós-venda | ${name}`);
      await loadDocuments(selected.clientId);
      setStatus(`${name} excluído. Uma nova versão pode ser anexada.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao excluir anexo.");
    } finally {
      setUploading("");
    }
  };
  const saveReferral = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected.clientId) return;
    const response = await fetch("/api/post-sale/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "referral",
        clientId: selected.clientId,
        ...referral,
      }),
    });
    const data = await response.json();
    setStatus(
      response.ok
        ? "Indicação registrada na base com origem vinculada."
        : data.error,
    );
    if (response.ok) {
      setReferral({ name: "", phone: "", email: "" });
      setReferralOpen(false);
      await loadClients();
    }
  };
  const saveBirthday = async () => {
    if (!selected.clientId || !birthDate) return;
    const response = await fetch("/api/post-sale/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "birthday",
        clientId: selected.clientId,
        birthDate,
      }),
    });
    const data = await response.json();
    setStatus(
      response.ok
        ? "Aniversário registrado na ficha, agenda e alertas."
        : data.error,
    );
  };
  const saveChecklist = async (item: string, completed: boolean) => {
    if (!selected.clientId) return;
    setChecklist((current) => ({ ...current, [item]: completed }));
    const response = await fetch("/api/post-sale/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checklist",
        clientId: selected.clientId,
        item,
        completed,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setChecklist((current) => ({ ...current, [item]: !completed }));
      setStatus(data.error);
    }
  };
  const saveImageConsent = async (decision: "authorized" | "refused") => {
    const authorized = decision === "authorized";
    await saveChecklist("Consentimento de imagem", authorized);
    await saveChecklist("Recusou autorização de imagem", !authorized);
    if (!authorized) {
      await saveChecklist("Entrega gravada", false);
      await saveChecklist("Depoimento produzido", false);
    }
  };
  return (
    <main className="after-shell">
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
        <header className="after-header">
          <div>
            <span>Relacionamento após o fechamento</span>
            <h1>Central de Pós-venda</h1>
            <p>
              Da ficha proposta à entrega, prova social, indicações e suporte ao
              cliente.
            </p>
          </div>
        </header>
        <div className="after-content">
          {status && <div className="post-status">{status}</div>}
          <section className="after-kpis">
            <article>
              <span>Processos ativos</span>
              <strong>{realClients.length}</strong>
              <small>Vendas confirmadas em acompanhamento</small>
            </article>
            <article>
              <span>Entrevistas CAIXA</span>
              <strong>{interviewCount}</strong>
              <small>Registros reais da jornada</small>
            </article>
            <article>
              <span>Contratos CAIXA assinados</span>
              <strong>{signedCount}</strong>
              <small>{brl.format(totalVgv)} em VGV acompanhado</small>
            </article>
            <article className="gold">
              <span>Entregas próximas</span>
              <strong>
                {
                  realClients.filter(
                    (client) =>
                      stages.indexOf(client.stage) >=
                      stages.indexOf("Vistoria e chaves"),
                  ).length
                }
              </strong>
              <small>Próximos 40 dias</small>
            </article>
            <article className="delivered">
              <span>Imóveis entregues</span>
              <strong>
                {
                  realClients.filter(
                    (client) =>
                      stages.indexOf(client.stage) >=
                      stages.indexOf("Evento e depoimento"),
                  ).length
                }
              </strong>
              <small>Entrega das chaves concluída</small>
            </article>
            <article className="green">
              <span>Indicações geradas</span>
              <strong>{referralTotal}</strong>
              <small>Contatos vinculados à origem</small>
            </article>
          </section>
          <section className="after-journey">
            <header>
              <div>
                <span>Jornada completa</span>
                <h2>Do fechamento ao suporte pós-entrega</h2>
              </div>
              <small>
                {currentStage + 1} de {stages.length} etapas · transições exigem
                registro
              </small>
            </header>
            <div className="journey-stages">
              {stages.map((stage, index) => (
                <button
                  disabled={index !== currentStage}
                  aria-label={
                    index > currentStage
                      ? `${stage}: bloqueada até o marco anterior`
                      : stage
                  }
                  className={
                    index < currentStage
                      ? "complete"
                      : index === currentStage
                        ? "current"
                        : ""
                  }
                  key={stage}
                >
                  <i>
                    {index < currentStage
                      ? "✓"
                      : String(index + 1).padStart(2, "0")}
                  </i>
                  <span>
                    <b>{stage}</b>
                    <small>{help[index]}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <div className="after-workspace">
            <section className="after-list">
              <header>
                <div>
                  <span>Carteira ativa</span>
                  <h2>Clientes que exigem acompanhamento</h2>
                </div>
                <select>
                  <option>Todas as etapas</option>
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </header>
              {clients.map((client) => (
                <button
                  className={selected.name === client.name ? "selected" : ""}
                  onClick={() => selectClient(client)}
                  key={client.name}
                >
                  <i
                    style={{
                      background: `conic-gradient(#d9aa3d ${client.progress * 3.6}deg,#292929 0)`,
                    }}
                  >
                    <b>{client.progress}%</b>
                  </i>
                  <div>
                    <b>{client.name}</b>
                    {client.isTest && <em className="test-badge">TESTE · não entra nos indicadores</em>}
                    <span>
                      {client.project} · {client.unit}
                    </span>
                    <small>{client.stage}</small>
                  </div>
                  <aside>
                    <strong>{client.due}</strong>
                    <span>{client.next}</span>
                  </aside>
                </button>
              ))}
            </section>
            <section className="after-focus">
              <header>
                <div>
                  <span>Cliente selecionado</span>
                  <h2>{selected.name}</h2>
                  <p>
                    {selected.project} · {selected.unit}
                  </p>
                </div>
                <strong>{stages[currentStage]}</strong>
              </header>
              <div className="after-actions">
                <a
                  className={!selected.phone ? "disabled" : ""}
                  href={selected.phone ? `tel:+${selected.phone}` : undefined}
                >
                  ☎ Ligar
                </a>
                <a
                  className={!selected.phone ? "disabled" : ""}
                  href={selected.phone ? `https://wa.me/${selected.phone}` : undefined}
                  target="_blank"
                >
                  <Image
                    src="/whatsapp.svg"
                    alt="WhatsApp"
                    width={14}
                    height={14}
                  />{" "}
                  WhatsApp
                </a>
                <Link href="/clientes">Abrir ficha</Link>
              </div>
              <section className="birthday-card">
                <div>
                  <span>Relacionamento contínuo</span>
                  <b>Aniversário do cliente</b>
                  <small>Sincroniza ficha, agenda e alerta anual.</small>
                </div>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                <button
                  onClick={saveBirthday}
                  disabled={!selected.clientId || !birthDate}
                >
                  Programar
                </button>
              </section>
              <PostSaleStagePanel
                clientId={selected.clientId}
                stage={selected.stage}
                stages={stages}
                onSaved={loadClients}
              />
              <section className="evidence-center">
                <header>
                  <span>Documentos e evidências da jornada</span>
                  <b>
                    {
                      attachments.filter((item) =>
                        item.startsWith("Pós-venda | "),
                      ).length
                    }
                    /11 anexados
                  </b>
                </header>
                {[
                  "Contrato com a construtora",
                  "Comprovante de pagamento do Sinal / ATO",
                  "Laudo do engenheiro CAIXA",
                  "Formulários de conformidade",
                  "Contrato CAIXA",
                  "Laudo da vistoria técnica particular",
                  "Validação dos reparos executados",
                  "Termo de consentimento de imagem",
                  "Termo de entrega",
                  "Laudo de vistoria / pendências",
                  "Garantias da construtora",
                ].map((doc) => (
                  <label
                    className={documentFor(doc) ? "attached" : ""}
                    key={doc}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      disabled={!selected.clientId || uploading === doc}
                      onChange={(e) => void attachFile(doc, e.target.files)}
                    />
                    <i>{documentFor(doc) ? "✓" : "＋"}</i>
                    <span>
                      <b>{doc}</b>
                      <small>
                        {documentFor(doc)?.file_name ||
                          (uploading === doc
                            ? "Enviando e unificando..."
                            : "Anexar PDFs ou fotos; múltiplos arquivos serão unificados")}
                      </small>
                    </span>
                    <em>
                      {documentFor(doc) ? (
                        <span className="evidence-actions">
                          <a href={documentFor(doc)?.url || "#"} target="_blank" onClick={(event) => event.stopPropagation()}>VISUALIZAR</a>
                          <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void removeFile(doc); }}>EXCLUIR</button>
                        </span>
                      ) : (
                        "SELECIONAR"
                      )}
                    </em>
                  </label>
                ))}
              </section>
            </section>
          </div>
          <section className="delivery-command">
            <header>
              <div>
                <span>Entrega humanizada</span>
                <h2>
                  Transformar a entrega em experiência, prova social e novas
                  oportunidades
                </h2>
              </div>
              <small>Não encerrar o cliente após receber as chaves</small>
            </header>
            <article>
              <span>Preparação</span>
              {["Coffee break organizado", "Presente escolhido", "Unidade preparada"].map((item) => (
                <label key={item}>
                  <input type="checkbox" checked={Boolean(checklist[item])} disabled={!selected.clientId} onChange={(event) => void saveChecklist(item, event.target.checked)} />
                  <i />{item}
                </label>
              ))}
            </article>
            <article>
              <span>Documentação</span>
              {["Termo de entrega anexado", "Vistoria e correções registradas", "Garantias entregues ao cliente"].map((item) => (
                <label key={item}>
                  <input type="checkbox" checked={Boolean(checklist[item])} disabled={!selected.clientId} onChange={(event) => void saveChecklist(item, event.target.checked)} />
                  <i />{item}
                </label>
              ))}
            </article>
            <article>
              <span>Conteúdo e prova social</span>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(checklist["Consentimento de imagem"])}
                  disabled={!selected.clientId}
                  onChange={(event) => {
                    if (event.target.checked) void saveImageConsent("authorized");
                    else void saveChecklist("Consentimento de imagem", false);
                  }}
                />
                <i />Consentimento assinado
              </label>
              <label className="consent-refused">
                <input
                  type="checkbox"
                  checked={Boolean(checklist["Recusou autorização de imagem"])}
                  disabled={!selected.clientId}
                  onChange={(event) => {
                    if (event.target.checked) void saveImageConsent("refused");
                    else void saveChecklist("Recusou autorização de imagem", false);
                  }}
                />
                <i />Recusou autorização de imagem
              </label>
              {["Entrega gravada", "Depoimento produzido"].map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={Boolean(checklist[item])}
                    disabled={!selected.clientId || !checklist["Consentimento de imagem"] || Boolean(checklist["Recusou autorização de imagem"])}
                    onChange={(event) => void saveChecklist(item, event.target.checked)}
                  />
                  <i />{item}
                </label>
              ))}
            </article>
            <article className="referral-box">
              <span>Indicações obrigatórias</span>
              <strong>
                {selected.referrals || 0} <i>/ 5</i>
              </strong>
              <div>
                <button onClick={() => setReferralOpen(true)}>
                  ＋ Registrar indicação
                </button>
              </div>
              <small>
                Cada indicação entra na base com origem vinculada a este
                cliente.
              </small>
              {referralOpen && (
                <form className="referral-form" onSubmit={saveReferral}>
                  <input
                    required
                    placeholder="Nome do indicado"
                    value={referral.name}
                    onChange={(e) =>
                      setReferral({ ...referral, name: e.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="Telefone / WhatsApp"
                    value={referral.phone}
                    onChange={(e) =>
                      setReferral({ ...referral, phone: e.target.value })
                    }
                  />
                  <input
                    type="email"
                    placeholder="E-mail (opcional)"
                    value={referral.email}
                    onChange={(e) =>
                      setReferral({ ...referral, email: e.target.value })
                    }
                  />
                  <div>
                    <button
                      type="button"
                      onClick={() => setReferralOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button disabled={!selected.clientId}>
                      Salvar contato
                    </button>
                  </div>
                </form>
              )}
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
