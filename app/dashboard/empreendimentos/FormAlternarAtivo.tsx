'use client'

import { alternarAtivoEmpreendimento } from './actions'
import { useState } from 'react'

export default function FormAlternarAtivo({
  id,
  ativo,
}: {
  id: string
  ativo: boolean
}) {
  const [otimista, setOtimista] = useState(ativo)
  const [carregando, setCarregando] = useState(false)

  async function handleToggle() {
    setCarregando(true)
    const novoEstado = !otimista
    setOtimista(novoEstado) // atualização otimista

    const resultado = await alternarAtivoEmpreendimento(id, novoEstado)

    if ('erro' in resultado && resultado.erro) {
      setOtimista(!novoEstado) // rollback se falhar
    }

    setCarregando(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={carregando}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
        otimista
          ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
      }`}
    >
      {otimista ? 'Ativo' : 'Inativo'}
    </button>
  )
}