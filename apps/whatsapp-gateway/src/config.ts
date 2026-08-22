function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} obrigatório.`);
  return value;
}

function port(value: string | undefined) {
  const parsed = Number(value || 10000);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error("PORT deve ser inteiro entre 1 e 65535.");
  return parsed;
}

function boolean(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} deve ser true ou false.`);
}

function integer(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name] || fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} inválido.`);
  return parsed;
}

function encryptionKey() {
  const raw = Buffer.from(required("WHATSAPP_AUTH_ENCRYPTION_KEY"), "base64");
  if (raw.length !== 32) throw new Error("WHATSAPP_AUTH_ENCRYPTION_KEY deve conter 32 bytes em base64.");
  return raw;
}

export type GatewayConfig = Readonly<{
  nodeEnv: string;
  port: number;
  gatewaySecret: string;
  encryptionKey: Buffer;
  supabaseUrl: string;
  supabaseSecretKey: string;
  crmInboundUrl?: string;
  mediaBucket: string;
  realOutboundEnabled: boolean;
  circuitCooldownMs: number;
  authorizedTestNumbers: ReadonlySet<string>;
  dispatcherWorkerEnabled: boolean;
  dispatcherPollMs: number;
  dispatcherLeaseSeconds: number;
  dispatcherClaimLimit: number;
  dispatcherAckTimeoutMs: number;
  legacyOutboundEndpointEnabled: boolean;
}>;

function loadGatewayConfig(): GatewayConfig {
  const circuitCooldownMs = Number(process.env.WHATSAPP_CIRCUIT_COOLDOWN_MS || 300_000);
  if (!Number.isFinite(circuitCooldownMs) || circuitCooldownMs < 1_000) throw new Error("WHATSAPP_CIRCUIT_COOLDOWN_MS inválido.");
  const realOutboundEnabled = boolean("WHATSAPP_REAL_OUTBOUND_ENABLED");
  const authorizedTestNumbers = new Set((process.env.WHATSAPP_AUTHORIZED_TEST_NUMBERS || "").split(",").map(v => v.replace(/\D/g, "")).filter(Boolean));
  const dispatcherWorkerEnabled = boolean("WHATSAPP_DISPATCH_WORKER_ENABLED");
  if (dispatcherWorkerEnabled && (!realOutboundEnabled || authorizedTestNumbers.size === 0)) {
    throw new Error("Worker exige outbound real e allowlist de teste explícita.");
  }
  return Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || "production",
  port: port(process.env.PORT),
  gatewaySecret: required("WHATSAPP_GATEWAY_SECRET"),
  encryptionKey: encryptionKey(),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  crmInboundUrl: process.env.CRM_INBOUND_URL?.trim(),
  mediaBucket: process.env.WHATSAPP_MEDIA_BUCKET?.trim() || "whatsapp-media",
  realOutboundEnabled,
  circuitCooldownMs,
  authorizedTestNumbers,
  dispatcherWorkerEnabled,
  dispatcherPollMs: integer("WHATSAPP_DISPATCH_POLL_MS", 2_000, 250, 60_000),
  dispatcherLeaseSeconds: integer("WHATSAPP_DISPATCH_LEASE_SECONDS", 60, 15, 900),
  dispatcherClaimLimit: integer("WHATSAPP_DISPATCH_CLAIM_LIMIT", 1, 1, 1),
  dispatcherAckTimeoutMs: integer("WHATSAPP_DISPATCH_ACK_TIMEOUT_MS", 20_000, 1_000, 120_000),
  legacyOutboundEndpointEnabled: boolean("WHATSAPP_LEGACY_OUTBOUND_ENDPOINT_ENABLED"),
  });
}

export const config = loadGatewayConfig();
