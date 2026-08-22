import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const clientColumns =
  "id,name,phone,origin_type,origin_detail,project_interest,funnel_stage,finance_stage,post_sale_stage,next_action,next_action_at";

export async function GET() {
  const supabase = supabaseAdmin();
  const eligible = new Set<number>();

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("daily_portfolios")
      .select("client_id,attempts")
      .gt("attempts", 0)
      .range(from, from + 999);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of data || []) eligible.add(Number(row.client_id));
    if (!data || data.length < 1000) break;
  }

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("client_events")
      .select("client_id,event_type")
      .in("event_type", [
        "CONTACT",
        "CONTACT_ATTEMPT",
        "APPOINTMENT_CREATED",
        "JOURNEY_TRANSITION",
        "CCA_RESULT",
        "CLOSING_OUTCOME",
        "SALE_CLOSED",
      ])
      .range(from, from + 999);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of data || []) eligible.add(Number(row.client_id));
    if (!data || data.length < 1000) break;
  }

  const ids = [...eligible].filter(Number.isFinite);
  if (!ids.length) return NextResponse.json([]);
  const clients: unknown[] = [];
  for (let index = 0; index < ids.length; index += 500) {
    const { data, error } = await supabase
      .from("clients")
      .select(clientColumns)
      .in("id", ids.slice(index, index + 500))
      .order("updated_at", { ascending: false });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    clients.push(...(data || []));
  }
  return NextResponse.json(clients);
}
