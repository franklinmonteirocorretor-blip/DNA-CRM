'use client'

import type { BIMetas, BIMetaPadrao } from '@/src/types/bi'

function formatoMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatoPontos(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

interface MetaItemConfig {
  key: keyof BIMetas
  label: string
  formatar: (v: number) => string
}

const METAS_CONFIG: MetaItemConfig[] = [
  { key: 'diaria', label: 'Meta Diária', formatar: formatoPontos },
  { key: 'semanal', label: 'Meta Semanal', formatar: formatoPontos },
  { key: 'mensal', label: 'Meta Mensal', formatar: formatoMoeda },
]

function COR_DO_PROGRESSO(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

function COR_DO_FUNDO_PROGRESSO(pct: number): string {
  if (pct >= 80) return 'bg-emerald-100'
  if (pct >= 60) return 'bg-yellow-100'
  return 'bg-red-100'
}

function COR_DA_BORDA(pct: number): string {
  if (pct >= 80) return 'border-emerald-200'
  if (pct >= 60) return 'border-yellow-200'
  return 'border-red-200'
}

function MetaBar({
  label,
  meta,
  realizado,
  formatar,
}: {
  label: string
  meta: number
  realizado: number
  formatar: (v: number) => string
}) {
  const pct = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0

  return (
    <div
      className={`rounded-xl border-2 ${COR_DA_BORDA(pct)} bg-white p-4 shadow-sm`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>

      <div className="mt-2 flex items-baseline justify-between">
        <div>
          <span className="text-xl font-bold text-gray-900">
            {formatar(realizado)}
          </span>
          <span className="ml-1 text-xs text-gray-400">
            / {formatar(meta)}
          </span>
        </div>
        <span
          className={`text-sm font-bold ${
            pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-yellow-700' : 'text-red-600'
          }`}
        >
          {Math.round(pct)}%
        </span>
      </div>

      <div className={`mt-3 h-3 w-full rounded-full ${COR_DO_FUNDO_PROGRESSO(pct)} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${COR_DO_PROGRESSO(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function MetasBIChart({ metas }: { metas: BIMetas }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {METAS_CONFIG.map((cfg) => {
        const metaItem = metas[cfg.key]
        return (
          <MetaBar
            key={cfg.key}
            label={cfg.label}
            meta={metaItem.meta}
            realizado={metaItem.realizado}
            formatar={cfg.formatar}
          />
        )
      })}
    </div>
  )
}