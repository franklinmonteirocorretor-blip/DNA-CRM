import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { throwOnError } from '@/src/lib/server/safeQuery'
import { Usuario, ProducaoDiaria } from '@/src/types'
import { redirect } from 'next/navigation'

// ── Tipos internos ───────────────────────────────────────────────────────────

interface StatsCorretor {
  id: string
  nome: string
  ligacoes: number
  whatsapp: number
  agendamentos: number
  comparecimentos: number
  documentos: number
  analises: number
  aprovacoes: number
  fechamentos: number
  totalClientes: number
  taxaConversao: number
  vgv: number
  comissao: number
}

interface RankingItem {
  posicao: number
  nome: string
  valor: string
  destaque: boolean
}

// ── Página ───────────────────────────────────────────────────────────────────

export default async function RankingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, perfil, gerente_id')
    .eq('id', user.id)
    .single<Pick<Usuario, 'id' | 'perfil' | 'gerente_id'>>()

  if (!usuario) {
    redirect('/dashboard')
  }

  const ehGerente = usuario.perfil === 'GERENTE' || usuario.perfil === 'ADMINISTRADOR'

  // ── Busca os corretores ─────────────────────────────────────────────────
  let queryCorretores = supabase
    .from('usuarios')
    .select('id, nome')
    .eq('perfil', 'CORRETOR')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome', { ascending: true })

  if (usuario.perfil === 'GERENTE') {
    queryCorretores = queryCorretores.eq('gerente_id', usuario.id)
  } else if (usuario.perfil === 'CORRETOR') {
    queryCorretores = queryCorretores.eq('id', usuario.id)
  }

  const corretores = await throwOnError(queryCorretores.returns<
    Pick<Usuario, 'id' | 'nome'>[]
  >())

  const listaCorretores = corretores

  if (listaCorretores.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rankings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Métricas de produtividade, VGV e comissões.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Nenhum corretor encontrado.
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {ehGerente
              ? 'Sua equipe ainda não tem corretores cadastrados.'
              : 'Seus dados de produtividade aparecerão aqui.'}
          </p>
        </div>
      </div>
    )
  }

  const ids = listaCorretores.map((c) => c.id)

  // ── Período: mês atual ──────────────────────────────────────────────────
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

  // ── 1. Produção do mês (producao_diaria) ────────────────────────────────
  const producao = await throwOnError(
    supabase
      .from('producao_diaria')
      .select('*')
      .in('usuario_id', ids)
      .gte('data', inicioMes.slice(0, 10))
      .lte('data', fimMes.slice(0, 10))
      .returns<ProducaoDiaria[]>()
  )

  // ── 2. Clientes com dados de VGV e comissão ─────────────────────────────
  const clientes = await throwOnError(
    supabase
      .from('clientes')
      .select('id, corretor_responsavel_id, etapa_atual, resultado_analise, ficha_proposta_assinada, pasta_completa_em, vgv, comissao_valor, data_fechamento')
      .in('corretor_responsavel_id', ids)
      .is('deleted_at', null)
  )

  // ── Consolida por corretor ──────────────────────────────────────────────
  const mapa = new Map<string, StatsCorretor>()

  for (const c of listaCorretores) {
    mapa.set(c.id, {
      id: c.id,
      nome: c.nome,
      ligacoes: 0,
      whatsapp: 0,
      agendamentos: 0,
      comparecimentos: 0,
      documentos: 0,
      analises: 0,
      aprovacoes: 0,
      fechamentos: 0,
      totalClientes: 0,
      taxaConversao: 0,
      vgv: 0,
      comissao: 0,
    })
  }

  // Produção
  for (const p of producao) {
    const s = mapa.get(p.usuario_id)
    if (!s) continue
    s.ligacoes += p.ligacoes
    s.whatsapp += p.whatsapp
    s.agendamentos += p.agendamentos
    s.comparecimentos += p.comparecimentos
  }

  // Clientes
  for (const cli of clientes) {
    const s = mapa.get(cli.corretor_responsavel_id)
    if (!s) continue
    s.totalClientes++
    if (cli.pasta_completa_em) s.documentos++
    if (cli.resultado_analise) s.analises++
    if (cli.etapa_atual === 'APROVADOS') s.aprovacoes++
    if (cli.ficha_proposta_assinada && cli.data_fechamento) {
      // Fechamento no mês atual
      const dataFech = new Date(cli.data_fechamento)
      if (dataFech >= new Date(inicioMes) && dataFech <= new Date(fimMes)) {
        s.fechamentos++
        s.vgv += cli.vgv ?? 0
        s.comissao += cli.comissao_valor ?? 0
      }
    }
  }

  // Calcula taxa de conversão (fechamentos / totalClientes)
  for (const s of mapa.values()) {
    s.taxaConversao = s.totalClientes > 0
      ? (s.fechamentos / s.totalClientes) * 100
      : 0
  }

  const stats = Array.from(mapa.values())

  // ── Helpers de ranking ──────────────────────────────────────────────────
  function top3(
    campo: keyof StatsCorretor,
    formatar: (v: number) => string,
    ordem: 'desc' | 'asc' = 'desc'
  ): RankingItem[] {
    const ordenado = [...stats]
      .filter((s) => (typeof s[campo] === 'number' ? s[campo] as number : 0) > 0)
      .sort((a, b) => {
        const va = a[campo] as number
        const vb = b[campo] as number
        return ordem === 'desc' ? vb - va : va - vb
      })
      .slice(0, 3)

    return ordenado.map((s, i) => ({
      posicao: i + 1,
      nome: s.nome,
      valor: formatar(s[campo] as number),
      destaque: i === 0,
    }))
  }

  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Rankings
  const rankingLigacoes = top3('ligacoes', (v) => `${v} ligações`)
  const rankingDocumentos = top3('documentos', (v) => `${v} pastas`)
  const rankingAnalises = top3('analises', (v) => `${v} análises`)
  const rankingAprovacoes = top3('aprovacoes', (v) => `${v} aprovados`)
  const rankingFechamentos = top3('fechamentos', (v) => `${v} fechamentos`)
  const rankingConversao = top3('taxaConversao', (v) => `${v.toFixed(1)}%`)
  const rankingVgv = top3('vgv', (v) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  )
  const rankingComissao = top3('comissao', (v) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rankings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {ehGerente ? 'Produtividade da equipe' : 'Seus resultados'} · {mesLabel}
          </p>
        </div>
      </div>

      {/* ── TOP 3 DESTAQUE ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🏆 Top 3 — VGV e Comissões</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Os três maiores vendedores do mês em valor de vendas.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 1º Lugar */}
          <CardDestaque
            posicao={1}
            nome={rankingVgv[0]?.nome ?? '—'}
            vgv={rankingVgv[0]?.valor ?? '—'}
            comissao={rankingComissao.find((r) => r.nome === rankingVgv[0]?.nome)?.valor ?? '—'}
            cor="#f59e0b"
            emoji="🥇"
          />

          {/* 2º Lugar */}
          <CardDestaque
            posicao={2}
            nome={rankingVgv[1]?.nome ?? '—'}
            vgv={rankingVgv[1]?.valor ?? '—'}
            comissao={rankingComissao.find((r) => r.nome === rankingVgv[1]?.nome)?.valor ?? '—'}
            cor="#9ca3af"
            emoji="🥈"
          />

          {/* 3º Lugar */}
          <CardDestaque
            posicao={3}
            nome={rankingVgv[2]?.nome ?? '—'}
            vgv={rankingVgv[2]?.valor ?? '—'}
            comissao={rankingComissao.find((r) => r.nome === rankingVgv[2]?.nome)?.valor ?? '—'}
            cor="#cd7f32"
            emoji="🥉"
          />
        </div>
      </div>

      {/* ── RANKINGS DE PRODUTIVIDADE ─────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📊 Produtividade</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Comparativo de desempenho entre corretores no mês de {mesLabel}.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SecaoRanking
            titulo="Ligações"
            icone="📞"
            items={rankingLigacoes}
            cor="#3b82f6"
            vazio="Nenhuma ligação no mês"
          />
          <SecaoRanking
            titulo="Documentações"
            icone="📁"
            items={rankingDocumentos}
            cor="#8b5cf6"
            vazio="Nenhuma pasta completa"
          />
          <SecaoRanking
            titulo="Análises"
            icone="🔍"
            items={rankingAnalises}
            cor="#f97316"
            vazio="Nenhuma análise realizada"
          />
          <SecaoRanking
            titulo="Aprovações"
            icone="✅"
            items={rankingAprovacoes}
            cor="#14b8a6"
            vazio="Nenhum cliente aprovado"
          />
          <SecaoRanking
            titulo="Fechamentos"
            icone="🔑"
            items={rankingFechamentos}
            cor="#22c55e"
            vazio="Nenhum fechamento no mês"
          />
          <SecaoRanking
            titulo="Taxa de Conversão"
            icone="📈"
            items={rankingConversao}
            cor="#ec4899"
            vazio="Nenhuma conversão calculada"
          />
        </div>
      </div>

      {/* ── RANKING DE VGV ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">💰 VGV (Valor Geral de Vendas)</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Soma do valor de vendas dos fechamentos no mês de {mesLabel}.
        </p>

        <div className="mt-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          {rankingVgv.length > 0 ? (
            rankingVgv.map((item) => (
              <LinhaRanking key={item.posicao} item={item} cor="#f59e0b" />
            ))
          ) : (
            <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
              Nenhum VGV registrado no mês.
            </p>
          )}
        </div>
      </div>

      {/* ── RANKING DE COMISSÕES ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">💵 Comissões</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Total de comissões calculadas sobre os fechamentos do mês de {mesLabel}.
        </p>

        <div className="mt-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          {rankingComissao.length > 0 ? (
            rankingComissao.map((item) => (
              <LinhaRanking key={item.posicao} item={item} cor="#22c55e" />
            ))
          ) : (
            <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
              Nenhuma comissão calculada no mês.
            </p>
          )}
        </div>
      </div>

      {/* ── TABELA COMPLETA ───────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Visão completa · {mesLabel}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-700 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-4 py-2.5">Corretor</th>
                <th className="px-4 py-2.5 text-center">📞</th>
                <th className="px-4 py-2.5 text-center">📁</th>
                <th className="px-4 py-2.5 text-center">🔍</th>
                <th className="px-4 py-2.5 text-center">✅</th>
                <th className="px-4 py-2.5 text-center">🔑</th>
                <th className="px-4 py-2.5 text-center">Conv.</th>
                <th className="px-4 py-2.5 text-right">VGV</th>
                <th className="px-4 py-2.5 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{s.nome}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.ligacoes}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.documentos}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.analises}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.aprovacoes}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-green-600">{s.fechamentos}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.taxaConversao.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                    {s.vgv > 0 ? s.vgv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-green-700">
                    {s.comissao > 0 ? s.comissao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Componentes auxiliares ───────────────────────────────────────────────────

function CardDestaque({
  posicao,
  nome,
  vgv,
  comissao,
  cor,
  emoji,
}: {
  posicao: number
  nome: string
  vgv: string
  comissao: string
  cor: string
  emoji: string
}) {
  return (
    <div
      className="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm border-2"
      style={{ borderColor: cor }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {posicao}º lugar
        </span>
      </div>
      <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{nome}</p>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">VGV</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{vgv}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Comissão</span>
          <span className="font-semibold text-green-700">{comissao}</span>
        </div>
      </div>
    </div>
  )
}

function SecaoRanking({
  titulo,
  icone,
  items,
  cor,
  vazio,
}: {
  titulo: string
  icone: string
  items: RankingItem[]
  cor: string
  vazio: string
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        <span>{icone}</span>
        {titulo}
      </h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <LinhaRanking key={item.posicao} item={item} cor={cor} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{vazio}</p>
      )}
    </div>
  )
}

function LinhaRanking({ item, cor }: { item: RankingItem; cor: string }) {
  const medalhas = ['🥇', '🥈', '🥉']
  return (
    <li className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{medalhas[item.posicao - 1]}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.nome}</span>
      </div>
      <span className="text-sm font-bold" style={{ color: cor }}>
        {item.valor}
      </span>
    </li>
  )
}