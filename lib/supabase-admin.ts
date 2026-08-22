import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function documentsBucket() {
  return process.env.SUPABASE_DOCUMENTS_BUCKET || "crm-documentos";
}

export function requireProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.CRM_AUTH_ENABLED !== "true")
    throw new Error("CRM_AUTH_ENABLED deve estar ativo em produção.");
  if (!process.env.CRM_PASSWORD || process.env.CRM_PASSWORD === "monteiro-dev")
    throw new Error("CRM_PASSWORD seguro é obrigatório.");
  if (
    !process.env.CRM_SESSION_SECRET ||
    process.env.CRM_SESSION_SECRET === "development-only-change-me"
  )
    throw new Error("CRM_SESSION_SECRET seguro é obrigatório.");
  supabaseAdmin();
}
