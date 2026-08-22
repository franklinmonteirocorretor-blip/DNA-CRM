import type { AgentControl, GateOutcome, StructuredDecision } from "./types.ts";

export function evaluateConfidence(
  decision: StructuredDecision,
  control: AgentControl,
  policy: GateOutcome,
): GateOutcome {
  if (!policy.allowed) return policy;
  const score = Number.isFinite(decision.confidence) ? decision.confidence : 0;
  if (score < control.confidenceThresholds.suggest)
    return { allowed: false, requiresApproval: false, simulation: false, reason: "Confiança insuficiente até para sugestão." };
  if (score < control.confidenceThresholds.automatic)
    return { ...policy, requiresApproval: true, reason: "Confiança exige revisão humana." };
  return policy;
}
