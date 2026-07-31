// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Tipos canônicos do módulo WhatsApp (conversas, mensagens, templates, métricas)
// Todos alinhados com a migration 0033_whatsapp_central.sql

// ─── Provedores ────────────────────────────────────────────────────────────────

export type WhatsAppProvedor = 'evolution' | 'meta' | 'zapi' | 'green' | 'mock'

export const WHATSAPP_PROVEDOR_LABEL: Record<WhatsAppProvedor, string> = {
  evolution: 'Evolution API',
  meta: 'Meta Cloud API',
  zapi: 'Z-API',
  green: 'Green API',
  mock: 'Mock (testes)',
}

// ─── Status da Conversa ────────────────────────────────────────────────────────

export type WhatsAppConversaStatus = 'aberta' | 'finalizada' | 'arquivada'

// ─── Remetente ─────────────────────────────────────────────────────────────────

export type WhatsAppRemetente = 'usuario' | 'cliente' | 'sistema'

// ─── Tipo de Mídia ─────────────────────────────────────────────────────────────

export type WhatsAppTipoMensagem =
  | 'texto'
  | 'imagem'
  | 'audio'
  | 'video'
  | 'documento'
  | 'localizacao'
  | 'template'
  | 'sticker'

export const WHATSAPP_TIPO_LABEL: Record<WhatsAppTipoMensagem, string> = {
  texto: 'Texto',
  imagem: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  documento: 'Documento',
  localizacao: 'Localização',
  template: 'Template',
  sticker: 'Sticker',
}

// ─── DB Tipos (espelham as tabelas) ────────────────────────────────────────────

export interface WhatsAppConversa {
  id: string
  cliente_id: string
  usuario_id: string
  provedor: WhatsAppProvedor
  provedor_chat_id: string | null
  telefone_cliente: string
  status: WhatsAppConversaStatus
  ultima_mensagem_em: string
  total_mensagens: number
  created_at: string
  updated_at: string
}

export interface WhatsAppMensagem {
  id: string
  conversa_id: string
  remetente: WhatsAppRemetente
  texto: string
  tipo: WhatsAppTipoMensagem
  media_url: string | null
  media_type: string | null
  template_id: string | null
  template_dados: Record<string, string> | null
  lida: boolean
  enviada_em: string
  entregue_em: string | null
  lida_em: string | null
}

// ─── Conversa Enriquecida (com joins reutilizáveis) ────────────────────────────

export interface WhatsAppConversaEnriquecida {
  conversa: WhatsAppConversa
  cliente: {
    id: string
    nome: string
    telefone: string
    etapa_atual: string
    corretor_nome: string
  }
  naoLidas: number
  ultimaMensagem: WhatsAppMensagem | null
}

// ─── Template ──────────────────────────────────────────────────────────────────

export interface WhatsAppTemplate {
  id: string
  nome: string
  categoria: string // 'boas_vindas', 'lembrete', 'follow_up', 'pos_venda', 'generico'
  corpo: string
  variaveis: string[] // nomes das variáveis no corpo, ex: ['{nome}', '{data}']
  criado_por: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export const WHATSAPP_TEMPLATE_CATEGORIAS = [
  'boas_vindas',
  'lembrete',
  'follow_up',
  'pos_venda',
  'generico',
] as const

export type WhatsAppTemplateCategoria = (typeof WHATSAPP_TEMPLATE_CATEGORIAS)[number]

export const WHATSAPP_TEMPLATE_CATEGORIA_LABEL: Record<WhatsAppTemplateCategoria, string> = {
  boas_vindas: 'Boas-vindas',
  lembrete: 'Lembrete',
  follow_up: 'Follow-up',
  pos_venda: 'Pós-venda',
  generico: 'Genérico',
}

// ─── Métricas ──────────────────────────────────────────────────────────────────

export interface WhatsAppMetricas {
  conversasAbertas: number
  conversasHoje: number
  mensagensEnviadasHoje: number
  mensagensRecebidasHoje: number
  tempoMedioRespostaMinutos: number
  templatesMaisUsados: { nome: string; contagem: number }[]
  conversasPorStatus: { aberta: number; finalizada: number; arquivada: number }
}

// ─── Filtros ───────────────────────────────────────────────────────────────────

export interface WhatsAppFiltros {
  busca: string | null
  status: WhatsAppConversaStatus | 'todas'
  corretorId: string | null
  temNaoLidas: boolean
}

// ─── Mensagem que entra pelo realtime (enriquecida) ────────────────────────────

export interface WhatsAppRealtimeEvent {
  mensagem: WhatsAppMensagem
  conversa: WhatsAppConversa
  cliente: {
    id: string
    nome: string
    telefone: string
  }
  corretor: {
    id: string
    nome: string
  }
}

// ─── Adapter Interface ─────────────────────────────────────────────────────────

export interface WhatsAppProvedorConfig {
  tipo: WhatsAppProvedor
  baseUrl: string
  apiKey: string
  instance?: string // Evolution API: instance name; Meta: phone_number_id
}

export interface WhatsAppSendPayload {
  telefone: string
  texto: string
  tipo?: WhatsAppTipoMensagem
  mediaUrl?: string
  mediaType?: string
  templateNome?: string
  templateDados?: Record<string, string>
}

export interface WhatsAppSendResult {
  ok: boolean
  messageId: string | null
  erro?: string
}

export interface WhatsAppAdapter {
  config: WhatsAppProvedorConfig
  enviar(payload: WhatsAppSendPayload): Promise<WhatsAppSendResult>
  status(messageId: string): Promise<{ status: string; error?: string }>
  webhook?(payload: unknown): Promise<{ ok: boolean }>
}