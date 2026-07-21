'use client'

import { useState, useEffect, useCallback } from 'react'
import { listarAgendamentos, buscarOpcoesFiltros } from '@/app/dashboard/agenda/actions'
import { AgendaEvent, AgendaFiltros, AgendaView } from '@/src/types'
import PainelLateralAgenda from './PainelLateralAgenda'
import AlertasAgenda from './AlertasAgenda'

// Labels e cores dos status
const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  REMARCADO: 'Reagendado',
  CANCELADO: 'Cancelado',
}

const STATUS_COR: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-700',
  CONFIRMADO: 'bg-green-100 text-green-700',
  REMARCADO: 'bg-yellow-100 text-yellow-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

// Labels dos dias da semana
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface OpcoesFiltro {
  corretores: { id: string; nome: string }[]
  empreendimentos: { id: string; nome: string }[]
}

export default function CalendarioAgenda() {
  // Estado da view
  const [view, setView] = useState<AgendaView>('monthly')
  const [dataReferencia, setDataReferencia] = useState(new Date())

  // Eventos
  const [eventos, setEventos] = useState<AgendaEvent[]>([])
  const [carregando, setCarregando] = useState(true)

  // Painel lateral
  const [painelAberto, setPainelAberto] = useState(false)
  const [eventoSelecionado, setEventoSelecionado] = useState<AgendaEvent | null>(null)

  // Opções de filtro (dropdowns)
  const [opcoes, setOpcoes] = useState<OpcoesFiltro>({ corretores: [], empreendimentos: [] })

  // Filtros ativos
  const [filtros, setFiltros] = useState<AgendaFiltros>({
    corretorId: null,
    empreendimentoId: null,
    status: null,
    dataInicio: null,
    dataFim: null,
    clienteBusca: null,
  })

  // Carrega opções de filtro uma vez
  useEffect(() => {
    buscarOpcoesFiltros().then((res) => {
      if ('corretores' in res) {
        setOpcoes(res)
      }
    })
  }, [])

  // Carrega eventos sempre que view, dataReferencia, ou filtros mudam
  const carregarEventos = useCallback(() => {
    setCarregando(true)

    // Calcula período baseado na view
    let dataInicio: string | null = null
    let dataFim: string | null = null

    const ref = new Date(dataReferencia)

    if (view === 'monthly') {
      const primeiroDia = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
      dataInicio = primeiroDia.toISOString()
      dataFim = ultimoDia.toISOString()
    } else if (view === 'weekly') {
      const diaSemana = ref.getDay()
      const diff = diaSemana === 0 ? 6 : diaSemana - 1
      const seg = new Date(ref)
      seg.setDate(ref.getDate() - diff)
      seg.setHours(0, 0, 0, 0)
      const dom = new Date(seg)
      dom.setDate(seg.getDate() + 6)
      dom.setHours(23, 59, 59, 999)
      dataInicio = seg.toISOString()
      dataFim = dom.toISOString()
    } else if (view === 'daily') {
      const diaInicio = new Date(ref)
      diaInicio.setHours(0, 0, 0, 0)
      const diaFim = new Date(ref)
      diaFim.setHours(23, 59, 59, 999)
      dataInicio = diaInicio.toISOString()
      dataFim = diaFim.toISOString()
    } else {
      // view === 'list' — busca mês atual por padrão
      const primeiroDia = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
      dataInicio = primeiroDia.toISOString()
      dataFim = ultimoDia.toISOString()
    }

    const filtrosBusca: AgendaFiltros = {
      ...filtros,
      dataInicio,
      dataFim,
    }

    listarAgendamentos(filtrosBusca).then((res) => {
      if ('eventos' in res) {
        setEventos(res.eventos)
      }
      setCarregando(false)
    })
  }, [view, dataReferencia, filtros])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregarEventos e useCallback memoizado; setState dentro do callback, nao diretamente no efeito
    carregarEventos()
  }, [carregarEventos])

  // Navegação de data
  function navegar(direcao: -1 | 1) {
    const nova = new Date(dataReferencia)
    if (view === 'monthly') {
      nova.setMonth(nova.getMonth() + direcao)
    } else if (view === 'weekly') {
      nova.setDate(nova.getDate() + direcao * 7)
    } else {
      nova.setDate(nova.getDate() + direcao)
    }
    setDataReferencia(nova)
  }

  function irParaHoje() {
    setDataReferencia(new Date())
  }

  // Título da view atual
  function tituloView(): string {
    if (view === 'monthly') {
      return `${MESES[dataReferencia.getMonth()]} ${dataReferencia.getFullYear()}`
    }
    if (view === 'weekly') {
      const diaSemana = dataReferencia.getDay()
      const diff = diaSemana === 0 ? 6 : diaSemana - 1
      const seg = new Date(dataReferencia)
      seg.setDate(dataReferencia.getDate() - diff)
      const dom = new Date(seg)
      dom.setDate(seg.getDate() + 6)
      return `${seg.toLocaleDateString('pt-BR')} — ${dom.toLocaleDateString('pt-BR')}`
    }
    return dataReferencia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Abre painel lateral ao clicar em evento
  function abrirPainel(evento: AgendaEvent) {
    setEventoSelecionado(evento)
    setPainelAberto(true)
  }

  function fecharPainel() {
    setPainelAberto(false)
    setEventoSelecionado(null)
  }

  // Atualiza eventos após ação no painel
  function onPainelAtualizado() {
    carregarEventos()
  }

  // Agrupa eventos por data para o calendário
  const eventosPorData = eventos.reduce((acc, ev) => {
    const dataKey = new Date(ev.agendamento.data_hora).toISOString().slice(0, 10)
    if (!acc[dataKey]) acc[dataKey] = []
    acc[dataKey].push(ev)
    return acc
  }, {} as Record<string, AgendaEvent[]>)

  // ── Renderização ──────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Cabeçalho com navegação e views */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navegar(-1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100">
            ◀
          </button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[180px] text-center">
            {tituloView()}
          </h2>
          <button onClick={() => navegar(1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100">
            ▶
          </button>
          <button onClick={irParaHoje} className="ml-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
            Hoje
          </button>
        </div>

        {/* Toggle de views */}
        <div className="flex rounded-lg border bg-white overflow-hidden">
          {(['monthly', 'weekly', 'daily', 'list'] as AgendaView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-medium transition ${
                view === v
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {{ monthly: 'Mês', weekly: 'Semana', daily: 'Dia', list: 'Lista' }[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 rounded-lg bg-white p-3 shadow-sm">
        {/* Status */}
        <select
          value={filtros.status ?? ''}
          onChange={(e) => setFiltros({ ...filtros, status: (e.target.value as AgendaFiltros['status']) || null })}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        >
          <option value="">Todos os status</option>
          <option value="AGENDADO">Agendado</option>
          <option value="CONFIRMADO">Confirmado</option>
          <option value="REMARCADO">Reagendado</option>
          <option value="CANCELADO">Cancelado</option>
          <option value="COMPARECEU">Compareceu</option>
          <option value="NAO_COMPARECEU">Não Compareceu</option>
        </select>

        {/* Empreendimento */}
        <select
          value={filtros.empreendimentoId ?? ''}
          onChange={(e) => setFiltros({ ...filtros, empreendimentoId: e.target.value || null })}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        >
          <option value="">Todos os empreendimentos</option>
          {opcoes.empreendimentos.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.nome}</option>
          ))}
        </select>

        {/* Corretor */}
        <select
          value={filtros.corretorId ?? ''}
          onChange={(e) => setFiltros({ ...filtros, corretorId: e.target.value || null })}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        >
          <option value="">Todos os corretores</option>
          {opcoes.corretores.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        {/* Busca cliente */}
        <input
          type="text"
          value={filtros.clienteBusca ?? ''}
          onChange={(e) => setFiltros({ ...filtros, clienteBusca: e.target.value || null })}
          placeholder="Buscar cliente..."
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs w-32"
        />

        {/* Limpar filtros */}
        {(filtros.status || filtros.empreendimentoId || filtros.corretorId || filtros.clienteBusca) && (
          <button
            onClick={() => setFiltros({ corretorId: null, empreendimentoId: null, status: null, dataInicio: null, dataFim: null, clienteBusca: null })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Alertas */}
      <AlertasAgenda eventos={eventos} />

      {/* Loading */}
      {carregando && (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-400 animate-pulse">Carregando agenda...</p>
        </div>
      )}

      {/* ─── Conteúdo da View ─── */}
      {!carregando && (
        <>
          {view === 'monthly' && <CalendarioMensal dataReferencia={dataReferencia} eventosPorData={eventosPorData} onEventoClick={abrirPainel} />}
          {view === 'weekly' && <CalendarioSemanal dataReferencia={dataReferencia} eventosPorData={eventosPorData} onEventoClick={abrirPainel} />}
          {view === 'daily' && <CalendarioDiario dataReferencia={dataReferencia} eventos={eventos} onEventoClick={abrirPainel} />}
          {view === 'list' && <VisualizacaoLista eventos={eventos} onEventoClick={abrirPainel} />}
        </>
      )}

      {/* Estado vazio */}
      {!carregando && eventos.length === 0 && (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          <p className="text-gray-400">Nenhum compromisso encontrado neste período.</p>
        </div>
      )}

      {/* Painel lateral */}
      {painelAberto && eventoSelecionado && (
        <PainelLateralAgenda
          evento={eventoSelecionado}
          onFechar={fecharPainel}
          onAtualizado={onPainelAtualizado}
        />
      )}
    </div>
  )
}

// ─── Subcomponentes de visualização ─────────────────────────

/**
 * Calendário mensal (grid 7 colunas x 4-6 linhas).
 */
function CalendarioMensal({
  dataReferencia,
  eventosPorData,
  onEventoClick,
}: {
  dataReferencia: Date
  eventosPorData: Record<string, AgendaEvent[]>
  onEventoClick: (ev: AgendaEvent) => void
}) {
  const ano = dataReferencia.getFullYear()
  const mes = dataReferencia.getMonth()
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const totalDias = ultimoDia.getDate()
  const diaSemanaInicio = primeiroDia.getDay() // 0 = dom

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  const celulas: (number | null)[] = []

  // Preenche células vazias antes do primeiro dia
  for (let i = 0; i < diaSemanaInicio; i++) {
    celulas.push(null)
  }

  // Preenche os dias do mês
  for (let d = 1; d <= totalDias; d++) {
    celulas.push(d)
  }

  // Preenche para completar a última linha (múltiplos de 7)
  while (celulas.length % 7 !== 0) {
    celulas.push(null)
  }

  const semanas = []
  for (let i = 0; i < celulas.length; i += 7) {
    semanas.push(celulas.slice(i, i + 7))
  }

  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 bg-gray-50">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
            {dia}
          </div>
        ))}
      </div>

      {/* Grid do mês */}
      <div className="divide-y">
        {semanas.map((semana, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x">
            {semana.map((dia, di) => {
              if (dia === null) {
                return <div key={`empty-${wi}-${di}`} className="min-h-[90px] bg-gray-50/50 p-1" />
              }

              const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
              const eventosDia = eventosPorData[dataStr] ?? []
              const ehHoje = dataStr === hojeStr

              return (
                <div key={dataStr} className={`min-h-[90px] p-1 ${ehHoje ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-300' : ''}`}>
                  <p className={`text-xs font-semibold mb-1 ${ehHoje ? 'text-blue-700' : 'text-gray-600'}`}>
                    {dia}
                  </p>
                  <div className="space-y-0.5">
                    {eventosDia.slice(0, 3).map((ev) => (
                      <button
                        key={ev.agendamento.id}
                        onClick={() => onEventoClick(ev)}
                        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium ${STATUS_COR[ev.agendamento.status] ?? 'bg-gray-100 text-gray-600'} hover:opacity-80`}
                        title={`${ev.cliente.nome} — ${new Date(ev.agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      >
                        {new Date(ev.agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {ev.cliente.nome}
                      </button>
                    ))}
                    {eventosDia.length > 3 && (
                      <p className="text-[9px] text-gray-400 px-1">+{eventosDia.length - 3} mais</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Visualização semanal (grid de 7 colunas com hora).
 */
function CalendarioSemanal({
  dataReferencia,
  eventosPorData,
  onEventoClick,
}: {
  dataReferencia: Date
  eventosPorData: Record<string, AgendaEvent[]>
  onEventoClick: (ev: AgendaEvent) => void
}) {
  const diaSemana = dataReferencia.getDay()
  const diff = diaSemana === 0 ? 6 : diaSemana - 1
  const seg = new Date(dataReferencia)
  seg.setDate(dataReferencia.getDate() - diff)
  seg.setHours(0, 0, 0, 0)

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg)
    d.setDate(seg.getDate() + i)
    return d
  })

  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 divide-x">
        {dias.map((dia) => {
          const dataStr = dia.toISOString().slice(0, 10)
          const eventosDia = eventosPorData[dataStr] ?? []
          const ehHoje = dataStr === hojeStr

          return (
            <div key={dataStr} className={`min-h-[300px] p-2 ${ehHoje ? 'bg-blue-50/30' : ''}`}>
              <div className={`text-center mb-2 ${ehHoje ? 'font-bold' : ''}`}>
                <p className="text-xs text-gray-500">{DIAS_SEMANA[dia.getDay()]}</p>
                <p className={`text-sm font-semibold ${ehHoje ? 'text-blue-700 bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center mx-auto mt-0.5' : 'text-gray-800'}`}>
                  {dia.getDate()}
                </p>
              </div>
              <div className="space-y-1">
                {eventosDia.map((ev) => (
                  <button
                    key={ev.agendamento.id}
                    onClick={() => onEventoClick(ev)}
                    className={`block w-full rounded px-2 py-1.5 text-left text-xs border ${STATUS_COR[ev.agendamento.status]?.replace('bg-', 'border-').replace(' text-', ' ').replace('-100', '-200') ?? 'border-gray-200'} bg-white hover:shadow`}
                  >
                    <p className="font-medium text-gray-800 text-[11px]">
                      {new Date(ev.agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-gray-600 truncate">{ev.cliente.nome}</p>
                    {ev.agendamento.local && <p className="text-[9px] text-gray-400 truncate">📍 {ev.agendamento.local}</p>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Visualização diária (timeline vertical).
 */
function CalendarioDiario({
  dataReferencia,
  eventos,
  onEventoClick,
}: {
  dataReferencia: Date
  eventos: AgendaEvent[]
  onEventoClick: (ev: AgendaEvent) => void
}) {
  const dataStr = dataReferencia.toISOString().slice(0, 10)
  const eventosDia = eventos.filter((ev) => ev.agendamento.data_hora.slice(0, 10) === dataStr)

  // Agrupa por hora
  const porHora: Record<number, AgendaEvent[]> = {}
  eventosDia.forEach((ev) => {
    const h = new Date(ev.agendamento.data_hora).getHours()
    if (!porHora[h]) porHora[h] = []
    porHora[h].push(ev)
  })

  const horas = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="rounded-lg bg-white shadow-sm">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-gray-800">
          {dataReferencia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </h3>
      </div>
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {horas.map((h) => {
          const eventosHora = porHora[h] ?? []
          return (
            <div key={h} className="flex min-h-[48px]">
              <div className="w-16 shrink-0 py-2 text-center text-xs text-gray-400 border-r">
                {String(h).padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-1">
                {eventosHora.map((ev) => (
                  <button
                    key={ev.agendamento.id}
                    onClick={() => onEventoClick(ev)}
                    className={`block w-full rounded px-3 py-2 text-left text-sm mb-0.5 ${STATUS_COR[ev.agendamento.status] ?? 'bg-gray-100'} hover:opacity-90`}
                  >
                    <p className="font-semibold text-xs">{ev.cliente.nome}</p>
                    <p className="text-[10px] opacity-80">
                      {ev.cliente.telefone}
                      {ev.empreendimento && ` · ${ev.empreendimento.nome}`}
                    </p>
                    {ev.agendamento.local && <p className="text-[9px] opacity-60">📍 {ev.agendamento.local}</p>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {eventosDia.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum compromisso neste dia.</div>
        )}
      </div>
    </div>
  )
}

/**
 * Visualização em lista (tabela compacta).
 */
function VisualizacaoLista({
  eventos,
  onEventoClick,
}: {
  eventos: AgendaEvent[]
  onEventoClick: (ev: AgendaEvent) => void
}) {
  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Cabeçalho da tabela */}
      <div className="grid grid-cols-7 gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
        <span>Data/Hora</span>
        <span>Cliente</span>
        <span className="col-span-2">Telefone / Empreend.</span>
        <span>Corretor</span>
        <span>Status</span>
        <span className="text-right">Ações</span>
      </div>

      {eventos.map((ev) => (
        <button
          key={ev.agendamento.id}
          onClick={() => onEventoClick(ev)}
          className="grid grid-cols-7 gap-2 px-4 py-3 border-t text-xs items-center hover:bg-gray-50 w-full text-left"
        >
          <span className="font-medium text-gray-800">
            {new Date(ev.agendamento.data_hora).toLocaleDateString('pt-BR')}
            <br />
            <span className="text-[10px] text-gray-400">
              {new Date(ev.agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
          <span className="font-semibold text-gray-800 truncate">{ev.cliente.nome}</span>
          <span className="col-span-2 text-gray-500 truncate">
            {ev.cliente.telefone}
            {ev.empreendimento && <><br /><span className="text-[10px]">{ev.empreendimento.nome}</span></>}
          </span>
          <span className="text-gray-600 truncate">{ev.corretor.nome}</span>
          <span>
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COR[ev.agendamento.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABEL[ev.agendamento.status] ?? ev.agendamento.status}
            </span>
            {ev.comparecimento && (
              <span className="ml-1 inline-block rounded bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                {ev.comparecimento.resultado === 'COMPARECEU' ? '✓' : '✗'}
              </span>
            )}
          </span>
          <span className="text-right text-[9px] text-blue-500">Ver detalhes →</span>
        </button>
      ))}

      {eventos.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-400">Nenhum compromisso encontrado.</div>
      )}
    </div>
  )
}