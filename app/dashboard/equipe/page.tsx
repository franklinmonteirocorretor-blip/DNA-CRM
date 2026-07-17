import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { EtapaFunil, ProducaoDiaria, Usuario } from '@/src/types'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// ── Constantes de configuração do funil ──────────────────────────────────────

const ETAPA_CONFIG: Record<EtapaFunil, { label: string; cor: string; corBg: string }> = {
  NOVO_LEAD:       { label: 'Novo Lead',      cor: '#6b7280', corBg: '#f3f4f6' },
  CONTATOS:        { label: 'Contatos',        cor: '#eab308', corBg: '#fef9c3' },
  AGENDAMENTO:     { label: 'Agendamento',     cor: '#3b82f6', corBg: '#dbeafe' },
  COMPARECIMENTO:  { label: 'Comparecimento',  cor: '#8b5cf6', corBg: '#ede9fe' },
  ANALISE:         { label: 'Análise',         cor: '#f97316', corBg: '#ffedd5' },
  RESTRICOES:      { label: 'Restrições',      cor: '#ef4444', corBg: '#fee2e2' },
  CONDICIONADOS:   { label: 'Condicionados',   cor: '#ec4899', corBg: '#fce7f3' },
  APROVADOS:       { label: 'Aprovados',       cor: '#14b8a6', corBg: '#ccfbf1' },
  FECHAMENTOS:     { label: 'Fechamentos',     cor: '#22c55e', corBg: '#dcfce7' },
  POS_VENDA:       { label: 'Pós-Venda',       cor: '#6366f1', corBg: '#e0e7ff' },
}

const ORDEM_FUNIL: EtapaFunil[] = [
  'NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO',
  'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS',
  'FECHAMENTOS', 'POS_VENDA',
]

// ── Página ───────────────────────────────────────────────────────────────────

