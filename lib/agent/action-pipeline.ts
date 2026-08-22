import { evaluateConfidence } from "./confidence-gate.ts";
import { evaluatePolicy } from "./policy-engine.ts";
import type { AgentControl, ContactPolicyContext, StructuredDecision } from "./types.ts";

export type ExecutionResult = {
  status: "simulated" | "executed" | "blocked" | "approval_required";
  output: Record<string, unknown>;
  readBack?: Record<string, unknown>;
};

export interface ActionExecutor {
  execute(decision: StructuredDecision): Promise<Record<string, unknown>>;
  readBack(decision: StructuredDecision): Promise<Record<string, unknown>>;
}
export interface ExecutionLedger {
  reserve(idempotencyKey: string, decision: StructuredDecision): Promise<boolean>;
  finish(idempotencyKey: string, result: ExecutionResult): Promise<void>;
}

export class SimulationExecutor implements ActionExecutor {
  async execute(decision: StructuredDecision) {
    return { simulated: true, action: decision.action, payload: decision.payload };
  }
  async readBack(decision: StructuredDecision) {
    return { simulated: true, clientId: decision.clientId, persisted: false };
  }
}

export async function runActionPipeline(input: {
  decision: StructuredDecision;
  control: AgentControl;
  contact?: ContactPolicyContext;
  executor: ActionExecutor;
  simulationExecutor?: ActionExecutor;
  ledger: ExecutionLedger;
}): Promise<ExecutionResult> {
  const policy = evaluatePolicy(input.decision, input.control, input.contact);
  const gate = evaluateConfidence(input.decision, input.control, policy);
  if (!gate.allowed) return { status: "blocked", output: { reason: gate.reason } };
  if (gate.requiresApproval) return { status: "approval_required", output: { reason: gate.reason } };

  const reserved = await input.ledger.reserve(input.decision.idempotencyKey, input.decision);
  if (!reserved) return { status: "blocked", output: { reason: "Ação duplicada bloqueada pela idempotência." } };

  const executor = gate.simulation ? input.simulationExecutor || new SimulationExecutor() : input.executor;
  const output = await executor.execute(input.decision);
  const readBack = await executor.readBack(input.decision);
  const result: ExecutionResult = { status: gate.simulation ? "simulated" : "executed", output, readBack };
  await input.ledger.finish(input.decision.idempotencyKey, result);
  return result;
}
