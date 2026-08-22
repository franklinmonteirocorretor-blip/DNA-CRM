import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AnalystContact = { name: string; phone: string; whatsapp: string };

function normalizePayload(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const responsibleName = String(body.responsible_name || "").trim();
  const phone = String(body.phone || "").trim();
  if (!name || !responsibleName || !phone) {
    return { error: "CCA, responsável e telefone são obrigatórios." } as const;
  }

  const analystContacts: AnalystContact[] = Array.isArray(body.analyst_contacts)
    ? body.analyst_contacts
        .map((value: Record<string, unknown>) => ({
          name: String(value?.name || "").trim(),
          phone: String(value?.phone || "").trim(),
          whatsapp: String(value?.whatsapp || value?.phone || "").trim(),
        }))
        .filter((value: AnalystContact) => value.name)
    : [];
  if (analystContacts.some((analyst) => !analyst.phone)) {
    return {
      error: "Informe o telefone de cada analista cadastrado.",
    } as const;
  }

  const regions = Array.isArray(body.regions)
    ? [
        ...new Set(
          body.regions.map((value) => String(value).trim()).filter(Boolean),
        ),
      ]
    : [];
  return {
    payload: {
      name,
      responsible_name: responsibleName,
      phone,
      whatsapp: String(body.whatsapp || phone).trim(),
      email: String(body.email || "").trim() || null,
      region: regions.join(" · ") || null,
      regions,
      notes: String(body.notes || "").trim() || null,
      analysts: analystContacts.map((value) => value.name),
      analyst_contacts: analystContacts,
    },
  } as const;
}

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("cca_partners")
    .select("*")
    .order("name");
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const normalized = normalizePayload(await request.json());
  if ("error" in normalized)
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  const { data, error } = await supabaseAdmin()
    .from("cca_partners")
    .insert({ ...normalized.payload, active: true })
    .select()
    .single();
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id)
    return NextResponse.json({ error: "CCA não informado." }, { status: 400 });
  const { id } = body;
  const changes =
    Object.keys(body).length === 2 && typeof body.active === "boolean"
      ? { active: body.active }
      : normalizePayload(body);
  if ("error" in changes)
    return NextResponse.json({ error: changes.error }, { status: 400 });
  const payload = "payload" in changes ? changes.payload : changes;
  const { data, error } = await supabaseAdmin()
    .from("cca_partners")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "CCA não informado." }, { status: 400 });
  const { error } = await supabaseAdmin()
    .from("cca_partners")
    .delete()
    .eq("id", id);
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ ok: true });
}
