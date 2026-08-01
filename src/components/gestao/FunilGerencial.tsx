import { GestaoFunilEtapa } from '@/src/types'

const CORES_ETAPA: Record<string, string> = {
  NOVO_LEAD: 'bg-sky-500',
  CONTATOS: 'bg-blue-500',
  AGENDAMENTO: 'bg-violet-500',
  COMPARECIMENTO: 'bg-purple-500',
  ANALISE: 'bg-amber-500',
  RESTRICOES: 'bg-red-500',
  CONDICIONADOS: 'bg-orange-500',
  APROVADOS: 'bg-emerald-500',
  FECHAMENTOS: 'bg-teal-500',
  POS_VENDA: 'bg-cyan-500',
}

export default function FunilGerencial({ etapas }: { etapas: GestaoFunilEtapa[] }) {
  if (etapas.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Funil Gerencial</h2>
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Nenhum dado disponível.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Funil Gerencial</h2>

      <div className="mt-3 space-y-1.5">
        {etapas.map((e) => (
          <div key={e.etapa} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-gray-500 dark:text-gray-400">{e.label}</span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative">
              <div
                className={`h-full rounded transition-all ${CORES_ETAPA[e.etapa] ?? 'bg-gray-400'}`}
                style={{ width: `${Math.max(1, e.percentual)}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
              {e.quantidade}
            </span>
            {e.taxaConversao !== null && (
              <span className="w-16 text-right text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                {e.taxaConversao}% conv.
              </span>
            )}
            {e.taxaConversao === null && <span className="w-16" />}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 text-right text-xs text-gray-400 dark:text-gray-500">
        Total no funil:{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {etapas.reduce((s, e) => s + e.quantidade, 0)}
        </span>
      </div>
    </section>
  )
}