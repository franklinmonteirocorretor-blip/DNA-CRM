'use client'

import Link from 'next/link'
import type { BIAlerta } from '@/src/types/bi'

const CORES_BORDA: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning: 'border-l-amber-500 bg-amber-50',
  info: 'border-l-blue-500 bg-blue-50',
}

const CORES_BADGE_SEVERIDADE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
}

const LABELS_SEVERIDADE: Record<string, string> = {
  critical: 'Crítico',
  warning: 'Atenção',
  info: 'Info',
}

const LABELS_ALERTA_TIPO: Record<string, string> = {
  meta: 'Meta',
  conversao: 'Conversão',
  gargalo: 'Gargalo',
  tendencia: 'Tendência',
  oportunidade: 'Oportunidade',
}

function AlertaCard({ alerta }: { alerta: BIAlerta }) {
  const borda = CORES_BORDA[alerta.severidade] ?? 'border-l-gray-400 bg-gray-50'
  const badge = CORES_BADGE_SEVERIDADE[alerta.severidade] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  const severidadeLabel = LABELS_SEVERIDADE[alerta.severidade] ?? alerta.severidade

  const conteudo = (
    <div
      className={`rounded-r-lg border-l-4 ${borda} p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
            {LABELS_ALERTA_TIPO[alerta.tipo] ?? alerta.tipo}
          </span>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge}`}
          >
            {severidadeLabel}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-800">{alerta.mensagem}</p>
    </div>
  )

  if (alerta.link) {
    return (
      <Link href={alerta.link} className="block transition hover:opacity-80">
        {conteudo}
      </Link>
    )
  }

  return conteudo
}

export default function AlertasBIPanel({ alertas }: { alertas: BIAlerta[] }) {
  if (alertas.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 text-center">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhum alerta no momento.</p>
      </div>
    )
  }

  const criticos = alertas.filter((a) => a.severidade === 'critical')
  const outros = alertas.filter((a) => a.severidade !== 'critical')
  const ordenados = [...criticos, ...outros]

  return (
    <div className="space-y-2">
      {ordenados.map((alerta) => (
        <AlertaCard key={alerta.id} alerta={alerta} />
      ))}
    </div>
  )
}