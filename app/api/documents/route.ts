import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { documentsBucket, supabaseAdmin } from "@/lib/supabase-admin";
import { transitionClient } from "@/lib/client-journey";

export const runtime = "nodejs";
const allowed = ["application/pdf", "image/jpeg", "image/png"];
const maxFiles = 30;
const maxFileSize = 20 * 1024 * 1024;

type StoredDocument = {
  id: number;
  document_type: string;
  storage_path: string;
  created_at: string;
};

export async function GET(request: Request) {
  const clientId = Number(new URL(request.url).searchParams.get("clientId"));
  if (!clientId)
    return NextResponse.json(
      { error: "Cliente é obrigatório" },
      { status: 400 },
    );
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("id,document_type,file_name,storage_path,mime_type,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const documents = await Promise.all(
    (data || []).map(async (document) => {
      const { data: signed } = await supabase.storage
        .from(documentsBucket())
        .createSignedUrl(document.storage_path, 60 * 60);
      return { ...document, url: signed?.signedUrl || null };
    }),
  );
  return NextResponse.json(documents);
}

const safeFilePart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

async function assertClient(clientId: number) {
  const supabase = supabaseAdmin();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!client)
    throw new Error(
      "Cliente não encontrado. Selecione um cliente real antes de anexar documentos.",
    );
  return supabase;
}

async function appendStoredPdf(output: PDFDocument, bytes: Uint8Array) {
  const source = await PDFDocument.load(bytes);
  const pages = await output.copyPages(source, source.getPageIndices());
  pages.forEach((page) => output.addPage(page));
}

async function appendFile(
  output: PDFDocument,
  bytes: Uint8Array,
  mimeType: string,
) {
  if (mimeType === "application/pdf") {
    await appendStoredPdf(output, bytes);
    return;
  }
  const image =
    mimeType === "image/png"
      ? await output.embedPng(bytes)
      : await output.embedJpg(bytes);
  const portrait = [595.28, 841.89] as const;
  const landscape = [841.89, 595.28] as const;
  const pageSize = image.width > image.height ? landscape : portrait;
  const page = output.addPage([...pageSize]);
  const margin = 28;
  const scale = Math.min(
    (pageSize[0] - margin * 2) / image.width,
    (pageSize[1] - margin * 2) / image.height,
  );
  page.drawImage(image, {
    x: (pageSize[0] - image.width * scale) / 2,
    y: (pageSize[1] - image.height * scale) / 2,
    width: image.width * scale,
    height: image.height * scale,
  });
}

