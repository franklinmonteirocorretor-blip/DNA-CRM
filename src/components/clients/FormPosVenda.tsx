'use client'

import { useState } from 'react'
import { registrarPosVenda } from '@/app/dashboard/clientes/[id]/actions'

export default function FormPosVenda({
  clienteId,
  etapaAtual,
  imovelEntregueEm,
  proximaAcao,
  proximaAcaoEm,
}: {
  clienteId: string
  etapaAtual: string
  imovelEntregueEm: string | null
  proximaAcao: string | null
  proximaAcaoEm: string | null
}) {
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [expandido, setExpandido] = useState(false)

  const [dataEntrega, setDataEntrega] = useState('')
  const [acao, setAcao] = useState(proximaAcao ?? '')
  const [prazo, setPrazo] = useState(proximaAcaoEm ? new Date(proximaAcaoEm).toISOString().slice(0, 16) : '')

  // Só mostra a seção se o cliente já fechou (FECHAMENTOS ou POS_VENDA)
  const naEtapaFinal = etapaAtual === 'FECHAMENTOS' || etapaAtual === 'POS_VENDA'
  if (!naEtapaFinal) return null

  const jaPosVenda = etapaAtual === 'POS_VENDA'
  const entregue = imovelEntregueEm !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setFeedback(null)

    const resultado = await registrarPosVenda({
      cliente_id: clienteId,
      imovel_entregue_em: dataEntrega || null,
      proxima_acao: acao.trim() || null,
      proxima_acao_em: prazo || null,
    })

    if ('erro' in resultado && resultado.erro) {
      setFeedback({ tipo: 'erro', msg: resultado.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Pós-venda atualizado com sucesso!' })
      setTimeout(() => setFeedback(null), 4000)
    }

    setEnviando(false)
  }

  return (
    <div className={`rounded-lg p-5 shadow-sm space-y-4 ${jaPosVenda ? 'border border-indigo-200 bg-indigo-50/50' : 'border border-indigo-100 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Pós-Venda
          </h2>
          {jaPosVenda && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
              Em acompanhamento
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setExpandido(!expandido)
            setFeedback(null)
          }}
          className="rounded bg-indigo-100 px-3 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-200"
        >
          {expandido ? 'Fechar' : jaPosVenda ? 'Editar' : 'Iniciar Pós-Venda'}
        </button>
      </div>

      {/* Resumo atual (sempre visível quando há dados) */}
      {jaPosVenda && !expandido && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ResumoMini
            label="Entrega do imóvel"
            valor={entregue ? new Date(imovelEntregueEm!).toLocaleDateString('pt-BR') : 'Pendente'}
            icone={entregue ? '🏠' : '⏳'}
            cor={entregue ? 'text-green-600' : 'text-amber-600'}
          />
          <ResumoMini
            label="Próxima ação"
            valor={proximaAcao ?? 'Não definida'}
            icone={'📋'}
            cor={proximaAcao ? 'text-gray-700' : 'text-gray-400'}
          />
          <ResumoMini
            label="Prazo"
            valor={proximaAcaoEm ? new Date(proximaAcaoEm).toLocaleDateString('pt-BR') : 'Sem prazo'}
            icone={'📅'}
            cor={proximaAcaoEm ? 'text-gray-700' : 'text-gray-400'}
          />
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-xs font-medium ${
            feedback.tipo === 'sucesso'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Formulário (expandido) */}
      {expandido && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          {/* Data de entrega */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Data de entrega do imóvel
            </label>
            <input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Próxima ação */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Próxima ação
            </label>
            <input
              type="text"
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              maxLength={300}
              placeholder="Ex: Enviar documentação para cartório, agendar vistoria..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Prazo para próxima ação
            </label>
            <input
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Botão */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Botão rápido: iniciar pós-venda quando está em FECHAMENTOS */}
      {!jaPosVenda && !expandido && (
        <button
          type="button"
          onClick={async () => {
            setEnviando(true)
            setFeedback(null)
            const resultado = await registrarPosVenda({
              cliente_id: clienteId,
              imovel_entregue_em: null,
              proxima_acao: null,
              proxima_acao_em: null,
            })
            if ('erro' in resultado && resultado.erro) {
              setFeedback({ tipo: 'erro', msg: resultado.erro })
            } else {
              setFeedback({ tipo: 'sucesso', msg: 'Cliente movido para Pós-Venda!' })
              setTimeout(() => setFeedback(null), 4000)
            }
            setEnviando(false)
          }}
          disabled={enviando}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {enviando ? 'Iniciando...' : 'Iniciar Pós-Venda'}
        </button>
      )}
    </div>
  )
}

function ResumoMini({ label, valor, icone, cor }: { label: string; valor: string; icone: string; cor: string }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-xs font-semibold ${cor}`}>
        <span className="mr-1">{icone}</span>
        {valor}
      </p>
    </div>
  )
}