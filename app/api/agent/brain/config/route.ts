import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";

export const runtime = "nodejs";

const allowedTopLevel = ["personaName", "tone", "sales", "provider", "model"] as const;
const allowedTone = ["directness", "formality", "didacticism", "persuasion", "humor", "emojiUsage", "messageLength"] as const;
const allowedSales = ["commercialIntensity", "objectionHandling", "followupIntensity", "closingIntensity", "reactivationIntensity"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePartialScale(value: unknown, allowedKeys: readonly string[]) {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.every((key) => allowedKeys.includes(key) && Number.isInteger(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= 10);
}

async function loadConfig() {
  const db = supabaseAdmin();
  const [{ data: persona, error: personaError }, { data: providers, error: providerError }, { data: control, error: controlError }] = await Promise.all([
    db.from("agent_persona_config").select("persona_name,tone,sales,provider_preferences").eq("id", 1).single(),
    db.from("agent_llm_providers").select("id,provider,model,api_key_ref,base_url,enabled,priority").order("priority"),
    db.from("agent_autonomy_config").select("global_mode,capability_levels,kill_switch,outbound_kill_switch,simulation_mode").eq("id", 1).single(),
  ]);
  if (personaError || providerError || controlError) throw personaError || providerError || controlError;
  return { persona, providers, control };
}

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json(await loadConfig());
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a configuração do cérebro." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || Object.keys(body).some((key) => !allowedTopLevel.includes(key as typeof allowedTopLevel[number]))) {
      return NextResponse.json({ error: "Campos de configuração inválidos." }, { status: 400 });
    }
    if ("personaName" in body && (typeof body.personaName !== "string" || !body.personaName.trim())) return NextResponse.json({ error: "Persona inválida." }, { status: 400 });
    if ("tone" in body && !validatePartialScale(body.tone, allowedTone)) return NextResponse.json({ error: "Tom inválido." }, { status: 400 });
    if ("sales" in body && !validatePartialScale(body.sales, allowedSales)) return NextResponse.json({ error: "Configuração comercial inválida." }, { status: 400 });
    for (const key of ["provider", "model"] as const) {
      if (key in body && body[key] !== null && (typeof body[key] !== "string" || !body[key].trim())) return NextResponse.json({ error: `${key} inválido.` }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: current, error: currentError } = await db.from("agent_persona_config").select("persona_name,tone,sales,provider_preferences").eq("id", 1).single();
    if (currentError) throw currentError;
    const currentTone = isRecord(current.tone) ? current.tone : {};
    const currentSales = isRecord(current.sales) ? current.sales : {};
    const currentPreferences = isRecord(current.provider_preferences) ? current.provider_preferences : {};
    const personaName = "personaName" in body ? (body.personaName as string).trim() : current.persona_name;
    const tone = { ...currentTone, ...(isRecord(body.tone) ? body.tone : {}) };
    const sales = { ...currentSales, ...(isRecord(body.sales) ? body.sales : {}) };
    const providerPreferences = {
      ...currentPreferences,
      ...(Object.hasOwn(body, "provider") ? { provider: typeof body.provider === "string" ? body.provider.trim() : null } : {}),
      ...(Object.hasOwn(body, "model") ? { model: typeof body.model === "string" ? body.model.trim() : null } : {}),
    };
    const update = { persona_name: personaName, tone, sales, provider_preferences: providerPreferences, updated_at: new Date().toISOString() };
    const { error } = await db.from("agent_persona_config").update(update).eq("id", 1);
    if (error) throw error;
    const { error: eventError } = await db.from("agent_events").insert({ entity_type: "agent_brain_config", entity_id: "1", event_type: "AGENT_BRAIN_CONFIG_UPDATED", actor_type: "human", actor_id: "crm_operator", payload: update });
    if (eventError) throw eventError;
    return NextResponse.json(await loadConfig());
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a configuração do cérebro." }, { status: 500 });
  }
}
