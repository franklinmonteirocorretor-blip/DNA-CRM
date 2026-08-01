'use client'

import { FollowUpData } from '@/src/types'
import Link from 'next/link'

interface Props {
  painel: FollowUpData['painelGerente']
}

function formatarMinutos(minutos: number): string {
  if (minutos >= 1440) return `${Math.floor(minutos / 1440)} dias`
  if (minutos >= 60) return `${Math.floor(minutos / 60)}h${minutos % 60}m`
  return `${minutos}min`
}

/** Seção 7 — Painel do Gerente (visão global) */
export default function FollowUpPainelGerente({ painel }: Props) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Painel Gerencial</h2>

      {/* KPIs */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Follow-ups hoje" value={`${painel.followUpsHoje}`} destaque="text-blue-600" />
        <Card label="Atrasados" value={`${painel.followUpsAtrasados}`} destaque={painel.followUpsAtrasados > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'} />
        <Card label="Tempo médio resposta" value={formatarMinutos(painel.tempoMedioRespostaMinutos)} />
        <Card label="Esquecidos" value={`${painel.clientesEsquecidos.length}`} destaque={painel.clientesEsquecidos.length > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'} />
      </div>

      {/* Clientes esquecidos */}
      {painel.clientesEsquecidos.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase text-red-600">Clientes Esquecidos</h3>
          <div className="mt-2 space-y-1.5">
            {painel.clientesEsquecidos.map(c => (
              <Link
                key={c.id}
                href={`/dashboard/clientes/${c.clienteId}`}
                className="flex items-center gap-2 rounded bg-red-50 px-3 py-1.5 text-xs hover:bg-red-100 transition-colors"
              >
                <span>💀</span>
                <span className="font-medium">{c.nome}</span>
                <span className="text-red-500">{c.diasSemContato}d</span>
                <span className="ml-auto text-gray-400 dark:text-gray-500">{c.corretorNome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Corretores sem follow-up */}
      {painel.corretoresSemFollowUp.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase text-amber-600">Corretores sem Follow-up</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {painel.corretoresSemFollowUp.map(nome => (
              <span key={nome} className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                ⚠️ {nome}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ label, value, destaque }: { label: string; value: string; destaque?: string }) {
  return (
    <div className="rounded-md bg-gray-50 dark:bg-gray-700 p-3">
      <span className="text-[11px] font-medium uppercase text-gray-400 dark:text-gray-500">{label}</span>
      <p className={`mt-1 text-sm font-semibold ${destaque ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}