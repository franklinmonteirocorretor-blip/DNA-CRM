import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const cadenceDays = [0, 1, 3, 7, 15, 30] as const;

function cadenceStep(nextAction: string | null, attempts: number) {
  const written = nextAction?.match(/\bD(0|1|3|7|15|30)\b/i)?.[1];
  return written
    ? `D${written}`
    : `D${cadenceDays[Math.min(attempts, cadenceDays.length - 1)]}`;
}

export async function GET() {
  const db = supabaseAdmin();
  const { data: contactEvents, error: contactError } = await db
    .from("client_events")
    .select("client_id,event_type")
    .in("event_type", ["CONTACT", "FOLLOW_UP"])
    .limit(10000);
  if (contactError)
    return NextResponse.json({ error: contactError.message }, { status: 500 });
  const attempts = new Map<number, number>();
  for (const event of contactEvents || []) {
    const id = Number(event.client_id);
    attempts.set(id, (attempts.get(id) || 0) + 1);
  }
  const workedIds = [...attempts.keys()];
  if (!workedIds.length) return NextResponse.json([]);

  const { data: clients, error } = await db
    .from("clients")
    .select(
      "id,name,phone,project_interest,funnel_stage,finance_stage,post_sale_stage,origin_type,next_action,next_action_at,updated_at",
    )
    .in("id", workedIds)
    .or("next_action.not.is.null,next_action_at.not.is.null")
    .limit(5000);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const active = (clients || []).filter((client) => {
    const funnel = String(client.funnel_stage || "").toLowerCase();
    const postSale = String(client.post_sale_stage || "").toLowerCase();
    return (
      !["venda", "fechado", "perdido", "desistiu", "bloqueado"].some((stage) =>
        funnel.includes(stage),
      ) &&
      (!postSale || postSale === "não iniciado")
    );
  });
  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const rows = active
    .map((client) => {
      const dueAt = client.next_action_at || new Date(now).toISOString();
      const due = new Date(dueAt).getTime();
      return {
        ...client,
        due_at: dueAt,
        cadence_step: cadenceStep(
          client.next_action,
          attempts.get(Number(client.id)) || 0,
        ),
        queue_status:
          due < now
            ? "overdue"
            : due <= endOfToday.getTime()
              ? "today"
              : "scheduled",
      };
    })
    .sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
    );
  return NextResponse.json(rows);
}
