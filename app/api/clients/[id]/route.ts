import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function repairText(value: unknown): unknown {
  if (typeof value === "string") {
    const replacements: Array<[string,string]> = [
      ["negocia��o","negociação"],["Observa��o","Observação"],["P�s-venda","Pós-venda"],
      ["m�ltiplo","múltiplo"],["avan�o","avanço"],["NÃ£o","Não"],["nÃ£o","não"],
      ["Ã§","ç"],["Ã£","ã"],["Ã¡","á"],["Ã©","é"],["Ã³","ó"],["Ãº","ú"],
      ["Ã­","í"],["Â·","·"],["â€“","–"],["â€¹","‹"]
    ];
    return replacements.reduce((text,[bad,good])=>text.split(bad).join(good),value);
  }
  if (Array.isArray(value)) return value.map(repairText);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,repairText(item)]));
  return value;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!id) return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
  const supabase = supabaseAdmin();
  const [client, events, appointments, documents, sources, sales] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("client_events").select("*").eq("client_id", id).order("occurred_at", { ascending: false }),
    supabase.from("appointments").select("*").eq("client_id", id).order("starts_at", { ascending: false }),
    supabase.from("documents").select("id,document_type,file_name,created_at").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_sources").select("origin_type,origin_detail,project_interest,source_file,created_at").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("sales").select("id,vgv,status,closed_at,payment_date,projects(name,builders(name))").eq("client_id", id).order("closed_at", { ascending: false }),
  ]);
  if (client.error) return NextResponse.json({ error: client.error.message }, { status: 500 });
  if (!client.data) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  const error = [events, appointments, documents, sources, sales].find((result) => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(repairText({ client: client.data, events: events.data || [], appointments: appointments.data || [], documents: documents.data || [], sources: sources.data || [], sales: sales.data || [] }));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const body = await request.json();
  if (!id) return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
  const allowed = ["email","sex","marital_status","profession","income","region_interest","project_interest","funnel_stage","finance_stage","next_action","next_action_at"];
  const changes = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key] === "" ? null : body[key]]));
  changes.updated_at = new Date().toISOString();
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("clients").update(changes).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("client_events").insert({ client_id:id, event_type:"PROFILE_UPDATE", title:"Ficha do cliente atualizada", description:"Dados de qualificação e cadastro atualizados na ficha única." });
  return NextResponse.json({ ok:true });
}
