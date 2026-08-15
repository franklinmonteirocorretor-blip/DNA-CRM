"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../../components/crm-navigation";
import { deleteClientDocument, uploadClientDocument } from "@/lib/upload-client-document";
import { useEffect, useMemo, useState } from "react";
import "./cliente.css";
import "./guidance.css";
import "./flow-order.css";
import "./notifications.css";
import "./cadence-notifications.css";
import "./credit-analysis-tools.css";
import "./credit-status.css";

type Doc = {
  name: string;
  holder: string;
  status: "Aprovado" | "Recebido" | "Pendente" | "Ilegível";
  required: boolean;
  note?: string;
};
type StoredDocument = {
  id: number;
  document_type: string;
  file_name: string;
  url: string | null;
};
type Sex = "Feminino" | "Masculino";
type ClientChoice = { id: number; name: string; phone: string; email: string | null; sex: string | null; marital_status: string | null; project_interest?:string|null; funnel_stage?:string|null; finance_stage?:string|null; post_sale_stage?:string|null; origin_type?:string|null; origin_detail?:string|null; next_action?:string|null };
type ClientEvent = { id:number; title:string; description:string|null; event_type:string; old_stage:string|null; new_stage:string|null; occurred_at:string|null; created_at?:string|null };

const genderTerms = (sex: Sex) =>
  sex === "Feminino"
    ? {
        married: "Casada",
        single: "Solteira",
        spouse: "Esposa",
        spouseOf: "da Esposa",
        incomeSpouse: "Renda da Esposa",
        buyer: "PROPONENTE COMPRADORA",
      }
    : {
        married: "Casado",
        single: "Solteiro",
        spouse: "Esposo",
        spouseOf: "do Esposo",
        incomeSpouse: "Renda do Marido",
        buyer: "PROPONENTE COMPRADOR",
      };

const preDocs: Doc[] = [
  {
    name: "Identidade/CPF ou CNH",
    holder: "Titular",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Comprovante de endereço",
    holder: "Titular",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Comprovante de renda",
    holder: "Titular",
    status: "Recebido",
    required: true,
    note: "Aguardando conferência",
  },
  {
    name: "Identidade/CPF ou CNH",
    holder: "Cônjuge",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Comprovante de endereço",
    holder: "Cônjuge",
    status: "Pendente",
    required: true,
  },
  {
    name: "Comprovante de renda",
    holder: "Cônjuge",
    status: "Pendente",
    required: true,
  },
];

const fullDocs: Doc[] = [
  {
    name: "RG e CPF ou CNH",
    holder: "Titular",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Certidão de nascimento/casamento",
    holder: "Titular",
    status: "Recebido",
    required: true,
  },
  {
    name: "Comprovante de endereço",
    holder: "Titular",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Comprovante de renda",
    holder: "Titular",
    status: "Recebido",
    required: true,
  },
  {
    name: "IR e recibo de entrega",
    holder: "Titular · comprovação de renda autônoma",
    status: "Pendente",
    required: false,
    note: "Condicional quando solicitado pelo gerente CAIXA",
  },
  {
    name: "Extratos bancários",
    holder: "Titular · comprovação de renda autônoma",
    status: "Pendente",
    required: false,
    note: "Permite vários extratos; o CRM gera um PDF único",
  },
  {
    name: "Recibos e comprovantes PIX",
    holder: "Titular · comprovação de renda autônoma",
    status: "Pendente",
    required: false,
    note: "Recebimentos dos serviços ou produtos vendidos",
  },
  {
    name: "Conversas com clientes e Instagram profissional",
    holder: "Titular · comprovação de renda autônoma",
    status: "Pendente",
    required: false,
    note: "Prints que demonstrem atividade comercial recorrente",
  },
  {
    name: "Notas fiscais e compras de materiais",
    holder: "Titular · comprovação de renda autônoma",
    status: "Pendente",
    required: false,
    note: "Evidências complementares da atividade exercida",
  },
  {
    name: "Carteira de Trabalho",
    holder: "Titular",
    status: "Pendente",
    required: true,
  },
  {
    name: "Extrato FGTS",
    holder: "Titular",
    status: "Pendente",
    required: false,
    note: "Obrigatório somente se usar FGTS",
  },
  {
    name: "RG e CPF ou CNH",
    holder: "Cônjuge",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Certidão de nascimento/casamento",
    holder: "Cônjuge",
    status: "Recebido",
    required: true,
  },
  {
    name: "Comprovante de endereço",
    holder: "Cônjuge",
    status: "Pendente",
    required: true,
  },
  {
    name: "Comprovante de renda",
    holder: "Cônjuge",
    status: "Pendente",
    required: true,
  },
  {
    name: "Carteira de Trabalho",
    holder: "Cônjuge",
    status: "Pendente",
    required: true,
  },
  {
    name: "Identidade/CPF ou CNH",
    holder: "Dependente · Maria",
    status: "Recebido",
    required: true,
  },
  {
    name: "Comprovante no mesmo endereço",
    holder: "Dependente · Maria",
    status: "Pendente",
    required: true,
  },
  {
    name: "Certidão de nascimento",
    holder: "Dependente · Maria",
    status: "Aprovado",
    required: true,
  },
  {
    name: "Autodeclaração e responsabilidade CAIXA",
    holder: "Dependente · Maria",
    status: "Pendente",
    required: true,
    note: "Declara ausência de renda e dependência do titular",
  },
];

