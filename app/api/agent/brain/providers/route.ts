import { NextResponse } from "next/server";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const envRefPattern = /^AGENT_LLM_API_KEY_[A-Z0-9][A-Z0-9_]*$/;
const allowedProviderHosts = new Set([
  "api.groq.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "integrate.api.nvidia.com",
  "openrouter.ai",
]);
const providerBindings: Record<string, { host: string; apiKeyRef: string }> = {
  groq: { host: "api.groq.com", apiKeyRef: "AGENT_LLM_API_KEY_GROQ" },
  openai: { host: "api.openai.com", apiKeyRef: "AGENT_LLM_API_KEY_OPENAI" },
  gemini: { host: "generativelanguage.googleapis.com", apiKeyRef: "AGENT_LLM_API_KEY_GEMINI" },
  nvidia: { host: "integrate.api.nvidia.com", apiKeyRef: "AGENT_LLM_API_KEY_NVIDIA" },
  openrouter: { host: "openrouter.ai", apiKeyRef: "AGENT_LLM_API_KEY_OPENROUTER" },
};
const writeFields = new Set(["provider", "model", "apiKeyRef", "baseUrl", "enabled", "priority"]);

type ProviderInput = {
  provider?: string;
  model?: string;
  apiKeyRef?: string;
  baseUrl?: string | null;
  enabled?: boolean;
  priority?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validBaseUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      !url.search &&
      !url.hash &&
      allowedProviderHosts.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

function validateFields(body: Record<string, unknown>, partial: boolean): string | null {
  const keys = Object.keys(body);
  if (keys.some((key) => !writeFields.has(key))) return "Campos de provider inválidos.";
  if ((!partial || "provider" in body) && !validText(body.provider, 80)) return "Provider inválido.";
  if ((!partial || "model" in body) && !validText(body.model, 160)) return "Modelo inválido.";
  if ((!partial || "apiKeyRef" in body) && (typeof body.apiKeyRef !== "string" || !envRefPattern.test(body.apiKeyRef))) {
    return "apiKeyRef deve usar o prefixo AGENT_LLM_API_KEY_.";
  }
  if ("baseUrl" in body && !validBaseUrl(body.baseUrl)) return "baseUrl HTTPS não permitida.";
  if ("enabled" in body && typeof body.enabled !== "boolean") return "enabled deve ser booleano.";
  if ("priority" in body && (typeof body.priority !== "number" || !Number.isInteger(body.priority) || body.priority < 0)) {
    return "priority deve ser um inteiro maior ou igual a zero.";
  }
  if (partial && keys.length === 0) return "Nenhum campo para atualizar.";
  return null;
}

function validateEnabledConfiguration(body: ProviderInput): string | null {
  if (!body.enabled) return null;
  if (!validText(body.provider, 80) || !validText(body.model, 160) || !body.baseUrl || !validBaseUrl(body.baseUrl)) {
    return "Provider ativo exige provider, modelo e baseUrl permitida.";
  }
  if (!body.apiKeyRef || !envRefPattern.test(body.apiKeyRef)) {
    return "Provider ativo exige apiKeyRef com prefixo AGENT_LLM_API_KEY_.";
  }
  const binding = providerBindings[body.provider.trim().toLowerCase()];
  const host = new URL(body.baseUrl).hostname.toLowerCase();
  if (!binding || binding.host !== host || binding.apiKeyRef !== body.apiKeyRef) {
    return "Provider, host e apiKeyRef não correspondem ao vínculo permitido.";
  }
  if (!process.env[body.apiKeyRef]) return "A chave referenciada não está configurada no runtime.";
  return null;
}

function toDatabasePayload(body: ProviderInput) {
  return {
    ...(body.provider !== undefined ? { provider: body.provider.trim() } : {}),
    ...(body.model !== undefined ? { model: body.model.trim() } : {}),
    ...(body.apiKeyRef !== undefined ? { api_key_ref: body.apiKeyRef } : {}),
    ...(body.baseUrl !== undefined ? { base_url: body.baseUrl === null ? null : body.baseUrl.trim().replace(/\/$/, "") } : {}),
    ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    ...(body.priority !== undefined ? { priority: body.priority } : {}),
    updated_at: new Date().toISOString(),
  };
}

async function authorized() {
  return isAuthorizedOperator();
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin()
      .from("agent_llm_providers")
      .select("id,provider,model,api_key_ref,base_url,enabled,priority,created_at,updated_at")
      .order("priority")
      .order("created_at");
    if (error) throw error;
    return NextResponse.json({ providers: data || [] });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar providers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const validationError = validateFields(body, false);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const enabledError = validateEnabledConfiguration(body as ProviderInput);
    if (enabledError) return NextResponse.json({ error: enabledError }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from("agent_llm_providers")
      .upsert(toDatabasePayload(body as ProviderInput), { onConflict: "provider,model,api_key_ref" })
      .select("id,provider,model,api_key_ref,base_url,enabled,priority,created_at,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ provider: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o provider." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || !uuidPattern.test(String(body.id || ""))) {
      return NextResponse.json({ error: "id deve ser um UUID válido." }, { status: 400 });
    }
    const { id, ...fields } = body;
    const validationError = validateFields(fields, true);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const db = supabaseAdmin();
    const { data: current, error: currentError } = await db
      .from("agent_llm_providers")
      .select("provider,model,api_key_ref,base_url,enabled,priority")
      .eq("id", String(id))
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Provider não encontrado." }, { status: 404 });

    const merged: ProviderInput = {
      provider: fields.provider === undefined ? current.provider : String(fields.provider),
      model: fields.model === undefined ? current.model : String(fields.model),
      apiKeyRef: fields.apiKeyRef === undefined ? current.api_key_ref : String(fields.apiKeyRef),
      baseUrl: fields.baseUrl === undefined ? current.base_url : fields.baseUrl as string | null,
      enabled: fields.enabled === undefined ? current.enabled : fields.enabled as boolean,
      priority: fields.priority === undefined ? current.priority : fields.priority as number,
    };
    const enabledError = validateEnabledConfiguration(merged);
    if (enabledError) return NextResponse.json({ error: enabledError }, { status: 400 });

    const { data, error } = await db
      .from("agent_llm_providers")
      .update(toDatabasePayload(fields as ProviderInput))
      .eq("id", String(id))
      .select("id,provider,model,api_key_ref,base_url,enabled,priority,created_at,updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Provider não encontrado." }, { status: 404 });
    return NextResponse.json({ provider: data });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o provider." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || !uuidPattern.test(String(body.id || "")) || Object.keys(body).some((key) => key !== "id" && key !== "permanent")) {
      return NextResponse.json({ error: "id deve ser um UUID válido." }, { status: 400 });
    }
    if ("permanent" in body && typeof body.permanent !== "boolean") {
      return NextResponse.json({ error: "permanent deve ser booleano." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const id = String(body.id);
    if (body.permanent === true) {
      const { data, error } = await db.from("agent_llm_providers").delete().eq("id", id).eq("enabled", false).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Desative o provider antes de excluí-lo." }, { status: 409 });
      return NextResponse.json({ id, deleted: true });
    }

    const { data, error } = await db
      .from("agent_llm_providers")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,enabled")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Provider não encontrado." }, { status: 404 });
    return NextResponse.json({ provider: data });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover o provider." }, { status: 500 });
  }
}
