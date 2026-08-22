import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id,client_id,project_id,vgv,commission_rate,invoice_discount,bonus,advance,received,status,closed_at,payment_date,cancelled_at,cancellation_reason,cancellation_notes,cancellation_actor,clients(name,origin_type,origin_detail),projects(id,name,kind,city,region,builders(id,name,category))",
    )
    .order("closed_at", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (data || []).map((sale) => sale.client_id);
  const events = ids.length
    ? await supabase
        .from("client_events")
        .select("client_id,event_type,title,description,occurred_at,metric_key")
        .in("client_id", ids)
        .in("event_type", ["FINANCE_UPDATE", "POST_SALE_STAGE_DECISION"])
        .order("occurred_at", { ascending: false })
    : { data: [], error: null };
  const latest = new Map<number, Record<string, unknown>>();
  const contractCaixa = new Map<number, string>();
  for (const event of events.data || []) {
    if (
      event.event_type === "POST_SALE_STAGE_DECISION" &&
      event.metric_key === "post_sale_stage_completed" &&
      String(event.title || "").startsWith("Contrato CAIXA:")
    ) {
      if (!contractCaixa.has(Number(event.client_id)))
        contractCaixa.set(
          Number(event.client_id),
          String(event.occurred_at || ""),
        );
      continue;
    }
    try {
      const meta = JSON.parse(event.description || "{}");
      const saleId = Number(meta.saleId);
      if (saleId && !latest.has(saleId)) latest.set(saleId, meta);
    } catch {}
  }
  return NextResponse.json(
    (data || []).map((sale) => ({
      ...sale,
      financeMeta: latest.get(sale.id) || {},
      contractCaixaAt: contractCaixa.get(Number(sale.client_id)) || null,
    })),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const saleId = Number(body.saleId);
  if (!saleId)
    return NextResponse.json(
      { error: "Selecione uma venda real." },
      { status: 400 },
    );
  const supabase = supabaseAdmin();
  if (body.action === "cancel") {
    const reason = String(body.reason || "").trim();
    const notes = String(body.notes || "").trim();
    if (!reason || !notes)
      return NextResponse.json(
        { error: "Motivo e descrição são obrigatórios." },
        { status: 400 },
      );
    const { data, error } = await supabase.rpc("cancel_sale", {
      p_sale_id: saleId,
      p_reason: reason,
      p_notes: notes,
      p_actor: "Franklin Monteiro",
    });
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ ok: true, sale: data });
  }
  const { data: sale, error: findError } = await supabase
    .from("sales")
    .select("id,client_id,vgv,commission_rate,cancelled_at")
    .eq("id", saleId)
    .single();
  if (findError || !sale)
    return NextResponse.json(
      { error: "Venda não encontrada." },
      { status: 404 },
    );
  if (sale.cancelled_at)
    return NextResponse.json(
      { error: "Venda cancelada não aceita alterações financeiras." },
      { status: 409 },
    );
  const invoiceDiscount = Math.min(
    100,
    Math.max(0, Number(body.invoiceDiscount || 0)),
  );
  const advance = Math.max(0, Number(body.advance || 0));
  const received = Math.max(advance, Number(body.received || 0));
  const bonus = Math.max(0, Number(body.bonus || 0));
  const totalDue =
    ((Number(sale.vgv || 0) * Number(sale.commission_rate || 0)) / 100) *
      (1 - invoiceDiscount / 100) +
    bonus;
  const calculatedStatus =
    totalDue > 0 && received >= totalDue - 0.01
      ? "Recebida"
      : received > 0
        ? "Parcial"
        : "Aguardando pagamento";
  const status = String(
    String(body.status || "").startsWith("Diverg")
      ? body.status
      : calculatedStatus,
  );
  const { error } = await supabase
    .from("sales")
    .update({
      invoice_discount: invoiceDiscount,
      bonus,
      advance,
      received,
      payment_date: body.paymentDate || null,
      status,
    })
    .eq("id", saleId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const meta = {
    saleId,
    advanceDate: body.advanceDate || null,
    paymentDate: body.paymentDate || null,
    paymentNote: String(body.paymentNote || ""),
    campaign: String(body.campaign || ""),
    updatedAt: new Date().toISOString(),
  };
  const { error: eventError } = await supabase.from("client_events").insert({
    client_id: sale.client_id,
    event_type: "FINANCE_UPDATE",
    title: "Conferência financeira atualizada",
    description: JSON.stringify(meta),
    metric_key: "finance_update",
  });
  if (eventError)
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
