'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import type { Empreendimento } from '@/src/types'
import { ETAPA_OPTIONS_DROPDOWN } from '@/src/config/pipeline'

// Opções do dropdown com "Todas as etapas" como default
const ETAPA_LABELS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas as etapas' },
  ...ETAPA_OPTIONS_DROPDOWN,
]

const ORDENACAO_LABELS: { valor: string; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigos', rotulo: 'Mais antigos' },
  { valor: 'nome', rotulo: 'Nome (A-Z)' },
  { valor: 'atividade', rotulo: 'Última atividade' },
]

export default function BarraBuscaFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const qAtual = searchParams.get('q') ?? ''
  const etapaAtual = searchParams.get('etapa') ?? ''
  const ordemAtual = searchParams.get('ordem') ?? 'recentes'
  const empreendimentoAtual = searchParams.get('empreendimento') ?? ''

  const [busca, setBusca] = useState(qAtual)
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])

  // Carrega a lista de empreendimentos para o dropdown
  useEffect(() => {
    supabase
      .from('empreendimentos')
      .select('id, nome')
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome', { ascending: true })
      .then(({ data }) => {
        setEmpreendimentos((data as Empreendimento[]) ?? [])
      })
  }, [])

  const aplicarFiltros = useCallback(
    (params: URLSearchParams) => {
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname]
  )

  function handleBuscar() {
    const params = new URLSearchParams(searchParams.toString())
    const termo = busca.trim()
    if (termo) {
      params.set('q', termo)
    } else {
      params.delete('q')
    }
    aplicarFiltros(params)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleBuscar()
    }
  }

  function handleMudarEtapa(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    const valor = e.target.value
    if (valor) {
      params.set('etapa', valor)
    } else {
      params.delete('etapa')
    }
    aplicarFiltros(params)
  }

  function handleMudarOrdem(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    const valor = e.target.value
    if (valor && valor !== 'recentes') {
      params.set('ordem', valor)
    } else {
      params.delete('ordem')
    }
    aplicarFiltros(params)
  }

  function handleMudarEmpreendimento(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    const valor = e.target.value
    if (valor) {
      params.set('empreendimento', valor)
    } else {
      params.delete('empreendimento')
    }
    aplicarFiltros(params)
  }

  function handleLimpar() {
    setBusca('')
    router.push(pathname)
  }

  const temFiltros = qAtual || etapaAtual || ordemAtual !== 'recentes' || empreendimentoAtual

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Campo de busca por nome ou CPF */}
      <div className="flex flex-1 min-w-[200px] max-w-md">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nome ou CPF..."
          className="w-full rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleBuscar}
          className="rounded-r-lg border border-l-0 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Buscar
        </button>
      </div>

      {/* Dropdown: Filtrar por etapa */}
      <select
        value={etapaAtual}
        onChange={handleMudarEtapa}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {ETAPA_LABELS.map((e) => (
          <option key={e.valor} value={e.valor}>
            {e.rotulo}
          </option>
        ))}
      </select>

      {/* Dropdown: Filtrar por empreendimento */}
      <select
        value={empreendimentoAtual}
        onChange={handleMudarEmpreendimento}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Todos os empreendimentos</option>
        {empreendimentos.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.nome}
          </option>
        ))}
      </select>

      {/* Dropdown: Ordenação */}
      <select
        value={ordemAtual}
        onChange={handleMudarOrdem}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {ORDENACAO_LABELS.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>

      {/* Botão limpar filtros (só aparece quando há filtro ativo) */}
      {temFiltros && (
        <button
          onClick={handleLimpar}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          ✕ Limpar filtros
        </button>
      )}
    </div>
  )
}