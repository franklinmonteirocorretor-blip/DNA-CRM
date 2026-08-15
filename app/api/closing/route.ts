import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("id,name,phone,email,sex,marital_status,profession,income,finance_stage,funnel_stage,project_interest,next_action,next_action_at")
    .or("finance_stage.eq.Aprovado,funnel_stage.eq.Fechamento")
    .order("updated_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const clientId = Number(body.clientId);
  if (!clientId) return NextResponse.json({ error: "Selecione um cliente aprovado." }, { status: 400 });
  if (!body.result) return NextResponse.json({ error: "Informe o resultado da apresentação." }, { status: 400 });
  if (body.result !== "Fechado" && (!body.reason || !body.nextActionAt)) {
    return NextResponse.json({ error: "Informe a situação e a próxima ação." }, { status: 400 });
  }
  const supabase = supabaseAdmin();
  const now = new Date().toISOString();
  if (body.result === "Fechado") {
    const projectId = Number(body.projectId);
    if (!projectId || !(Number(body.vgv) > 0)) return NextResponse.json({ error: "Empreendimento e VGV são obrigatórios." }, { status: 400 });
    const { data: project, error: projectError } = await supabase.from("projects").select("commission_rate").eq("id", projectId).single();
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
    const { data: existing } = await supabase.from("sales").select("id").eq("client_id", clientId).maybeSingle();
    const payload = { client_id: clientId, project_id: projectId, vgv: Number(body.vgv), commission_rate: Number(project.commission_rate || 0), status: "Aguardando pagamento", closed_at: now.slice(0, 10) };
    const saleResult = existing
      ? await supabase.from("sales").update(payload).eq("id", existing.id)
      : await supabase.from("sales").insert(payload);
    if (saleResult.error) return NextResponse.json({ error: saleResult.error.message }, { status: 500 });
    await supabase.from("clients").update({ funnel_stage: "Fechado", post_sale_stage: "Contrato com a construtora", next_action: "Formalizar contrato com a construtora", next_action_at: null, updated_at: now }).eq("id", clientId);
  } else {
    await supabase.from("clients").update({ funnel_stage: body.result === "Em negociação" ? "Fechamento" : "Follow-up", next_action: body.notes ? `${body.reason}: ${body.notes}` : body.reason, next_action_at: body.nextActionAt, updated_at: now }).eq("id", clientId);
  }
  const { error } = await supabase.from("client_events").insert({
    client_id: clientId,
    event_type: body.result === "Fechado" ? "SALE_CLOSED" : "CLOSING_OUTCOME",
    title: body.result === "Fechado" ? "Venda confirmada" : `Mesa de fechamento: ${body.result}`,
    description: body.result === "Fechado"
      ? `VGV confirmado: R$ ${Number(body.vgv || 0).toFixed(2)}`
      : [body.reason, body.notes].filter(Boolean).join(" - "),
    new_stage: body.result,
    metric_key: body.result === "Fechado" ? "sale" : "closing_followup",
  });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
