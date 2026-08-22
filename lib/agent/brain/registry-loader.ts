import { supabaseAdmin } from "@/lib/supabase-admin";
import { GROQ_API_BASE_URL, GroqLLMProvider } from "./groq-llm-provider";
import { LLMProviderRegistry } from "./provider-registry";

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export async function loadLLMProviderRegistry() {
  const registry = new LLMProviderRegistry();
  const { data, error } = await supabaseAdmin().from("agent_llm_providers").select("provider,model,api_key_ref,base_url,enabled,priority").eq("enabled", true).order("priority");
  if (error) throw error;
  for (const config of data || []) {
    if (!config.api_key_ref) continue;
    if (config.provider.trim().toLowerCase() === "groq") {
      if (config.base_url && config.base_url.replace(/\/$/, "") !== GROQ_API_BASE_URL) continue;
      try {
        registry.register(
          { provider: config.provider, model: config.model, apiKeyRef: config.api_key_ref, baseUrl: GROQ_API_BASE_URL, enabled: config.enabled, priority: config.priority },
          new GroqLLMProvider({
            model: config.model,
            apiKeyRef: config.api_key_ref,
            timeoutMs: boundedInteger(process.env.GROQ_LLM_TIMEOUT_MS, 20_000, 10, 60_000),
            maxRetries: boundedInteger(process.env.GROQ_LLM_MAX_RETRIES, 1, 0, 3),
          }),
        );
      } catch {
        // Invalid provider rows cannot disable remaining providers or deterministic fallback.
      }
      continue;
    }
    // External adapters remain disabled until they implement equivalent PII, ZDR and schema controls.
  }
  return registry;
}
