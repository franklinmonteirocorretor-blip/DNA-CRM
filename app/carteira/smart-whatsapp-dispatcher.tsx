"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./smart-whatsapp-dispatcher.css";

type DispatcherState =
  | "OFF"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "PAUSED_SYSTEM"
  | "COMPLETED"
  | "STOPPED"
  | "ERROR";

type Entity = {
  id: string | number;
  name?: string;
  title?: string;
  projectId?: string | number | null;
  project_id?: string | number | null;
  approachId?: string | number | null;
  approach_id?: string | number | null;
};

type Campaign = Entity & {
  status?: DispatcherState;
  dryRun?: boolean;
  dry_run?: boolean;
};

type DispatcherSnapshot = {
  state: DispatcherState;
  health: {
    gatewayConfigured: boolean;
    sessionConnected: boolean;
    outboundReal: boolean;
    workerRunning: boolean;
    testAllowlistConfigured: boolean;
    testAllowlistCount: number;
    realStartEnabled: boolean;
    realStartBlocked: boolean;
  };
  campaignRuntime?: { counts: Record<string, number>; nextSendAt: string | null } | null;
  campaigns: Campaign[];
  approaches: Entity[];
  templates: Entity[];
  cadences: Entity[];
  bases: Entity[];
  projects: Entity[];
};

type PreviewRow = Record<string, unknown>;
type Preview = {
  summary: Record<string, unknown>;
  rows: PreviewRow[];
};

type CampaignConfig = {
  name: string;
  source: string;
  baseId: string;
  projectId: string;
  approachId: string;
  templateIds: string[];
  distributionMode: "ROUND_ROBIN" | "RANDOM" | "WEIGHTED";
  templateWeights: Record<string, number>;
  mediaType: "NONE" | "IMAGE" | "VIDEO" | "DOCUMENT";
  batchSize: number;
  messageIntervalMin: number;
  messageIntervalMax: number;
  batchPauseMinutes: number;
  hourlyLimit: number;
  dailyLimit: number;
  cadenceId: string;
  allowedStartTime: string;
  allowedEndTime: string;
  stopOnReply: boolean;
  dryRun: boolean;
};

const INITIAL_CONFIG: CampaignConfig = {
  name: "",
  source: "DAILY_WALLET",
  baseId: "",
  projectId: "",
  approachId: "",
  templateIds: [],
  distributionMode: "ROUND_ROBIN",
  templateWeights: {},
  mediaType: "NONE",
  batchSize: 3,
  messageIntervalMin: 45,
  messageIntervalMax: 90,
  batchPauseMinutes: 5,
  hourlyLimit: 20,
  dailyLimit: 80,
  cadenceId: "",
  allowedStartTime: "09:00",
  allowedEndTime: "18:00",
  stopOnReply: true,
  dryRun: true,
};

const SOURCES = [
  "DAILY_WALLET",
  "OWN_DATABASE",
  "DNA",
  "INDICATION",
  "MANUAL_LIST",
  "PROJECT_LIST",
  "REACTIVATION",
  "CUSTOM",
];

function entityName(entity: Entity) {
  return entity.name || entity.title || `Registro ${entity.id}`;
}

function field(row: PreviewRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "—";
}

