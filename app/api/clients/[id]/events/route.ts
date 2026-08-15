import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from("client_events").select("*").eq("client_id", Number(id)).order("occurred_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  const body = await request.json();
  const supabase = supabaseAdmin();
  const { data: client } = await supabase.from("clients").select("funnel_stage").eq("id", clientId).single();
  const { error } = await supabase.from("client_events").insert({ client_id: clientId, event_type: body.eventType || "UPDATE", title: body.title || "Atualização", description: body.description || "", old_stage: client?.funnel_stage || null, new_stage: body.newStage || null, metric_key: body.metricKey || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.newStage) changes.funnel_stage = body.newStage;
  if (body.nextAction) { changes.next_action = body.nextAction; changes.next_action_at = body.nextActionAt || null; }
  if (Object.keys(changes).length > 1) await supabase.from("clients").update(changes).eq("id", clientId);
  return NextResponse.json({ ok: true });
}
