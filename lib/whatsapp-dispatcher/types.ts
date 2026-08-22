export const DISPATCH_CAMPAIGN_SOURCES = [
  "DAILY_WALLET",
  "OWN_DATABASE",
  "DNA",
  "INDICATION",
  "MANUAL_LIST",
  "PROJECT_LIST",
  "REACTIVATION",
  "CUSTOM",
] as const;

export type DispatchCampaignSource = (typeof DISPATCH_CAMPAIGN_SOURCES)[number];

export const DISPATCH_CAMPAIGN_STATUSES = [
  "OFF",
  "READY",
  "RUNNING",
  "PAUSED",
  "STOPPED",
  "ERROR",
] as const;

export type DispatchCampaignStatus = (typeof DISPATCH_CAMPAIGN_STATUSES)[number];

export const DISPATCH_QUEUE_STATUSES = [
  "QUEUED",
  "WAITING",
  "SENDING_MEDIA",
  "SENDING_TEXT",
  "SENT",
  "FAILED",
  "SKIPPED",
  "CANCELLED",
  "REPLIED",
] as const;

export type DispatchQueueStatus = (typeof DISPATCH_QUEUE_STATUSES)[number];

export const TEMPLATE_SELECTION_MODES = ["ROUND_ROBIN", "RANDOM", "WEIGHTED"] as const;
export type TemplateSelectionMode = (typeof TEMPLATE_SELECTION_MODES)[number];

export const DISPATCH_PLACEHOLDERS = [
  "nome",
  "primeiro_nome",
  "empreendimento",
  "corretor",
  "base",
] as const;

export type DispatchPlaceholder = (typeof DISPATCH_PLACEHOLDERS)[number];
export type DispatchWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DispatchInterval = {
  min: number;
  max: number;
};

export type DispatchConfig = {
  batchSize: number;
  messageIntervalSeconds: DispatchInterval;
  batchPauseSeconds: number;
  hourlyLimit: number;
  dailyLimit: number;
  campaignLimit?: number | null;
  allowedStartTime: string;
  allowedEndTime: string;
  allowedWeekdays: DispatchWeekday[];
  timeZone: string;
  stopOnReply: boolean;
  dryRun: boolean;
};

export type DispatchConfigValidation =
  | { valid: true; value: DispatchConfig }
  | { valid: false; errors: string[] };

export type ConfirmedPlaceholderValue = {
  value: string | null;
  confirmed: boolean;
};

export type ConfirmedTemplateData = Partial<
  Record<DispatchPlaceholder, ConfirmedPlaceholderValue>
>;

export type DispatchTemplate = {
  id: string;
  version: string | number;
  body: string;
  weight?: number;
  active?: boolean;
};

export type DispatchMedia = {
  id: string;
  version: string | number;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  sequence: "MEDIA_THEN_TEXT" | "TEXT_THEN_MEDIA";
};

export const ELIGIBILITY_SKIP_REASONS = [
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
  "UNCONFIRMED_PLACEHOLDER",
  "NO_ACTIVE_TEMPLATE",
  "CAMPAIGN_LIMIT",
] as const;

export type EligibilitySkipReason = (typeof ELIGIBILITY_SKIP_REASONS)[number];

export type EligibilityInput = {
  phoneE164?: string | null;
  canContact: boolean;
  doNotContact: boolean;
  optedOutAt?: string | null;
  hasReplied: boolean;
  alreadySent: boolean;
  identityResolved: boolean;
  sessionHealthy: boolean;
  killSwitch: boolean;
  outboundKillSwitch: boolean;
  stopOnReply: boolean;
  matchesBase?: boolean;
  matchesProject?: boolean;
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: EligibilitySkipReason[];
};

export type DryRunCandidate = EligibilityInput & {
  clientId: number;
  clientName: string;
  cadenceStep: string;
  placeholders: ConfirmedTemplateData;
};

export type DryRunRow = {
  order: number;
  clientId: number;
  clientName: string;
  eligible: boolean;
  templateId: string | null;
  templateVersion: string | number | null;
  renderedText: string | null;
  media: DispatchMedia | null;
  cadenceStep: string;
  estimatedAt: string | null;
  idempotencyKey: string | null;
  skipReasons: EligibilitySkipReason[];
};

export type DryRunResult = {
  rows: DryRunRow[];
  total: number;
  eligible: number;
  skipped: number;
  skipCounts: Partial<Record<EligibilitySkipReason, number>>;
};

export type BuildDryRunInput = {
  campaignId: string;
  config: DispatchConfig;
  templates: readonly DispatchTemplate[];
  selectionMode: TemplateSelectionMode;
  candidates: readonly DryRunCandidate[];
  startAt: Date | string;
  seed: string;
  media?: DispatchMedia | null;
  existingSentAt?: readonly (Date | string)[];
  campaignSentCount?: number;
};
