import { supabaseAdmin } from "@/lib/supabase-admin";
import { projectLeadStage } from "@/lib/agent/lead-stage";
import type { AgentContext } from "./types";

export async function buildAgentContext(input: { clientId: number; conversationId?: string; recentMessageLimit?: number }): Promise<AgentContext> {
  const db = supabaseAdmin();
  const limit = Math.min(Math.max(input.recentMessageLimit || 12, 1), 30);
  let summaryQuery = db.from("agent_conversation_summaries").select("summary,version,last_message_id,created_at").eq("client_id", input.clientId);
  if (input.conversationId) summaryQuery = summaryQuery.eq("conversation_id", input.conversationId);
  const [clientResult, eventsResult, appointmentsResult, documentsResult, knowledgeResult, summariesResult, messagesResult, conversationResult] = await Promise.all([
    db.from("clients").select("*").eq("id", input.clientId).single(),
    db.from("client_events").select("event_type,title,description,old_stage,new_stage,occurred_at").eq("client_id", input.clientId).order("occurred_at", { ascending: false }).limit(20),
    db.from("appointments").select("kind,starts_at,status,outcome,next_action,next_action_at").eq("client_id", input.clientId).order("starts_at", { ascending: false }).limit(10),
    db.from("documents").select("id,document_type,file_name,created_at").eq("client_id", input.clientId).order("created_at", { ascending: false }).limit(30),
    db.from("agent_client_knowledge").select("key,value,knowledge_type,source_message_id,confidence,active").eq("client_id", input.clientId).eq("active", true),
    summaryQuery.order("version", { ascending: false }).limit(1),
    input.conversationId ? db.from("whatsapp_messages").select("id,direction,message_type,body,provider_timestamp,created_at").eq("conversation_id", input.conversationId).order("created_at", { ascending: false }).limit(limit) : Promise.resolve({ data: [], error: null }),
    input.conversationId ? db.from("whatsapp_conversations").select("control_mode,provider_identity").eq("id", input.conversationId).single() : Promise.resolve({ data: null, error: null }),
  ]);
  if (clientResult.error) throw clientResult.error;
  for (const result of [eventsResult, appointmentsResult, documentsResult, knowledgeResult, summariesResult, messagesResult, conversationResult]) if (result.error) throw result.error;
  const client = clientResult.data;
  return {
    client,
    stage: projectLeadStage({ funnelStage: client.funnel_stage, financeStage: client.finance_stage, postSaleStage: client.post_sale_stage }),
    labels: [],
    source: { type: client.origin_type, detail: client.origin_detail },
    projectInterest: client.project_interest,
    commercialHistory: eventsResult.data || [],
    recentMessages: [...(messagesResult.data || [])].reverse(),
    summary: summariesResult.data?.[0]?.summary || null,
    knowledge: knowledgeResult.data || [],
    missingData: [],
    objections: (knowledgeResult.data || []).filter((item) => item.key.startsWith("objection")),
    commitments: appointmentsResult.data || [],
    documents: documentsResult.data || [],
    appointments: appointmentsResult.data || [],
    creditState: client.finance_stage,
    presentedProjects: [],
    controlMode: conversationResult.data?.control_mode || "auto",
    partyType: "CLIENT",
    capabilities: ["interpret", "extract", "summarize", "propose"],
    allowedActions: ["propose_message", "propose_task", "propose_stage", "escalate_human"],
    forbiddenActions: ["direct_side_effect", "invent_financial_result", "real_outbound"],
  };
}
