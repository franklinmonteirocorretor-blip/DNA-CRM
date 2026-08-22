import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { transitionClient } from "@/lib/client-journey";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from("client_events")
    .select("*")
    .eq("client_id", Number(id))
    .order("occurred_at", { ascending: false });
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(data);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientId = Number(id);
  const body = await request.json();
  try {
    await transitionClient({
      clientId,
      eventType: body.eventType || "UPDATE",
      title: body.title || "Atualização",
      description: body.description || "",
      funnelStage: body.newStage || null,
      financeStage: body.financeStage || null,
      postSaleStage: body.postSaleStage || null,
      nextAction: body.nextAction ?? null,
      nextActionAt: body.nextActionAt ?? null,
      metricKey: body.metricKey || null,
      qualification: body.qualification || null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar jornada.",
      },
      { status: 500 },
    );
  }
}
