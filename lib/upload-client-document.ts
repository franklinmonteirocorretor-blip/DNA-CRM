type UploadInput = {
  clientId: number;
  documentType: string;
  files: File[];
};

export type UploadResult = {
  ok: boolean;
  fileName: string;
  filesMerged: number;
  pages: number;
  url: string | null;
};

const readJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Resposta inválida do servidor (${response.status}).` };
  }
};

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/") || file.size < 900 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 2200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return file;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.84),
  );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export async function uploadClientDocument({
  clientId,
  documentType,
  files,
}: UploadInput) {
  if (!clientId) throw new Error("Selecione um cliente real antes do anexo.");
  if (!files.length) throw new Error("Selecione pelo menos um arquivo.");
  const uploadFiles = await Promise.all(files.map(optimizeImage));
  const metadata = uploadFiles.map((file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
  }));
  const prepareResponse = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "prepare",
      clientId,
      documentType,
      files: metadata,
    }),
  });
  const prepared = (await readJson(prepareResponse)) as {
    error?: string;
    uploads?: Array<{
      path: string;
      signedUrl: string;
      name: string;
      type: string;
      size: number;
    }>;
  };
  if (!prepareResponse.ok || !prepared.uploads)
    throw new Error(prepared.error || "Falha ao preparar o envio.");
  const uploads = prepared.uploads;

  await Promise.all(
    uploadFiles.map(async (file, index) => {
      const upload = uploads[index];
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const response = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: form,
      });
      if (!response.ok)
        throw new Error(`${file.name}: falha no envio ao armazenamento.`);
    }),
  );

  const completeResponse = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "complete",
      clientId,
      documentType,
      files: uploads.map(({ path, name, type, size }) => ({
        path,
        name,
        type,
        size,
      })),
    }),
  });
  const completed = (await readJson(completeResponse)) as UploadResult & {
    error?: string;
  };
  if (!completeResponse.ok)
    throw new Error(completed.error || "Falha ao unificar o documento.");
  return completed;
}

export async function deleteClientDocument(
  clientId: number,
  documentType: string,
) {
  const response = await fetch("/api/documents", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, documentType }),
  });
  const result = (await readJson(response)) as {
    error?: string;
    deleted?: number;
  };
  if (!response.ok)
    throw new Error(result.error || "Falha ao excluir o anexo.");
  return result;
}
