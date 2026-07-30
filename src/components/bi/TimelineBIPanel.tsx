'use client'

import type { BITimelineEvento } from '@/src/types/bi'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatoMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ICONES_TIPO: Record<string, string> = {
  FECHAMENTO: '🔑',
  ENTRADA: '⭐',
  APROVACAO: '✅',
  DOCUMENTO: '📄',
  COMISSAO: '💰',
  ATIVIDADE: '👆',
  AGENDAMENTO: '📅',
}

const COR_FUNDO_TIPO: Record<string, string> = {
  FECHAMENTO: 'bg-emerald-100',
  ENTRADA: 'bg-yellow-100',
  APROVACAO: 'bg-green-100',
  DOCUMENTO: 'bg-blue-100',
  COMISSAO: 'bg-purple-100',
  ATIVIDADE: 'bg-gray-100',
  AGENDAMENTO: 'bg-orange-100',
}

function TimelineItem({ evento }: { evento: BITimelineEvento }) {
  const icone = ICONES_TIPO[evento.tipo] ?? '●'
  const corFundo = COR_FUNDO_TIPO[evento.tipo] ?? 'bg-gray-100'

  return (
    <div className="flex gap-4">
      <div className="w-12 shrink-0 text-right">
        <p className="text-[11px] text-gray-500">{formatarData(evento.data)}</p>
      </div>

      <div className="relative flex items-start gap-3 pb-6">
        <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white text-sm shadow-sm">
          {icone}
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900">{evento.titulo}</span>
            <span className="text-[10px] text-gray-400">{evento.usuarioNome}</span>
          </div>
          <p className="mt-1 text-xs text-gray-600">{evento.descricao}</p>
          {evento.valor != null && (
            <p className="mt-1 text-xs font-medium text-gray-800">
              {formatoMoeda(evento.valor)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TimelineBIPanel({
  eventos,
}: {
  eventos: BITimelineEvento[]
}) {
  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-600">Nenhum evento recente.</p>
      </div>
    )
  }

  const ordenados = [...eventos].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  ).slice(0, 15)

  return (
    <div className="rounded-xl bg-white shadow-sm border p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Linha do Tempo</h3>
      <div className="relative border-l-2 border-gray-200 ml-6">
        {ordenados.map((evento, i) => (
          <TimelineItem key={i} evento={evento} />
        ))}
      </div>
    </div>
  )
}