// ─── Sprint 16 — Copiloto IA DNA Imóveis ───────────────────────────────────
// Seção 1: Resumo Inteligente — saudação, prioridades e fechamentos prováveis.

'use client'

import type { CopilotResumoInteligente } from '@/src/types/copiloto'

interface ResumoProps {
  resumo: CopilotResumoInteligente
}

export function CopilotResumo({ resumo }: ResumoProps) {
  const corMap: Record<string, string> = {
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-green-200 bg-green-50 text-green-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  }

  return (
    <section className="mb-6 rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm border">
      {/* Saudação */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{resumo.titulo}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{resumo.saudacao}</p>

      {/* Prioridades */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {resumo.prioridades.map((p) => (
          <div
            key={p.label}
            className={`rounded-lg border p-3 ${corMap[p.cor]}`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
              {p.label}
            </p>
            <p className="mt-1 text-xl font-bold">{p.valor}</p>
            <p className="mt-0.5 text-[10px]">{p.descricao}</p>
          </div>
        ))}
      </div>

      {/* Fechamentos prováveis */}
      {resumo.fechamentosProvaveis.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            🔥 Fechamentos mais prováveis
          </p>
          <div className="space-y-2">
            {resumo.fechamentosProvaveis.map((f) => (
              <div
                key={f.nome}
                className="flex items-center justify-between rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{f.acao}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                    {f.chance}%
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{f.etapa}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}