const ccaContacts = {
  "CCA Centro": { phone: "5586999990001", display: "(86) 99999-0001" },
  "CCA Zona Leste": { phone: "5586999990002", display: "(86) 99999-0002" },
};
preDocs.forEach((doc) => { doc.status = "Pendente"; });
fullDocs.forEach((doc) => { doc.status = "Pendente"; });

const cadenceAlerts = [
  {
    stage: "D0",
    client: "Patrícia Lima",
    message: "Primeiro retorno após tentativa sem resposta",
    time: "Hoje · 10:30",
    priority: "Agora",
  },
  {
    stage: "D1",
    client: "Rodrigo Silva",
    message: "Confirmar recebimento da documentação solicitada",
    time: "Hoje · 14:00",
    priority: "Hoje",
  },
  {
    stage: "D3",
    client: "Camila Monteiro",
    message: "Reforçar valor e retomar a qualificação",
    time: "Hoje · 15:10",
    priority: "Hoje",
  },
  {
    stage: "D7",
    client: "Fernanda Souza",
    message: "Retomar cliente aprovado que ainda não agendou",
    time: "Hoje · 16:30",
    priority: "Hoje",
  },
  {
    stage: "D15",
    client: "Lucas Almeida",
    message: "Reativar interesse e apresentar nova oportunidade",
    time: "Amanhã · 09:30",
    priority: "Programado",
  },
  {
    stage: "D30",
    client: "Juliana Costa",
    message: "Nutrir relacionamento e revisar momento de compra",
    time: "12 ago · 11:00",
    priority: "Programado",
  },
];

function Status({ value }: { value: Doc["status"] }) {
  return <span className={`doc-status ${value.toLowerCase()}`}>{value}</span>;
}

