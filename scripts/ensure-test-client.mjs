import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (!match) continue;
  process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const phone = "5599999999999";
const clientPayload = {
  name: "CLIENTE TESTE · MONTEIRO CRM",
  phone,
  email: "cliente.teste@monteirocrm.local",
  sex: "Masculino",
  marital_status: "Solteiro",
  profession: "Autônomo",
  income: 3500,
  region_interest: "Teresina",
  origin_type: "TESTE INTERNO",
  origin_detail: "Auditoria permanente do CRM",
  project_interest: "Empreendimento de teste",
  funnel_stage: "Fechamento",
  finance_stage: "Aprovado",
  post_sale_stage: "Contrato com a construtora",
  next_action: "Testar contrato, anexos e movimentação do pós-venda",
  next_action_at: new Date(Date.now() + 86400000).toISOString(),
  data_quality: "teste",
  updated_at: new Date().toISOString(),
};

let { data: client, error } = await supabase
  .from("clients")
  .select("id")
  .eq("phone", phone)
  .maybeSingle();
if (error) throw error;
if (client) {
  const result = await supabase.from("clients").update(clientPayload).eq("id", client.id);
  if (result.error) throw result.error;
} else {
  const result = await supabase.from("clients").insert(clientPayload).select("id").single();
  if (result.error) throw result.error;
  client = result.data;
}

const { data: project, error: projectError } = await supabase
  .from("projects")
  .select("id,name,sale_price,commission_rate")
  .eq("active", true)
  .order("id")
  .limit(1)
  .maybeSingle();
if (projectError) throw projectError;
if (!project) throw new Error("Cadastre ao menos um empreendimento antes do cliente de teste.");

const { data: sale, error: saleError } = await supabase
  .from("sales")
  .select("id")
  .eq("client_id", client.id)
  .maybeSingle();
if (saleError) throw saleError;
if (!sale) {
  const result = await supabase.from("sales").insert({
    client_id: client.id,
    project_id: project.id,
    vgv: Number(project.sale_price || 1),
    commission_rate: Number(project.commission_rate || 0),
    status: "TESTE INTERNO",
    closed_at: new Date().toISOString().slice(0, 10),
  });
  if (result.error) throw result.error;
}

console.log(`Cliente de teste pronto: ID ${client.id} · ${project.name}`);
