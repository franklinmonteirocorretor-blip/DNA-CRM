'use client'

import type { BIEmpreendimento } from '@/src/types/bi'

function formatoMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatoPercentual(valor: number): string {
  return Math.round(valor) + '%'
}

export default function EmpreendimentosBICard({
  empreendimentos,
}: {
  empreendimentos: BIEmpreendimento[]
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm border p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Empreendimentos</h3>

      {empreendimentos.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum empreendimento disponível.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {empreendimentos.map((emp) => (
            <div
              key={emp.id}
              className="flex-shrink-0 w-52 rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 truncate">{emp.nome}</p>
                <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                  #{emp.ranking}o
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Clientes</span>
                  <span className="font-medium text-gray-800">{emp.clientes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">VGV</span>
                  <span className="font-medium text-gray-800">{formatoMoeda(emp.vgv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Conversão</span>
                  <span className="font-medium text-gray-800">
                    {formatoPercentual(emp.conversao)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comissão</span>
                  <span className="font-medium text-gray-800">{formatoMoeda(emp.comissao)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ticket Médio</span>
                  <span className="font-medium text-gray-800">{formatoMoeda(emp.ticketMedio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tempo Médio</span>
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