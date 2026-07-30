// DNA CRM — Sprint 13: Dashboard de Automacoes
// Server Component que busca dados e renderiza via client wrapper interativo.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import AutomacoesClient from '@/src/components/automacoes/AutomacoesClient'
import type { AutomationRecord, AutomationLog, AutomationQueueItem } from '@/src/lib/automation/types'

export const dynamic = 'force-dynamic'

export default async function AutomacoesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Voce precisa estar autenticado.</p>
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
      fila={fila as any}
      metricas={metricas}
    />
  )
}

// ─── Queries ───────────────────────────────────────────────────

async function buscarAutomacoes(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<AutomationRecord[]> {
  const { data } = await supabase.from('automacoes').select('*').is('deleted_at', null).order('criado_em', { ascending: false })
  return (data ?? []) as AutomationRecord[]
}

async function buscarLogs(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<AutomationLog[]> {
  const { data } = await supabase.from('automacoes_log').select('*').order('criado_em', { ascending: false }).limit(50)
  return (data ?? []) as AutomationLog[]
}

async function buscarFila(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<AutomationQueueItem[]> {
  const { data } = await supabase.from('automacoes_fila').select('*').order('prioridade', { ascending: false }).limit(50)
  return (data ?? []) as AutomationQueueItem[]
}

async function buscarMetricas(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { count: total } = await supabase.from('automacoes').select('*', { count: 'exact', head: true }).is('deleted_at', null)
  const { count: ativas } = await supabase.from('automacoes').select('*', { count: 'exact', head: true }).eq('status', 'ATIVA').is('deleted_at', null)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { count: execucoesHoje } = await supabase.from('automacoes_log').select('*', { count: 'exact', head: true }).gte('criado_em', hoje.toISOString())
  const { count: falhas } = await supabase.from('automacoes_log').select('*', { count: 'exact', head: true }).eq('status', 'FALHA').gte('criado_em', hoje.toISOString())
  const { count: filaPendente } = await supabase.from('automacoes_fila').select('*', { count: 'exact', head: true }).eq('status', 'PENDENTE')

  return {
    ativas: ativas ?? 0,
    total: total ?? 0,
    execucoesHoje: execucoesHoje ?? 0,
    falhas: falhas ?? 0,
    filaPendente: filaPendente ?? 0,
  }
}