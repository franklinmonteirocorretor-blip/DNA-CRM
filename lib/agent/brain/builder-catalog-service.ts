import { supabaseAdmin } from "@/lib/supabase-admin";

export interface BuilderCatalogService {
  search(input: { city?: string; builderId?: number; query?: string; limit?: number }): Promise<Array<Record<string, unknown>>>;
}

export class SupabaseBuilderCatalogService implements BuilderCatalogService {
  async search(input: { city?: string; builderId?: number; query?: string; limit?: number }) {
    let query = supabaseAdmin().from("projects").select("id,name,kind,region,city,sale_price,available_units,builder_id,builders!inner(id,name,active)").eq("active", true).eq("builders.active", true).limit(Math.min(input.limit || 10, 25));
    if (input.city) query = query.eq("city", input.city);
    if (input.builderId) query = query.eq("builder_id", input.builderId);
    if (input.query) query = query.ilike("name", `%${input.query.replace(/[%_]/g, "")}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}
