import type { AgentContext, AgentMessage, StructuredFact } from "./types.ts";

const DANGEROUS_PLACEHOLDER = /(?:\{\{|\[|<)?(?:PHONE|CPF|RG|CNH|EMAIL|ADDRESS|DOCUMENT|BANK|URL|PATH|TOKEN|SECRET|BIRTH_DATE|CEP)_REDACTED(?:\}\}|\]|>)?/i;
const OMITTED_KEYS = new Set(["id", "clientid", "client_id", "conversationid", "conversation_id", "messageid", "message_id", "sourcemessageid", "source_message_id", "provideridentity", "provider_identity"]);

export class UnsafePIIPlaceholderError extends Error {
  readonly code = "UNSAFE_PII_PLACEHOLDER";

  constructor() {
    super("Provider response contains a sensitive PII placeholder.");
    this.name = "UnsafePIIPlaceholderError";
  }
}

export class UnsafeProviderOutputError extends Error {
  readonly code = "UNSAFE_PROVIDER_OUTPUT";

  constructor() {
    super("Provider output contains PII placeholders or sensitive fact keys.");
    this.name = "UnsafeProviderOutputError";
  }
}

function normalizedKey(key: string) {
  return key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

function placeholderForKey(key: string): string | null {
  const value = normalizedKey(key);
  if (/^(?:name|fullname|full_name|clientname|client_name|nome|nomecompleto|nome_completo)$/.test(value)) return "CLIENTE";
  if (/(?:^|_)cpf(?:$|_)|cpfnumber/.test(value)) return "CPF_REDACTED";
  if (/(?:^|_)rg(?:$|_)|rgnumber/.test(value)) return "RG_REDACTED";
  if (/(?:^|_)cnh(?:$|_)|cnhnumber/.test(value)) return "CNH_REDACTED";
  if (/(?:phone|telefone|celular|whatsapp)/.test(value)) return "PHONE_REDACTED";
  if (/(?:email|e_mail)/.test(value)) return "EMAIL_REDACTED";
  if (/(?:address|endereco|logradouro|street|numero_residencia|address_number|addressnumber)/.test(value)) return "ADDRESS_REDACTED";
  if (/(?:document_number|documentnumber|documento_numero|file_name|filename|storage_path|storagepath|document_url|documenturl|file_url|fileurl)/.test(value)) return "DOCUMENT_REDACTED";
  if (/(?:bank_account|bankaccount|bank_data|bankdata|dados_bancarios|agencia|conta_bancaria|contabancaria|pix_key|pixkey|chave_pix|chavepix)/.test(value)) return "BANK_REDACTED";
  if (/(?:birth_date|birthdate|date_of_birth|dateofbirth|data_nascimento|datanascimento|nascimento)/.test(value)) return "BIRTH_DATE_REDACTED";
  if (/^(?:cep|postal_code|postalcode|zip_code|zipcode)$/.test(value)) return "CEP_REDACTED";
  if (/(?:token|secret|api_key|apikey|password|senha|authorization)/.test(value)) return "SECRET_REDACTED";
  return null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactTextValue(input: string, knownNames: string[] = []) {
  let output = input;
  for (const name of knownNames.filter((item) => item.trim().split(/\s+/).length > 1).sort((a, b) => b.length - a.length)) {
    output = output.replace(new RegExp(`\\b${escapeRegex(name.trim()).replace(/\\ /g, "\\s+")}\\b`, "giu"), "CLIENTE");
  }
  return output
    .replace(/\b(?:nome(?:\s+completo)?|cliente)\s*[:=-]\s*[A-ZÀ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-Ý][\p{L}'-]+){1,5}/giu, (match) => `${match.slice(0, match.search(/[:=-]/) + 1)} CLIENTE`)
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "CPF_REDACTED")
    .replace(/\bCPF\s*[:#-]?\s*\d{11}\b/giu, "CPF_REDACTED")
    .replace(/\bRG\s*[:#-]?\s*[\d.-]{5,14}\b/giu, "RG_REDACTED")
    .replace(/\bCNH\s*[:#-]?\s*\d{9,12}\b/giu, "CNH_REDACTED")
    .replace(/\b(?:data\s+de\s+nascimento|nascimento)\s*[:#-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/giu, "BIRTH_DATE_REDACTED")
    .replace(/\bCEP\s*[:#-]?\s*\d{5}-?\d{3}\b/giu, "CEP_REDACTED")
    .replace(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/giu, "EMAIL_REDACTED")
    .replace(/(?:\+?55\s*)?(?:\(\d{2}\)|\d{2})\s*9?\d{4}[-.\s]?\d{4}\b/g, "PHONE_REDACTED")
    .replace(/\b(?:Rua|Avenida|Av\.|Travessa|Alameda|Rodovia)\s+[\p{L}0-9 .'’-]+,?\s+(?:n[ºo.]?\s*)?\d+[\p{L}0-9 /-]*/giu, "ADDRESS_REDACTED")
    .replace(/\b(?:ag[eê]ncia|conta(?:\s+banc[aá]ria)?)\s*[:#-]?\s*[\d.-]{3,20}\b/giu, "BANK_REDACTED")
    .replace(/https?:\/\/[^\s)\]}]+/giu, "URL_REDACTED")
    .replace(/\b(?:whatsapp-media|agent-playbooks|storage)\/[\w./%-]+/giu, "PATH_REDACTED")
    .replace(/\b(?:Bearer\s+)?(?:sk|gsk|eyJ)[A-Za-z0-9._-]{12,}\b/g, "SECRET_REDACTED");
}

export function hasUnsafeProviderOutput(value: unknown): boolean {
  if (typeof value === "string") return DANGEROUS_PLACEHOLDER.test(value);
  if (Array.isArray(value)) return value.some(hasUnsafeProviderOutput);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.key === "string" && placeholderForKey(record.key) !== null) return true;
  return Object.entries(record).some(([key, nested]) => placeholderForKey(key) !== null || hasUnsafeProviderOutput(nested));
}

export function assertSafeProviderOutput(value: unknown): void {
  if (hasUnsafeProviderOutput(value)) throw new UnsafeProviderOutputError();
}

function sanitizeUnknown(value: unknown, knownNames: string[]): unknown {
  if (typeof value === "string") return redactTextValue(value, knownNames);
  if (Array.isArray(value)) return value.map((item) => sanitizeUnknown(item, knownNames));
  if (!value || typeof value !== "object") return value;
  const sanitized: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (OMITTED_KEYS.has(normalizedKey(key))) continue;
    const placeholder = placeholderForKey(key);
    sanitized[key] = placeholder || sanitizeUnknown(nested, knownNames);
  }
  return sanitized;
}

function sanitizeFact(fact: StructuredFact, knownNames: string[]): StructuredFact {
  return {
    key: fact.key,
    value: placeholderForKey(fact.key) || sanitizeUnknown(fact.value, knownNames),
    knowledgeType: fact.knowledgeType,
    confidence: fact.confidence,
    active: fact.active,
  };
}

function sanitizeMessage(message: AgentMessage, knownNames: string[]): AgentMessage {
  const safe: AgentMessage = { direction: message.direction };
  if (typeof message.text === "string") safe.text = redactTextValue(message.text, knownNames);
  if (typeof message.body === "string") safe.body = redactTextValue(message.body, knownNames);
  if (message.createdAt) safe.createdAt = message.createdAt;
  return safe;
}

export class PIIRedactionService {
  redactText(text: string): string {
    return redactTextValue(text);
  }

  sanitizeValue(value: unknown): unknown {
    return sanitizeUnknown(value, []);
  }

  minimizeContext(context: AgentContext): AgentContext {
    const rawClient = context.client || {};
    const knownNames = [context.clientName, rawClient.name, rawClient.full_name, rawClient.nome]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const safe: AgentContext = {
      stage: context.stage,
      recentMessages: context.recentMessages.map((message) => sanitizeMessage(message, knownNames)),
      allowedActions: [...context.allowedActions],
      forbiddenActions: [...context.forbiddenActions],
    };
    if (context.participantType) safe.participantType = context.participantType;
    if (context.partyType) safe.partyType = context.partyType;
    if (context.labels) safe.labels = context.labels.map((value) => redactTextValue(value, knownNames));
    if (context.source && typeof context.source === "object") safe.source = sanitizeUnknown({ type: (context.source as Record<string, unknown>).type }, knownNames);
    if (context.interestedProject) safe.interestedProject = redactTextValue(context.interestedProject, knownNames);
    if (context.projectInterest) safe.projectInterest = redactTextValue(context.projectInterest, knownNames);
    if (context.commercialHistory) safe.commercialHistory = sanitizeUnknown(context.commercialHistory, knownNames) as unknown[];
    if (context.summary != null) safe.summary = redactTextValue(context.summary, knownNames);
    if (context.facts) safe.facts = context.facts.map((fact) => sanitizeFact(fact, knownNames));
    if (context.knowledge) safe.knowledge = sanitizeUnknown(context.knowledge, knownNames) as unknown[];
    if (context.missingData) safe.missingData = context.missingData.map((value) => redactTextValue(value, knownNames));
    if (context.objections) safe.objections = sanitizeUnknown(context.objections, knownNames) as unknown[];
    if (context.motivation) safe.motivation = redactTextValue(context.motivation, knownNames);
    if (context.pain) safe.pain = redactTextValue(context.pain, knownNames);
    if (context.commitments) safe.commitments = sanitizeUnknown(context.commitments, knownNames) as unknown[];
    if (context.documents) safe.documents = sanitizeUnknown(context.documents, knownNames) as unknown[];
    if (context.appointments) safe.appointments = sanitizeUnknown(context.appointments, knownNames) as unknown[];
    if (context.creditState) safe.creditState = context.creditState;
    if (context.projectsPresented) safe.projectsPresented = context.projectsPresented.map((value) => redactTextValue(value, knownNames));
    if (context.presentedProjects) safe.presentedProjects = context.presentedProjects.map((value) => redactTextValue(value, knownNames));
    if (context.takeoverMode) safe.takeoverMode = context.takeoverMode;
    if (context.controlMode) safe.controlMode = context.controlMode;
    if (context.catalogMatches) safe.catalogMatches = context.catalogMatches.map(({ id, name, builderName, salePrice, city }) => ({ id, name, builderName, salePrice, city }));
    if (context.capabilities) safe.capabilities = [...context.capabilities];
    return safe;
  }

  renderResponse(text: string, options: { clientFirstName?: string } = {}): string {
    if (DANGEROUS_PLACEHOLDER.test(text)) throw new UnsafePIIPlaceholderError();
    const firstName = options.clientFirstName?.trim().split(/\s+/)[0];
    const safeFirstName = firstName && /^[\p{L}'-]{1,50}$/u.test(firstName) ? firstName : "cliente";
    return text.replace(/(?:\{\{\s*CLIENTE\s*\}\}|\[\s*CLIENTE\s*\]|<\s*CLIENTE\s*>|\bCLIENTE\b)/giu, safeFirstName);
  }
}
