'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cadastrarCliente } from './actions'
import Link from 'next/link'
import SelectEmpreendimento from '@/src/components/clients/SelectEmpreendimento'

// Máscaras para CPF e telefone enquanto o usuário digita
function mascaraCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

function mascaraTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

export default function NovoClientePage() {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState<string[]>([])

  // Campos controlados para aplicar máscara nos inputs
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')

  async function handleSubmit(formData: FormData) {
    setEnviando(true)
    setErros([])

    // Validação do lado do cliente antes de enviar (resposta rápida)
    const nome = formData.get('nome') as string
    const cpfRaw = (formData.get('cpf') as string).replace(/\D/g, '')
    const telefoneRaw = (formData.get('telefone') as string).replace(/\D/g, '')

    const clientErros: string[] = []

    if (!nome || nome.trim().length < 3) {
      clientErros.push('O campo Nome deve ter pelo menos 3 caracteres.')
    }

    if (cpfRaw.length !== 11) {
      clientErros.push('O CPF deve ter exatamente 11 dígitos.')
    }

    if (telefoneRaw.length < 10) {
      clientErros.push('O Telefone deve ter 10 ou 11 dígitos (incluindo DDD).')
    }

    if (clientErros.length > 0) {
      setErros(clientErros)
      setEnviando(false)
      return
    }

    // Se passou na validação, chama a Server Action
    const resultado = await cadastrarCliente(formData)

    if (resultado?.erros) {
      setErros(resultado.erros)
      setEnviando(false)
    }
    // Se deu certo, a própria Server Action faz o redirect — nada a fazer aqui
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Novo Cliente</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Preencha os dados abaixo para cadastrar um novo lead.
          </p>
        </div>
        <Link
          href="/dashboard/clientes"
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          ← Voltar
        </Link>
      </div>

      {/* Lista de erros */}
      {erros.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Corrija {erros.length === 1 ? 'o erro abaixo' : 'os erros abaixo'} antes de continuar:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
            {erros.map((erro, i) => (
              <li key={i}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Formulário */}
      <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
        <form
          action={handleSubmit}
          className="space-y-6"
        >
          {/* Seção 1: Dados obrigatórios */}
          <div className="border-b pb-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Dados do cliente{' '}
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(obrigatórios)</span>
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome *
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Nome completo do cliente"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* CPF */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CPF *
                </label>
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(mascaraCPF(e.target.value))}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefone *
                </label>
                <input
                  id="telefone"
                  name="telefone"
                  type="text"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                  maxLength={15}
                  placeholder="(86) 99999-0000"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-mail <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(opcional)</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="cliente@email.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Dados complementares */}
          <div className="border-b pb-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Informações financeiras{' '}
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(opcionais)</span>
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Renda */}
              <div>
                <label htmlFor="renda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Renda mensal
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400 dark:text-gray-500">
                    R$
                  </span>
                  <input
                    id="renda"
                    name="renda"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dependentes */}
              <div>
                <label htmlFor="dependentes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dependentes
                </label>
                <input
                  id="dependentes"
                  name="dependentes"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={0}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Empreendimento */}
              <div>
                <label htmlFor="empreendimento_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Empreendimento de interesse
                </label>
                <SelectEmpreendimento name="empreendimento_id" />
              </div>
            </div>
          </div>

          {/* Seção 3: Observações */}
          <div>
            <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(opcional)</span>
            </label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              maxLength={1000}
              placeholder="Anotações livres sobre o cliente..."
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Botão de envio */}
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Link
              href="/dashboard/clientes"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {enviando ? 'Salvando...' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}