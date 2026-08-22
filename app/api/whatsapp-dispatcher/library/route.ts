import { NextResponse } from "next/server";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedPlaceholders = new Set(["nome", "primeiro_nome", "empreendimento", "corretor", "base"]);

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function apiError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return NextResponse.json(
    { error: code === "23505" ? "Já existe um cadastro com esse nome." : fallback },
    { status: code === "23505" ? 409 : 500 },
  );
}

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const [cadencesResult, stepsResult, approachesResult, templatesResult, versionsResult] = await Promise.all([
      db.from("whatsapp_cadences").select("id,name,description,active,updated_at").order("name"),
      db.from("whatsapp_cadence_steps").select("id,cadence_id,step_order,step_key,day_offset,active").order("step_order"),
      db.from("whatsapp_approaches").select("id,name,objective,cadence_id,active,updated_at").order("name"),
      db.from("whatsapp_templates").select("id,approach_id,name,active,updated_at").order("name"),
      db.from("whatsapp_template_versions").select("id,template_id,version,body,placeholders,active,created_at").order("version", { ascending: false }),
    ]);
    const failure = [cadencesResult, stepsResult, approachesResult, templatesResult, versionsResult].find((result) => result.error)?.error;
    if (failure) throw failure;
    const steps = stepsResult.data || [];
    const versions = versionsResult.data || [];
    return NextResponse.json({
      cadences: (cadencesResult.data || []).map((cadence) => ({ ...cadence, steps: steps.filter((step) => step.cadence_id === cadence.id) })),
      approaches: approachesResult.data || [],
      templates: (templatesResult.data || []).map((template) => ({ ...template, versions: versions.filter((version) => version.template_id === template.id) })),
    });
  } catch (error) {
    return apiError(error, "Não foi possível carregar abordagens.");
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const action = payload.action;
  const db = supabaseAdmin();
  try {
    if (action === "createCadence") {
      const name = text(payload.name, 100);
      const description = payload.description ? text(payload.description, 500) : null;
      const offsets = Array.isArray(payload.dayOffsets) ? payload.dayOffsets : [];
      if (!name || offsets.length < 1 || offsets.length > 20 || offsets.some((offset) => !Number.isInteger(offset) || Number(offset) < 0 || Number(offset) > 365)) {
        return NextResponse.json({ error: "Nome e 1–20 dias inteiros entre 0 e 365 são obrigatórios." }, { status: 400 });
      }
      const uniqueOffsets = [...new Set(offsets.map(Number))].sort((a, b) => a - b);
      if (uniqueOffsets.length !== offsets.length) return NextResponse.json({ error: "A cadência não aceita dias repetidos." }, { status: 400 });
      const { data: cadence, error } = await db.from("whatsapp_cadences").insert({ name, description }).select("id").single();
      if (error) throw error;
      const { error: stepError } = await db.from("whatsapp_cadence_steps").insert(uniqueOffsets.map((day, index) => ({ cadence_id: cadence.id, step_order: index + 1, step_key: `D${day}`, day_offset: day })));
      if (stepError) { await db.from("whatsapp_cadences").delete().eq("id", cadence.id); throw stepError; }
      return NextResponse.json({ id: cadence.id }, { status: 201 });
    }
    if (action === "createApproach") {
      const name = text(payload.name, 100), objective = text(payload.objective, 500), cadenceId = String(payload.cadenceId || "");
      if (!name || !objective || !uuidPattern.test(cadenceId)) return NextResponse.json({ error: "Nome, objetivo e cadência válida são obrigatórios." }, { status: 400 });
      const { data, error } = await db.from("whatsapp_approaches").insert({ name, objective, cadence_id: cadenceId }).select("id").single();
      if (error) throw error;
      return NextResponse.json({ id: data.id }, { status: 201 });
    }
    if (action === "createTemplate") {
      const approachId = String(payload.approachId || ""), name = text(payload.name, 100), body = text(payload.body, 4000);
      if (!uuidPattern.test(approachId) || !name || !body) return NextResponse.json({ error: "Abordagem, nome e texto de até 4.000 caracteres são obrigatórios." }, { status: 400 });
      const placeholders = [...body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((match) => match[1]);
      if (placeholders.some((placeholder) => !allowedPlaceholders.has(placeholder)) || body.includes("{{") !== body.includes("}}")) {
        return NextResponse.json({ error: "Placeholder inválido. Use nome, primeiro_nome, empreendimento, corretor ou base." }, { status: 400 });
      }
      let { data: template, error: lookupError } = await db.from("whatsapp_templates").select("id").eq("approach_id", approachId).eq("name", name).maybeSingle();
      if (lookupError) throw lookupError;
      let created = false;
      if (!template) {
        const result = await db.from("whatsapp_templates").insert({ approach_id: approachId, name }).select("id").single();
        if (result.error) throw result.error;
        template = result.data; created = true;
      }
      const { data: latest, error: latestError } = await db.from("whatsapp_template_versions").select("version").eq("template_id", template.id).order("version", { ascending: false }).limit(1).maybeSingle();
      if (latestError) throw latestError;
      const version = (latest?.version || 0) + 1;
      const { error: versionError } = await db.from("whatsapp_template_versions").insert({ template_id: template.id, version, body, placeholders: [...new Set(placeholders)] });
      if (versionError) { if (created) await db.from("whatsapp_templates").delete().eq("id", template.id); throw versionError; }
      return NextResponse.json({ id: template.id, version }, { status: 201 });
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return apiError(error, "Não foi possível salvar o cadastro.");
  }
}

export async function PATCH(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const tables = { cadence: "whatsapp_cadences", approach: "whatsapp_approaches", template: "whatsapp_templates" } as const;
  const entity = payload.entity as keyof typeof tables;
  const id = String(payload.id || "");
  if (!tables[entity] || !uuidPattern.test(id) || typeof payload.active !== "boolean") return NextResponse.json({ error: "Entidade, id e estado válidos são obrigatórios." }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from(tables[entity]).update({ active: payload.active, updated_at: new Date().toISOString() }).eq("id", id).select("id,active").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Cadastro não encontrado." }, { status: 404 });
    if (entity === "template") {
      const { error: versionsError } = await db.from("whatsapp_template_versions").update({ active: payload.active }).eq("template_id", id);
      if (versionsError) throw versionsError;
    }
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error, "Não foi possível alterar o cadastro.");
  }
}
