import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { pipelineKPIs, pipelineAlertas } from './actions'
import { LazyPipelineBoard } from '@/src/components/lazy'
import PipelineKPIsSection from '@/src/components/pipeline/PipelineKPIsSection'
import PipelineAlertas from '@/src/components/pipeline/PipelineAlertas'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 dark:text-gray-500">Você precisa estar autenticado.</p>
      </div>
    )
  }

  // Busca KPIs e Alertas em paralelo
  const [kpis, alertas] = await Promise.all([
    pipelineKPIs(),
    pipelineAlertas(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipeline Inteligente</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Arraste clientes entre etapas. O sistema atualiza automaticamente.
          </p>
        </div>
        <Link
          href="/dashboard/clientes/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          + Novo Lead
        </Link>
      </div>

      {/* KPIs */}
      <PipelineKPIsSection kpis={kpis} />

      {/* Board com Drag & Drop */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Kanban de Clientes</h2>
        <LazyPipelineBoard />
      </section>

      {/* Alertas */}
      <PipelineAlertas alertas={alertas} />
    </div>
  )
}