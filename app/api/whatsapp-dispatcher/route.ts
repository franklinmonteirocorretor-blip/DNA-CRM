import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";
import { loadAgentControl } from "@/lib/agent/store";
import { normalizePhoneE164 } from "@/lib/agent/whatsapp/identity-resolver";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildDryRun, validateDispatchConfig } from "@/lib/whatsapp-dispatcher/engine";
import type { ConfirmedTemplateData, DispatchTemplate, DryRunCandidate, TemplateSelectionMode } from "@/lib/whatsapp-dispatcher/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UiConfig = {
  name?: unknown; source?: unknown; baseId?: unknown; projectId?: unknown; approachId?: unknown;
  templateIds?: unknown; distributionMode?: unknown; templateWeights?: unknown; mediaType?: unknown;
  batchSize?: unknown; messageIntervalMin?: unknown; messageIntervalMax?: unknown;
  batchPauseMinutes?: unknown; hourlyLimit?: unknown; dailyLimit?: unknown; cadenceId?: unknown;
  allowedStartTime?: unknown; allowedEndTime?: unknown; stopOnReply?: unknown; dryRun?: unknown;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sources = new Set(["DAILY_WALLET", "OWN_DATABASE", "DNA", "INDICATION", "MANUAL_LIST", "PROJECT_LIST", "REACTIVATION", "CUSTOM"]);
const modes = new Set(["ROUND_ROBIN", "RANDOM", "WEIGHTED"]);

function testClientAllowlist() {
  const raw = process.env.WHATSAPP_DISPATCH_TEST_CLIENT_IDS || "";
  const ids = raw.split(",").map((value) => Number(value.trim())).filter((value) => Number.isSafeInteger(value) && value > 0);
  return [...new Set(ids)];
}

function optionalId(value: unknown) {
  if (value === "" || value == null) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador numérico inválido.");
  return id;
}

function normalizeConfig(input: UiConfig) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const source = String(input.source || "");
  const approachId = String(input.approachId || "");
  const cadenceId = String(input.cadenceId || "");
  const templateIds = Array.isArray(input.templateIds) ? [...new Set(input.templateIds.map(String))] : [];
  const distributionMode = String(input.distributionMode || "") as TemplateSelectionMode;
  if (!name || name.length > 160) throw new Error("Nome da campanha inválido.");
  if (!sources.has(source)) throw new Error("Origem da campanha inválida.");
  if (!uuid.test(approachId) || !uuid.test(cadenceId)) throw new Error("Abordagem e cadência são obrigatórias.");
  if (!templateIds.length || templateIds.some((id) => !uuid.test(id))) throw new Error("Selecione modelos válidos.");
  if (!modes.has(distributionMode)) throw new Error("Distribuição de modelos inválida.");
  const weightsInput = input.templateWeights && typeof input.templateWeights === "object" ? input.templateWeights as Record<string, unknown> : {};
  const weights = Object.fromEntries(templateIds.map((id) => [id, Number(weightsInput[id] || (distributionMode === "WEIGHTED" ? 0 : 100))]));
  if (distributionMode === "WEIGHTED" && Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 100) > 0.001) throw new Error("Pesos devem somar 100%.");
  const domain = validateDispatchConfig({
    batchSize: Number(input.batchSize),
    messageIntervalSeconds: { min: Number(input.messageIntervalMin), max: Number(input.messageIntervalMax) },
    batchPauseSeconds: Number(input.batchPauseMinutes) * 60,
    hourlyLimit: Number(input.hourlyLimit), dailyLimit: Number(input.dailyLimit), campaignLimit: null,
    allowedStartTime: String(input.allowedStartTime || ""), allowedEndTime: String(input.allowedEndTime || ""),
    allowedWeekdays: [1, 2, 3, 4, 5], timeZone: "America/Sao_Paulo",
    stopOnReply: input.stopOnReply === true, dryRun: input.dryRun !== false,
  });
  if (!domain.valid) throw new Error(domain.errors.join(" "));
  return { name, source, approachId, cadenceId, templateIds, distributionMode, weights, baseId: optionalId(input.baseId), projectId: optionalId(input.projectId), domain: domain.value };
}

