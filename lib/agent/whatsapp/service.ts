import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadAgentControl } from "@/lib/agent/store";
import { evaluateConfidence } from "@/lib/agent/confidence-gate";
import { evaluatePolicy } from "@/lib/agent/policy-engine";
import type { StructuredDecision } from "@/lib/agent/types";
import { buildAgentContext } from "@/lib/agent/brain/context-builder";
import { LLMProviderRegistry } from "@/lib/agent/brain/provider-registry";
import { loadLLMProviderRegistry } from "@/lib/agent/brain/registry-loader";
import { AgentBrainPipeline } from "@/lib/agent/brain/pipeline";
import { commitAgentMemory } from "@/lib/agent/brain/memory-store";
import { normalizePhoneE164, resolveOutboundIdentity } from "./identity-resolver";
import type { ConversationControlMode } from "./types";

type MediaMetadata = { mimeType?: string | null; fileName?: string | null; fileLength?: number | null; durationSeconds?: number | null; caption?: string | null; pageCount?: number | null; storageBucket?: string | null; storagePath?: string | null; storageError?: string | null };

async function resolveInboundClient(phone: string | undefined) {
  const normalized = phone ? normalizePhoneE164(phone) : null;
  if (!normalized) return { clientId: null, status: "invalid_phone" as const, phoneE164: null };
  const digits = normalized.slice(1);
  const variants = [...new Set([digits, digits.startsWith("55") ? digits.slice(2) : digits, normalized])];
  const { data, error } = await supabaseAdmin().from("clients").select("id,phone").in("phone", variants).limit(2);
  if (error) throw error;
  if (!data?.length) return { clientId: null, status: "not_found" as const, phoneE164: normalized };
  if (data.length > 1) return { clientId: null, status: "ambiguous" as const, phoneE164: normalized };
  return { clientId: data[0]!.id as number, status: "matched" as const, phoneE164: normalized };
}

async function ensureTestInboundClient(identity: Awaited<ReturnType<typeof resolveInboundClient>>) {
  if (identity.status !== "not_found" || !identity.phoneE164) return identity;
  const phone = identity.phoneE164.slice(1);
  const suffix = phone.slice(-4);
  const db = supabaseAdmin();
  const { error } = await db.from("clients").upsert({
    name: `CLIENTE TESTE - WHATSAPP ${suffix}`,
    phone,
    origin_type: "WhatsApp",
    origin_detail: "Validação controlada do agente",
    funnel_stage: "Novo lead",
    finance_stage: "Não iniciado",
    data_quality: "teste",
    updated_at: new Date().toISOString(),
  }, { onConflict: "phone", ignoreDuplicates: true });
  if (error) throw error;
  const { data, error: selectError } = await db.from("clients").select("id").eq("phone", phone).single();
  if (selectError) throw selectError;
  return { clientId: data.id as number, status: "created" as const, phoneE164: identity.phoneE164 };
}

