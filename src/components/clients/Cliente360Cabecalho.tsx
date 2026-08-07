'use client'

import { Cliente } from '@/src/types'

interface Props {
  cliente: Cliente
  corretorNome: string
  empreendimentoNome: string | null
  cpfFormatado: string
  telFormatado: string
  rendaFormatada: string
  fgtsFormatado: string
  diasSemContato: number
  diasNaEtapa: number
  etapaAtualLabel: string
}

/** Seção 1 — Cabeçalho completo */
export default function Cliente360Cabecalho({
  cliente, corretorNome, empreendimentoNome, cpfFormatado, telFormatado,
  rendaFormatada, fgtsFormatado, diasSemContato, diasNaEtapa, etapaAtualLabel,
}: Props) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Foto placeholder */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
          {cliente.nome.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{cliente.nome}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{cpfFormatado}</span>
            <span>📞 {telFormatado}</span>
            {empreendimentoNome && <span>🏢 {empreendimentoNome}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>Corretor: {corretorNome || '—'}</span>
            {cliente.email && <span>✉️ {cliente.email}</span>}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {etapaAtualLabel}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ⏱ {diasNaEtapa}d na etapa · {diasSemContato}d sem contato
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3 sm:grid-cols-4">
        <MiniCard label="Renda" value={rendaFormatada} />
        <MiniCard label="FGTS" value={fgtsFormatado} />
        <MiniCard label="Cadastro" value={new Date(cliente.created_at).toLocaleDateString('pt-BR')} />
        <MiniCard label="Status" value="🟢 Ativo" />
      </div>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-50 dark:bg-gray-700 px-3 py-2">
      <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500">{label}</span>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  )
}
