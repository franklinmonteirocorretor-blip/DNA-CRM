'use client'

import { useState } from 'react'
import { CorretorGestao, CorretoresFiltros } from '@/src/types'
import { listarCorretores } from '@/app/dashboard/corretores/actions'
import FiltrosCorretores from './FiltrosCorretores'
import ListaCorretores from './ListaCorretores'

export default function FiltrosWrapper({ corretoresIniciais }: { corretoresIniciais: CorretorGestao[] }) {
  const [corretores, setCorretores] = useState<CorretorGestao[]>(corretoresIniciais)
  const [filtros, setFiltros] = useState<CorretoresFiltros>({
    busca: null,
    status: null,
    equipeId: null,
    supervisorId: null,
    ordenacao: 'nome',
  })
  const [carregando, setCarregando] = useState(false)

  async function onFiltrar(f: CorretoresFiltros) {
    setFiltros(f)
    setCarregando(true)
    const resultado = await listarCorretores(f)
    if (Array.isArray(resultado)) {
      setCorretores(resultado)
    }
    setCarregando(false)
  }

  return (
    <div className="space-y-4">
      <FiltrosCorretores filtros={filtros} onFiltrar={onFiltrar} />
      {carregando ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-400 animate-pulse">Carregando...</p>
        </div>
      ) : (
        <ListaCorretores corretores={corretores} />
      )}
    </div>
  )
}