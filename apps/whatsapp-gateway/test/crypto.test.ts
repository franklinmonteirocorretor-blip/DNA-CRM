import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptJson, encryptJson } from "../src/crypto.js";
import { reconnectPlan } from "../src/recovery.js";

test("auth state encryption round-trip and random IV", () => {
  const key = randomBytes(32); const input = { secret: Buffer.from("signal-key"), nested: [1, 2, 3] };
  const first = encryptJson(input, key); const second = encryptJson(input, key);
  assert.notEqual(first.iv, second.iv);
  assert.deepEqual(decryptJson(first, key), { secret: { type: "Buffer", data: [...Buffer.from("signal-key")] }, nested: [1, 2, 3] });
});

test("ciphertext adulterado não pode ser recuperado", () => {
  const key = randomBytes(32); const encrypted = encryptJson({ secret: "x" }, key);
  encrypted.authTag = Buffer.alloc(16).toString("base64");
  assert.throws(() => decryptJson(encrypted, key));
});

test("circuit breaker abre na quinta falha", () => {
  assert.equal(reconnectPlan(4).openCircuit, false);
  assert.equal(reconnectPlan(5).openCircuit, true);
  assert.equal(reconnectPlan(0).waitMs, 1_000);
  assert.equal(reconnectPlan(3).waitMs, 8_000);
  assert.equal(reconnectPlan(6).waitMs, 60_000);
  assert.equal(reconnectPlan(20).waitMs, 60_000);
});
