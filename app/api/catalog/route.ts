import { NextResponse } from "next/server";
import { documentsBucket, supabaseAdmin } from "@/lib/supabase-admin";
import { catalogCityRank, normalizeCatalogCity } from "@/lib/catalog-hierarchy";

export const runtime = "nodejs";

const normalizedName = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

const validId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

function catalogError(error: unknown, fallback: string) {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === "23505")
    return NextResponse.json(
      { error: "Já existe um cadastro com esse nome." },
      { status: 409 },
    );
  return NextResponse.json(
    { error: value?.message || fallback },
    { status: 500 },
  );
}

async function saveProjectDescription(
  supabase: ReturnType<typeof supabaseAdmin>,
  projectId: number,
  description: unknown,
) {
  const text = String(description ?? "").trim();
  const { data: current, error: readError } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("document_type", "PROJECT_DESCRIPTION")
    .order("id")
    .limit(1)
    .maybeSingle();
  if (readError) throw readError;

  if (!text) {
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("project_id", projectId)
      .eq("document_type", "PROJECT_DESCRIPTION");
    if (error) throw error;
    return;
  }

  if (current) {
    const { error } = await supabase
      .from("documents")
      .update({ file_name: text })
      .eq("id", current.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("documents").insert({
    project_id: projectId,
    document_type: "PROJECT_DESCRIPTION",
    file_name: text,
    storage_path: "inline://description",
    mime_type: "text/plain",
  });
  if (error) throw error;
}

async function catalog() {
  const supabase = supabaseAdmin();
  const [buildersResult, projectsResult, documentsResult] = await Promise.all([
    supabase
      .from("builders")
      .select("id,name,category,contact_name,phone,regions,active")
      .eq("active", true)
      .order("name"),
    supabase
      .from("projects")
      .select(
        "id,builder_id,name,kind,city,region,sale_price,commission_rate,active",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("documents")
      .select(
        "id,project_id,document_type,file_name,storage_path,mime_type,created_at",
      )
      .in("document_type", ["PROJECT_MEDIA", "PROJECT_DESCRIPTION"])
      .order("created_at"),
  ]);
  const error =
    buildersResult.error || projectsResult.error || documentsResult.error;
  if (error) throw error;
  const documents = documentsResult.data || [];
  const mediaDocuments = documents.filter(
    (item) => item.document_type === "PROJECT_MEDIA",
  );
  const signed = new Map<number, string>();
  await Promise.all(
    mediaDocuments.map(async (item) => {
      const { data } = await supabase.storage
        .from(documentsBucket())
        .createSignedUrl(item.storage_path, 3600);
      if (data?.signedUrl) signed.set(item.id, data.signedUrl);
    }),
  );
  return (buildersResult.data || [])
    .map((builder) => ({
      id: builder.id,
      name: builder.name,
      category: builder.category,
      contact: builder.contact_name || "",
      phone: builder.phone || "",
      regions: String(builder.regions || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      projects: (projectsResult.data || [])
        .filter((project) => project.builder_id === builder.id)
        .map((project) => ({
          id: project.id,
          name: project.name,
          kind: project.kind || "",
          city: normalizeCatalogCity(project.city, project.region),
          region: project.region || "",
          price: Number(project.sale_price || 0),
          commission: Number(project.commission_rate || 0),
          description:
            documents.find(
              (item) =>
                item.project_id === project.id &&
                item.document_type === "PROJECT_DESCRIPTION",
            )?.file_name || "",
          media: mediaDocuments
            .filter((item) => item.project_id === project.id)
            .map((item) => ({
              id: item.id,
              name: item.file_name,
              type: item.mime_type || "",
              url: signed.get(item.id) || "",
            })),
        }))
        .sort(
          (a, b) =>
            catalogCityRank(a.city) - catalogCityRank(b.city) ||
            a.name.localeCompare(b.name, "pt-BR"),
        ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function GET() {
  try {
    return NextResponse.json(await catalog());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar catálogo.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = supabaseAdmin();
    if (body.entity === "builder") {
      const name = String(body.name || "").trim().replace(/\s+/g, " ");
      if (!name)
        return NextResponse.json(
          { error: "Nome da construtora é obrigatório." },
          { status: 400 },
        );
      const { data: builders, error: lookupError } = await supabase
        .from("builders")
        .select("id,name,active");
      if (lookupError) throw lookupError;
      const existing = (builders || []).find(
        (item) => normalizedName(item.name) === normalizedName(name),
      );
      if (existing?.active)
        return NextResponse.json(
          { error: `A construtora ${existing.name} já está cadastrada.` },
          { status: 409 },
        );
      if (existing) {
        const { data, error } = await supabase
          .from("builders")
          .update({
            name,
            category: body.category || "Mista",
            contact_name: body.contact || null,
            phone: body.phone || null,
            regions: (body.regions || []).join(", "),
            active: true,
          })
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, id: data.id, reactivated: true });
      }
      const { data, error } = await supabase
        .from("builders")
        .insert({
          name,
          category: body.category || "Mista",
          contact_name: body.contact || null,
          phone: body.phone || null,
          regions: (body.regions || []).join(", "),
          active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, id: data.id });
    }
    if (body.entity === "project") {
      const builderId = validId(body.builderId);
      const name = String(body.name || "").trim().replace(/\s+/g, " ");
      const price = Number(body.price);
      if (
        !builderId ||
        !name ||
        !Number.isFinite(price)
      )
        return NextResponse.json(
          {
            error:
              "Construtora, empreendimento e valor de venda são obrigatórios.",
          },
          { status: 400 },
        );
      const { data: projects, error: lookupError } = await supabase
        .from("projects")
        .select("id,name,active")
        .eq("builder_id", builderId);
      if (lookupError) throw lookupError;
      const existing = (projects || []).find(
        (item) => normalizedName(item.name) === normalizedName(name),
      );
      if (existing?.active)
        return NextResponse.json(
          { error: `O empreendimento ${existing.name} já está cadastrado nesta construtora.` },
          { status: 409 },
        );
      const payload = {
        builder_id: builderId,
        name,
        kind: body.kind || null,
        city: normalizeCatalogCity(body.city, body.region),
        region: body.region || null,
        sale_price: price,
        commission_rate: Number(body.commission) || 0,
        available_units: 0,
        active: true,
      };
      if (existing) {
        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) throw error;
        await saveProjectDescription(supabase, data.id, body.description);
        return NextResponse.json({ ok: true, id: data.id, reactivated: true });
      }
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      await saveProjectDescription(supabase, data.id, body.description);
      return NextResponse.json({ ok: true, id: data.id });
    }
    return NextResponse.json({ error: "Operação inválida." }, { status: 400 });
  } catch (error) {
    return catalogError(error, "Falha ao cadastrar.");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = supabaseAdmin();
    if (body.entity === "builder") {
      const id = validId(body.id);
      const name = String(body.name || "").trim().replace(/\s+/g, " ");
      if (!id || !name)
        return NextResponse.json(
          { error: "Construtora e nome válidos são obrigatórios." },
          { status: 400 },
        );
      const { data: builders, error: lookupError } = await supabase
        .from("builders")
        .select("id,name");
      if (lookupError) throw lookupError;
      const duplicate = (builders || []).find(
        (item) =>
          item.id !== id &&
          normalizedName(item.name) === normalizedName(name),
      );
      if (duplicate)
        return NextResponse.json(
          { error: `Já existe a construtora ${duplicate.name}.` },
          { status: 409 },
        );
      const { data, error } = await supabase
        .from("builders")
        .update({
          name,
          category: body.category || "Mista",
          contact_name: body.contact || null,
          phone: body.phone || null,
          regions: (body.regions || []).join(", "),
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return NextResponse.json(
          { error: "Construtora não encontrada." },
          { status: 404 },
        );
    } else if (body.entity === "project") {
      const id = validId(body.id);
      const name = String(body.name || "").trim().replace(/\s+/g, " ");
      const price = Number(body.price);
      if (!id || !name || !Number.isFinite(price))
        return NextResponse.json(
          { error: "Empreendimento, nome e valor de venda são obrigatórios." },
          { status: 400 },
        );
      const { data: current, error: currentError } = await supabase
        .from("projects")
        .select("builder_id")
        .eq("id", id)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current)
        return NextResponse.json(
          { error: "Empreendimento não encontrado." },
          { status: 404 },
        );
      const { data: projects, error: lookupError } = await supabase
        .from("projects")
        .select("id,name")
        .eq("builder_id", current.builder_id);
      if (lookupError) throw lookupError;
      const duplicate = (projects || []).find(
        (item) =>
          item.id !== id &&
          normalizedName(item.name) === normalizedName(name),
      );
      if (duplicate)
        return NextResponse.json(
          { error: `Já existe o empreendimento ${duplicate.name} nesta construtora.` },
          { status: 409 },
        );
      const { data, error } = await supabase
        .from("projects")
        .update({
          name,
          kind: body.kind || null,
          city: normalizeCatalogCity(body.city, body.region),
          region: body.region || null,
          sale_price: price,
          commission_rate: Number(body.commission) || 0,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return NextResponse.json(
          { error: "Empreendimento não encontrado." },
          { status: 404 },
        );
      await saveProjectDescription(supabase, id, body.description);
    } else
      return NextResponse.json(
        { error: "Operação inválida." },
        { status: 400 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return catalogError(error, "Falha ao editar.");
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const supabase = supabaseAdmin();
    const id = validId(body.id);
    if (!id)
      return NextResponse.json(
        { error: "Cadastro inválido." },
        { status: 400 },
      );
    if (body.entity === "builder") {
      const { data, error } = await supabase
        .from("builders")
        .update({ active: false })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return NextResponse.json(
          { error: "Construtora não encontrada." },
          { status: 404 },
        );
      const { error: projectsError } = await supabase
        .from("projects")
        .update({ active: false })
        .eq("builder_id", id);
      if (projectsError) throw projectsError;
    } else if (body.entity === "project") {
      const { data, error } = await supabase
        .from("projects")
        .update({ active: false })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return NextResponse.json(
          { error: "Empreendimento não encontrado." },
          { status: 404 },
        );
    } else
      return NextResponse.json(
        { error: "Operação inválida." },
        { status: 400 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return catalogError(error, "Falha ao excluir.");
  }
}
