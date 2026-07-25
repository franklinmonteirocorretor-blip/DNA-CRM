// ─── Biblioteca de Pipeline ────────────────────────────────────────────────────
// Sprint 10 — funções de cálculo de pipeline, conversão e tempo de etapa

import type { EtapaFunil } from '@/src/types'
import { ETAPA_ORDEM } from '@/src/config/pipeline'

/** Calcula a taxa de conversão entre duas etapas consecutivas */
export function calcularTaxaConversao(
  contagem: Record<string, number>,
  etapaAtual: EtapaFunil,
): number | null {
  const idx = ETAPA_ORDEM.indexOf(etapaAtual)
  if (idx <= 0) return null // primeira etapa não tem conversão
  const anterior = ETAPA_ORDEM[idx - 1]
  const qtdAnterior = contagem[anterior] ?? 0
  const qtdAtual = contagem[etapaAtual] ?? 0
  if (qtdAnterior === 0) return null
  return Math.round((qtdAtual / qtdAnterior) * 100)
}

/** Calcula a conversão geral (leads → fechamentos) */
export function calcularConversaoGeral(contagem: Record<string, number>): number {
  const totalLeads = Object.values(contagem).reduce((a, b) => a + b, 0)
  const fechamentos = contagem['FECHAMENTOS'] ?? 0
  const posVenda = contagem['POS_VENDA'] ?? 0
  if (totalLeads === 0) return 0
  return Math.round(((fechamentos + posVenda) / totalLeads) * 100)
}

/** Calcula o tempo médio em horas a partir de registros de tempo_etapas */
export function calcularTempoMedioEtapa(
  tempos: Array<{ etapa: string; data_entrada: string; data_saida: string }>,
): number {
  if (tempos.length === 0) return 0
  const totalHoras = tempos.reduce((acc, t) => {
    const horas = (new Date(t.data_saida).getTime() - new Date(t.data_entrada).getTime()) / 3600000
    return acc + horas
  }, 0)
  return Math.round(totalHoras)
}

/** Calcula tempo na etapa atual em horas (desde data_entrada até agora) */
export function calcularTempoEtapaAtualHoras(dataEntrada: string): number {
  return Math.round((Date.now() - new Date(dataEntrada).getTime()) / 3600000)
}

/** Calcula taxa de conversão entre duas etapas consecutivas usando arrays */
export function calcularTaxasConversaoFunil(
  contagemPorEtapa: Record<string, number>,
): Record<string, number | null> {
  const taxas: Record<string, number | null> = {}
  for (let i = 1; i < ETAPA_ORDEM.length; i++) {
    const etapa = ETAPA_ORDEM[i]
    const anterior = ETAPA_ORDEM[i - 1]
    const qtdAnterior = contagemPorEtapa[anterior] ?? 0
    const qtdAtual = contagemPorEtapa[etapa] ?? 0
    taxas[etapa] = qtdAnterior > 0 ? Math.round((qtdAtual / qtdAnterior) * 100) : null
  }
  return taxas
}