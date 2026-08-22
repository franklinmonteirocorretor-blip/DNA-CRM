import { extractFacts } from "./fact-extractor.ts";
import { calculateNextBestAction } from "./next-best-action.ts";
import { generateResponse } from "./response-generator.ts";
import { chooseSalesStrategy } from "./strategy-engine.ts";
import type { AgentContext, AgentDecision, ConversationSummary, EvaluationInput, EvaluationResult, ExtractionInput, LLMProvider, SummarizeInput } from "./types.ts";

export class DeterministicLLMProvider implements LLMProvider {
  async decide(context: AgentContext): Promise<AgentDecision> {
    const latest = [...context.recentMessages].reverse().find((message) => message.direction.toLowerCase() === "inbound");
    const extraction = extractFacts({ text: latest?.text || latest?.body || "", sourceMessageId: String(latest?.id || "") || undefined, knownFacts: context.facts });
    const types = extraction.intents.map((intent) => intent.type);
    const strategy = chooseSalesStrategy(context, types);
    const nextBestAction = calculateNextBestAction(context, types, strategy);
    const mode = context.takeoverMode || context.controlMode?.toUpperCase() || "AUTO";
    const requiresHuman = nextBestAction === "ESCALATE_HUMAN" || mode !== "AUTO";
    return {
      intents: extraction.intents,
      extractedFacts: extraction.facts.map(({ key, value, knowledgeType, confidence }) => ({ key, value, knowledgeType: knowledgeType === "INFERENCE" ? "INFERENCE" : "FACT", confidence })),
      strategy, nextBestAction,
      proposedMessage: generateResponse(context, strategy, nextBestAction),
      confidence: Math.min(...extraction.intents.map((intent) => intent.confidence), requiresHuman ? 0.99 : 0.95),
      requiresHuman,
      rationaleCode: requiresHuman ? "HUMAN_CONTROL_REQUIRED" : `DETERMINISTIC_${nextBestAction}`,
    };
  }
  async extract(input: ExtractionInput) { return extractFacts(input); }
  async summarize(input: SummarizeInput): Promise<ConversationSummary> {
    const recent = input.messages.slice(-6).map((message) => `${message.direction === "INBOUND" ? "Cliente" : "Monteiro"}: ${(message.text || message.body || "").trim()}`).join(" ");
    return { summary: [input.previousSummary, recent].filter(Boolean).join(" ").slice(-2000), commitments: [], objections: [] };
  }
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const reasons: string[] = [];
    if (input.decision.proposedMessage && /(?:aprovad[oa]|subs[ií]dio de r\$|parcela (?:ser[aá]|fica))/i.test(input.decision.proposedMessage)) reasons.push("UNVERIFIED_FINANCIAL_CLAIM");
    const mode = input.context.takeoverMode || input.context.controlMode?.toUpperCase() || "AUTO";
    if (mode !== "AUTO" && input.decision.proposedMessage) reasons.push("HUMAN_CONTROL_ACTIVE");
    return { valid: reasons.length === 0, confidence: reasons.length ? 0 : input.decision.confidence, reasonCodes: reasons };
  }
}