async function registerAgentDecision(input: { providerMessageId: string; conversationId: string; clientId: number; controlMode: string; text?: string }) {
  const db = supabaseAdmin();
  const idempotencyKey = `whatsapp:${input.providerMessageId}:agent-decision`;
  const { data: existing } = await db.from("agent_events").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return;
  const context = await buildAgentContext({ clientId: input.clientId, conversationId: input.conversationId });
  const registry = await loadLLMProviderRegistry().catch(() => new LLMProviderRegistry());
  const brainResult = await new AgentBrainPipeline(registry).simulate(context);
  const cognitive = brainResult.decision;
  const wantsMessage = Boolean(cognitive.proposedMessage) && !cognitive.requiresHuman && brainResult.evaluation.valid;
  const control = await loadAgentControl();
  const decision: StructuredDecision = {
    clientId: input.clientId,
    action: wantsMessage ? "send_whatsapp" : "request_human_review",
    capability: wantsMessage ? "whatsapp_outbound" : "human_escalation",
    reason: brainResult.evaluation.valid ? cognitive.rationaleCode : brainResult.evaluation.reasonCodes.join(",") || "EVALUATION_REJECTED",
    confidence: cognitive.confidence,
    idempotencyKey,
    payload: { conversationId: input.conversationId, agentDecision: cognitive, simulatedEffects: brainResult.effects },
    proposedAt: new Date().toISOString(),
  };
  const client = context.client || {};
  const contactPolicy = { canContact: client.can_contact === true, doNotContact: client.do_not_contact !== false, optedOutAt: typeof client.opt_out_at === "string" ? client.opt_out_at : null, localHour: Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date())), allowedStartHour: 8, allowedEndHour: 20 };
  const policy = input.controlMode === "auto" || !wantsMessage
    ? evaluatePolicy(decision, control, wantsMessage ? contactPolicy : undefined)
    : { allowed: false, requiresApproval: false, simulation: control.simulationMode, reason: "Controle humano bloqueou envio; interpretação preservada." };
  const gate = evaluateConfidence(decision, control, policy);
  const status = gate.allowed ? (gate.requiresApproval ? "approval_required" : gate.simulation ? "simulated" : "allowed") : "blocked";
  const correlationId = randomUUID();
  const payload = { agentDecision: cognitive, evaluation: brainResult.evaluation, simulatedEffects: brainResult.effects, status, reason: gate.reason, outboundSent: false, simulationMode: gate.simulation, controlMode: input.controlMode };
  const { error: eventError } = await db.from("agent_events").insert({ client_id: input.clientId, entity_type: "whatsapp_conversation", entity_id: input.conversationId, event_type: "AGENT_DECISION_PROPOSED", actor_type: "agent", correlation_id: correlationId, idempotency_key: idempotencyKey, payload });
  if (eventError && eventError.code !== "23505") throw eventError;
  const { error: auditError } = await db.from("agent_audit_logs").insert({ client_id: input.clientId, correlation_id: correlationId, idempotency_key: `${idempotencyKey}:audit`, phase: "decision", action_type: decision.action, status, input: decision, output: payload });
  if (auditError && auditError.code !== "23505") throw auditError;
  const summary = await registry.withFallback((provider) => provider.summarize({ previousSummary: context.summary || undefined, messages: context.recentMessages }));
  const lastMessageId = [...context.recentMessages].reverse().find((message) => message.direction.toLowerCase() === "inbound")?.id;
  await commitAgentMemory({ clientId: input.clientId, conversationId: input.conversationId, summary: summary.summary, lastMessageId: typeof lastMessageId === "number" ? lastMessageId : undefined, facts: cognitive.extractedFacts }).catch(async (error) => {
    await db.from("agent_audit_logs").insert({ client_id: input.clientId, correlation_id: correlationId, idempotency_key: `${idempotencyKey}:memory-error`, phase: "error", action_type: "commit_agent_memory", status: "failed", input: {}, output: { message: error instanceof Error ? error.message : "Falha transacional de memória." } });
  });
}

async function stopDispatchesOnReply(clientId: number, replyMessageId: number) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("whatsapp_campaign_queue")
    .select("campaign_id,whatsapp_campaigns!inner(status,stop_on_reply)")
    .eq("client_id", clientId)
    .in("whatsapp_campaigns.status", ["READY", "RUNNING", "PAUSED"])
    .eq("whatsapp_campaigns.stop_on_reply", true);
  if (error) throw error;
  const campaignIds = [...new Set((data || []).map((row) => String(row.campaign_id)))];
  for (const campaignId of campaignIds) {
    const { error: stopError } = await db.rpc("stop_whatsapp_campaign_on_reply", {
      p_campaign_id: campaignId,
      p_client_id: clientId,
      p_reply_message_id: replyMessageId,
    });
    if (stopError) throw stopError;
  }
}

