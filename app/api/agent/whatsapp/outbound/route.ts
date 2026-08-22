import { NextResponse } from "next/server";
import { gatewayRequest } from "@/lib/agent/whatsapp/gateway-client";
import { confirmProviderSend, failProviderSend, prepareOutbound } from "@/lib/agent/whatsapp/service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientId || !body.conversationId || !body.text || !body.idempotencyKey)
      return NextResponse.json({ error: "Cliente, conversa, mensagem e idempotência são obrigatórios." }, { status: 400 });
    const result = await prepareOutbound(body);
    if (result.allowed && !result.simulated && result.messageId && result.sessionId && result.phoneE164) {
      try {
        const ack = await gatewayRequest<{ providerMessageId?: string; accepted: boolean }>(`/sessions/${result.sessionId}/messages`, { method: "POST", body: JSON.stringify({ phone: result.phoneE164, text: body.text }) });
        if (!ack.accepted || !ack.providerMessageId) throw new Error("Provider não confirmou o envio.");
        const readBack = await confirmProviderSend(result.messageId, ack.providerMessageId);
        return NextResponse.json({ ...result, providerMessageId: ack.providerMessageId, readBack });
      } catch (error) {
        await failProviderSend(result.messageId, error instanceof Error ? error.message : "Falha no provider.");
        return NextResponse.json({ error: "Provider rejeitou o envio controlado." }, { status: 502 });
      }
    }
    return NextResponse.json(result, { status: result.allowed ? 200 : 409 });
  } catch { return NextResponse.json({ error: "Falha ao preparar envio." }, { status: 500 }); }
}
