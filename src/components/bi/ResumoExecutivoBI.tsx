'use client'

import type { BIResumoExecutivo } from '@/src/types/bi'
import { formatarMoeda } from '@/src/lib/formatters'

interface Props {
  resumo: BIResumoExecutivo
}

function formatoPercentual(valor: number): string {
  return Math.round(valor) + '%'
}

type Tendencia = 'up' | 'down' | 'neutral'

function KpiCard({
  label,
  value,
  tendencia,
}: {
  label: string
  value: string
  tendencia: Tendencia
}) {
  const tendenciaCor =
    tendencia === 'up'
      ? 'text-emerald-600'
      : tendencia === 'down'
        ? 'text-red-500'
        : 'text-gray-400'

  const tendenciaIcone =
    tendencia === 'up' ? '↑' : tendencia === 'down' ? '↓' : '→'

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
        <span className={`text-sm font-semibold ${tendenciaCor}`}>
          {tendenciaIcone}
        </span>
      </div>
    </div>
  )
}

export default function ResumoExecutivoBI({ resumo }: { resumo: BIResumoExecutivo }) {
  const vgv = formatarMoeda(resumo.vgvMes)
  const comissao = formatarMoeda(resumo.comissaoPrevista)
  const conversao = formatoPercentual(resumo.conversaoGeral)
  const ticket = formatarMoeda(resumo.ticketMedio)

  const metaPct = resumo.percentualMeta
  const vgvTendencia: Tendencia = metaPct >= 80 ? 'up' : metaPct >= 60 ? 'neutral' : 'down'
  const comissaoTendencia: Tendencia =
    resumo.comissaoRecebida >= resumo.comissaoPrevista * 0.8 ? 'up' : 'neutral'
  const conversaoTendencia: Tendencia = resumo.conversaoGeral >= 20 ? 'up' : 'neutral'
  const ticketTendencia: Tendencia = resumo.ticketMedio >= 200000 ? 'up' : 'neutral'

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="VGV do mês" value={vgv} tendencia={vgvTendencia} />
      <KpiCard label="Comissão Prevista" value={comissao} tendencia={comissaoTendencia} />
      <KpiCard label="Conversão Geral" value={conversao} tendencia={conversaoTendencia} />
      <KpiCard label="Ticket Médio" value={ticket} tendencia={ticketTendencia} />
    </div>
  )
}