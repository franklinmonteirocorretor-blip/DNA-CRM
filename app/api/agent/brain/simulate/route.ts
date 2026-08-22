import { NextResponse } from "next/server";
import { buildAgentContext } from "@/lib/agent/brain/context-builder";
import { LLMProviderRegistry } from "@/lib/agent/brain/provider-registry";
import { loadLLMProviderRegistry } from "@/lib/agent/brain/registry-loader";
import { AgentBrainPipeline } from "@/lib/agent/brain/pipeline";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body = await request.json() as { clientId?: number; conversationId?: string };
    if (!Number.isInteger(body.clientId) || Number(body.clientId) <= 0) return NextResponse.json({ error: "clientId inválido." }, { status: 400 });
    const context = await buildAgentContext({ clientId: Number(body.clientId), conversationId: body.conversationId });
    const registry = await loadLLMProviderRegistry().catch(() => new LLMProviderRegistry());
    const result = await new AgentBrainPipeline(registry).simulate(context);
    return NextResponse.json({ ...result, outboundReal: false });
  } catch {
    return NextResponse.json({ error: "Não foi possível simular a decisão do agente." }, { status: 500 });
  }
}