export default async function EquipePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Busca o perfil do usuário logado
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, perfil, gerente_id')
    .eq('id', user.id)
    .single<Usuario>()

  // Se não for GERENTE nem ADMIN, redireciona para o dashboard comum
  if (!usuario || (usuario.perfil !== 'GERENTE' && usuario.perfil !== 'ADMINISTRADOR')) {
    redirect('/dashboard')
  }

  // ── Busca os corretores da equipe ──────────────────────────────────────
  // ADMIN vê todos os corretores; GERENTE vê quem tem gerente_id = seu id
  let queryCorretores = supabase
    .from('usuarios')
    .select('id, nome, email, perfil, avatar_url')
    .eq('perfil', 'CORRETOR')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome', { ascending: true })

  if (usuario.perfil === 'GERENTE') {
    queryCorretores = queryCorretores.eq('gerente_id', usuario.id)
  }

  const { data: corretores } = await queryCorretores.returns<
    Pick<Usuario, 'id' | 'nome' | 'email' | 'perfil' | 'avatar_url'>[]
  >()

  const idsCorretores = (corretores ?? []).map((c) => c.id)

  // ── Se não tem corretores na equipe ────────────────────────────────────
  if (idsCorretores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha Equipe</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visão geral dos corretores sob sua gestão.
          </p>
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-500">
            Nenhum corretor na sua equipe ainda.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Corretores com você como gerente aparecerão aqui automaticamente.
          </p>
        </div>
      </div>
    )
  }

  // ── Produção de hoje (agregada) ────────────────────────────────────────
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: producaoHoje } = await supabase
    .from('producao_diaria')
    .select('*')
    .in('usuario_id', idsCorretores)
    .eq('data', hoje)
    .returns<ProducaoDiaria[]>()

  // Agrega métricas do dia de todos os corretores
  const totalHoje = (producaoHoje ?? []).reduce(
    (acc, p) => ({
      ligacoes: acc.ligacoes + p.ligacoes,
      whatsapp: acc.whatsapp + p.whatsapp,
      agendamentos: acc.agendamentos + p.agendamentos,
      comparecimentos: acc.comparecimentos + p.comparecimentos,
      pontuacao: acc.pontuacao + p.pontuacao_gamificacao,
    }),
    { ligacoes: 0, whatsapp: 0, agendamentos: 0, comparecimentos: 0, pontuacao: 0 }
  )

  // ── Funil consolidado da equipe ────────────────────────────────────────
  const { data: clientesEquipe } = await supabase
    .from('clientes')
    .select('etapa_atual, corretor_responsavel_id')
    .in('corretor_responsavel_id', idsCorretores)
    .is('deleted_at', null)

  const totalClientes = clientesEquipe?.length ?? 0

  const funilConsolidado = ORDEM_FUNIL.reduce(
    (acc, etapa) => {
      acc[etapa] = (clientesEquipe ?? []).filter((c) => c.etapa_atual === etapa).length
      return acc
    },
    {} as Record<EtapaFunil, number>
  )

  // ── Produção semanal da equipe ─────────────────────────────────────────
  const seteDiasAtras = new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)

  const { data: producaoSemanal } = await supabase
    .from('producao_diaria')
    .select('*')
    .in('usuario_id', idsCorretores)
    .gte('data', seteDiasAtras)
    .lte('data', hoje)
    .order('data', { ascending: false })
    .returns<ProducaoDiaria[]>()

  // Agrega por data
  const producaoPorDia = (producaoSemanal ?? []).reduce(
    (acc, p) => {
      if (!acc[p.data]) {
        acc[p.data] = { ligacoes: 0, whatsapp: 0, agendamentos: 0, comparecimentos: 0, pontuacao: 0 }
      }
      acc[p.data].ligacoes += p.ligacoes
      acc[p.data].whatsapp += p.whatsapp
      acc[p.data].agendamentos += p.agendamentos
      acc[p.data].comparecimentos += p.comparecimentos
      acc[p.data].pontuacao += p.pontuacao_gamificacao
      return acc
    },
    {} as Record<string, { ligacoes: number; whatsapp: number; agendamentos: number; comparecimentos: number; pontuacao: number }>
  )

  // ── Métricas por corretor (clientes, produção hoje) ────────────────────
  const statsPorCorretor = (corretores ?? []).map((corretor) => {
    const minhaProd = (producaoHoje ?? []).find((p) => p.usuario_id === corretor.id)
    const meusClientes = (clientesEquipe ?? []).filter((c) => c.corretor_responsavel_id === corretor.id)

    const funilCorretor = ORDEM_FUNIL.reduce(
      (acc, etapa) => {
        acc[etapa] = meusClientes.filter((c) => c.etapa_atual === etapa).length
        return acc
      },
      {} as Record<EtapaFunil, number>
    )

    const fechamentos = funilCorretor.FECHAMENTOS + funilCorretor.POS_VENDA

    return {
      corretor,
      ligacoes: minhaProd?.ligacoes ?? 0,
      whatsapp: minhaProd?.whatsapp ?? 0,
      agendamentos: minhaProd?.agendamentos ?? 0,
      comparecimentos: minhaProd?.comparecimentos ?? 0,
      pontuacao: minhaProd?.pontuacao_gamificacao ?? 0,
      totalClientes: meusClientes.length,
      fechamentos,
    }
  })

  // Ordena corretores por pontuação (maior primeiro)
  statsPorCorretor.sort((a, b) => b.pontuacao - a.pontuacao)

  // Máximo para barras proporcionais
  const maximoFunil = Math.max(...Object.values(funilConsolidado), 1)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Equipe</h1>
        <p className="mt-1 text-sm text-gray-500">
          {corretores?.length ?? 0} corretor{(corretores?.length ?? 0) !== 1 ? 'es' : ''} na equipe
          {usuario.perfil === 'ADMINISTRADOR' ? ' (visão geral)' : ''}
        </p>
      </div>

      {/* ── Cards de métricas do dia (equipe toda) ──────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <MetricaCard label="Ligações" value={totalHoje.ligacoes} color="blue" />
        <MetricaCard label="WhatsApp" value={totalHoje.whatsapp} color="green" />
        <MetricaCard label="Agendamentos" value={totalHoje.agendamentos} color="purple" />
        <MetricaCard label="Comparecimentos" value={totalHoje.comparecimentos} color="orange" />
        <MetricaCard label="Pontuação" value={totalHoje.pontuacao} color="indigo" />
      </div>

      {/* ── Cards por corretor ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Desempenho individual</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {statsPorCorretor.map((s) => (
            <div
              key={s.corretor.id}
              className="rounded-lg bg-white p-5 shadow-sm"
            >
              {/* Nome e rank */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {s.corretor.nome}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  {s.pontuacao > 0 ? `${s.pontuacao} pts` : '—'}
                </span>
              </div>

              {/* Métricas do dia */}
              <div className="mt-3 flex gap-3 text-xs text-gray-500">
                <span title="Ligações">📞 {s.ligacoes}</span>
                <span title="WhatsApp">💬 {s.whatsapp}</span>
                <span title="Agendamentos">📅 {s.agendamentos}</span>
                <span title="Comparecimentos">🚶 {s.comparecimentos}</span>
              </div>

              {/* Clientes e fechamentos */}
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  {s.totalClientes} cliente{s.totalClientes !== 1 ? 's' : ''}
                </span>
                {s.fechamentos > 0 && (
                  <span className="font-medium text-green-600">
                    {s.fechamentos} fechamento{s.fechamentos !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Funil consolidado da equipe ──────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Funil consolidado · {totalClientes} cliente{totalClientes !== 1 ? 's' : ''}
        </h2>

        {totalClientes === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            Nenhum cliente no funil da equipe ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-1">
            {ORDEM_FUNIL.map((etapa) => {
              const qtd = funilConsolidado[etapa]
              const config = ETAPA_CONFIG[etapa]
              const largura = (qtd / maximoFunil) * 100
              const pct = totalClientes > 0 ? ((qtd / totalClientes) * 100).toFixed(1) : '0'
              const ativa = qtd > 0

              return (
                <div key={etapa} className="flex items-center gap-3" style={{ opacity: ativa ? 1 : 0.4 }}>
                  {/* Label */}
                  <div className="w-32 shrink-0">
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: config.corBg, color: config.cor }}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Barra */}
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-7 rounded transition-all"
                      style={{
                        width: `${Math.max(largura, qtd > 0 ? 1.5 : 0)}%`,
                        backgroundColor: config.cor,
                        minWidth: qtd > 0 ? '4px' : '0',
                      }}
                    />
                    <span className="shrink-0 text-sm font-bold" style={{ color: config.cor }}>
                      {qtd}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Produção semanal da equipe ───────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Produção da semana</h2>
        {Object.keys(producaoPorDia).length > 0 ? (
          <div className="mt-4 space-y-2">
            {Object.entries(producaoPorDia)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([data, stats]) => (
                <div
                  key={data}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2 text-sm"
                >
                  <span className="font-medium text-gray-700">
                    {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                  <span className="text-gray-500">
                    {stats.ligacoes} ligações · {stats.whatsapp} WhatsApp · {stats.agendamentos} agend.
                  </span>
                  <span className="font-bold text-blue-600">
                    {stats.pontuacao} pts
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-400">
            Nenhuma atividade registrada pela equipe nos últimos 7 dias.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Componente auxiliar ──────────────────────────────────────────────────────

function MetricaCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo'
}) {
  const cores = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }
  return (
    <div className={`rounded-lg border p-4 ${cores[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  )
}