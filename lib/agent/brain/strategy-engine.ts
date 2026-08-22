import type { AgentContext, IntentType, SalesStrategy } from "./types.ts";

export function chooseSalesStrategy(context: AgentContext, intents: IntentType[]): SalesStrategy {
  const latest = String([...context.recentMessages].reverse().find((message) => message.direction.toLowerCase() === "inbound")?.body || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (intents.includes("HUMAN_REQUEST") || intents.includes("OPT_OUT")) return "NURTURE";
  if (intents.some((i) => i.startsWith("OBJECTION_"))) return "OBJECTION_HANDLING";
  if (intents.includes("FINANCING_REQUEST") || intents.includes("SIMULATION_REQUEST")) return "PRE_ANALYSIS_TRANSITION";
  if (intents.includes("DOCUMENT_SENT") || context.stage === "awaiting_documents") return "DOCUMENT_COLLECTION";
  if (intents.includes("VISIT_REQUEST") && ["approved", "negotiating"].includes(context.stage)) return "VISIT_BOOKING";
  if (intents.includes("NEGOTIATION")) return "NEGOTIATION";
  if (intents.includes("ACCEPTANCE")) return "CLOSING";
  if (/\b(voltei|retomar|continuar de onde|voltando)\b/.test(latest) && (context.commercialHistory?.length || context.summary)) return "REACTIVATION";
  if (context.stage === "prospecting" || context.stage === "contacted") return "DISCOVERY";
  if (context.stage === "qualified") return "QUALIFICATION";
  return "FOLLOW_UP";
}
