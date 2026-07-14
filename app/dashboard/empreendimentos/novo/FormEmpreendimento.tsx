'use client'

import { useState } from 'react'
import { Empreendimento } from '@/src/types'
import { criarEmpreendimento, editarEmpreendimento } from '../actions'
import Link from 'next/link'

export default function FormEmpreendimento({
  empreendimento,
}: {
  empreendimento: Empreendimento | null
}) {
  const isEdicao = Boolean(empreendimento)
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState<string[]>([])

  async function handleSubmit(formData: FormData) {
    setEnviando(true)
    setErros([])

    const resultado = isEdicao
      ? await editarEmpreendimento(empreendimento!.id, formData)
      : await criarEmpreendimento(formData)

    if (resultado?.erros) {
      setErros(resultado.erros)
      setEnviando(false)
    }
    // Se deu certo, a action faz redirect — não precisa fazer nada aqui
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      {/* Erros */}
      {erros.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Corrija {erros.length === 1 ? 'o erro abaixo' : 'os erros abaixo'}:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
            {erros.map((erro, i) => (
              <li key={i}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
              Nome *
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              maxLength={200}
              defaultValue={empreendimento?.nome ?? ''}
              placeholder="Ex: Villa Europa, Green Park..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Endereço */}
          <div>
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
              Endereço <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              id="endereco"
              name="endereco"
              type="text"
              maxLength={300}
              defaultValue={empreendimento?.endereco ?? ''}
              placeholder="Ex: Av. Principal, 123 - Centro"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Vagas */}
          <div>
            <label htmlFor="vagas" className="block text-sm font-medium text-gray-700">
              Número de vagas
            </label>
            <input
              id="vagas"
              name="vagas"
              type="number"
              min={0}
              max={9999}
              defaultValue={empreendimento?.vagas ?? 0}
              className="mt-1 block w-full max-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status (só na edição) */}
          {isEdicao && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-2 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="ativo"
                    value="true"
                    defaultChecked={empreendimento!.ativo}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="ativo"
                    value="false"
                    defaultChecked={!empreendimento!.ativo}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  Inativo
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href="/dashboard/empreendimentos"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {enviando ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Cadastrar Empreendimento'}
          </button>
        </div>
      </form>
    </div>
  )
}