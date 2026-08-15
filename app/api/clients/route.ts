import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 5000);
  const id = Number(url.searchParams.get("id"));
  const search = url.searchParams.get("search")?.trim();
  const project = url.searchParams.get("project")?.trim();
  const funnelStage = url.searchParams.get("funnelStage")?.trim();
  const financeStage = url.searchParams.get("financeStage")?.trim();
  const columns = "id,name,phone,email,sex,marital_status,profession,income,region_interest,project_interest,funnel_stage,finance_stage,post_sale_stage,origin_type,origin_detail,next_action,next_action_at,data_quality,updated_at,created_at";
  if (id) {
    const { data, error } = await supabaseAdmin().from("clients").select(columns).eq("id", id).single();
    return error ? NextResponse.json({ error: error.message }, { status: 404 }) : NextResponse.json(data);
  }
  let query = supabaseAdmin().from("clients").select(columns).order("updated_at", { ascending: false });
  if (search) {
    const safe = search.replace(/[%_,]/g, "");
    query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (project && project !== "all") query = query.eq("project_interest", project);
  if (funnelStage && funnelStage !== "all") query = query.eq("funnel_stage", funnelStage);
  if (financeStage && financeStage !== "all") query = query.eq("finance_stage", financeStage);
  const rows: unknown[] = [];
  const pageSize = 1000;
  for (let from = 0; from < limit; from += pageSize) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return NextResponse.json(rows);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = Number(body.id);
  const allowed = ["Não iniciado", "Documentação", "Em análise", "Restrição", "Condicionado", "Aprovado"];
  if (!id || !allowed.includes(body.financeStage)) return NextResponse.json({ error: "Cliente ou resultado inválido" }, { status: 400 });
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("clients").update({ finance_stage: body.financeStage, next_action: body.nextAction || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("client_events").insert({ client_id: id, event_type: "CCA_RESULT", title: `Resultado do CCA: ${body.financeStage}`, description: body.note || "Resultado oficial da análise registrado na ficha do cliente.", new_stage: body.financeStage, metric_key: "credit_result" });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const body = await request.json();
  const phone = String(body.phone || "").replace(/\D/g, "");
  if (!body.name || !phone) return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
  const supabase = supabaseAdmin();
  let query = supabase.from("clients").select("*").eq("phone", phone);
  if (body.email) query = query.or(`email.eq.${body.email}`);
  const { data: existing, error: findError } = await query.limit(1).maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (existing) {
    const { error } = await supabase.from("client_events").insert({ client_id: existing.id, event_type: "ORIGIN_UPDATE", title: "Nova origem informada", description: `Corretor informou origem ${body.originType || "Manual"}: ${body.originDetail || "sem detalhe"}. ${body.note || ""}`, metric_key: "origin_update" });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ created: false, client: existing, action: "history_updated" });
  }
  const { data: created, error } = await supabase.from("clients").insert({ name: body.name, phone, email: body.email || null, sex: body.sex || null, region_interest: body.regionInterest || null, project_interest: body.projectInterest || null, origin_type: body.originType || "Manual", origin_detail: body.originDetail || null, next_action: "Realizar primeiro contato D0" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("client_events").insert({ client_id: created.id, event_type: "CREATED", title: "Cliente cadastrado", description: body.note || "Cadastro manual", metric_key: "new_contact" });
  return NextResponse.json({ created: true, id: created.id }, { status: 201 });
}
