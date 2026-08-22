import { DeterministicLLMProvider } from "./deterministic-provider.ts";
import type { LLMProvider, LLMProviderConfig } from "./types.ts";

type RegisteredProvider = { provider: LLMProvider; config: LLMProviderConfig };
export class LLMProviderRegistry {
  private readonly providers = new Map<string, RegisteredProvider>();
  private readonly fallback: LLMProvider;
  constructor(fallback: LLMProvider = new DeterministicLLMProvider()) { this.fallback = fallback; }
  register(config: LLMProviderConfig, provider: LLMProvider) { this.providers.set(config.provider, { config: { ...config }, provider }); }
  get(name: string) { const item = this.providers.get(name); return item?.config.enabled ? item.provider : undefined; }
  ordered() { return [...this.providers.values()].filter(({ config }) => config.enabled).sort((a, b) => a.config.priority - b.config.priority); }
  async withFallback<T>(operation: (provider: LLMProvider) => Promise<T>): Promise<T> {
    for (const { provider } of this.ordered()) { try { return await operation(provider); } catch { /* try next configured provider */ } }
    return operation(this.fallback);
  }
}
