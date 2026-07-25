// ─── Pontuação e Configuração do Ranking ──────────────────────────────────────
// Sprint 10 — single source of truth para pontuação do ranking

/** Pontuação por ação — usada no ranking de corretores (Sprint 3) */
export const PONTUACAO_RANKING = {
  venda: 1000,
  aprovacao: 300,
  comparecimento: 120,
  agendamento: 70,
  pasta: 40,
  followUp: 10,
  whatsapp: 3,
  ligacao: 1,
} as const

/** Calcula a pontuação total de um corretor a partir da produção */
export function calcularPontuacao(producao: {
  vendas: number
  aprovacoes: number
  comparecimentos: number
  agendamentos: number
  pastas: number
  followUps: number
  whatsapps: number
  ligacoes: number
}): number {
  return (
    producao.vendas * PONTUACAO_RANKING.venda +
    producao.aprovacoes * PONTUACAO_RANKING.aprovacao +
    producao.comparecimentos * PONTUACAO_RANKING.comparecimento +
    producao.agendamentos * PONTUACAO_RANKING.agendamento +
    producao.pastas * PONTUACAO_RANKING.pasta +
    producao.followUps * PONTUACAO_RANKING.followUp +
    producao.whatsapps * PONTUACAO_RANKING.whatsapp +
    producao.ligacoes * PONTUACAO_RANKING.ligacao
  )
}