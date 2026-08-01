import { GestaoRankingItem } from '@/src/types'

function Trofeu({ posicao }: { posicao: number }) {
  if (posicao === 1) return <span className="text-lg">🥇</span>
  if (posicao === 2) return <span className="text-lg">🥈</span>
  if (posicao === 3) return <span className="text-lg">🥉</span>
  return <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{posicao}º</span>
}

export default function Ranking({ itens }: { itens: GestaoRankingItem[] }) {
  if (itens.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ranking</h2>
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Nenhum dado de ranking disponível.</p>
      </section>
    )
  }

  const top3 = itens.slice(0, 3)

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ranking</h2>

      {/* Top 3 destacado */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {top3.map((item) => (
          <div
            key={item.usuarioId}
            className={`rounded-lg border p-4 text-center ${ item.posicao === 1 ? 'border-yellow-300 bg-yellow-50' : item.posicao === 2 ? 'border-gray-300 bg-gray-50' : 'border-amber-300 bg-amber-50' }`}
          >
            <Trofeu posicao={item.posicao} />
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.nome}</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{item.pontuacao.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">pts</p>
            <div className="mt-2 flex justify-center gap-3 text-[10px]">
              <span className="text-teal-600">{item.vendas} vendas</span>
              <span className="text-indigo-600">{item.aprovacoes} aprov.</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela ranking completa */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <th className="pb-2 w-10">#</th>
              <th className="pb-2">Corretor</th>
              <th className="pb-2 text-right">Pontuação</th>
              <th className="pb-2 text-right">Vendas</th>
              <th className="pb-2 text-right">Aprovações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.usuarioId}
                className={`border-b border-gray-100 dark:border-gray-700 ${ item.posicao <= 3 ? 'font-semibold' : '' }`}
              >
                <td className="py-2">
                  <Trofeu posicao={item.posicao} />
                </td>
                <td className="py-2 text-gray-900 dark:text-gray-100">{item.nome}</td>
                <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {item.pontuacao.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 text-right tabular-nums text-teal-600">
                  {item.vendas}
                </td>
                <td className="py-2 text-right tabular-nums text-indigo-600">
                  {item.aprovacoes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}