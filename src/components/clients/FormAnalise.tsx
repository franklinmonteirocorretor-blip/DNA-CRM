'use client'

import { useState } from 'react'
import { registrarAnalise } from '@/app/dashboard/clientes/[id]/actions'
import { ResultadoAnalise } from '@/src/types'

const OPCOES: {
  valor: ResultadoAnalise
  label: string
  descricao: string
  cor: string
  corBg: string
  corTexto: string
}[] = [
  {
    valor: 'APROVADO',
    label: 'Aprovado',
    descricao: 'Cliente passou na análise de crédito',
    cor: '#22c55e',
    corBg: '#dcfce7',
    corTexto: '#166534',
  },
  {
    valor: 'CONDICIONADO',
    label: 'Condicionado',
    descricao: 'Aprovado com condições (ex: comprovar renda extra)',
    cor: '#f59e0b',
    corBg: '#fef3c7',
    corTexto: '#92400e',
  },
  {
    valor: 'DOC_PENDENTE',
    label: 'Documento Pendente',
    descricao: 'Falta enviar documentos para continuar a análise',
    cor: '#6366f1',
    corBg: '#e0e7ff',
    corTexto: '#3730a3',
  },
  {
    valor: 'RESTRICAO',
    label: 'Restrição',
    descricao: 'Cliente não passou na análise de crédito',
    cor: '#ef4444',
    corBg: '#fee2e2',
    corTexto: '#991b1b',
  },
]

export default function FormAnalise({
  clienteId,
  resultadoAtual,
}: {
  clienteId: string
  resultadoAtual: ResultadoAnalise | null
}) {
  const [selecionado, setSelecionado] = useState<ResultadoAnalise | null>(null)
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [expandido, setExpandido] = useState(false)

  const jaAnalisado = resultadoAtual !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selecionado) {
      setFeedback({ tipo: 'erro', msg: 'Selecione o resultado da análise.' })
      return
    }

    setEnviando(true)
    setFeedback(null)

    const resultado = await registrarAnalise({
      cliente_id: clienteId,
      resultado: selecionado,
      observacao,
    })

    if ('erro' in resultado && resultado.erro) {
      setFeedback({ tipo: 'erro', msg: resultado.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Resultado da análise registrado!' })
      setObservacao('')
      setTimeout(() => setFeedback(null), 4000)
    }

    setEnviando(false)
  }

  const opcaoAtual = jaAnalisado ? OPCOES.find((o) => o.valor === resultadoAtual) : null

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Análise de Crédito
        </h2>

        {jaAnalisado && opcaoAtual && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: opcaoAtual.corBg, color: opcaoAtual.corTexto }}
          >
            {opcaoAtual.label}
          </span>
        )}

        {!jaAnalisado && (
          <button
            type="button"
            onClick={() => {
              setExpandido(!expandido)
              setFeedback(null)
            }}
            className="rounded bg-orange-100 px-3 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-200"
          >
            {expandido ? 'Fechar' : 'Registrar resultado'}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-xs font-medium ${ feedback.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
        >
          {feedback.msg}
        </div>
      )}

      {expandido && !jaAnalisado && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Resultado da análise
            </p>
            <div className="grid grid-cols-2 gap-2">
              {OPCOES.map((opcao) => {
                const ativo = selecionado === opcao.valor
                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => setSelecionado(opcao.valor)}
                    className="flex flex-col items-start rounded-lg border px-3 py-3 text-left transition"
                    style={{
                      borderColor: ativo ? opcao.cor : '#e5e7eb',
                      backgroundColor: ativo ? opcao.corBg : '#ffffff',
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: ativo ? opcao.corTexto : '#6b7280' }}
                    >
                      {opcao.label}
                    </span>
                    <span className="mt-0.5 text-[11px] leading-tight text-gray-400 dark:text-gray-500">
                      {opcao.descricao}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
              Observação / Motivo <span className="font-normal">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={
                selecionado === 'RESTRICAO'
                  ? 'Ex: Nome no Serasa, score baixo...'
                  : selecionado === 'CONDICIONADO'
                    ? 'Ex: Precisa comprovar mais R$ 500 de renda...'
                    : 'Detalhes da análise...'
              }
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando || !selecionado}
              className="rounded-lg bg-orange-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 disabled:opacity-50"
            >
              {enviando ? 'Salvando...' : 'Registrar resultado'}
            </button>
          </div>
        </form>
      )}

      {jaAnalisado && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          A análise de crédito já foi registrada.{' '}
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="text-blue-600 hover:text-blue-500"
          >
            {expandido ? 'Recolher' : 'Reavaliar?'}
          </button>
        </p>
      )}

      {expandido && jaAnalisado && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Você está alterando o resultado de uma análise já registrada.
          </p>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Novo resultado</p>
            <div className="grid grid-cols-2 gap-2">
              {OPCOES.filter((o) => o.valor !== resultadoAtual).map((opcao) => {
                const ativo = selecionado === opcao.valor
                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => setSelecionado(opcao.valor)}
                    className="flex flex-col items-start rounded-lg border px-3 py-3 text-left transition"
                    style={{
                      borderColor: ativo ? opcao.cor : '#e5e7eb',
                      backgroundColor: ativo ? opcao.corBg : '#ffffff',
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: ativo ? opcao.corTexto : '#6b7280' }}
                    >
                      {opcao.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Motivo da reavaliação..."
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando || !selecionado}
              className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
            >
              {enviando ? 'Salvando...' : 'Reavaliar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}