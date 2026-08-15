"use client";

import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { useEffect, useMemo, useState } from "react";
import "./fechamento.css";
import "./property-media.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
type Sex = "Feminino" | "Masculino";
type CatalogMedia = { id: number; name: string; type: string; url: string };
type CatalogProject = { id: number; name: string; price: number; commission: number; media: CatalogMedia[] };
type CatalogBuilder = { id: number; name: string; projects: CatalogProject[] };
type ClosingClient = { id: number; name: string; phone: string; email?: string; sex?: Sex; marital_status?: string; profession?: string; income?: number; finance_stage?: string };

function genderLanguage(sex: Sex) {
  return sex === "Feminino"
    ? {
        article: "a",
        buyer: "PROPONENTE COMPRADORA",
        buyerOf: "DA PROPONENTE COMPRADORA",
        ordinal: "1ª PROPONENTE",
        spouseOrdinal: "2ª PROPONENTE/CÔNJUGE",
        referred: "denominada",
      }
    : {
        article: "o",
        buyer: "PROPONENTE COMPRADOR",
        buyerOf: "DO PROPONENTE COMPRADOR",
        ordinal: "1º PROPONENTE",
        spouseOrdinal: "2º PROPONENTE/CÔNJUGE",
        referred: "denominado",
      };
}

function hasConfirmedSpouse(profile: any) {
  const married = profile.maritalStatus === "Casado civil";
  const certificateApproved = profile.marriageCertificateStatus === "Aprovado";
  const spouseComplete = Boolean(
    profile.spouse?.name && profile.spouse?.cpf && profile.spouse?.birth,
  );
  return married && certificateApproved && spouseComplete;
}

