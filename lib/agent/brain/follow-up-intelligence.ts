import type { SalesStrategy } from "./types.ts";

export type FollowUpInput = { stage: string; lastInteractionAt: string; commitment?: string; temperature?: "HOT" | "WARM" | "COLD"; objection?: string; attemptCount: number; hasNewInbound?: boolean };
export type FollowUpDecision = { shouldFollowUp: boolean; scheduledAt?: string; strategy: SalesStrategy; reason: string };
export function decideFollowUp(input: FollowUpInput, now = new Date()): FollowUpDecision {
  if (input.hasNewInbound) return { shouldFollowUp: false, strategy: "FOLLOW_UP", reason: "INBOUND_PRIORITY" };
  if (["sold", "post_sale", "lost"].includes(input.stage)) return { shouldFollowUp: false, strategy: "NURTURE", reason: "TERMINAL_STAGE" };
  if (input.attemptCount >= 6) return { shouldFollowUp: false, strategy: "NURTURE", reason: "CADENCE_EXHAUSTED" };
  const cadence = [0, 1, 3, 7, 15, 30];
  const scheduled = new Date(now);
  scheduled.setUTCDate(scheduled.getUTCDate() + cadence[Math.min(input.attemptCount, cadence.length - 1)]);
  const strategy: SalesStrategy = input.attemptCount > 2 ? "REACTIVATION" : input.objection ? "OBJECTION_HANDLING" : "FOLLOW_UP";
  return { shouldFollowUp: true, scheduledAt: scheduled.toISOString(), strategy, reason: input.commitment ? "CLIENT_COMMITMENT" : "CADENCE" };
}
