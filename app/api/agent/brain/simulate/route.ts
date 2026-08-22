import { NextResponse } from "next/server";
import { buildAgentContext } from "@/lib/agent/brain/context-builder";
import { LLMProviderRegistry } from "@/lib/agent/brain/provider-registry";
import { loadLLMProviderRegistry } from "@/lib/agent/brain/registry-loader";
import { AgentBrainPipeline } from "@/lib/agent/brain/pipeline";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SupabaseBuilderCatalogService } from "@/lib/agent/brain/builder-catalog-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body = await request.json() as { clientId?: number; conversationId?: string; message?: string };
    if (!Number.isInteger(body.clientId) || Number(body.clientId) <= 0) return NextResponse.json({ error: "clientId inválido." }, { status: 400 });
    if (body.message !== undefined && (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000)) return NextResponse.json({ error: "Mensagem de simulação inválida." }, { status: 400 });
    const context = await buildAgentContext({ clientId: Number(body.clientId), conversationId: body.conversationId });
    if (body.message) {
      context.recentMessages.push({ id: `simulation-${randomUUID()}`, direction: "inbound", body: body.message.trim(), createdAt: new Date().toISOString() });
      const matches = await new SupabaseBuilderCatalogService().findMentioned(body.message);
      context.catalogMatches = matches.map((row) => ({ id: Number(row.id), name: String(row.name), builderName: Array.isArray(row.builders) ? String(row.builders[0]?.name || "") : String((row.builders as { name?: string } | null)?.name || ""), salePrice: Number(row.sale_price), city: String(row.city || "") }));
    }
    const registry = await loadLLMProviderRegistry().catch(() => new LLMProviderRegistry());
    const result = await new AgentBrainPipeline(registry).simulate(context);
    const correlationId = randomUUID();
    const audit = { context: { clientId: body.clientId, conversationId: body.conversationId || null, stage: context.stage, controlMode: context.controlMode, recentMessageCount: context.recentMessages.length, catalogMatches: context.catalogMatches || [] }, provider: result.provider, intent: result.decision.intents, facts: result.decision.extractedFacts, strategy: result.decision.strategy, nextBestAction: result.decision.nextBestAction, confidence: result.decision.confidence, requiresHuman: result.decision.requiresHuman, proposedMessage: result.decision.proposedMessage || null, proposedStage: result.decision.proposedStage || null, rationaleCode: result.decision.rationaleCode, policy: "simulation_only", confidenceGate: result.evaluation, effects: result.effects, outboundReal: false };
    const db = supabaseAdmin();
    const { error: eventError } = await db.from("agent_events").insert({ client_id: body.clientId, entity_type: "agent_brain_simulation", entity_id: body.conversationId || String(body.clientId), event_type: "AGENT_BRAIN_SIMULATED", actor_type: "human", actor_id: "crm_operator", correlation_id: correlationId, payload: audit });
    if (eventError) throw eventError;
    const { error: auditError } = await db.from("agent_audit_logs").insert({ client_id: body.clientId, correlation_id: correlationId, idempotency_key: `simulation:${correlationId}`, phase: "read_back", action_type: "simulate_agent_brain", status: result.evaluation.valid ? "simulated" : "blocked", input: audit.context, output: audit });
    if (auditError) throw auditError;
    return NextResponse.json({ ...result, correlationId, outboundReal: false });
  } catch {
    return NextResponse.json({ error: "Não foi possível simular a decisão do agente." }, { status: 500 });
  }
}
