import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const group = (
  rows: Array<Record<string, unknown>>,
  key: string,
  label: string,
) =>
  Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      const value = String(row[key] ?? "Não informado");
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {}),
  ).map(([value, total]) => ({ [label]: value, total }));

export async function GET() {
  const supabase = supabaseAdmin();
  const [clients, events, appointments, sales] = await Promise.all([
    supabase.from("clients").select("id,funnel_stage,data_quality"),
    supabase.from("client_events").select("client_id,metric_key").not("metric_key", "is", null),
    supabase.from("appointments").select("client_id,status"),
    supabase.from("sales").select("client_id,vgv,commission_rate,invoice_discount,bonus"),
  ]);
  const error = [clients, events, appointments, sales].find(
    (result) => result.error,
  )?.error;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const realClientIds = new Set(
    (clients.data || [])
      .filter((client) => client.data_quality !== "teste")
      .map((client) => client.id),
  );
  const clientRows = (clients.data || []).filter((client) =>
    realClientIds.has(client.id),
  );
  const eventRows = (events.data || []).filter((event) =>
    realClientIds.has(event.client_id),
  );
  const appointmentRows = (appointments.data || []).filter(
    (appointment) =>
      !appointment.client_id || realClientIds.has(appointment.client_id),
  );
  const saleRows = (sales.data || []).filter((sale) =>
    realClientIds.has(sale.client_id),
  );
  const eventCounts = eventRows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.metric_key || "");
    if (
      [
        "contact_attempt",
        "effective_contact",
        "qualified_conversation",
        "follow_up",
        "folder_sent",
        "approval",
        "proposal",
      ].includes(key)
    )
      acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const appointmentCounts = appointmentRows.reduce<Record<string, number>>(
    (acc, row) => {
      const key = String(row.status || "");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {},
  );
  const summary = saleRows.reduce(
    (acc, sale) => ({
      sales: acc.sales + 1,
      vgv: acc.vgv + Number(sale.vgv || 0),
      commission:
        acc.commission +
        (Number(sale.vgv || 0) * Number(sale.commission_rate || 0)) / 100 *
          (1 - Number(sale.invoice_discount || 0) / 100) +
        Number(sale.bonus || 0),
    }),
    { sales: 0, vgv: 0, commission: 0 },
  );
  return NextResponse.json({
    stages: group(clientRows, "funnel_stage", "stage"),
    events: group(eventRows, "metric_key", "metric"),
    eventCounts,
    appointmentCounts,
    appointments: group(appointmentRows, "status", "status"),
    sales: summary,
  });
}
