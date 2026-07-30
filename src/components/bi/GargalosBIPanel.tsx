'use client'

import { useState } from 'react'
import type { BIGargalos, BIGargaloItem } from '@/src/types/bi'

const ABAS = [
  { label: 'Etapas congestionadas', key: 'etapasCongestionadas' as const },
  { label: 'Corretores abaixo', key: 'corretoresAbaixoMedia' as const },
  { label: 'Clientes parados', key: 'clientesParados' as const },
  { label: 'Documentos travados', key: 'documentacaoTravada' as const },
]

const BADGE_SEVERIDADE: Record<string, string> = {
  critica: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baixa: 'bg-gray-100 text-gray-600 border-gray-200',
}

const LABEL_SEVERIDADE: Record<string, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

function formatarValor(valor: number): string {
  if (valor >= 1000) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return String(valor)
}

function GargaloItem({ item }: { item: BIGargaloItem }) {
  return (
    <div className="flex items-start justify-between rounded-lg bg-white p-3 border border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${BADGE_SEVERIDADE[item.severidade]}`}>
            {LABEL_SEVERIDADE[item.severidade]}
          </span>
          <p className="text-sm font-medium text-gray-900 truncate">{item.titulo}</p>
        </div>
        <p className="mt-1 text-xs text-gray-500">{item.descricao}</p>
      </div>
      <span className="ml-3 text-sm font-semibold text-gray-800 whitespace-nowrap">
        {formatarValor(item.valor)}
      </span>
    </div>
  )
}

export default function GargalosBIPanel({ gargalos }: { gargalos: BIGargalos }) {
  const [aba, setAba] = useState<typeof ABAS[number]['key']>('etapasCongestionadas')

  const items: BIGargaloItem[] = gargalos[aba] ?? []

  return (
    <div className="rounded-xl bg-white shadow-sm border p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Gargalos</h3>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {ABAS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              aba === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Nenhum gargalo nesta categoria.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <GargaloItem key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}