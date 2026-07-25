'use client'

import type { Cliente360 } from '@/src/types'
import KpiCard from '@/src/components/ui/KpiCard'

interface Props {
  painel: Cliente360['painelGerencial']
}

function formatarHoras(horas: number): string {
  const dias = Math.floor(horas / 24)
  if (dias >= 30) return `${Math.floor(dias / 30)} meses`
  if (dias >= 1) return `${dias} dias`
  return `${horas}h`
}

/** Seção 10 — Painel Gerencial do cliente */
export default function Cliente360PainelGerencial({ painel }: Props) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Painel Gerencial</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Tempo total no funil" value={formatarHoras(painel.tempoTotalFunilHoras)} size="sm" />
        <KpiCard label="Nº contatos" value={`${painel.totalContatos}`} size="sm" />
        <KpiCard label="Nº agendamentos" value={`${painel.totalAgendamentos}`} size="sm" />
        <KpiCard label="Comparecimentos" value={`${painel.totalComparecimentos}`} size="sm" />
        <KpiCard label="Docs pendentes" value={`${painel.docsPendentes}`} size="sm" highlightClass={painel.docsPendentes > 0 ? 'text-red-600' : 'text-emerald-600'} />
        <KpiCard label="Prob. fechamento" value={`${painel.probabilidadeFechamento}%`} size="sm" highlightClass={painel.probabilidadeFechamento >= 70 ? 'text-emerald-600' : painel.probabilidadeFechamento >= 30 ? 'text-amber-600' : 'text-red-500'} />
        <KpiCard label="Score" value={`${painel.scoreCliente}`} size="sm" highlightClass={painel.scoreCliente >= 70 ? 'text-emerald-600' : painel.scoreCliente >= 40 ? 'text-amber-600' : 'text-gray-500'} />

        {/* Tempo por etapa */}
        {painel.tempoPorEtapa.length > 0 && (
          <div className="col-span-full mt-1">
            <span className="text-[11px] font-medium uppercase text-gray-400">Tempo por etapa</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {painel.tempoPorEtapa.map((t) => (
                <span key={t.etapa} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {t.etapa}: {formatarHoras(t.horas)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}