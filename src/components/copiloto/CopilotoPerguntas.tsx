// ─── Sprint 16 — Copiloto IA DNA Imóveis ───────────────────────────────────
// Seção 3: Perguntas — campo de pergunta + respostas instantâneas.

'use client'

import { useState, useRef } from 'react'
import type { CopilotPergunta } from '@/src/types/copiloto'

interface PerguntasProps {
  perguntasSugeridas: readonly string[]
  onPerguntar: (pergunta: string) => Promise<string>
  historico: CopilotPergunta[]
}

export function CopilotPerguntas({ perguntasSugeridas, onPerguntar, historico }: PerguntasProps) {
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePerguntar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pergunta.trim() || carregando) return
    setCarregando(true)
    setResposta('')
    try {
      const resp = await onPerguntar(pergunta.trim())
      setResposta(resp)
    } catch {
      setResposta('Erro ao processar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const handleSugestao = async (p: string) => {
    setPergunta(p)
    setCarregando(true)
    setResposta('')
    try {
      const resp = await onPerguntar(p)
      setResposta(resp)
    } catch {
      setResposta('Erro ao processar. Tente novamente.')
    } finally {
      setCarregando(false)
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus()
      }, 100)
    }
  }

  return (
    <section className="rounded-lg border bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">❓ Pergunte ao Copiloto</h3>

      {/* Sugestões */}
      <div className="mt-3 flex flex-wrap gap-1">
        {perguntasSugeridas.map((p) => (
          <button
            key={p}
            onClick={() => handleSugestao(p)}
            className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Campo de pergunta */}
      <form onSubmit={handlePerguntar} className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Digite sua pergunta..."
          className="flex-1 rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          disabled={carregando}
        />
        <button
          type="submit"
          disabled={!pergunta.trim() || carregando}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {carregando ? '...' : 'Perguntar'}
        </button>
      </form>

      {/* Resposta */}
      {resposta && (
        <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-100 p-4">
          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{resposta}</p>
        </div>
      )}

      {/* Histórico recente */}
      {historico.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">Histórico recente</p>
          <div className="space-y-1">
            {historico.slice(0, 5).map((h) => (
              <div key={h.id} className="rounded bg-gray-50 dark:bg-gray-700 px-3 py-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{h.pergunta}</p>
                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{h.resposta}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}