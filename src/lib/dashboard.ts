// ─── Biblioteca de Dashboard ──────────────────────────────────────────────────
// Sprint 10 — KPIs agregadas, resumos e cálculos de dashboard

import { KPI_METAS_OFICIAIS } from '@/src/config/kpis'
import { PONTUACAO_RANKING } from '@/src/config/ranking'
import { META_MENSAL_INDIVIDUAL } from '@/src/config/metas'

/**
 * Calcula o resumo da operação a partir de dados brutos
 */
export function calcularResumoOperacao(params: {
  leadsAtivos: number
  clientesAtendimento: number
  agendamentosHoje: number
  comparecimentosHoje: number
  aprovacoesMes: number
  vendasMes: number
  vgvMes: number
  comissaoPrevista: number
}) {
  return params
}

/**
 * Calcula os KPIs de um corretor a partir da produção
 */
export function calcularKPIsCorretor(producao: {
  ligacoes: number
  whatsapps: number
  followUps: number
  agendamentos: number
  comparecimentos: number
  pastas: number
}): {
  percentualDiario: number
  status: 'META_BATIDA' | 'META_PENDENTE'
} {
  const pcts = [
    Math.min(100, (producao.ligacoes / KPI_METAS_OFICIAIS.ligacoes) * 100),
    Math.min(100, (producao.whatsapps / KPI_METAS_OFICIAIS.whatsapps) * 100),
    Math.min(100, (producao.followUps / KPI_METAS_OFICIAIS.followUps) * 100),
    Math.min(100, (producao.agendamentos / KPI_METAS_OFICIAIS.agendamentos) * 100),
    Math.min(100, (producao.comparecimentos / KPI_METAS_OFICIAIS.comparecimentos) * 100),
    Math.min(100, (producao.pastas / KPI_METAS_OFICIAIS.pastas) * 100),
  ]
  const percentualDiario = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  return {
    percentualDiario,
    status: percentualDiario >= 100 ? 'META_BATIDA' : 'META_PENDENTE',
  }
}

/**
 * Soma a produção de uma lista de registros
 * (usado em gestao/actions.ts e operacao/actions.ts — mesma lógica)
 */
export interface ProducaoAccumulator {
  vendas: number
  aprovacoes: number
  agendamentos: number
  comparecimentos: number
  pastas: number
  ligacoes: number
  whatsapps: number
  followUps: number
}

export function somarProducao(rows: Array<{
  vendas: number
  aprovacoes: number
  agendamentos: number
  comparecimentos: number
  pastas: number
  ligacoes?: number
  whatsapps?: number
  followUps?: number
}>): ProducaoAccumulator {
  let acc: ProducaoAccumulator = { vendas: 0, aprovacoes: 0, agendamentos: 0, comparecimentos: 0, pastas: 0, ligacoes: 0, whatsapps: 0, followUps: 0 }
  for (const p of rows ?? []) {
    acc.vendas += p.vendas ?? 0
    acc.aprovacoes += p.aprovacoes ?? 0
    acc.agendamentos += p.agendamentos ?? 0
    acc.comparecimentos += p.comparecimentos ?? 0
    acc.pastas += p.pastas ?? 0
    acc.ligacoes += p.ligacoes ?? 0
    acc.whatsapps += p.whatsapps ?? 0
    acc.followUps += p.followUps ?? 0
  }
  return acc
}