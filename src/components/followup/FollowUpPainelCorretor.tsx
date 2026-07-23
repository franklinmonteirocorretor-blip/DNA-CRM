'use client'

import { FollowUpData } from '@/src/types'

interface Props {
  painel: FollowUpData['painelCorretor']
}

function formatarMinutos(minutos: number): string {
  if (minutos >= 1440) return `${Math.floor(minutos / 1440)} dias`
  if (minutos >= 60) return `${Math.floor(minutos / 60)}h${minutos % 60}m`
  return `${minutos}min`
}

/** Seção 6 — Painel do Corretor (visão pessoal) */
export default function FollowUpPainelCorretor({ painel }: Props) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Meu Painel</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card label="Minhas tarefas" value={`${painel.minhasTarefas}`} />
        <Card label="Meus clientes" value={`${painel.meusClientes}`} />
        <Card label="Follow-ups hoje" value={`${painel.followUpsHoje}`} destaque="text-blue-600" />
        <Card label="Atrasados" value={`${painel.followUpsAtrasados}`} destaque={painel.followUpsAtrasados > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'} />
        <Card label="Tempo médio resposta" value={formatarMinutos(painel.tempoMedioRespostaMinutos)} />
      </div>
    </div>
  )
}

function Card({ label, value, destaque }: { label: string; value: string; destaque?: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <span className="text-[11px] font-medium uppercase text-gray-400">{label}</span>
      <p className={`mt-1 text-sm font-semibold ${destaque ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}