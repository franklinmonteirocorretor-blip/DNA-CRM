import type { AgentContext, AgentDecision, ConversationSummary, EvaluationInput, EvaluationResult, ExtractionInput, ExtractionResult, LLMProvider, SummarizeInput } from "./types";

type ProviderOptions = { baseUrl: string; model: string; apiKeyRef: string; timeoutMs?: number };

export class OpenAICompatibleProvider implements LLMProvider {
  private readonly options: ProviderOptions;
  constructor(options: ProviderOptions) { this.options = options; }
  private async complete<T>(system: string, input: unknown): Promise<T> {
    const apiKey = process.env[this.options.apiKeyRef];
    if (!apiKey) throw new Error(`API key ref ausente: ${this.options.apiKeyRef}`);
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.options.model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }] }),
      signal: AbortSignal.timeout(this.options.timeoutMs || 20_000),
    });
    if (!response.ok) throw new Error(`LLM provider HTTP ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM provider retornou conteúdo vazio.");
    return JSON.parse(content) as T;
  }
  decide(context: AgentContext) { return this.complete<AgentDecision>("Retorne somente AgentDecision JSON. Nunca execute efeitos, invente dados financeiros ou revele raciocínio interno.", context); }
  extract(input: ExtractionInput) { return this.complete<ExtractionResult>("Extraia somente evidência explícita. INFERENCE nunca é FACT. Retorne JSON.", input); }
  summarize(input: SummarizeInput) { return this.complete<ConversationSummary>("Crie resumo incremental factual. Preserve objeções e compromissos. Retorne JSON.", input); }
  evaluate(input: EvaluationInput) { return this.complete<EvaluationResult>("Avalie decisão por segurança, estágio e fatos. Retorne JSON sem chain-of-thought.", input); }
}
