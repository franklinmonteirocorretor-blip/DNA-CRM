import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCatalogCity } from "@/lib/catalog-hierarchy";

export const runtime = "nodejs";

function nextBusinessDay(value?: string) {
  const date = value ? new Date(`${value}T12:00:00-03:00`) : new Date();
  do date.setDate(date.getDate() + 1);
  while ([0, 6].includes(date.getDay()));
  return date.toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
}

async function filteredClientIds(filters: {
  base?: string;
  city?: string;
  builder?: string;
  project?: string;
  origin?: string;
  stage?: string;
}) {
  const supabase = supabaseAdmin();
  let sourceIds: number[] | null = null;
  if (filters.base && filters.base !== "all") {
    const { data, error } = await supabase
      .from("client_sources")
      .select("client_id")
      .eq("source_file", filters.base);
    if (error) throw error;
    sourceIds = [...new Set((data || []).map((row) => Number(row.client_id)))];
    if (!sourceIds.length) return [];
  }
  let query = supabase
    .from("clients")
    .select(
      "id,name,phone,email,origin_type,origin_detail,project_interest,funnel_stage,finance_stage,data_quality",
    )
    .eq("data_quality", "validado");
  if (sourceIds) query = query.in("id", sourceIds);
  if (filters.project && filters.project !== "all")
    query = query.eq("project_interest", filters.project);
  else if (
    filters.city &&
    filters.city !== "all" &&
    (!filters.builder || filters.builder === "all")
  ) {
    const { data: cityProjects, error: cityError } = await supabase
      .from("projects")
      .select("name")
      .eq("active", true)
      .eq("city", normalizeCatalogCity(filters.city));
    if (cityError) throw cityError;
    const names = (cityProjects || []).map((item) => item.name);
    if (!names.length) return [];
    query = query.in("project_interest", names);
  } else if (filters.builder && filters.builder !== "all") {
    let builderProjectsQuery = supabase
      .from("projects")
      .select("name,builders!inner(name)")
      .eq("active", true)
      .eq("builders.name", filters.builder);
    if (filters.city && filters.city !== "all")
      builderProjectsQuery = builderProjectsQuery.eq(
        "city",
        normalizeCatalogCity(filters.city),
      );
    const { data: builderProjects, error: builderError } =
      await builderProjectsQuery;
    if (builderError) throw builderError;
    const names = (builderProjects || []).map((item) => item.name);
    if (!names.length) return [];
    query = query.in("project_interest", names);
  }
  if (filters.origin && filters.origin !== "all")
    query = query.eq("origin_type", filters.origin);
  if (filters.stage === "approved-not-closed")
    query = query
      .eq("finance_stage", "Aprovado")
      .neq("funnel_stage", "Fechado");
  else if (filters.stage && filters.stage !== "all")
    query = query.eq("finance_stage", filters.stage);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(10000);
  if (error) throw error;
  return data || [];
}

