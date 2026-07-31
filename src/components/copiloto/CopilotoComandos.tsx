// ─── Sprint 16 — Copiloto IA DNA Imóveis ───────────────────────────────────
// Seção 4: Comandos — ações executáveis com um clique.

'use client'

import type { CopilotComando } from '@/src/types/copiloto'

interface ComandosProps {
  comandos: CopilotComando[]
  onExecutar: (comando: CopilotComando) => void
}

export function CopilotoComandos({ comandos, onExecutar }: ComandosProps) {
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">⚡ Comandos</h3>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {comandos.map((c) => (
          <button
            key={c.id}
            onClick={() => onExecutar(c)}
            className="flex flex-col items-start rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <span className="text-lg">{c.icone}</span>
            <span className="mt-1 text-sm font-medium text-gray-900">{c.label}</span>
            <span className="mt-0.5 text-xs text-gray-500">{c.descricao}</span>
          </button>
        ))}
      </div>
    </section>
  )
}