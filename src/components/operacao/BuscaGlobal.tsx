'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'

type ResultadoItem = {
  id: string
  nome: string
  subtitulo: string
  tipo: 'cliente' | 'corretor'
}

export default function BuscaGlobal() {
  const router = useRouter()
  const [termo, setTermo] = useState('')
  const [resultado, setResultado] = useState<ResultadoItem[]>([])
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clientes = resultado.filter((r) => r.tipo === 'cliente')
  const corretores = resultado.filter((r) => r.tipo === 'corretor')

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResultado([])
      setAberto(false)
      return
    }

    setCarregando(true)
    setAberto(true)

    const padrao = `%${q}%`
    const [resClientes, resUsuarios] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nome, etapa_atual')
        .or(`nome.ilike.${padrao},email.ilike.${padrao}`)
        .limit(5),
      supabase
        .from('usuarios')
        .select('id, nome, perfil, cargo')
        .ilike('nome', padrao)
        .limit(3),
    ])

    const items: ResultadoItem[] = []

    if (resClientes.data) {
      resClientes.data.forEach((c: { id: string; nome: string; etapa_atual: string | null }) => {
        items.push({
          id: c.id,
          nome: c.nome,
          subtitulo: c.etapa_atual ?? 'Sem etapa',
          tipo: 'cliente',
        })
      })
    }

    if (resUsuarios.data) {
      resUsuarios.data.forEach((u: { id: string; nome: string; perfil: string | null; cargo: string | null }) => {
        items.push({
          id: u.id,
          nome: u.nome,
          subtitulo: u.cargo ?? u.perfil ?? 'Corretor',
          tipo: 'corretor',
        })
      })
    }

    setResultado(items)
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => buscar(termo), 300)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [termo, buscar])

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleClick = (item: ResultadoItem) => {
    setAberto(false)
    if (item.tipo === 'cliente') {
      router.push(`/dashboard/clientes/${item.id}`)
    } else {
      router.push(`/dashboard/corretores/${item.id}`)
    }
  }

  return (
    <div ref={containerRef} className="relative w-64">
      <input
        type="text"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => {
          if (resultado.length > 0) setAberto(true)
        }}
        placeholder="Buscar clientes, corretores..."
        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
      />

      {aberto && (carregando || resultado.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
          {carregando ? (
            <div className="px-3 py-2 text-[11px] text-gray-400">Buscando...</div>
          ) : (
            <>
              {clientes.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-100">
                    Clientes
                  </div>
                  {clientes.map((c) => (
                    <button
                      key={`cliente-${c.id}`}
                      onClick={() => handleClick(c)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{c.nome}</p>
                        <p className="text-[10px] text-gray-400">{c.subtitulo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {corretores.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-100">
                    Corretores
                  </div>
                  {corretores.map((c) => (
                    <button
                      key={`corretor-${c.id}`}
                      onClick={() => handleClick(c)}
                      className="block w-full items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-50"
                    >
                      <p className="text-xs font-medium text-gray-900 truncate">{c.nome}</p>
                      <p className="text-[10px] text-gray-400">{c.subtitulo}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}