async function storeMergedDocument(
  clientId: number,
  documentType: string,
  output: PDFDocument,
  filesMerged: number,
) {
  const supabase = await assertClient(clientId);
  const merged = Buffer.from(await output.save());
  const hash = crypto.createHash("sha256").update(merged).digest("hex");
  const objectPath = `${clientId}/${Date.now()}-${safeFilePart(documentType)}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(documentsBucket())
    .upload(objectPath, merged, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw uploadError;
  const { error: insertError } = await supabase.from("documents").insert({
    client_id: clientId,
    document_type: documentType,
    file_name: `${documentType}.pdf`,
    storage_path: objectPath,
    mime_type: "application/pdf",
    sha256: hash,
  });
  if (insertError) {
    await supabase.storage.from(documentsBucket()).remove([objectPath]);
    throw insertError;
  }
  const { data: client } = await supabase
    .from("clients")
    .select("finance_stage")
    .eq("id", clientId)
    .maybeSingle();
  if (client?.finance_stage === "Aguardando documentação") {
    await transitionClient({
      clientId,
      eventType: "DOCUMENTS_RECEIVED",
      title: "Pasta recebida",
      description: `${filesMerged} arquivo(s) recebido(s) em ${documentType}.`,
      funnelStage: "Pasta recebida",
      financeStage: "Documentação recebida",
      nextAction: "Conferir pasta e iniciar análise",
      metricKey: "folder_received",
    });
  }
  const { data: signed } = await supabase.storage
    .from(documentsBucket())
    .createSignedUrl(objectPath, 60 * 60);
  return {
    ok: true,
    fileName: `${documentType}.pdf`,
    filesMerged,
    pages: output.getPageCount(),
    sha256: hash,
    url: signed?.signedUrl || null,
  };
}

type PreparedFile = { name: string; type: string; size: number; path?: string };

async function downloadPreparedFiles(
  supabase: ReturnType<typeof supabaseAdmin>,
  files: PreparedFile[],
) {
  return Promise.all(
    files.map(async (file) => {
      const { data: blob, error } = await supabase.storage
        .from(documentsBucket())
        .download(String(file.path));
      if (error || !blob)
        throw error || new Error(`Falha ao abrir ${file.name}.`);
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        type: file.type,
      };
    }),
  );
}

async function handleDirectUpload(request: Request) {
  const body = await request.json();
  const clientId = Number(body.clientId);
  const documentType = String(body.documentType || "Documento");
  const files = Array.isArray(body.files) ? (body.files as PreparedFile[]) : [];
  if (!clientId || !files.length)
    return NextResponse.json(
      { error: "Arquivo e cliente são obrigatórios" },
      { status: 400 },
    );
  if (files.length > maxFiles)
    return NextResponse.json(
      { error: `Máximo de ${maxFiles} arquivos por documento` },
      { status: 413 },
    );
  if (files.some((file) => !allowed.includes(file.type)))
    return NextResponse.json(
      { error: "Envie somente PDF, JPG, JPEG ou PNG" },
      { status: 415 },
    );
  if (files.some((file) => Number(file.size) > maxFileSize))
    return NextResponse.json(
      { error: "Cada arquivo pode ter no máximo 20 MB." },
      { status: 413 },
    );

  let supabase;
  try {
    supabase = await assertClient(clientId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cliente não encontrado",
      },
      { status: 404 },
    );
  }

  if (body.action === "prepare") {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const extension =
          file.name
            .split(".")
            .pop()
            ?.replace(/[^a-z0-9]/gi, "") || "bin";
        const path = `${clientId}/temp/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { data, error } = await supabase.storage
          .from(documentsBucket())
          .createSignedUploadUrl(path);
        if (error) throw error;
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          path,
          signedUrl: data.signedUrl,
        };
      }),
    );
    return NextResponse.json({ ok: true, uploads });
  }

  if (body.action !== "complete")
    return NextResponse.json({ error: "Operação inválida." }, { status: 400 });

  const paths = files.map((file) => String(file.path || ""));
  if (paths.some((path) => !path.startsWith(`${clientId}/temp/`)))
    return NextResponse.json(
      { error: "Arquivo temporário inválido." },
      { status: 400 },
    );

  try {
    const output = await PDFDocument.create();
    const downloaded = await downloadPreparedFiles(supabase, files);
    for (const file of downloaded) {
      await appendFile(output, file.bytes, file.type);
    }
    const result = await storeMergedDocument(
      clientId,
      documentType,
      output,
      files.length,
    );
    await supabase.storage.from(documentsBucket()).remove(paths);
    return NextResponse.json(result);
  } catch (error) {
    await supabase.storage.from(documentsBucket()).remove(paths);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao unificar os arquivos.",
      },
      { status: 422 },
    );
  }
}

