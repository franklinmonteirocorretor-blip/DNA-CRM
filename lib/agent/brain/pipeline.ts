import { LLMProviderRegistry } from "./provider-registry.ts";
import type { AgentContext, AgentDecision, EvaluationResult } from "./types.ts";

export type SimulationEffect = { type: "MESSAGE_PROPOSAL" | "STAGE_PROPOSAL" | "FOLLOW_UP_PROPOSAL" | "HUMAN_ESCALATION"; payload: Record<string, unknown> };
export type BrainPipelineResult = { decision: AgentDecision; evaluation: EvaluationResult; provider: { decision: string; evaluation: string }; simulation: true; effects: SimulationEffect[] };
export class AgentBrainPipeline {
  private readonly registry: LLMProviderRegistry;
  constructor(registry: LLMProviderRegistry) { this.registry = registry; }
  async simulate(context: AgentContext): Promise<BrainPipelineResult> {
    const decision = await this.registry.withFallback((provider) => provider.decide(context));
    const decisionProvider = this.registry.getLastUsedProvider();
    const evaluation = await this.registry.withFallback((provider) => provider.evaluate({ context, decision }));
    const evaluationProvider = this.registry.getLastUsedProvider();
    const effects: SimulationEffect[] = [];
    if (decision.proposedMessage) effects.push({ type: "MESSAGE_PROPOSAL", payload: { message: decision.proposedMessage } });
    if (decision.proposedStage) effects.push({ type: "STAGE_PROPOSAL", payload: { stage: decision.proposedStage } });
    if (decision.followUp) effects.push({ type: "FOLLOW_UP_PROPOSAL", payload: { ...decision.followUp } });
    if (decision.requiresHuman) effects.push({ type: "HUMAN_ESCALATION", payload: { rationaleCode: decision.rationaleCode } });
    return { decision, evaluation, provider: { decision: decisionProvider, evaluation: evaluationProvider }, simulation: true, effects };
  }
}
