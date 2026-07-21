'use client'

import { useState, useEffect } from 'react'
import { resumoAgendaHoje } from '@/app/dashboard/agenda/actions'
import { AgendaResumo } from '@/src/types'
import Link from 'next/link'

export default function CardAgendaHoje() {
  const [resumo, setResumo] = useState<AgendaResumo | null>(null)

  useEffect(() => {
    resumoAgendaHoje().then((r) => {
      if ('total' in r) {
        setResumo(r)
      }
    })
  }, [])

  if (!resumo || resumo.total === 0) {
    return (
      <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-500">
          Agenda de Hoje
        </p>
        <p className="mt-1 text-2xl font-bold text-teal-700">0</p>
        <p className="mt-1 text-[11px] text-teal-400">Sem compromissos hoje</p>
        <Link
          href="/dashboard/agenda"
          className="mt-3 inline-block rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
        >
          Abrir Agenda
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-teal-500">
        Agenda de Hoje
      </p>
      <p className="mt-1 text-2xl font-bold text-teal-700">{resumo.total}</p>
      <div className="mt-2 space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-teal-500">✓ Confirmados</span>
          <span className="font-semibold text-teal-700">{resumo.confirmados}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-teal-500">⏳ Pendentes</span>
          <span className="font-semibold text-teal-700">{resumo.pendentes}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-500">↻ Reagendados</span>
          <span className="font-semibold text-amber-700">{resumo.reagendados}</span>
        </div>
        {resumo.atrasados > 0 && (
          <div className="flex justify-between">
            <span className="text-red-500">⚠️ Atrasados</span>
            <span className="font-semibold text-red-600">{resumo.atrasados}</span>
          </div>
        )}
      </div>
      <Link
        href="/dashboard/agenda"
        className="mt-3 inline-block rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
      >
        Abrir Agenda
      </Link>
    </div>
  )
}