import { AgendaResumo } from '@/src/types'
import Link from 'next/link'

export default function CardAgendaHoje({ resumo }: { resumo: AgendaResumo }) {
  if (!resumo || resumo.total === 0) {
    return (
      <div className="rounded-lg border border-teal-100 dark:border-teal-800 bg-teal-50 p-4 shadow-sm dark:bg-teal-950/30">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-500 dark:text-teal-300">
          Agenda de Hoje
        </p>
        <p className="mt-1 text-2xl font-bold text-teal-700 dark:text-teal-300">0</p>
        <p className="mt-1 text-[11px] text-teal-400 dark:text-teal-400">Sem compromissos hoje</p>
        <Link
          href="/dashboard/agenda"
          className="mt-3 inline-block rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Abrir Agenda
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-teal-100 dark:border-teal-800 bg-teal-50 p-4 shadow-sm dark:bg-teal-950/30">
      <p className="text-xs font-medium uppercase tracking-wide text-teal-500 dark:text-teal-300">
        Agenda de Hoje
      </p>
      <p className="mt-1 text-2xl font-bold text-teal-700 dark:text-teal-300">{resumo.total}</p>
      <div className="mt-2 space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-teal-500 dark:text-teal-400">Confirmados</span>
          <span className="font-semibold text-teal-700 dark:text-teal-400">{resumo.confirmados}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-teal-500 dark:text-teal-400">Pendentes</span>
          <span className="font-semibold text-teal-700 dark:text-teal-400">{resumo.pendentes}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-500">Reagendados</span>
          <span className="font-semibold text-amber-700">{resumo.reagendados}</span>
        </div>
        {resumo.atrasados > 0 && (
          <div className="flex justify-between">
            <span className="text-red-500">Atrasados</span>
            <span className="font-semibold text-red-600">{resumo.atrasados}</span>
          </div>
        )}
      </div>
      <Link
        href="/dashboard/agenda"
        className="mt-3 inline-block rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition dark:bg-teal-500 dark:hover:bg-teal-400"
      >
        Abrir Agenda
      </Link>
    </div>
  )
}