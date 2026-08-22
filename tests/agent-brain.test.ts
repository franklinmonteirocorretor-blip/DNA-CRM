import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicLLMProvider } from "../lib/agent/brain/deterministic-provider.ts";
import { AgentBrainPipeline } from "../lib/agent/brain/pipeline.ts";
import { LLMProviderRegistry } from "../lib/agent/brain/provider-registry.ts";
import type { AgentContext, IntentType, NextBestAction } from "../lib/agent/brain/types.ts";

const provider = new DeterministicLLMProvider();
const context = (text: string, controlMode = "auto", stage = "new"): AgentContext => ({ clientId: 9001, clientName: "Cliente", partyType: "CLIENT", stage, recentMessages: [{ id: 1, direction: "inbound", body: text }], controlMode, allowedActions: ["propose"], forbiddenActions: ["direct_side_effect", "real_outbound"] });

const cases: Array<{ text: string; intent: IntentType; action: NextBestAction }> = [
  { text: "Quanto vou financiar?", intent: "FINANCING_REQUEST", action: "EXPLAIN_PRE_ANALYSIS" },
  { text: "Qual será minha parcela?", intent: "FINANCING_REQUEST", action: "EXPLAIN_PRE_ANALYSIS" },
  { text: "Quanto vou receber de subsídio?", intent: "FINANCING_REQUEST", action: "EXPLAIN_PRE_ANALYSIS" },
  { text: "Quero falar com atendente humano", intent: "HUMAN_REQUEST", action: "ESCALATE_HUMAN" },
  { text: "Minha renda é R$ 3.200", intent: "QUALIFICATION_DATA", action: "ASK_PROFILE" },
  { text: "Quero visitar o imóvel", intent: "VISIT_REQUEST", action: "SCHEDULE_VISIT" },
  { text: "A entrada está alta", intent: "OBJECTION_ENTRY", action: "HANDLE_OBJECTION" },
  { text: "Vou pensar e falar com minha esposa", intent: "OBJECTION_PARTNER_DECISION", action: "HANDLE_OBJECTION" },
  { text: "Enviei meu RG em anexo", intent: "DOCUMENT_SENT", action: "REQUEST_MISSING_DOCUMENT" },
];

for (const fixture of cases) test(`classifica: ${fixture.text}`, async () => {
  const decision = await provider.decide(context(fixture.text, "auto", fixture.intent === "VISIT_REQUEST" ? "approved" : "new"));
  assert.ok(decision.intents.some(({ type }) => type === fixture.intent));
  assert.equal(decision.nextBestAction, fixture.action);
});

test("segurança financeira não inventa aprovação, parcela ou subsídio", async () => {
  const decision = await provider.decide(context("Qual será minha parcela e subsídio?"));
  assert.match(decision.proposedMessage || "", /pré-análise/);
  assert.doesNotMatch(decision.proposedMessage || "", /R\$\s*\d|aprovad[oa]|parcela (será|fica)/i);
});

test("pedido humano exige escalada e não gera resposta automática", async () => {
  const decision = await provider.decide(context("Quero falar com uma pessoa de verdade"));
  assert.equal(decision.requiresHuman, true);
  assert.equal(decision.nextBestAction, "ESCALATE_HUMAN");
  assert.equal(decision.proposedMessage, undefined);
});

test("takeover interpreta, mas bloqueia mensagem", async () => {
  const decision = await provider.decide(context("Minha renda é R$ 3.200", "human_takeover"));
  assert.equal(decision.extractedFacts[0]?.value, 3200);
  assert.equal(decision.requiresHuman, true);
  assert.equal(decision.proposedMessage, undefined);
});

test("pipeline gera somente efeitos simulados", async () => {
  const result = await new AgentBrainPipeline(new LLMProviderRegistry()).simulate(context("Quero visitar o imóvel"));
  assert.equal(result.simulation, true);
  assert.ok(result.effects.some(({ type }) => type === "MESSAGE_PROPOSAL"));
  assert.equal("outboundSent" in result, false);
});
