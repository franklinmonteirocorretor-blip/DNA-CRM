"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteClientDocument, uploadClientDocument } from "@/lib/upload-client-document";

type DocumentItem = {
  id: number;
  document_type: string;
  file_name: string;
  url: string | null;
};

type StageRule = {
  question: string;
  options: string[];
  advances: string[];
  document?: string;
  documentRequiredFor?: string[];
  needsBank?: boolean;
};

const rules: Record<string, StageRule> = {
  "Contrato com a construtora": {
    question: "O contrato com a construtora foi assinado?",
    options: ["Sim", "Não", "Aguardando assinatura"],
    advances: ["Sim"],
    document: "Contrato com a construtora",
  },
  "Sinal / ATO": {
    question: "O pagamento do Sinal / ATO foi confirmado?",
    options: ["Sim", "Não", "Pagamento parcial", "Aguardando pagamento"],
    advances: ["Sim"],
    document: "Comprovante de pagamento do Sinal / ATO",
  },
  "Entrevista CAIXA": {
    question: "Qual foi o resultado da entrevista com o gerente CAIXA?",
    options: [
      "Aprovado",
      "Não aprovado",
      "Reagendar com o mesmo gerente",
      "Encaminhar para outro gerente",
    ],
    advances: ["Aprovado"],
    needsBank: true,
  },
  "Laudo de engenharia": {
    question: "Qual é a situação do laudo de engenharia?",
    options: ["Laudo aprovado", "Com pendências", "Aguardando vistoria", "Não se aplica"],
    advances: ["Laudo aprovado", "Não se aplica"],
    document: "Laudo do engenheiro CAIXA",
  },
  "Conformidade CAIXA": {
    question: "A conformidade documental foi aprovada?",
    options: ["Sim", "Não", "Com pendências", "Em análise"],
    advances: ["Sim"],
    document: "Formulários de conformidade",
  },
  "Contrato CAIXA": {
    question: "O contrato com a CAIXA foi assinado?",
    options: ["Sim", "Não", "Assinatura reagendada"],
    advances: ["Sim"],
    document: "Contrato CAIXA",
  },
  "Preparação da entrega": {
    question: "A entrega humanizada está preparada?",
    options: ["Sim", "Não", "Preparação em andamento"],
    advances: ["Sim"],
  },
  "Vistoria técnica particular": {
    question: "Qual foi o resultado da vistoria realizada pelo engenheiro particular?",
    options: [
      "Concluída sem falhas",
      "Concluída com reparos necessários",
      "Agendada",
      "Não realizada",
    ],
    advances: ["Concluída sem falhas", "Concluída com reparos necessários"],
    document: "Laudo da vistoria técnica particular",
    documentRequiredFor: ["Concluída sem falhas", "Concluída com reparos necessários"],
  },
  "Validação dos reparos": {
    question: "Os reparos indicados na vistoria particular foram executados pela construtora?",
    options: [
      "Sim, todos validados",
      "Parcialmente executados",
      "Não executados",
      "Não se aplica — vistoria sem falhas",
      "Nova vistoria agendada",
    ],
    advances: ["Sim, todos validados", "Não se aplica — vistoria sem falhas"],
    document: "Validação dos reparos executados",
    documentRequiredFor: ["Sim, todos validados"],
  },
  "Vistoria e chaves": {
    question: "A vistoria e a entrega das chaves foram concluídas?",
    options: ["Sim", "Não", "Vistoria com pendências", "Reagendada"],
    advances: ["Sim"],
    document: "Laudo de vistoria / pendências",
  },
  "Evento e depoimento": {
    question: "O evento de entrega e o depoimento foram realizados?",
    options: ["Sim", "Não", "Evento agendado", "Cliente não autorizou imagem"],
    advances: ["Sim", "Cliente não autorizou imagem"],
    document: "Termo de consentimento de imagem",
  },
  "Indicações e suporte": {
    question: "O ciclo inicial de indicações e suporte foi concluído?",
    options: ["Sim", "Não", "Em acompanhamento"],
    advances: ["Sim"],
  },
};

