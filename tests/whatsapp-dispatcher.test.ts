import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDryRun,
  buildIdempotencyKey,
  evaluateEligibility,
  renderConfirmedTemplate,
  scheduleDispatchSlots,
  selectCampaignTemplate,
  validateDispatchConfig,
} from "../lib/whatsapp-dispatcher/engine.ts";
import type {
  DispatchConfig,
  DispatchTemplate,
  DryRunCandidate,
} from "../lib/whatsapp-dispatcher/types.ts";

const config: DispatchConfig = {
  batchSize: 2,
  messageIntervalSeconds: { min: 10, max: 10 },
  batchPauseSeconds: 60,
  hourlyLimit: 20,
  dailyLimit: 80,
  campaignLimit: 100,
  allowedStartTime: "08:00",
  allowedEndTime: "18:00",
  allowedWeekdays: [1, 2, 3, 4, 5],
  timeZone: "UTC",
  stopOnReply: true,
  dryRun: true,
};

const templates: DispatchTemplate[] = [
  { id: "a", version: "a-v1", body: "Olá, {{primeiro_nome}}", weight: 30 },
  { id: "b", version: "b-v1", body: "Oi, {{primeiro_nome}}", weight: 30 },
  { id: "c", version: "c-v1", body: "Bom dia, {{primeiro_nome}}", weight: 20 },
  { id: "d", version: "d-v1", body: "Tudo bem, {{primeiro_nome}}?", weight: 20 },
];

test("valida configuração sem valores operacionais hardcoded", () => {
  assert.equal(validateDispatchConfig(config).valid, true);
  const invalid = validateDispatchConfig({
    ...config,
    batchSize: 0,
    allowedEndTime: "07:00",
    allowedWeekdays: [1, 1],
    unknown: true,
  });
  assert.equal(invalid.valid, false);
  if (!invalid.valid) {
    assert.match(invalid.errors.join(" "), /batchSize/);
    assert.match(invalid.errors.join(" "), /Janela/);
    assert.match(invalid.errors.join(" "), /allowedWeekdays/);
    assert.match(invalid.errors.join(" "), /Campo desconhecido/);
  }
});

test("renderiza somente placeholders confirmados", () => {
  const missing = renderConfirmedTemplate(
    "Olá {{primeiro_nome}}, conheça {{empreendimento}} com {{corretor}}. {{email}}",
    {
      primeiro_nome: { value: "Ana", confirmed: true },
      empreendimento: { value: "Parque Ville", confirmed: false },
      corretor: { value: "Franklin", confirmed: true },
    },
  );
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, ["empreendimento", "email"]);
  assert.equal(missing.text.includes("Parque Ville"), false);
  assert.match(missing.text, /{{empreendimento}}/);

  const rendered = renderConfirmedTemplate("Olá {{nome}}", {
    nome: { value: "Ana Silva", confirmed: true },
  });
  assert.deepEqual(rendered, { ok: true, text: "Olá Ana Silva", missing: [] });
});

test("seleciona round robin, random seeded e weighted determinístico", () => {
  const roundRobin = Array.from({ length: 5 }, (_, position) =>
    selectCampaignTemplate({ templates, mode: "ROUND_ROBIN", position, seed: "campaign-1" }).id,
  );
  assert.deepEqual(roundRobin, ["a", "b", "c", "d", "a"]);

  const randomA = Array.from({ length: 12 }, (_, position) =>
    selectCampaignTemplate({ templates, mode: "RANDOM", position, seed: "campaign-1" }).id,
  );
  const randomB = Array.from({ length: 12 }, (_, position) =>
    selectCampaignTemplate({ templates, mode: "RANDOM", position, seed: "campaign-1" }).id,
  );
  assert.deepEqual(randomA, randomB);

  const weighted = Array.from({ length: 10 }, (_, position) =>
    selectCampaignTemplate({ templates, mode: "WEIGHTED", position, seed: "campaign-1" }).id,
  );
  const counts = Object.fromEntries(templates.map((template) => [
    template.id,
    weighted.filter((id) => id === template.id).length,
  ]));
  assert.deepEqual(Object.values(counts).sort(), [2, 2, 3, 3]);
});

test("expõe todas as razões de inelegibilidade sem enviar", () => {
  const result = evaluateEligibility({
    phoneE164: null,
    canContact: false,
    doNotContact: true,
    optedOutAt: "2026-08-22T10:00:00Z",
    hasReplied: true,
    alreadySent: true,
    identityResolved: false,
    sessionHealthy: false,
    killSwitch: true,
    outboundKillSwitch: true,
    stopOnReply: true,
    matchesBase: false,
    matchesProject: false,
  });
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, [
    "KILL_SWITCH",
    "OUTBOUND_KILL_SWITCH",
    "SESSION_UNHEALTHY",
    "MISSING_PHONE",
    "CONTACT_NOT_ALLOWED",
    "DO_NOT_CONTACT",
    "OPT_OUT",
    "IDENTITY_UNRESOLVED",
    "STOP_ON_REPLY",
    "ALREADY_SENT",
    "BASE_FILTER_MISMATCH",
    "PROJECT_FILTER_MISMATCH",
  ]);
});

