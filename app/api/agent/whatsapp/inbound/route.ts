import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processProviderMessage } from "@/lib/agent/whatsapp/service";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.WHATSAPP_GATEWAY_SECRET;
  const value = request.headers.get("x-gateway-secret");
  if (!secret || !value) return false;
  const a = Buffer.from(secret); const b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try { return NextResponse.json(await processProviderMessage(await request.json())); }
  catch { return NextResponse.json({ error: "Falha ao persistir evento inbound." }, { status: 500 }); }
}
