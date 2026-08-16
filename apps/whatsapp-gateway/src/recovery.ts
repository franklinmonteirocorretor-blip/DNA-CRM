export function reconnectPlan(failures: number) {
  return { openCircuit: failures >= 5, waitMs: Math.min(60_000, 2 ** Math.min(failures, 6) * 1_000) };
}
