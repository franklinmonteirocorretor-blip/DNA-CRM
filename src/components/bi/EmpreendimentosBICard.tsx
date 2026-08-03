'use client'

import type { BIEmpreendimento } from '@/src/types/bi'
import { formatarMoeda } from '@/src/lib/formatters'

function formatoPercentual(valor: number): string {
  return Math.round(valor) + '%'
}

export default function EmpreendimentosBICard({
  empreendimentos,
}: {
  empreendimentos: BIEmpreendimento[]
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm border p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Empreendimentos</h3>

      {empreendimentos.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum empreendimento disponível.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {empreendimentos.map((emp) => (
            <div
              key={emp.id}
              className="flex-shrink-0 w-52 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{emp.nome}</p>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  #{emp.ranking}o
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Clientes</span>
                  <span className="font-medium text-gray-800">{emp.clientes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">VGV</span>
                  <span className="font-medium text-gray-800">{formatarMoeda(emp.vgv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Conversão</span>
                  <span className="font-medium text-gray-800">
                    {formatoPercentual(emp.conversao)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Comissão</span>
                  <span className="font-medium text-gray-800">{formatarMoeda(emp.comissao)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Ticket Médio</span>
                  <span className="font-medium text-gray-800">{formatarMoeda(emp.ticketMedio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tempo Médio</span>
                  <span className="font-medium text-gray-800">{emp.tempoMedioDias} dias</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}