async function health() {
  const db = supabaseAdmin();
  const testSessionId = process.env.WHATSAPP_DISPATCH_TEST_SESSION_ID?.trim();
  const sessionQuery = db.from("whatsapp_sessions").select("id,status,heartbeat_at");
  const { data: session } = testSessionId
    ? await sessionQuery.eq("id", testSessionId).maybeSingle()
    : await sessionQuery.eq("id", "00000000-0000-0000-0000-000000000000").maybeSingle();
  const heartbeat = session?.heartbeat_at ? Date.parse(session.heartbeat_at) : 0;
  const allowlist = testClientAllowlist();
  let workerRunning = false;
  if (process.env.WHATSAPP_GATEWAY_URL && process.env.WHATSAPP_GATEWAY_SECRET) {
    try {
      const response = await fetch(`${process.env.WHATSAPP_GATEWAY_URL.replace(/\/$/, "")}/health`, {
        headers: { authorization: `Bearer ${process.env.WHATSAPP_GATEWAY_SECRET}` }, cache: "no-store",
      });
      const payload = await response.json() as { dispatcher?: { enabled?: boolean; running?: boolean } };
      workerRunning = response.ok && payload.dispatcher?.enabled === true && payload.dispatcher?.running === true;
    } catch { workerRunning = false; }
  }
  const realStartEnabled = process.env.WHATSAPP_DISPATCH_REAL_START_ENABLED === "true";
  return {
    gatewayConfigured: Boolean(process.env.WHATSAPP_GATEWAY_URL && process.env.WHATSAPP_GATEWAY_SECRET),
    sessionConnected: session?.status === "connected" && Date.now() - heartbeat < 180_000,
    outboundReal: process.env.WHATSAPP_REAL_OUTBOUND_ENABLED === "true",
    testAllowlistConfigured: allowlist.length > 0,
    testAllowlistCount: allowlist.length,
    testSessionConfigured: Boolean(testSessionId),
    workerRunning,
    realStartEnabled,
    realStartBlocked: !(realStartEnabled && workerRunning),
    sessionId: session?.id as string | undefined,
  };
}

