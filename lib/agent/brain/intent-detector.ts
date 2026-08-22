import type { IntentType } from "./types.ts";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const rules: Array<[IntentType, RegExp, number]> = [
  ["HUMAN_REQUEST", /\b(atendente|humano|pessoa de verdade|falar com alguem)\b/, 0.99],
  ["OPT_OUT", /\b(pare|nao (me )?mande|remova meu contato|sair da lista)\b/, 0.99],
  ["FINANCING_REQUEST", /\b(financiar|financiamento|quanto.*financi|parcela|subsidio)\b/, 0.96],
  ["SIMULATION_REQUEST", /\b(simulacao|simular)\b/, 0.94],
  ["DOCUMENT_SENT", /\b(enviei|mandei|segue|anexei).*(documento|rg|cpf|cnh|holerite|comprovante)|\b(documento|rg|cpf|cnh|holerite)\b.*\b(anexo|envio)\b/, 0.93],
  ["VISIT_REQUEST", /\b(visitar|visita|conhecer o imovel|agendar)\b/, 0.92],
  ["PRICE_REQUEST", /\b(preco|qual (?:e|o) valor|valor d[oa]|quanto custa)\b/, 0.91],
  ["LOCATION_REQUEST", /\b(onde fica|localizacao|endereco|bairro|regiao)\b/, 0.91],
  ["OBJECTION_PARTNER_DECISION", /\b(?:(esposa|esposo|marido|companheir[oa]).*(falar|conversar|decidir|ver)|(falar|conversar|decidir|ver).*(esposa|esposo|marido|companheir[oa]))\b/, 0.92],
  ["OBJECTION_TIMING", /\b(vou pensar|depois|agora nao|outro momento)\b/, 0.9],
  ["OBJECTION_ENTRY", /\b(entrada).*(alta|cara|nao tenho|dificil)\b/, 0.92],
  ["OBJECTION_INSTALLMENT", /\b(parcela).*(alta|cara|pesada|nao cabe)\b/, 0.92],
  ["OBJECTION_LOCATION", /\b(longe|localizacao ruim|bairro ruim)\b/, 0.9],
  ["COMPLAINT", /\b(reclam|problema|insatisfeit|absurdo)\b/, 0.88],
  ["DECLINE", /\b(nao quero|sem interesse|desisti)\b/, 0.95],
  ["ACCEPTANCE", /\b(aceito|vamos fechar|quero seguir|pode continuar)\b/, 0.92],
  ["NEGOTIATION", /\b(desconto|negociar|proposta|condicao melhor)\b/, 0.89],
  ["QUALIFICATION_DATA", /\b(renda|salario|casad[oa]|solteir[oa]|autonom[oa]|clt|dependente|nasc|profissao)\b/, 0.88],
  ["PROPERTY_INTEREST", /\b(apartamento|casa|imovel|empreendimento|residencial|village|quartos?)\b/, 0.84],
  ["GREETING", /^(oi|ola|bom dia|boa tarde|boa noite)\b/, 0.86],
];

export function detectIntents(text: string) {
  const input = normalize(text);
  const matches = rules.filter(([, rule]) => rule.test(input)).map(([type, , confidence]) => ({ type, confidence }));
  return matches.length ? matches : [{ type: "OTHER" as const, confidence: 0.5 }];
}
