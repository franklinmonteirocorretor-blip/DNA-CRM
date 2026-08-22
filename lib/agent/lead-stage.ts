export const LEAD_STAGES = [
  "prospecting",
  "contacted",
  "qualified",
  "awaiting_documents",
  "under_analysis",
  "restricted",
  "conditioned",
  "approved",
  "negotiating",
  "sold",
  "post_sale",
  "lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export type ClientJourneySnapshot = {
  funnelStage?: string | null;
  financeStage?: string | null;
  postSaleStage?: string | null;
};

const normalize = (value?: string | null) =>
  String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function projectLeadStage(snapshot: ClientJourneySnapshot): LeadStage {
  const funnel = normalize(snapshot.funnelStage);
  const finance = normalize(snapshot.financeStage);
  const postSale = normalize(snapshot.postSaleStage);

  if (postSale && !postSale.includes("nao iniciado")) return "post_sale";
  if (/perdid|desist|bloque|sumiu|nao fechou/.test(funnel)) return "lost";
  if (/vend|fechad/.test(funnel)) return "sold";
  if (/negoci|fechamento|proposta/.test(funnel)) return "negotiating";
  if (/aprovado/.test(finance)) return "approved";
  if (/condicionado/.test(finance)) return "conditioned";
  if (/restri/.test(finance)) return "restricted";
  if (/analise|fila de analise|documentacao recebida/.test(finance)) return "under_analysis";
  if (/aguardando document/.test(finance) || /aguardando document/.test(funnel)) return "awaiting_documents";
  if (/qualific/.test(funnel)) return "qualified";
  if (/contat|atendeu|respondeu/.test(funnel)) return "contacted";
  return "prospecting";
}
const TRANSITIONS: Record<LeadStage, readonly LeadStage[]> = {
  prospecting: ["contacted", "lost"],
  contacted: ["qualified", "prospecting", "lost"],
  qualified: ["awaiting_documents", "under_analysis", "lost"],
  awaiting_documents: ["under_analysis", "lost"],
  under_analysis: ["restricted", "conditioned", "approved", "awaiting_documents"],
  restricted: ["under_analysis", "lost"],
  conditioned: ["under_analysis", "approved", "lost"],
  approved: ["negotiating", "lost"],
  negotiating: ["sold", "approved", "lost"],
  sold: ["post_sale", "lost"],
  post_sale: ["lost"],
  lost: ["prospecting", "contacted"],
};

export function canTransitionLead(from: LeadStage, to: LeadStage) {
  return from === to || TRANSITIONS[from].includes(to);
}
