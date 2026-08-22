import { NextResponse } from "next/server";
import pdf from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

const MONEY = "(?:R\\$\\s*)?([\\d.]+,\\d{2})";

function value(raw?: string) {
  if (!raw) return 0;
  return (
    Number(
      raw
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, ""),
    ) || 0
  );
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ");
}

function firstMoney(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*:?\\s*${MONEY}`, "i"));
    if (match?.[1]) return value(match[1]);
  }
  return 0;
}

function largestMoney(text: string, labels: string[]) {
  const amounts: number[] = [];
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*:?\\s*${MONEY}`, "gi");
    for (const match of text.matchAll(pattern)) {
      const amount = value(match[1]);
      if (amount > 0) amounts.push(amount);
    }
  }
  return amounts.length ? Math.max(...amounts) : 0;
}

function lowestFirstInstallment(text: string) {
  const label = /(?:1(?:a|ª)|Primeira)\s*Prestacao/i.exec(text);
  if (!label) return 0;
  const afterLabel = text.slice((label.index || 0) + label[0].length);
  const lastLabel = /Ultima\s*Prestacao/i.exec(afterLabel);
  const block = afterLabel.slice(0, lastLabel?.index ?? 80);
  const amounts = [...block.matchAll(/R\$\s*([\d.]+,\d{2})/gi)]
    .map((match) => value(match[1]))
    .filter((amount) => amount > 0);
  return amounts.length ? Math.min(...amounts) : 0;
}

function parseSimulation(source: string) {
  const text = normalize(source);
  const propertyValue = firstMoney(text, ["Valor (?:aproximado )?do imovel"]);
  const financing = largestMoney(text, [
    "Valor de financiamento(?:\\s*\\+\\s*Despesa[\\s\\S]{0,120}?)?",
    "Valor do financiamento",
  ]);
  let subsidy = firstMoney(text, [
    "Subsidio(?: complementar| Programa Minha Casa, Minha Vida)?",
    "Desconto",
  ]);
  const entry = firstMoney(text, ["Valor (?:da|de) entrada"]);

  const installment = lowestFirstInstallment(text);

  const term = Number(
    text.match(/Prazo (?:escolhido|Maximo)\s*:?\s*(\d{2,3})\s*meses/i)?.[1] ||
      text.match(/Prazo\s*:?\s*(\d{2,3})\s*meses/i)?.[1] ||
      0,
  );
  const system = /\bPRICE\b/i.test(text)
    ? "PRICE"
    : /\bSAC\b/i.test(text)
      ? "SAC"
      : "";
  const modality =
    /CONSTRUCAO\/AQ TER|Aquisicao e Construcao|construcao.*terreno/i.test(text)
      ? "Aquisição e construção"
      : /Empreendimento|imovel na planta|IM\. PLANTA/i.test(text)
        ? "Empreendimento"
        : "Imóvel novo";

  if (subsidy > 0 && subsidy < 1) subsidy = 0;
  if (!subsidy && propertyValue && financing && entry) {
    subsidy = Math.max(0, propertyValue - financing - entry);
  }

  const found = [propertyValue, financing, installment, term].filter(
    Boolean,
  ).length;
  return {
    propertyValue,
    financing,
    subsidy,
    entry,
    installment,
    term,
    system,
    modality,
    confidence: found / 4,
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Selecione um PDF da CAIXA." },
        { status: 400 },
      );
    }

    const data = await pdf(Buffer.from(await file.arrayBuffer()));
    const parsed = parseSimulation(data.text || "");
    if (!parsed.financing || !parsed.installment) {
      return NextResponse.json(
        {
          error:
            "O PDF foi lido, mas não contém financiamento e prestação identificáveis.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ ...parsed, fileName: file.name });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao analisar a simulação.",
      },
      { status: 500 },
    );
  }
}