export async function processProviderMessage(input: { sessionId: string; providerMessageId: string; providerConversationId: string; phone?: string; text?: string; occurredAt: string; fromMe?: boolean; manual?: boolean; messageType?: "text" | "audio" | "image" | "document" | "video"; mediaMetadata?: MediaMetadata | null }) {
  const db = supabaseAdmin();
  const { data: existing } = await db.from("whatsapp_messages").select("id,conversation_id,client_id,body,direction").eq("provider_message_id", input.providerMessageId).maybeSingle();
  if (existing) {
    let existingClientId = existing.client_id as number | null;
    if (!input.fromMe && !existingClientId) {
      const existingPhone = input.phone || input.providerConversationId.split("@")[0]?.split(":")[0];
      const reconciledIdentity = await ensureTestInboundClient(await resolveInboundClient(existingPhone));
      existingClientId = reconciledIdentity.clientId;
      if (existingClientId) {
        await Promise.all([
          db.from("whatsapp_messages").update({ client_id: existingClientId, updated_at: new Date().toISOString() }).eq("id", existing.id),
          db.from("whatsapp_conversations").update({ client_id: existingClientId, phone_e164: reconciledIdentity.phoneE164 || existingPhone, updated_at: new Date().toISOString() }).eq("id", existing.conversation_id),
        ]);
        await db.from("client_events").insert({ client_id: existingClientId, event_type: "WhatsApp", title: "Mensagem recebida pelo WhatsApp", description: `Mensagem ${input.messageType || "text"} recebida e vinculada à conversa.` });
      }
    }
    if (!input.fromMe && existingClientId) {
      const { data: conversation } = await db.from("whatsapp_conversations").select("control_mode").eq("id", existing.conversation_id).single();
      if (process.env.AGENT_BRAIN_ENABLED === "true") await registerAgentDecision({ providerMessageId: input.providerMessageId, conversationId: existing.conversation_id, clientId: existingClientId, controlMode: conversation?.control_mode || "auto", text: existing.body || input.text });
    }
    return { duplicate: true };
  }
  const phone = input.phone || input.providerConversationId.split("@")[0]?.split(":")[0];
  const resolvedIdentity = await resolveInboundClient(phone);
  const identity = input.fromMe ? resolvedIdentity : await ensureTestInboundClient(resolvedIdentity);
  const correlationId = randomUUID();
  const activityColumn = input.fromMe ? { last_outbound_at: input.occurredAt } : { last_inbound_at: input.occurredAt };
  const { data: currentConversation } = await db.from("whatsapp_conversations").select("id,client_id,control_mode").eq("session_id", input.sessionId).eq("provider_conversation_id", input.providerConversationId).maybeSingle();
  const clientId = currentConversation?.client_id ?? identity.clientId;
  const { data: conversation, error } = await db.from("whatsapp_conversations").upsert({ session_id: input.sessionId, provider_conversation_id: input.providerConversationId, phone_e164: identity.phoneE164 || phone, client_id: clientId, ...activityColumn, updated_at: new Date().toISOString() }, { onConflict: "session_id,provider_conversation_id" }).select("*").single();
  if (error) throw error;
  const mode = input.manual ? "human_takeover" : conversation.control_mode;
  if (input.manual) await setConversationMode(conversation.id, mode, "crm_operator", "Mensagem manual detectada");
  const { data: persistedMessage, error: messageError } = await db.from("whatsapp_messages").insert({ conversation_id: conversation.id, client_id: conversation.client_id, provider_message_id: input.providerMessageId, direction: input.fromMe ? "outbound" : "inbound", message_type: input.messageType || "text", body: input.text, media_metadata: input.mediaMetadata || {}, status: input.fromMe ? "sent" : "received", provider_timestamp: input.occurredAt }).select("id").single();
  if (messageError?.code === "23505") return { duplicate: true };
  if (messageError) throw messageError;
  if (!input.fromMe) await db.from("agent_tasks").update({ status: "cancelled", completed_at: new Date().toISOString(), last_error: "Cancelada por mensagem recebida." }).eq("client_id", conversation.client_id).eq("status", "pending").in("task_type", ["follow_up", "send_whatsapp"]);
  const eventType = input.manual ? "MANUAL_MESSAGE_DETECTED" : input.fromMe ? "PROVIDER_MESSAGE_SENT" : "MESSAGE_RECEIVED";
  const { error: eventError } = await db.from("agent_events").insert({ client_id: conversation.client_id, entity_type: "whatsapp_conversation", entity_id: conversation.id, event_type: eventType, actor_type: input.manual ? "human" : "provider", correlation_id: correlationId, idempotency_key: `whatsapp:${input.providerMessageId}:${eventType}`, payload: { providerMessageId: input.providerMessageId, providerConversationId: input.providerConversationId, mode, messageType: input.messageType || "text", mediaMetadata: input.mediaMetadata || null, priority: input.fromMe ? null : "P0", identityResolution: identity.status } });
  if (eventError && eventError.code !== "23505") throw eventError;
  const { error: auditError } = await db.from("agent_audit_logs").insert({ client_id: conversation.client_id, correlation_id: correlationId, idempotency_key: `whatsapp:${input.providerMessageId}:inbound`, phase: "execution", action_type: "process_provider_message", status: "persisted", input: { providerMessageId: input.providerMessageId, providerConversationId: input.providerConversationId, messageType: input.messageType || "text", fromMe: Boolean(input.fromMe) }, output: { conversationId: conversation.id, clientId: conversation.client_id, controlMode: mode, identityResolution: identity.status, priority: input.fromMe ? null : "P0", mediaMetadata: input.mediaMetadata || null } });
  if (auditError && auditError.code !== "23505") throw auditError;
  if (!input.fromMe && conversation.client_id) {
    await db.from("client_events").insert({ client_id: conversation.client_id, event_type: "WhatsApp", title: "Mensagem recebida pelo WhatsApp", description: `Mensagem ${input.messageType || "text"} recebida e vinculada à conversa.` });
    if (persistedMessage?.id) await stopDispatchesOnReply(conversation.client_id, Number(persistedMessage.id));
    if (process.env.AGENT_BRAIN_ENABLED === "true") await registerAgentDecision({ providerMessageId: input.providerMessageId, conversationId: conversation.id, clientId: conversation.client_id, controlMode: mode, text: input.text });
  }
  return { duplicate: false, conversationId: conversation.id, clientId: conversation.client_id, identityResolution: identity.status, mode };
}

