import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { throwOnError } from '@/src/lib/server/safeQuery'
import { ProducaoDiaria, Cliente, Agendamento, Documento } from '@/src/types'
import Link from 'next/link'
import KpiCard from '@/src/components/ui/KpiCard'
import SecaoAlertas from '@/src/components/dashboard/SecaoAlertas'
import CardAgendaHoje from '@/src/components/dashboard/CardAgendaHoje'
import CardEquipeDashboard from '@/src/components/dashboard/CardEquipeDashboard'
import { Users2, Plus, Funnel } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

// Busca a produção diária do corretor logado (últimos 7 dias)
  const hoje = new Date().toISOString().slice(0, 10)
  const seteDiasAtras = new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)
  const cincoDiasAtras = new Date(new Date().getTime() - 5 * 86400000).toISOString()
  const tresDiasFuturo = new Date(new Date().getTime() + 3 * 86400000).toISOString()

  // Datas para agendamentos
  const amanhaInicio = new Date()
  amanhaInicio.setDate(amanhaInicio.getDate() + 1)
  amanhaInicio.setHours(0, 0, 0, 0)
  const amanhaFim = new Date(amanhaInicio)
  amanhaFim.setHours(23, 59, 59, 999)
  const hojeInicio = new Date()
  hojeInicio.setHours(0, 0, 0, 0)
  const hojeFim = new Date()
  hojeFim.setHours(23, 59, 59, 999)

