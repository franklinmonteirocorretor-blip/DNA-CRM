// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Centro de Comando: ações rápidas, filtros e métricas visuais geral.

'use client'

import { useState } from 'react'
import type { WhatsAppMetricas } from '@/src/types/whatsapp'

interface CentroComandoProps {
  metricas: WhatsAppMetricas
  onFiltrarNaoLidas: () => void
  onNovaConversa: () => void
}

export function CentroComandoWhatsApp({ metricas, onFiltrarNaoLidas }: CentroComandoProps) {
  const [modo, setModo] = useState<'RESUMO' | 'NOVA_CONVERSA'>('RESUMO')

  return (
    <div className="flex flex-col">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Centro de Comando</h3>
      </div>

      {modo === 'RESUMO' ? (
        <>
          {/* Grid de métricas rápidas */}
          <div className="border-b px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Abertas</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metricas.conversasAbertas}</p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Enviadas</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metricas.mensagensEnviadasHoje}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500">Hoje</p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Recebidas</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metricas.mensagensRecebidasHoje}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500">Hoje</p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Tempo Médio</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metricas.tempoMedioRespostaMinutos}m</p>
              </div>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="p-4 space-y-2">
            <button
              onClick={onFiltrarNaoLidas}
              className="flex w-full items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <span>🔴</span>
              Ver conversas não lidas
            </button>
            <button
              onClick={() => setModo('NOVA_CONVERSA')}
              className="flex w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <span>💬</span>
              <span>Nova conversa</span>
            </button>
          </div>
        </>
      ) : (
        <div className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Nova conversa com cliente existente:</p>
          <input
            type="text"
            placeholder="Buscar cliente por nome ou telefone..."
            className="w-full rounded border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm mb-2"
          />
          <button
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Buscar &amp; Iniciar
          </button>
          <button
            onClick={() => setModo('RESUMO')}
            className="mt-2 w-full rounded-md px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}