test("agenda intervalo, pausa de lote, janela, limite horário e diário", () => {
  const basic = scheduleDispatchSlots({
    count: 4,
    config,
    startAt: "2026-08-24T08:00:00Z",
    seed: "campaign-1",
  });
  assert.deepEqual(basic, [
    "2026-08-24T08:00:00.000Z",
    "2026-08-24T08:00:10.000Z",
    "2026-08-24T08:01:10.000Z",
    "2026-08-24T08:01:20.000Z",
  ]);

  const limited = scheduleDispatchSlots({
    count: 3,
    config: { ...config, batchSize: 10, hourlyLimit: 2, dailyLimit: 2 },
    startAt: "2026-08-24T17:59:55Z",
    seed: "campaign-1",
  });
  assert.deepEqual(limited, [
    "2026-08-24T17:59:55.000Z",
    "2026-08-25T08:00:00.000Z",
    "2026-08-25T08:00:10.000Z",
  ]);

  const weekend = scheduleDispatchSlots({
    count: 1,
    config,
    startAt: "2026-08-22T10:00:00Z",
    seed: "campaign-1",
  });
  assert.deepEqual(weekend, ["2026-08-24T08:00:00.000Z"]);
});

test("idempotência muda somente quando dimensão canônica muda", () => {
  const base = {
    campaignId: "campaign-1",
    clientId: 4423,
    cadenceStep: "D0",
    templateId: "template-a",
    templateVersion: "template-a-v1",
    mediaVersion: "media-v1",
  };
  assert.equal(buildIdempotencyKey(base), buildIdempotencyKey({ ...base }));
  assert.notEqual(buildIdempotencyKey(base), buildIdempotencyKey({ ...base, cadenceStep: "D1" }));
  assert.notEqual(buildIdempotencyKey(base), buildIdempotencyKey({ ...base, templateId: "template-b" }));
  assert.notEqual(buildIdempotencyKey(base), buildIdempotencyKey({ ...base, mediaVersion: "media-v2" }));
});

test("dry run produz preview, skips e horários sem side effects", () => {
  const eligible = candidate({ clientId: 1, clientName: "Ana" });
  const blocked = candidate({ clientId: 2, clientName: "Bia", doNotContact: true });
  const unconfirmed = candidate({
    clientId: 3,
    clientName: "Caio",
    placeholders: { primeiro_nome: { value: "Caio", confirmed: false } },
  });
  const result = buildDryRun({
    campaignId: "campaign-1",
    config,
    templates: [templates[0]],
    selectionMode: "ROUND_ROBIN",
    candidates: [eligible, blocked, unconfirmed],
    startAt: "2026-08-24T08:00:00Z",
    seed: "campaign-1",
    media: { id: "media-1", version: "media-v1", type: "IMAGE", sequence: "MEDIA_THEN_TEXT" },
  });
  assert.equal(result.total, 3);
  assert.equal(result.eligible, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.rows[0].estimatedAt, "2026-08-24T08:00:00.000Z");
  assert.match(result.rows[0].idempotencyKey ?? "", /^whatsapp-dispatch:/);
  assert.deepEqual(result.rows[1].skipReasons, ["DO_NOT_CONTACT"]);
  assert.deepEqual(result.rows[2].skipReasons, ["UNCONFIRMED_PLACEHOLDER"]);
  assert.equal(result.rows[1].estimatedAt, null);
  assert.deepEqual(result.skipCounts, { DO_NOT_CONTACT: 1, UNCONFIRMED_PLACEHOLDER: 1 });
});

function candidate(overrides: Partial<DryRunCandidate>): DryRunCandidate {
  const clientName = overrides.clientName ?? "Cliente";
  return {
    clientId: overrides.clientId ?? 1,
    clientName,
    cadenceStep: "D0",
    placeholders: { primeiro_nome: { value: clientName, confirmed: true } },
    phoneE164: "+5586999999999",
    canContact: true,
    doNotContact: false,
    optedOutAt: null,
    hasReplied: false,
    alreadySent: false,
    identityResolved: true,
    sessionHealthy: true,
    killSwitch: false,
    outboundKillSwitch: false,
    stopOnReply: true,
    matchesBase: true,
    matchesProject: true,
    ...overrides,
  };
}
