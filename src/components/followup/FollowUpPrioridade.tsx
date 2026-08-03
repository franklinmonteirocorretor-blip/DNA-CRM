'use client'

/** Seção 4 — Explicação do Score de Prioridade */
export default function FollowUpPrioridade() {
  const regras = [
    { condicao: 'Sem contato há 5+ dias', pontos: '+100/dia', cor: 'text-red-600' },
    { condicao: 'Cliente aprovado', pontos: '+80', cor: 'text-emerald-600' },
    { condicao: 'Visita hoje', pontos: '+70', cor: 'text-blue-600' },
    { condicao: 'Documentação pendente', pontos: '+60', cor: 'text-amber-600' },
    { condicao: 'Novo Lead', pontos: '+50', cor: 'text-purple-600' },
    { condicao: 'Ação vencida', pontos: '+120', cor: 'text-red-600' },
    { condicao: 'Sem próxima ação', pontos: '+30', cor: 'text-gray-600' },
  ]

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Score de Prioridade</h2>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Cada cliente recebe uma pontuação de 0–1000. Quanto maior, mais urgente.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {regras.map((r) => (
          <div key={r.condicao} className="flex items-center justify-between rounded bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400">{r.condicao}</span>
            <span className={`font-bold ${r.cor}`}>{r.pontos}</span>
          </div>
        ))}
      </div>
    </div>
  )
}