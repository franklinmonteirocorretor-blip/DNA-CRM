import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const [{ data: persona, error: personaError }, { data: providers, error: providerError }, { data: control, error: controlError }] = await Promise.all([
      db.from("agent_persona_config").select("persona_name,tone,sales,provider_preferences").eq("id", 1).single(),
      db.from("agent_llm_providers").select("id,provider,model,api_key_ref,base_url,enabled,priority").order("priority"),
      db.from("agent_autonomy_config").select("global_mode,capability_levels,kill_switch,outbound_kill_switch,simulation_mode").eq("id", 1).single(),
    ]);
    if (personaError || providerError || controlError) throw personaError || providerError || controlError;
    return NextResponse.json({ persona, providers, control });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a configuração do cérebro." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body = await request.json();
    const allowedTone = ["directness", "formality", "didacticism", "persuasion", "humor", "emojiUsage", "messageLength"];
    const allowedSales = ["commercialIntensity", "objectionHandling", "followupIntensity", "closingIntensity"];
    const validateScale = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10;
    if (typeof body.personaName !== "string" || !body.personaName.trim()) return NextResponse.json({ error: "Persona inválida." }, { status: 400 });
    if (!body.tone || Object.keys(body.tone).length !== allowedTone.length || allowedTone.some((key) => !validateScale(body.tone[key]))) return NextResponse.json({ error: "Tom inválido." }, { status: 400 });
    if (!body.sales || Object.keys(body.sales).length !== allowedSales.length || allowedSales.some((key) => !validateScale(body.sales[key]))) return NextResponse.json({ error: "Configuração comercial inválida." }, { status: 400 });
    const db = supabaseAdmin();
    const { error } = await db.from("agent_persona_config").update({ persona_name: body.personaName.trim(), tone: body.tone, sales: body.sales, provider_preferences: { provider: body.provider || null, model: body.model || null }, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw error;
    await db.from("agent_events").insert({ entity_type: "agent_brain_config", entity_id: "1", event_type: "AGENT_BRAIN_CONFIG_UPDATED", actor_type: "human", actor_id: "crm_operator", payload: { personaName: body.personaName.trim(), tone: body.tone, sales: body.sales, provider: body.provider || null, model: body.model || null } });
    return GET();
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a configuração do cérebro." }, { status: 500 });
  }
}
