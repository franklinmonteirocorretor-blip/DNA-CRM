'use client'

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import KpiCard from '@/src/components/ui/KpiCard'
import FormAutomacao from '@/src/components/automacoes/FormAutomacao'
import { alterarStatusAutomacao, excluirAutomacao, processarFilaAgora } from '@/app/dashboard/automacoes/actions'
import type { AutomationRecord, AutomationLog } from '@/src/lib/automation/types'

interface QueueItem {
  id: string
  evento: string
  prioridade: number
  tentativas: number
  max_tentativas: number
  status: string
  criado_em: string
  contexto: Record<string, unknown> | null
}

interface AutomacoesClientProps {
  automacoes: AutomationRecord[]
  logsRecentes: AutomationLog[]
  fila: QueueItem[]
  metricas: {
    ativas: number
    total: number
    execucoesHoje: number
    falhas: number
    filaPendente: number
  }
}

function StatusPill({ status }: { status: string }) {
  let bg = 'bg-gray-100 text-gray-700'
  switch (status) {
    case 'ATIVA':
    case 'SUCESSO':
    case 'CONCLUIDO':
      bg = 'bg-green-100 text-green-800'
      break
    case 'INATIVA':
      bg = 'bg-gray-100 text-gray-500'
      break
    case 'ERRO':
    case 'FALHA':
      bg = 'bg-red-100 text-red-800'
      break
    case 'PROCESSANDO':
      bg = 'bg-blue-100 text-blue-800'
      break
    case 'PENDENTE':
      bg = 'bg-yellow-100 text-yellow-800'
      break
    case 'FALHA_PARCIAL':
      bg = 'bg-orange-100 text-orange-800'
      break
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      {status}
    </span>
  )
}

export default function AutomacoesClient({
  automacoes,
  logsRecentes,
  fila,
  metricas,
}: AutomacoesClientProps) {
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3000)
      return () => clearTimeout(t)
    }
  }, [msg])

  async function toggleStatus(id: string, current: string) {
    const novo = current === 'ATIVA' ? ('INATIVA' as const) : ('ATIVA' as const)
    const r = await alterarStatusAutomacao(id, novo)
    setMsg(r.sucesso ? `Automacao ${novo === 'ATIVA' ? 'ativada' : 'desativada'} com sucesso` : r.erro ?? 'Erro ao alterar status')
  }

  async function remove(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta automacao?')) return
    const r = await excluirAutomacao(id)
    setMsg(r.sucesso ? 'Automacao excluida com sucesso' : r.erro ?? 'Erro ao excluir')
  }

  async function processar() {
    const r = await processarFilaAgora()
    setMsg(r.sucesso ? `Fila processada: ${(r as Record<string, unknown>).processados ?? 0} itens` : r.erro ?? 'Erro ao processar fila')
  }

  function fmtData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Motor de Automacoes</h1>
        <div className="flex gap-3">
          <button
            onClick={processar}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Processar Fila
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nova Automacao
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ativas" value={metricas.ativas} color="green" />
        <KpiCard label="Execucoes hoje" value={metricas.execucoesHoje} color="blue" />
        <KpiCard label="Falhas" value={metricas.falhas} color="red" highlightClass={metricas.falhas > 0 ? 'text-red-600' : undefined} />
        <KpiCard label="Fila pendente" value={metricas.filaPendente} color="orange" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Automacoes</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Evento</th>
                <th className="text-left px-4 py-3 font-medium">Condicoes</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {automacoes.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.nome}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.evento}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">#{a.condicoes.length}</td>
                  <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus(a.id, a.status)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${ a.status === 'ATIVA' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200' }`}
                      >
                        {a.status === 'ATIVA' ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {automacoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nenhuma automacao cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Ultimas Execucoes</h2>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Automacao</th>
                <th className="text-left px-4 py-3 font-medium">Evento</th>
                <th className="text-left px-4 py-3 font-medium">Condicoes?</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Duracao</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {logsRecentes.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{log.automacao_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.evento_disparador}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ log.condicoes_atendidas ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}>
                      {log.condicoes_atendidas ? 'OK' : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={log.status} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.duracao_ms != null ? `${log.duracao_ms}ms` : '-'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtData(log.criado_em)}</td>
                </tr>
              ))}
              {logsRecentes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nenhuma execucao recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Fila</h2>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Evento</th>
                <th className="text-left px-4 py-3 font-medium">Prioridade</th>
                <th className="text-left px-4 py-3 font-medium">Tentativas</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {fila.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.evento}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.prioridade}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.tentativas}/{item.max_tentativas}</td>
                  <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtData(item.criado_em)}</td>
                </tr>
              ))}
              {fila.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    Fila vazia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <FormAutomacao onClose={() => setShowForm(false)} />}
    </div>
  )
}