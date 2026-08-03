'use client'

import { FollowUpSugestao } from '@/src/types'
import Link from 'next/link'

interface Props {
  sugestoes: FollowUpSugestao[]
}

/** Seção 8 — Sugestões inteligentes */
export default function FollowUpInteligencia({ sugestoes }: Props) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Sugestões Inteligentes ({sugestoes.length})
      </h2>
      {sugestoes.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Nenhuma sugestão no momento.</p>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
          {sugestoes.map((s) => (
            <Link
              key={`${s.clienteId}-${s.motivo}`}
              href={`/dashboard/clientes/${s.clienteId}`}
              className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-3 hover:shadow-sm transition-shadow"
            >
              <span className="mt-0.5 shrink-0 text-lg">💡</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.nome}</p>
                <p className="text-xs text-purple-700">{s.motivo}</p>
                <p className="mt-1 text-xs font-medium text-purple-900">{s.sugestao}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-purple-500">{s.prioridade}pts</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}