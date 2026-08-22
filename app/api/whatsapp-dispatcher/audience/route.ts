import { NextResponse } from "next/server";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function numericId(value: string | null) {
  if (!value) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const source = url.searchParams.get("source") === "DAILY_WALLET" ? "DAILY_WALLET" : "OWN_DATABASE";
    const baseId = numericId(url.searchParams.get("baseId"));
    const builderId = numericId(url.searchParams.get("builderId"));
    const projectId = numericId(url.searchParams.get("projectId"));
    const search = String(url.searchParams.get("q") || "").trim().slice(0, 80);
    let ids: number[] | null = null;

    if (source === "DAILY_WALLET") {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      const result = await db.from("daily_portfolios").select("client_id").eq("assigned_date", today);
      if (result.error) throw result.error;
      ids = (result.data || []).map((row) => Number(row.client_id));
    } else if (baseId) {
      const base = await db.from("lead_imports").select("file_name").eq("id", baseId).single();
      if (base.error) throw base.error;
      let sourcesQuery = db.from("client_sources").select("client_id,project_interest").eq("source_file", base.data.file_name);
      if (projectId) {
        const project = await db.from("projects").select("name,builder_id").eq("id", projectId).single();
        if (project.error) throw project.error;
        if (builderId && Number(project.data.builder_id) !== builderId) return NextResponse.json({ error: "Empreendimento não pertence à construtora." }, { status: 400 });
        sourcesQuery = sourcesQuery.eq("project_interest", project.data.name);
      }
      const sources = await sourcesQuery;
      if (sources.error) throw sources.error;
      ids = [...new Set((sources.data || []).map((row) => Number(row.client_id)))];
    }

    let projectNames: string[] | null = null;
    if (projectId) {
      const project = await db.from("projects").select("name,builder_id").eq("id", projectId).eq("active", true).single();
      if (project.error) throw project.error;
      if (builderId && Number(project.data.builder_id) !== builderId) return NextResponse.json({ error: "Empreendimento não pertence à construtora." }, { status: 400 });
      projectNames = [project.data.name];
    } else if (builderId) {
      const projects = await db.from("projects").select("name").eq("builder_id", builderId).eq("active", true);
      if (projects.error) throw projects.error;
      projectNames = (projects.data || []).map((item) => item.name);
    }

    if (ids && !ids.length) return NextResponse.json({ clients: [], total: 0 });
    if (projectNames && !projectNames.length) return NextResponse.json({ clients: [], total: 0 });
    let query = db.from("clients").select("id,name,phone,project_interest,origin_type,data_quality").eq("data_quality", "validado").neq("name", "CLIENTE TESTE - MONTEIRO CRM").order("name").limit(500);
    if (ids) query = query.in("id", ids);
    if (projectNames && !(source === "OWN_DATABASE" && baseId)) query = query.in("project_interest", projectNames);
    if (search) query = query.or(`name.ilike.%${search.replace(/[%_,]/g, "")}%,phone.ilike.%${search.replace(/[%_,]/g, "")}%`);
    const result = await query;
    if (result.error) throw result.error;
    return NextResponse.json({ clients: result.data || [], total: result.data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar público." }, { status: 500 });
  }
}
