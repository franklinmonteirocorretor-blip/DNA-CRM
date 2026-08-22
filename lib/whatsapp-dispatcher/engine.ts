import {
  DISPATCH_PLACEHOLDERS,
  type BuildDryRunInput,
  type ConfirmedTemplateData,
  type DispatchConfig,
  type DispatchConfigValidation,
  type DispatchTemplate,
  type DryRunResult,
  type DryRunRow,
  type EligibilityInput,
  type EligibilityResult,
  type EligibilitySkipReason,
  type TemplateSelectionMode,
} from "./types.ts";

const PLACEHOLDER_SET = new Set<string>(DISPATCH_PLACEHOLDERS);
const DAY_MS = 86_400_000;

export function validateDispatchConfig(input: unknown): DispatchConfigValidation {
  if (!isRecord(input)) return { valid: false, errors: ["Configuração deve ser um objeto."] };

  const errors: string[] = [];
  const allowedKeys = new Set([
    "batchSize",
    "messageIntervalSeconds",
    "batchPauseSeconds",
    "hourlyLimit",
    "dailyLimit",
    "campaignLimit",
    "allowedStartTime",
    "allowedEndTime",
    "allowedWeekdays",
    "timeZone",
    "stopOnReply",
    "dryRun",
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) errors.push(`Campo desconhecido: ${key}.`);
  }

  const positiveIntegers = ["batchSize", "hourlyLimit", "dailyLimit"] as const;
  for (const key of positiveIntegers) {
    if (!isIntegerAtLeast(input[key], 1)) errors.push(`${key} deve ser inteiro maior que zero.`);
  }
  if (!isIntegerAtLeast(input.batchPauseSeconds, 0))
    errors.push("batchPauseSeconds deve ser inteiro não negativo.");
  if (input.campaignLimit != null && !isIntegerAtLeast(input.campaignLimit, 1))
    errors.push("campaignLimit deve ser nulo ou inteiro maior que zero.");

  const interval = normalizeInterval(input.messageIntervalSeconds);
  if (!interval) errors.push("messageIntervalSeconds deve ter min/max inteiros maiores que zero.");

  if (typeof input.allowedStartTime !== "string" || !isClockTime(input.allowedStartTime))
    errors.push("allowedStartTime deve usar HH:mm.");
  if (typeof input.allowedEndTime !== "string" || !isClockTime(input.allowedEndTime))
    errors.push("allowedEndTime deve usar HH:mm.");
  if (
    typeof input.allowedStartTime === "string" &&
    typeof input.allowedEndTime === "string" &&
    isClockTime(input.allowedStartTime) &&
    isClockTime(input.allowedEndTime) &&
    clockMinutes(input.allowedStartTime) >= clockMinutes(input.allowedEndTime)
  ) {
    errors.push("Janela deve iniciar antes de terminar no mesmo dia.");
  }

  const weekdays = Array.isArray(input.allowedWeekdays) ? input.allowedWeekdays : [];
  if (
    weekdays.length === 0 ||
    weekdays.some((day) => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6) ||
    new Set(weekdays).size !== weekdays.length
  ) {
    errors.push("allowedWeekdays deve conter dias únicos entre 0 e 6.");
  }

  if (typeof input.timeZone !== "string" || !isTimeZone(input.timeZone))
    errors.push("timeZone deve ser um fuso IANA válido.");
  if (typeof input.stopOnReply !== "boolean") errors.push("stopOnReply deve ser booleano.");
  if (typeof input.dryRun !== "boolean") errors.push("dryRun deve ser booleano.");
  if (errors.length || !interval) return { valid: false, errors };

  return {
    valid: true,
    value: {
      batchSize: input.batchSize as number,
      messageIntervalSeconds: interval,
      batchPauseSeconds: input.batchPauseSeconds as number,
      hourlyLimit: input.hourlyLimit as number,
      dailyLimit: input.dailyLimit as number,
      campaignLimit: input.campaignLimit == null ? null : (input.campaignLimit as number),
      allowedStartTime: input.allowedStartTime as string,
      allowedEndTime: input.allowedEndTime as string,
      allowedWeekdays: [...weekdays] as DispatchConfig["allowedWeekdays"],
      timeZone: input.timeZone as string,
      stopOnReply: input.stopOnReply as boolean,
      dryRun: input.dryRun as boolean,
    },
  };
}

