import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";

export const runtime = "nodejs";
const allowed = new Set(["application/pdf", "text/plain", "text/markdown"]);

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin().from("agent_playbooks").select("id,name,description,active_version,active,updated_at,agent_playbook_versions(id,version,file_name,mime_type,status,created_at)").order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ playbooks: data || [] });
  } catch { return NextResponse.json({ error: "Não foi possível carregar playbooks." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") || "").trim();
    if (!(file instanceof File) || !name || !allowed.has(file.type) || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Arquivo inválido. Use PDF, TXT ou MD até 25 MB." }, { status: 400 });
    const db = supabaseAdmin();
    const { data: playbook, error } = await db.from("agent_playbooks").insert({ name, description: String(form.get("description") || "") || null }).select("id").single();
    if (error) throw error;
    const storagePath = `${playbook.id}/1-${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await db.storage.from("agent-playbooks").upload(storagePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
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
