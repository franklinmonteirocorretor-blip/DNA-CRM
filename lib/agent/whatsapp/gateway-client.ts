import "server-only";

function gatewayConfig() {
  const baseUrl = process.env.WHATSAPP_GATEWAY_URL?.replace(/\/$/, "");
  const secret = process.env.WHATSAPP_GATEWAY_SECRET;
  if (!baseUrl || !secret) throw new Error("Gateway WhatsApp não configurado.");
  return { baseUrl, secret };
}

export async function gatewayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, secret } = gatewayConfig();
  const response = await fetch(`${baseUrl}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(12_000), headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", ...init.headers } });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Gateway respondeu ${response.status}.`);
  return data;
}

export function gatewayConfigured() { return Boolean(process.env.WHATSAPP_GATEWAY_URL && process.env.WHATSAPP_GATEWAY_SECRET); }
