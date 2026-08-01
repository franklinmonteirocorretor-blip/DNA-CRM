import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { listarCorretores } from './actions'
import FiltrosWrapper from '@/src/components/corretores/FiltrosWrapper'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CorretoresPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 dark:text-gray-500">Você precisa estar autenticado.</p>
      </div>
    )
  }

  const corretores = await listarCorretores()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Corretores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestão completa da equipe de corretores.
          </p>
        </div>
        <Link
          href="/dashboard/corretores/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          + Novo Corretor
        </Link>
      </div>

      {/* Filtros e Lista (Client Component wrapper para re-render com filtros) */}
      <FiltrosWrapper corretoresIniciais={corretores} />
    </div>
  )
}