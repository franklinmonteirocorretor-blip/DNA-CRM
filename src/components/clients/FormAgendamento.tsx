'use client'

import { useState, useRef } from 'react'
import { agendarVisita } from '@/app/dashboard/clientes/[id]/actions'
import SelectEmpreendimento from './SelectEmpreendimento'

export default function FormAgendamento({ clienteId }: { clienteId: string }) {
  const [dataHora, setDataHora] = useState('')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [expandido, setExpandido] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!dataHora) {
      setFeedback({ tipo: 'erro', msg: 'Informe a data e hora da visita.' })
      return
    }

    setEnviando(true)
    setFeedback(null)

    const formData = new FormData(formRef.current!)
    const empreendimentoId = (formData.get('empreendimento_id') as string) || null

    const resultado = await agendarVisita({
      cliente_id: clienteId,
      data_hora: dataHora,
      empreendimento_id: empreendimentoId,
      observacao,
    })

    if ('erro' in resultado && resultado.erro) {
      setFeedback({ tipo: 'erro', msg: resultado.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Visita agendada com sucesso!' })
      // Limpa os campos para novo agendamento
      setDataHora('')
      setObservacao('')
      // Mantém o empreendimento (provavelmente vai agendar no mesmo)
      setTimeout(() => setFeedback(null), 5000)
    }

    setEnviando(false)
  }

  return (
    <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
          Agendar visita
        </h2>
        <button
          type="button"
          onClick={() => {
            setExpandido(!expandido)
            setFeedback(null)
          }}
          className="text-xs font-medium text-purple-600 hover:text-purple-500"
        >
          {expandido ? 'Recolher ▲' : 'Expandir ▼'}
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${
            feedback.tipo === 'sucesso'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {expandido && (
        <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Data e hora */}
          <div>
            <label htmlFor="data_hora" className="block text-xs font-medium text-gray-500 mb-1">
              Data e hora da visita
            </label>
            <input
              id="data_hora"
              type="datetime-local"
              required
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Escolha uma data e hora no futuro
            </p>
          </div>

          {/* Empreendimento */}
          <div>
            <label htmlFor="empreendimento_id" className="block text-xs font-medium text-gray-500 mb-1">
              Empreendimento
            </label>
            <SelectEmpreendimento
              name="empreendimento_id"
              id="empreendimento_id"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Observação */}
          <div>
            <label htmlFor="obs_agendamento" className="block text-xs font-medium text-gray-500 mb-1">
              Observação
            </label>
            <textarea
              id="obs_agendamento"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ex: Levar book do empreendimento..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Botão */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando || !dataHora}
              className="rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
            >
              {enviando ? 'Agendando...' : 'Agendar visita'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}