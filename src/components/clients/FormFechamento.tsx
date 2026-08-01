'use client'

import { useState } from 'react'
import { registrarFechamento } from '@/app/dashboard/clientes/[id]/actions'

export default function FormFechamento({
  clienteId,
  fichaPropostaAssinada,
  etapaAtual,
  resultadoAnalise,
}: {
  clienteId: string
  fichaPropostaAssinada: boolean
  etapaAtual: string
  resultadoAnalise: string | null
}) {
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)

  // Só mostra a seção se o cliente está APROVADO e ainda não fechou
  const aprovado = resultadoAnalise === 'APROVADO'
  const jaFechado = fichaPropostaAssinada || etapaAtual === 'FECHAMENTOS' || etapaAtual === 'POS_VENDA'

  // Se já fechou, mostra apenas o badge de confirmação
  if (jaFechado && !feedback) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Fechamento
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                ✅ Fechado
              </span>
              <span className="text-xs text-green-500">
                Ficha proposta assinada
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Se não está aprovado, não mostra nada
  if (!aprovado) return null

  async function handleFechar() {
    setEnviando(true)
    setFeedback(null)

    const resultado = await registrarFechamento({ cliente_id: clienteId })

    if ('erro' in resultado && resultado.erro) {
      setFeedback({ tipo: 'erro', msg: resultado.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Fechamento registrado! Cliente movido para FECHAMENTOS.' })
    }

    setEnviando(false)
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Fechamento
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cliente aprovado — pronto para fechar negócio
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${ feedback.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Toggle de fechamento */}
      <div className="mt-4 flex items-start gap-3 rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Ficha Proposta Assinada
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Ao confirmar, o cliente será movido automaticamente para a etapa{' '}
            <strong>FECHAMENTOS</strong> pelo sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFechar}
          disabled={enviando}
          className="shrink-0 rounded-lg bg-green-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
        >
          {enviando ? 'Registrando...' : 'Registrar Fechamento'}
        </button>
      </div>
    </div>
  )
}