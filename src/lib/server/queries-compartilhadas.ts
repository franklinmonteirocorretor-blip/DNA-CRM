// ─── Queries Compartilhadas (Sprint 10 Fase 6) ────────────────────────────────
// Funções reutilizadas por operacao/actions.ts e gestao/actions.ts
// Reduz ~60% de duplicação entre os dois módulos

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { unstable_cache } from 'next/cache'
import { hoje, inicioDoMes, ultimoDiaDoMes } from '@/src/lib/analytics'
import { ETAPA_LABEL_SINGULAR, ETAPA_ORDEM } from '@/src/config/pipeline'
import type {
  GestaoResumoOperacao,
  GestaoKPI,
  GestaoRankingItem,
  GestaoFunilEtapa,
  GestaoAlertas,
  GestaoMeta,
  EtapaFunil,
} from '@/src/types'

// ─── Helpers de Período ───────────────────────────────────────────────────────

export interface PeriodoParams {
  dataInicio: string
  dataFim: string
}

export function resolverPeriodo(periodo?: string): PeriodoParams {
  const hojeStr = hoje()
  if (periodo === 'hoje') return { inicio: hojeStr, fim: hojeStr } as unknown as { inicio: string; fim: string } & PeriodoParams
  if (periodo === 'semana') {
    const d = new Date()
    const diaSemana = d.getDay()
    const diff = diaSemana === 0 ? 6 : diaSemana - 1
    const seg = new Date(d); seg.setDate(d.getDate() - diff); seg.setHours(0, 0, 0, 0)
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999)
    return { dataInicio: seg.toISOString().slice(0, 10), dataFim: dom.toISOString().slice(0, 10) }
  }
  return { dataInicio: inicioDoMes(), dataFim: ultimoDiaDoMes() }
}

// ─── Resumo da Operação ───────────────────────────────────────────────────────

async function _queryResumoOperacao(options?: {
  inicio?: string
  fim?: string
}): Promise<GestaoResumoOperacao> {
  const supabase = await createSupabaseServerClient()
  const dataInicio = options?.inicio ?? inicioDoMes()
  const dataFim = options?.fim ?? ultimoDiaDoMes()
  const hojeStr = hoje()

  const [
    { count: leadsAtivos },
    { count: clientesAtendimento },
    { count: agendamentosHoje },
    { count: comparecimentosHoje },
    { data: vendasMes },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('etapa_atual', 'NOVO_LEAD').is('deleted_at', null).then(r => ({ ...r, count: r.count })),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS', 'POS_VENDA']).is('deleted_at', null).then(r => ({ ...r, count: r.count })),
    supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_hora', `${hojeStr}T00:00:00`).lte('data_hora', `${hojeStr}T23:59:59`).then(r => ({ ...r, count: r.count })),
    supabase.from('comparecimentos').select('*', { count: 'exact', head: true }).eq('resultado', 'COMPARECEU').gte('created_at', `${hojeStr}T00:00:00`).lte('created_at', `${hojeStr}T23:59:59`).then(r => ({ ...r, count: r.count })),
    supabase.from('clientes').select('vgv, comissao_valor').eq('ficha_proposta_assinada', true).gte('data_fechamento', `${dataInicio}T00:00:00`).lte('data_fechamento', `${dataFim}T23:59:59`).is('deleted_at', null),
  ])

  const vendasArr = vendasMes ?? []
  const vgvMes = vendasArr.reduce((s, v) => s + (v.vgv ?? 0), 0)
  const comissaoPrevista = vendasArr.reduce((s, v) => s + (v.comissao_valor ?? 0), 0)

  const { data: prodMes } = await supabase.from('producao_diaria').select('aprovacoes, vendas').gte('data', dataInicio).lte('data', dataFim)
  const aprovacoes = (prodMes ?? []).reduce((s, p) => s + p.aprovacoes, 0)
  const vendasCount = (prodMes ?? []).reduce((s, p) => s + p.vendas, 0)

  return {
    leadsAtivos: leadsAtivos ?? 0,
    clientesAtendimento: clientesAtendimento ?? 0,
    agendamentosHoje: agendamentosHoje ?? 0,
    comparecimentosHoje: comparecimentosHoje ?? 0,
    aprovacoesMes: aprovacoes,
    vendasMes: vendasCount,
    vgvMes,
    comissaoPrevista,
  }
}

export const queryResumoOperacao = unstable_cache(
  _queryResumoOperacao,
  ['resumo-operacao'],
  { revalidate: 60, tags: ['resumo-operacao'] },
)

// ─── KPIs Diários ─────────────────────────────────────────────────────────────