export async function prepareOutbound(input: { clientId: number; conversationId: string; text: string; idempotencyKey: string }) {
  const db = supabaseAdmin();
  const control = await loadAgentControl();
  if (control.killSwitch || control.outboundKillSwitch) return { allowed: false as const, reason: "Envio bloqueado pelo Kill Switch." };
  const [{ data: client }, { data: conversation }] = await Promise.all([
    db.from("clients").select("id,phone,can_contact,do_not_contact,opt_out_at").eq("id", input.clientId).single(),
    db.from("whatsapp_conversations").select("id,client_id,phone_e164,control_mode,session_id").eq("id", input.conversationId).single(),
  ]);
  if (!client || !conversation) return { allowed: false as const, reason: "Cliente ou conversa não localizado." };
  if (!client.can_contact || client.do_not_contact || client.opt_out_at) return { allowed: false as const, reason: "Cliente bloqueou contato ou fez opt-out." };
  if (conversation.control_mode !== "auto") return { allowed: false as const, reason: "Outbound automático bloqueado pelo controle humano da conversa." };
  const identity = resolveOutboundIdentity({ clientId: input.clientId, clientPhone: client.phone, conversationClientId: conversation.client_id, conversationPhone: conversation.phone_e164 });
  if (!identity.allowed) return identity;
  const providerMessageId = control.simulationMode ? `simulated-${randomUUID()}` : null;
  const { data: queued, error } = await db.from("whatsapp_messages").insert({ conversation_id: conversation.id, client_id: client.id, provider_message_id: providerMessageId || `queued-${randomUUID()}`, direction: "outbound", message_type: "text", body: input.text, status: control.simulationMode ? "simulated" : "queued", idempotency_key: input.idempotencyKey }).select("id").single();
  if (error?.code === "23505") return { allowed: false as const, reason: "Envio duplicado bloqueado." };
  if (error) throw error;
  return { allowed: true as const, simulated: control.simulationMode, providerMessageId, messageId: queued?.id, sessionId: conversation.session_id, phoneE164: identity.phoneE164 };
}

export async function confirmProviderSend(messageId: number, providerMessageId: string) {
  const { data, error } = await supabaseAdmin().from("whatsapp_messages").update({ provider_message_id: providerMessageId, status: "sent", updated_at: new Date().toISOString() }).eq("id", messageId).eq("status", "queued").select("id,status,provider_message_id").single();
  if (error) throw error;
  return data;
}

export async function failProviderSend(messageId: number, reason: string) {
  await supabaseAdmin().from("whatsapp_messages").update({ status: "failed", error_reason: reason.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", messageId).eq("status", "queued");
}

export async function setConversationMode(conversationId: string, mode: ConversationControlMode, actor: string, reason?: string) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("whatsapp_conversations").update({ control_mode: mode, takeover_at: mode === "human_takeover" ? new Date().toISOString() : null, takeover_by: mode === "human_takeover" ? actor : null, takeover_reason: reason || null, updated_at: new Date().toISOString() }).eq("id", conversationId).select("client_id,control_mode").single();
  if (error) throw error;
  await db.from("agent_events").insert({ client_id: data.client_id, entity_type: "whatsapp_conversation", entity_id: conversationId, event_type: mode === "human_takeover" ? "HUMAN_TAKEOVER_STARTED" : mode === "auto" ? "HUMAN_TAKEOVER_ENDED" : mode === "paused" ? "CONVERSATION_PAUSED" : "AGENT_OBSERVE_ONLY_STARTED", actor_type: "human", actor_id: actor, payload: { mode, reason } });
  return data;
}
