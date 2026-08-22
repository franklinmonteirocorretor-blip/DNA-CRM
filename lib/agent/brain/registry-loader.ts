import { supabaseAdmin } from "@/lib/supabase-admin";
import { LLMProviderRegistry } from "./provider-registry";
import { OpenAICompatibleProvider } from "./openai-compatible-provider";

export async function loadLLMProviderRegistry() {
  const registry = new LLMProviderRegistry();
  const { data, error } = await supabaseAdmin().from("agent_llm_providers").select("provider,model,api_key_ref,base_url,enabled,priority").eq("enabled", true).order("priority");
  if (error) throw error;
  for (const config of data || []) {
    if (!config.base_url || !config.api_key_ref) continue;
    registry.register({ provider: config.provider, model: config.model, apiKeyRef: config.api_key_ref, baseUrl: config.base_url, enabled: config.enabled, priority: config.priority }, new OpenAICompatibleProvider({ baseUrl: config.base_url, model: config.model, apiKeyRef: config.api_key_ref }));
  }
  return registry;
}
