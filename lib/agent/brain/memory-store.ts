import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ExtractedFact } from "./types";

export async function persistExtractedFacts(clientId: number, facts: ExtractedFact[], sourceMessageId?: number) {
  const db = supabaseAdmin();
  for (const fact of facts) {
    if (fact.knowledgeType === "INFERENCE" && fact.confidence >= 1) throw new Error("INFERENCE não pode ser promovida a FACT sem evidência.");
    const { error } = await db.rpc("upsert_agent_client_knowledge", { p_client_id: clientId, p_key: fact.key, p_value: fact.value, p_knowledge_type: fact.knowledgeType, p_source_message_id: sourceMessageId || null, p_confidence: fact.confidence });
    if (error) throw error;
  }
}

export async function persistConversationSummary(input: { clientId: number; conversationId?: string; summary: string; lastMessageId?: number }) {
  const db = supabaseAdmin();
  const query = db.from("agent_conversation_summaries").select("version").eq("client_id", input.clientId).order("version", { ascending: false }).limit(1);
  const { data, error } = await query;
  if (error) throw error;
  const { error: insertError } = await db.from("agent_conversation_summaries").insert({ client_id: input.clientId, conversation_id: input.conversationId || null, summary: input.summary, last_message_id: input.lastMessageId || null, version: (data?.[0]?.version || 0) + 1 });
  if (insertError) throw insertError;
}