async function loadLibrary() {
  const db = supabaseAdmin();
  const [approaches, templates, versions, cadences, bases, projects, campaigns] = await Promise.all([
    db.from("whatsapp_approaches").select("id,name,objective,project_id,base_id,cadence_id,active").eq("active", true).order("name"),
    db.from("whatsapp_templates").select("id,approach_id,name,active").eq("active", true).order("name"),
    db.from("whatsapp_template_versions").select("template_id,version,body,media_id,media_version,active").eq("active", true).order("version", { ascending: false }),
    db.from("whatsapp_cadences").select("id,name,active").eq("active", true).order("name"),
    db.from("lead_imports").select("id,file_name,origin_type,created_at").order("created_at", { ascending: false }),
    db.from("projects").select("id,name,city,active").eq("active", true).order("name"),
    db.from("whatsapp_campaigns").select("id,name,status,dry_run,source,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const error = approaches.error || templates.error || versions.error || cadences.error || bases.error || projects.error || campaigns.error;
  if (error) throw error;
  const latest = new Map<string, (typeof versions.data)[number]>();
  for (const version of versions.data || []) if (!latest.has(String(version.template_id))) latest.set(String(version.template_id), version);
  return {
    approaches: approaches.data || [], cadences: cadences.data || [], bases: (bases.data || []).map((row) => ({ id: row.id, name: row.file_name })), projects: projects.data || [], campaigns: campaigns.data || [],
    templates: (templates.data || []).map((row) => ({ ...row, ...latest.get(String(row.id)) })),
  };
}

async function candidateRows(config: ReturnType<typeof normalizeConfig>) {
  const db = supabaseAdmin();
  let ids: number[] | null = null;
  if (config.source === "DAILY_WALLET") {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const { data, error } = await db.from("daily_portfolios").select("client_id").eq("assigned_date", today);
    if (error) throw error;
    ids = (data || []).map((row) => Number(row.client_id));
  } else if (config.baseId) {
    const { data: base, error: baseError } = await db.from("lead_imports").select("file_name").eq("id", config.baseId).single();
    if (baseError) throw baseError;
    const { data, error } = await db.from("client_sources").select("client_id").eq("source_file", base.file_name);
    if (error) throw error;
    ids = [...new Set((data || []).map((row) => Number(row.client_id)))];
  }
  if (!config.domain.dryRun) {
    const allowlist = testClientAllowlist();
    if (!allowlist.length) throw new Error("Campanha real exige WHATSAPP_DISPATCH_TEST_CLIENT_IDS explícita.");
    ids = ids ? ids.filter((id) => allowlist.includes(id)) : allowlist;
  }
  if (ids && !ids.length) return [];
  let query = db.from("clients").select("id,name,phone,can_contact,do_not_contact,opt_out_at,project_interest,data_quality").limit(10_000);
  if (ids) query = query.in("id", ids);
  if (config.projectId) {
    const { data: project, error } = await db.from("projects").select("name").eq("id", config.projectId).single();
    if (error) throw error;
    query = query.eq("project_interest", project.name);
  }
  const { data, error } = await query.order("id");
  if (error) throw error;
  return data || [];
}

async function loadCampaignRuntime(campaignId?: string) {
  if (!campaignId) return null;
  const db = supabaseAdmin();
  const statuses = ["QUEUED", "WAITING", "SENDING_MEDIA", "SENDING_TEXT", "SENT", "FAILED", "SKIPPED", "CANCELLED", "REPLIED"] as const;
  const [counts, next] = await Promise.all([
    Promise.all(statuses.map(async (status) => {
      const { count, error } = await db.from("whatsapp_campaign_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", status);
      if (error) throw error;
      return [status, count || 0] as const;
    })),
    db.from("whatsapp_campaign_queue").select("scheduled_for").eq("campaign_id", campaignId).in("status", ["QUEUED", "WAITING"]).order("scheduled_for").limit(1).maybeSingle(),
  ]);
  if (next.error) throw next.error;
  return { campaignId, counts: Object.fromEntries(counts), nextSendAt: next.data?.scheduled_for || null };
}

async function makePreview(config: ReturnType<typeof normalizeConfig>, campaignId = randomUUID()) {
  const db = supabaseAdmin();
  const [rows, control, runtime, library, stepResult] = await Promise.all([
    candidateRows(config), loadAgentControl(), health(), loadLibrary(),
    db.from("whatsapp_cadence_steps").select("id,step_key").eq("cadence_id", config.cadenceId).eq("active", true).order("step_order").limit(1).single(),
  ]);
  if (stepResult.error) throw stepResult.error;
  const selected = library.templates.filter((template) => config.templateIds.includes(String(template.id)) && typeof template.body === "string");
  if (selected.length !== config.templateIds.length) throw new Error("Modelo ativo ou versão não encontrado.");
  if (selected.some((template) => String(template.approach_id) !== config.approachId)) throw new Error("Modelo não pertence à abordagem selecionada.");
  const baseName = config.baseId ? library.bases.find((item) => Number(item.id) === config.baseId)?.name : null;
  const projectName = config.projectId ? library.projects.find((item) => Number(item.id) === config.projectId)?.name : null;
  const candidates: DryRunCandidate[] = rows.map((client) => {
    const phone = normalizePhoneE164(client.phone);
    const placeholders: ConfirmedTemplateData = {
      nome: { value: client.name, confirmed: Boolean(client.name) },
      primeiro_nome: { value: String(client.name || "").trim().split(/\s+/)[0] || null, confirmed: Boolean(client.name) },
      empreendimento: { value: projectName || client.project_interest || null, confirmed: Boolean(projectName || client.project_interest) },
      corretor: { value: "Franklin Monteiro", confirmed: true },
      base: { value: baseName || null, confirmed: Boolean(baseName) },
    };
    return {
      clientId: Number(client.id), clientName: String(client.name), cadenceStep: stepResult.data.step_key, placeholders,
      phoneE164: phone, canContact: client.can_contact === true, doNotContact: client.do_not_contact === true,
      optedOutAt: client.opt_out_at, hasReplied: false, alreadySent: false, identityResolved: Boolean(phone),
      sessionHealthy: config.domain.dryRun ? true : runtime.sessionConnected,
      killSwitch: config.domain.dryRun ? false : control.killSwitch,
      outboundKillSwitch: config.domain.dryRun ? false : control.outboundKillSwitch,
      stopOnReply: config.domain.stopOnReply, matchesBase: true, matchesProject: true,
    };
  });
  const templates: DispatchTemplate[] = selected.map((item) => ({ id: String(item.id), version: Number(item.version), body: String(item.body), weight: config.weights[String(item.id)], active: true }));
  return buildDryRun({ campaignId, config: config.domain, templates, selectionMode: config.distributionMode, candidates, startAt: new Date(), seed: campaignId });
}

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const [library, runtime] = await Promise.all([loadLibrary(), health()]);
    const active = library.campaigns.find((campaign) => ["READY", "RUNNING", "PAUSED"].includes(campaign.status));
    const campaignRuntime = await loadCampaignRuntime(active?.id ? String(active.id) : undefined);
    return NextResponse.json({ ...library, health: runtime, campaignRuntime, state: active?.status || (runtime.sessionConnected ? "READY" : "OFF") });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar disparador." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body = await request.json() as { action?: string; campaignId?: unknown; config?: UiConfig };
    if (body.action === "preview") {
      const config = normalizeConfig(body.config || {});
      return NextResponse.json({ preview: await makePreview(config) });
    }
    if (body.action === "create") {
      const config = normalizeConfig(body.config || {});
      const db = supabaseAdmin();
      const runtime = await health();
      const preview = await makePreview(config);
      if (!config.domain.dryRun && (preview.eligible < 1 || preview.eligible > 5)) throw new Error("Campanha real exige 1–5 contatos de teste elegíveis.");
      const testIds = config.domain.dryRun ? [] : preview.rows.filter((row) => row.eligible).map((row) => row.clientId);
      const { data: campaign, error } = await db.from("whatsapp_campaigns").insert({
        name: config.name, source: config.source, base_id: config.baseId, project_id: config.projectId,
        approach_id: config.approachId, cadence_id: config.cadenceId, session_id: runtime.sessionId || null,
        status: "OFF", distribution_strategy: config.distributionMode, batch_size: config.domain.batchSize,
        message_interval_min_seconds: config.domain.messageIntervalSeconds.min, message_interval_max_seconds: config.domain.messageIntervalSeconds.max,
        batch_pause_seconds: config.domain.batchPauseSeconds, hourly_limit: config.domain.hourlyLimit, daily_limit: config.domain.dailyLimit,
        allowed_start_time: config.domain.allowedStartTime, allowed_end_time: config.domain.allowedEndTime, timezone: config.domain.timeZone,
        stop_on_reply: config.domain.stopOnReply, dry_run: config.domain.dryRun,
        test_only: !config.domain.dryRun, test_client_ids: testIds,
        campaign_limit: config.domain.dryRun ? null : testIds.length,
      }).select("id,name,status,dry_run,source,created_at").single();
      if (error) throw error;
      const library = await loadLibrary();
      const chosen = library.templates.filter((item) => config.templateIds.includes(String(item.id)));
      const links = chosen.map((item, index) => ({ campaign_id: campaign.id, template_id: item.id, template_version: item.version, position: index + 1, weight: config.weights[String(item.id)] }));
      const { error: linkError } = await db.from("whatsapp_campaign_templates").insert(links);
      if (linkError) { await db.from("whatsapp_campaigns").delete().eq("id", campaign.id); throw linkError; }
      if (!config.domain.dryRun) {
        const { data: step, error: stepError } = await db.from("whatsapp_cadence_steps")
          .select("id").eq("cadence_id", config.cadenceId).eq("active", true).order("step_order").limit(1).single();
        if (stepError) { await db.from("whatsapp_campaigns").delete().eq("id", campaign.id); throw stepError; }
        const items = preview.rows.filter((row) => row.eligible && row.templateId && row.renderedText && row.estimatedAt).map((row) => ({
          clientId: row.clientId, cadenceStepId: step.id, templateId: row.templateId,
          templateVersion: row.templateVersion, mediaId: row.media?.id || null,
          mediaVersion: row.media?.version || null, selectionOrder: row.order,
          scheduledFor: row.estimatedAt, renderedBody: row.renderedText,
        }));
        const { error: materializeError } = await db.rpc("materialize_whatsapp_campaign_real", { p_campaign_id: campaign.id, p_items: items });
        if (materializeError) { await db.from("whatsapp_campaigns").delete().eq("id", campaign.id); throw materializeError; }
      }
      const { data: activated, error: activateError } = await db.rpc("transition_whatsapp_campaign", {
        p_campaign_id: campaign.id, p_action: "ACTIVATE", p_reason: null,
      });
      if (activateError) { await db.from("whatsapp_campaigns").delete().eq("id", campaign.id); throw activateError; }
      return NextResponse.json({ campaign: { ...campaign, status: activated?.status || "READY" } }, { status: 201 });
    }
    if (["start", "pause", "resume", "stop"].includes(String(body.action))) {
      const campaignId = String(body.campaignId || "");
      if (!uuid.test(campaignId)) return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
      const db = supabaseAdmin();
      const { data: current, error: readError } = await db.from("whatsapp_campaigns").select("id,dry_run,test_only,session_id").eq("id", campaignId).single();
      if (readError) throw readError;
      const runtime = await health();
      if (body.action === "start" && !current.dry_run && (
        !current.test_only || current.session_id !== runtime.sessionId || !runtime.gatewayConfigured
        || !runtime.sessionConnected || !runtime.outboundReal || !runtime.testAllowlistConfigured
        || !runtime.realStartEnabled || !runtime.workerRunning
      )) return NextResponse.json({ error: "Execução real bloqueada: gates da conta teste incompletos." }, { status: 409 });
      const action = body.action === "start" ? "START" : String(body.action).toUpperCase();
      const { data, error } = await db.rpc("transition_whatsapp_campaign", { p_campaign_id: campaignId, p_action: action, p_reason: body.action === "stop" ? "Parada pelo operador" : null });
      if (error) throw error;
      return NextResponse.json({ campaign: data });
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no disparador." }, { status: 500 }); }
}