export default function ClientePage() {
  const [clients, setClients] = useState<ClientChoice[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientEvents, setClientEvents] = useState<ClientEvent[]>([]);
  const [documentNotice, setDocumentNotice] = useState("");
  const [sendingPackage, setSendingPackage] = useState(false);
  const [ccas, setCcas] = useState<Array<{id:number;name:string;phone:string;whatsapp:string;responsible_name:string;active:boolean}>>([]);
  const [tab, setTab] = useState<"pre" | "full">("pre");
  const [docs, setDocs] = useState(preDocs);
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [message, setMessage] = useState(false);
  const [cca, setCca] = useState("");
  useEffect(() => {
    fetch("/api/ccas").then((response) => response.ok ? response.json() : []).then((rows) => setCcas(rows.filter((row:{active:boolean}) => row.active))).catch(() => setCcas([]));
    const requested = new URLSearchParams(window.location.search).get("clientId");
    if (requested) fetch(`/api/clients?id=${requested}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((row) => { if(row){setClients([row]);setClientId(String(row.id))} }).catch(() => setClients([]));
    else fetch("/api/clients?limit=200", { cache: "no-store" }).then((response) => response.ok ? response.json() : []).then((rows) => setClients(rows)).catch(() => setClients([]));
  }, []);
  const selectedCca = ccas.find((item) => String(item.id) === cca);
  const selectedClient = clients.find((item) => String(item.id) === clientId);
  useEffect(() => {
    if (!clientId) { setClientEvents([]); return; }
    fetch(`/api/clients/${clientId}/events`, { cache: "no-store" }).then(r=>r.ok?r.json():[]).then(setClientEvents).catch(()=>setClientEvents([]));
  }, [clientId]);
  const [packagePreview, setPackagePreview] = useState(false);
  const [ccaSent, setCcaSent] = useState(false);
  const [creditStatus, setCreditStatus] = useState<
    | "Documentação"
    | "Em análise"
    | "Restrição"
    | "Condicionado"
    | "Aprovado"
  >("Documentação");
  const [ccaReturn, setCcaReturn] = useState<
    "Enviado" | "Recebido" | "Em análise" | "Pendência" | "Concluído"
  >("Enviado");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadResult, setUnreadResult] = useState(false);
  const [cadenceRead, setCadenceRead] = useState(false);
  const [resultNotice, setResultNotice] = useState(
    "Nenhuma análise enviada. Selecione um cliente real na carteira.",
  );
  const autonomousActivity = "Atividade não informada";
  const autonomousDuration = "Tempo não informado";
  const [clientSex, setClientSex] = useState<Sex>("Masculino");
  const [spouseSex, setSpouseSex] = useState<Sex>("Masculino");
  const [relationship, setRelationship] = useState<
    "Solteiro" | "Casado civil" | "União estável"
  >("Solteiro");
  const [hasDependent, setHasDependent] = useState(false);
  const [previousCca, setPreviousCca] = useState(false);
  const [clientCpf, setClientCpf] = useState("");
  const [letterCopied, setLetterCopied] = useState(false);
  const [letterUploaded, setLetterUploaded] = useState(false);
  const [uploading, setUploading] = useState("");
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [dependentKinship, setDependentKinship] = useState("");
  const documentTypeFor = (doc: Doc) =>
    `${tab === "pre" ? "Pré-análise" : "Dossiê completo"} | ${doc.holder} - ${doc.name}`;
  const storedDocumentFor = (doc: Doc) =>
    storedDocuments.find((item) => item.document_type === documentTypeFor(doc));
  const cancellationDocument = storedDocuments.find(
    (item) => item.document_type === "Pré-análise | Autorização de cancelamento do CCA anterior",
  );
  const loadStoredDocuments = async () => {
    if (!clientId) {
      setStoredDocuments([]);
      return;
    }
    const response = await fetch(`/api/documents?clientId=${clientId}`, { cache: "no-store" });
    const result = await response.json().catch(() => []);
    if (!response.ok) {
      setDocumentNotice(result.error || "Falha ao carregar anexos.");
      return;
    }
    setStoredDocuments(result);
    const prefix = tab === "pre" ? "Pré-análise" : "Dossiê completo";
    setDocs((currentDocs) => currentDocs.map((doc) => ({
      ...doc,
      status: result.some((item: StoredDocument) => item.document_type === `${prefix} | ${doc.holder} - ${doc.name}`)
        ? "Aprovado"
        : doc.status,
    })));
    setLetterUploaded(result.some((item: StoredDocument) => item.document_type === "Pré-análise | Autorização de cancelamento do CCA anterior"));
  };
  useEffect(() => {
    void loadStoredDocuments();
  }, [clientId, tab]);
  const sourceDocs = docs;
  const current = sourceDocs.filter((doc) => {
    if (doc.holder.startsWith("Cônjuge") && relationship === "Solteiro")
      return false;
    if (doc.holder.startsWith("Dependente") && !hasDependent) return false;
    return true;
  });
  const required = current.filter((d) => d.required);
  const complete = required.filter((d) => d.status === "Aprovado").length;
  const pct = Math.round((complete / required.length) * 100);
  const blockers = required.filter((d) => d.status !== "Aprovado");
  const aptToSign = tab === "full" && blockers.length === 0;
  const today = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const cancellationLetter = `Eu [NOME DO CLIENTE], portador(a) do CPF ${clientCpf || "[INFORME O CPF]"}\n\nAutorizo o cancelamento da minha avaliação no CCA anterior, para que seja realizada uma nova avaliação.\n\n[NOME DO CLIENTE]\n${today}`;
  const uploadDocument = async (doc: Doc, files: FileList | null) => {
    if (!files?.length) return;
    if (!clientId) {
      setDocumentNotice("Selecione o cliente real antes de anexar qualquer documento.");
      return;
    }
    const key = `${doc.holder}-${doc.name}`;
    setUploading(key);
    try {
      const result = await uploadClientDocument({ clientId: Number(clientId), documentType: documentTypeFor(doc), files: Array.from(files) });
      setFileCounts((old) => ({ ...old, [key]: Number(result.filesMerged) }));
      setDocs((old) =>
        old.map((item) =>
          item.name === doc.name && item.holder === doc.holder
            ? { ...item, status: "Aprovado" }
            : item,
        ),
      );
      setDocumentNotice(`${result.filesMerged} arquivo(s) unido(s) em PDF único.`);
      await loadStoredDocuments();
    } catch (error) {
      setDocumentNotice(error instanceof Error ? error.message : "Falha ao anexar documento.");
    } finally {
      setUploading("");
    }
  };
  const uploadCancellationLetter = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!clientId) {
      setDocumentNotice("Selecione o cliente real antes de anexar a carta.");
      return;
    }
    try {
      const result = await uploadClientDocument({
        clientId: Number(clientId),
        documentType: "Pré-análise | Autorização de cancelamento do CCA anterior",
        files: Array.from(files),
      });
      setLetterUploaded(true);
      setDocumentNotice(`${result.filesMerged} arquivo(s) da carta unidos em PDF único.`);
      await loadStoredDocuments();
    } catch (error) {
      setLetterUploaded(false);
      setDocumentNotice(error instanceof Error ? error.message : "Falha ao anexar carta.");
    }
  };
  const removeStoredDocument = async (documentType: string) => {
    if (!clientId || !confirm("Excluir este anexo?")) return;
    setUploading(documentType);
    try {
      await deleteClientDocument(Number(clientId), documentType);
      setDocumentNotice("Anexo excluído. Uma nova versão pode ser enviada.");
      await loadStoredDocuments();
    } catch (error) {
      setDocumentNotice(error instanceof Error ? error.message : "Falha ao excluir anexo.");
    } finally {
      setUploading("");
    }
  };
  const sendPackageToCca = async () => {
    if (!clientId || !selectedCca || blockers.length) return;
    setSendingPackage(true);
    setDocumentNotice("");
    const response = await fetch("/api/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: Number(clientId), stage: tab }),
    });
    const result = await response.json().catch(() => ({}));
    setSendingPackage(false);
    if (!response.ok || !result.signedUrl) {
      setDocumentNotice(result.error || "Não foi possível montar o PDF consolidado.");
      return;
    }
    const phone = (selectedCca.whatsapp || selectedCca.phone || "").replace(/\D/g, "");
    const text = `${analysisText}\n\nDOCUMENTAÇÃO CONSOLIDADA (${result.documentsMerged} itens, ${result.pages} páginas):\n${result.signedUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setCcaSent(true);
    setDocumentNotice("PDF consolidado gerado. WhatsApp aberto com texto e link seguro.");
  };
  const clientGrammar = genderTerms(clientSex);
  const spouseGrammar = genderTerms(spouseSex);
  const analysisText =
    relationship === "Solteiro"
      ? `TEXTO PARA ANÁLISE DE CRÉDITO
•Cliente: NICOLLE CRISTINE LEITE PASSOS
•CPF: 005.***.***-42
•Data de nascimento: 05/11/1997
•Renda: R$ 2.500,00
•Tipo de Renda: AUTÔNOMA - ${autonomousActivity.toUpperCase()} HÁ ${autonomousDuration.toUpperCase()}
•CEP: 64000-000
•Endereço: TERESINA - PI
•Tem dependente: ${hasDependent ? "SIM" : "NÃO"}
•Tem mais de 3 anos de CLT: NÃO SE APLICA
•Vai usar FGTS: NÃO
•E-mail: nicolle@email.com
•Contato: 86999964566
•Empreendimento: IMÓVEL NOVO - TERESINA LESTE
•Valor de avaliação: TETO
•Tabela: PRICE`
      : `TEXTO PARA ANÁLISE DE CRÉDITO
- Cliente: NICOLLE CRISTINE LEITE PASSOS
- ${spouseGrammar.spouse}: MARCOS OLIVEIRA PASSOS
- CPF: 005.***.***-42
- CPF ${spouseGrammar.spouseOf}: 036.***.***-18
- Data de Nascimento: 05/11/1997
- Data de Nascimento ${spouseGrammar.spouseOf}: 22/11/1995
- CEP: 64000-000
- Endereço: TERESINA - PI
- Renda: AUTÔNOMA - ${autonomousActivity.toUpperCase()} HÁ ${autonomousDuration.toUpperCase()} - R$ 2.500,00
- ${spouseGrammar.incomeSpouse} CLT: R$ 2.400,00
- Tem mais de 3 anos de carteira assinada: NÃO
- Vai usar FGTS: NÃO
- Tem Dependente: ${hasDependent ? "SIM" : "NÃO"}
- E-mail: nicolle@email.com
- Contato: 86999964566
- Imóvel: IMÓVEL NOVO - TERESINA LESTE
- VALOR DE AVALIAÇÃO: TETO
- Corretor: FRANKLIN MONTEIRO - CRECI 3812
- Tabela: PRICE`;
  const grouped = useMemo(
    () =>
      Object.entries(
        current.reduce<Record<string, Doc[]>>((acc, d) => {
          (acc[d.holder] ??= []).push(d);
          return acc;
        }, {}),
      ),
    [current],
  );
  const receiveCcaResult = async (
    status: "Restrição" | "Condicionado" | "Aprovado",
  ) => {
    if (!clientId) {
      setDocumentNotice("Selecione um cliente real antes de registrar o resultado do CCA.");
      return;
    }
    const nextAction = status === "Aprovado" ? "Montar proposta e agendar apresentação" : status === "Condicionado" ? "Registrar condição e definir plano de ação" : "Orientar regularização e programar nova análise";
    const response = await fetch("/api/clients", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: Number(clientId), financeStage: status, nextAction }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDocumentNotice(result.error || "Não foi possível registrar o resultado do CCA.");
      return;
    }
    setCreditStatus(status);
    setCcaReturn("Concluído");
    setResultNotice(
      status === "Aprovado"
        ? "Cliente APROVADO. Prepare simulação, proposta e agendamento."
        : status === "Condicionado"
          ? "Cliente CONDICIONADO. Verifique a condição informada e monte o plano de ação."
          : "Cliente COM RESTRIÇÃO. Oriente a regularização e programe nova análise.",
    );
    setUnreadResult(true);
    setNotificationsOpen(true);
  };
  const guidance = [
    {
      title: "Relacionamento com a CAIXA",
      file: "Guia-Relacionamento-Caixa-Monteiro.pdf",
      always: true,
      reason: "Obrigatório em qualquer resultado",
    },
    {
      title: "Open Finance",
      file: "Guia-Open-Finance-Monteiro.pdf",
      always: true,
      reason: "Fortalece leitura do histórico financeiro",
    },
    ...(creditStatus === "Restrição"
      ? [
          {
            title: "Consultar SCR/Registrato",
            file: "Guia-SCR-Registrato-Monteiro.pdf",
            always: false,
            reason: "Identificar e regularizar débitos com o credor original",
          },
        ]
      : []),
    ...(creditStatus === "Condicionado"
      ? [
          {
            title: "Crédito condicionado",
            file: "Guia-Credito-Condicionado-Monteiro.pdf",
            always: false,
            reason: "Tratar margem, idade ou formalização de renda",
          },
          {
            title: "Consultar SCR/Registrato",
            file: "Guia-SCR-Registrato-Monteiro.pdf",
            always: false,
            reason: "Mapear compromissos que consomem margem",
          },
        ]
      : []),
    ...(creditStatus === "Aprovado"
      ? [
          {
            title: "Parabéns pela aprovação",
            file: "Parabens-Analise-Aprovada-Monteiro.pdf",
            always: false,
            reason: "Conduzir para proposta, simulação e visita",
          },
          {
            title: "Cuidados do autônomo até assinatura",
            file: "Orientacoes-Autonomos-Ate-Assinatura-Monteiro.pdf",
            always: false,
            reason: "Preservar renda e organizar dossiê por 6 meses",
          },
        ]
      : []),
  ];
  return (
    <main className="client-shell">
      <aside className="client-sidebar">
        <div className="client-brand">
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
        <div className="client-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor de imóveis</span>
          </div>
        </div>
      </aside>
      <section className="client-main">
        <header className="client-header">
          <div>
            <Link href="/funil">‹ Voltar ao funil</Link>
            <span>Ficha completa do cliente</span>
            <h1>{selectedClient?.name || "Selecione o cliente"}</h1>
            <select
              className="client-picker"
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setDocumentNotice("");
                setDocs(tab === "pre" ? preDocs : fullDocs);
                setFileCounts({});
              }}
              aria-label="Selecionar cliente"
            >
              <option value="">Selecione o cliente real</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}
            </select>
          </div>
          <div className="client-header-actions">
            <button
              className="notification-trigger"
              aria-label="Notificações"
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              ♢
              {(!cadenceRead || unreadResult) && (
                <i>{cadenceAlerts.length + (unreadResult ? 1 : 0)}</i>
              )}
            </button>
            <a href="tel:+5586999964566">☎ Ligar</a>
            <a
              href="https://wa.me/5586999964566"
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src="/whatsapp.svg"
                alt="WhatsApp"
                width={16}
                height={16}
              />
              WhatsApp
            </a>
          </div>
        </header>
        {notificationsOpen && (
          <aside className="notification-center">
            <header>
              <div>
                <span>Central de notificações</span>
                <b>Atualizações operacionais</b>
              </div>
              <button onClick={() => setNotificationsOpen(false)}>×</button>
            </header>
            {unreadResult && (
              <article className="unread">
                <i>ANÁLISE</i>
                <div>
                  <b>{resultNotice}</b>
                  <span>Nenhum cliente selecionado</span>
                  <small>
                    Origem: CCA responsável · destino: Corretor responsável
                  </small>
                </div>
              </article>
            )}
            <div className="notification-section">
              <span>Cadência de atendimento</span>
              {cadenceAlerts.map((alert) => (
                <article
                  className={cadenceRead ? "" : "unread"}
                  key={`${alert.stage}-${alert.client}`}
                >
                  <i>{alert.stage}</i>
                  <div>
                    <b>
                      {alert.client} · {alert.message}
                    </b>
                    <span>{alert.time}</span>
                    <small>
                      {alert.priority} · gerado automaticamente pela cadência
                    </small>
                  </div>
                </article>
              ))}
            </div>
            <footer>
              <button
                onClick={() => {
                  setUnreadResult(false);
                  setCadenceRead(true);
                }}
              >
                Marcar todas como lidas
              </button>
              <Link href="/follow-ups">Abrir central de follow-ups</Link>
            </footer>
          </aside>
        )}
        <div className="client-content">
          {documentNotice && <p className="document-notice">{documentNotice}</p>}
          <section className="client-identity">
            <div className="identity-avatar">—</div>
            <div className="identity-main">
              <span>Cliente em tratamento</span>
              <h2>Cliente não selecionado</h2>
              <p>
                {clientSex} ·{" "}
                {relationship === "Casado civil"
                  ? `${clientGrammar.married} no civil`
                  : relationship === "Solteiro"
                    ? clientGrammar.single
                    : "União estável"}{" "}
                · {hasDependent ? "Dependente informado" : "Sem dependentes"}
                · Renda não informada
              </p>
              <small className="income-sync">
                {autonomousActivity} · {autonomousDuration} ·
                preencha dados na qualificação
              </small>
            </div>
            <div className="identity-stage">
              <span>Etapa atual</span>
              <b>Sem etapa definida</b>
              <small>Defina após selecionar cliente real</small>
            </div>
            <div className="identity-origin">
              <span>Origem</span>
              <b>Origem não informada</b>
              <small>Interesse não informado</small>
            </div>
          </section>
          <section className="finance-journey">
            <header>
              <div>
                <span>Jornada do financiamento</span>
                <h2>Prontuário completo do processo</h2>
                <small>Resultado oficial informado pelo CCA e registrado na ficha</small>
              </div>
              <strong>{creditStatus}</strong>
            </header>
            <div className="journey-track">
              <button
                className={creditStatus === "Documentação" ? "active" : "done"}
                onClick={() => setCreditStatus("Documentação")}
              >
                <i>01</i>
                <span>
                  <b>Documentação</b>
                  <small>Coleta e conferência</small>
                </span>
              </button>
              <button
                className={
                  creditStatus === "Em análise"
                    ? "active"
                    : creditStatus !== "Documentação"
                      ? "done"
                      : ""
                }
                onClick={() => setCreditStatus("Em análise")}
              >
                <i>02</i>
                <span>
                  <b>Análise</b>
                  <small>CCA avaliando crédito</small>
                </span>
              </button>
              <div className="analysis-outcomes">
                <em>Resultado da análise pelo CCA</em>
                {(["Restrição", "Condicionado", "Aprovado"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      className={creditStatus === status ? "active" : ""}
                      onClick={() => void receiveCcaResult(status)}
                    >
                      {status}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="journey-return">
              <div>
                <span>Acompanhamento do CCA</span>
                <select
                  aria-label="Retorno do CCA"
                  value={ccaReturn}
                  onChange={(e) =>
                    setCcaReturn(e.target.value as typeof ccaReturn)
                  }
                >
                  {[
                    "Enviado",
                    "Recebido",
                    "Em análise",
                    "Pendência",
                    "Concluído",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <article>
                <span>Protocolo</span>
                <b>—</b>
              </article>
              <article>
                <span>Última atualização</span>
                <b>—</b>
              </article>
              <article>
                <span>Prazo de resposta</span>
                <b>—</b>
              </article>
              <button>Registrar movimentação</button>
            </div>
            <footer>
              <span>Próxima ação automática</span>
              <b>
                {creditStatus === "Aprovado"
                  ? "Montar proposta e agendar apresentação ao cliente."
                  : creditStatus === "Condicionado"
                    ? "Registrar condição e definir plano de regularização ou entrada."
                    : creditStatus === "Restrição"
                      ? "Registrar débitos, orientar cliente e agendar nova análise."
                      : "Cobrar retorno do CCA amanhã às 17:01 caso não haja resposta."}
              </b>
            </footer>
          </section>
          <section className="guidance-center">
            <header>
              <div>
                <span>Orientação por etapa</span>
                <h2>Materiais recomendados para o cliente</h2>
              </div>
              <small>
                Resultado: {creditStatus} · perfil:{" "}
                {clientSex === "Feminino" ? "autônoma" : "autônomo"}
              </small>
            </header>
            <div>
              {guidance.map((item) => (
                <article key={item.file}>
                  <i>{item.always ? "FIXO" : "ETAPA"}</i>
                  <span>
                    <b>{item.title}</b>
                    <small>{item.reason}</small>
                  </span>
                  <a
                    href={`/materiais/${item.file}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir PDF
                  </a>
                  <button type="button">
                    <Image
                      src="/whatsapp.svg"
                      alt="WhatsApp"
                      width={13}
                      height={13}
                    />
                    Enviar no WhatsApp
                  </button>
                </article>
              ))}
            </div>
          </section>
          <section className="profile-rules">
            <div className="profile-sync">
              <span>Perfil documental</span>
              <b>Sincronizado da qualificação</b>
              <small>
                Alterações atualizam automaticamente documentos, propostas e
                contratos.
              </small>
            </div>
            <fieldset className="sex-field">
              <legend>Sexo do titular</legend>
              <select
                aria-label="Sexo do titular"
                value={clientSex}
                onChange={(e) => setClientSex(e.target.value as Sex)}
              >
                <option>Feminino</option>
                <option>Masculino</option>
              </select>
              {relationship !== "Solteiro" && (
                <>
                  <span>Sexo do cônjuge</span>
                  <select
                    aria-label="Sexo do cônjuge"
                    value={spouseSex}
                    onChange={(e) => setSpouseSex(e.target.value as Sex)}
                  >
                    <option>Feminino</option>
                    <option>Masculino</option>
                  </select>
                </>
              )}
            </fieldset>
            <fieldset>
              <legend>Relacionamento civil</legend>
              {(["Solteiro", "Casado civil", "União estável"] as const).map(
                (item) => (
                  <label
                    className={relationship === item ? "selected" : ""}
                    key={item}
                  >
                    <input
                      type="radio"
                      name="relationship"
                      checked={relationship === item}
                      onChange={() => setRelationship(item)}
                    />
                    <i></i>
                    <span>{item}</span>
                  </label>
                ),
              )}
            </fieldset>
            <fieldset className="dependent-field">
              <legend>Dependentes · dossiê completo</legend>
              <label className={hasDependent ? "selected" : ""}>
                <input
                  type="checkbox"
                  checked={hasDependent}
                  onChange={(e) => setHasDependent(e.target.checked)}
                />
                <i></i>
                <span>Possui dependente</span>
              </label>
              {hasDependent && (
                <select
                  aria-label="Grau de parentesco do dependente"
                  value={dependentKinship}
                  onChange={(e) => setDependentKinship(e.target.value)}
                >
                  <option>Filho(a) · 1º grau</option>
                  <option>Pai/Mãe · 1º grau</option>
                  <option>Irmão/Irmã · 2º grau</option>
                  <option>Avô/Avó · 2º grau</option>
                  <option>Neto(a) · 2º grau</option>
                  <option>Tio/Tia · 3º grau</option>
                  <option>Sobrinho(a) · 3º grau</option>
                  <option>Bisavô/Bisavó · 3º grau</option>
                  <option>Bisneto(a) · 3º grau</option>
                </select>
              )}
            </fieldset>
            <div className="requirements-preview">
              <span>Checklists ativos</span>
              <b>
                Titular
                {relationship !== "Solteiro"
                  ? relationship === "União estável"
                    ? " + companheiro(a)"
                    : " + cônjuge"
                  : ""}
                {hasDependent ? ` + dependente (${dependentKinship})` : ""}
              </b>
            </div>
          </section>
          <section className="document-tabs">
            <button
              className={tab === "pre" ? "active" : ""}
              onClick={() => {
                setTab("pre");
                setDocs(preDocs);
              }}
            >
              <span>Etapa 01</span>
              <b>Pré-análise de crédito</b>
              <small>Documentação mínima para avaliar aprovação</small>
            </button>
            <button
              className={tab === "full" ? "active" : ""}
              onClick={() => {
                setTab("full");
                setDocs(fullDocs);
              }}
            >
              <span>Etapa 02</span>
              <b>Dossiê de fechamento</b>
              <small>Somente após aprovação e decisão de compra</small>
            </button>
          </section>
          {tab === "pre" && (
            <section className="cca-cancellation">
              <header>
                <div>
                  <span>Exceção operacional</span>
                  <h2>Avaliação existente em outro CCA</h2>
                  <p>
                    Use somente quando o correspondente confirmar uma avaliação
                    ativa anterior.
                  </p>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={previousCca}
                    onChange={(e) => setPreviousCca(e.target.checked)}
                  />
                  <i></i>
                  <b>Cliente possui avaliação em outro CCA</b>
                </label>
              </header>
              {previousCca && (
                <div className="cancellation-workspace">
                  <label>
                    <span>CPF do cliente</span>
                    <input
                      value={clientCpf}
                      onChange={(e) => setClientCpf(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </label>
                  <article>
                    <span>Texto gerado automaticamente</span>
                    <pre>{cancellationLetter}</pre>
                    <button
                      type="button"
                      disabled={!clientCpf}
                      onClick={async () => {
                        await navigator.clipboard.writeText(cancellationLetter);
                        setLetterCopied(true);
                      }}
                    >
                      {letterCopied ? "Texto copiado" : "Copiar texto da carta"}
                    </button>
                  </article>
                  <label className="letter-upload">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => uploadCancellationLetter(e.target.files)}
                    />
                    <i>{letterUploaded ? "✓" : "＋"}</i>
                    <span>
                      <b>
                        {letterUploaded
                          ? "Carta anexada e consolidada"
                          : "Anexar foto da carta assinada"}
                      </b>
                      <small>
                        JPG, PNG ou PDF · múltiplos arquivos viram um PDF único
                      </small>
                    </span>
                    {cancellationDocument?.url && (
                      <span className="letter-upload-actions">
                        <a href={cancellationDocument.url} target="_blank" rel="noreferrer">Visualizar</a>
                        <button type="button" onClick={(event) => { event.preventDefault(); void removeStoredDocument(cancellationDocument.document_type); }}>Excluir</button>
                      </span>
                    )}
                  </label>
                </div>
              )}
            </section>
          )}
          <section className="doc-command">
            <div className="doc-progress">
              <div>
                <span>
                  {tab === "pre"
                    ? "Prontidão para análise"
                    : "Prontidão para fechamento"}
                </span>
                <b>{pct}%</b>
              </div>
              <i>
                <span style={{ width: `${pct}%` }} />
              </i>
              <small>
                {complete} de {required.length} documentos obrigatórios
                aprovados
              </small>
            </div>
            <div className={aptToSign ? "doc-gate apt" : "doc-gate"}>
              <span>
                {aptToSign
                  ? "APTO PARA ASSINAR COM A CAIXA"
                  : blockers.length
                    ? `${blockers.length} bloqueios ativos`
                    : "Pasta pronta"}
              </span>
              <b>
                {blockers.length
                  ? "Envio bloqueado até concluir conferência"
                  : "Pode avançar para próxima etapa"}
              </b>
            </div>
            <button className="request-docs" onClick={() => setMessage(true)}>
              <Image
                src="/whatsapp.svg"
                alt="WhatsApp"
                width={16}
                height={16}
              />
              {message ? "Checklist enviado" : "Solicitar pendências"}
            </button>
          </section>
          <div className="docs-layout">
            <section className="docs-checklist">
              <header>
                <div>
                  <span>Checklist documental</span>
                  <h2>
                    {tab === "pre"
                      ? "Documentos para pré-análise"
                      : "Dossiê completo MCMV"}
                  </h2>
                </div>
                <div className="doc-legend">
                  <span>
                    <i className="required-dot"></i>Obrigatório
                  </span>
                  <span>
                    <i></i>Condicional
                  </span>
                </div>
              </header>
              {grouped.map(([holder, items]) => (
                <section className="holder-group" key={holder}>
                  <div className="holder-head">
                    <div>
                      <i>{holder[0]}</i>
                      <span>
                        <b>{holder}</b>
                        <small>
                          {holder.startsWith("Cônjuge")
                            ? `Obrigatório porque cliente é ${clientGrammar.married.toLowerCase()} no civil`
                            : holder.startsWith("Dependente")
                              ? "Sem renda e não casado(a)"
                              : "Proponente principal"}
                        </small>
                      </span>
                    </div>
                    <strong>
                      {items.filter((d) => d.status === "Aprovado").length}/
                      {items.filter((d) => d.required).length}
                    </strong>
                  </div>
                  <div className="doc-rows">
                    {items.map((doc, index) => (
                      <article key={`${doc.name}-${index}`}>
                        <span
                          className={`doc-required ${doc.required ? "yes" : ""}`}
                        ></span>
                        <div>
                          <b>{doc.name}</b>
                          <small>
                            {doc.note ||
                              (doc.required
                                ? "Documento obrigatório"
                                : "Documento condicional")}
                          </small>
                        </div>
                        <Status value={doc.status} />
                        <label className="doc-upload">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(event) =>
                              uploadDocument(doc, event.target.files)
                            }
                          />
                          <span>
                            {uploading === `${doc.holder}-${doc.name}`
                              ? "Unificando..."
                              : fileCounts[`${doc.holder}-${doc.name}`]
                                ? `${fileCounts[`${doc.holder}-${doc.name}`]} arquivos · PDF único`
                                : doc.status === "Pendente"
                                  ? "Adicionar"
                                  : doc.status === "Recebido"
                                    ? "Conferir / anexar"
                                    : "Adicionar mais"}
                          </span>
                        </label>
                        {storedDocumentFor(doc)?.url && (
                          <span className="doc-file-actions">
                            <a className="doc-view" href={storedDocumentFor(doc)?.url || "#"} target="_blank" rel="noreferrer">Visualizar</a>
                            <button type="button" className="doc-delete" onClick={() => void removeStoredDocument(documentTypeFor(doc))}>Excluir</button>
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </section>
            <aside className="doc-sidebar">
              <section className="rules-card">
                <span>Regras automáticas</span>
                <h3>Validações do perfil</h3>
                <article className="ok">
                  <i>✓</i>
                  <div>
                    <b>Estado civil confirmado</b>
                    <small>
                      {relationship === "Solteiro"
                        ? "Nenhum documento de cônjuge exigido."
                        : relationship === "União estável"
                          ? "Documentos do companheiro(a) habilitados."
                          : `${clientGrammar.married} no civil: documentos do cônjuge obrigatórios.`}
                    </small>
                  </div>
                </article>
                {tab === "full" && hasDependent && (
                  <>
                    <article className="ok">
                      <i>✓</i>
                      <div>
                        <b>Parentesco elegível</b>
                        <small>
                          {dependentKinship}. Permitido até o 3º grau.
                        </small>
                      </div>
                    </article>
                    <article className="warning">
                      <i>!</i>
                      <div>
                        <b>Autodeclaração CAIXA</b>
                        <small>
                          Confirma ausência de renda e dependência do titular.
                        </small>
                      </div>
                    </article>
                  </>
                )}
                <article>
                  <i>i</i>
                  <div>
                    <b>FGTS condicional</b>
                    <small>
                      Exigir extrato somente quando utilizado na entrada.
                    </small>
                  </div>
                </article>
              </section>
              <section className="transition-card">
                <span>Transição de etapa</span>
                <h3>
                  {tab === "pre" ? "Enviar para análise" : "Liberar fechamento"}
                </h3>
                <p>
                  {tab === "pre"
                    ? "O CRM monta um PDF único, registra data, hora, CCA e responsável."
                    : "Ao concluir, CRM libera contrato, fluxo financeiro e comissão."}
                </p>
                <label>
                  <span>CCA responsável</span>
                  <select
                    value={cca}
                    onChange={(e) => {
                      setCca(e.target.value);
                      setPackagePreview(false);
                      setCcaSent(false);
                    }}
                  >
                    <option value="" disabled>
                      Selecione o CCA
                    </option>
                    {ccas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                {tab === "pre" && cca && (
                  <div className="package-builder">
                    <div className="package-title">
                      <b>Pacote para análise</b>
                      <small>PDF único · ordem obrigatória</small>
                    </div>
                    <div className="cca-contact">
                      <span>
                        <b>{selectedCca?.name}</b>
                        <small>
                          {selectedCca?.responsible_name || "Responsável não informado"} · cadastro do CCA
                        </small>
                      </span>
                      <a
                        href={`tel:+${selectedCca?.phone || ""}`}
                      >
                        Ligar
                      </a>
                      <a
                        className="cca-whatsapp"
                        href={`https://wa.me/${(selectedCca?.whatsapp || selectedCca?.phone || "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Image
                          src="/whatsapp.svg"
                          alt="WhatsApp"
                          width={13}
                          height={13}
                        />{" "}
                        WhatsApp
                      </a>
                    </div>
                    <div className="package-order">
                      <article>
                        <i>01</i>
                        <span>
                          <b>Documentação</b>
                          <small>
                            {complete}/{required.length} itens conferidos
                          </small>
                        </span>
                      </article>
                      <article>
                        <i>02</i>
                        <span>
                          <b>Texto de análise</b>
                          <small>
                            OCR + qualificação · {autonomousActivity},{" "}
                            {autonomousDuration}
                          </small>
                        </span>
                      </article>
                    </div>
                    <p className="ocr-note">
                      Confirme CPF, renda, atividade e endereço antes do envio.
                    </p>
                    <button
                      className="preview-package"
                      type="button"
                      onClick={() => setPackagePreview((value) => !value)}
                    >
                      {packagePreview
                        ? "Ocultar prévia"
                        : "Pré-visualizar PDF único"}
                    </button>
                    {packagePreview && (
                      <div className="analysis-preview">
                        <span>Texto gerado automaticamente</span>
                        <pre>{analysisText}</pre>
                      </div>
                    )}
                    <button
                      className="send-cca"
                      type="button"
                      disabled={blockers.length > 0 || !clientId || sendingPackage}
                      onClick={sendPackageToCca}
                    >
                      {ccaSent
                        ? `Enviado para ${cca}`
                        : sendingPackage
                          ? "Unificando PDF..."
                          : "Enviar documentação + texto ao CCA"}
                    </button>
                    {(blockers.length > 0 || !clientId) && (
                      <small className="send-lock">
                        {!clientId
                          ? "Selecione o cliente real para liberar anexos e envio."
                          : `Conclua os ${blockers.length} documentos pendentes para liberar o envio.`}
                      </small>
                    )}
                  </div>
                )}
                <label>
                  <span>Observação de envio</span>
                  <textarea placeholder="Contexto necessário para análise" />
                </label>
                {tab === "full" && (
                  <button type="button" onClick={sendPackageToCca} disabled={blockers.length > 0 || !cca || !clientId || sendingPackage}>
                    {!cca
                      ? "Selecione o CCA"
                      : !clientId
                        ? "Selecione o cliente"
                        : blockers.length
                        ? `Resolver ${blockers.length} bloqueios`
                        : sendingPackage ? "Unificando PDF..." : "Enviar dossiê completo ao CCA"}
                  </button>
                )}
              </section>
              <section className="audit-card">
                <span>Auditoria</span>
                <h3>Últimos movimentos</h3>
                {!selectedClient && <p>Selecione um cliente para consultar o prontuário.</p>}
                {selectedClient && !clientEvents.length && <p>Cadastro importado. Nenhum atendimento registrado. Etapa atual: {selectedClient.funnel_stage || "não trabalhado"}.</p>}
                {clientEvents.slice(0,12).map(event=><div className="audit-event" key={event.id}><b>{event.title}</b><small>{event.description || event.event_type}</small><time>{event.new_stage || "Registro"} · {event.occurred_at ? new Date(event.occurred_at).toLocaleString("pt-BR") : "Data não informada"}</time></div>)}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