export function renderConfirmedTemplate(template: string, data: ConfirmedTemplateData) {
  const missing = new Set<string>();
  const text = template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (token, key: string) => {
    if (!PLACEHOLDER_SET.has(key)) {
      missing.add(key);
      return token;
    }
    const confirmed = data[key as keyof ConfirmedTemplateData];
    const value = confirmed?.value?.trim();
    if (!confirmed?.confirmed || !value) {
      missing.add(key);
      return token;
    }
    return value;
  });
  return { ok: missing.size === 0, text, missing: [...missing] };
}

export function selectCampaignTemplate(input: {
  templates: readonly DispatchTemplate[];
  mode: TemplateSelectionMode;
  position: number;
  seed: string;
}): DispatchTemplate {
  const templates = input.templates.filter((template) => template.active !== false);
  if (!templates.length) throw new RangeError("Nenhum modelo ativo disponível.");
  if (!Number.isInteger(input.position) || input.position < 0)
    throw new RangeError("position deve ser inteiro não negativo.");

  if (input.mode === "ROUND_ROBIN") return templates[input.position % templates.length];
  if (input.mode === "RANDOM") {
    const index = Math.floor(seededUnit(`${input.seed}:random:${input.position}`) * templates.length);
    return templates[index];
  }

  const weights = templates.map((template) => template.weight ?? 0);
  if (weights.some((weight) => !Number.isFinite(weight) || weight <= 0))
    throw new RangeError("Todos os modelos WEIGHTED precisam de peso maior que zero.");
  return smoothWeightedChoice(templates, weights, input.position, input.seed);
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: EligibilitySkipReason[] = [];
  if (input.killSwitch) reasons.push("KILL_SWITCH");
  if (input.outboundKillSwitch) reasons.push("OUTBOUND_KILL_SWITCH");
  if (!input.sessionHealthy) reasons.push("SESSION_UNHEALTHY");
  if (!input.phoneE164?.trim()) reasons.push("MISSING_PHONE");
  if (!input.canContact) reasons.push("CONTACT_NOT_ALLOWED");
  if (input.doNotContact) reasons.push("DO_NOT_CONTACT");
  if (input.optedOutAt) reasons.push("OPT_OUT");
  if (!input.identityResolved) reasons.push("IDENTITY_UNRESOLVED");
  if (input.stopOnReply && input.hasReplied) reasons.push("STOP_ON_REPLY");
  if (input.alreadySent) reasons.push("ALREADY_SENT");
  if (input.matchesBase === false) reasons.push("BASE_FILTER_MISMATCH");
  if (input.matchesProject === false) reasons.push("PROJECT_FILTER_MISMATCH");
  return { eligible: reasons.length === 0, reasons };
}

export function buildIdempotencyKey(input: {
  campaignId: string;
  clientId: number;
  cadenceStep: string;
  templateId: string;
  templateVersion: string | number;
  mediaVersion?: string | number | null;
}) {
  if (!input.campaignId.trim() || !Number.isInteger(input.clientId) || input.clientId <= 0)
    throw new RangeError("campaignId e clientId válidos são obrigatórios.");
  if (!input.cadenceStep.trim() || !input.templateId.trim() || !String(input.templateVersion).trim())
    throw new RangeError("cadenceStep, templateId e templateVersion são obrigatórios.");
  const parts = [
    input.campaignId.trim(),
    String(input.clientId),
    input.cadenceStep.trim(),
    input.templateId.trim(),
    String(input.templateVersion).trim(),
    input.mediaVersion == null ? "none" : String(input.mediaVersion).trim(),
  ].map((part) => encodeURIComponent(part));
  return `whatsapp-dispatch:${parts.join(":")}`;
}

export function scheduleDispatchSlots(input: {
  count: number;
  config: DispatchConfig;
  startAt: Date | string;
  seed: string;
  existingSentAt?: readonly (Date | string)[];
  campaignSentCount?: number;
}): string[] {
  const validation = validateDispatchConfig(input.config);
  if (!validation.valid) throw new RangeError(validation.errors.join(" "));
  if (!Number.isInteger(input.count) || input.count < 0)
    throw new RangeError("count deve ser inteiro não negativo.");
  const campaignSentCount = input.campaignSentCount ?? 0;
  if (!Number.isInteger(campaignSentCount) || campaignSentCount < 0)
    throw new RangeError("campaignSentCount deve ser inteiro não negativo.");
  if (
    validation.value.campaignLimit != null &&
    campaignSentCount + input.count > validation.value.campaignLimit
  ) {
    throw new RangeError("Quantidade excede campaignLimit.");
  }

  const startAt = parseInstant(input.startAt);
  const occupied = (input.existingSentAt ?? []).map(parseInstant);
  const slots: Date[] = [];
  let cursor = startAt;

  for (let index = 0; index < input.count; index += 1) {
    if (index > 0) {
      const interval = intervalSeconds(validation.value, input.seed, index);
      const delay = index % validation.value.batchSize === 0
        ? Math.max(interval, validation.value.batchPauseSeconds)
        : interval;
      cursor = new Date(slots[index - 1].getTime() + delay * 1000);
    }
    cursor = nextAvailableSlot(cursor, validation.value, [...occupied, ...slots]);
    slots.push(cursor);
  }
  return slots.map((slot) => slot.toISOString());
}

