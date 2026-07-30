import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { ProducaoDiaria, Cliente, Agendamento, Documento } from '@/src/types'
import Link from 'next/link'
import KpiCard from '@/src/components/ui/KpiCard'
import SecaoAlertas from '@/src/components/dashboard/SecaoAlertas'
import CardAgendaHoje from '@/src/components/dashboard/CardAgendaHoje'
import CardEquipeDashboard from '@/src/components/dashboard/CardEquipeDashboard'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Busca a produção diária do corretor logado (últimos 7 dias)
  const hoje = new Date().toISOString().slice(0, 10)
  const seteDiasAtras = new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)

  const { data: producao } = await supabase
    .from('producao_diaria')
    .select('*')
    .eq('usuario_id', user!.id)
    .gte('data', seteDiasAtras)
    .lte('data', hoje)
    .order('data', { ascending: false })
    .returns<ProducaoDiaria[]>()

  const hojeStats = producao?.find((p) => p.data === hoje)

  // Total de clientes ativos
  const { count } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })

  // ---- Alertas ----

  // 1. Clientes sem contato há ≥ 5 dias (etapas ativas)
  const cincoDiasAtras = new Date(new Date().getTime() - 5 * 86400000).toISOString()
  const etapasParado = ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO']
  const { data: clientesParados } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual, ultima_atividade_em')
    .in('etapa_atual', etapasParado)
    .lt('ultima_atividade_em', cincoDiasAtras)
    .order('ultima_atividade_em', { ascending: true })
    .limit(5)
    .returns<Pick<Cliente, 'id' | 'nome' | 'etapa_atual' | 'ultima_atividade_em'>[]>()

  // 2. Agendamentos para hoje e amanhã
  const amanhaInicio = new Date()
  amanhaInicio.setDate(amanhaInicio.getDate() + 1)
  amanhaInicio.setHours(0, 0, 0, 0)
  const amanhaFim = new Date(amanhaInicio)
  amanhaFim.setHours(23, 59, 59, 999)

  const hojeInicio = new Date()
  hojeInicio.setHours(0, 0, 0, 0)
  const hojeFim = new Date()
  hojeFim.setHours(23, 59, 59, 999)

  const { data: agendamentosProximos } = await supabase
    .from('agendamentos')
    .select('id, cliente_id, data_hora, empreendimento_interesse, clientes!inner(nome)')
    .or(
      `data_hora.gte.${hojeInicio.toISOString()},data_hora.lte.${hojeFim.toISOString()},data_hora.gte.${amanhaInicio.toISOString()},data_hora.lte.${amanhaFim.toISOString()}`
    )
    .order('data_hora', { ascending: true })
    .limit(10)
    .returns<(Pick<Agendamento, 'id' | 'cliente_id' | 'data_hora' | 'empreendimento_interesse'> & { clientes: { nome: string } })[]>()

  // 3. Documentos pendentes de validação
  const { data: docsPendentes } = await supabase
    .from('documentos')
    .select('id, cliente_id, tipo, status_validacao')
    .eq('status_validacao', 'PENDENTE')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<Pick<Documento, 'id' | 'cliente_id' | 'tipo' | 'status_validacao'>[]>()

  // Busca os nomes dos clientes dos documentos pendentes
  const idsDocsPendentes = [...new Set((docsPendentes ?? []).map((d) => d.cliente_id))]
  const { data: clientesDocs } = idsDocsPendentes.length > 0
    ? await supabase.from('clientes').select('id, nome').in('id', idsDocsPendentes).returns<Pick<Cliente, 'id' | 'nome'>[]>()
    : { data: [] }

  const mapaNomesDocs = (clientesDocs ?? []).reduce(
    (acc, c) => { acc[c.id] = c.nome; return acc },
    {} as Record<string, string>
  )

  // 4. Pós-venda com prazo vencido ou próximo (até 3 dias)
  const tresDiasFuturo = new Date(new Date().getTime() + 3 * 86400000).toISOString()
  const { data: posVendaAlertas } = await supabase
    .from('clientes')
    .select('id, nome, proxima_acao, proxima_acao_em')
    .eq('etapa_atual', 'POS_VENDA')
    .not('proxima_acao_em', 'is', null)
    .lte('proxima_acao_em', tresDiasFuturo)
    .order('proxima_acao_em', { ascending: true })
    .limit(5)
    .returns<Pick<Cliente, 'id' | 'nome' | 'proxima_acao' | 'proxima_acao_em'>[]>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bem-vindo ao DNA CRM. Aqui está seu resumo de hoje.
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-4">
        <KpiCard label="Ligações" value={hojeStats?.ligacoes ?? 0} color="blue" size="lg" padding="normal" />
        <KpiCard label="WhatsApp" value={hojeStats?.whatsapp ?? 0} color="green" size="lg" padding="normal" />
        <KpiCard label="Agendamentos" value={hojeStats?.agendamentos ?? 0} color="purple" size="lg" padding="normal" />
        <KpiCard label="Comparecimentos" value={hojeStats?.comparecimentos ?? 0} color="orange" size="lg" padding="normal" />
      </div>

      {/* Acesso rápido */}
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-5">
        <Link
          href="/dashboard/clientes"
          className="rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm hover:bg-blue-100 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-blue-500">Clientes</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{count ?? 0}</p>
          <p className="mt-1 text-[11px] text-blue-400">Gerenciar leads →</p>
        </Link>
        <Link
          href="/dashboard/funil"
          className="rounded-lg border border-purple-100 bg-purple-50 p-4 shadow-sm hover:bg-purple-100 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-purple-500">Funil de Vendas</p>
          <p className="mt-1 text-2xl font-bold text-purple-700">{count ?? 0}</p>
          <p className="mt-1 text-[11px] text-purple-400">Visualizar funil →</p>
        </Link>
        <Link
          href="/dashboard/clientes/novo"
          className="rounded-lg border border-green-100 bg-green-50 p-4 shadow-sm hover:bg-green-100 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-green-500">Novo Lead</p>
          <p className="mt-3 text-sm font-semibold text-green-700">+ Cadastrar</p>
          <p className="mt-1 text-[11px] text-green-400">Adicionar cliente →</p>
        </Link>

        {/* Sprint 2: Card Agenda de Hoje */}
        <CardAgendaHoje />

        {/* Sprint 4: Card Equipe */}
        <CardEquipeDashboard />
      </div>

      {/* Alertas e Lembretes */}
      <SecaoAlertas
        clientesParados={clientesParados ?? []}
        agendamentosProximos={agendamentosProximos ?? []}
        docsPendentes={docsPendentes ?? []}
        posVendaAlertas={posVendaAlertas ?? []}
      />

      {/* Produção da semana */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Últimos 7 dias</h2>
        {producao && producao.length > 0 ? (
          <div className="mt-4 space-y-2">
            {producao.map((dia) => (
              <div
                key={dia.data}
                className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2 text-sm"
              >
                <span className="font-medium text-gray-700">
                  {new Date(dia.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
                <span className="text-gray-500 truncate hidden xs:inline">
                  {dia.ligacoes} ligações · {dia.whatsapp} WhatsApp · {dia.agendamentos} agend.
                </span>
                <span className="font-bold text-blue-600">
                  {dia.pontuacao_gamificacao} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-400">
            Nenhuma atividade registrada nos últimos 7 dias.
          </p>
        )}
      </div>
    </div>
  )
}

