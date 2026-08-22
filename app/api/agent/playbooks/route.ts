import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";

export const runtime = "nodejs";
const allowed = new Set(["application/pdf", "text/plain", "text/markdown"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const [{ data: playbooks, error }, { data: versions, error: versionsError }] = await Promise.all([
      db.from("agent_playbooks").select("id,name,description,active_version,active,updated_at").order("updated_at", { ascending: false }),
      db.from("agent_playbook_versions").select("id,playbook_id,version,file_name,mime_type,status,analyzed_at,analysis_error,created_at").order("version", { ascending: false }),
    ]);
    if (error || versionsError) throw error || versionsError;
    return NextResponse.json({ playbooks: (playbooks || []).map((playbook) => ({ ...playbook, versions: (versions || []).filter((version) => version.playbook_id === playbook.id) })) });
  } catch { return NextResponse.json({ error: "Não foi possível carregar playbooks." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") || "").trim();
    if (!(file instanceof File) || !name || !allowed.has(file.type) || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Arquivo inválido. Use PDF, TXT ou MD até 25 MB." }, { status: 400 });
    const contents = await file.arrayBuffer();
    const db = supabaseAdmin();
    const { data: playbook, error } = await db.from("agent_playbooks").insert({ name, description: String(form.get("description") || "") || null }).select("id").single();
    if (error) throw error;
    const storagePath = `${playbook.id}/1-${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await db.storage.from("agent-playbooks").upload(storagePath, contents, { contentType: file.type, upsert: false });
    if (uploadError) { await db.from("agent_playbooks").delete().eq("id", playbook.id); throw uploadError; }
    const { error: versionError } = await db.from("agent_playbook_versions").insert({ playbook_id: playbook.id, version: 1, file_name: file.name, storage_path: storagePath, mime_type: file.type, status: "uploaded" });
    if (versionError) {
      await db.storage.from("agent-playbooks").remove([storagePath]);
      await db.from("agent_playbooks").delete().eq("id", playbook.id);
      throw versionError;
    }
    return NextResponse.json({ id: playbook.id, status: "uploaded" }, { status: 201 });
  } catch { return NextResponse.json({ error: "Não foi possível registrar o playbook." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const payload = body as { playbookId?: unknown; version?: unknown; active?: unknown };
  if (
    !uuidPattern.test(String(payload.playbookId || "")) ||
    typeof payload.version !== "number" ||
    !Number.isInteger(payload.version) ||
    payload.version <= 0 ||
    typeof payload.active !== "boolean"
  ) {
    return NextResponse.json({ error: "playbookId, version e active são obrigatórios e devem ser válidos." }, { status: 400 });
  }

  const playbookId = String(payload.playbookId);
  const versionNumber = payload.version;
  const db = supabaseAdmin();

  try {
    const { data: version, error: versionLookupError } = await db
      .from("agent_playbook_versions")
      .select("id,playbook_id,version,status,analyzed_at,analysis_error")
      .eq("playbook_id", playbookId)
      .eq("version", versionNumber)
      .maybeSingle();
    if (versionLookupError) throw versionLookupError;
    if (!version) return NextResponse.json({ error: "Versão não encontrada para este playbook." }, { status: 404 });
    if (
      payload.active &&
      (!new Set(["review", "inactive", "active"]).has(version.status) ||
        !version.analyzed_at ||
        version.analysis_error)
    ) {
      return NextResponse.json(
        { error: "Versão ainda não concluiu análise e revisão; ativação bloqueada." },
        { status: 409 },
      );
    }

    const { data, error } = await db.rpc("set_agent_playbook_activation", { p_playbook_id: playbookId, p_version: versionNumber, p_active: payload.active });
    if (error) {
      const conflictMessages = [
        "Playbook version must complete analysis before activation",
        "Playbook principles must be reviewed before activation",
        "Playbook activation state is inconsistent",
        "Requested playbook version is not active",
      ];
      if (conflictMessages.some((message) => error.message.includes(message))) {
        return NextResponse.json(
          {
            error: payload.active
              ? "Versão ainda não concluiu análise e revisão; ativação bloqueada."
              : "Somente a versão ativa atual pode ser desativada.",
          },
          { status: 409 },
        );
      }
      throw error;
    }
    const { data: readBack, error: readBackError } = await db.from("agent_playbooks").select("id,active,active_version").eq("id", playbookId).single();
    if (readBackError) throw readBackError;
    return NextResponse.json({ ...data, readBack });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o playbook." }, { status: 500 });
  }
}
