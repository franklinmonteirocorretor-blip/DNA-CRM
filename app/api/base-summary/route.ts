import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function GET() {
  const supabase = supabaseAdmin();
  const [total, leads, cold, quality, available, imports] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("origin_type", "Lead"),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("origin_type", "Lista fria"),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .neq("data_quality", "validado"),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("funnel_stage", "Novo lead")
      .eq("next_action", "Realizar primeiro contato D0"),
    supabase
      .from("lead_imports")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  const error = [total, leads, cold, quality, available, imports].find(
    (result) => result.error,
  )?.error;
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({
        total: total.count || 0,
        leads: leads.count || 0,
        cold: cold.count || 0,
        quality: quality.count || 0,
        available: available.count || 0,
        imports: imports.data || [],
      });
}
