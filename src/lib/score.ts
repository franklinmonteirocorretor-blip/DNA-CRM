// ─── Biblioteca de Score e Prioridade ─────────────────────────────────────────
// Sprint 10 — cálculo de score de cliente, probabilidade de fechamento e prioridade

import { ALERTA_THRESHOLDS } from '@/src/config/alertas'
import { ETAPA_ORDEM } from '@/src/config/pipeline'
import type { EtapaFunil } from '@/src/types'

/**
 * Calcula a probabilidade de fechamento de um cliente (0–100)
 * Baseada na etapa atual, documentos, tempo no funil e contatos
 */
export function calcularProbabilidadeFechamento(params: {
  etapaAtual: string
  diasNaEtapa: number
  docsPendentes: number
  totalContatos: number
  totalAgendamentos: number
  totalComparecimentos: number
}): number {
  let score = 0
  const idx = ETAPA_ORDEM.indexOf(params.etapaAtual as EtapaFunil)

  // Base: posição no funil (cada etapa = ~9%, máximo 90%)
  score += Math.min(idx * 9, 90)

  // Penalidade por tempo excessivo na etapa
  if (params.diasNaEtapa > ALERTA_THRESHOLDS.PARADO_ETAPA_DIAS) {
    score -= Math.min((params.diasNaEtapa - ALERTA_THRESHOLDS.PARADO_ETAPA_DIAS) * 2, 20)
  }

  // Penalidade por documentos pendentes
  if (params.docsPendentes > 0) {
    score -= Math.min(params.docsPendentes * 5, 25)
  }

  // Bônus por engajamento (comparecimentos e agendamentos)
  score += Math.min(params.totalComparecimentos * 3, 15)
  score += Math.min(params.totalAgendamentos * 2, 10)

  // Bônus por contatos realizados
  score += Math.min(Math.floor(params.totalContatos / 5), 10)

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Scoring do cliente para o painel 360 (0–100)
 * Versão simplificada para o Cliente360.painelGerencial.scoreCliente
 */
export function calcularScoreCliente(params: {
  etapaAtual: string
  diasNaEtapa: number
  docsCompletos: boolean
  totalContatos: number
  totalAgendamentos: number
  totalComparecimentos: number
  tempoTotalHoras: number
}): number {
  let score = 50 // base neutra

  // Avanço no funil = +score
  const idx = ETAPA_ORDEM.indexOf(params.etapaAtual as EtapaFunil)
  score += Math.min(idx * 4, 40)

  // Documentos completos = +score
  if (params.docsCompletos) score += 15

  // Engajamento
  score += Math.min(params.totalComparecimentos * 3, 10)
  score += Math.min(params.totalAgendamentos * 2, 5)
  score += Math.min(Math.floor(params.totalContatos / 5), 5)

  // Penalidade: tempo parado
  if (params.diasNaEtapa > ALERTA_THRESHOLDS.PARADO_ETAPA_DIAS) {
    score -= Math.min(
      (params.diasNaEtapa - ALERTA_THRESHOLDS.PARADO_ETAPA_DIAS) * 2,
      20,
    )
  }

  // Penalidade: tempo total muito alto (funil lento)
  if (params.tempoTotalHoras > 720) {
    // >30 dias
    score -= Math.min(Math.floor((params.tempoTotalHoras - 720) / 168) * 2, 10)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Calcula prioridade do follow-up (0–1000)
 * Extraído e generalizado de followup/actions.ts
 */
export function calcularPrioridadeFollowUp(item: {
  etapa_atual: string
  ultima_atividade_em: string
  proxima_acao_em: string | null
  created_at: string
  documentos_pendentes: number
}): number {
  let score = 0
  const diasSemContato = Math.floor(
    (Date.now() - new Date(item.ultima_atividade_em).getTime()) / 86400000,
  )

  // Sem contato há 5+ dias: +100 por dia
  if (diasSemContato >= ALERTA_THRESHOLDS.ESQUECIDO_DIAS) {
    score += Math.min(100 * (diasSemContato - (ALERTA_THRESHOLDS.ESQUECIDO_DIAS - 1)), 500)
  }

  // Leads novos: prioridade média-alta
  if (item.etapa_atual === 'NOVO_LEAD') {
    score += 150
  }

  // Documentos pendentes: urgência
  score += Math.min(item.documentos_pendentes * 50, 200)

  // Próxima ação vencida (atrasada): máxima urgência
  if (item.proxima_acao_em) {
    const prazo = new Date(item.proxima_acao_em).getTime()
    if (prazo < Date.now()) {
      score += 200
    }
  }

  // Lead parado há muito tempo (recém-criado mas sem nunca ter atividade)
  const diasDesdeCriacao = Math.floor(
    (Date.now() - new Date(item.created_at).getTime()) / 86400000,
  )
  if (diasSemContato >= diasDesdeCriacao && diasDesdeCriacao > 3) {
    score += Math.min(diasDesdeCriacao * 10, 100)
  }

  return Math.min(score, 1000)
}