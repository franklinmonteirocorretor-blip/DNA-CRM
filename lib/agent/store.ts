import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ExecutionLedger, ExecutionResult } from "./action-pipeline";
import type { AgentControl, StructuredDecision } from "./types";

type AutonomyRow = {
  global_mode: AgentControl["globalMode"];
  capability_levels: AgentControl["capabilityLevels"];
  kill_switch: boolean;
  outbound_kill_switch: boolean;
  simulation_mode: boolean;
  confidence_thresholds: AgentControl["confidenceThresholds"];
};

export async function loadAgentControl(): Promise<AgentControl> {
  const { data, error } = await supabaseAdmin()
    .from("agent_autonomy_config")
    .select("global_mode,capability_levels,kill_switch,outbound_kill_switch,simulation_mode,confidence_thresholds")
    .eq("id", 1)
    .single<AutonomyRow>();
  if (error) throw error;
  return {
    globalMode: data.global_mode,
    capabilityLevels: data.capability_levels || {},
    killSwitch: data.kill_switch,
    outboundKillSwitch: data.outbound_kill_switch,
    simulationMode: data.simulation_mode,
    confidenceThresholds: data.confidence_thresholds,
  };
}
export class SupabaseExecutionLedger implements ExecutionLedger {
  async reserve(idempotencyKey: string, decision: StructuredDecision) {
    const { error } = await supabaseAdmin().from("agent_action_executions").insert({
      idempotency_key: idempotencyKey,
      client_id: decision.clientId,
      action_type: decision.action,
      status: "reserved",
      request: decision,
    });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  }

  async finish(idempotencyKey: string, result: ExecutionResult) {
    const status = result.status === "approval_required" ? "blocked" : result.status;
    const { error } = await supabaseAdmin()
      .from("agent_action_executions")
      .update({ status, result, updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
      .eq("idempotency_key", idempotencyKey);
    if (error) throw error;
  }
}

export async function appendAgentAudit(input: {
  decision: StructuredDecision;
  correlationId: string;
  phase: "decision" | "policy" | "confidence" | "execution" | "read_back" | "error";
  status: string;
  output?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin().from("agent_audit_logs").insert({
    client_id: input.decision.clientId,
    correlation_id: input.correlationId,
    idempotency_key: input.decision.idempotencyKey,
    phase: input.phase,
    action_type: input.decision.action,
    status: input.status,
    input: input.decision,
    output: input.output || {},
  });
  if (error) throw error;
}
