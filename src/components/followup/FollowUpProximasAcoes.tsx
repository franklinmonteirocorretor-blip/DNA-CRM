'use client'

import { FollowUpProximaAcao } from '@/src/types'
import Link from 'next/link'

interface Props {
  acoes: FollowUpProximaAcao[]
}

const PRIORIDADE_COR: Record<string, string> = {
  ALTA: 'border-l-red-500 bg-red-50',
  MEDIA: 'border-l-amber-500 bg-amber-50',
  BAIXA: 'border-l-gray-300 bg-gray-50',
}

function formatarTempo(minutos: number): string {
  if (minutos < 0) {
    const atraso = Math.abs(minutos)
    if (atraso >= 1440) return `Atrasado ${Math.floor(atraso / 1440)}d`
    if (atraso >= 60) return `Atrasado ${Math.floor(atraso / 60)}h`
    return `Atrasado ${atraso}min`
  }
  if (minutos >= 1440) return `em ${Math.floor(minutos / 1440)} dias`
  if (minutos >= 60) return `em ${Math.floor(minutos / 60)}h`
  return `em ${minutos}min`
}

/** Seção 2 — Próximas ações agendadas */
export default function FollowUpProximasAcoes({ acoes }: Props) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Próximas Ações ({acoes.length})
      </h2>
      {acoes.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Nenhuma ação agendada.</p>
      ) : (
        <div className="mt-3 max-h-96 overflow-y-auto space-y-2">
          {acoes.map((acao) => (
            <Link
              key={`${acao.clienteId}-${acao.dataHora}`}
              href={`/dashboard/clientes/${acao.clienteId}`}
              className={`flex items-start gap-3 rounded-lg border-l-4 p-3 hover:shadow-sm transition-shadow ${PRIORIDADE_COR[acao.prioridade]}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{acao.nome}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{acao.acao}</p>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  <span>{new Date(acao.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>· {acao.responsavel}</span>
                  <span>· {acao.etapa}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-xs font-bold ${acao.tempoRestanteMinutos < 0 ? 'text-red-600' : acao.tempoRestanteMinutos < 60 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {formatarTempo(acao.tempoRestanteMinutos)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}