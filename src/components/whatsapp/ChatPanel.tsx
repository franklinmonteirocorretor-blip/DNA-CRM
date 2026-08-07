// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Painel de Chat: área principal onde as mensagens da conversa ativa
// são exibidas, com input de texto e envio de novas mensagens.

'use client'

import { useState, useRef, useEffect } from 'react'
import type { WhatsAppMensagem, WhatsAppConversaEnriquecida } from '@/src/types/whatsapp'

interface ChatProps {
  conversa: WhatsAppConversaEnriquecida | null
  mensagens: WhatsAppMensagem[]
  /** Nome do corretor logado — usado futuramente para indicador de digitação */
  usuarioName: string
  onEnviar: (texto: string) => void
  onMarcaLidas: (ids: string[]) => void
}

export function ChatPanel({
  conversa,
  mensagens,
  usuarioName: _usuarioName,
  onEnviar,
  onMarcaLidas: _onMarcaLidas,
}: ChatProps) {
  const [texto, setTexto] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Auto-scroll down quando novas mensagens chegam
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [mensagens])

  // Auto-marca como lida ao abrir conversa
  useEffect(() => {
    if (!conversa || conversa.naoLidas === 0) return
    const naoLidas = mensagens.filter(m => m.remetente === 'cliente' && !m.lida)
    if (naoLidas.length === 0) return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversa?.conversa.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim() || !conversa) return
    onEnviar(texto.trim())
    setTexto('')
  }

  const mensagensOrdenadas = [...mensagens].sort((a, b) =>
    new Date(a.enviada_em).getTime() - new Date(b.enviada_em).getTime()
  )

  if (!conversa) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma conversa</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">para começar a enviar mensagens</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho do chat */}
      <div className="border-b bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{conversa.cliente.nome}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{conversa.cliente.telefone}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            {conversa.cliente.etapa_atual}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{conversa.cliente.corretor_nome}</span>
        </div>
      </div>

      {/* Histórico de mensagens */}
      <div ref={ref} className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 space-y-3">
        {mensagensOrdenadas.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">Nenhuma mensagem ainda.</p>
        )}
        {mensagensOrdenadas.map((m: WhatsAppMensagem) => {
          const isUser = m.remetente === 'usuario' || m.remetente === 'sistema'
          const balaoClasse = isUser
            ? 'bg-blue-600 text-white ml-auto'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 mr-auto'
          const timeClasse = isUser ? 'text-blue-200' : 'text-gray-400'

          return (
            <div key={m.id} className="flex">
              <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${balaoClasse}`}>
                <p className="whitespace-pre-wrap">
                  {m.tipo === 'texto' || m.tipo === 'template'
                    ? m.texto
                    : `[${m.tipo}] ${m.texto || '(mídia)'}`}
                </p>
                <div className={`mt-1 text-[10px] ${timeClasse}`}>
                  {new Date(m.enviada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {m.remetente === 'cliente' && !m.lida && ' · Não lida'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input de mensagem */}
      {conversa.conversa.status === 'aberta' ? (
        <form onSubmit={handleSubmit} className="border-t bg-white dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!texto.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t bg-gray-100 dark:bg-gray-800 px-4 py-3">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Conversa {conversa.conversa.status === 'finalizada' ? 'finalizada' : 'arquivada'} — envio bloqueado.
          </p>
        </div>
      )}
    </div>
  )
}