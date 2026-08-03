'use client'

import type { Cliente360 } from '@/src/types'

interface Props {
  pipeline: Cliente360['pipeline']
}

function formatarTempo(horas: number | null): string {
  if (horas === null) return '—'
  const dias = Math.floor(horas / 24)
  if (dias >= 30) return `${Math.floor(dias / 30)} meses`
  if (dias >= 1) return `${dias} dias`
  return `${horas}h`
}

/** Seção 3 — Pipeline visual com etapas */
export default function Cliente360Pipeline({ pipeline }: Props) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Pipeline</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {pipeline.map((e) => {
          const bg = e.status === 'atual'
            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
            : e.status === 'concluida'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-500'

          return (
            <div
              key={e.etapa}
              className={`flex min-w-[120px] flex-col items-center rounded-lg px-3 py-2 text-center text-xs font-medium ${bg}`}
            >
              <span>{e.label}</span>
              {e.tempoHoras !== null && (
                <span className={`mt-0.5 text-[10px] ${e.status === 'atual' ? 'text-blue-100' : e.status === 'concluida' ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {e.status === 'atual' ? 'atual · ' : e.status === 'concluida' ? '✓ ' : ''}
                  {formatarTempo(e.tempoHoras)}
                </span>
              )}
              {e.status === 'pendente' && (
                <span className="mt-0.5 text-[10px] opacity-50">pendente</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}