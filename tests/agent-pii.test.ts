import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeProviderOutput, hasUnsafeProviderOutput, PIIRedactionService, UnsafePIIPlaceholderError, UnsafeProviderOutputError } from "../lib/agent/brain/pii-redaction.ts";
import type { AgentContext } from "../lib/agent/brain/types.ts";

const pii = new PIIRedactionService();

test("redige PII textual conservando dados comerciais", () => {
  const text = pii.redactText("CPF 123.456.789-00, RG 12.345.678-9, CNH 12345678901, +5586999999999, maria@email.com, Rua Flores, 123. Renda R$ 3.200, entrada R$ 20.000, 2 dependentes.");
  assert.match(text, /CPF_REDACTED/);
  assert.match(text, /RG_REDACTED/);
  assert.match(text, /CNH_REDACTED/);
  assert.match(text, /PHONE_REDACTED/);
  assert.match(text, /EMAIL_REDACTED/);
  assert.match(text, /ADDRESS_REDACTED/);
  assert.match(text, /Renda R\$ 3\.200/);
  assert.match(text, /entrada R\$ 20\.000/);
  assert.match(text, /2 dependentes/);
});

test("redige URLs, storage paths, banco e segredos", () => {
  const text = pii.redactText("agência 1234 conta 12345-6 https://storage.test/doc.pdf whatsapp-media/a/b.pdf Bearer gsk_abcdefghijklmnopqrstuvwxyz");
  assert.doesNotMatch(text, /1234|12345|storage\.test|a\/b\.pdf|gsk_/);
  assert.match(text, /BANK_REDACTED/);
  assert.match(text, /URL_REDACTED/);
  assert.match(text, /PATH_REDACTED/);
  assert.match(text, /SECRET_REDACTED/);
});

test("minimiza contexto por allowlist e nome conhecido", () => {
  const context: AgentContext = {
    clientId: 42,
    clientName: "Maria da Silva",
    client: { id: 42, name: "Maria da Silva", cpf: "123.456.789-00", monthly_income: 3200, secret_note: "não vazar" },
    stage: "qualification",
    source: { type: "referral", detail: "Maria da Silva indicou" },
    recentMessages: [{ id: 91, direction: "inbound", body: "Sou Maria da Silva, telefone (86) 99999-9999. Minha renda é 3200.", provider_identity: "5586999999999" }],
    summary: "Maria da Silva quer morar e tem renda de R$ 3.200.",
    facts: [
      { key: "cpf", value: "123.456.789-00", knowledgeType: "FACT", confidence: 1, active: true, sourceMessageId: "91" },
      { key: "monthly_income", value: 3200, knowledgeType: "FACT", confidence: 1, active: true },
      { key: "marital_status", value: "casada", knowledgeType: "FACT", confidence: 1, active: true },
    ],
    catalogMatches: [{ id: 7, name: "Residencial Monte Verde", builderName: "Construtora Alfa", salePrice: 240000, city: "Teresina" }],
    allowedActions: ["propose_message"],
    forbiddenActions: ["real_outbound"],
  };
  const safe = pii.minimizeContext(context);
  assert.equal(safe.clientId, undefined);
  assert.equal(safe.clientName, undefined);
  assert.equal(safe.client, undefined);
  assert.deepEqual(safe.source, { type: "referral" });
  assert.doesNotMatch(JSON.stringify(safe), /Maria da Silva|123\.456|558699|"id":91|secret_note/);
  assert.match(JSON.stringify(safe), /CLIENTE|PHONE_REDACTED|CPF_REDACTED/);
  assert.equal(safe.facts?.find(({ key }) => key === "monthly_income")?.value, 3200);
  assert.equal(safe.facts?.find(({ key }) => key === "marital_status")?.value, "casada");
  assert.equal(safe.catalogMatches?.[0]?.salePrice, 240000);
  assert.equal(safe.catalogMatches?.[0]?.name, "Residencial Monte Verde");
});

