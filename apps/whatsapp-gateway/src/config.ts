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
}>;

function loadGatewayConfig(): GatewayConfig {
  const circuitCooldownMs = Number(process.env.WHATSAPP_CIRCUIT_COOLDOWN_MS || 300_000);
  if (!Number.isFinite(circuitCooldownMs) || circuitCooldownMs < 1_000) throw new Error("WHATSAPP_CIRCUIT_COOLDOWN_MS inválido.");
  return Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || "production",
  port: port(process.env.PORT),
  gatewaySecret: required("WHATSAPP_GATEWAY_SECRET"),
  encryptionKey: encryptionKey(),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  crmInboundUrl: process.env.CRM_INBOUND_URL?.trim(),
  mediaBucket: process.env.WHATSAPP_MEDIA_BUCKET?.trim() || "whatsapp-media",
  realOutboundEnabled: boolean("WHATSAPP_REAL_OUTBOUND_ENABLED"),
  circuitCooldownMs,
  authorizedTestNumbers: new Set((process.env.WHATSAPP_AUTHORIZED_TEST_NUMBERS || "").split(",").map(v => v.replace(/\D/g, "")).filter(Boolean)),
  });
}

export const config = loadGatewayConfig();
