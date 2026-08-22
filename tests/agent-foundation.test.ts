import assert from "node:assert/strict";
import test from "node:test";
import { runActionPipeline, SimulationExecutor } from "../lib/agent/action-pipeline.ts";
import { evaluateConfidence } from "../lib/agent/confidence-gate.ts";
import { canTransitionLead, projectLeadStage } from "../lib/agent/lead-stage.ts";
import { evaluatePolicy } from "../lib/agent/policy-engine.ts";
import { orderPriorityQueue } from "../lib/agent/priority-queue.ts";
import type { AgentControl, StructuredDecision } from "../lib/agent/types.ts";

const control: AgentControl = {
  globalMode: "automatic",
  capabilityLevels: {},
  killSwitch: false,
  outboundKillSwitch: false,
  simulationMode: true,
  confidenceThresholds: { suggest: 0.55, approval: 0.75, automatic: 0.9 },
};

const decision: StructuredDecision = {
  clientId: 4423,
  action: "create_task",
  capability: "cadence",
  reason: "Próxima ação vencida",
  confidence: 0.95,
  idempotencyKey: "cadence:4423:2026-08-16",
  payload: { taskType: "follow_up" },
  proposedAt: "2026-08-16T12:00:00.000Z",
};

test("projeta etapa canônica sem duplicar estado persistido", () => {
  assert.equal(projectLeadStage({ funnelStage: "Pasta", financeStage: "Aguardando documentação" }), "awaiting_documents");
  assert.equal(projectLeadStage({ financeStage: "Aprovado" }), "approved");
  assert.equal(canTransitionLead("approved", "negotiating"), true);
  assert.equal(canTransitionLead("prospecting", "sold"), false);
});

test("policy engine bloqueia opt-out e kill switch", () => {
  const contact = { canContact: true, doNotContact: true, localHour: 10, allowedStartHour: 8, allowedEndHour: 20 };
  assert.equal(evaluatePolicy({ ...decision, action: "send_whatsapp" }, control, contact).allowed, false);
  assert.equal(evaluatePolicy(decision, { ...control, killSwitch: true }).allowed, false);
});

test("confidence gate exige humano abaixo do limiar automático", () => {
  const policy = evaluatePolicy({ ...decision, confidence: 0.8 }, control);
  const result = evaluateConfidence({ ...decision, confidence: 0.8 }, control, policy);
  assert.equal(result.allowed, true);
  assert.equal(result.requiresApproval, true);
});

test("fila ordena prioridade, vencimento e criação", () => {
  const items = orderPriorityQueue([
    { id: 1, priority: "P2" as const, dueAt: "2026-08-16T09:00:00Z", createdAt: "2026-08-15T09:00:00Z" },
    { id: 2, priority: "P0" as const, dueAt: "2026-08-17T09:00:00Z", createdAt: "2026-08-15T09:00:00Z" },
    { id: 3, priority: "P2" as const, dueAt: "2026-08-16T08:00:00Z", createdAt: "2026-08-15T09:00:00Z" },
  ]);
  assert.deepEqual(items.map((item) => item.id), [2, 3, 1]);
});

test("pipeline simula, lê retorno e reserva idempotência", async () => {
  const keys = new Set<string>();
  const ledger = {
    async reserve(key: string) { if (keys.has(key)) return false; keys.add(key); return true; },
    async finish() {},
  };
  const result = await runActionPipeline({ decision, control, executor: new SimulationExecutor(), ledger });
  assert.equal(result.status, "simulated");
  assert.equal(result.readBack?.simulated, true);
  const duplicate = await runActionPipeline({ decision, control, executor: new SimulationExecutor(), ledger });
  assert.equal(duplicate.status, "blocked");
});
