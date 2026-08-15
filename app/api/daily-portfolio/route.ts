import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function assignedClientIds() {
  const ids = new Set<number>();
  const supabase = supabaseAdmin();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from("daily_portfolios").select("client_id").range(start, start + 999);
    if (error) throw error;
    for (const row of data || []) ids.add(Number(row.client_id));
    if (!data || data.length < 1000) break;
  }
  return ids;
}

export async function GET() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(new Date());
  const prospectingDay = weekday !== "Sat" && weekday !== "Sun";
  const supabase = supabaseAdmin();
  if (!prospectingDay) return NextResponse.json({ date: today, prospectingDay: false, message: "Sábado e domingo são reservados para agenda, feirões e atendimentos. Nenhuma fila de prospecção é distribuída.", rows: [] });
  const { count, error: countError } = await supabase.from("daily_portfolios").select("*", { count: "exact", head: true }).eq("assigned_date", today);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if (prospectingDay && (count || 0) < 50) {
    const assigned = await assignedClientIds();
    const need = 50 - (count || 0);
    const leadTarget = Math.ceil(need / 2);
    const [leadResult, coldResult] = await Promise.all([
      supabase.from("clients").select("id").eq("origin_type", "Lead").eq("funnel_stage", "Novo lead").order("created_at").limit(500),
      supabase.from("clients").select("id").eq("origin_type", "Lista fria").eq("funnel_stage", "Novo lead").order("created_at").limit(1000),
    ]);
    const queryError = leadResult.error || coldResult.error;
    if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
    const leads = (leadResult.data || []).filter((row) => !assigned.has(Number(row.id))).slice(0, leadTarget);
    const cold = (coldResult.data || []).filter((row) => !assigned.has(Number(row.id))).slice(0, need - leads.length);
    const assignments = [...leads, ...cold].map((row) => ({ client_id: row.id, assigned_date: today }));
    if (assignments.length) {
      const { error } = await supabase.from("daily_portfolios").upsert(assignments, { onConflict: "client_id,assigned_date", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  const { data, error } = await supabase.from("daily_portfolios").select("id,status,attempts,last_result,clients!inner(id,name,phone,email,sex,marital_status,profession,income,region_interest,origin_type,origin_detail,project_interest,funnel_stage,finance_stage,next_action,next_action_at)").eq("assigned_date", today).order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []).map(({ clients, ...assignment }) => { const client = Array.isArray(clients) ? clients[0] : clients; return { assignment_id: assignment.id, ...client, email: client?.email || "", project_interest: client?.project_interest || "Não informado", status: assignment.status, attempts: assignment.attempts, last_result: assignment.last_result || "Nunca trabalhado" }; });
  return NextResponse.json({ date: today, prospectingDay, message: prospectingDay ? "Carteira de prospecção do dia útil." : "Sábado e domingo são reservados para agenda, feirões e atendimentos.", rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.action === "start-client") {
    const clientId = Number(body.clientId);
    if (!clientId) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    const supabase = supabaseAdmin();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const { data: client, error: clientError } = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const { data: existing, error: existingError } = await supabase.from("daily_portfolios").select("id").eq("client_id", clientId).eq("assigned_date", today).maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (existing) return NextResponse.json({ assignmentId: existing.id });
    const { data: created, error } = await supabase.from("daily_portfolios").insert({ client_id: clientId, assigned_date: today, status: "Em atendimento" }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("client_events").insert({ client_id: clientId, event_type: "CONTACT_START", title: "Atendimento iniciado", description: "Cliente enviado da ficha única para a Carteira do Dia." });
    return NextResponse.json({ assignmentId: created.id });
  }
  const assignmentId = Number(body.assignmentId);
  if (!assignmentId || !body.result) return NextResponse.json({ error: "Atendimento e resultado são obrigatórios." }, { status: 400 });
  const supabase = supabaseAdmin();
  const { data: assignment, error: findError } = await supabase.from("daily_portfolios").select("client_id,attempts").eq("id", assignmentId).maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!assignment) return NextResponse.json({ error: "Contato não encontrado na carteira." }, { status: 404 });
  const completed = ["Qualificado", "Sem interesse", "Número inválido"].includes(body.result);
  const actions = await Promise.all([
    supabase.from("daily_portfolios").update({ status: completed ? "Concluído" : "Em atendimento", attempts: Number(assignment.attempts || 0) + 1, last_result: body.result }).eq("id", assignmentId),
    supabase.from("client_events").insert({ client_id: assignment.client_id, event_type: "CONTACT", title: `Contato: ${body.result}`, description: body.notes || "Atendimento registrado na Carteira do Dia", metric_key: body.result === "Qualificado" ? "qualified_conversation" : "contact_attempt" }),
    supabase.from("clients").update({ funnel_stage: body.result === "Qualificado" ? "Qualificado" : "Follow-up", next_action: body.nextAction || "Executar próxima cadência", next_action_at: body.nextActionAt || null, updated_at: new Date().toISOString() }).eq("id", assignment.client_id),
  ]);
  const error = actions.find((result) => result.error)?.error;
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ saved: true });
}
