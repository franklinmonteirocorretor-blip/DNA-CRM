import type { AgentContext, NextBestAction, SalesStrategy } from "./types.ts";

const name = (context: AgentContext) => (context.clientName || String(context.client?.name || "")).trim().split(/\s+/)[0];
export function generateResponse(context: AgentContext, strategy: SalesStrategy, action: NextBestAction): string | undefined {
  const mode = context.takeoverMode || context.controlMode?.toUpperCase() || "AUTO";
  if (mode !== "AUTO" || action === "ESCALATE_HUMAN") return undefined;
  const greeting = name(context) ? `${name(context)}, ` : "";
  switch (action) {
    case "EXPLAIN_PRE_ANALYSIS": return `${greeting}o valor de financiamento, parcela e subsídio precisa ser calculado na pré-análise; não seria seguro estimar. Posso explicar os dados e documentos necessários para começarmos?`;
    case "REQUEST_DOCUMENTS": return `${greeting}para avançarmos com segurança, vamos iniciar a pasta da pré-análise. Posso enviar a lista objetiva dos documentos necessários?`;
    case "REQUEST_MISSING_DOCUMENT": return `${greeting}recebi o envio. Vou conferir a pasta antes de pedir somente o que ainda faltar.`;
    case "SCHEDULE_VISIT": return `${greeting}vamos organizar a visita. Qual dia e período funcionam melhor para você?`;
    case "HANDLE_OBJECTION": return `${greeting}entendi. O que mais pesa nessa decisão: condição financeira, localização ou momento da compra?`;
    case "ASK_MOTIVATION": return `${greeting}o que fez você buscar um imóvel agora?`;
    case "ASK_PAIN": return `${greeting}qual é a principal dificuldade da sua moradia atual?`;
    case "ASK_PROFILE": return `${greeting}para orientar sem repetir perguntas, preciso só do próximo dado que falta. Você trabalha como CLT, autônomo ou em outro vínculo?`;
    case "SEND_PROPERTY_OPTIONS": {
      const latest = String([...context.recentMessages].reverse().find((message) => message.direction.toLowerCase() === "inbound")?.body || "");
      if (/pre[cç]o|valor|quanto custa/i.test(latest)) {
        const project = context.catalogMatches?.[0];
        if (!project) return `${greeting}não localizei esse empreendimento no catálogo atual. Pode confirmar o nome ou a construtora?`;
        const price = typeof project.salePrice === "number" ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(project.salePrice) : "não cadastrado";
        return `${greeting}o valor cadastrado de ${project.name} é ${price}. Quer conferir localização e disponibilidade atual?`;
      }
      return `${greeting}vou considerar seu perfil e consultar o catálogo atual antes de indicar opções. Qual região você prefere?`;
    }
    case "REACTIVATE": return `${greeting}retomamos do ponto registrado no atendimento. Quer continuar pela última pendência ou atualizar algo primeiro?`;
    case "CLOSE_LEAD": return intentsSafeClose(strategy);
    case "WAIT_FOR_CLIENT": return `${greeting}perfeito. Aguardo sua confirmação para seguirmos.`;
    default: return `${greeting}qual é seu principal objetivo com a compra do imóvel?`;
  }
}
const intentsSafeClose = (strategy: SalesStrategy) => strategy === "NURTURE" ? "Entendido. Não enviarei novas mensagens. Se quiser retomar, estarei disponível." : "Entendido. Vou registrar sua decisão.";
