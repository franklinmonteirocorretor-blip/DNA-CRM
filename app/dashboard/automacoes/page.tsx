// DNA CRM — Sprint 13: Dashboard de Automacoes
// Server Component que busca dados e renderiza via client wrapper interativo.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { throwOnError } from '@/src/lib/server/safeQuery'
import AutomacoesClient from '@/src/components/automacoes/AutomacoesClient'
import type { AutomationRecord, AutomationLog, AutomationQueueItem } from '@/src/lib/automation/types'

interface QueueItem {
  id: string
  evento: string
  prioridade: number
  tentativas: number
  max_tentativas: number
  status: string
  criado_em: string
  contexto: Record<string, unknown> | null
}

export const dynamic = 'force-dynamic'

export default async function AutomacoesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 dark:text-gray-500">Voce precisa estar autenticado.</p>
      </div>
    )
  }

  const [automacoes, logsRecentes, fila, metricas] = await Promise.all([
    buscarAutomacoes(supabase),
    buscarLogs(supabase),
    buscarFila(supabase),
    buscarMetricas(supabase),
  ])

  return (
    <AutomacoesClient
      automacoes={automacoes}
      logsRecentes={logsRecentes}
      fila={fila as QueueItem[]}
      metricas={metricas}
    />
  )
}

// ─── Queries ───────────────────────────────────────────────────

async function buscarAutomacoes(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<AutomationRecord[]> {
  return await throwOnError(
    supabase.from('automacoes').select('*').is('deleted_at', null).order('criado_em', { ascending: false })
  ) as AutomationRecord[]
}

async function buscarLogs(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<AutomationLog[]> {
  return await throwOnError(
    supabase.from('automacoes_log').select('*').order('criado_em', { ascending: false }).limit(50)
  ) as AutomationLog[]
}

async function buscarFila(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<AutomationQueueItem[]> {
  return await throwOnError(
    supabase.from('automacoes_fila').select('*').order('prioridade', { ascending: false }).limit(50)
  ) as AutomationQueueItem[]
}

async function buscarMetricas(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { count: total, error: errTotal } = await supabase.from('automacoes').select('*', { count: 'exact', head: true }).is('deleted_at', null)
  if (errTotal) throw new Error(errTotal.message)
  const { count: ativas, error: errAtivas } = await supabase.from('automacoes').select('*', { count: 'exact', head: true }).eq('status', 'ATIVA').is('deleted_at', null)
  if (errAtivas) throw new Error(errAtivas.message)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { count: execucoesHoje, error: errExec } = await supabase.from('automacoes_log').select('*', { count: 'exact', head: true }).gte('criado_em', hoje.toISOString())
  if (errExec) throw new Error(errExec.message)
  const { count: falhas, error: errFalhas } = await supabase.from('automacoes_log').select('*', { count: 'exact', head: true }).eq('status', 'FALHA').gte('criado_em', hoje.toISOString())
  if (errFalhas) throw new Error(errFalhas.message)
  const { count: filaPendente, error: errFila } = await supabase.from('automacoes_fila').select('*', { count: 'exact', head: true }).eq('status', 'PENDENTE')
  if (errFila) throw new Error(errFila.message)

  return {
    ativas: ativas ?? 0,
    total: total ?? 0,
    execucoesHoje: execucoesHoje ?? 0,
    falhas: falhas ?? 0,
    filaPendente: filaPendente ?? 0,
  }
}