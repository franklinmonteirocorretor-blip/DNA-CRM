// ─── Metas Mensais ─────────────────────────────────────────────────────────────
// Sprint 10 — centraliza metas de vendas, aprovações, agendamentos etc.

/** Meta mensal base por corretor */
export const META_MENSAL_INDIVIDUAL = {
  vendas: 4,
  aprovacoes: 8,
  agendamentos: 40,
  comparecimentos: 30,
  pastas: 20,
} as const

/** Meta mensal da equipe = individual × número de corretores */
export interface MetaMensal { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number }

export function metaMensalEquipe(qtdCorretores: number): MetaMensal {
  return {
    vendas: META_MENSAL_INDIVIDUAL.vendas * qtdCorretores,
    aprovacoes: META_MENSAL_INDIVIDUAL.aprovacoes * qtdCorretores,
    agendamentos: META_MENSAL_INDIVIDUAL.agendamentos * qtdCorretores,
    comparecimentos: META_MENSAL_INDIVIDUAL.comparecimentos * qtdCorretores,
    pastas: META_MENSAL_INDIVIDUAL.pastas * qtdCorretores,
  }
}

/** Calcula percentual de atingimento da meta */
export function calcularPercentualMeta(
  realizado: { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number },
  meta: { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number },
): number {
  const pcts = [
    meta.vendas > 0 ? Math.min(100, (realizado.vendas / meta.vendas) * 100) : 0,
    meta.aprovacoes > 0 ? Math.min(100, (realizado.aprovacoes / meta.aprovacoes) * 100) : 0,
    meta.agendamentos > 0 ? Math.min(100, (realizado.agendamentos / meta.agendamentos) * 100) : 0,
    meta.comparecimentos > 0 ? Math.min(100, (realizado.comparecimentos / meta.comparecimentos) * 100) : 0,
    meta.pastas > 0 ? Math.min(100, (realizado.pastas / meta.pastas) * 100) : 0,
  ]
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
}