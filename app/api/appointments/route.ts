import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export const runtime = "nodejs";

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}
async function cadence(clientId: number) {
  const db = supabaseAdmin();
  const [c, e, a] = await Promise.all([
    db
      .from("clients")
      .select("funnel_stage,finance_stage,post_sale_stage")
      .eq("id", clientId)
      .single(),
    db
      .from("client_events")
      .select("title,description")
      .eq("client_id", clientId)
      .limit(40),
    db
      .from("appointments")
      .select("status,outcome")
      .eq("client_id", clientId)
      .limit(20),
  ]);
  if (c.error) throw c.error;
  const history = [...(e.data || []), ...(a.data || [])];
  const finance = String(c.data.finance_stage || "").toLowerCase(),
    post = String(c.data.post_sale_stage || "").toLowerCase(),
    funnel = String(c.data.funnel_stage || "").toLowerCase();
  let days = 1,
    label = "Retorno D1 para manter o atendimento ativo";
  if (post && !post.includes("não iniciado")) {
    label = "Acompanhar o próximo marco do pós-venda";
  } else if (finance.includes("restri")) {
    days = 30;
    label = "Reavaliar regularização e capacidade financeira em D30";
  } else if (finance.includes("condicionado")) {
    days = 7;
    label = "Revisar as condições da aprovação em D7";
  } else if (finance.includes("análise") || finance.includes("analise")) {
    label = "Cobrar retorno do CCA em D1";
  } else if (finance.includes("aprovado")) {
    label = "Agendar apresentação da proposta em D1";
  } else if (
    funnel.includes("não respondeu") ||
    funnel.includes("não atendeu")
  ) {
    const n = history.filter((x) =>
      /contato|tentativa|não respondeu|não atendeu/i.test(JSON.stringify(x)),
    ).length;
    days = [0, 1, 3, 7, 15, 30][Math.min(Math.max(n, 1), 5)];
    label = `Cadência D${days}: nova tentativa baseada no histórico`;
  } else if (funnel.includes("novo") || !history.length) {
    days = 0;
    label = "Contato inicial D0";
  }
  return { label, at: addDays(days), days, editable: true };
}
export async function GET(request: Request) {
  const url = new URL(request.url),
    id = Number(url.searchParams.get("cadenceClientId"));
  if (id) {
    try {
      return NextResponse.json(await cadence(id));
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Falha ao calcular a cadência.",
        },
        { status: 500 },
      );
    }
  }
  const { data, error } = await supabaseAdmin()
    .from("appointments")
    .select("*,clients(name,phone,project_interest)")
    .order("starts_at");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data || []).map(({ clients, ...row }) => ({
      ...row,
      client_name: clients?.name,
      phone: clients?.phone,
      project_interest: clients?.project_interest,
    })),
  );
}
async function save(request: Request, update: boolean) {
  const body = await request.json(),
    clientId = body.clientId ? Number(body.clientId) : null;
  if (!body.kind || !body.startsAt)
    return NextResponse.json(
      { error: "Tipo, data e horário são obrigatórios." },
      { status: 400 },
    );
  const start = new Date(body.startsAt);
  if (Number.isNaN(start.getTime()))
    return NextResponse.json(
      { error: "Data e horário inválidos." },
      { status: 400 },
    );
  const payload = {
    client_id: clientId,
    kind: String(body.kind),
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + 3600000).toISOString(),
    status: String(body.status || "Confirmado"),
    notes:
      [
        body.place && `Local: ${body.place}`,
        body.objective && `Objetivo: ${body.objective}`,
      ]
        .filter(Boolean)
        .join(" | ") || null,
    next_action: body.nextAction || null,
    next_action_at: body.nextActionAt
      ? new Date(body.nextActionAt).toISOString()
      : null,
  };
  const db = supabaseAdmin();
  const q = update
    ? db
        .from("appointments")
        .update(payload)
        .eq("id", Number(body.id))
        .select()
        .single()
    : db.from("appointments").insert(payload).select().single();
  const { data, error } = await q;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (clientId)
    await Promise.all([
      db
        .from("clients")
        .update({
          next_action: payload.next_action,
          next_action_at: payload.next_action_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId),
      db
        .from("client_events")
        .insert({
          client_id: clientId,
          event_type: update ? "APPOINTMENT_UPDATED" : "APPOINTMENT_CREATED",
          title: update ? "Compromisso atualizado" : "Compromisso agendado",
          description: `${payload.kind} em ${start.toLocaleString("pt-BR")}. Próxima ação: ${payload.next_action || "não informada"}.`,
          metric_key: "appointment",
        }),
    ]);
  return NextResponse.json(data, { status: update ? 200 : 201 });
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PATCH(request: Request) {
  return save(request, true);
}
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({})),
    id = Number(body.id);
  if (!id)
    return NextResponse.json(
      { error: "Agendamento inválido." },
      { status: 400 },
    );
  const db = supabaseAdmin();
  const { data: appointment, error: findError } = await db
    .from("appointments")
    .select("id,client_id,kind,starts_at,next_action,next_action_at")
    .eq("id", id)
    .single();
  if (findError)
    return NextResponse.json({ error: findError.message }, { status: 404 });
  const { error } = await db.from("appointments").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (appointment.client_id) {
    const { data: next } = await db
      .from("appointments")
      .select("next_action,next_action_at")
      .eq("client_id", appointment.client_id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle();
    await Promise.all([
      db
        .from("clients")
        .update({
          next_action: next?.next_action || null,
          next_action_at: next?.next_action_at || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointment.client_id),
      db
        .from("client_events")
        .insert({
          client_id: appointment.client_id,
          event_type: "APPOINTMENT_DELETED",
          title: "Agendamento excluído",
          description: `${appointment.kind} de ${new Date(appointment.starts_at).toLocaleString("pt-BR")} foi excluído da agenda.`,
          metric_key: null,
        }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
