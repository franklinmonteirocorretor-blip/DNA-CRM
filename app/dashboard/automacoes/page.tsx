// DNA CRM — Sprint 13
// Pagina: /dashboard/automacoes — Painel de gerenciamento do motor de automacoes

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import KpiCard from '@/src/components/ui/KpiCard'
import type { AutomationRecord, AutomationLog, AutomationQueueItem } from '@/src/lib/automation/types'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseAutomationClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Motor de Automacoes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Regras SE-ENTAO que automatizam processos comerciais
        </p>

        <div className="grid grid-cols-1 gap-4 mt-4 xs:grid-cols-2 md:grid-cols-4">
<KpiCard label="Automacoes ativas" value={metricas.ativas} />
          <KpiCard label="Execucoes hoje" value={metricas.execucoesHoje} />
          <KpiCard label="Falhas" value={metricas.falhas} />
          <KpiCard label="Fila pendente" value={metricas.filaPendente} />
        </div>
      </div>

      {/* Tabela de automacoes */}
      <Section title="Automacoes Cadastradas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Evento</th>
                <th className="py-2 pr-4">Condicoes</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Execucoes</th>
                <th className="py-2">Ultima</th>
              </tr>
            </thead>
            <tbody>
              {automacoes.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Nenhuma automacao cadastrada</td></tr>
              ) : (
                automacoes.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{a.nome}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{a.evento}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{(a.condicoes?.length ?? 0)} condicao</td>
                    <td className="py-2 pr-4">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="py-2 pr-4 text-xs">{a.qtd_executada}x</td>
                    <td className="py-2 text-xs text-gray-500 whitespace-nowrap">{a.ultima_execucao ? new Date(a.ultima_execucao).toLocaleString('pt-BR') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Tabs manuais com estado via HTML + classe */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <span className="px-3 py-1 text-sm font-medium border-b-2 border-blue-600 text-blue-600">Ultimas Execucoes</span>
          <span className="px-3 py-1 text-sm text-gray-400">Fila ({fila.length})</span>
        </div>

        <Section title="Ultimas Execucoes">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="py-2 pr-4">Automacao</th>
                  <th className="py-2 pr-4">Evento</th>
                  <th className="py-2 pr-4">Condicoes?</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Duracao</th>
                  <th className="py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {logsRecentes.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Nenhuma execucao recente</td></tr>
                ) : (
                  logsRecentes.map(l => (
                    <tr key={l.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium text-xs">{l.automacao_id ? l.automacao_id.slice(0, 8) : '-'}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{l.evento_disparador}</td>
                      <td className="py-2 pr-4 text-xs">{l.condicoes_atendidas ? 'OK' : 'N/A'}</td>
                      <td className="py-2 pr-4"><StatusPill status={l.status} /></td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{l.duracao_ms ? `${l.duracao_ms}ms` : '-'}</td>
                      <td className="py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(l.criado_em).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Fila">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="py-2 pr-4">Evento</th>
                  <th className="py-2 pr-4">Entidade</th>
                  <th className="py-2 pr-4">Prioridade</th>
                  <th className="py-2 pr-4">Tentativas</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {fila.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Fila vazia</td></tr>
                ) : (
                  fila.map(i => (
                    <tr key={i.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium text-xs">{i.evento}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{String((i.contexto as Record<string, unknown>)?.entidade ?? '-')}</td>
                      <td className="py-2 pr-4 text-xs">{i.prioridade}</td>
                      <td className="py-2 pr-4 text-xs">{i.tentativas}/{i.max_tentativas}</td>
                      <td className="py-2 pr-4"><StatusPill status={i.status} /></td>
                      <td className="py-2 text-xs text-gray-500">{new Date(i.criado_em).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  )
}

// ─── Componentes Internos ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ATIVA: 'bg-green-100 text-green-700',
    INATIVA: 'bg-gray-100 text-gray-500',
    ERRO: 'bg-red-100 text-red-700',
    SUCESSO: 'bg-green-100 text-green-700',
    CONCLUIDO: 'bg-green-100 text-green-700',
    PROCESSANDO: 'bg-blue-100 text-blue-700',
    PENDENTE: 'bg-yellow-100 text-yellow-700',
    FALHA: 'bg-red-100 text-red-700',
    FALHA_PARCIAL: 'bg-orange-100 text-orange-700',
  }
  const color = colors[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}

// ──────────────────────── Queries ─────────────────────────────────────────────

interface MetricasDashboard {
  ativas: number; total: number; execucoesHoje: number; falhas: number; filaPendente: number;
}

async function buscarAutomacoes(supabase: SupabaseAutomationClient): Promise<AutomationRecord[]> {
  const { data } = await supabase.from('automacoes').select('*').is('deleted_at', null).order('criado_em', { ascending: false })
  return (data ?? []) as AutomationRecord[]
}

async function buscarLogs(supabase: SupabaseAutomationClient): Promise<AutomationLog[]> {
  const { data } = await supabase.from('automacoes_log').select('*').order('criado_em', { ascending: false }).limit(50)
  return (data ?? []) as AutomationLog[]
}

async function buscarFila(supabase: SupabaseAutomationClient): Promise<AutomationQueueItem[]> {
  const { data } = await supabase.from('automacoes_fila').select('*').order('prioridade', { ascending: false }).limit(50)
  return (data ?? []) as AutomationQueueItem[]
}

async function buscarMetricas(supabase: SupabaseAutomationClient): Promise<MetricasDashboard> {
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