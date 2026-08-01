import { GestaoMeta } from '@/src/types'

export default function SecaoMetas({ dados }: { dados: GestaoMeta }) {
  const calcPct = (real: number, meta: number) =>
    meta > 0 ? Math.min(100, Math.round((real / meta) * 100)) : 0

  const corPct = (pct: number) =>
    pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'

  const barra = (pct: number) =>
    pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Metas</h2>
      <div className="mt-3 space-y-4">
        {/* Meta da Equipe */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-800">Equipe</h3>
          <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
            {(['vendas', 'aprovacoes', 'agendamentos', 'comparecimentos', 'pastas'] as const).map((k) => {
              const meta = dados.metaEquipe[k]
              const real = dados.realizadoEquipe[k]
              const pct = calcPct(real, meta)
              return (
                <div key={k} className="text-center">
                  <p className="text-gray-400 dark:text-gray-500 capitalize">{k}</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{real}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">/ {meta}</p>
                  <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mx-auto max-w-[80px]">
                    <div className={`h-full rounded-full ${barra(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Progresso da equipe</span>
            <span className={`text-sm font-bold ${corPct(dados.percentualEquipe)}`}>
              {dados.percentualEquipe}%
            </span>
          </div>
        </div>

        {/* Meta Individual */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-sm font-semibold text-indigo-800">Individual</h3>
          <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
            {(['vendas', 'aprovacoes', 'agendamentos', 'comparecimentos', 'pastas'] as const).map((k) => {
              const meta = dados.metaIndividual[k]
              const real = dados.realizadoIndividual[k]
              const pct = calcPct(real, meta)
              return (
                <div key={k} className="text-center">
                  <p className="text-indigo-400 capitalize">{k}</p>
                  <p className="text-lg font-bold text-indigo-700">{real}</p>
                  <p className="text-[10px] text-indigo-400">/ {meta}</p>
                  <div className="mt-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden mx-auto max-w-[80px]">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-indigo-500">Progresso individual</span>
            <span className={`text-sm font-bold ${corPct(dados.percentualIndividual)}`}>
              {dados.percentualIndividual}%
            </span>
          </div>
        </div>

        {/* Projeção */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Projeção de fechamento</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{dados.diasRestantes} dias restantes</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {dados.projecaoFechamento.vendas} vendas
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                ~R$ {(dados.projecaoFechamento.vgv / 1000).toFixed(0)}k VGV
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}