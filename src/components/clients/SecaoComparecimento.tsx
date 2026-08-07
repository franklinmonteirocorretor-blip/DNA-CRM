'use client'

import { useState } from 'react'
import { registrarComparecimento } from '@/app/dashboard/clientes/[id]/actions'
import { Agendamento, Comparecimento } from '@/src/types'

export default function SecaoComparecimento({
  clienteId,
  agendamentos,
}: {
  clienteId: string
  agendamentos: { agendamento: Agendamento; comparecimento: Comparecimento | null }[]
}) {
  // Se não há agendamentos, não renderiza nada
  if (agendamentos.length === 0) return null

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Agendamentos
      </h2>

      {agendamentos.map(({ agendamento, comparecimento }) => (
        <ComparecimentoItem
          key={agendamento.id}
          clienteId={clienteId}
          agendamento={agendamento}
          comparecimento={comparecimento}
        />
      ))}
    </div>
  )
}

function ComparecimentoItem({
  clienteId,
  agendamento,
  comparecimento,
}: {
  clienteId: string
  agendamento: Agendamento
  comparecimento: Comparecimento | null
}) {
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [expandido, setExpandido] = useState(false)
  const [resultado, setResultado] = useState<'COMPARECEU' | 'NAO_COMPARECEU' | null>(null)
  const [motivoAusencia, setMotivoAusencia] = useState('')
  const [observacao, setObservacao] = useState('')

  const jaRegistrado = comparecimento !== null
  const dataVisita = new Date(agendamento.data_hora)

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()

    if (!resultado) {
      setFeedback({ tipo: 'erro', msg: 'Selecione se o cliente compareceu ou não.' })
      return
    }

    setEnviando(true)
    setFeedback(null)

    const res = await registrarComparecimento({
      cliente_id: clienteId,
      agendamento_id: agendamento.id,
      resultado,
      motivo_ausencia: resultado === 'NAO_COMPARECEU' ? motivoAusencia.trim() || null : null,
      observacao,
    })

    if ('erro' in res && res.erro) {
      setFeedback({ tipo: 'erro', msg: res.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Comparecimento registrado!' })
      setTimeout(() => setFeedback(null), 4000)
    }

    setEnviando(false)
  }

  return (
    <div className={`rounded-lg border p-4 ${jaRegistrado ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
      {/* Cabeçalho do agendamento */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            Visita {dataVisita.toLocaleDateString('pt-BR')} às{' '}
            {dataVisita.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {agendamento.status === 'CANCELADO' && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
              Cancelado
            </span>
          )}
        </div>

        {/* Status do comparecimento */}
        {jaRegistrado ? (
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${ comparecimento.resultado === 'COMPARECEU' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
            >
              {comparecimento.resultado === 'COMPARECEU' ? '✓ Compareceu' : '✗ Não compareceu'}
            </span>
            {comparecimento.motivo_ausencia && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[160px] truncate">
                Motivo: {comparecimento.motivo_ausencia}
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setExpandido(!expandido)
              setFeedback(null)
            }}
            disabled={agendamento.status === 'CANCELADO'}
            className="rounded bg-orange-100 px-3 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-40"
          >
            {expandido ? 'Fechar' : 'Registrar comparecimento'}
          </button>
        )}
      </div>

      {/* Empreendimento (se houver) */}
      {agendamento.empreendimento_interesse && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          📍 {agendamento.empreendimento_interesse}
        </p>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`mt-3 rounded-md px-3 py-1.5 text-xs font-medium ${ feedback.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Formulário (só se expandido e não registrado) */}
      {expandido && !jaRegistrado && agendamento.status !== 'CANCELADO' && (
        <form onSubmit={handleRegistrar} className="mt-4 space-y-3 pt-3 border-t">
          {/* Compareceu / Não compareceu */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Resultado</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setResultado('COMPARECEU')
                  setMotivoAusencia('')
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${ resultado === 'COMPARECEU' ? 'border-green-300 bg-green-100 text-green-700' : 'border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50' }`}
              >
                ✅ Compareceu
              </button>
              <button
                type="button"
                onClick={() => setResultado('NAO_COMPARECEU')}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${ resultado === 'NAO_COMPARECEU' ? 'border-red-300 bg-red-100 text-red-700' : 'border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50' }`}
              >
                ❌ Não compareceu
              </button>
            </div>
          </div>

          {/* Motivo da ausência (só se não compareceu) */}
          {resultado === 'NAO_COMPARECEU' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Motivo da ausência
              </label>
              <input
                value={motivoAusencia}
                onChange={(e) => setMotivoAusencia(e.target.value)}
                type="text"
                maxLength={200}
                placeholder="Ex: Cliente não atendeu, esqueceu..."
                className="block w-full rounded-md border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 shadow-sm focus:border-red-400 dark:focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
              Observação <span className="font-normal">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Anotações sobre a visita..."
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Botão salvar */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={enviando || !resultado}
              className="rounded-lg bg-orange-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 disabled:opacity-50"
            >
              {enviando ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}