import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") || "csv";
  const { data, error } = await supabaseAdmin()
    .from("clients")
    .select(
      "origin_type,origin_detail,funnel_stage,finance_stage,post_sale_stage,next_action_at",
    );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const grouped = new Map<string, Record<string, unknown>>();
  for (const client of data || []) {
    const values = [
      client.origin_type,
      client.origin_detail,
      client.funnel_stage,
      client.finance_stage,
      client.post_sale_stage,
    ];
    const key = JSON.stringify(values);
    const row = grouped.get(key) || {
      origem: values[0],
      detalhe: values[1],
      etapa_funil: values[2],
      etapa_financiamento: values[3],
      etapa_pos_venda: values[4],
      contatos: 0,
      com_proxima_acao: 0,
    };
    row.contatos = Number(row.contatos) + 1;
    if (client.next_action_at)
      row.com_proxima_acao = Number(row.com_proxima_acao) + 1;
    grouped.set(key, row);
  }
  const rows = [...grouped.values()];
  if (format === "json")
    return NextResponse.json({ generatedAt: new Date().toISOString(), rows });
  const headers = [
    "origem",
    "detalhe",
    "etapa_funil",
    "etapa_financiamento",
    "etapa_pos_venda",
    "contatos",
    "com_proxima_acao",
  ];
  const escape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(";")),
  ].join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monteiro-crm-bi-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
