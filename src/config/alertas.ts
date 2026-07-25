// ─── Configuração Centralizada de Alertas ─────────────────────────────────────
// Sprint 10 — thresholds, severidades e config visual dos alertas (Sprints 3, 5, 8)

/** Thresholds de tempo que disparam alertas */
export const ALERTA_THRESHOLDS = {
  /** Dispara alerta de "sem contato" quando cliente está sem atividade há N dias */
  SEM_CONTATO_DIAS: 3,
  /** Dispara alerta de "parado na etapa" quando cliente está há N dias na mesma etapa */
  PARADO_ETAPA_DIAS: 7,
  /** Dispara alerta de "cliente esquecido" quando sem contato há N dias (follow-up) */
  ESQUECIDO_DIAS: 5,
  /** Pós-venda: alerta se prazo vence em até N dias */
  POS_VENDA_PRAZO_DIAS: 3,
} as const

/** Tipos de alerta no sistema */
export type AlertaTipo = 'sem_contato' | 'agendamento' | 'doc_pendente' | 'pos_venda'

/** Severidade do alerta */
export type AlertaUrgencia = 'alta' | 'media' | 'baixa'

/** Configuração visual de cada tipo de alerta */
export interface AlertaVisualConfig {
  label: string
  emoji: string
  corBg: string
  corBadge: string
}

export const ALERTA_VISUAL: Record<AlertaTipo, AlertaVisualConfig> = {
  sem_contato:   { label: 'Sem contato',   emoji: '⚠️', corBg: 'bg-red-50 border-red-200',     corBadge: 'bg-red-100 text-red-700' },
  agendamento:   { label: 'Agendamento',   emoji: '📅', corBg: 'bg-blue-50 border-blue-200',   corBadge: 'bg-blue-100 text-blue-700' },
  doc_pendente:  { label: 'Documento',     emoji: '📄', corBg: 'bg-amber-50 border-amber-200', corBadge: 'bg-amber-100 text-amber-700' },
  pos_venda:     { label: 'Pós-Venda',     emoji: '🏠', corBg: 'bg-indigo-50 border-indigo-200', corBadge: 'bg-indigo-100 text-indigo-700' },
}