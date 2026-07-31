// ─── Sprint 16 — Copiloto IA DNA Imóveis ───────────────────────────────────
// Seção 5: Insights — painel com melhores horários, empreendimentos,
// corretores, gargalos, conversão e perdas.

'use client'

import type { CopilotInsight } from '@/src/types/copiloto'

interface InsightsProps {
  insights: CopilotInsight[]
}

const tendenciaMap: Record<string, string> = {
  subindo: 'text-green-600',
  estavel: 'text-gray-500',
  caindo: 'text-red-600',
}

export function CopilotoInsights({ insights }: InsightsProps) {
  if (insights.length === 0) {
    return (
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">📊 Insights</h3>
        <p className="mt-2 text-xs text-gray-500">Carregando insights...</p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">📊 Insights</h3>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {insights.map((insight, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{insight.icone}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{insight.titulo}</p>
                <p className="mt-1 text-xl font-bold text-gray-800">{insight.valor}</p>
                <p className="mt-0.5 text-xs text-gray-500">{insight.descricao}</p>
                {insight.detalhes && (
                  <p className={`mt-1 text-[10px] font-medium ${tendenciaMap[insight.tendencia]}`}>
                    {insight.tendencia === 'subindo' ? '↑ ' : insight.tendencia === 'caindo' ? '↓ ' : '→ '}
                    {insight.detalhes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}