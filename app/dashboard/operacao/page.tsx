import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { operacaoDadosIniciais } from './actions'
import { LazyCentralOperacao } from '@/src/components/lazy'

export const dynamic = 'force-dynamic'

export default async function OperacaoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 dark:text-gray-500">Você precisa estar autenticado.</p>
      </div>
    )
  }

  const dados = await operacaoDadosIniciais()

  return <LazyCentralOperacao dadosIniciais={dados} />
}