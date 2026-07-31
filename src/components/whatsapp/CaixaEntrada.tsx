// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Caixa de Entrada: lista de conversas com filtros, busca e indicadores de
// não lidas, última mensagem e status do cliente.

'use client'

import { useState } from 'react'
import type { WhatsAppConversaEnriquecida, WhatsAppConversaStatus } from '@/src/types/whatsapp'

interface Props {
  conversas: WhatsAppConversaEnriquecida[]
  conversaAtivaId: string | null
  onSelecionar: (id: string) => void
  onFiltrar: (filtro: WhatsAppConversaStatus | 'todas') => void
  filtroAtual: WhatsAppConversaStatus | 'todas'
}

export function CaixaEntrada({ conversas, conversaAtivaId, onSelecionar, onFiltrar, filtroAtual }: Props) {
  const [busca, setBusca] = useState('')

  const filtradas = busca.length > 0
    ? conversas.filter(c =>
        c.cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.cliente.telefone.includes(busca)
      )
    : conversas

  const botoes: { label: string; value: WhatsAppConversaStatus | 'todas' }[] = [
    { label: 'Todas', value: 'todas' },
    { label: 'Abertas', value: 'aberta' },
    { label: 'Finalizadas', value: 'finalizada' },
    { label: 'Arquivadas', value: 'arquivada' },
  ]

  return (
    <section className="col-span-3 flex flex-col border-r bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Caixa de Entrada</h2>
        <p className="mt-0.5 text-xs text-gray-500">{conversas.length} conversas</p>
      </div>

      {/* Busca */}
      <div className="px-3 pt-3">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Filtros de status */}
      <div className="flex gap-1 px-4 pt-3">
        {botoes.map(b => (
          <button
            key={b.value}
            onClick={() => onFiltrar(b.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filtroAtual === b.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-3 flex-1 overflow-y-auto">
        {filtradas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            {busca ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa.'}
          </p>
        ) : (
          filtradas.map(c => (
            <button
              key={c.conversa.id}
              onClick={() => onSelecionar(c.conversa.id)}
              className={`w-full border-b px-4 py-3 text-left transition hover:bg-blue-50 ${
                conversaAtivaId === c.conversa.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">{c.cliente.nome}</span>
                {c.naoLidas > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                    {c.naoLidas}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500 truncate">
                {c.ultimaMensagem?.texto ?? 'Nova conversa'}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                <span>{c.cliente.etapa_atual}</span>
                <span>·</span>
                <span>{c.cliente.corretor_nome}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  )
}