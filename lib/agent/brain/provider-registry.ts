import { DeterministicLLMProvider } from "./deterministic-provider.ts";
import type { LLMProvider, LLMProviderConfig } from "./types.ts";

type RegisteredProvider = { provider: LLMProvider; config: LLMProviderConfig };
export class LLMProviderRegistry {
  private readonly providers = new Map<string, RegisteredProvider>();
  private readonly fallback: LLMProvider;
  private lastUsedProvider = "deterministic-fallback";
  constructor(fallback: LLMProvider = new DeterministicLLMProvider()) { this.fallback = fallback; }
  private key(provider: string, model: string) { return JSON.stringify([provider, model]); }
  register(config: LLMProviderConfig, provider: LLMProvider) { this.providers.set(this.key(config.provider, config.model), { config: { ...config }, provider }); }
  get(name: string, model?: string) {
    if (model) {
      const item = this.providers.get(this.key(name, model));
      return item?.config.enabled ? item.provider : undefined;
    }
    return this.ordered().find(({ config }) => config.provider === name)?.provider;
  }
  ordered() { return [...this.providers.values()].filter(({ config }) => config.enabled).sort((a, b) => a.config.priority - b.config.priority); }
  async withFallback<T>(operation: (provider: LLMProvider) => Promise<T>): Promise<T> {
    for (const { provider, config } of this.ordered()) { try { const result = await operation(provider); this.lastUsedProvider = config.provider; return result; } catch { /* try next configured provider */ } }
    const result = await operation(this.fallback);
    this.lastUsedProvider = "deterministic-fallback";
    return result;
  }
  getLastUsedProvider() { return this.lastUsedProvider; }
}
