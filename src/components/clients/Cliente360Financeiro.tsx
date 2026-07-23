'use client'

import type { Cliente360 } from '@/src/types'

interface Props {
  financeiro: Cliente360['financeiro']
  vgvFormatado: string
}

function fmt(val: number | null): string {
  if (val == null) return '—'
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Seção 6 — Dados financeiros */
export default function Cliente360Financeiro({ financeiro, vgvFormatado }: Props) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Financeiro</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="VGV" value={vgvFormatado} />
        <Card label="Comissão" value={financeiro.comissaoValor ? `${fmt(financeiro.comissaoValor)} (${financeiro.comissaoPercentual ?? 0}%)` : '—'} />
        <Card label="Entrada (FGTS)" value={fmt(financeiro.entradaEstimada)} />
        <Card label="Subsídio" value={fmt(financeiro.subsídio)} />
        <Card label="Financiamento" value={fmt(financeiro.financiamentoEstimado)} />
        <Card label="Renda" value={fmt(financeiro.renda)} />
        <Card label="Parcelas est." value={financeiro.parcelasEstimadas ? `${financeiro.parcelasEstimadas}x` : '—'} />
        <Card label="FGTS Saldo" value={fmt(financeiro.saldoFgts)} />
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <span className="text-[11px] font-medium uppercase text-gray-400">{label}</span>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}