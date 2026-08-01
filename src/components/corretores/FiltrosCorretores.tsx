'use client'

import { useState, useEffect } from 'react'
import { listarEquipes, listarSupervisores } from '@/app/dashboard/corretores/actions'
import { CorretoresFiltros, StatusUsuario } from '@/src/types'

export default function FiltrosCorretores({
  filtros,
  onFiltrar,
}: {
  filtros: CorretoresFiltros
  onFiltrar: (f: CorretoresFiltros) => void
}) {
  const [equipes, setEquipes] = useState<{ id: string; nome: string }[]>([])
  const [supervisores, setSupervisores] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    listarEquipes().then((d) => {
      if (Array.isArray(d)) setEquipes(d.map((e: { id: string; nome: string }) => ({ id: e.id, nome: e.nome })))
    })
    listarSupervisores().then((d) => {
      if (Array.isArray(d)) setSupervisores(d)
    })
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar nome ou e-mail..."
        value={filtros.busca ?? ''}
        onChange={(e) => onFiltrar({ ...filtros, busca: e.target.value || null })}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:border-blue-500 focus:outline-none w-56"
      />

      {/* Status */}
      <select
        value={filtros.status ?? 'TODOS'}
        onChange={(e) =>
          onFiltrar({ ...filtros, status: (e.target.value === 'TODOS' ? null : e.target.value as StatusUsuario | 'TODOS') })
        }
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
      >
        <option value="TODOS">Todos os status</option>
        <option value="ATIVO">Ativos</option>
        <option value="FERIAS">Férias</option>
        <option value="AFASTADO">Afastados</option>
        <option value="DESLIGADO">Desligados</option>
      </select>

      {/* Equipe */}
      <select
        value={filtros.equipeId ?? ''}
        onChange={(e) => onFiltrar({ ...filtros, equipeId: e.target.value || null })}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
      >
        <option value="">Todas as equipes</option>
        {equipes.map((eq) => (
          <option key={eq.id} value={eq.id}>
            {eq.nome}
          </option>
        ))}
      </select>

      {/* Supervisor */}
      <select
        value={filtros.supervisorId ?? ''}
        onChange={(e) => onFiltrar({ ...filtros, supervisorId: e.target.value || null })}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
      >
        <option value="">Todos os supervisores</option>
        {supervisores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome}
          </option>
        ))}
      </select>

      {/* Ordenação */}
      <select
        value={filtros.ordenacao}
        onChange={(e) => onFiltrar({ ...filtros, ordenacao: e.target.value as CorretoresFiltros['ordenacao'] })}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
      >
        <option value="nome">Nome</option>
        <option value="admissao">Data de admissão</option>
        <option value="producao">Produção</option>
        <option value="vendas">Vendas</option>
      </select>
    </div>
  )
}