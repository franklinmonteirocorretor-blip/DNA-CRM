// ─── Sprint 16 — Copiloto IA DNA Imóveis ───────────────────────────────────
// Seção 2: Recomendações — ações sugeridas com base nos dados reais.

'use client'

import Link from 'next/link'
import type { CopilotRecomendacao } from '@/src/types/copiloto'

interface RecomendacaoProps {
  recomendacoes: CopilotRecomendacao[]
}

const prioridadMap: Record<string, string> = {
  ALTISSIMA: 'border-l-4 border-l-red-500 bg-red-50',
  ALTA: 'border-l-4 border-l-amber-500 bg-amber-50',
  MEDIA: 'border-l-4 border-l-blue-500 bg-blue-50',
  INFORMATIVA: 'border-l-4 border-l-gray-300 bg-gray-50',
}

export function CopilotRecomendacoes({ recomendacoes }: RecomendacaoProps) {
  if (recomendacoes.length === 0) {
    return (
      <section className="rounded-lg border bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">💡 Recomendações</h3>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Nenhuma recomendação no momento. Tudo em ordem!</p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">💡 Recomendações ({recomendacoes.length})</h3>

      <div className="mt-3 space-y-2">
        {recomendacoes.map((r) => (
          <div key={r.id} className={`rounded-lg px-4 py-3 ${prioridadMap[r.prioridade]}`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{r.icone}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.titulo}</p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{r.descricao}</p>
              </div>
            </div>
            {r.rota && (
              <Link
                href={r.rota}
                className="mt-2 inline-block rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                {r.acao}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}