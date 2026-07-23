'use client'

import { DragEvent } from 'react'
import { EtapaFunil, PipelineClienteCard } from '@/src/types'
import PipelineCard from './PipelineCard'

export default function PipelineColuna({
  etapa,
  config,
  cards,
  onDragStart,
  onDragOver,
  onDrop,
  onCardClick,
  arrastando,
}: {
  etapa: EtapaFunil
  config: { label: string; cor: string; icone: string; desc: string }
  cards: PipelineClienteCard[]
  onDragStart: (e: DragEvent<HTMLDivElement>, clienteId: string, etapaOrigem: EtapaFunil) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, etapaDestino: EtapaFunil) => void
  onCardClick: (clienteId: string) => void
  arrastando: { clienteId: string; etapaOrigem: EtapaFunil } | null
}) {
  const isTarget = arrastando !== null && arrastando.etapaOrigem !== etapa

  return (
    <div
      className={`flex flex-col rounded-lg border w-60 shrink-0 transition ${
        isTarget ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-gray-50'
      }`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, etapa)}
    >
      {/* Cabeçalho da coluna */}
      <div className="px-3 py-2 border-b border-gray-200" style={{ backgroundColor: config.cor + '15' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{config.icone}</span>
          <span className="text-xs font-semibold text-gray-800">{config.label}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">{config.desc.slice(0, 40)}</span>
          <span className="text-[10px] font-bold text-gray-500">{cards.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
        {cards.length === 0 && !isTarget && (
          <p className="text-[10px] text-gray-300 text-center py-4">Arraste clientes para cá</p>
        )}
        {cards.length === 0 && isTarget && (
          <p className="text-[10px] text-blue-400 text-center py-4">Solte aqui</p>
        )}
        {cards.map((card) => (
          <PipelineCard
            key={card.id}
            card={card}
            corEtapa={config.cor}
            onDragStart={(e) => onDragStart(e, card.id, etapa)}
            onClick={() => onCardClick(card.id)}
            isDragging={arrastando?.clienteId === card.id}
          />
        ))}
      </div>
    </div>
  )
}