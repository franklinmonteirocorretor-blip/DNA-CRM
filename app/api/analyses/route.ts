import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const allowedStages = [
  "Aguardando documentação",
  "Documentação recebida",
  "Em análise",
  "Restrição",
  "Condicionado",
  "Aprovado",
  "Aprovado sem fechamento",
  "Fechado",
];

function startFor(period: string) {
  const now = new Date();
  if (period === "year") return `${now.getFullYear()}-01-01T00:00:00.000Z`;
  if (period === "quarter")
    return new Date(
      Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1),
    ).toISOString();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period") || "month";
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id,name,phone,origin_type,origin_detail,finance_stage,next_action,next_action_at,updated_at",
    )
    .in("finance_stage", allowedStages)
    .gte("updated_at", startFor(period))
    .order("updated_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const stage = String(body.stage || "");
  const quantity = Math.min(50, Math.max(1, Number(body.quantity || 1)));
  const assignedDate = String(
    body.assignedDate || new Date().toISOString().slice(0, 10),
  );
  if (!["Aprovado sem fechamento", "Condicionado", "Restrição"].includes(stage))
    return NextResponse.json(
      { error: "Público de recuperação inválido." },
      { status: 400 },
    );
  const supabase = supabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("daily_portfolios")
    .select("client_id")
    .eq("assigned_date", assignedDate);
  if (existingError)
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  const used = new Set((existing || []).map((row) => Number(row.client_id)));
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id")
    .eq("finance_stage", stage)
    .order("updated_at", { ascending: true })
    .limit(500);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const selected = (clients || [])
    .filter((client) => !used.has(Number(client.id)))
    .slice(0, quantity);
  if (!selected.length)
    return NextResponse.json(
      { error: "Nenhum cliente elegível sem repetição para essa data." },
      { status: 409 },
    );
  const { error: insertError } = await supabase.from("daily_portfolios").upsert(
    selected.map((client) => ({
      client_id: client.id,
      assigned_date: assignedDate,
      status: "Pendente",
      attempts: 0,
      last_result: `Recuperação: ${stage}`,
    })),
    { onConflict: "client_id,assigned_date", ignoreDuplicates: true },
  );
  if (insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ distributed: selected.length, assignedDate });
}
