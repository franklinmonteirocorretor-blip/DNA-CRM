'use client'

import { useState, useEffect } from 'react'
import { resumoEquipeDashboard } from '@/app/dashboard/corretores/actions'
import Link from 'next/link'

export default function CardEquipeDashboard() {
  const [dados, setDados] = useState<{
    corretoresAtivos: number
    corretoresOnline: number
    producaoDia: { ligacoes: number; whatsapps: number; agendamentos: number; comparecimentos: number }
  } | null>(null)

  useEffect(() => {
    resumoEquipeDashboard().then((r) => {
      if ('corretoresAtivos' in r) setDados(r)
    })
  }, [])

  return (
    <Link
      href="/dashboard/corretores"
      className="rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm hover:bg-blue-100 transition block"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-blue-500">Equipe</p>
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-blue-500">Ativos</span>
          <span className="font-semibold text-blue-700">{dados?.corretoresAtivos ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500">Online hoje</span>
          <span className="font-semibold text-blue-700">{dados?.corretoresOnline ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500">Ligações</span>
          <span className="font-semibold text-blue-700">{dados?.producaoDia.ligacoes ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500">WhatsApp</span>
          <span className="font-semibold text-blue-700">{dados?.producaoDia.whatsapps ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500">Agendamentos</span>
          <span className="font-semibold text-blue-700">{dados?.producaoDia.agendamentos ?? '—'}</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-blue-400">Gerenciar corretores →</p>
    </Link>
  )
}