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
  const { error } = await db.rpc("append_agent_conversation_summary", { p_client_id: input.clientId, p_conversation_id: input.conversationId || null, p_summary: input.summary, p_last_message_id: input.lastMessageId || null });
  if (error) throw error;
}

export async function commitAgentMemory(input: { clientId: number; conversationId?: string; summary: string; lastMessageId?: number; facts: ExtractedFact[] }) {
  const { data, error } = await supabaseAdmin().rpc("commit_agent_memory", {
    p_client_id: input.clientId,
    p_conversation_id: input.conversationId || null,
    p_summary: input.summary,
    p_last_message_id: input.lastMessageId || null,
    p_facts: input.facts,
  });
  if (error) throw error;
  return data;
}
