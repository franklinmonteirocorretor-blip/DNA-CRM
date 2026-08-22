import { NextResponse } from "next/server";
import { AUTONOMY_LEVELS, type AutonomyLevel } from "@/lib/agent/types";
import { loadAgentControl } from "@/lib/agent/store";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const validLevel = (value: unknown): value is AutonomyLevel =>
  typeof value === "string" && AUTONOMY_LEVELS.includes(value as AutonomyLevel);

export async function GET() {
  try {
    return NextResponse.json(await loadAgentControl());
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os controles do agente." }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const changes: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: "crm_operator" };
    if (body.globalMode !== undefined) {
      if (!validLevel(body.globalMode)) return NextResponse.json({ error: "Nível de autonomia inválido." }, { status: 400 });
      changes.global_mode = body.globalMode;
    }
    for (const [apiKey, dbKey] of [
      ["killSwitch", "kill_switch"],
      ["outboundKillSwitch", "outbound_kill_switch"],
      ["simulationMode", "simulation_mode"],
    ] as const) {
      if (body[apiKey] !== undefined) {
        if (typeof body[apiKey] !== "boolean") return NextResponse.json({ error: `${apiKey} deve ser booleano.` }, { status: 400 });
        changes[dbKey] = body[apiKey];
      }
    }
    if (body.capabilityLevels !== undefined) {
      if (!body.capabilityLevels || typeof body.capabilityLevels !== "object" || Array.isArray(body.capabilityLevels))
        return NextResponse.json({ error: "Configuração de capacidades inválida." }, { status: 400 });
      if (!Object.values(body.capabilityLevels).every(validLevel))
        return NextResponse.json({ error: "Uma capacidade contém nível inválido." }, { status: 400 });
      changes.capability_levels = body.capabilityLevels;
    }
    if (Object.keys(changes).length === 2)
      return NextResponse.json({ error: "Nenhuma alteração válida informada." }, { status: 400 });

    const db = supabaseAdmin();
    const { error } = await db.from("agent_autonomy_config").update(changes).eq("id", 1);
    if (error) throw error;
    await db.from("agent_events").insert({
      entity_type: "agent_control",
      entity_id: "1",
      event_type: "AGENT_CONTROL_UPDATED",
      actor_type: "human",
      actor_id: "crm_operator",
      payload: changes,
    });
    return NextResponse.json(await loadAgentControl());
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar os controles do agente." }, { status: 500 });
  }
}
