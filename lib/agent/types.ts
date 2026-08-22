export const AUTONOMY_LEVELS = ["disabled", "suggest", "approval", "automatic"] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const PRIORITIES = ["P0", "P1", "P2", "P3", "P4", "P5"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const AGENT_ACTIONS = [
  "create_task",
  "schedule_appointment",
  "transition_client",
  "send_whatsapp",
  "request_human_review",
] as const;
export type AgentAction = (typeof AGENT_ACTIONS)[number];

export type StructuredDecision = {
  clientId: number;
  action: AgentAction;
  capability: string;
  reason: string;
  confidence: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  proposedAt: string;
};
export type ContactPolicyContext = {
  canContact: boolean;
  doNotContact: boolean;
  optedOutAt?: string | null;
  localHour: number;
  allowedStartHour: number;
  allowedEndHour: number;
};

export type AgentControl = {
  globalMode: AutonomyLevel;
  capabilityLevels: Record<string, AutonomyLevel>;
  killSwitch: boolean;
  outboundKillSwitch: boolean;
  simulationMode: boolean;
  confidenceThresholds: {
    suggest: number;
    approval: number;
    automatic: number;
  };
};

export type GateOutcome = {
  allowed: boolean;
  requiresApproval: boolean;
  simulation: boolean;
  reason: string;
};