export async function POST(request: Request) {
  if ((request.headers.get("content-type") || "").includes("application/json"))
    return handleDirectUpload(request);
  const form = await request.formData();
  const files = [...form.getAll("files"), ...form.getAll("file")].filter(
    (item): item is File => item instanceof File,
  );
  const clientId = Number(form.get("clientId"));
  const documentType = String(form.get("documentType") || "Documento");
  if (!files.length || !clientId)
    return NextResponse.json(
      { error: "Arquivo e cliente são obrigatórios" },
      { status: 400 },
    );
  if (files.length > maxFiles)
    return NextResponse.json(
      { error: "Máximo de 30 arquivos por documento" },
      { status: 413 },
    );
  if (files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) {
    return NextResponse.json(
      { error: "O conjunto excede 4 MB. Reduza as fotos ou divida o envio." },
      { status: 413 },
    );
  }
  if (files.some((file) => !allowed.includes(file.type)))
    return NextResponse.json(
      { error: "Envie somente PDF, JPG, JPEG ou PNG" },
      { status: 415 },
    );

  let supabase;
  try {
    supabase = await assertClient(clientId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cliente não encontrado",
      },
      { status: 404 },
    );
  }

  const output = await PDFDocument.create();
  try {
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await appendFile(output, bytes, file.type);
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Um dos arquivos está corrompido ou não corresponde ao formato informado.",
      },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json(
      await storeMergedDocument(clientId, documentType, output, files.length),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao salvar documento.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const clientId = Number(body.clientId);
  const documentType = String(body.documentType || "");
  if (!clientId || !documentType)
    return NextResponse.json(
      { error: "Cliente e documento são obrigatórios." },
      { status: 400 },
    );

  let supabase;
  try {
    supabase = await assertClient(clientId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cliente não encontrado",
      },
      { status: 404 },
    );
  }
  const { data, error } = await supabase
    .from("documents")
    .select("id,storage_path")
    .eq("client_id", clientId)
    .eq("document_type", documentType);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: true, deleted: 0 });
  const paths = data.map((item) => item.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from(documentsBucket())
      .remove(paths);
    if (storageError)
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 },
      );
  }
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("client_id", clientId)
    .eq("document_type", documentType);
  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: data.length });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const clientId = Number(body.clientId);
  const stage = body.stage === "full" ? "full" : "pre";
  const stagePrefix =
    stage === "full" ? "Dossiê completo | " : "Pré-análise | ";
  if (!clientId)
    return NextResponse.json(
      { error: "Selecione um cliente antes de montar o pacote." },
      { status: 400 },
    );

  let supabase;
  try {
    supabase = await assertClient(clientId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cliente não encontrado",
      },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, document_type, storage_path, created_at")
    .eq("client_id", clientId)
    .like("document_type", `${stagePrefix}%`)
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const newestByType = new Map<string, StoredDocument>();
  for (const item of (data || []) as StoredDocument[]) {
    if (!item.document_type.includes("Pacote consolidado"))
      newestByType.set(item.document_type, item);
  }
  const documents = [...newestByType.values()].sort((a, b) =>
    a.document_type.localeCompare(b.document_type, "pt-BR"),
  );
  if (!documents.length)
    return NextResponse.json(
      { error: "Nenhum documento deste checklist foi anexado." },
      { status: 422 },
    );

  const output = await PDFDocument.create();
  for (const item of documents) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(documentsBucket())
      .download(item.storage_path);
    if (downloadError || !blob)
      return NextResponse.json(
        { error: `Não foi possível abrir ${item.document_type}.` },
        { status: 500 },
      );
    await appendStoredPdf(output, new Uint8Array(await blob.arrayBuffer()));
  }
  const merged = Buffer.from(await output.save());
  const packageType = `${stagePrefix}Pacote consolidado para ${stage === "full" ? "dossiê completo" : "análise"}`;
  const objectPath = `${clientId}/${Date.now()}-${safeFilePart(packageType)}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(documentsBucket())
    .upload(objectPath, merged, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const hash = crypto.createHash("sha256").update(merged).digest("hex");
  const { error: insertError } = await supabase.from("documents").insert({
    client_id: clientId,
    document_type: packageType,
    file_name: `${stage === "full" ? "dossie-completo" : "pre-analise"}-consolidado.pdf`,
    storage_path: objectPath,
    mime_type: "application/pdf",
    sha256: hash,
  });
  if (insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  const { data: signed } = await supabase.storage
    .from(documentsBucket())
    .createSignedUrl(objectPath, 60 * 60 * 24);
  await supabase.from("client_events").insert({
    client_id: clientId,
    event_type: "DOCUMENT_PACKAGE",
    title: "PDF consolidado gerado",
    description: `${documents.length} documentos unidos para ${stage === "full" ? "dossiê completo" : "pré-análise"}.`,
    metric_key: "documents_package",
  });
  return NextResponse.json({
    ok: true,
    documentsMerged: documents.length,
    pages: output.getPageCount(),
    signedUrl: signed?.signedUrl || null,
  });
}