const etapasParado = ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO']

  // ── Promise.all: paraleliza todas as queries independentes ──────────
  const [
    producao, clientesParados, agendamentosProximos, docsPendentes, posVendaAlertas,
    resumoAgenda, resumoEquipe,
  ] = await Promise.all([
      // Q1: produção 7 dias
      throwOnError(
        supabase
          .from('producao_diaria')
          .select('*')
          .eq('usuario_id', user!.id)
          .gte('data', seteDiasAtras)
          .lte('data', hoje)
          .order('data', { ascending: false })
          .returns<ProducaoDiaria[]>()
      ),
      // Q2: clientes sem contato há ≥ 5 dias
      throwOnError(
        supabase
          .from('clientes')
          .select('id, nome, etapa_atual, ultima_atividade_em')
          .in('etapa_atual', etapasParado)
          .lt('ultima_atividade_em', cincoDiasAtras)
          .order('ultima_atividade_em', { ascending: true })
          .limit(5)
          .returns<Pick<Cliente, 'id' | 'nome' | 'etapa_atual' | 'ultima_atividade_em'>[]>()
      ),
      // Q3: agendamentos hoje + amanhã
      throwOnError(
        supabase
          .from('agendamentos')
          .select('id, cliente_id, data_hora, empreendimento_interesse, clientes!inner(nome)')
          .or(
            `data_hora.gte.${hojeInicio.toISOString()},data_hora.lte.${hojeFim.toISOString()},data_hora.gte.${amanhaInicio.toISOString()},data_hora.lte.${amanhaFim.toISOString()}`
          )
          .order('data_hora', { ascending: true })
          .limit(10)
          .returns<
            (Pick<Agendamento, 'id' | 'cliente_id' | 'data_hora' | 'empreendimento_interesse'> & {
              clientes: { nome: string }
            })[]
          >()
      ),
      // Q4: documentos pendentes
      throwOnError(
        supabase
          .from('documentos')
          .select('id, cliente_id, tipo, status_validacao')
          .eq('status_validacao', 'PENDENTE')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5)
          .returns<Pick<Documento, 'id' | 'cliente_id' | 'tipo' | 'status_validacao'>[]>(),
      ),
      // Q5: pos-venda com prazo
      throwOnError(
        supabase
          .from('clientes')
          .select('id, nome, proxima_acao, proxima_acao_em')
          .eq('etapa_atual', 'POS_VENDA')
          .not('proxima_acao_em', 'is', null)
          .lte('proxima_acao_em', tresDiasFuturo)
          .order('proxima_acao_em', { ascending: true })
          .limit(5)
          .returns<
            Pick<Cliente, 'id' | 'nome' | 'proxima_acao' | 'proxima_acao_em'>[]
          >(),
      ),
      // Q6: resumo agenda hoje (cf. resumoAgendaHoje)
      (async () => {
        const hojeInicio2 = new Date(); hojeInicio2.setHours(0, 0, 0, 0)
        const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999)
        const agora = new Date().toISOString()
        const res = await Promise.all([
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_hora', hojeInicio2.toISOString()).lte('data_hora', hojeFim.toISOString()).eq('corretor_id', user!.id),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_hora', hojeInicio2.toISOString()).lte('data_hora', hojeFim.toISOString()).eq('corretor_id', user!.id).eq('status', 'CONFIRMADO'),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_hora', hojeInicio2.toISOString()).lte('data_hora', hojeFim.toISOString()).eq('corretor_id', user!.id).eq('status', 'AGENDADO'),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_hora', hojeInicio2.toISOString()).lte('data_hora', hojeFim.toISOString()).eq('corretor_id', user!.id).eq('status', 'REMARCADO'),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('corretor_id', user!.id).lt('data_hora', agora).in('status', ['AGENDADO', 'REMARCADO']),
        ])
        return {
          total: res[0].count ?? 0,
          confirmados: res[1].count ?? 0,
          pendentes: res[2].count ?? 0,
          reagendados: res[3].count ?? 0,
          atrasados: res[4].count ?? 0,
        }
      })(),
      // Q7: resumo equipe (cf. resumoEquipeEquipeDashboard)
      (async () => {
        const hojeStr = new Date().toISOString().slice(0, 10)
        const [ativos, prod] = await Promise.all([
          supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('status_usuario', 'ATIVO').is('deleted_at', null),
          supabase.from('producao_diaria').select('usuario_id, ligacoes, whatsapp, agendamentos, comparecimentos').eq('data', hojeStr),
        ])
        const usuariosAtivos = [...new Set((prod.data ?? []).map((p) => p.usuario_id))]
        const producaoDia = (prod.data ?? []).reduce((acc, p) => {
          acc.ligacoes += p.ligacoes ?? 0
          acc.whatsapps += p.whatsapp ?? 0
          acc.agendamentos += p.agendamentos ?? 0
          acc.comparecimentos += p.comparecimentos ?? 0
          return acc
        }, { ligacoes: 0, whatsapps: 0, agendamentos: 0, comparecimentos: 0 })
        return {
          corretoresAtivos: ativos.count ?? 0,
          corretoresOnline: usuariosAtivos.length,
          producaoDia,
        }
      })(),
    ])

  const hojeStats = producao?.find((p) => p.data === hoje)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Bem-vindo ao DNA CRM. Aqui está seu resumo de hoje.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Ligações" value={hojeStats?.ligacoes ?? 0} color="blue" size="md" padding="compact" />
        <KpiCard label="WhatsApp" value={hojeStats?.whatsapp ?? 0} color="green" size="md" padding="compact" />
        <KpiCard label="Agendamentos" value={hojeStats?.agendamentos ?? 0} color="purple" size="md" padding="compact" />
        <KpiCard label="Comparecimentos" value={hojeStats?.comparecimentos ?? 0} color="orange" size="md" padding="compact" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/clientes/novo"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-all duration-150"
        >
          <Plus className="h-3.5 w-3.5" /> Novo Lead
        </Link>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
        >
          <Users2 className="h-3.5 w-3.5" /> Clientes
        </Link>
        <Link
          href="/dashboard/funil"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
        >
          <Funnel className="h-3.5 w-3.5" /> Pipeline
        </Link>
        <CardAgendaHoje resumo={resumoAgenda} />
        <CardEquipeDashboard dados={resumoEquipe} />
      </div>

      {/* Alertas e Lembretes */}
      <SecaoAlertas
        clientesParados={clientesParados ?? []}
        agendamentosProximos={agendamentosProximos ?? []}
        docsPendentes={docsPendentes ?? []}
        posVendaAlertas={posVendaAlertas ?? []}
      />

      {/* Produção da semana */}
      <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Últimos 7 dias</h2>
        {producao && producao.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {producao.map((dia) => (
              <div
                key={dia.data}
                className="rounded-md bg-gray-50 dark:bg-gray-800 p-2 text-center transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1">
                  {new Date(dia.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                </p>
                <div className="space-y-0.5">
                  {[
                    { v: dia.ligacoes, l: 'L' },
                    { v: dia.whatsapp, l: 'W' },
                    { v: dia.agendamentos, l: 'A' },
                  ].map(({ v, l }) => (
                    <div key={l} className="flex justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{l}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1.5">{dia.pontuacao_gamificacao}pts</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Nenhuma atividade registrada nos últimos 7 dias.
          </p>
        )}
      </div>
    </div>
  )
}