export default function PostSaleStagePanel({
  clientId,
  stage,
  stages,
  onSaved,
}: {
  clientId?: number;
  stage: string;
  stages: string[];
  onSaved: () => void | Promise<void>;
}) {
  const rule = rules[stage] || rules[stages[0]];
  const [result, setResult] = useState(rule.options[0]);
  const [notes, setNotes] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [manager, setManager] = useState("");
  const [agency, setAgency] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const documentType = rule.document ? `Pós-venda | ${rule.document}` : "";
  const attached = useMemo(
    () => documents.find((document) => document.document_type === documentType),
    [documents, documentType],
  );

  const loadDocuments = async () => {
    if (!clientId) return setDocuments([]);
    const response = await fetch(`/api/documents?clientId=${clientId}`, { cache: "no-store" });
    const data = await response.json().catch(() => []);
    if (response.ok) setDocuments(data);
  };

  useEffect(() => {
    setResult(rule.options[0]);
    setNotes("");
    setStartsAt("");
    setManager("");
    setAgency("");
    setFiles([]);
    setStatus("");
    void loadDocuments();
  }, [clientId, stage]);

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    setStatus("");
    let uploaded = attached;
    if (rule.document && files.length) {
      try {
        const uploadData = await uploadClientDocument({ clientId, documentType, files });
        await loadDocuments();
        uploaded = { id: 0, document_type: documentType, file_name: uploadData.fileName, url: uploadData.url };
      } catch (error) {
        setSaving(false);
        setStatus(error instanceof Error ? error.message : "Falha ao anexar o documento.");
        return;
      }
    }
    const advances = rule.advances.includes(result);
    const requiresDocument = Boolean(
      rule.document &&
        (!rule.documentRequiredFor || rule.documentRequiredFor.includes(result)),
    );
    if (advances && requiresDocument && !uploaded) {
      setSaving(false);
      setStatus("Anexe o documento obrigatório antes de concluir esta etapa.");
      return;
    }
    const response = await fetch("/api/post-sale/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "stageDecision",
        clientId,
        stage,
        result,
        notes,
        startsAt: startsAt || null,
        manager,
        agency,
        advance: advances,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setStatus(data.error || "Falha ao registrar a etapa.");
      return;
    }
    setStatus(advances ? "Etapa concluída. Próxima etapa liberada." : "Resultado salvo. Etapa mantida para nova tentativa.");
    setFiles([]);
    await onSaved();
  };

  const removeAttachment = async () => {
    if (!clientId || !documentType || !confirm("Excluir este anexo?")) return;
    setSaving(true);
    setStatus("");
    try {
      await deleteClientDocument(clientId, documentType);
      await loadDocuments();
      setFiles([]);
      setStatus("Anexo excluído. Você pode enviar uma nova versão.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao excluir o anexo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stage-panel">
      <header>
        <div>
          <span>Registro da etapa ativa</span>
          <h3>{stage}</h3>
        </div>
        <strong>{stages.indexOf(stage) + 1}/{stages.length}</strong>
      </header>
      <div className="stage-panel-grid">
        <label className="wide">
          <span>{rule.question}</span>
          <select value={result} onChange={(event) => setResult(event.target.value)}>
            {rule.options.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        {rule.needsBank && (
          <>
            <label><span>Gerente responsável</span><input value={manager} onChange={(event) => setManager(event.target.value)} placeholder="Nome do gerente" /></label>
            <label><span>Agência</span><input value={agency} onChange={(event) => setAgency(event.target.value)} placeholder="Número ou identificação" /></label>
          </>
        )}
        <label><span>Data e horário</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
        <label className="wide"><span>Observação</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Resultado, pendências, orientação recebida e próximo contato" /></label>
        {rule.document && (
          <label className={`stage-upload wide ${attached ? "attached" : ""}`}>
            <span>{rule.document}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            <b>{files.length ? `${files.length} arquivo(s) selecionado(s)` : attached ? attached.file_name : "Selecionar PDF ou fotos"}</b>
            {attached?.url && (
              <span className="stage-upload-actions">
                <a href={attached.url} target="_blank" rel="noreferrer">Visualizar anexo</a>
                <button type="button" onClick={(event) => { event.preventDefault(); void removeAttachment(); }}>Excluir anexo</button>
              </span>
            )}
          </label>
        )}
      </div>
      <footer>
        <small>{rule.advances.includes(result) ? "Ao salvar, a próxima etapa será liberada." : "O registro será salvo sem avançar a jornada."}</small>
        <button onClick={save} disabled={saving || !clientId}>{saving ? "Salvando..." : "Salvar registro da etapa"}</button>
      </footer>
      {status && <p className="stage-panel-status">{status}</p>}
    </section>
  );
}
