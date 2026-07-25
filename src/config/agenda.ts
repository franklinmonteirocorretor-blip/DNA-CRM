// ─── Configuração Centralizada da Agenda ──────────────────────────────────────
// Sprint 10 — status labels, tipos de evento, thresholds

import type { StatusAgendamento, AgendaView, ResultadoComparecimento } from '@/src/types'

/** Labels dos status de agendamento */
export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  AGENDADO:   'Agendado',
  CONFIRMADO: 'Confirmado',
  REMARCADO:  'Remarcado',
  CANCELADO:  'Cancelado',
}

/** Labels de comparecimento */
export const COMPARECIMENTO_LABEL: Record<ResultadoComparecimento, string> = {
  COMPARECEU: 'Compareceu',
  NAO_COMPARECEU: 'Não Compareceu',
}

/** Labels das views de calendário */
export const AGENDA_VIEW_LABELS: Record<AgendaView, string> = {
  monthly: 'Mensal',
  weekly:  'Semanal',
  daily:   'Diário',
  list:    'Lista',
}

/** Config visual para status de agendamento (badges) */
export const STATUS_AGENDAMENTO_VISUAL: Record<StatusAgendamento | 'COMPARECEU' | 'NAO_COMPARECEU', { cor: string; label: string }> = {
  AGENDADO:         { cor: 'bg-blue-100 text-blue-700',       label: 'Agendado' },
  CONFIRMADO:       { cor: 'bg-emerald-100 text-emerald-700', label: 'Confirmado' },
  REMARCADO:        { cor: 'bg-amber-100 text-amber-700',     label: 'Remarcado' },
  CANCELADO:        { cor: 'bg-red-100 text-red-700',         label: 'Cancelado' },
  COMPARECEU:       { cor: 'bg-emerald-100 text-emerald-700', label: 'Compareceu' },
  NAO_COMPARECEU:   { cor: 'bg-gray-100 text-gray-500',       label: 'Não Compareceu' },
}