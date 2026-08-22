import { detectIntents } from "./intent-detector.ts";
import type { ExtractionInput, ExtractionResult, StructuredFact } from "./types.ts";

const normalizeNumber = (value: string) => Number(value.replace(/\./g, "").replace(",", "."));
export function extractFacts(input: ExtractionInput): ExtractionResult {
  const facts: StructuredFact[] = [];
  const add = (key: string, value: unknown, confidence = 0.94) => facts.push({ key, value, knowledgeType: "FACT", sourceMessageId: input.sourceMessageId, confidence, active: true });
  const text = input.text;
  const income = text.match(/(?:renda|ganho|sal[aá]rio)\s*(?:de|é|:)?\s*r?\$?\s*([\d.]+(?:,\d{1,2})?)/i);
  if (income) add("approximate_income", normalizeNumber(income[1]));
  const civil = text.match(/\b(solteir[oa]|casad[oa]|divorciad[oa]|vi[uú]v[oa]|uni[aã]o est[aá]vel)\b/i);
  if (civil) add("marital_status", civil[1].toLowerCase());
  const employment = text.match(/\b(clt|aut[oô]nom[oa]|servidor(?:a)? p[uú]blic[oa]|empres[aá]ri[oa]|mei)\b/i);
  if (employment) add("employment_type", employment[1].toLowerCase());
  const dependents = text.match(/(?:tenho|com)\s+(\d+)\s+(?:filhos?|dependentes?)/i);
  if (dependents) add("dependents", Number(dependents[1]));
  const birth = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (birth) add("birth_date", birth[1], 0.9);
  const fgts = /\bfgts\b/i.test(text);
  const restriction = /\b(restri[cç][aã]o|spc|serasa|nome sujo)\b/i.test(text);
  // Sensitive financial claims are intentionally not extracted before verified pre-analysis.
  if (fgts || restriction) { /* presence alone is not a verified value */ }
  return { facts, intents: detectIntents(text) };
}