export async function _queryKPIsDiarios(
  corretorIds: string[],
  hojeStr: string,
): Promise<GestaoKPI[]> {
  const supabase = await createSupabaseServerClient()
  const METAS_D = { ligacoes: 80, whatsapps: 40, followUps: 20, agendamentos: 2, comparecimentos: 2, pastas: 1 }

  const { data: producao } = await supabase.from('producao_diaria').select('*').in('usuario_id', corretorIds).eq('data', hojeStr)
  const { data: usuarios } = await supabase.from('usuarios').select('id, nome, avatar_url').in('id', corretorIds).eq('ativo', true)
  const mapa = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u; return acc }, {} as Record<string, { nome: string; avatar_url: string | null }>)

  return corretorIds.map((uid) => {
    const p = (producao ?? []).find((x) => x.usuario_id === uid)
    const lig = p?.ligacoes ?? 0; const wha = p?.whatsapp ?? 0; const fol = p?.follow_ups ?? 0
    const age = p?.agendamentos ?? 0; const com = p?.comparecimentos ?? 0; const pas = p?.pastas ?? 0
    const pcts = [
      Math.min(100, (lig / METAS_D.ligacoes) * 100), Math.min(100, (wha / METAS_D.whatsapps) * 100),
      Math.min(100, (fol / METAS_D.followUps) * 100), Math.min(100, (age / METAS_D.agendamentos) * 100),
      Math.min(100, (com / METAS_D.comparecimentos) * 100), Math.min(100, (pas / METAS_D.pastas) * 100),
    ]
    const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    const batida = lig >= METAS_D.ligacoes && wha >= METAS_D.whatsapps && fol >= METAS_D.followUps && age >= METAS_D.agendamentos && com >= METAS_D.comparecimentos && pas >= METAS_D.pastas
    const u = mapa[uid]
    return { usuarioId: uid, nome: u?.nome ?? 'Desconhecido', avatarUrl: u?.avatar_url ?? null, ligacoes: lig, whatsapps: wha, followUps: fol, agendamentos: age, comparecimentos: com, pastas: pas, percentualDiario: pct, status: batida ? 'META_BATIDA' : 'META_PENDENTE' }
  })
}

export const queryKPIsDiarios = unstable_cache(
  _queryKPIsDiarios,
  ['kpis-diarios'],
  { revalidate: 60, tags: ['kpis-diarios'] },
)

// ─── Ranking ──────────────────────────────────────────────────────────────────

export async function _queryRanking(
  options?: { dataInicio?: string; dataFim?: string },
): Promise<GestaoRankingItem[]> {
  const supabase = await createSupabaseServerClient()
  const dataInicio = options?.dataInicio ?? inicioDoMes()
  const dataFim = options?.dataFim ?? ultimoDiaDoMes()
  const isMesAtual = dataInicio === inicioDoMes() && dataFim === ultimoDiaDoMes()

  if (isMesAtual) {
    const { data: ranking } = await supabase.rpc('fn_ranking_mes')
    const items = (ranking ?? []).map((r: Record<string, unknown>, i: number) => ({
      posicao: i + 1,
      usuarioId: r.usuario_id as string,
      nome: r.nome as string,
      avatarUrl: null as string | null,
      pontuacao: Number(r.pontos),
      vendas: Number(r.vendas),
      aprovacoes: (r.producao as Record<string, number>)?.aprovacoes ?? 0,
    }))
    const ids = items.map((i: { usuarioId: string }) => i.usuarioId)
    const { data: usuarios } = await supabase.from('usuarios').select('id, avatar_url').in('id', ids)
    const mapa = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u.avatar_url; return acc }, {} as Record<string, string | null>)
    return items.map((i: { usuarioId: string }) => ({ ...i, avatarUrl: mapa[i.usuarioId] ?? null }))
  }

  const { data: producao } = await supabase.from('producao_diaria').select('*').gte('data', dataInicio).lte('data', dataFim)
  const porUsuario: Record<string, { pontuacao: number; vendas: number; aprovacoes: number }> = {}
  for (const p of producao ?? []) {
    if (!porUsuario[p.usuario_id]) porUsuario[p.usuario_id] = { pontuacao: 0, vendas: 0, aprovacoes: 0 }
    porUsuario[p.usuario_id].pontuacao += p.pontuacao_gamificacao
    porUsuario[p.usuario_id].vendas += p.vendas
    porUsuario[p.usuario_id].aprovacoes += p.aprovacoes
  }
  const ids = Object.keys(porUsuario)
  const { data: usuarios } = ids.length > 0 ? await supabase.from('usuarios').select('id, nome, avatar_url').in('id', ids).eq('ativo', true) : { data: [] }
  const mapa = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u; return acc }, {} as Record<string, { nome: string; avatar_url: string | null }>)
  return Object.entries(porUsuario).sort(([,a],[,b]) => b.pontuacao - a.pontuacao)
    .map(([uid, d], i) => ({ posicao: i + 1, usuarioId: uid, nome: mapa[uid]?.nome ?? 'Desconhecido', avatarUrl: mapa[uid]?.avatar_url ?? null, pontuacao: d.pontuacao, vendas: d.vendas, aprovacoes: d.aprovacoes }))
}

