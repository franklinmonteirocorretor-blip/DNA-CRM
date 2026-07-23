'use client'

import { useState, useCallback, useEffect, DragEvent } from 'react'
import { EtapaFunil, PipelineClienteCard, PipelineFiltros } from '@/src/types'
import { listarClientesPipeline, moverEtapa } from '@/app/dashboard/funil/actions'
import PipelineColuna from './PipelineColuna'
import PainelClientePipeline from './PainelClientePipeline'

// Configuração visual das etapas
const ETAPA_CONFIG = {
  NOVO_LEAD:       { label: 'Novo Contato',        cor: '#6b7280', icone: '🆕', desc: 'Leads recém-captados, sem contato ainda.' },
  CONTATOS:        { label: 'Contato Realizado',    cor: '#eab308', icone: '📞', desc: 'Primeiro contato realizado com sucesso.' },
  AGENDAMENTO:     { label: 'Visita Agendada',     cor: '#3b82f6', icone: '📅', desc: 'Visita ao empreendimento agendada.' },
  COMPARECIMENTO:  { label: 'Visita',              cor: '#8b5cf6', icone: '🏠', desc: 'Cliente compareceu à visita.' },
  ANALISE:         { label: 'Análise',             cor: '#f97316', icone: '🔍', desc: 'Análise financeira em andamento.' },
  RESTRICOES:      { label: 'Restrições',          cor: '#ef4444', icone: '🚫', desc: 'Restrições encontradas na análise.' },
  CONDICIONADOS:   { label: 'Condicionado',        cor: '#ec4899', icone: '⏳', desc: 'Aguardando aprovação condicional.' },
  APROVADOS:       { label: 'Aprovado',            cor: '#14b8a6', icone: '✅', desc: 'Crédito aprovado pelo banco.' },
  FECHAMENTOS:     { label: 'Documentação/Contrato', cor: '#22c55e', icone: '📝', desc: 'Documentação e contrato em andamento.' },
  POS_VENDA:       { label: 'Pós-venda',           cor: '#6366f1', icone: '🤝', desc: 'Cliente fechado. Pós-venda e fidelização.' },
}

const ORDEM: EtapaFunil[] = [
  'NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO',
  'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS',
  'FECHAMENTOS', 'POS_VENDA',
]

export default function PipelineBoard() {
  const [colunas, setColunas] = useState<Record<EtapaFunil, PipelineClienteCard[]>>({} as Record<EtapaFunil, PipelineClienteCard[]>)
  const [carregando, setCarregando] = useState(true)
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null)
  const [painelAberto, setPainelAberto] = useState(false)
  const [arrastando, setArrastando] = useState<{ clienteId: string; etapaOrigem: EtapaFunil } | null>(null)
  const [filtros, setFiltros] = useState<PipelineFiltros>({ etapa: null, corretorId: null, empreendimentoId: null, busca: null })

  // Carrega dados
  const carregar = useCallback(async (f?: PipelineFiltros) => {
    setCarregando(true)
    const dados = await listarClientesPipeline(f ?? filtros)
    setColunas(dados)
    setCarregando(false)
  }, [filtros])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carregar e useCallback memoizado; carrega dados iniciais do pipeline
  useEffect(() => { carregar() }, [carregar])

  function onFiltrar(f: PipelineFiltros) {
    setFiltros(f)
    carregar(f)
  }

  // Drag & Drop handlers
  function onDragStart(e: DragEvent<HTMLDivElement>, clienteId: string, etapaOrigem: EtapaFunil) {
    e.dataTransfer.setData('text/plain', clienteId)
    e.dataTransfer.effectAllowed = 'move'
    setArrastando({ clienteId, etapaOrigem })
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function onDrop(e: DragEvent<HTMLDivElement>, etapaDestino: EtapaFunil) {
    e.preventDefault()
    const clienteId = e.dataTransfer.getData('text/plain')
    if (!clienteId || !arrastando) return

    // Valida regra: não pode pular etapas (opcional, simplificado)
    const idxOrigem = ORDEM.indexOf(arrastando.etapaOrigem)
    const idxDestino = ORDEM.indexOf(etapaDestino)
    if (idxDestino < idxOrigem) {
      // Movendo para trás — permitido (reclassificação)
    }

    // Otimista: move no estado local
    const card = colunas[arrastando.etapaOrigem]?.find((c) => c.id === clienteId)
    if (!card) return

    const novasColunas = { ...colunas }
    novasColunas[arrastando.etapaOrigem] = novasColunas[arrastando.etapaOrigem].filter((c) => c.id !== clienteId)
    card.etapaAtual = etapaDestino
    novasColunas[etapaDestino] = [...(novasColunas[etapaDestino] ?? []), card]
    setColunas(novasColunas)
    setArrastando(null)

    // Persiste no banco
    await moverEtapa(clienteId, etapaDestino)
  }

  function abrirPainel(clienteId: string) {
    setClienteSelecionado(clienteId)
    setPainelAberto(true)
  }

  function fecharPainel() {
    setPainelAberto(false)
    setClienteSelecionado(null)
  }

  function onPainelAtualizado() {
    fecharPainel()
    carregar()
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 animate-pulse">Carregando pipeline...</p>
      </div>
    )
  }

  const totalClientes = Object.values(colunas).reduce((s, arr) => s + arr.length, 0)

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar nome ou telefone..."
          value={filtros.busca ?? ''}
          onChange={(e) => onFiltrar({ ...filtros, busca: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-56"
        />
        <span className="text-xs text-gray-400 ml-auto">{totalClientes} clientes no pipeline</span>
      </div>

      {/* Board com colunas */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {ORDEM.map((etapa) => (
            <PipelineColuna
              key={etapa}
              etapa={etapa}
              config={ETAPA_CONFIG[etapa]}
              cards={colunas[etapa] ?? []}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onCardClick={abrirPainel}
              arrastando={arrastando}
            />
          ))}
        </div>
      </div>

      {/* Painel lateral */}
      {painelAberto && clienteSelecionado && (
        <PainelClientePipeline
          clienteId={clienteSelecionado}
          onFechar={fecharPainel}
          onAtualizado={onPainelAtualizado}
        />
      )}
    </div>
  )
}