import assert from "node:assert/strict";
import test from "node:test";
import { calculateClosingValues } from "../lib/closing-math.ts";

test("calcula bônus, entrada e VGV pelo valor bruto do imóvel", () => {
  const result = calculateClosingValues({
    listedPrice: 234_750,
    negotiatedPrice: 250_000,
    financing: 200_000,
    subsidy: 0,
    fixedEntryItems: [500, 5_000],
  });

  assert.deepEqual(result, {
    bonus: 15_250,
    netPropertyValue: 219_500,
    entryRequired: 19_500,
    fixedEntryDistribution: 5_500,
    monthlyTotal: 14_000,
    vgv: 234_750,
  });
});

test("não cria bônus negativo e nunca distribui saldo negativo", () => {
  const result = calculateClosingValues({
    listedPrice: 250_000,
    negotiatedPrice: 240_000,
    financing: 200_000,
    subsidy: 20_000,
    fixedEntryItems: [40_000],
  });

  assert.equal(result.bonus, 0);
  assert.equal(result.entryRequired, 30_000);
  assert.equal(result.monthlyTotal, 0);
  assert.equal(result.vgv, 250_000);
});
