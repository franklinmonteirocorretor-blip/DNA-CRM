function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} obrigatório.`);
  return value;
}

function encryptionKey() {
  const raw = Buffer.from(required("WHATSAPP_AUTH_ENCRYPTION_KEY"), "base64");
  if (raw.length !== 32) throw new Error("WHATSAPP_AUTH_ENCRYPTION_KEY deve conter 32 bytes em base64.");
  return raw;
}

export const config = {
  port: Number(process.env.PORT || 10000),
  gatewaySecret: required("WHATSAPP_GATEWAY_SECRET"),
  encryptionKey: encryptionKey(),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  crmInboundUrl: process.env.CRM_INBOUND_URL?.trim(),
  mediaBucket: process.env.WHATSAPP_MEDIA_BUCKET?.trim() || "whatsapp-media",
  realOutboundEnabled: process.env.WHATSAPP_REAL_OUTBOUND_ENABLED === "true",
  circuitCooldownMs: Number(process.env.WHATSAPP_CIRCUIT_COOLDOWN_MS || 300_000),
  authorizedTestNumbers: new Set((process.env.WHATSAPP_AUTHORIZED_TEST_NUMBERS || "").split(",").map(v => v.replace(/\D/g, "")).filter(Boolean)),
};
