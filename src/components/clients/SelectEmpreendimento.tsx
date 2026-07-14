'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { Empreendimento } from '@/src/types'

interface SelectEmpreendimentoProps {
  name: string
  id?: string
  valorSelecionado?: string | null
  className?: string
  required?: boolean
}

export default function SelectEmpreendimento({
  name,
  id = 'empreendimento_id',
  valorSelecionado,
  className = 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
  required = false,
}: SelectEmpreendimentoProps) {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase
      .from('empreendimentos')
      .select('id, nome')
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome', { ascending: true })
      .then(({ data }) => {
        setEmpreendimentos((data as Empreendimento[]) ?? [])
        setCarregando(false)
      })
  }, [])

  return (
    <select
      id={id}
      name={name}
      defaultValue={valorSelecionado ?? ''}
      required={required}
      className={className}
      disabled={carregando}
    >
      <option value="">{carregando ? 'Carregando...' : 'Selecionar empreendimento...'}</option>
      {empreendimentos.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {emp.nome}
        </option>
      ))}
    </select>
  )
}