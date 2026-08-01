'use client'

import { useState, useEffect } from 'react'
import { AgendaEvent, Atividade, Agendamento, Comparecimento, Cliente } from '@/src/types'
import {
  buscarDetalhesClientePainel,
  confirmarAgendamento,
  cancelarAgendamento,
  reagendarVisita,
  confirmarComparecimentoAgenda,
} from '@/app/dashboard/agenda/actions'

interface PainelLateralProps {
  evento: AgendaEvent
  onFechar: () => void
  onAtualizado: () => void
}

interface DadosPainel {
  cliente: Cliente
  atividades: Atividade[]
  agendamentos: (Agendamento & { comparecimentos: Comparecimento[] })[]
}

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  REMARCADO: 'Reagendado',
  CANCELADO: 'Cancelado',
}

export default function PainelLateralAgenda({ evento, onFechar, onAtualizado }: PainelLateralProps) {
  const [dados, setDados] = useState<DadosPainel | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'dados' | 'historico' | 'atividades'>('dados')
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)

  // Estados para ações
  const [executandoAcao, setExecutandoAcao] = useState('')

  // Reagendamento
  const [mostrarReagendar, setMostrarReagendar] = useState(false)
  const [novaDataHora, setNovaDataHora] = useState('')
  const [obsReagendar, setObsReagendar] = useState('')

  // Comparecimento
  const [mostrarComparecimento, setMostrarComparecimento] = useState(false)
  const [resultadoComp, setResultadoComp] = useState<'COMPARECEU' | 'NAO_COMPARECEU' | null>(null)
  const [motivoAusencia, setMotivoAusencia] = useState('')
  const [obsComparecimento, setObsComparecimento] = useState('')

  const clienteId = evento.cliente.id
  const agendamentoId = evento.agendamento.id
  const jaTemComparecimento = evento.comparecimento !== null
  const estaCancelado = evento.agendamento.status === 'CANCELADO'

  useEffect(() => {
    buscarDetalhesClientePainel(clienteId).then((res) => {
      if ('cliente' in res) {
        setDados(res as DadosPainel)
      }
      setCarregando(false)
    })
  }, [clienteId])

  // Ações rápidas
  async function acaoConfirmar() {
    setExecutandoAcao('confirmar')
    setFeedback(null)
    const res = await confirmarAgendamento(agendamentoId)
    if ('erro' in res && res.erro) {
      setFeedback({ tipo: 'erro', msg: res.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Agendamento confirmado!' })
      onAtualizado()
    }
    setExecutandoAcao('')
  }

  async function acaoCancelar() {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return
    setExecutandoAcao('cancelar')
    setFeedback(null)
    const res = await cancelarAgendamento(agendamentoId)
    if ('erro' in res && res.erro) {
      setFeedback({ tipo: 'erro', msg: res.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Agendamento cancelado.' })
      onAtualizado()
    }
    setExecutandoAcao('')
  }

  async function acaoReagendar(e: React.FormEvent) {
    e.preventDefault()
    if (!novaDataHora) {
      setFeedback({ tipo: 'erro', msg: 'Selecione uma nova data e hora.' })
      return
    }
    setExecutandoAcao('reagendar')
    setFeedback(null)
    const res = await reagendarVisita({
      agendamentoId,
      novaDataHora,
      observacao: obsReagendar.trim() || null,
    })
    if ('erro' in res && res.erro) {
      setFeedback({ tipo: 'erro', msg: res.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Visita reagendada!' })
      setMostrarReagendar(false)
      setNovaDataHora('')
      setObsReagendar('')
      onAtualizado()
    }
    setExecutandoAcao('')
  }

  async function acaoRegistrarComparecimento(e: React.FormEvent) {
    e.preventDefault()
    if (!resultadoComp) {
      setFeedback({ tipo: 'erro', msg: 'Selecione o resultado.' })
      return
    }
    setExecutandoAcao('comparecimento')
    setFeedback(null)
    const res = await confirmarComparecimentoAgenda({
      agendamentoId,
      clienteId,
      resultado: resultadoComp,
      motivoAusencia: resultadoComp === 'NAO_COMPARECEU' ? motivoAusencia.trim() || null : null,
      observacao: obsComparecimento,
    })
    if ('erro' in res && res.erro) {
      setFeedback({ tipo: 'erro', msg: res.erro })
    } else {
      setFeedback({ tipo: 'sucesso', msg: 'Comparecimento registrado!' })
      setMostrarComparecimento(false)
      setResultadoComp(null)
      onAtualizado()
    }
    setExecutandoAcao('')
  }

  const telefoneLimpo = evento.cliente.telefone.replace(/\D/g, '')
  const whatsappUrl = `https://wa.me/55${telefoneLimpo}`
  const telUrl = `tel:+55${telefoneLimpo}`

  // Formata telefone
  const telFormatado = telefoneLimpo.length === 11
    ? `(${telefoneLimpo.slice(0, 2)}) ${telefoneLimpo.slice(2, 7)}-${telefoneLimpo.slice(7)}`
    : `(${telefoneLimpo.slice(0, 2)}) ${telefoneLimpo.slice(2, 6)}-${telefoneLimpo.slice(6)}`

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onFechar} />

      {/* Painel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{evento.cliente.nome}</h2>
          <button onClick={onFechar} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
            ✕
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`mx-4 mt-3 rounded-md px-3 py-2 text-xs font-medium ${feedback.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {feedback.msg}
          </div>
        )}

        {carregando ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Carregando dados...</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Dados do cliente */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3 space-y-2 text-sm">
              <p className="font-semibold text-gray-800">
                {STATUS_LABEL[evento.agendamento.status]} — {new Date(evento.agendamento.data_hora).toLocaleDateString('pt-BR')}
                {' às '}{new Date(evento.agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-gray-600 dark:text-gray-400">📞 {telFormatado}</p>
              {evento.cliente.email && <p className="text-gray-600 dark:text-gray-400">✉️ {evento.cliente.email}</p>}
              {evento.empreendimento && <p className="text-gray-600 dark:text-gray-400">🏢 {evento.empreendimento.nome}</p>}
              {evento.agendamento.local && <p className="text-gray-600 dark:text-gray-400">📍 {evento.agendamento.local}</p>}
              <p className="text-gray-600 dark:text-gray-400">👤 Corretor: {evento.corretor.nome}</p>
              {evento.agendamento.observacao && (
                <p className="text-gray-500 dark:text-gray-400 text-xs border-t pt-2 mt-2">📝 {evento.agendamento.observacao}</p>
              )}
            </div>

            {/* Botões de ação rápida */}
            <div className="grid grid-cols-2 gap-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-green-600 py-2 text-xs font-semibold text-white text-center hover:bg-green-500">
                💬 WhatsApp
              </a>
              <a href={telUrl}
                className="rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white text-center hover:bg-blue-500">
                📞 Ligar
              </a>
            </div>

            {/* Segunda linha de ações */}
            <div className="grid grid-cols-2 gap-2">
              <a href={`/dashboard/clientes/${clienteId}`}
                className="rounded-lg border border-blue-300 bg-blue-50 py-2 text-xs font-medium text-blue-700 text-center hover:bg-blue-100">
                ✏️ Editar Cliente
              </a>
              {!estaCancelado && (
                <button onClick={acaoConfirmar} disabled={executandoAcao !== '' || evento.agendamento.status === 'CONFIRMADO'}
                  className="rounded-lg bg-green-100 border border-green-300 py-2 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50">
                  {evento.agendamento.status === 'CONFIRMADO' ? '✓ Confirmado' : '✓ Confirmar'}
                </button>
              )}
            </div>

            {/* Reagendar e Cancelar */}
            {!estaCancelado && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setMostrarReagendar(!mostrarReagendar); setMostrarComparecimento(false) }}
                  className="rounded-lg bg-yellow-100 border border-yellow-300 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-200">
                  📅 Reagendar
                </button>
                <button onClick={acaoCancelar} disabled={executandoAcao !== ''}
                  className="rounded-lg bg-red-100 border border-red-300 py-2 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50">
                  {executandoAcao === 'cancelar' ? 'Cancelando...' : '✕ Cancelar'}
                </button>
              </div>
            )}

            {/* Comparecimento */}
            {!estaCancelado && (
              <div>
                {jaTemComparecimento ? (
                  <div className="rounded-lg bg-purple-100 border border-purple-200 p-3 text-xs font-medium text-purple-700">
                    {evento.comparecimento!.resultado === 'COMPARECEU' ? '✅ Cliente compareceu' : '❌ Cliente não compareceu'}
                    {evento.comparecimento!.motivo_ausencia && (
                      <p className="mt-1 text-[10px] font-normal">Motivo: {evento.comparecimento!.motivo_ausencia}</p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setMostrarComparecimento(!mostrarComparecimento); setMostrarReagendar(false) }}
                    className="w-full rounded-lg bg-purple-100 border border-purple-300 py-2 text-xs font-medium text-purple-700 hover:bg-purple-200">
                    📋 Registrar Comparecimento
                  </button>
                )}
              </div>
            )}

            {/* Formulário de Reagendamento */}
            {mostrarReagendar && (
              <form onSubmit={acaoReagendar} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-yellow-800">Reagendar visita</h3>
                <input
                  type="datetime-local"
                  value={novaDataHora}
                  onChange={(e) => setNovaDataHora(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="block w-full rounded-md border border-yellow-300 px-3 py-2 text-sm"
                  required
                />
                <textarea
                  value={obsReagendar}
                  onChange={(e) => setObsReagendar(e.target.value)}
                  maxLength={300}
                  placeholder="Motivo do reagendamento (opcional)..."
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setMostrarReagendar(false)}
                    className="rounded-lg border px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancelar</button>
                  <button type="submit" disabled={executandoAcao !== ''}
                    className="rounded-lg bg-yellow-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-yellow-500 disabled:opacity-50">
                    {executandoAcao === 'reagendar' ? 'Salvando...' : 'Confirmar Reagendamento'}
                  </button>
                </div>
              </form>
            )}

            {/* Formulario de Comparecimento */}
            {mostrarComparecimento && (
              <form onSubmit={acaoRegistrarComparecimento} className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-purple-800">Registrar comparecimento</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setResultadoComp('COMPARECEU')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${resultadoComp === 'COMPARECEU' ? 'border-green-300 bg-green-100 text-green-700' : 'border-gray-200 bg-white dark:bg-gray-800 text-gray-600'}`}>
                    ✅ Compareceu
                  </button>
                  <button type="button" onClick={() => setResultadoComp('NAO_COMPARECEU')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${resultadoComp === 'NAO_COMPARECEU' ? 'border-red-300 bg-red-100 text-red-700' : 'border-gray-200 bg-white dark:bg-gray-800 text-gray-600'}`}>
                    ❌ Não compareceu
                  </button>
                </div>
                {resultadoComp === 'NAO_COMPARECEU' && (
                  <input
                    type="text"
                    value={motivoAusencia}
                    onChange={(e) => setMotivoAusencia(e.target.value)}
                    maxLength={200}
                    placeholder="Motivo da ausência..."
                    className="block w-full rounded-md border border-red-200 px-3 py-2 text-sm"
                  />
                )}
                <textarea
                  value={obsComparecimento}
                  onChange={(e) => setObsComparecimento(e.target.value)}
                  maxLength={300}
                  placeholder="Observações (opcional)..."
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setMostrarComparecimento(false)}
                    className="rounded-lg border px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancelar</button>
                  <button type="submit" disabled={executandoAcao !== '' || !resultadoComp}
                    className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
                    {executandoAcao === 'comparecimento' ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            )}

            {/* Abas: Dados completos / Histórico / Atividades */}
            <div className="border-t pt-4">
              <div className="flex gap-1 border-b">
                {(['dados', 'historico', 'atividades'] as const).map((a) => (
                  <button key={a} onClick={() => setAba(a)}
                    className={`px-3 py-2 text-xs font-medium -mb-px ${aba === a ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    {{ dados: 'Dados', historico: 'Histórico', atividades: 'Atividades' }[a]}
                  </button>
                ))}
              </div>

              {aba === 'dados' && dados && (
                <div className="py-3 space-y-2 text-xs">
                  <p><strong>Etapa:</strong> {dados.cliente.etapa_atual}</p>
                  <p><strong>Dependentes:</strong> {dados.cliente.dependentes}</p>
                  <p><strong>Renda:</strong> {dados.cliente.renda != null ? `R$ ${dados.cliente.renda.toLocaleString('pt-BR')}` : '—'}</p>
                  <p><strong>FGTS:</strong> R$ {dados.cliente.saldo_fgts.toLocaleString('pt-BR')}</p>
                  {dados.cliente.observacoes && (
                    <p className="whitespace-pre-wrap text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t">{dados.cliente.observacoes}</p>
                  )}
                </div>
              )}

              {aba === 'historico' && dados && (
                <div className="py-3 space-y-3">
                  {dados.agendamentos.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum agendamento anterior.</p>
                  ) : (
                    dados.agendamentos.map((ag) => (
                      <div key={ag.id} className="rounded bg-gray-50 dark:bg-gray-700 p-3 text-xs">
                        <p className="font-medium">{new Date(ag.data_hora).toLocaleDateString('pt-BR')} às {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-gray-500 dark:text-gray-400">{STATUS_LABEL[ag.status]}</p>
                        {ag.comparecimentos?.[0] && (
                          <p className={ag.comparecimentos[0].resultado === 'COMPARECEU' ? 'text-green-600' : 'text-red-600'}>
                            {ag.comparecimentos[0].resultado === 'COMPARECEU' ? '✓ Compareceu' : '✗ Não compareceu'}
                          </p>
                        )}
                        {ag.observacao && <p className="text-gray-400 dark:text-gray-500 mt-1 italic">{ag.observacao}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {aba === 'atividades' && dados && (
                <div className="py-3 space-y-2">
                  {dados.atividades.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma atividade registrada.</p>
                  ) : (
                    dados.atividades.map((ativ) => (
                      <div key={ativ.id} className="border-l-2 border-blue-200 pl-3 py-1 text-xs">
                        <p className="font-medium">{ativ.tipo} — {ativ.resultado ?? 'Sem resultado'}</p>
                        {ativ.observacao && <p className="text-gray-400 dark:text-gray-500 mt-0.5">{ativ.observacao}</p>}
                        <p className="text-gray-300 dark:text-gray-600 text-[10px] mt-0.5">
                          {new Date(ativ.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}