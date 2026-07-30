'use client'

import type { BIRankingItem } from '@/src/types/bi'

function formatoMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatoPontuacao(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function formatoPercentual(valor: number): string {
  return Math.round(valor) + '%'
}

const CORES_PODIO = [
  'border-amber-400 bg-amber-50',
  'border-gray-300 bg-gray-50',
  'border-orange-400 bg-orange-50',
]

const ICONES_PODIO = ['1', '2', '3']

function PodioItem({
  item,
  posicao,
}: {
  item: BIRankingItem
  posicao: number
}) {
  return (
    <div
      className={`rounded-xl border-2 ${CORES_PODIO[posicao] ?? 'border-gray-200 bg-white'} p-4 shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm text-gray-800">
          {ICONES_PODIO[posicao]}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{item.nome}</p>
          <p className="text-xs text-gray-500">
            {formatoPontuacao(item.pontuacaoGeral)} pts
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-500">VGV:</span>
        <span className="text-right font-medium text-gray-800">
          {formatoMoeda(item.vgv)}
        </span>
        <span className="text-gray-500">Comissão:</span>
        <span className="text-right font-medium text-gray-800">
          {formatoMoeda(item.comissao)}
        </span>
        <span className="text-gray-500">Conversão:</span>
        <span className="text-right font-medium text-gray-800">
          {formatoPercentual(item.conversao)}
        </span>
      </div>
    </div>
  )
}

export default function RankingBIChart({ items }: { items: BIRankingItem[] }) {
  const top3 = items.slice(0, 3)
  const tabela = items.slice(3)

  return (
    <div className="rounded-xl bg-white shadow-sm border p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Ranking de Corretores</h3>

      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {top3.map((item, index) => (
            <PodioItem key={item.usuarioId} item={item} posicao={index} />
          ))}
        </div>
      )}

      {tabela.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Posição</th>
                <th className="py-2 pr-3 font-medium">Corretor</th>
                <th className="py-2 pr-3 font-medium text-right">Pontuação</th>
                <th className="py-2 pr-3 font-medium text-right">VGV</th>
                <th className="py-2 pr-3 font-medium text-right">Comissão</th>
                <th className="py-2 font-medium text-right">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {tabela.map((item) => (
                <tr key={item.usuarioId} className="border-b border-gray-100 text-gray-700">
                  <td className="py-2 pr-3 font-medium">{item.rankingGeral}o</td>
                  <td className="py-2 pr-3">{item.nome}</td>
                  <td className="py-2 pr-3 text-right">{item.pontuacaoGeral.toLocaleString('pt-BR')}</td>
                  <td className="py-2 pr-3 text-right">{formatoMoeda(item.vgv)}</td>
                  <td className="py-2 pr-3 text-right">{formatoMoeda(item.comissao)}</td>
                  <td className="py-2 text-right">{formatoPercentual(item.conversao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}