export const queryRanking = unstable_cache(
  _queryRanking,
  ['ranking'],
  { revalidate: 60, tags: ['ranking'] },
)

// ─── Funil Gerencial ──────────────────────────────────────────────────────────

export async function _queryFunilGerencial(options?: {
  corretorId?: string | null
  empreendimentoId?: string | null
}): Promise<GestaoFunilEtapa[]> {
  const supabase = await createSupabaseServerClient()
  let query = supabase.from('clientes').select('etapa_atual', { count: 'exact' }).is('deleted_at', null)
  if (options?.corretorId) query = query.eq('corretor_responsavel_id', options.corretorId)
  if (options?.empreendimentoId) query = query.eq('empreendimento_id', options.empreendimentoId)
  const { data: clientes } = await query
  const contagem: Record<string, number> = {}
  for (const c of clientes ?? []) contagem[c.etapa_atual] = (contagem[c.etapa_atual] ?? 0) + 1
  const total = Object.values(contagem).reduce((a, b) => a + b, 0)
  return ETAPA_ORDEM.map((etapa, idx) => {
    const q = contagem[etapa] ?? 0
    const ant = idx > 0 ? (contagem[ETAPA_ORDEM[idx - 1]] ?? 0) : null
    return { etapa, label: ETAPA_LABEL_SINGULAR[etapa], quantidade: q, percentual: total > 0 ? Math.round((q / total) * 100) : 0, taxaConversao: ant !== null && ant > 0 ? Math.round((q / ant) * 100) : null }
  })
}

export const queryFunilGerencial = unstable_cache(
  _queryFunilGerencial,
  ['funil-gerencial'],
  { revalidate: 60, tags: ['funil-gerencial'] },
)

// ─── Alertas ───────────────────────────────────────────────────────────────────

export async function _queryAlertas(): Promise<GestaoAlertas> {
  const supabase = await createSupabaseServerClient()
  const tresDias = new Date(Date.now() - 3 * 86400000).toISOString()
  const seteDias = new Date(Date.now() - 7 * 86400000).toISOString()
  const [sC, perd, docs, parF, agRet] = await Promise.all([
    supabase.from('clientes').select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)').in('etapa_atual', ['NOVO_LEAD','CONTATOS','AGENDAMENTO','COMPARECIMENTO','ANALISE','RESTRICOES','CONDICIONADOS','APROVADOS','FECHAMENTOS']).lt('ultima_atividade_em', tresDias).is('deleted_at', null).order('ultima_atividade_em').limit(20).then(r => r.data ?? []),
    supabase.from('agendamentos').select('id, data_hora, status, clientes(nome), usuarios!inner(nome)').eq('status', 'CANCELADO').gte('updated_at', seteDias).order('updated_at', { ascending: false }).limit(20).then(r => r.data ?? []),
    supabase.from('documentos').select('cliente_id, clientes!inner(nome, etapa_atual)').eq('status_validacao', 'PENDENTE').is('deleted_at', null).limit(50).then(r => r.data ?? []),
    supabase.from('clientes').select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)').in('etapa_atual', ['CONTATOS','AGENDAMENTO','COMPARECIMENTO','ANALISE','RESTRICOES','CONDICIONADOS','APROVADOS','FECHAMENTOS']).lt('ultima_atividade_em', seteDias).is('deleted_at', null).order('ultima_atividade_em').limit(20).then(r => r.data ?? []),
    supabase.from('clientes').select('id, nome, proxima_acao, proxima_acao_em, corretor_responsavel_id, usuarios!inner(nome)').not('proxima_acao_em', 'is', null).lte('proxima_acao_em', new Date(Date.now() + 2 * 86400000).toISOString()).gte('proxima_acao_em', seteDias).is('deleted_at', null).order('proxima_acao_em').limit(20).then(r => r.data ?? []),
  ])
  const docsPorCli: Record<string, { nome: string; etapa: EtapaFunil; qtd: number }> = {}
  for (const d of docs ?? []) {
    const c = d.clientes as unknown as { nome: string; etapa_atual: EtapaFunil } | null
    if (!c) continue
    if (!docsPorCli[d.cliente_id]) docsPorCli[d.cliente_id] = { nome: c.nome, etapa: c.etapa_atual, qtd: 0 }
    docsPorCli[d.cliente_id].qtd++
  }
  return {
    clientesSemContato3dias: (sC ?? []).map((c: Record<string, unknown>) => ({
      clienteId: c.id as string, nome: c.nome as string, etapa: c.etapa_atual as EtapaFunil,
      diasSemContato: Math.floor((Date.now() - new Date(c.ultima_atividade_em as string).getTime()) / 86400000),
      corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '',
    })),
    agendamentosPerdidos: (perd ?? []).map((a: Record<string, unknown>) => ({
      agendamentoId: a.id as string,
      clienteNome: ((a.clientes as unknown as { nome: string })?.nome) ?? '',
      dataHora: a.data_hora as string, status: a.status as 'CANCELADO',
      corretorNome: ((a.usuarios as unknown as { nome: string })?.nome) ?? '',
    })),
    pendenciasDocumentais: Object.entries(docsPorCli).map(([clienteId, d]) => ({
      clienteId, clienteNome: d.nome, qtdDocumentosPendentes: d.qtd, etapa: d.etapa,
    })),
    clientesParadosFunil: (parF ?? []).map((c: Record<string, unknown>) => ({
      clienteId: c.id as string, nome: c.nome as string, etapa: c.etapa_atual as EtapaFunil,
      diasNaEtapa: Math.floor((Date.now() - new Date(c.ultima_atividade_em as string).getTime()) / 86400000),
      corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '',
    })),
    aguardandoRetorno: (agRet ?? []).map((c: Record<string, unknown>) => ({
      clienteId: c.id as string, nome: c.nome as string,
      proximaAcao: (c.proxima_acao as string) ?? '',
      proximaAcaoEm: (c.proxima_acao_em as string) ?? '',
      corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '',
    })),
  }
}

