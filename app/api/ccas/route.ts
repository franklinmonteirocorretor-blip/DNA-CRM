import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin().from("cca_partners").select("*").order("name");
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name?.trim() || !body.responsible_name?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ error: "CCA, responsável e telefone são obrigatórios." }, { status: 400 });
  }
  const payload = {
    name: body.name.trim(), responsible_name: body.responsible_name.trim(), phone: body.phone.trim(),
    whatsapp: (body.whatsapp || body.phone).trim(), email: body.email?.trim() || null,
    region: body.region?.trim() || null, notes: body.notes?.trim() || null, active: true,
  };
  const { data, error } = await supabaseAdmin().from("cca_partners").insert(payload).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "CCA não informado." }, { status: 400 });
  const { id, ...changes } = body;
  const { data, error } = await supabaseAdmin().from("cca_partners").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
}
