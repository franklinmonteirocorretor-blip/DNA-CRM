'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useNotificacoes } from '@/src/hooks/useNotificacoes'
import { Notificacao } from '@/src/types'

// ── Ícones e cores por tipo de notificação ───────────────────────────────────

const ICONE_TIPO: Record<string, string> = {
  CLIENTE_PARADO: '🚨',
  AGENDAMENTO_HOJE: '📅',
  AGENDAMENTO_AMANHA: '📆',
  DOCUMENTO_PENDENTE: '📄',
  POS_VENDA_PRAZO: '🏠',
  FECHAMENTO_REALIZADO: '🔑',
  ANALISE_CONCLUIDA: '🔍',
}

const COR_TIPO: Record<string, string> = {
  CLIENTE_PARADO: 'border-l-red-500',
  AGENDAMENTO_HOJE: 'border-l-blue-500',
  AGENDAMENTO_AMANHA: 'border-l-indigo-500',
  DOCUMENTO_PENDENTE: 'border-l-amber-500',
  POS_VENDA_PRAZO: 'border-l-purple-500',
  FECHAMENTO_REALIZADO: 'border-l-green-500',
  ANALISE_CONCLUIDA: 'border-l-teal-500',
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function NotificacoesBell({ usuarioId }: { usuarioId: string }) {
  const { notificacoes, naoLidas, carregando, marcarComoLida, marcarTodasComoLidas } =
    useNotificacoes(usuarioId)

  const [aberto, setAberto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        onClick={() => setAberto(!aberto)}
        className="relative rounded-md p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 transition"
        title="Notificações"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Badge de contagem */}
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</h3>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasComoLidas}
                className="text-xs font-medium text-blue-600 hover:text-blue-500"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-[360px] overflow-y-auto">
            {carregando ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                Carregando notificações...
              </p>
            ) : notificacoes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                Nenhuma notificação no momento.
              </p>
            ) : (
              notificacoes.map((n) => (
                <NotificacaoItem
                  key={n.id}
                  notificacao={n}
                  onMarcarLida={marcarComoLida}
                  onFechar={() => setAberto(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Item individual ──────────────────────────────────────────────────────────

function NotificacaoItem({
  notificacao,
  onMarcarLida,
  onFechar,
}: {
  notificacao: Notificacao
  onMarcarLida: (id: string) => Promise<void>
  onFechar: () => void
}) {
  const icone = ICONE_TIPO[notificacao.tipo] ?? '🔔'
  const cor = COR_TIPO[notificacao.tipo] ?? 'border-l-gray-300'

  const tempoRelativo = formatarTempoRelativo(notificacao.created_at)

  const conteudo = (
    <div
      className={`flex gap-3 border-l-4 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${ notificacao.lida ? 'opacity-60' : 'bg-blue-50/30' } ${cor}`}
      onClick={async () => {
        if (!notificacao.lida) {
          await onMarcarLida(notificacao.id)
        }
        onFechar()
      }}
    >
      <span className="text-lg shrink-0 mt-0.5">{icone}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {notificacao.titulo}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {notificacao.mensagem}
        </p>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{tempoRelativo}</p>
      </div>
      {!notificacao.lida && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  )

  if (notificacao.link) {
    return (
      <Link href={notificacao.link} className="block">
        {conteudo}
      </Link>
    )
  }

  return conteudo
}

// ── Helper ───────────────────────────────────────────────────────────────────

function formatarTempoRelativo(dataISO: string): string {
  const diff = Date.now() - new Date(dataISO).getTime()
  const segundos = Math.floor(diff / 1000)
  const minutos = Math.floor(segundos / 60)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (dias > 7) {
    return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
  if (dias > 0) return `há ${dias} dia${dias > 1 ? 's' : ''}`
  if (horas > 0) return `há ${horas} hora${horas > 1 ? 's' : ''}`
  if (minutos > 0) return `há ${minutos} min`
  return 'agora mesmo'
}