export default function FechamentoPage() {
  const [clients, setClients] = useState<ClosingClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(0);
  const [catalog, setCatalog] = useState<CatalogBuilder[]>([]);
  const [selectedBuilderId, setSelectedBuilderId] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState(0);
  const [mediaOrder, setMediaOrder] = useState<CatalogMedia[]>([]);
  const [draggedMediaId, setDraggedMediaId] = useState<number | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [unit, setUnit] = useState("");
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedBuilderData = catalog.find((builder) => builder.id === selectedBuilderId);
  const selectedProjectData = selectedBuilderData?.projects.find((project) => project.id === selectedProjectId);
  const clientProfile = {
    maritalStatus: selectedClient?.marital_status || "Solteiro",
    marriageCertificateStatus: "Pendente",
    holder: {
      name: selectedClient?.name || "Cliente não selecionado",
      sex: selectedClient?.sex || "Feminino" as Sex,
      cpf: "—",
      birth: "—",
      income: Number(selectedClient?.income || 0),
      incomeType: selectedClient?.profession || "—",
    },
    spouse: {
      name: "",
      sex: "Masculino" as Sex,
      cpf: "",
      birth: "",
      income: 0,
      incomeType: "",
    },
  };
  const clientLanguage = genderLanguage(clientProfile.holder.sex);
  const [propertyValue, setPropertyValue] = useState(0);
  const [financing, setFinancing] = useState(0);
  const [subsidy, setSubsidy] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [signal, setSignal] = useState(0);
  const [monthlyQty, setMonthlyQty] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [fgts, setFgts] = useState(0);
  const [intermediate1, setIntermediate1] = useState(0);
  const [intermediate2, setIntermediate2] = useState(0);
  const [intermediate3, setIntermediate3] = useState(0);
  const [postKeyTotal, setPostKeyTotal] = useState(0);
  const [postKeyTerms, setPostKeyTerms] = useState(0);
  const [otherEntry, setOtherEntry] = useState(0);
  const [signalTiming, setSignalTiming] = useState("Pré-chave");
  const [monthlyTiming, setMonthlyTiming] = useState("Pré-chave");
  const [inter1Timing, setInter1Timing] = useState("Pré-chave");
  const [inter2Timing, setInter2Timing] = useState("Pré-chave");
  const [inter3Timing, setInter3Timing] = useState("Pré-chave");
  const [fgtsTiming, setFgtsTiming] = useState("Pré-chave");
  const [postKeyTiming, setPostKeyTiming] = useState("Pós-chave");
  const [otherTiming, setOtherTiming] = useState("Pré-chave");
  const [deliveryMonths] = useState(0);
  const [caixaPayment, setCaixaPayment] = useState(0);
  const [term, setTerm] = useState(0);
  const [itbi, setItbi] = useState(0);
  const [tac, setTac] = useState(0);
  const [tao, setTao] = useState(0);
  const [engineering, setEngineering] = useState(0);
  const [itbiBonus, setItbiBonus] = useState(false);
  const [tacBonus, setTacBonus] = useState(false);
  const [taoBonus, setTaoBonus] = useState(false);
  const [engineeringBonus, setEngineeringBonus] = useState(false);
  const [itbiTerms, setItbiTerms] = useState(0);
  const [itbiTiming, setItbiTiming] = useState("Ambos");
  const [tacTerms, setTacTerms] = useState(1);
  const [tacTiming, setTacTiming] = useState("Antes das chaves");
  const [taoTerms, setTaoTerms] = useState(0);
  const [taoTiming, setTaoTiming] = useState("Antes das chaves");
  const [engineeringTerms, setEngineeringTerms] = useState(0);
  const [engineeringTiming, setEngineeringTiming] =
    useState("Antes das chaves");
  const [propertyMode, setPropertyMode] = useState("Imóvel novo");
  const [system, setSystem] = useState("PRICE");
  const [importedFile, setImportedFile] = useState("");
  const [result, setResult] = useState("Em negociação");
  const [reason, setReason] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(false);
  const [contractPreview, setContractPreview] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/closing").then((response) => response.json()),
      fetch("/api/catalog").then((response) => response.json()),
    ]).then(([clientData, catalogData]) => {
      if (Array.isArray(clientData)) {
        setClients(clientData);
        if (clientData[0]) setSelectedClientId(clientData[0].id);
      }
      if (Array.isArray(catalogData)) {
        setCatalog(catalogData);
        const builder = catalogData.find((item: CatalogBuilder) => item.projects?.length) || catalogData[0];
        if (builder) {
          setSelectedBuilderId(builder.id);
          setSelectedProjectId(builder.projects?.[0]?.id || 0);
        }
      }
    }).catch(() => setFeedback("Não foi possível carregar os dados reais."));
  }, []);

  useEffect(() => {
    setMediaOrder(selectedProjectData?.media || []);
    if (selectedProjectData?.price) setPropertyValue(Number(selectedProjectData.price));
  }, [selectedProjectData?.id]);

  const calc = useMemo(() => {
    const netPropertyValue = Math.max(0, propertyValue - bonus);
    const entry = Math.max(0, netPropertyValue - financing - subsidy);
    const distributed =
      signal +
      monthlyTotal +
      fgts +
      intermediate1 +
      intermediate2 +
      intermediate3 +
      postKeyTotal +
      otherEntry;
    const remaining = entry - distributed;
    const monthlyEntry = monthlyQty > 0 ? monthlyTotal / monthlyQty : 0;
    const fees = [
      { amount: itbi, bonus: itbiBonus, terms: itbiTerms, timing: itbiTiming },
      { amount: tac, bonus: tacBonus, terms: tacTerms, timing: tacTiming },
      ...(propertyMode === "Aquisição e construção"
        ? [
            {
              amount: tao,
              bonus: taoBonus,
              terms: taoTerms,
              timing: taoTiming,
            },
            {
              amount: engineering,
              bonus: engineeringBonus,
              terms: engineeringTerms,
              timing: engineeringTiming,
            },
          ]
        : []),
    ];
    const beforeCount = (f: { terms: number; timing: string }) =>
      f.timing === "Antes das chaves"
        ? f.terms
        : f.timing === "Após as chaves"
          ? 0
          : Math.min(deliveryMonths, f.terms);
    const activeFees = fees.filter((f) => !f.bonus);
    const feeTotal = activeFees.reduce((sum, f) => sum + f.amount, 0);
    const beforeFeeTotal = activeFees.reduce(
      (sum, f) => sum + (f.amount / Math.max(1, f.terms)) * beforeCount(f),
      0,
    );
    const afterFeeTotal = feeTotal - beforeFeeTotal;
    const feeMonthlyBefore = activeFees
      .filter((f) => beforeCount(f) > 0 && f.terms > 1)
      .reduce((sum, f) => sum + f.amount / Math.max(1, f.terms), 0);
    const oneTimeBefore = activeFees
      .filter((f) => beforeCount(f) > 0 && f.terms === 1)
      .reduce((sum, f) => sum + f.amount, 0);
    const feeMonthlyAfter = activeFees
      .filter((f) => f.terms > beforeCount(f))
      .reduce((sum, f) => sum + f.amount / Math.max(1, f.terms), 0);
    const duringWork = entry + beforeFeeTotal;
    const monthlyDuringWork = monthlyEntry + feeMonthlyBefore;
    return {
      netPropertyValue,
      entry,
      remaining,
      monthlyEntry,
      feeTotal,
      beforeFeeTotal,
      afterFeeTotal,
      feeMonthlyBefore,
      oneTimeBefore,
      feeMonthlyAfter,
      duringWork,
      monthlyDuringWork,
    };
  }, [
    propertyValue,
    bonus,
    financing,
    subsidy,
    signal,
    monthlyTotal,
    fgts,
    intermediate1,
    intermediate2,
    intermediate3,
    postKeyTotal,
    otherEntry,
    monthlyQty,
    itbi,
    tac,
    tao,
    engineering,
    itbiBonus,
    tacBonus,
    taoBonus,
    engineeringBonus,
    itbiTerms,
    itbiTiming,
    tacTerms,
    tacTiming,
    taoTerms,
    taoTiming,
    engineeringTerms,
    engineeringTiming,
    deliveryMonths,
    propertyMode,
  ]);

  async function importSimulation(file: File | undefined) {
    if (!file) return;
    setLoadingPdf(true);
    setFeedback("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/closing/simulation", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao analisar a simulação.");
      setImportedFile(file.name);
      setPropertyValue(Number(data.propertyValue || 0));
      setFinancing(Number(data.financing || 0));
      setSubsidy(Number(data.subsidy || 0));
      setCaixaPayment(Number(data.installment || 0));
      setTerm(Number(data.term || 0));
      if (data.system) setSystem(data.system);
      if (data.modality) setPropertyMode(data.modality);
      setSignal(0);
      setMonthlyTotal(Number(data.entry || 0));
      setFeedback(`Simulação analisada: financiamento ${money.format(data.financing)}, subsídio ${money.format(data.subsidy)} e menor prestação ${money.format(data.installment)}.`);
    } catch (error) {
      setImportedFile("");
      setFeedback(error instanceof Error ? error.message : "Falha ao analisar a simulação.");
    } finally {
      setLoadingPdf(false);
    }
  }

  async function saveOutcome() {
    setFeedback("");
    const response = await fetch("/api/closing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, projectId: selectedProjectId, result, reason, notes: outcomeNotes, nextActionAt, vgv: calc.netPropertyValue }),
    });
    const data = await response.json();
    if (!response.ok) return setFeedback(data.error || "Não foi possível registrar o resultado.");
    setSaved(true);
    setFeedback(result === "Fechado" ? "Fechamento confirmado e VGV enviado à central financeira." : "Resultado e próxima ação registrados na ficha do cliente.");
  }
  const applicableFees = [
    {
      name: "ITBI + Cartório",
      amount: itbi,
      bonus: itbiBonus,
      timing: itbiTiming,
    },
    { name: "TAC", amount: tac, bonus: tacBonus, timing: "Antes das chaves" },
    ...(propertyMode === "Aquisição e construção"
      ? [
          {
            name: "TAO",
            amount: tao,
            bonus: taoBonus,
            timing: "Antes das chaves",
          },
          {
            name: "Engenharia",
            amount: engineering,
            bonus: engineeringBonus,
            timing: "Antes das chaves",
          },
        ]
      : []),
  ];
  const paidPreFees = applicableFees.filter(
    (f) => !f.bonus && f.timing !== "Após as chaves",
  );
  const bonusFeeNames = applicableFees
    .filter((f) => f.bonus)
    .map((f) => f.name);
  const totalBonus =
    bonus +
    applicableFees.filter((f) => f.bonus).reduce((sum, f) => sum + f.amount, 0);

  return (
    <main className="closing-shell">
      <aside className="closing-sidebar">
        <div className="closing-brand">
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
        <div className="closing-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>

      <section className="closing-main">
        <header className="closing-header">
          <div>
            <span>Cliente aprovado · etapa comercial</span>
            <h1>Mesa de Fechamento</h1>
            <p>Franklin Monteiro · CRECI 3812 · (86) 99906-7923</p>
          </div>
          <div className="header-actions">
            <button>Salvar rascunho</button>
            <button className="gold" onClick={() => setPdfPreview(true)}>
              Gerar proposta em PDF
            </button>
          </div>
        </header>

        <div className="closing-content">
          <section className="client-ribbon">
            <div>
              <span>Cliente selecionado</span>
              <h2>{selectedClient?.name || "Cliente não selecionado"}</h2>
              <p>{selectedClient ? `${selectedClient.finance_stage || "Aprovado"} · ${selectedClient.phone}` : "Selecione um cliente aprovado."}</p>
            </div>
            <article>
              <span>Crédito aprovado</span>
              <b>{money.format(financing)}</b>
            </article>
            <article>
              <span>Parcela CAIXA</span>
              <b>{money.format(caixaPayment)}</b>
            </article>
            <article>
              <span>Sistema · prazo</span>
              <b>{system || "Sistema não identificado"} · {term} meses</b>
            </article>
            <select className="client-selector" value={selectedClientId} onChange={(event) => setSelectedClientId(Number(event.target.value))}>
              <option value={0}>Selecionar cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </section>

          <section className="pdf-import">
            <div className="pdf-import-icon">PDF</div>
            <div>
              <span>Leitura automática CAIXA</span>
              <h2>Anexar aprovação ou simulação</h2>
              <p>
                O CRM identifica financiamento, subsídio, entrada, primeira
                prestação, prazo, sistema e modalidade.
              </p>
            </div>
            <label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => importSimulation(e.target.files?.[0])}
              />
              {loadingPdf ? "Analisando..." : importedFile ? "Trocar documento" : "Selecionar PDF"}
            </label>
            {importedFile && (
              <aside>
                <i>✓</i>
                <div>
                  <b>{importedFile}</b>
                  <span>
                    Valores essenciais carregados e disponíveis para
                    conferência.
                  </span>
                </div>
              </aside>
            )}
            {feedback && <p className="closing-feedback">{feedback}</p>}
          </section>

          <section className="closing-steps">
            <button className="active">
              <i>01</i>
              <span>
                <b>Composição</b>
                <small>Imóvel e crédito</small>
              </span>
            </button>
            <button className="active">
              <i>02</i>
              <span>
                <b>Negociação</b>
                <small>Entrada e fluxo</small>
              </span>
            </button>
            <button>
              <i>03</i>
              <span>
                <b>Financiamento</b>
                <small>Parcela e taxas</small>
              </span>
            </button>
            <button>
              <i>04</i>
              <span>
                <b>Apresentação</b>
                <small>Proposta ao cliente</small>
              </span>
            </button>
          </section>

          <div className="closing-workspace">
            <section className="proposal-builder">
              <header>
                <div>
                  <span>Etapa 01 · Explicação do financiamento</span>
                  <h2>Valores liberados e negociação da entrada</h2>
                </div>
                <aside>
                  <span>Saldo da entrada</span>
                  <b
                    className={Math.abs(calc.remaining) < 0.01 ? "ok" : "alert"}
                  >
                    {money.format(calc.remaining)}
                  </b>
                </aside>
              </header>
              <div className="form-grid">
                <label>
                  <span>Construtora parceira</span>
                  <select
                    value={selectedBuilderId}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setSelectedBuilderId(next);
                      setSelectedProjectId(catalog.find((builder) => builder.id === next)?.projects?.[0]?.id || 0);
                    }}
                  >
                    {catalog.map((builder) => (
                      <option key={builder.id} value={builder.id}>{builder.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Empreendimento</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  >
                    {(selectedBuilderData?.projects || []).map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Unidade</span>
                  <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Informe a unidade escolhida" />
                </label>
                <MoneyInput
                  label="Valor do imóvel"
                  value={propertyValue}
                  onChange={setPropertyValue}
                />
                <MoneyInput
                  label="Financiamento CAIXA"
                  value={financing}
                  onChange={setFinancing}
                />
                <MoneyInput
                  label="Subsídio"
                  value={subsidy}
                  onChange={setSubsidy}
                />
                <MoneyInput
                  label="Bônus construtora"
                  value={bonus}
                  onChange={setBonus}
                />
              </div>
              <section className="closing-media">
                <header>
                  <div>
                    <span>Apresentação do produto</span>
                    <h3>Galeria carregada do cadastro da construtora</h3>
                  </div>
                  <aside>
                    <b>{selectedProjectData?.name || "Selecione o empreendimento"}</b>
                    <small>
                      {selectedBuilderData?.name || "Construtora"} · arraste para ordenar
                    </small>
                  </aside>
                </header>
                <div>
                  {mediaOrder.map((item, index) => (
                    <button key={item.id} draggable onDragStart={() => setDraggedMediaId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => {
                      if (draggedMediaId === null || draggedMediaId === item.id) return;
                      const from = mediaOrder.findIndex((media) => media.id === draggedMediaId);
                      const to = mediaOrder.findIndex((media) => media.id === item.id);
                      const next = [...mediaOrder];
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      setMediaOrder(next);
                    }} onClick={() => item.url && window.open(item.url, "_blank", "noopener,noreferrer") }>
                      <i>{String(index + 1).padStart(2, "0")}</i>
                      <span>
                        <b>{item.name}</b>
                        <small>{item.type.startsWith("video/") ? "Vídeo cadastrado" : "Foto cadastrada"}</small>
                      </span>
                      <em>{index === 0 ? "APRESENTANDO" : "ABRIR"}</em>
                    </button>
                  ))}
                </div>
                <footer>
                  <button onClick={() => mediaOrder[0]?.url && window.open(mediaOrder[0].url, "_blank", "noopener,noreferrer")}>▶ Iniciar apresentação imersiva</button>
                  <small>
                    Ordem manual usada na apresentação ao cliente.
                  </small>
                </footer>
              </section>
              <section className="deal-price">
                <article>
                  <span>Valor de tabela</span>
                  <b>{money.format(propertyValue)}</b>
                </article>
                <i>−</i>
                <article className="discount">
                  <span>Bônus/desconto</span>
                  <b>{money.format(bonus)}</b>
                </article>
                <i>=</i>
                <article className="net">
                  <span>Valor final do imóvel</span>
                  <b>{money.format(calc.netPropertyValue)}</b>
                </article>
                <aside>
                  <span>Entrada recalculada</span>
                  <strong>{money.format(calc.entry)}</strong>
                </aside>
              </section>
              <section className="applicants">
                <header>
                  <div>
                    <span>Proponentes da compra</span>
                    <b>Sincronizados da qualificação e documentos</b>
                  </div>
                  <small>Estado civil: {clientProfile.maritalStatus}</small>
                </header>
                <div>
                  <ApplicantCard
                    clientId={selectedClientId}
                    order="1º proponente"
                    {...clientProfile.holder}
                  />
                  {hasConfirmedSpouse(clientProfile) && (
                    <ApplicantCard
                      clientId={selectedClientId}
                      order="2º proponente · cônjuge"
                      {...clientProfile.spouse}
                    />
                  )}
                </div>
              </section>

              <div className="section-title">
                <div>
                  <span>Composição do negócio</span>
                  <h3>Entrada total a negociar</h3>
                </div>
                <div className="entry-balance">
                  <span>Entrada calculada</span>
                  <b>{money.format(calc.entry)}</b>
                </div>
              </div>
              <div className="negotiation-table">
                <header>
                  <span>Composição</span>
                  <span>Quando paga</span>
                  <span>Valor negociado</span>
                  <span>Quantidade</span>
                  <span>Valor da parcela</span>
                  <span>Primeiro vencimento</span>
                </header>
                <NegotiationRow
                  name="Sinal / ato"
                  timing={signalTiming}
                  setTiming={setSignalTiming}
                  total={signal}
                  setTotal={setSignal}
                  qty={1}
                />
                <NegotiationRow
                  name="Parcelas mensais"
                  timing={monthlyTiming}
                  setTiming={setMonthlyTiming}
                  total={monthlyTotal}
                  setTotal={setMonthlyTotal}
                  qty={monthlyQty}
                  setQty={setMonthlyQty}
                />
                <NegotiationRow
                  name="Intercalada 01"
                  timing={inter1Timing}
                  setTiming={setInter1Timing}
                  total={intermediate1}
                  setTotal={setIntermediate1}
                  qty={1}
                />
                <NegotiationRow
                  name="Intercalada 02"
                  timing={inter2Timing}
                  setTiming={setInter2Timing}
                  total={intermediate2}
                  setTotal={setIntermediate2}
                  qty={1}
                />
                <NegotiationRow
                  name="Intercalada 03"
                  timing={inter3Timing}
                  setTiming={setInter3Timing}
                  total={intermediate3}
                  setTotal={setIntermediate3}
                  qty={1}
                />
                <NegotiationRow
                  name="FGTS na entrada"
                  timing={fgtsTiming}
                  setTiming={setFgtsTiming}
                  total={fgts}
                  setTotal={setFgts}
                  qty={1}
                />
                <NegotiationRow
                  name="Parcelas pós-chaves"
                  timing={postKeyTiming}
                  setTiming={setPostKeyTiming}
                  total={postKeyTotal}
                  setTotal={setPostKeyTotal}
                  qty={postKeyTerms}
                  setQty={setPostKeyTerms}
                />
                <NegotiationRow
                  name="Outros"
                  timing={otherTiming}
                  setTiming={setOtherTiming}
                  total={otherEntry}
                  setTotal={setOtherEntry}
                  qty={1}
                />
                <footer>
                  <span>Total da entrada negociada</span>
                  <b>
                    {money.format(
                      signal +
                        monthlyTotal +
                        intermediate1 +
                        intermediate2 +
                        intermediate3 +
                        fgts +
                        postKeyTotal +
                        otherEntry,
                    )}
                  </b>
                  <span>Saldo da entrada a distribuir</span>
                  <strong
                    className={Math.abs(calc.remaining) < 0.01 ? "ok" : "alert"}
                  >
                    {money.format(calc.remaining)}
                  </strong>
                </footer>
              </div>

              <div className="finance-row">
                <div className="stage-heading">
                  <span>Etapa 02</span>
                  <b>Modalidade, parcela CAIXA e proteção do financiamento</b>
                </div>
                <label>
                  <span>Modalidade do imóvel</span>
                  <select
                    value={propertyMode}
                    onChange={(e) => setPropertyMode(e.target.value)}
                  >
                    <option>Imóvel novo</option>
                    <option>Aquisição e construção</option>
                    <option>Empreendimento</option>
                  </select>
                </label>
                <label>
                  <span>Sistema</span>
                  <select
                    value={system}
                    onChange={(e) => setSystem(e.target.value)}
                  >
                    <option>PRICE</option>
                    <option>SAC</option>
                  </select>
                </label>
                <label>
                  <span>Prazo</span>
                  <input
                    type="number"
                    value={term}
                    onChange={(e) => setTerm(+e.target.value)}
                  />
                  <small>meses</small>
                </label>
                <MoneyInput
                  label="Parcela CAIXA"
                  value={caixaPayment}
                  onChange={setCaixaPayment}
                />
              </div>

              <div className="fees">
                <header>
                  <div>
                    <span>Etapa 03 · Taxas do processo</span>
                    <h3>Proposta, bonificação e momento do pagamento</h3>
                  </div>
                  <b>{money.format(calc.feeTotal)}</b>
                </header>
                <div className="fee-table">
                  <FeeRow
                    name="ITBI + Cartório"
                    amount={itbi}
                    setAmount={setItbi}
                    bonus={itbiBonus}
                    setBonus={setItbiBonus}
                    terms={itbiTerms}
                    setTerms={setItbiTerms}
                    timing={itbiTiming}
                    setTiming={setItbiTiming}
                    deliveryMonths={deliveryMonths}
                  />
                  <FeeRow
                    name="TAC"
                    amount={tac}
                    setAmount={setTac}
                    bonus={tacBonus}
                    setBonus={setTacBonus}
                    terms={tacTerms}
                    setTerms={setTacTerms}
                    timing={tacTiming}
                    setTiming={setTacTiming}
                    deliveryMonths={deliveryMonths}
                    fixedPre
                  />
                  {propertyMode === "Aquisição e construção" && (
                    <>
                      <FeeRow
                        name="TAO"
                        amount={tao}
                        setAmount={setTao}
                        bonus={taoBonus}
                        setBonus={setTaoBonus}
                        terms={taoTerms}
                        setTerms={setTaoTerms}
                        timing={taoTiming}
                        setTiming={setTaoTiming}
                        deliveryMonths={deliveryMonths}
                        fixedPre
                      />
                      <FeeRow
                        name="Engenharia"
                        amount={engineering}
                        setAmount={setEngineering}
                        bonus={engineeringBonus}
                        setBonus={setEngineeringBonus}
                        terms={engineeringTerms}
                        setTerms={setEngineeringTerms}
                        timing={engineeringTiming}
                        setTiming={setEngineeringTiming}
                        deliveryMonths={deliveryMonths}
                        fixedPre
                      />
                    </>
                  )}
                </div>
                <footer>
                  <span>
                    Antes de receber as chaves:{" "}
                    <b>{money.format(calc.beforeFeeTotal)}</b>
                  </span>
                  <span>
                    Após receber as chaves:{" "}
                    <b>{money.format(calc.afterFeeTotal)}</b>
                  </span>
                  <span>
                    Economia em bônus:{" "}
                    <b>
                      {money.format(
                        (itbiBonus ? itbi : 0) +
                          (tacBonus ? tac : 0) +
                          (propertyMode === "Aquisição e construção" && taoBonus
                            ? tao
                            : 0) +
                          (propertyMode === "Aquisição e construção" &&
                          engineeringBonus
                            ? engineering
                            : 0),
                      )}
                    </b>
                  </span>
                </footer>
              </div>

              <div className="finance-charts">
                <article>
                  <header>
                    <div>
                      <span>Evolução do financiamento</span>
                      <h3>{system}: comportamento das parcelas</h3>
                    </div>
                    <b>{term} meses</b>
                  </header>
                  <PaymentChart system={system} payment={caixaPayment} />
                </article>
                <article>
                  <header>
                    <div>
                      <span>Evolução da obra</span>
                      <h3>
                        {propertyMode !== "Imóvel novo"
                          ? "Obra executada x juros de obra"
                          : "Juros de obra não se aplicam"}
                      </h3>
                    </div>
                    <b>{propertyMode}</b>
                  </header>
                  {propertyMode !== "Imóvel novo" ? (
                    <ConstructionChart payment={caixaPayment} />
                  ) : (
                    <div className="no-construction">
                      <i>✓</i>
                      <p>
                        Imóvel novo não possui juros de obra. O cliente inicia
                        apenas o fluxo previsto na contratação.
                      </p>
                    </div>
                  )}
                </article>
              </div>
              <div className="finance-education">
                <article>
                  <i>01</i>
                  <div>
                    <b>Seguro de vida habitacional</b>
                    <p>
                      Em caso de morte ou invalidez permanente, a cobertura pode
                      quitar o saldo do financiamento conforme participação e
                      condições contratuais.
                    </p>
                  </div>
                </article>
                <article>
                  <i>02</i>
                  <div>
                    <b>Proteção em dificuldade financeira</b>
                    <p>
                      A Pausa Seguro-Desemprego pode suspender 6 parcelas. A
                      Pausa Estendida pode alcançar até 12 parcelas, conforme
                      contrato, quota atual, adimplência e análise da CAIXA. Os
                      valores pausados alteram o saldo e o fluxo futuro.
                    </p>
                  </div>
                </article>
              </div>
            </section>

            <aside className="proposal-preview">
              <header>
                <span>Etapa 04 · Resumo final para o cliente</span>
                <h2>Proposta Monteiro</h2>
                <small>
                  Antes das chaves, após as chaves e obrigação final
                </small>
              </header>
              <div className="preview-property">
                <i>{(selectedBuilderData?.name || "IM").slice(0, 2).toUpperCase()}</i>
                <div>
                  <b>{selectedProjectData?.name || "Empreendimento"}</b>
                  <span>{unit ? `Unidade ${unit}` : "Unidade ainda não informada"} · {selectedBuilderData?.name || "Construtora"}</span>
                </div>
                <strong>{money.format(calc.netPropertyValue)}</strong>
              </div>
              <section>
                <span>Composição financeira</span>
                <article>
                  <b>Valor de tabela</b>
                  <strong>{money.format(propertyValue)}</strong>
                </article>
                {bonus > 0 && (
                  <article className="preview-discount">
                    <b>Bônus/desconto</b>
                    <strong>− {money.format(bonus)}</strong>
                  </article>
                )}
                <article>
                  <b>Valor final do imóvel</b>
                  <strong>{money.format(calc.netPropertyValue)}</strong>
                </article>
                <article>
                  <b>Financiamento CAIXA</b>
                  <strong>{money.format(financing)}</strong>
                </article>
                <article>
                  <b>Subsídio</b>
                  <strong>{money.format(subsidy)}</strong>
                </article>
                <article>
                  <b>Entrada negociada</b>
                  <strong>{money.format(calc.entry)}</strong>
                </article>
              </section>
              <section className="payment-story">
                <span>Como {clientLanguage.article} cliente pagará</span>
                <div>
                  <i>Agora</i>
                  <p>
                    Sinal de <b>{money.format(signal)}</b>.
                  </p>
                </div>
                <div>
                  <i>Taxas pré-chaves</i>
                  <p>
                    {paidPreFees.map((fee, index) => (
                      <span className="named-fee" key={fee.name}>
                        <b>
                          {fee.name}: {money.format(fee.amount)}
                        </b>
                        {index < paidPreFees.length - 1 ? " · " : ""}
                      </span>
                    ))}
                    {bonusFeeNames.length > 0 && (
                      <small>Bonificadas: {bonusFeeNames.join(", ")}.</small>
                    )}
                  </p>
                </div>
                <div>
                  <i>Antes de receber as chaves</i>
                  <p>
                    <b>
                      {monthlyQty}x de {money.format(calc.monthlyEntry)}
                    </b>{" "}
                    de entrada + <b>{money.format(calc.feeMonthlyBefore)}</b>{" "}
                    mensais em taxas parceladas. Total mensal recorrente:{" "}
                    <b>{money.format(calc.monthlyDuringWork)}</b>
                    {propertyMode !== "Imóvel novo"
                      ? ", além dos juros de obra variáveis."
                      : "."}
                  </p>
                </div>
                <div>
                  <i>Após receber as chaves</i>
                  <p>
                    {postKeyTotal > 0 ? (
                      <>
                        <b>
                          {postKeyTerms}x de{" "}
                          {money.format(
                            postKeyTotal / Math.max(1, postKeyTerms),
                          )}
                        </b>{" "}
                        da entrada pós-chaves +{" "}
                      </>
                    ) : null}
                    parcela CAIXA de <b>{money.format(caixaPayment)}</b>
                    {calc.feeMonthlyAfter > 0
                      ? ` + ${money.format(calc.feeMonthlyAfter)} temporários das taxas ainda parceladas.`
                      : "."}
                  </p>
                </div>
                <div className="final-phase">
                  <i>Após quitar entrada e taxas</i>
                  <p>
                    Fica somente a parcela do financiamento CAIXA:{" "}
                    <strong>{money.format(caixaPayment)} por mês</strong>.
                  </p>
                </div>
              </section>
              {totalBonus > 0 && (
                <section className="bonus-savings">
                  <i>BENEFÍCIO</i>
                  <div>
                    <span>Economia total obtida em bônus</span>
                    <b>{money.format(totalBonus)}</b>
                    <small>
                      {[
                        bonus > 0 ? "Bônus da construtora na entrada" : "",
                        ...bonusFeeNames,
                      ]
                        .filter(Boolean)
                        .join(" + ")}
                    </small>
                  </div>
                </section>
              )}
              <footer>
                <div>
                  <span>Total durante a obra</span>
                  <b>{money.format(calc.duringWork)}</b>
                </div>
                <button>
                  <Image
                    src="/whatsapp.svg"
                    alt="WhatsApp"
                    width={15}
                    height={15}
                  />{" "}
                  Apresentar no WhatsApp
                </button>
              </footer>
            </aside>
          </div>

          <section className="closing-outcome">
            <header>
              <div>
                <span>Desfecho obrigatório</span>
                <h2>Qual foi o resultado da apresentação?</h2>
                <p>
                  Proposta sem resultado e próxima ação vira venda esquecida.
                </p>
              </div>
              <div className="outcome-options">
                {["Fechado", "Em negociação", "Não fechou"].map((item) => (
                  <button
                    key={item}
                    className={result === item ? "active" : ""}
                    onClick={() => {
                      setResult(item);
                      setReason("");
                      setOutcomeNotes("");
                      setSaved(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </header>
            <div className="outcome-body">
              {result !== "Fechado" && <label>
                <span>
                  {result === "Não fechou"
                    ? "Motivo do não fechamento"
                    : "Situação da negociação"}
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(result === "Não fechou" ? [
                    "Entrada incompatível",
                    "Parcela acima da capacidade",
                    "Imóvel não atende ao perfil",
                    "Localização não atende",
                    "Família não concordou",
                    "Escolheu concorrente",
                    "Crédito deixou de ser viável",
                    "Desistência temporária",
                    "Perda de renda ou emprego",
                    "Outro motivo — detalhar na ficha",
                  ] : [
                    "Negociando valor da entrada",
                    "Negociando parcelas pré-chaves",
                    "Negociando parcelas pós-chaves",
                    "Aguardando escolha da unidade",
                    "Aguardando decisão familiar",
                    "Aguardando nova simulação CAIXA",
                    "Aguardando bônus da construtora",
                    "Aguardando visita ao imóvel",
                    "Comparando duas opções",
                    "Proposta enviada — aguardando retorno",
                  ]).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>}
              {result !== "Fechado" && <label className="outcome-notes">
                <span>Detalhes personalizados</span>
                <textarea
                  value={outcomeNotes}
                  onChange={(event) => setOutcomeNotes(event.target.value)}
                  placeholder={result === "Não fechou" ? "Registre a causa real, objeções e condição para retomada." : "Registre o ponto em negociação, responsável e condição para avançar."}
                />
              </label>}
              {result !== "Fechado" && <label>
                <span>Próxima ação obrigatória</span>
                <input type="datetime-local" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} />
              </label>}
              <label>
                <span>VGV previsto · após desconto</span>
                <input value={money.format(calc.netPropertyValue)} readOnly />
              </label>
              <button onClick={saveOutcome}>
                {saved
                  ? "Resultado registrado na jornada"
                  : result === "Fechado"
                    ? "Confirmar fechamento e enviar VGV"
                    : "Registrar resultado e próxima ação"}
              </button>
              {result === "Fechado" && (
                <aside className="vgv-transfer">
                  <i>→</i>
                  <span>
                    <b>Destino: Gestão financeira</b>
                    <small>
                      O VGV líquido confirmado será enviado para cálculo de
                      comissão e bônus.
                    </small>
                  </span>
                </aside>
              )}
              {feedback && <p className="outcome-feedback">{feedback}</p>}
            </div>
          </section>
        </div>
        {pdfPreview && (
          <div className="pdf-modal">
            <div className="pdf-toolbar">
              <button onClick={() => setPdfPreview(false)}>
                ← Voltar à proposta
              </button>
              <span>Prévia do documento · A4</span>
              <button onClick={() => window.print()}>
                Salvar / imprimir PDF
              </button>
            </div>
            <article className="proposal-document">
              <header>
                <Image
                  src="/monteiro-logo.png"
                  alt="Monteiro"
                  width={58}
                  height={64}
                />
                <div>
                  <span>PROPOSTA DE COMPRA</span>
                  <h1>{selectedProjectData?.name || "Empreendimento"}</h1>
                  <p>{unit ? `Unidade ${unit}` : "Unidade não informada"} · {selectedBuilderData?.name || "Construtora"}</p>
                </div>
                <aside>
                  <b>MONTEIRO CRM</b>
                  <span>09 de agosto de 2026</span>
                </aside>
              </header>
              <section className="pdf-parties">
                <div>
                  <span>1º PROPONENTE</span>
                  <b>{clientProfile.holder.name}</b>
                  <small>
                    {clientProfile.holder.cpf} · Renda{" "}
                    {money.format(clientProfile.holder.income)}
                  </small>
                </div>
                <div>
                  <span>2º PROPONENTE · CÔNJUGE</span>
                  <b>{clientProfile.spouse.name}</b>
                  <small>
                    {clientProfile.spouse.cpf} · Renda{" "}
                    {money.format(clientProfile.spouse.income)}
                  </small>
                </div>
              </section>
              <section className="pdf-values">
                <article>
                  <span>Valor do imóvel</span>
                  <b>{money.format(propertyValue)}</b>
                </article>
                <article>
                  <span>Financiamento CAIXA</span>
                  <b>{money.format(financing)}</b>
                </article>
                <article>
                  <span>Subsídio</span>
                  <b>{money.format(subsidy)}</b>
                </article>
                <article>
                  <span>Entrada negociada</span>
                  <b>{money.format(calc.entry)}</b>
                </article>
              </section>
              <section className="pdf-section">
                <h2>01 · COMPOSIÇÃO DA ENTRADA</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Composição</th>
                      <th>Quando</th>
                      <th>Valor total</th>
                      <th>Qtd.</th>
                      <th>Parcela</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sinal / ato</td>
                      <td>{signalTiming}</td>
                      <td>{money.format(signal)}</td>
                      <td>1</td>
                      <td>{money.format(signal)}</td>
                    </tr>
                    <tr>
                      <td>Parcelas mensais</td>
                      <td>{monthlyTiming}</td>
                      <td>{money.format(monthlyTotal)}</td>
                      <td>{monthlyQty}</td>
                      <td>{money.format(calc.monthlyEntry)}</td>
                    </tr>
                    {postKeyTotal > 0 && (
                      <tr>
                        <td>Parcelas pós-chaves</td>
                        <td>{postKeyTiming}</td>
                        <td>{money.format(postKeyTotal)}</td>
                        <td>{postKeyTerms}</td>
                        <td>
                          {money.format(
                            postKeyTotal / Math.max(1, postKeyTerms),
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
              <section className="pdf-section pdf-two">
                <div>
                  <h2>02 · FINANCIAMENTO</h2>
                  <p>
                    <b>{propertyMode}</b> · Sistema {system} · {term} meses
                  </p>
                  <p>
                    Parcela inicial CAIXA:{" "}
                    <strong>{money.format(caixaPayment)}</strong>
                  </p>
                  <p>
                    {propertyMode === "Imóvel novo"
                      ? "Sem cobrança de juros de obra."
                      : "Juros de obra variáveis conforme evolução da construção."}
                  </p>
                </div>
                <div>
                  <h2>03 · TAXAS</h2>
                  <p>
                    Antes das chaves:{" "}
                    <strong>{money.format(calc.beforeFeeTotal)}</strong>
                  </p>
                  <p>
                    Após as chaves:{" "}
                    <strong>{money.format(calc.afterFeeTotal)}</strong>
                  </p>
                  <p>Benefícios/bonificações aplicados conforme proposta.</p>
                </div>
              </section>
              <section className="pdf-summary">
                <span>RESUMO FINAL</span>
                <div>
                  <article>
                    <b>Antes de receber as chaves</b>
                    <p>Entrada e taxas conforme cronograma apresentado.</p>
                    <strong>
                      {money.format(calc.monthlyDuringWork)} mensais recorrentes
                    </strong>
                  </article>
                  <article>
                    <b>Após receber as chaves</b>
                    <p>Financiamento e valores pós-chaves temporários.</p>
                    <strong>
                      {money.format(
                        caixaPayment +
                          calc.feeMonthlyAfter +
                          postKeyTotal / Math.max(1, postKeyTerms),
                      )}
                    </strong>
                  </article>
                  <article>
                    <b>Após quitar entrada e taxas</b>
                    <p>Permanece somente o financiamento CAIXA.</p>
                    <strong>{money.format(caixaPayment)} por mês</strong>
                  </article>
                </div>
              </section>
              <footer>
                <div>
                  <span>FRANKLIN MONTEIRO</span>
                  <b>Corretor de Imóveis · CRECI 3812</b>
                  <small>(86) 99906-7923</small>
                </div>
                <p>
                  Valores sujeitos à conferência documental, análise da
                  instituição financeira e condições comerciais vigentes.
                </p>
              </footer>
            </article>
          </div>
        )}
        {pdfPreview && (
          <FullProposalPreview
            onClose={() => setPdfPreview(false)}
            data={{
              clientProfile,
              propertyValue,
              financing,
              subsidy,
              bonus,
              calc,
              signal,
              signalTiming,
              monthlyTotal,
              monthlyTiming,
              monthlyQty,
              intermediate1,
              inter1Timing,
              intermediate2,
              inter2Timing,
              intermediate3,
              inter3Timing,
              fgts,
              fgtsTiming,
              postKeyTotal,
              postKeyTiming,
              postKeyTerms,
              otherEntry,
              otherTiming,
              propertyMode,
              system,
              term,
              caixaPayment,
              itbi,
              itbiBonus,
              itbiTerms,
              itbiTiming,
              tac,
              tacBonus,
              tacTerms,
              tacTiming,
              tao,
              taoBonus,
              taoTerms,
              taoTiming,
              engineering,
              engineeringBonus,
              engineeringTerms,
              engineeringTiming,
              projectName: selectedProjectData?.name || "Empreendimento",
              builderName: selectedBuilderData?.name || "Construtora",
              unit,
            }}
          />
        )}
        {pdfPreview && !contractPreview && (
          <button
            className="contract-launch"
            onClick={() => setContractPreview(true)}
          >
            Elaborar contrato de intermediação
          </button>
        )}
        {contractPreview && (
          <ContractPreview
            onClose={() => setContractPreview(false)}
            data={{
              clientProfile,
              propertyMode,
              system,
              term,
              caixaPayment,
              propertyValue: calc.netPropertyValue,
              financing,
              subsidy,
              entry: calc.entry,
              projectName: selectedProjectData?.name || "empreendimento selecionado",
              unit,
            }}
          />
        )}
      </section>
    </main>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <CurrencyBox value={value} onChange={onChange} />
    </label>
  );
}

function CurrencyBox({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [display, setDisplay] = useState(formatNumber(value));
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDisplay(formatNumber(value));
  }
  return (
    <div className="money-input">
      <i>R$</i>
      <input
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const cents = Number(e.target.value.replace(/\D/g, ""));
          const next = cents / 100;
          setDisplay(formatNumber(next));
          onChange(next);
        }}
      />
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function NegotiationRow({
  name,
  timing,
  setTiming,
  total,
  setTotal,
  qty,
  setQty,
}: {
  name: string;
  timing: string;
  setTiming: (s: string) => void;
  total: number;
  setTotal: (n: number) => void;
  qty: number;
  setQty?: (n: number) => void;
}) {
  return (
    <article>
      <b>{name}</b>
      <select value={timing} onChange={(e) => setTiming(e.target.value)}>
        <option>Pré-chave</option>
        <option>Pós-chave</option>
        <option>Ambos</option>
      </select>
      <CurrencyBox value={total} onChange={setTotal} />
      <input
        className="qty-input"
        type="number"
        min="1"
        value={qty}
        disabled={!setQty}
        onChange={(e) => setQty?.(Math.max(1, +e.target.value))}
      />
      <strong>{money.format(total / Math.max(1, qty))}</strong>
      <input className="due-input" type="date" />
    </article>
  );
}

function ApplicantCard({
  clientId,
  order,
  name,
  cpf,
  birth,
  income,
  incomeType,
}: {
  clientId: number;
  order: string;
  name: string;
  cpf: string;
  birth: string;
  income: number;
  incomeType: string;
}) {
  return (
    <article>
      <i>{order.startsWith("1") ? "P1" : "P2"}</i>
      <div>
        <span>{order}</span>
        <b>{name}</b>
        <small>
          {cpf} · Nascimento: {birth}
        </small>
      </div>
      <aside>
        <span>Renda declarada</span>
        <b>{money.format(income)}</b>
        <small>{incomeType}</small>
      </aside>
      <Link className="qualification-link" href={clientId ? `/clientes?clientId=${clientId}` : "/carteira"}>Ver qualificação</Link>
    </article>
  );
}

function FeeRow({
  name,
  amount,
  setAmount,
  bonus,
  setBonus,
  terms,
  setTerms,
  timing,
  setTiming,
  deliveryMonths,
  fixedPre = false,
}: {
  name: string;
  amount: number;
  setAmount: (n: number) => void;
  bonus: boolean;
  setBonus: (b: boolean) => void;
  terms: number;
  setTerms: (n: number) => void;
  timing: string;
  setTiming: (s: string) => void;
  deliveryMonths: number;
  fixedPre?: boolean;
}) {
  const effectiveTiming = fixedPre ? "Antes das chaves" : timing,
    safeTerms = Math.max(1, terms),
    installment = amount / safeTerms,
    before =
      effectiveTiming === "Antes das chaves"
        ? safeTerms
        : effectiveTiming === "Após as chaves"
          ? 0
          : Math.min(deliveryMonths, safeTerms),
    after = safeTerms - before;
  return (
    <article className={bonus ? "bonused" : ""}>
      <div>
        <b>{name}</b>
        <small>
          {bonus
            ? `Cliente economiza ${money.format(amount)}`
            : `${safeTerms}x de ${money.format(installment)}`}
        </small>
      </div>
      <MoneyInput label="Valor" value={amount} onChange={setAmount} />
      <label>
        <span>Condição</span>
        <select
          value={bonus ? "Bônus" : "Cliente paga"}
          onChange={(e) => setBonus(e.target.value === "Bônus")}
        >
          <option>Cliente paga</option>
          <option>Bônus</option>
        </select>
      </label>
      <label>
        <span>Total parcelas</span>
        <select
          disabled={bonus}
          value={safeTerms}
          onChange={(e) => setTerms(+e.target.value)}
        >
          {[1, 12, 24, 36, 48, 60].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Momento do pagamento</span>
        <select
          disabled={bonus || fixedPre}
          value={effectiveTiming}
          onChange={(e) => setTiming(e.target.value)}
        >
          <option>Antes das chaves</option>
          {!fixedPre && (
            <>
              <option>Após as chaves</option>
              <option>Ambos</option>
            </>
          )}
        </select>
        <small>
          {fixedPre
            ? "Obrigatoriamente pré-chaves"
            : effectiveTiming === "Ambos"
              ? `${before} antes + ${after} após`
              : effectiveTiming}
        </small>
      </label>
    </article>
  );
}

function PaymentChart({
  system,
  payment,
}: {
  system: string;
  payment: number;
}) {
  const end = system === "SAC" ? payment * 0.52 : payment * 0.96;
  return (
    <div className="line-chart">
      <svg
        viewBox="0 0 420 125"
        role="img"
        aria-label={`Evolução das parcelas ${system}`}
      >
        <line x1="30" y1="10" x2="30" y2="102" />
        <line x1="30" y1="102" x2="405" y2="102" />
        <path
          d={
            system === "SAC"
              ? "M30 22 C125 38 235 65 405 91"
              : "M30 34 C145 36 275 40 405 43"
          }
        />
        <circle cx="30" cy={system === "SAC" ? 22 : 34} r="4" />
        <circle cx="405" cy={system === "SAC" ? 91 : 43} r="4" />
      </svg>
      <div>
        <span>
          <b>Primeira parcela</b>
          {money.format(payment)}
        </span>
        <span>
          <b>Última estimada</b>
          {money.format(end)}
        </span>
      </div>
    </div>
  );
}

function ConstructionChart({ payment }: { payment: number }) {
  return (
    <div className="line-chart construction-chart">
      <svg
        viewBox="0 0 420 125"
        role="img"
        aria-label="Evolução da obra e juros de obra"
      >
        <line x1="30" y1="10" x2="30" y2="102" />
        <line x1="30" y1="102" x2="405" y2="102" />
        <path
          className="progress-line"
          d="M30 98 C110 90 170 72 235 51 S345 22 405 15"
        />
        <path
          className="interest-line"
          d="M30 96 C125 88 190 69 260 49 S350 31 405 28"
        />
      </svg>
      <div>
        <span>
          <b>Início da obra</b>
          {money.format(payment * 0.1)}
        </span>
        <span>
          <b>Pico estimado</b>
          {money.format(payment * 0.78)}
        </span>
      </div>
      <footer>
        <i></i>Execução da obra <i></i>Juros de obra
      </footer>
    </div>
  );
}

function FullProposalPreview({
  data: d,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) {
  const holderLanguage = genderLanguage(d.clientProfile.holder.sex);
  const spouseLanguage = genderLanguage(d.clientProfile.spouse.sex);
  const entryRows = [
    ["Sinal / ato", d.signalTiming, d.signal, 1],
    ["Parcelas mensais", d.monthlyTiming, d.monthlyTotal, d.monthlyQty],
    ["Intercalada 01", d.inter1Timing, d.intermediate1, 1],
    ["Intercalada 02", d.inter2Timing, d.intermediate2, 1],
    ["Intercalada 03", d.inter3Timing, d.intermediate3, 1],
    ["FGTS na entrada", d.fgtsTiming, d.fgts, 1],
    ["Parcelas pós-chaves", d.postKeyTiming, d.postKeyTotal, d.postKeyTerms],
    ["Outros", d.otherTiming, d.otherEntry, 1],
  ] as [string, string, number, number][];
  const fees = [
    ["ITBI + Cartório", d.itbi, d.itbiBonus, d.itbiTerms, d.itbiTiming],
    ["TAC", d.tac, d.tacBonus, d.tacTerms, d.tacTiming],
    ...(d.propertyMode === "Aquisição e construção"
      ? [
          ["TAO", d.tao, d.taoBonus, d.taoTerms, d.taoTiming],
          [
            "Engenharia",
            d.engineering,
            d.engineeringBonus,
            d.engineeringTerms,
            d.engineeringTiming,
          ],
        ]
      : []),
  ] as [string, number, boolean, number, string][];
  const pdfTotalBonus =
    d.bonus +
    fees
      .filter(([, amount, isBonus]) => isBonus && amount > 0)
      .reduce((sum, [, amount]) => sum + amount, 0);
  if (pdfTotalBonus > 0)
    fees.push([
      "ECONOMIA TOTAL EM BÔNUS",
      pdfTotalBonus,
      true,
      1,
      "Resumo final",
    ]);
  return (
    <div className="pdf-modal full-pdf-modal">
      <div className="pdf-toolbar">
        <button onClick={onClose}>← Voltar à proposta</button>
        <span>Proposta completa · quatro etapas</span>
        <button onClick={() => window.print()}>Salvar / imprimir PDF</button>
      </div>
      <article className="proposal-document proposal-complete">
        <header>
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro"
            width={58}
            height={64}
          />
          <div>
            <span>PROPOSTA DE COMPRA</span>
            <h1>{d.projectName}</h1>
            <p>Unidade selecionada · {d.builderName}</p>
          </div>
          <aside>
            <b>MONTEIRO CRM</b>
            <span>09 de agosto de 2026</span>
          </aside>
        </header>
        <section className="pdf-parties">
          <div>
            <span>{holderLanguage.ordinal}</span>
            <b>{d.clientProfile.holder.name}</b>
            <small>
              {d.clientProfile.holder.cpf} · Renda{" "}
              {money.format(d.clientProfile.holder.income)}
            </small>
          </div>
          {hasConfirmedSpouse(d.clientProfile) && (
            <div>
              <span>{spouseLanguage.spouseOrdinal}</span>
              <b>{d.clientProfile.spouse.name}</b>
              <small>
                {d.clientProfile.spouse.cpf} · Renda{" "}
                {money.format(d.clientProfile.spouse.income)}
              </small>
            </div>
          )}
        </section>
        <section className="pdf-full-stage">
          <h2>ETAPA 01 · FINANCIAMENTO LIBERADO E NEGOCIAÇÃO DA ENTRADA</h2>
          <div className="pdf-values">
            <article>
              <span>Valor do imóvel</span>
              <b>{money.format(d.propertyValue)}</b>
            </article>
            <article>
              <span>Financiamento</span>
              <b>{money.format(d.financing)}</b>
            </article>
            <article>
              <span>Subsídio</span>
              <b>{money.format(d.subsidy)}</b>
            </article>
            <article>
              <span>Entrada a negociar</span>
              <b>{money.format(d.calc.entry)}</b>
            </article>
          </div>
          <p className="pdf-intro">
            A entrada corresponde ao valor do imóvel menos financiamento,
            subsídio e bônus concedidos.
          </p>
          <table>
            <thead>
              <tr>
                <th>Composição</th>
                <th>Quando paga</th>
                <th>Valor negociado</th>
                <th>Qtd.</th>
                <th>Valor da parcela</th>
              </tr>
            </thead>
            <tbody>
              {entryRows.map(([name, timing, total, qty]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{timing}</td>
                  <td>{money.format(total)}</td>
                  <td>{qty}</td>
                  <td>{money.format(total / Math.max(1, qty))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOTAL NEGOCIADO</td>
                <td>{money.format(d.calc.entry - d.calc.remaining)}</td>
                <td colSpan={2}>SALDO: {money.format(d.calc.remaining)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
        <section className="pdf-full-stage pdf-page-break">
          <h2>ETAPA 02 · MODALIDADE E CONDIÇÕES DO FINANCIAMENTO</h2>
          <div className="pdf-finance-grid">
            <article>
              <span>Modalidade</span>
              <b>{d.propertyMode}</b>
              <small>
                {d.propertyMode === "Imóvel novo"
                  ? "Não possui juros de obra."
                  : "Possui juros de obra durante a construção."}
              </small>
            </article>
            <article>
              <span>Tabela</span>
              <b>{d.system}</b>
              <small>
                {d.system === "PRICE"
                  ? "Parcela mais estável."
                  : "Parcela decrescente."}
              </small>
            </article>
            <article>
              <span>Prazo</span>
              <b>{d.term} meses</b>
              <small>Conforme aprovação CAIXA.</small>
            </article>
            <article>
              <span>Parcela inicial</span>
              <b>{money.format(d.caixaPayment)}</b>
              <small>Sujeita a seguros e atualização.</small>
            </article>
          </div>
          <div className="pdf-chart">
            <div>
              <b>EVOLUÇÃO DA PARCELA · {d.system}</b>
              <svg viewBox="0 0 420 95">
                <line x1="20" y1="80" x2="405" y2="80" />
                <path
                  d={
                    d.system === "SAC"
                      ? "M20 16 C130 34 250 57 405 73"
                      : "M20 35 C150 36 280 39 405 42"
                  }
                />
              </svg>
              <span>
                {money.format(d.caixaPayment)}{" "}
                <i>
                  {money.format(
                    d.system === "SAC"
                      ? d.caixaPayment * 0.52
                      : d.caixaPayment * 0.96,
                  )}
                </i>
              </span>
            </div>
            {d.propertyMode !== "Imóvel novo" && (
              <div>
                <b>OBRA EXECUTADA · JUROS DE OBRA</b>
                <svg viewBox="0 0 420 95">
                  <line x1="20" y1="80" x2="405" y2="80" />
                  <path d="M20 76 C115 69 185 55 255 36 S350 18 405 12" />
                </svg>
                <span>
                  10%: {money.format(d.caixaPayment * 0.1)}{" "}
                  <i>78%: {money.format(d.caixaPayment * 0.78)}</i>
                </span>
              </div>
            )}
          </div>
          <div className="pdf-protections">
            <article>
              <b>Seguro habitacional por morte ou invalidez</b>
              <p>
                Pode quitar o saldo do financiamento conforme a participação de
                renda do proponente e as condições da apólice.
              </p>
            </article>
            <article>
              <b>Proteção em dificuldade financeira</b>
              <p>
                Pausa Seguro-Desemprego de até 6 parcelas e Pausa Estendida de
                até 12, conforme contrato, adimplência, quota e análise da
                CAIXA.
              </p>
            </article>
          </div>
        </section>
        <section className="pdf-full-stage">
          <h2>ETAPA 03 · TAXAS E CONDIÇÕES COMERCIAIS</h2>
          <table>
            <thead>
              <tr>
                <th>Taxa</th>
                <th>Condição</th>
                <th>Valor</th>
                <th>Qtd.</th>
                <th>Parcela</th>
                <th>Quando paga</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(([name, amount, isBonus, terms, timing]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{isBonus ? "Bônus" : "Cliente paga"}</td>
                  <td>{money.format(amount)}</td>
                  <td>{isBonus ? "-" : terms}</td>
                  <td>
                    {isBonus
                      ? "R$ 0,00"
                      : money.format(amount / Math.max(1, terms))}
                  </td>
                  <td>{isBonus ? "Bonificado" : timing}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pdf-fee-totals">
            <span>
              Antes das chaves <b>{money.format(d.calc.beforeFeeTotal)}</b>
            </span>
            <span>
              Após as chaves <b>{money.format(d.calc.afterFeeTotal)}</b>
            </span>
            <span>
              Total do cliente <b>{money.format(d.calc.feeTotal)}</b>
            </span>
          </div>
        </section>
        <section className="pdf-full-stage pdf-final-summary">
          <h2>ETAPA 04 · RESUMO FINAL PARA O CLIENTE</h2>
          <div>
            <article>
              <span>01</span>
              <b>ANTES DE RECEBER AS CHAVES</b>
              <p>
                Sinal de {money.format(d.signal)}. Entrada mensal de{" "}
                {money.format(d.calc.monthlyEntry)} e taxas mensais de{" "}
                {money.format(d.calc.feeMonthlyBefore)}.
              </p>
              <strong>
                {money.format(d.calc.monthlyDuringWork)} recorrentes
              </strong>
              {d.propertyMode !== "Imóvel novo" && (
                <small>Adicionar juros de obra variáveis.</small>
              )}
            </article>
            <article>
              <span>02</span>
              <b>APÓS RECEBER AS CHAVES</b>
              <p>
                {d.postKeyTotal > 0
                  ? `${d.postKeyTerms}x de ${money.format(d.postKeyTotal / Math.max(1, d.postKeyTerms))} da entrada. `
                  : ""}
                CAIXA de {money.format(d.caixaPayment)} e taxas temporárias de{" "}
                {money.format(d.calc.feeMonthlyAfter)}.
              </p>
              <strong>
                {money.format(
                  d.caixaPayment +
                    d.calc.feeMonthlyAfter +
                    d.postKeyTotal / Math.max(1, d.postKeyTerms),
                )}
              </strong>
            </article>
            <article>
              <span>03</span>
              <b>APÓS QUITAR ENTRADA E TAXAS</b>
              <p>
                Encerrados os pagamentos temporários, permanece somente o
                financiamento bancário.
              </p>
              <strong>{money.format(d.caixaPayment)} por mês</strong>
            </article>
          </div>
        </section>
        <footer className="dynamic-signatures">
          <Signature
            name="Franklin Monteiro da Silva Júnior"
            detail="CORRETOR DE IMÓVEIS · CRECI-PI 3812 · CPF 052.092.083-03"
          />
          <Signature
            name={d.clientProfile.holder.name}
            detail={`${holderLanguage.buyer} · CPF ${d.clientProfile.holder.cpf}`}
          />
          {hasConfirmedSpouse(d.clientProfile) && (
            <Signature
              name={d.clientProfile.spouse.name}
              detail={`${spouseLanguage.spouseOrdinal} · CPF ${d.clientProfile.spouse.cpf}`}
            />
          )}
          <p>
            Valores sujeitos à análise documental, condições comerciais e regras
            da instituição financeira.
          </p>
        </footer>
      </article>
    </div>
  );
}

function ContractPreview({
  data: d,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) {
  const holderLanguage = genderLanguage(d.clientProfile.holder.sex);
  const spouseLanguage = genderLanguage(d.clientProfile.spouse.sex);
  return (
    <div className="pdf-modal contract-modal">
      <div className="pdf-toolbar">
        <button onClick={onClose}>← Voltar à ficha-proposta</button>
        <span>Instrumento de intermediação · minuta para conferência</span>
        <button onClick={() => window.print()}>
          Salvar / imprimir contrato
        </button>
      </div>
      <article className="contract-document">
        <header>
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro"
            width={76}
            height={84}
          />
          <div>
            <span>MONTEIRO · CORRETOR DE IMÓVEIS</span>
            <h1>
              Instrumento de Intermediação Imobiliária e Registro de Proposta
            </h1>
            <p>
              Documento de transparência entre corretor e parte proponente
              compradora
            </p>
          </div>
        </header>
        <section className="contract-parties">
          <h2>1. IDENTIFICAÇÃO DAS PARTES</h2>
          <p>
            <b>CORRETOR/INTERMEDIADOR:</b> FRANKLIN MONTEIRO DA SILVA JÚNIOR,
            brasileiro, solteiro, 33 anos, corretor de imóveis, inscrito no
            CRECI-PI sob nº 3812 e CPF nº 052.092.083-03, residente na Rua
            Manaus, nº 3801, Vale Quem Tem, Teresina-PI, CEP 64057-550,
            doravante denominado <b>CORRETOR</b>.
          </p>
          <p>
            <b>{holderLanguage.buyer}:</b> {d.clientProfile.holder.name}, CPF{" "}
            {d.clientProfile.holder.cpf}, data de nascimento{" "}
            {d.clientProfile.holder.birth}, demais dados pessoais e endereço
            constantes da ficha de qualificação anexa, doravante{" "}
            {holderLanguage.referred} <b>{holderLanguage.buyer}</b>.
          </p>
          {hasConfirmedSpouse(d.clientProfile) && (
            <p>
              <b>{spouseLanguage.spouseOrdinal}:</b>{" "}
              {d.clientProfile.spouse.name}, CPF {d.clientProfile.spouse.cpf},
              data de nascimento {d.clientProfile.spouse.birth}, qualificação
              confirmada pela certidão de casamento aprovada, que participa da
              proposta e assume, quando aplicável, as mesmas declarações e
              deveres {holderLanguage.buyerOf}.
            </p>
          )}
        </section>
        <section>
          <h2>2. OBJETO E NATUREZA DA INTERMEDIAÇÃO</h2>
          <p>
            O presente instrumento registra a atuação do CORRETOR na
            aproximação, orientação e intermediação entre os PROPONENTES
            COMPRADORES e a construtora/incorporadora responsável pelo
            empreendimento {d.projectName}, unidade inicialmente
            indicada como Bloco B, Unidade 204.
          </p>
          <p>
            O CORRETOR não é proprietário, vendedor, incorporador, construtor,
            correspondente bancário nem financiador do imóvel. A compra e venda
            definitiva dependerá da aceitação formal da construtora,
            disponibilidade da unidade, aprovação documental e de crédito,
            assinatura dos instrumentos próprios e cumprimento das condições
            neles estabelecidas.
          </p>
        </section>
        <section>
          <h2>3. CONDIÇÕES ECONÔMICAS REGISTRADAS</h2>
          <div className="contract-values">
            <span>
              Valor atual do imóvel <b>{money.format(d.propertyValue)}</b>
            </span>
            <span>
              Financiamento estimado <b>{money.format(d.financing)}</b>
            </span>
            <span>
              Subsídio estimado <b>{money.format(d.subsidy)}</b>
            </span>
            <span>
              Entrada estimada <b>{money.format(d.entry)}</b>
            </span>
          </div>
          <p>
            Modalidade {d.propertyMode}, sistema {d.system}, prazo estimado de{" "}
            {d.term} meses e parcela inicial estimada em{" "}
            {money.format(d.caixaPayment)}. Os valores são projeções da data da
            proposta e podem variar por atualização de tabela, avaliação do
            imóvel, análise da CAIXA, seguros, taxas e condições comerciais da
            construtora.
          </p>
        </section>
        <section>
          <h2>4. DEVERES DO CORRETOR</h2>
          <ol>
            <li>
              Atuar com diligência, prudência, boa-fé e clareza, mantendo os
              proponentes informados sobre o andamento da negociação.
            </li>
            <li>
              Apresentar informações conhecidas sobre o empreendimento,
              condições comerciais, documentação e etapas do financiamento, sem
              ocultar riscos ou custos relevantes.
            </li>
            <li>
              Encaminhar proposta e documentos somente aos agentes necessários à
              negociação, observando confidencialidade e proteção de dados.
            </li>
            <li>
              Não prometer aprovação bancária, subsídio, prazo de entrega,
              disponibilidade definitiva ou condição não confirmada por escrito
              pela parte responsável.
            </li>
          </ol>
        </section>
        <section>
          <h2>5. DEVERES DOS PROPONENTES</h2>
          <ol>
            <li>
              Fornecer informações e documentos verdadeiros, completos e
              atualizados.
            </li>
            <li>
              Ler e conferir simulações, proposta, quadro financeiro e
              instrumentos da construtora antes de assinar ou pagar.
            </li>
            <li>
              Não realizar pagamento ao CORRETOR sem documento específico que
              identifique finalidade, valor e recibo. Valores de imóvel, entrada
              e taxas deverão seguir as instruções formais da construtora ou
              instituição responsável.
            </li>
            <li>
              Comunicar imediatamente qualquer mudança de renda, estado civil,
              restrição, financiamento ou condição que afete a operação.
            </li>
          </ol>
        </section>
        <section className="contract-highlight">
          <h2>6. DISPONIBILIDADE DA UNIDADE E ALTERAÇÃO DA NEGOCIAÇÃO</h2>
          <p>
            A unidade inicialmente escolhida não fica reservada apenas por este
            instrumento. Caso não esteja mais disponível antes da formalização
            com a construtora, os PROPONENTES poderão escolher outra unidade
            disponível. A substituição poderá alterar preço, entrada, parcelas,
            bônus, taxas, avaliação, financiamento e demais condições.
          </p>
          <p>
            Se não concordarem com as novas condições, os PROPONENTES poderão
            não prosseguir com a unidade substituta e solicitar a apresentação
            de outro empreendimento compatível, sem obrigação de aceitar
            alternativa inadequada. Eventuais valores já pagos diretamente à
            construtora seguirão as regras do documento de reserva ou contrato
            firmado com ela.
          </p>
        </section>
        <section>
          <h2>7. APROVAÇÃO DE CRÉDITO E CONTRATO DEFINITIVO</h2>
          <p>
            Simulações e análises preliminares não garantem contratação. A
            decisão final de crédito, subsídio, prazo, sistema, seguros e valor
            da prestação pertence à instituição financeira. O contrato
            definitivo de aquisição será celebrado diretamente entre os
            PROPONENTES e a proprietária/construtora, prevalecendo sobre esta
            minuta quanto à compra e venda.
          </p>
        </section>
        <section>
          <h2>8. REMUNERAÇÃO E AUSÊNCIA DE COBRANÇA OCULTA</h2>
          <p>
            A remuneração da corretagem seguirá o ajuste existente com a
            construtora ou parceiro comercial. Nenhuma cobrança direta aos
            PROPONENTES será criada por este instrumento. Qualquer remuneração
            adicional exigirá documento separado, informação prévia, valor
            determinado e concordância expressa.
          </p>
        </section>
        <section>
          <h2>9. DESISTÊNCIA, BOA-FÉ E SOLUÇÃO DE DIVERGÊNCIAS</h2>
          <p>
            Até a assinatura de instrumento vinculante com a construtora, a
            desistência será tratada conforme os documentos efetivamente
            firmados, sem criação de multa oculta neste instrumento. As partes
            buscarão solução transparente e documentada. Permanecem preservados
            os direitos previstos na legislação aplicável e o foro legalmente
            competente, inclusive o domicílio do consumidor quando cabível.
          </p>
        </section>
        <section>
          <h2>10. CIÊNCIA E ASSINATURAS</h2>
          <p>
            As partes declaram que receberam explicações, puderam formular
            perguntas e compreenderam que este instrumento registra a
            intermediação e a proposta, sem substituir o contrato definitivo da
            construtora e do financiamento.
          </p>
          <div className="contract-signatures">
            <Signature
              name="Franklin Monteiro da Silva Júnior"
              detail="CORRETOR · CRECI-PI 3812 · CPF 052.092.083-03"
            />
            <Signature
              name={d.clientProfile.holder.name}
              detail={`${holderLanguage.buyer} · CPF ${d.clientProfile.holder.cpf}`}
            />
            {hasConfirmedSpouse(d.clientProfile) && (
              <Signature
                name={d.clientProfile.spouse.name}
                detail={`${spouseLanguage.spouseOrdinal} · CPF ${d.clientProfile.spouse.cpf}`}
              />
            )}
          </div>
          <p className="contract-date">
            Teresina-PI, ____ de __________________ de ______.
          </p>
        </section>
        <footer>
          Minuta operacional sujeita à conferência dos dados completos e
          recomendada para revisão jurídica antes do uso definitivo.
        </footer>
      </article>
    </div>
  );
}

function Signature({ name, detail }: { name: string; detail: string }) {
  return (
    <div>
      <i></i>
      <b>{name}</b>
      <span>{detail}</span>
    </div>
  );
}