async function readResponse(response: Response) {
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Falha na operação (${response.status}).`,
    );
  }
  return body;
}

function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function SmartWhatsAppDispatcher() {
  const [snapshot, setSnapshot] = useState<DispatcherSnapshot | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [config, setConfig] = useState<CampaignConfig>(INITIAL_CONFIG);
  const [configuredOpen, setConfiguredOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/whatsapp-dispatcher", {
      cache: "no-store",
    });
    const data = (await readResponse(
      response,
    )) as unknown as DispatcherSnapshot;
    setSnapshot(data);
    const live = data.campaigns?.find((campaign) =>
      ["READY", "RUNNING", "PAUSED"].includes(campaign.status || ""),
    );
    setCurrentCampaign(
      (current) =>
        live ||
        data.campaigns?.find((campaign) => campaign.id === current?.id) ||
        data.campaigns?.[0] ||
        null,
    );
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/whatsapp-dispatcher", { cache: "no-store" })
      .then(readResponse)
      .then((data) => {
        if (!active) return;
        const loaded = data as unknown as DispatcherSnapshot;
        setSnapshot(loaded);
        setCurrentCampaign(
          loaded.campaigns?.find((campaign) =>
            ["READY", "RUNNING", "PAUSED"].includes(campaign.status || ""),
          ) ||
            loaded.campaigns?.[0] ||
            null,
        );
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Falha ao consultar o disparador.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!snapshot || !["READY", "RUNNING", "PAUSED", "PAUSED_SYSTEM"].includes(snapshot.state)) return;
    const timer = setInterval(() => void refresh().catch(() => undefined), 5_000);
    return () => clearInterval(timer);
  }, [refresh, snapshot]);

  const selectedProject = config.projectId;
  const approaches = useMemo(
    () =>
      (snapshot?.approaches || []).filter((approach) => {
        const projectId = approach.projectId ?? approach.project_id;
        return (
          !projectId ||
          !selectedProject ||
          String(projectId) === selectedProject
        );
      }),
    [snapshot?.approaches, selectedProject],
  );
  const templates = useMemo(
    () =>
      (snapshot?.templates || []).filter((template) => {
        const approachId = template.approachId ?? template.approach_id;
        return (
          !approachId ||
          !config.approachId ||
          String(approachId) === config.approachId
        );
      }),
    [snapshot?.templates, config.approachId],
  );

  const campaignState = currentCampaign?.status || snapshot?.state;
  const currentDryRun = Boolean(
    currentCampaign?.dryRun ?? currentCampaign?.dry_run ?? config.dryRun,
  );
  const canStart = Boolean(currentCampaign && campaignState === "READY" && (
    currentDryRun || (
      snapshot?.health.gatewayConfigured &&
      snapshot.health.sessionConnected &&
      snapshot.health.outboundReal &&
      snapshot.health.workerRunning &&
      snapshot.health.testAllowlistConfigured &&
      snapshot.health.realStartEnabled &&
      !snapshot.health.realStartBlocked
    )
  ));

  const updateConfig = <K extends keyof CampaignConfig>(
    key: K,
    value: CampaignConfig[K],
  ) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setNotice("");
  };

  const validateConfig = () => {
    if (!config.name.trim()) return "Informe o nome da campanha.";
    if (!config.approachId) return "Selecione uma abordagem.";
    if (!config.templateIds.length) return "Selecione pelo menos um modelo.";
    if (config.messageIntervalMax < config.messageIntervalMin) {
      return "Intervalo máximo deve ser maior ou igual ao mínimo.";
    }
    if (config.allowedEndTime <= config.allowedStartTime) {
      return "Horário final deve ser posterior ao inicial.";
    }
    if (
      config.distributionMode === "WEIGHTED" &&
      config.templateIds.reduce(
        (sum, id) => sum + Number(config.templateWeights[id] || 0),
        0,
      ) !== 100
    ) {
      return "Pesos dos modelos devem somar 100%.";
    }
    return "";
  };

  const post = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/whatsapp-dispatcher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return readResponse(response);
  };

  const previewCampaign = async () => {
    const validationError = validateConfig();
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending("preview");
    setError("");
    setNotice("");
    try {
      const data = await post({ action: "preview", config });
      setPreview(data.preview as Preview);
      setNotice("Dry Run concluído. Nenhuma mensagem enviada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha no Dry Run.");
    } finally {
      setPending(null);
    }
  };

  const createCampaign = async () => {
    const validationError = validateConfig();
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending("create");
    setError("");
    setNotice("");
    try {
      const data = await post({ action: "create", config });
      setCurrentCampaign(data.campaign as Campaign);
      await refresh();
      setNotice("Campanha preparada. Revise o status antes de ativar.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Falha ao preparar campanha.",
      );
    } finally {
      setPending(null);
    }
  };

  const lifecycle = async (action: "start" | "pause" | "resume" | "stop") => {
    if (!currentCampaign) return;
    setPending(action);
    setError("");
    setNotice("");
    try {
      const data = await post({ action, campaignId: currentCampaign.id });
      setCurrentCampaign(data.campaign as Campaign);
      await refresh();
      const messages = {
        start: currentDryRun
          ? "Dry Run ativado. Nenhuma mensagem será enviada."
          : "Campanha ativada pelo motor protegido.",
        pause: "Campanha pausada. Fila preservada.",
        resume: "Campanha retomada do próximo item elegível.",
        stop: "Campanha parada. Itens pendentes serão cancelados.",
      };
      setNotice(messages[action]);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Falha ao alterar campanha.",
      );
    } finally {
      setPending(null);
    }
  };

  const toggleTemplate = (id: string) => {
    setConfig((current) => {
      const selected = current.templateIds.includes(id);
      return {
        ...current,
        templateIds: selected
          ? current.templateIds.filter((item) => item !== id)
          : [...current.templateIds, id],
        templateWeights: selected
          ? Object.fromEntries(
              Object.entries(current.templateWeights).filter(
                ([key]) => key !== id,
              ),
            )
          : { ...current.templateWeights, [id]: 0 },
      };
    });
    setPreview(null);
  };

  const summaryEntries = preview
    ? Object.entries(preview.summary || {}).filter(
        ([, value]) => typeof value === "number" || typeof value === "string",
      )
    : [];

  return (
    <section className="swd-shell" aria-labelledby="swd-title">
      <header className="swd-head">
        <div>
          <span>Prospecção integrada ao CRM</span>
          <h2 id="swd-title">Disparador WhatsApp</h2>
          <p>Campanhas, cadência e eventos. CRM permanece fonte de verdade.</p>
        </div>
        <div className="swd-state-group">
          <small>Status factual</small>
          <strong
            className={`swd-state swd-state-${campaignState || "unknown"}`}
          >
            {loading ? "CARREGANDO" : campaignState || "INDETERMINADO"}
          </strong>
        </div>
      </header>

      {snapshot ? (
        <div className="swd-health" aria-label="Saúde do disparador">
          <span className={snapshot.health.gatewayConfigured ? "ok" : "bad"}>
            Gateway{" "}
            {snapshot.health.gatewayConfigured ? "configurado" : "indisponível"}
          </span>
          <span className={snapshot.health.sessionConnected ? "ok" : "bad"}>
            Sessão{" "}
            {snapshot.health.sessionConnected ? "conectada" : "desconectada"}
          </span>
          <span className={snapshot.health.outboundReal ? "warn" : "neutral"}>
            Outbound real {snapshot.health.outboundReal ? "ON" : "OFF"}
          </span>
          <span className={snapshot.health.workerRunning ? "ok" : "bad"}>
            Worker {snapshot.health.workerRunning ? "ativo" : "inativo"}
          </span>
          <span className={snapshot.health.testAllowlistConfigured ? "ok" : "bad"}>
            Allowlist teste: {snapshot.health.testAllowlistCount || 0}
          </span>
          <span className={currentDryRun ? "neutral" : "warn"}>
            Dry Run {currentDryRun ? "ON" : "OFF"}
          </span>
        </div>
      ) : null}

      {snapshot?.campaignRuntime ? (
        <div className="swd-health" aria-label="Runtime da campanha">
          {Object.entries(snapshot.campaignRuntime.counts).map(([status, count]) => (
            <span key={status} className={status === "FAILED" ? "bad" : "neutral"}>{status}: {count}</span>
          ))}
          <span className="neutral">Próximo envio: {snapshot.campaignRuntime.nextSendAt ? new Date(snapshot.campaignRuntime.nextSendAt).toLocaleString("pt-BR") : "—"}</span>
        </div>
      ) : null}

      <div className="swd-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setConfiguredOpen((open) => !open)}
          disabled={loading || Boolean(pending)}
        >
          {configuredOpen ? "Fechar configuração" : "Configurar"}
        </button>
        <button
          type="button"
          onClick={() => lifecycle("start")}
          disabled={!canStart || Boolean(pending)}
        >
          {pending === "start" ? "Ativando..." : "Ativar"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => lifecycle("pause")}
          disabled={campaignState !== "RUNNING" || Boolean(pending)}
        >
          {pending === "pause" ? "Pausando..." : "Pausar"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => lifecycle("resume")}
          disabled={!['PAUSED', 'PAUSED_SYSTEM'].includes(campaignState || '') || Boolean(pending)}
        >
          {pending === "resume" ? "Retomando..." : "Retomar"}
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => lifecycle("stop")}
          disabled={
            !["READY", "RUNNING", "PAUSED", "PAUSED_SYSTEM"].includes(campaignState || "") ||
            Boolean(pending)
          }
        >
          {pending === "stop" ? "Parando..." : "Parar"}
        </button>
      </div>

      {error ? (
        <p className="swd-feedback error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="swd-feedback success" role="status">
          {notice}
        </p>
      ) : null}

      {configuredOpen ? (
        <div className="swd-config">
          <div className="swd-fields">
            <label>
              Campanha
              <input
                value={config.name}
                onChange={(event) => updateConfig("name", event.target.value)}
                placeholder="Ex.: Carteira DNA — agosto"
              />
            </label>
            <label>
              Origem
              <select
                value={config.source}
                onChange={(event) => updateConfig("source", event.target.value)}
              >
                {SOURCES.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <label>
              Base
              <select
                value={config.baseId}
                onChange={(event) => updateConfig("baseId", event.target.value)}
              >
                <option value="">Carteira do Dia</option>
                {(snapshot?.bases || []).map((base) => (
                  <option key={base.id} value={String(base.id)}>
                    {entityName(base)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Empreendimento
              <select
                value={config.projectId}
                onChange={(event) => {
                  updateConfig("projectId", event.target.value);
                  updateConfig("approachId", "");
                  updateConfig("templateIds", []);
                }}
              >
                <option value="">Todos / não definido</option>
                {(snapshot?.projects || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {entityName(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Abordagem
              <select
                value={config.approachId}
                onChange={(event) => {
                  updateConfig("approachId", event.target.value);
                  updateConfig("templateIds", []);
                }}
              >
                <option value="">Selecione</option>
                {approaches.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {entityName(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cadência
              <select
                value={config.cadenceId}
                onChange={(event) =>
                  updateConfig("cadenceId", event.target.value)
                }
              >
                <option value="" disabled>Selecione a cadência</option>
                {(snapshot?.cadences || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {entityName(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Distribuição dos modelos
              <select
                value={config.distributionMode}
                onChange={(event) =>
                  updateConfig(
                    "distributionMode",
                    event.target.value as CampaignConfig["distributionMode"],
                  )
                }
              >
                <option value="ROUND_ROBIN">Round robin</option>
                <option value="RANDOM">Aleatória</option>
                <option value="WEIGHTED">Por peso</option>
              </select>
            </label>
            <label>
              Mídia
              <select
                value={config.mediaType}
                onChange={(event) =>
                  updateConfig(
                    "mediaType",
                    event.target.value as CampaignConfig["mediaType"],
                  )
                }
              >
                <option value="NONE">Sem mídia</option>
                <option value="IMAGE">Imagem</option>
                <option value="VIDEO">Vídeo</option>
                <option value="DOCUMENT">Documento</option>
              </select>
            </label>
            <NumberField
              label="Contatos por lote"
              min={1}
              value={config.batchSize}
              onChange={(value) => updateConfig("batchSize", value)}
            />
            <NumberField
              label="Intervalo mínimo (s)"
              min={1}
              value={config.messageIntervalMin}
              onChange={(value) => updateConfig("messageIntervalMin", value)}
            />
            <NumberField
              label="Intervalo máximo (s)"
              min={1}
              value={config.messageIntervalMax}
              onChange={(value) => updateConfig("messageIntervalMax", value)}
            />
            <NumberField
              label="Pausa entre lotes (min)"
              min={0}
              value={config.batchPauseMinutes}
              onChange={(value) => updateConfig("batchPauseMinutes", value)}
            />
            <NumberField
              label="Limite por hora"
              min={1}
              value={config.hourlyLimit}
              onChange={(value) => updateConfig("hourlyLimit", value)}
            />
            <NumberField
              label="Limite diário"
              min={1}
              value={config.dailyLimit}
              onChange={(value) => updateConfig("dailyLimit", value)}
            />
            <label>
              Horário inicial
              <input
                type="time"
                value={config.allowedStartTime}
                onChange={(event) =>
                  updateConfig("allowedStartTime", event.target.value)
                }
              />
            </label>
            <label>
              Horário final
              <input
                type="time"
                value={config.allowedEndTime}
                onChange={(event) =>
                  updateConfig("allowedEndTime", event.target.value)
                }
              />
            </label>
          </div>

          <fieldset className="swd-templates">
            <legend>Modelos da campanha</legend>
            {templates.length ? (
              templates.map((template) => {
                const id = String(template.id);
                const checked = config.templateIds.includes(id);
                return (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTemplate(id)}
                    />
                    <span>{entityName(template)}</span>
                    {config.distributionMode === "WEIGHTED" && checked ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`Peso de ${entityName(template)}`}
                        value={config.templateWeights[id] || 0}
                        onChange={(event) =>
                          updateConfig("templateWeights", {
                            ...config.templateWeights,
                            [id]: Number(event.target.value),
                          })
                        }
                      />
                    ) : null}
                  </label>
                );
              })
            ) : (
              <p>Nenhum modelo disponível para a abordagem selecionada.</p>
            )}
          </fieldset>

          <div className="swd-switches">
            <label>
              <input
                type="checkbox"
                checked={config.stopOnReply}
                onChange={(event) =>
                  updateConfig("stopOnReply", event.target.checked)
                }
              />
              Stop on reply
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.dryRun}
                onChange={(event) =>
                  updateConfig("dryRun", event.target.checked)
                }
              />
              Dry Run — nenhum envio
            </label>
          </div>

          <div className="swd-config-actions">
            <button
              type="button"
              className="secondary"
              onClick={previewCampaign}
              disabled={Boolean(pending)}
            >
              {pending === "preview" ? "Calculando..." : "Gerar Dry Run"}
            </button>
            <button
              type="button"
              onClick={createCampaign}
              disabled={Boolean(pending)}
            >
              {pending === "create" ? "Preparando..." : "Preparar campanha"}
            </button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <section className="swd-preview" aria-labelledby="swd-preview-title">
          <header>
            <div>
              <span>Sem envio</span>
              <h3 id="swd-preview-title">Preview Dry Run</h3>
            </div>
            <small>{preview.rows?.length || 0} itens calculados</small>
          </header>
          {summaryEntries.length ? (
            <div className="swd-summary">
              {summaryEntries.map(([key, value]) => (
                <div key={key}>
                  <span>{key.replaceAll("_", " ")}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <div className="swd-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Cliente</th>
                  <th>Modelo</th>
                  <th>Mídia</th>
                  <th>Cadência</th>
                  <th>Horário estimado</th>
                  <th>Motivo do skip</th>
                </tr>
              </thead>
              <tbody>
                {(preview.rows || []).map((row, index) => (
                  <tr key={field(row, "id", "queueId", "queue_id") + index}>
                    <td>{field(row, "order", "position")}</td>
                    <td>{field(row, "client", "clientName", "client_name")}</td>
                    <td>
                      {field(row, "template", "templateName", "template_name")}
                    </td>
                    <td>{field(row, "media", "mediaType", "media_type")}</td>
                    <td>
                      {field(row, "cadence", "cadenceStep", "cadence_step")}
                    </td>
                    <td>{field(row, "estimatedAt", "estimated_at")}</td>
                    <td>{field(row, "skipReason", "skip_reason")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
