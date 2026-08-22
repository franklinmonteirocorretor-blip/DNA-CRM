import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthorizedOperator } from "@/lib/agent/operator-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
// Vercel Functions reject request bodies above 4.5 MB before this handler.
const MAX_BYTES = 4 * 1024 * 1024;
const allowed = /^(image\/(jpeg|png)|video\/mp4|application\/pdf)$/;

function signatureMatches(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "video/mp4") return bytes.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

export async function GET() {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const result = await supabaseAdmin().from("whatsapp_dispatch_media").select("id,name,version,media_type,mime_type,file_size_bytes,created_at").eq("active", true).order("created_at", { ascending: false });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ media: result.data || [] });
}

export async function POST(request: Request) {
  if (!(await isAuthorizedOperator())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") || "").trim().slice(0, 120);
  if (!(file instanceof File) || !name) return NextResponse.json({ error: "Nome e arquivo são obrigatórios." }, { status: 400 });
  if (!allowed.test(file.type) || file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "Use JPG, PNG, MP4 ou PDF de até 4 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) return NextResponse.json({ error: "Conteúdo do arquivo não corresponde ao tipo informado." }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const storagePath = `dispatcher/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const db = supabaseAdmin();
  const uploaded = await db.storage.from("whatsapp-media").upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploaded.error) return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
  const mediaType = file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : "DOCUMENT";
  const inserted = await db.from("whatsapp_dispatch_media").insert({ name, version: 1, media_type: mediaType, storage_path: storagePath, mime_type: file.type, sha256: createHash("sha256").update(bytes).digest("hex"), file_size_bytes: file.size }).select("id,name,version,media_type,mime_type,file_size_bytes,created_at").single();
  if (inserted.error) {
    await db.storage.from("whatsapp-media").remove([storagePath]);
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }
  return NextResponse.json({ media: inserted.data }, { status: 201 });
}
