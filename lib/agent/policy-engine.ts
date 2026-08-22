import type { AgentControl, ContactPolicyContext, GateOutcome, StructuredDecision } from "./types.ts";

const outboundActions = new Set(["send_whatsapp"]);

export function evaluatePolicy(
  decision: StructuredDecision,
  control: AgentControl,
  contact?: ContactPolicyContext,
): GateOutcome {
  if (control.killSwitch) return denied("Kill Switch global ativo.");
  if (outboundActions.has(decision.action) && control.outboundKillSwitch)
    return denied("Kill Switch de saída ativo.");

  const capabilityLevel = control.capabilityLevels[decision.capability] || control.globalMode;
  if (capabilityLevel === "disabled") return denied("Capacidade desativada.");

  if (outboundActions.has(decision.action)) {
    if (!contact) return denied("Contexto de permissão de contato ausente.");
    if (!contact.canContact || contact.doNotContact || contact.optedOutAt)
      return denied("Cliente não pode ser contatado.");
    if (contact.localHour < contact.allowedStartHour || contact.localHour >= contact.allowedEndHour)
      return denied("Fora do horário permitido.");
  }

  return {
    allowed: true,
    requiresApproval: capabilityLevel !== "automatic",
    simulation: control.simulationMode,
    reason: capabilityLevel === "automatic" ? "Política autorizou execução." : "Revisão humana obrigatória.",
  };
}
function denied(reason: string): GateOutcome {
  return { allowed: false, requiresApproval: false, simulation: false, reason };
}
