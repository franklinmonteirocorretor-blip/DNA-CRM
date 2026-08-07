'use client'

import { DragEvent } from 'react'
import { PipelineClienteCard } from '@/src/types'
import { formatarMoedaCompacta } from '@/src/lib/formatters'

export default function PipelineCard({
  card,
  corEtapa,
  onDragStart,
  onClick,
  isDragging,
}: {
  card: PipelineClienteCard
  corEtapa: string
  onDragStart: (e: DragEvent<HTMLDivElement>) => void
  onClick: () => void
  isDragging: boolean
}) {
  const diasNaEtapa = card.diasNaEtapa
  const alertaTempo = diasNaEtapa > 7
  const alertaContato = card.diasSemContato > 3

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      className={`rounded-md border bg-white dark:bg-gray-800 p-2 cursor-pointer transition hover:shadow-sm ${ isDragging ? 'opacity-40 scale-95' : '' } ${alertaTempo ? 'border-red-200' : 'border-gray-200'}`}
      style={{ borderLeftWidth: '3px', borderLeftColor: corEtapa }}
    >
      {/* Nome e alertas */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{card.nome}</p>
        <div className="flex items-center gap-1 shrink-0">
          {alertaContato && <span className="text-[8px] text-red-500" title="Sem contato">📵</span>}
          {alertaTempo && <span className="text-[8px] text-red-500" title={`${diasNaEtapa}d na etapa`}>⏰</span>}
          {card.pendenciaDoc && <span className="text-[8px] text-amber-500" title="Doc pendente">📄</span>}
        </div>
      </div>

      {/* Meta-info */}
      <div className="mt-1 flex items-center gap-2 text-[9px]">
        <span className="text-gray-400 dark:text-gray-500">{card.corretorNome.split(' ')[0]}</span>
        {card.empreendimentoInteresse && (
          <span className="text-gray-400 dark:text-gray-500 truncate max-w-[80px]">{card.empreendimentoInteresse}</span>
        )}
      </div>

      {/* VGV + próxima ação */}
      <div className="mt-1 flex items-center justify-between text-[9px]">
        {card.vgv ? (
          <span className="font-semibold text-gray-600 dark:text-gray-400">{formatarMoedaCompacta(card.vgv)}</span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        )}
        {card.proximaAcao && (
          <span className="text-blue-500 truncate max-w-[100px] text-right" title={card.proximaAcao}>
            {card.proximaAcao.slice(0, 25)}
          </span>
        )}
      </div>

      {/* Agendamento próximo */}
      {card.agendamentoProximo && (
        <div className="mt-1 text-[8px] rounded bg-purple-50 px-1.5 py-0.5 text-purple-600">
          📅 {new Date(card.agendamentoProximo.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(card.agendamentoProximo.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}