export const INTENT_TYPES = [
  "GREETING", "PROPERTY_INTEREST", "PRICE_REQUEST", "LOCATION_REQUEST",
  "FINANCING_REQUEST", "SIMULATION_REQUEST", "QUALIFICATION_DATA", "DOCUMENT_SENT",
  "VISIT_REQUEST", "OBJECTION_ENTRY", "OBJECTION_INSTALLMENT", "OBJECTION_LOCATION",
  "OBJECTION_TIMING", "OBJECTION_PARTNER_DECISION", "NEGOTIATION", "ACCEPTANCE",
  "DECLINE", "COMPLAINT", "OPT_OUT", "HUMAN_REQUEST", "PARTNER_OPERATION", "OTHER",
] as const;
export type IntentType = (typeof INTENT_TYPES)[number];

export const SALES_STRATEGIES = [
  "DISCOVERY", "TRUST_BUILDING", "PAIN_CLARIFICATION", "VALUE_REFRAME",
  "OBJECTION_ISOLATION", "OBJECTION_HANDLING", "FINANCIAL_ALIGNMENT", "QUALIFICATION",
  "PRE_ANALYSIS_TRANSITION", "DOCUMENT_COLLECTION", "VISIT_BOOKING", "FOLLOW_UP",
  "REACTIVATION", "NEGOTIATION", "CLOSING", "NURTURE",
] as const;
export type SalesStrategy = (typeof SALES_STRATEGIES)[number];

export const NEXT_BEST_ACTIONS = [
  "ASK_OBJECTIVE", "ASK_MOTIVATION", "ASK_PAIN", "ASK_URGENCY", "ASK_PROFILE",
  "EXPLAIN_PRE_ANALYSIS", "REQUEST_DOCUMENTS", "REQUEST_MISSING_DOCUMENT", "WAIT_FOR_CLIENT",
  "SCHEDULE_VISIT", "SEND_PROPERTY_OPTIONS", "HANDLE_OBJECTION", "SCHEDULE_FOLLOWUP",
  "REACTIVATE", "ESCALATE_HUMAN", "CLOSE_LEAD",
] as const;
export type NextBestAction = (typeof NEXT_BEST_ACTIONS)[number];
export type KnowledgeType = "FACT" | "INFERENCE" | "UNKNOWN";
export type ParticipantType = "CLIENT" | "LEAD" | "CCA" | "BUILDER" | "BROKER" | "OTHER_PARTNER" | "UNKNOWN";
export type HumanTakeoverMode = "AUTO" | "HUMAN_TAKEOVER" | "OBSERVE_ONLY" | "PAUSED";

export type StructuredFact = { key: string; value: unknown; knowledgeType: KnowledgeType; sourceMessageId?: string; confidence: number; active: boolean };
export type ExtractedFact = { key: string; value: unknown; knowledgeType: "FACT" | "INFERENCE"; confidence: number };
export type AgentMessage = { id?: string | number; direction: string; text?: string; body?: string; createdAt?: string; [key: string]: unknown };
export type AgentContext = {
  clientId?: number; clientName?: string; client?: Record<string, unknown>; participantType?: ParticipantType; partyType?: ParticipantType; stage: string;
  labels?: string[]; source?: unknown; interestedProject?: string; projectInterest?: string; commercialHistory?: unknown[]; recentMessages: AgentMessage[];
  summary?: string | null; facts?: StructuredFact[]; knowledge?: unknown[]; missingData?: string[]; objections?: unknown[];
  motivation?: string; pain?: string; commitments?: unknown[]; documents?: unknown[]; appointments?: unknown[];
  creditState?: string; projectsPresented?: string[]; presentedProjects?: string[]; takeoverMode?: HumanTakeoverMode; controlMode?: string;
  capabilities?: string[]; allowedActions: string[]; forbiddenActions: string[];
};
export type ExtractionInput = { text: string; sourceMessageId?: string; knownFacts?: StructuredFact[] };
export type ExtractionResult = { facts: StructuredFact[]; intents: Array<{ type: IntentType; confidence: number }> };
export type SummarizeInput = { previousSummary?: string; messages: AgentMessage[]; facts?: StructuredFact[] };
export type ConversationSummary = { summary: string; commitments: string[]; objections: string[] };
export type EvaluationInput = { context: AgentContext; decision: AgentDecision };
export type EvaluationResult = { valid: boolean; confidence: number; reasonCodes: string[] };
export type AgentDecision = {
  intents: Array<{ type: IntentType; confidence: number }>;
  extractedFacts: Array<{ key: string; value: unknown; knowledgeType: "FACT" | "INFERENCE"; confidence: number }>;
  strategy: SalesStrategy; nextBestAction: NextBestAction; proposedMessage?: string; proposedStage?: string;
  followUp?: { reason: string; strategy: SalesStrategy; scheduledAt?: string };
  confidence: number; requiresHuman: boolean; rationaleCode: string;
};
export interface LLMProvider {
  decide(context: AgentContext): Promise<AgentDecision>;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
  summarize(input: SummarizeInput): Promise<ConversationSummary>;
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}
export type LLMProviderConfig = { provider: string; model: string; apiKeyRef?: string; baseUrl?: string; enabled: boolean; priority: number };
