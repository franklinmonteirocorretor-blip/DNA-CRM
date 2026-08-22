import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneE164, resolveOutboundIdentity } from "../lib/agent/whatsapp/identity-resolver.ts";
import { SimulationWhatsAppProvider } from "../lib/agent/whatsapp/simulation-provider.ts";

test("normaliza telefone sem inferir identidade ausente", () => {
  assert.equal(normalizePhoneE164("(86) 99999-9999"), "+5586999999999");
  assert.equal(normalizePhoneE164("558699067923"), "+5586999067923");
  assert.equal(normalizePhoneE164("123"), null);
});

test("identity resolver bloqueia cliente ou telefone divergente", () => {
  assert.equal(resolveOutboundIdentity({ clientId: 1, clientPhone: "86999999999", conversationClientId: 2, conversationPhone: "86999999999" }).allowed, false);
  assert.equal(resolveOutboundIdentity({ clientId: 1, clientPhone: "86999999999", conversationClientId: 1, conversationPhone: "86988888888" }).allowed, false);
  assert.equal(resolveOutboundIdentity({ clientId: 1, clientPhone: "86999999999", conversationClientId: 1, conversationPhone: "86999999999" }).allowed, true);
});

test("simulation provider não cria efeito externo", async () => {
  const provider = new SimulationWhatsAppProvider();
  const result = await provider.sendText({ sessionId: "x", conversationId: "y", text: "teste", idempotencyKey: "unique-test-key" });
  assert.match(result.providerMessageId, /^simulated-/);
  assert.equal((await provider.getSessionHealth("x")).connected, false);
});
