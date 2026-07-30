'use client'

import type { BIInsight } from '@/src/types/bi'

const CORES_CARD: Record<string, string> = {
  alerta: 'border-l-red-500',
  oportunidade: 'border-l-emerald-500',
  padrao: 'border-l-gray-400',
  tendencia: 'border-l-purple-500',
  comparativo: 'border-l-blue-500',
}

const LABELS_CATEGORIA: Record<string, string> = {
  alerta: 'Alerta',
  oportunidade: 'Oportunidade',
  padrao: 'Padrão',
  tendencia: 'Tendência',
  comparativo: 'Comparativo',
}

function InsightCard({ insight }: { insight: BIInsight }) {
  const corBorda = CORES_CARD[insight.categoria] ?? 'border-l-gray-400'

  return (
    <div
      className={`rounded-r-lg border-l-4 ${corBorda} bg-white shadow-sm border border-gray-100 p-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase">
            {LABELS_CATEGORIA[insight.categoria] ?? insight.categoria}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {Math.round(insight.confianza)}% confiança
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold text-gray-900">{insight.titulo}</p>
      <p className="mt-1 text-xs text-gray-600">{insight.descricao}</p>
      {insight.acaoSugerida && (
        <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <span className="font-medium">Sugestão:</span> {insight.acaoSugerida}
        </div>
      )}
    </div>
  )
}

export default function InsightsBICard({ insights }: { insights: BIInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-600">Nenhum insight disponível.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  )
}