export function buildDryRun(input: BuildDryRunInput): DryRunResult {
  const validation = validateDispatchConfig(input.config);
  if (!validation.valid) throw new RangeError(validation.errors.join(" "));
  const activeTemplates = input.templates.filter((template) => template.active !== false);
  const rows: DryRunRow[] = [];
  const schedulableIndexes: number[] = [];
  let templatePosition = 0;
  let accepted = 0;
  const campaignSentCount = input.campaignSentCount ?? 0;

  input.candidates.forEach((candidate, index) => {
    const eligibility = evaluateEligibility(candidate);
    const reasons = [...eligibility.reasons];
    let template: DispatchTemplate | null = null;
    let renderedText: string | null = null;

    if (!reasons.length && !activeTemplates.length) reasons.push("NO_ACTIVE_TEMPLATE");
    if (!reasons.length && validation.value.campaignLimit != null) {
      if (campaignSentCount + accepted >= validation.value.campaignLimit) reasons.push("CAMPAIGN_LIMIT");
    }
    if (!reasons.length) {
      template = selectCampaignTemplate({
        templates: activeTemplates,
        mode: input.selectionMode,
        position: templatePosition,
        seed: input.seed,
      });
      const rendered = renderConfirmedTemplate(template.body, candidate.placeholders);
      if (!rendered.ok) reasons.push("UNCONFIRMED_PLACEHOLDER");
      else {
        renderedText = rendered.text;
        templatePosition += 1;
        accepted += 1;
        schedulableIndexes.push(index);
      }
    }

    rows.push({
      order: index + 1,
      clientId: candidate.clientId,
      clientName: candidate.clientName,
      eligible: reasons.length === 0,
      templateId: template?.id ?? null,
      templateVersion: template?.version ?? null,
      renderedText,
      media: input.media ?? null,
      cadenceStep: candidate.cadenceStep,
      estimatedAt: null,
      idempotencyKey: reasons.length || !template ? null : buildIdempotencyKey({
        campaignId: input.campaignId,
        clientId: candidate.clientId,
        cadenceStep: candidate.cadenceStep,
        templateId: template.id,
        templateVersion: template.version,
        mediaVersion: input.media?.version,
      }),
      skipReasons: reasons,
    });
  });

  const slots = scheduleDispatchSlots({
    count: schedulableIndexes.length,
    config: validation.value,
    startAt: input.startAt,
    seed: input.seed,
    existingSentAt: input.existingSentAt,
    campaignSentCount,
  });
  schedulableIndexes.forEach((rowIndex, slotIndex) => {
    rows[rowIndex].estimatedAt = slots[slotIndex];
  });

  const skipCounts: DryRunResult["skipCounts"] = {};
  for (const row of rows) {
    for (const reason of row.skipReasons) skipCounts[reason] = (skipCounts[reason] ?? 0) + 1;
  }
  return {
    rows,
    total: rows.length,
    eligible: schedulableIndexes.length,
    skipped: rows.length - schedulableIndexes.length,
    skipCounts,
  };
}

function smoothWeightedChoice(
  templates: readonly DispatchTemplate[],
  weights: readonly number[],
  position: number,
  seed: string,
) {
  const offset = seededInteger(`${seed}:weighted`, templates.length);
  const ordered = templates.map((_, index) => templates[(index + offset) % templates.length]);
  const orderedWeights = weights.map((_, index) => weights[(index + offset) % weights.length]);
  const current = orderedWeights.map(() => 0);
  const total = orderedWeights.reduce((sum, weight) => sum + weight, 0);
  let selected = 0;
  for (let step = 0; step <= position; step += 1) {
    for (let index = 0; index < current.length; index += 1) current[index] += orderedWeights[index];
    selected = 0;
    for (let index = 1; index < current.length; index += 1) {
      if (current[index] > current[selected]) selected = index;
    }
    current[selected] -= total;
  }
  return ordered[selected];
}

