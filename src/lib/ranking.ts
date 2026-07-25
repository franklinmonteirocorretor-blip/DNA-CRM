// ─── Biblioteca de Ranking ─────────────────────────────────────────────────────
// Sprint 10 — ordenação, cálculo de pontuação e posição no ranking

import { PONTUACAO_RANKING, calcularPontuacao } from '@/src/config/ranking'

/**
 * Ordena uma lista de corretores por pontuação de ranking
 */
export function ordenarRanking<T extends { pontuacao: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => b.pontuacao - a.pontuacao)
}

/**
 * Atribui posições (1, 2, 3...) com suporte a empates
 */
export function atribuirPosicoes<T>(items: T[], getPontuacao: (item: T) => number): (T & { posicao: number })[] {
  const sorted = [...items].sort((a, b) => getPontuacao(b) - getPontuacao(a))
  let posicao = 1
  let anterior = -1
  return sorted.map((item, i) => {
    const pontos = getPontuacao(item)
    if (i > 0 && pontos !== anterior) {
      posicao = i + 1
    }
    anterior = pontos
    return { ...item, posicao }
  })
}

/**
 * Calcula pontuação total de um corretor a partir de produção mensal
 * (re-exporta do config para conveniência)
 */
export { calcularPontuacao, PONTUACAO_RANKING }