test("redige campos sensíveis aninhados sem apagar bairro", () => {
  const safe = pii.minimizeContext({
    stage: "new",
    recentMessages: [],
    knowledge: [{ phone: "86999999999", email: "x@y.com", address: "Rua A 1", neighborhood: "Zona Leste", income: 4500, dependents: 2 }],
    allowedActions: [],
    forbiddenActions: [],
  });
  assert.deepEqual(safe.knowledge, [{ phone: "PHONE_REDACTED", email: "EMAIL_REDACTED", address: "ADDRESS_REDACTED", neighborhood: "Zona Leste", income: 4500, dependents: 2 }]);
});

test("redige chaves camelCase, nascimento e CEP", () => {
  const safe = pii.sanitizeValue({
    cpfNumber: "12345678900",
    documentNumber: "ABC123",
    storagePath: "private/client/doc.pdf",
    bankAccount: "12345-6",
    dateOfBirth: "01/02/1990",
    nascimento: "01/02/1990",
    cep: "64000-000",
    monthlyIncome: 6200,
  });
  assert.deepEqual(safe, {
    cpfNumber: "CPF_REDACTED",
    documentNumber: "DOCUMENT_REDACTED",
    storagePath: "DOCUMENT_REDACTED",
    bankAccount: "BANK_REDACTED",
    dateOfBirth: "BIRTH_DATE_REDACTED",
    nascimento: "BIRTH_DATE_REDACTED",
    cep: "CEP_REDACTED",
    monthlyIncome: 6200,
  });
});

test("redige nascimento e CEP rotulados no texto", () => {
  const safe = pii.redactText("Nascimento: 01/02/1990, CEP 64000-000, renda R$ 4.500.");
  assert.match(safe, /BIRTH_DATE_REDACTED/);
  assert.match(safe, /CEP_REDACTED/);
  assert.match(safe, /renda R\$ 4\.500/);
});

test("guarda detecta placeholders e facts sensíveis em qualquer profundidade", () => {
  assert.equal(hasUnsafeProviderOutput({ proposedMessage: "Confirme CPF_REDACTED" }), true);
  assert.equal(hasUnsafeProviderOutput({ extractedFacts: [{ key: "cpfNumber", value: "x" }] }), true);
  assert.equal(hasUnsafeProviderOutput({ result: { bankAccount: "x" } }), true);
  assert.equal(hasUnsafeProviderOutput({ extractedFacts: [{ key: "monthly_income", value: 3200 }] }), false);
});

test("guarda rejeita output sensível e aceita decisão comercial", () => {
  assert.throws(() => assertSafeProviderOutput({ nested: [{ key: "dateOfBirth", value: "x" }] }), UnsafeProviderOutputError);
  assert.doesNotThrow(() => assertSafeProviderOutput({ extractedFacts: [{ key: "income", value: 3200 }], proposedMessage: "Seguimos com a pré-análise." }));
});

test("renderer restaura somente primeiro nome seguro", () => {
  assert.equal(pii.renderResponse("CLIENTE, seguimos daqui.", { clientFirstName: "Maria da Silva" }), "Maria, seguimos daqui.");
  assert.equal(pii.renderResponse("Olá, {{ CLIENTE }}.", { clientFirstName: "José" }), "Olá, José.");
  assert.equal(pii.renderResponse("CLIENTE, seguimos.", { clientFirstName: "<script>" }), "cliente, seguimos.");
});

for (const placeholder of ["PHONE_REDACTED", "CPF_REDACTED", "RG_REDACTED", "CNH_REDACTED", "EMAIL_REDACTED", "ADDRESS_REDACTED", "DOCUMENT_REDACTED", "BANK_REDACTED", "URL_REDACTED", "PATH_REDACTED", "TOKEN_REDACTED", "SECRET_REDACTED", "BIRTH_DATE_REDACTED", "CEP_REDACTED"]) {
  test(`renderer bloqueia ${placeholder}`, () => {
    assert.throws(() => pii.renderResponse(`Confirme ${placeholder}.`, { clientFirstName: "Maria" }), UnsafePIIPlaceholderError);
  });
}