function intervalSeconds(config: DispatchConfig, seed: string, position: number) {
  const { min, max } = config.messageIntervalSeconds;
  if (min === max) return min;
  return min + seededInteger(`${seed}:interval:${position}`, max - min + 1);
}

function nextAvailableSlot(candidate: Date, config: DispatchConfig, occupied: readonly Date[]) {
  let cursor = alignToWindow(candidate, config);
  for (let guard = 0; guard < 10_000; guard += 1) {
    const cursorParts = zonedParts(cursor, config.timeZone);
    const dayKey = localDayKey(cursorParts);
    const hourKey = `${dayKey}T${String(cursorParts.hour).padStart(2, "0")}`;
    let dayCount = 0;
    let hourCount = 0;
    for (const instant of occupied) {
      const parts = zonedParts(instant, config.timeZone);
      if (localDayKey(parts) === dayKey) dayCount += 1;
      if (`${localDayKey(parts)}T${String(parts.hour).padStart(2, "0")}` === hourKey) hourCount += 1;
    }
    if (dayCount >= config.dailyLimit) {
      cursor = nextLocalDayStart(cursorParts, config);
      continue;
    }
    if (hourCount >= config.hourlyLimit) {
      cursor = alignToWindow(nextLocalHour(cursorParts, config.timeZone), config);
      continue;
    }
    return cursor;
  }
  throw new RangeError("Não foi possível encontrar horário elegível.");
}

function alignToWindow(candidate: Date, config: DispatchConfig) {
  let cursor = candidate;
  const start = clockMinutes(config.allowedStartTime);
  const end = clockMinutes(config.allowedEndTime);
  for (let guard = 0; guard < 370; guard += 1) {
    const parts = zonedParts(cursor, config.timeZone);
    if (!config.allowedWeekdays.includes(parts.weekday)) {
      cursor = nextLocalDayStart(parts, config);
      continue;
    }
    const localMinute = parts.hour * 60 + parts.minute + parts.second / 60;
    if (localMinute < start) return localClockInstant(parts, config.allowedStartTime, config.timeZone);
    if (localMinute >= end) {
      cursor = nextLocalDayStart(parts, config);
      continue;
    }
    return cursor;
  }
  throw new RangeError("Nenhum dia permitido encontrado.");
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, ZonedParts["weekday"]> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: weekdays[values.weekday],
  };
}

function localClockInstant(parts: ZonedParts, clock: string, timeZone: string) {
  const [hour, minute] = clock.split(":").map(Number);
  return zonedTimeToUtc({ ...parts, hour, minute, second: 0 }, timeZone);
}

function nextLocalDayStart(parts: ZonedParts, config: DispatchConfig) {
  const serial = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + DAY_MS);
  return localClockInstant(
    {
      year: serial.getUTCFullYear(),
      month: serial.getUTCMonth() + 1,
      day: serial.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
      weekday: serial.getUTCDay() as ZonedParts["weekday"],
    },
    config.allowedStartTime,
    config.timeZone,
  );
}

function nextLocalHour(parts: ZonedParts, timeZone: string) {
  const serial = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour) + 3_600_000);
  return zonedTimeToUtc(
    {
      year: serial.getUTCFullYear(),
      month: serial.getUTCMonth() + 1,
      day: serial.getUTCDate(),
      hour: serial.getUTCHours(),
      minute: 0,
      second: 0,
      weekday: serial.getUTCDay() as ZonedParts["weekday"],
    },
    timeZone,
  );
}

function zonedTimeToUtc(parts: ZonedParts, timeZone: string) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let timestamp = desired;
  for (let index = 0; index < 4; index += 1) {
    const actual = zonedParts(new Date(timestamp), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const adjustment = desired - represented;
    timestamp += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(timestamp);
}

function localDayKey(parts: ZonedParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function seededUnit(seed: string) {
  return seededInteger(seed, 0x1_0000_0000) / 0x1_0000_0000;
}

function seededInteger(seed: string, ceiling: number) {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return Math.floor((hash >>> 0) / 0x1_0000_0000 * ceiling);
}

function normalizeInterval(value: unknown) {
  if (isIntegerAtLeast(value, 1)) return { min: value, max: value };
  if (!isRecord(value) || !isIntegerAtLeast(value.min, 1) || !isIntegerAtLeast(value.max, 1))
    return null;
  if (value.min > value.max) return null;
  return { min: value.min, max: value.max };
}

function parseInstant(value: Date | string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Data inválida.");
  return date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerAtLeast(value: unknown, minimum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum;
}

function isClockTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clockMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
