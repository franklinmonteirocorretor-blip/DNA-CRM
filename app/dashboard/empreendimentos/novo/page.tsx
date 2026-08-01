import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Empreendimento } from '@/src/types'
import Link from 'next/link'
import FormEmpreendimento from './FormEmpreendimento'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function NovoEmpreendimentoPage({ searchParams }: Props) {
  const params = await searchParams
  const idEdicao = params.id

  let empreendimento: Empreendimento | null = null

  if (idEdicao) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('empreendimentos')
      .select('*')
      .eq('id', idEdicao)
      .single<Empreendimento>()

    empreendimento = data
  }

  const isEdicao = Boolean(empreendimento)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEdicao ? 'Editar Empreendimento' : 'Novo Empreendimento'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEdicao
              ? 'Altere os dados do empreendimento abaixo.'
              : 'Preencha os dados para cadastrar um novo empreendimento.'
            }
          </p>
        </div>
        <Link
          href="/dashboard/empreendimentos"
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          ← Voltar
        </Link>
      </div>

      <FormEmpreendimento empreendimento={empreendimento} />
    </div>
  )
}