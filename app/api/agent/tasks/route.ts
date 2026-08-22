import { NextResponse } from "next/server";
import { PRIORITIES, type Priority } from "@/lib/agent/types";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  const { data, error } = await supabaseAdmin()
    .from("agent_tasks")
    .select("*,clients(name,phone,funnel_stage,finance_stage,post_sale_stage,next_action,next_action_at)")
    .eq("status", status)
    .order("priority")
    .order("due_at")
    .limit(200);
  if (error) return NextResponse.json({ error: "Não foi possível carregar a fila." }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const clientId = Number(body.clientId);
    const taskType = String(body.taskType || "").trim();
    const priority = String(body.priority || "P3") as Priority;
    const idempotencyKey = String(body.idempotencyKey || "").trim();
    const dueAt = body.dueAt ? new Date(String(body.dueAt)) : new Date();
    if (!Number.isInteger(clientId) || clientId <= 0 || !taskType || idempotencyKey.length < 8 || Number.isNaN(dueAt.getTime()))
      return NextResponse.json({ error: "Tarefa inválida." }, { status: 400 });
    if (!PRIORITIES.includes(priority)) return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });

    const db = supabaseAdmin();
    const { data, error } = await db.rpc("enqueue_agent_task", {
      p_client_id: clientId,
      p_task_type: taskType,
      p_priority: priority,
      p_due_at: dueAt.toISOString(),
      p_payload: body.payload || {},
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    await db.from("agent_events").insert({
      client_id: clientId,
      entity_type: "agent_task",
      entity_id: String(data?.id || ""),
      event_type: "AGENT_TASK_ENQUEUED",
      idempotency_key: `event:${idempotencyKey}`,
      payload: { taskType, priority, dueAt: dueAt.toISOString() },
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível incluir a tarefa." }, { status: 500 });
  }
}
