// ─── Sprint 16 — Copiloto IA DNA Imóveis ────────────────────────────────────────
// Tipos canônicos do módulo Copiloto IA.
// Todos alinhados com o provider pattern (preparado para OpenAI, Claude, Gemini,
// DeepSeek, OpenRouter, Ollama sem acoplamento).

// ─── AI Provider ───────────────────────────────────────────────────────────────

export type AIProviderType = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'openrouter' | 'ollama' | 'mock'

export const AI_PROVIDER_LABEL: Record<AIProviderType, string> = {
  openai: 'OpenAI (GPT-4o)',
  claude: 'Anthropic Claude',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  ollama: 'Ollama (Local)',
  mock: 'Mock (FASE 1)',
}

export interface AIProviderConfig {
  tipo: AIProviderType
  apiKey: string
  model: string
  baseUrl?: string         // OpenRouter/Ollama: endpoint customizado
  temperature?: number     // default 0.3 (precisão > criatividade)
  maxTokens?: number       // default 2000
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionRequest {
  messages: AIChatMessage[]
  temperature?: number
  maxTokens?: number
}

export interface AICompletionResponse {
  ok: boolean
  content: string
  erro?: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface AIProvider {
  config: AIProviderConfig
  nome: string
  completar(prompt: AICompletionRequest): Promise<AICompletionResponse>
}

// ─── Copilot Context ───────────────────────────────────────────────────────────

export interface CopilotContext {
  usuario: {
    id: string
    nome: string
    perfil: string
    equipe: string | null
  }
  resumo: {
    leadsAtivos: number
    clientesAtendimento: number
    vendasMes: number
    vgvMes: number
    comissaoPrevista: number
    comissaoRecebida: number
    metaRestante: number
    agendamentosHoje: number
    comparecimentosHoje: number
  }
  prioridades: {
    followUpsVencidos: number
    clientesSemContato: number
    clientesParados: number
    documentosPendentes: number
  }
  pipeline: {
    clientesAltaChance: { nome: string; etapa: string; chance: number }[]
    visitasHoje: { nome: string; horario: string; empreendimento: string | null }[]
    clientesEmRisco: { nome: string; motivo: string; dias: number }[]
  }
  insights: {
    melhorHorario: { hora: number; volume: number }
    melhorEmpreendimento: { nome: string; conversao: number }
    melhorCorretor: { nome: string; vendas: number }
    maiorGargalo: { etapa: string; quantidade: number }
    melhorConversao: { etapa: string; taxa: number }
    maiorPerda: { etapa: string; quantidade: number }
  }
  /** Timestamp de quando o contexto foi gerado */
  geradoEm: string
}

// ─── Seção 1: Resumo Inteligente ───────────────────────────────────────────────

export interface CopilotResumoInteligente {
  titulo: string
  saudacao: string
  prioridades: {
    label: string
    valor: number
    cor: 'red' | 'amber' | 'green' | 'blue'
    descricao: string
  }[]
  fechamentosProvaveis: {
    nome: string
    etapa: string
    chance: number
    acao: string
  }[]
}

// ─── Seção 2: Recomendações ────────────────────────────────────────────────────

export interface CopilotRecomendacao {
  id: string
  icone: string
  titulo: string
  descricao: string
  acao: string
  rota?: string // /dashboard/clientes/{id} ou /dashboard/whatsapp
  prioridade: 'ALTISSIMA' | 'ALTA' | 'MEDIA' | 'INFORMATIVA'
}

// ─── Seção 3: Perguntas ────────────────────────────────────────────────────────

export interface CopilotPergunta {
  id: string
  usuarioId: string
  pergunta: string
  resposta: string
  dadosContexto: unknown
  util: boolean | null
  created_at: string
}

export const COPILOT_PERGUNTAS_SUGERIDAS = [
  'Quem devo atender hoje?',
  'Quem está parado há mais tempo?',
  'Quanto falta para minha meta?',
  'Quem mais vendeu este mês?',
  'Quais clientes têm maior chance de fechar?',
  'Quais documentos estão pendentes?',
  'Qual empreendimento converte mais?',
  'Onde estou perdendo mais clientes?',
] as const

// ─── Seção 4: Comandos ─────────────────────────────────────────────────────────

export interface CopilotComando {
  id: string
  icone: string
  label: string
  descricao: string
  acao: 'CRIAR_AGENDAMENTO' | 'ABRIR_FICHA' | 'ABRIR_WHATSAPP' | 'MOVER_CLIENTE' | 'CRIAR_ATIVIDADE' | 'ABRIR_FINANCIAMENTO'
  rota?: string
  precisaClienteId: boolean
}

export const COPILOT_COMANDOS_BASICOS: Omit<CopilotComando, 'id'>[] = [
  { icone: '📅', label: 'Criar Agendamento', descricao: 'Agendar visita para um cliente', acao: 'CRIAR_AGENDAMENTO', precisaClienteId: true },
  { icone: '📋', label: 'Abrir Ficha', descricao: 'Ver dados completos de um cliente', acao: 'ABRIR_FICHA', precisaClienteId: true },
  { icone: '💬', label: 'Abrir WhatsApp', descricao: 'Ir para Central WhatsApp', acao: 'ABRIR_WHATSAPP', precisaClienteId: true },
  { icone: '🔄', label: 'Mover Cliente', descricao: 'Avançar ou retroceder etapa', acao: 'MOVER_CLIENTE', precisaClienteId: true },
  { icone: '✅', label: 'Criar Atividade', descricao: 'Registrar contato, WhatsApp ou follow-up', acao: 'CRIAR_ATIVIDADE', precisaClienteId: true },
  { icone: '💰', label: 'Abrir Financeiro', descricao: 'Ir para Central Financeira', acao: 'ABRIR_FINANCIAMENTO', precisaClienteId: false },
]

// ─── Seção 5: Insights ─────────────────────────────────────────────────────────

export interface CopilotInsight {
  icone: string
  titulo: string
  valor: string
  descricao: string
  tendencia: 'subindo' | 'estavel' | 'caindo'
  detalhes: string
}

// ─── Seção 6: Memória ──────────────────────────────────────────────────────────

export interface CopilotMemoriaItem {
  id: string
  tipo: 'pergunta' | 'recomendacao_aceita' | 'recomendacao_ignorada' | 'comando_executado' | 'insight_visualizado' | 'erro'
  pergunta: string | null
  resposta: string | null
  acao: string | null
  origem: string | null
  util: boolean | null
  created_at: string
}

// ─── Estado da Sessão ──────────────────────────────────────────────────────────

export interface CopilotEstado {
  resumo: CopilotResumoInteligente | null
  remediacoes: CopilotRecomendacao[]
  perguntasSugeridas: readonly string[]
  ultimaResposta: string | null
  processando: boolean
  modo: 'idle' | 'perguntando' | 'executando'
}

// ─── Ações do Copilot (Server Actions) ─────────────────────────────────────────

export type CopilotActionType =
  | 'gerar_resumo'
  | 'gerar_recomendacoes'
  | 'processar_pergunta'
  | 'processar_comando'
  | 'gerar_insight'
  | 'registrar_memoria'

export interface CopilotActionPayload {
  tipo: CopilotActionType
  usuarioId: string
  pergunta?: string
  comando?: string
  clienteId?: string
  dados?: Record<string, unknown>
}

export interface CopilotActionResult {
  ok: boolean
  dados: unknown
  erro?: string
}