export async function GET(request: Request) {
  const supabase = supabaseAdmin();
  const url = new URL(request.url);
  const importId = Number(url.searchParams.get("id"));
  if (importId) {
    const { data: base, error: baseError } = await supabase
      .from("lead_imports")
      .select(
        "id,file_name,origin_type,origin_detail,total_rows,valid_rows,duplicate_rows,invalid_rows,created_at",
      )
      .eq("id", importId)
      .maybeSingle();
    if (baseError)
      return NextResponse.json({ error: baseError.message }, { status: 500 });
    if (!base)
      return NextResponse.json(
        { error: "Base não encontrada." },
        { status: 404 },
      );
    const { data: sources, error: sourcesError } = await supabase
      .from("client_sources")
      .select(
        "client_id,origin_type,origin_detail,project_interest,source_file,created_at,clients!inner(id,name,phone,email,funnel_stage,finance_stage,next_action,updated_at)",
      )
      .eq("source_file", base.file_name)
      .order("created_at", { ascending: true });
    if (sourcesError)
      return NextResponse.json(
        { error: sourcesError.message },
        { status: 500 },
      );
    return NextResponse.json({ base, leads: sources || [] });
  }
  const [imports, projects] = await Promise.all([
    supabase
      .from("lead_imports")
      .select(
        "id,file_name,origin_type,origin_detail,total_rows,valid_rows,duplicate_rows,invalid_rows,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id,name,city,region,builders!inner(id,name,active)")
      .eq("active", true)
      .eq("builders.active", true)
      .order("name"),
  ]);
  const error = imports.error || projects.error;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    imports: imports.data || [],
    projects: projects.data || [],
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = Number(body.id);
  const fileName = String(body.fileName || "").trim();
  const originType = String(body.originType || "").trim();
  const projectInterest = String(body.projectInterest || "").trim();
  if (!id || !fileName || !originType)
    return NextResponse.json(
      { error: "Base, nome e tipo são obrigatórios." },
      { status: 400 },
    );
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("update_client_base", {
    p_import_id: id,
    p_file_name: fileName,
    p_origin_type: originType,
    p_origin_detail: String(body.originDetail || "") || null,
    p_project_interest: projectInterest || null,
  });
  if (error) {
    if (error.message.includes("BASE_NOT_FOUND"))
      return NextResponse.json({ error: "Base não encontrada." }, { status: 404 });
    if (error.message.includes("BASE_NAME_CONFLICT"))
      return NextResponse.json({ error: "Já existe outra base com este nome." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id)
    return NextResponse.json({ error: "Base inválida." }, { status: 400 });
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("delete_client_base", {
    p_import_id: id,
  });
  if (error) {
    if (error.message.includes("BASE_NOT_FOUND"))
      return NextResponse.json({ error: "Base não encontrada." }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const rows = await filteredClientIds({
      base: body.base,
      city: body.city,
      builder: body.builder,
      project: body.project,
      origin: body.origin,
      stage: body.stage,
    });
    if (body.action === "export") {
      const header = [
        "Nome",
        "Telefone",
        "E-mail",
        "Tipo",
        "Origem",
        "Empreendimento",
        "Etapa",
      ];
      const escape = (value: unknown) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csv = [
        header,
        ...rows.map((row) => [
          row.name,
          row.phone,
          row.email,
          row.origin_type,
          row.origin_detail,
          row.project_interest,
          row.funnel_stage,
        ]),
      ]
        .map((line) => line.map(escape).join(";"))
        .join("\r\n");
      return new NextResponse(`\uFEFF${csv}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="base-personalizada-${Date.now()}.csv"`,
        },
      });
    }
    if (body.action === "distribute") {
      const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 50);
      const supabase = supabaseAdmin();
      const { data: assigned, error: assignedError } = await supabase
        .from("daily_portfolios")
        .select("client_id");
      if (assignedError) throw assignedError;
      const used = new Set(
        (assigned || []).map((row) => Number(row.client_id)),
      );
      const selected = rows
        .filter((row) => !used.has(Number(row.id)))
        .slice(0, quantity);
      if (!selected.length)
        return NextResponse.json(
          { error: "Nenhum contato elegível sem distribuição anterior." },
          { status: 422 },
        );
      const assignedDate = body.assignedDate || nextBusinessDay();
      const { error } = await supabase.from("daily_portfolios").insert(
        selected.map((row) => ({
          client_id: row.id,
          assigned_date: assignedDate,
        })),
      );
      if (error) throw error;
      await supabase.from("client_events").insert(
        selected.map((row) => ({
          client_id: row.id,
          event_type: "PORTFOLIO_ASSIGNED",
          title: `Enviado à carteira de ${body.broker || "Franklin Monteiro"}`,
          description: `Base: ${body.base || "todas"}; empreendimento: ${body.project || "todos"}; data: ${assignedDate}.`,
          metric_key: "portfolio_assigned",
        })),
      );
      return NextResponse.json({
        ok: true,
        assigned: selected.length,
        assignedDate,
        broker: body.broker || "Franklin Monteiro",
      });
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao processar base.",
      },
      { status: 500 },
    );
  }
}
