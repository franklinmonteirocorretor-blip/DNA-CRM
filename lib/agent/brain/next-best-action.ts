import type { AgentContext, IntentType, NextBestAction, SalesStrategy } from "./types.ts";

export function calculateNextBestAction(context: AgentContext, intents: IntentType[], strategy: SalesStrategy): NextBestAction {
  const party = context.participantType || context.partyType || (context.clientId ? "CLIENT" : "UNKNOWN");
  if (intents.includes("HUMAN_REQUEST") || party !== "CLIENT" && party !== "LEAD") return "ESCALATE_HUMAN";
  if (intents.includes("OPT_OUT") || intents.includes("DECLINE")) return "CLOSE_LEAD";
  if (intents.includes("FINANCING_REQUEST") || intents.includes("SIMULATION_REQUEST")) return /aprovad|condicionad/i.test(context.creditState || "") ? "WAIT_FOR_CLIENT" : "EXPLAIN_PRE_ANALYSIS";
  if (intents.some((intent) => intent.startsWith("OBJECTION_"))) return "HANDLE_OBJECTION";
  if (intents.includes("DOCUMENT_SENT")) return "REQUEST_MISSING_DOCUMENT";
  if (intents.includes("QUALIFICATION_DATA")) return "ASK_PROFILE";
  if (strategy === "DOCUMENT_COLLECTION") return "REQUEST_DOCUMENTS";
  if (strategy === "VISIT_BOOKING") return "SCHEDULE_VISIT";
  if (intents.includes("PROPERTY_INTEREST") && context.stage !== "prospecting") return "SEND_PROPERTY_OPTIONS";
  if (!context.motivation) return "ASK_MOTIVATION";
  if (!context.pain) return "ASK_PAIN";
  if (context.missingData?.length) return "ASK_PROFILE";
  return "SCHEDULE_FOLLOWUP";
}
