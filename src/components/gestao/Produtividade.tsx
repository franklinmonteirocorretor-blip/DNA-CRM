import { GestaoProducaoSerie } from '@/src/types'
import { formatarData } from '@/src/lib/formatters'

function BarraHorizontal({
  valor,
  maxValor,
  cor,
  altura,
}: {
  valor: number
  maxValor: number
  cor: string
  altura: string
}) {
  const pct = maxValor > 0 ? Math.min(100, (valor / maxValor) * 100) : 0
  return (
    <div className={`${altura} bg-gray-100 rounded overflow-hidden`}>
      <div className={`h-full rounded transition-all ${cor}`} style={{ width: `${Math.max(0.5, pct)}%` }} />
    </div>
  )
}

export default function Produtividade({
  series,
  agrupamento,
}: {
  series: GestaoProducaoSerie[]
  agrupamento: 'daily' | 'weekly' | 'monthly'
}) {
  if (series.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Produtividade</h2>
        <p className="mt-3 text-sm text-gray-400">Nenhum dado no período.</p>
      </section>
    )
  }

  const maxVendas = Math.max(...series.map((s) => s.vendas), 1)
  const maxComparecimentos = Math.max(...series.map((s) => s.comparecimentos), 1)
  const maxAprovacoes = Math.max(...series.map((s) => s.aprovacoes), 1)

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">Produtividade</h2>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
              <th className="pb-2 w-20">Período</th>
              <th className="pb-2">Vendas</th>
              <th className="pb-2">Comparec.</th>
              <th className="pb-2">Aprovações</th>
              <th className="pb-2 text-right">Ligações</th>
              <th className="pb-2 text-right">WhatsApp</th>
              <th className="pb-2 text-right">Agend.</th>
              <th className="pb-2 text-right font-bold">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.data} className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">
                  {formatarData(s.data, agrupamento)}
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1.5">
                    <BarraHorizontal valor={s.vendas} maxValor={maxVendas} cor="bg-teal-500" altura="h-3" />
                    <span className="w-6 text-right tabular-nums">{s.vendas}</span>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1.5">
                    <BarraHorizontal valor={s.comparecimentos} maxValor={maxComparecimentos} cor="bg-purple-500" altura="h-3" />
                    <span className="w-6 text-right tabular-nums">{s.comparecimentos}</span>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1.5">
                    <BarraHorizontal valor={s.aprovacoes} maxValor={maxAprovacoes} cor="bg-indigo-500" altura="h-3" />
                    <span className="w-6 text-right tabular-nums">{s.aprovacoes}</span>
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums text-gray-500">{s.ligacoes}</td>
                <td className="py-2 text-right tabular-nums text-gray-500">{s.whatsapps}</td>
                <td className="py-2 text-right tabular-nums text-gray-500">{s.agendamentos}</td>
                <td className="py-2 text-right tabular-nums font-bold text-blue-600">
                  {s.pontuacao.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}