export const queryAlertas = unstable_cache(
  _queryAlertas,
  ['alertas'],
  { revalidate: 60, tags: ['alertas'] },
)

// ─── Metas ─────────────────────────────────────────────────────────────────────

export async function _queryMetas(options: {
  corretoresIds: string[]
  inicio: string
  fim: string
  vgvMes: number
}): Promise<GestaoMeta> {
  const supabase = await createSupabaseServerClient()
  const { data: prodTodos } = await supabase.from('producao_diaria').select('*').in('usuario_id', options.corretoresIds).gte('data', options.inicio).lte('data', options.fim)
  const soma = (rows: typeof prodTodos) => (rows ?? []).reduce((acc, p) => { acc.vendas += p.vendas; acc.aprovacoes += p.aprovacoes; acc.agendamentos += p.agendamentos; acc.comparecimentos += p.comparecimentos; acc.pastas += p.pastas; return acc }, { vendas: 0, aprovacoes: 0, agendamentos: 0, comparecimentos: 0, pastas: 0 })
  const realEq = soma(prodTodos)
  const metaBase = { vendas: 4 * options.corretoresIds.length, aprovacoes: 8 * options.corretoresIds.length, agendamentos: 40 * options.corretoresIds.length, comparecimentos: 30 * options.corretoresIds.length, pastas: 20 * options.corretoresIds.length }
  const metaIndBase = { vendas: 4, aprovacoes: 8, agendamentos: 40, comparecimentos: 30, pastas: 20 }
  const calcPct = (r: typeof realEq, m: typeof metaBase) => { const pcts = [m.vendas > 0 ? Math.min(100, (r.vendas / m.vendas) * 100) : 0, m.aprovacoes > 0 ? Math.min(100, (r.aprovacoes / m.aprovacoes) * 100) : 0, m.agendamentos > 0 ? Math.min(100, (r.agendamentos / m.agendamentos) * 100) : 0, m.comparecimentos > 0 ? Math.min(100, (r.comparecimentos / m.comparecimentos) * 100) : 0, m.pastas > 0 ? Math.min(100, (r.pastas / m.pastas) * 100) : 0]; return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) }
  const diasRest = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())
  return {
    metaEquipe: metaBase, metaIndividual: metaIndBase, realizadoEquipe: realEq, realizadoIndividual: realEq,
    percentualEquipe: calcPct(realEq, metaBase), percentualIndividual: calcPct(realEq, metaIndBase),
    diasRestantes: diasRest, projecaoFechamento: { vendas: Math.round(realEq.vendas * 1.2), vgv: options.vgvMes * 1.2 },
  }
}

export const queryMetas = unstable_cache(
  _queryMetas,
  ['metas'],
  { revalidate: 60, tags: ['metas'] },
)