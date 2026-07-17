'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'
import { Notificacao } from '@/src/types'

interface UseNotificacoesReturn {
  notificacoes: Notificacao[]
  naoLidas: number
  carregando: boolean
  marcarComoLida: (id: string) => Promise<void>
  marcarTodasComoLidas: () => Promise<void>
}

// Hook que gerencia notificações com Supabase Realtime.
// Escuta INSERTs na tabela notificacoes em tempo real.
// Exemplo de uso:
//   const { notificacoes, naoLidas, marcarComoLida } = useNotificacoes(usuarioId)
export function useNotificacoes(usuarioId: string | undefined): UseNotificacoesReturn {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(true)

  // ── Busca inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    let ignorado = false
    const buscar = async () => {
      if (!usuarioId) return
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<Notificacao[]>()

      if (!ignorado && !error && data) {
        setNotificacoes(data)
      }
      if (!ignorado) {
        setCarregando(false)
      }
    }
    buscar()
    return () => { ignorado = true }
  }, [usuarioId])

  // ── Supabase Realtime: escuta novas notificações ─────────────────────────
  useEffect(() => {
    if (!usuarioId) return

    const canal = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload) => {
          const nova = payload.new as Notificacao
          setNotificacoes((prev) => [nova, ...prev])

          // Notificação do navegador (se permitido)
          if (Notification.permission === 'granted') {
            new Notification(nova.titulo, {
              body: nova.mensagem,
              icon: '/favicon.ico',
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [usuarioId])

  // ── Solicita permissão para notificações do navegador ────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  // ── Marcar uma como lida ─────────────────────────────────────────────────
  const marcarComoLida = useCallback(async (id: string) => {
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    )

    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)
  }, [])

  // ── Marcar todas como lidas ──────────────────────────────────────────────
  const marcarTodasComoLidas = useCallback(async () => {
    if (!usuarioId) return

    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))

    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', usuarioId)
      .eq('lida', false)
  }, [usuarioId])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  return { notificacoes, naoLidas, carregando, marcarComoLida, marcarTodasComoLidas }
}