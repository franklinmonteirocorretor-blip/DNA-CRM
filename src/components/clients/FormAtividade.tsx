'use client'

import { useState } from 'react'
import { registrarAtividade } from '@/app/dashboard/clientes/[id]/actions'
import { TipoAtividade } from '@/src/types'

const TIPOS: { valor: TipoAtividade; label: string; icone: string }[] = [
  { valor: 'LIGACAO', label: 'Ligação', icone: '📞' },
  { valor: 'WHATSAPP', label: 'WhatsApp', icone: '💬' },
  { valor: 'FOLLOW_UP', label: 'Follow-up', icone: '🔄' },
]

export default function FormAtividade({ clienteId }: { clienteId: string }) {
  const [tipo, setTipo] = useState<TipoAtividade | null>(null)
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [expandido, setExpandido] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!tipo) {
      setFeedback({ tipo: 'erro', msg: 'Selecione o tipo de atividade.' })
      return
    }

    setEnviando(true)
    setFeedback(null)

    const resultado = await registrarAtividade({
      cliente_id: clienteId,
      tipo,
      observacao,
    })

    if ('erro' in resultado && resultado.erro) {
      setFeedback({ tipo: 'erro', msg: resultado.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Atividade registrada!' })
      setObservacao('')
      // Não reseta o tipo (facilita registrar várias ligações seguidas)
    }

    setEnviando(false)

    // Feedback some automaticamente após 3 segundos
    if (!resultado.erro) {
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Registrar atividade
        </h2>
        <button
          type="button"
          onClick={() => {
            setExpandido(!expandido)
            setFeedback(null)
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-500"
        >
          {expandido ? 'Recolher ▲' : 'Expandir ▼'}
        </button>
      </div>

      {/* Feedback inline */}
      {feedback && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${ feedback.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Formulário (só visível quando expandido) */}
      {expandido && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Seleção do tipo: botões grandes */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Tipo de contato
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTipo(t.valor)}
                  className={`flex flex-col items-center justify-center rounded-lg border px-3 py-3 text-xs font-medium transition ${ tipo === t.valor ? 'border-blue-300 bg-blue-100 text-blue-700 shadow-sm' : 'border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50' }`}
                >
                  <span className="text-base">{t.icone}</span>
                  <span className="mt-1">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={`Descreva o que foi conversado... (opcional)`}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Botão salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando || !tipo}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {enviando ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* Botão rápido: registrar ligação em 1 clique (sempre visível) */}
      {!expandido && (
        <div className="mt-3 flex gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={async () => {
                setEnviando(true)
                setFeedback(null)
                const resultado = await registrarAtividade({
                  cliente_id: clienteId,
                  tipo: t.valor,
                  observacao: '',
                })
                if ('erro' in resultado && resultado.erro) {
                  setFeedback({ tipo: 'erro', msg: resultado.erro })
                } else {
                  setFeedback({ tipo: 'sucesso', msg: `${t.label} registrada!` })
                  setTimeout(() => setFeedback(null), 3000)
                }
                setEnviando(false)
              }}
              disabled={enviando}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <span>{t.icone}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}