import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { operacaoDadosIniciais } from './actions'
import CentralOperacao from '@/src/components/operacao/CentralOperacao'

export const dynamic = 'force-dynamic'

export default async function OperacaoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Você precisa estar autenticado.</p>
      </div>
    )
  }

  const dados = await operacaoDadosIniciais()

  return <CentralOperacao dadosIniciais={dados} />
}