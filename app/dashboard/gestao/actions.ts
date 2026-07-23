'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import {
  GestaoResumoOperacao,
  GestaoKPI,
  GestaoRankingItem,
  GestaoFunilEtapa,
  GestaoProducaoSerie,
  GestaoAlertas,
  GestaoMeta,
  GestaoFiltros,
  EtapaFunil,
} from '@/src/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

function inicioDoMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function ultimoDiaDoMes(): string {
  const d = new Date()
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return ultimo.toISOString().slice(0, 10)
}

function diasRestantesNoMes(): number {
  const hoje = new Date()
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  return Math.max(0, ultimo.getDate() - hoje.getDate())
}

function aplicarFiltrosPeriodo(filtros?: GestaoFiltros): { dataInicio: string; dataFim: string } {
  if (filtros?.periodo === 'personalizado' && filtros.dataInicio && filtros.dataFim) {
    return { dataInicio: filtros.dataInicio, dataFim: filtros.dataFim }
  }
  if (filtros?.periodo === 'semana') {
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    const diff = diaSemana === 0 ? 6 : diaSemana - 1
    const seg = new Date(hoje)
    seg.setDate(hoje.getDate() - diff)
    seg.setHours(0, 0, 0, 0)
    const dom = new Date(seg)
    dom.setDate(seg.getDate() + 6)
    dom.setHours(23, 59, 59, 999)
    return { dataInicio: seg.toISOString().slice(0, 10), dataFim: dom.toISOString().slice(0, 10) }
  }
  if (filtros?.periodo === 'hoje') {
    return { dataInicio: hoje(), dataFim: hoje() }
  }
  // default: mês atual
  return { dataInicio: inicioDoMes(), dataFim: ultimoDiaDoMes() }
}

// ─── Seção 1: Resumo da Operação ─────────────────────────────────────────────

export async function resumoOperacao(filtros?: GestaoFiltros): Promise<GestaoResumoOperacao> {
  const supabase = await createSupabaseServerClient()
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)

  const [
    { count: leadsAtivos },
    { count: clientesAtendimento },
    { count: agendamentosHoje },
    { count: comparecimentosHoje },
    { data: vendasMes },
  ] = await Promise.all([
    // Leads ativos (NOVO_LEAD)
    supabase.from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('etapa_atual', 'NOVO_LEAD')
      .is('deleted_at', null)
      .then((r) => ({ ...r, count: r.count })),

    // Clientes em atendimento (etapas ativas entre CONTATOS e POS_VENDA)
    supabase.from('clientes')
      .select('*', { count: 'exact', head: true })
      .in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS', 'POS_VENDA'])
      .is('deleted_at', null)
      .then((r) => ({ ...r, count: r.count })),

    // Agendamentos hoje
    supabase.from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .gte('data_hora', `${hoje()}T00:00:00`)
      .lte('data_hora', `${hoje()}T23:59:59`)
      .then((r) => ({ ...r, count: r.count })),

    // Comparecimentos hoje (COMPARECEU)
    supabase.from('comparecimentos')
      .select('*', { count: 'exact', head: true })
      .eq('resultado', 'COMPARECEU')
      .gte('created_at', `${hoje()}T00:00:00`)
      .lte('created_at', `${hoje()}T23:59:59`)
      .then((r) => ({ ...r, count: r.count })),

    // Vendas do mês (clientes com data_fechamento no período)
    supabase.from('clientes')
      .select('vgv, comissao_valor')
      .eq('ficha_proposta_assinada', true)
      .gte('data_fechamento', `${dataInicio}T00:00:00`)
      .lte('data_fechamento', `${dataFim}T23:59:59`)
      .is('deleted_at', null),
  ])

  // Calcula VGV e Comissão do mês
  const vendas = vendasMes ?? []
  const vgvMes = vendas.reduce((s, v) => s + (v.vgv ?? 0), 0)
  const comissaoPrevista = vendas.reduce((s, v) => s + (v.comissao_valor ?? 0), 0)

  // Aprovações do mês: soma da coluna aprovacoes em producao_diaria
  const { data: prodMes } = await supabase
    .from('producao_diaria')
    .select('aprovacoes, vendas')
    .gte('data', dataInicio)
    .lte('data', dataFim)
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

// ─── Seção 2: KPIs Diários ───────────────────────────────────────────────────

export async function kpisDiarios(filtros?: GestaoFiltros): Promise<GestaoKPI[]> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hojeStr = hoje()

  // Buscar corretores: se GERENTE, busca equipe (corretores cujo gerente_id = user.id + o próprio user)
  // Se CORRETOR, só ele mesmo
  const { data: usuario } = await supabase.from('usuarios').select('perfil, gerente_id').eq('id', user!.id).single()

  let corretorIds: string[]
  if (usuario?.perfil === 'CORRETOR') {
    corretorIds = [user!.id]
  } else {
    // GERENTE ou ADMIN: busca todos corretores
    const { data: corretores } = await supabase.from('usuarios').select('id').eq('ativo', true)
    corretorIds = (corretores ?? []).map((c) => c.id)
  }

  if (filtros?.corretorId) {
    corretorIds = corretorIds.filter((id) => id === filtros.corretorId)
  }

  // Busca produção de hoje para todos os corretores
  const { data: producao } = await supabase
    .from('producao_diaria')
    .select('*')
    .in('usuario_id', corretorIds)
    .eq('data', hojeStr)

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, avatar_url')
    .in('id', corretorIds)
    .eq('ativo', true)

  const mapaUsuarios = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u; return acc }, {} as Record<string, { id: string; nome: string; avatar_url: string | null }>)

  const METAS = { ligacoes: 80, whatsapps: 40, followUps: 20, agendamentos: 2, comparecimentos: 2, pastas: 1 }

  return corretorIds.map((uid) => {
    const prod = (producao ?? []).find((p) => p.usuario_id === uid)
    const ligacoes = prod?.ligacoes ?? 0
    const whatsapps = prod?.whatsapp ?? 0
    const followUps = prod?.follow_ups ?? 0
    const agendamentos = prod?.agendamentos ?? 0
    const comparecimentos = prod?.comparecimentos ?? 0
    const pastas = prod?.pastas ?? 0

    // Calcula percentual: média dos percentuais de cada KPI
    const pcts = [
      Math.min(100, (ligacoes / METAS.ligacoes) * 100),
      Math.min(100, (whatsapps / METAS.whatsapps) * 100),
      Math.min(100, (followUps / METAS.followUps) * 100),
      Math.min(100, (agendamentos / METAS.agendamentos) * 100),
      Math.min(100, (comparecimentos / METAS.comparecimentos) * 100),
      Math.min(100, (pastas / METAS.pastas) * 100),
    ]
    const percentualDiario = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)

    const todasMetasBatidas =
      ligacoes >= METAS.ligacoes &&
      whatsapps >= METAS.whatsapps &&
      followUps >= METAS.followUps &&
      agendamentos >= METAS.agendamentos &&
      comparecimentos >= METAS.comparecimentos &&
      pastas >= METAS.pastas

    const u = mapaUsuarios[uid]
    return {
      usuarioId: uid,
      nome: u?.nome ?? 'Desconhecido',
      avatarUrl: u?.avatar_url ?? null,
      ligacoes,
      whatsapps,
      followUps,
      agendamentos,
      comparecimentos,
      pastas,
      percentualDiario,
      status: todasMetasBatidas ? 'META_BATIDA' : 'META_PENDENTE',
    }
  })
}

// ─── Seção 3: Ranking ────────────────────────────────────────────────────────

export async function rankingGestao(filtros?: GestaoFiltros): Promise<GestaoRankingItem[]> {
  const supabase = await createSupabaseServerClient()
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)

  // Usa a função nativa do banco: fn_ranking_mes() ou agrega producao_diaria
  // fn_ranking_mes() retorna ranking do mês atual. Se período != mês, agregamos producao_diaria.
  const isMesAtual =
    dataInicio === inicioDoMes() && dataFim === ultimoDiaDoMes() && !filtros?.corretorId

  if (isMesAtual) {
    // Usar fn_ranking_mes() nativa (bypassa RLS)
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

    // Buscar avatar_urls
    const ids = items.map((i: { usuarioId: string }) => i.usuarioId)
    const { data: usuarios } = await supabase.from('usuarios').select('id, avatar_url').in('id', ids)
    const mapa = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u.avatar_url; return acc }, {} as Record<string, string | null>)
    return items.map((i: { usuarioId: string; avatarUrl: string | null }) => ({ ...i, avatarUrl: mapa[i.usuarioId] ?? null }))
  }

  // Período customizado: agrega producao_diaria
  const { data: producao } = await supabase
    .from('producao_diaria')
    .select('*')
    .gte('data', dataInicio)
    .lte('data', dataFim)

  // Agrupa por usuario_id
  const porUsuario: Record<string, { pontuacao: number; vendas: number; aprovacoes: number }> = {}
  for (const p of producao ?? []) {
    if (!porUsuario[p.usuario_id]) {
      porUsuario[p.usuario_id] = { pontuacao: 0, vendas: 0, aprovacoes: 0 }
    }
    porUsuario[p.usuario_id].pontuacao += p.pontuacao_gamificacao
    porUsuario[p.usuario_id].vendas += p.vendas
    porUsuario[p.usuario_id].aprovacoes += p.aprovacoes
  }

  // Busca nomes
  const ids = Object.keys(porUsuario)
  const { data: usuarios } = ids.length > 0
    ? await supabase.from('usuarios').select('id, nome, avatar_url').in('id', ids).eq('ativo', true)
    : { data: [] }

  const mapa = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u; return acc }, {} as Record<string, { id: string; nome: string; avatar_url: string | null }>)

  const items = Object.entries(porUsuario)
    .sort(([, a], [, b]) => b.pontuacao - a.pontuacao)
    .map(([uid, dados], i) => ({
      posicao: i + 1,
      usuarioId: uid,
      nome: mapa[uid]?.nome ?? 'Desconhecido',
      avatarUrl: mapa[uid]?.avatar_url ?? null,
      pontuacao: dados.pontuacao,
      vendas: dados.vendas,
      aprovacoes: dados.aprovacoes,
    }))

  return items
}

// ─── Seção 4: Funil Gerencial ────────────────────────────────────────────────

const ETAPA_LABELS: Record<EtapaFunil, string> = {
  NOVO_LEAD: 'Novo Contato',
  CONTATOS: 'Contato',
  AGENDAMENTO: 'Visita Agendada',
  COMPARECIMENTO: 'Visita',
  ANALISE: 'Análise',
  RESTRICOES: 'Restrições',
  CONDICIONADOS: 'Condicionados',
  APROVADOS: 'Aprovados',
  FECHAMENTOS: 'Documentação/Contrato',
  POS_VENDA: 'Pós-venda',
}

const ETAPA_ORDEM: EtapaFunil[] = [
  'NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE',
  'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS', 'POS_VENDA',
]

export async function funilGerencial(filtros?: GestaoFiltros): Promise<GestaoFunilEtapa[]> {
  const supabase = await createSupabaseServerClient()
  const corretorFiltro = filtros?.corretorId
  const empFiltro = filtros?.empreendimentoId

  // Conta clientes por etapa
  let query = supabase.from('clientes').select('etapa_atual', { count: 'exact' }).is('deleted_at', null)
  if (corretorFiltro) query = query.eq('corretor_responsavel_id', corretorFiltro)
  if (empFiltro) query = query.eq('empreendimento_id', empFiltro)

  const { data: clientes } = await query

  const contagem: Record<string, number> = {}
  for (const c of clientes ?? []) {
    contagem[c.etapa_atual] = (contagem[c.etapa_atual] ?? 0) + 1
  }

  const total = Object.values(contagem).reduce((a, b) => a + b, 0)

  return ETAPA_ORDEM.map((etapa, idx) => {
    const quantidade = contagem[etapa] ?? 0
    const percentual = total > 0 ? Math.round((quantidade / total) * 100) : 0
    const etapaAnterior = idx > 0 ? ETAPA_ORDEM[idx - 1] : null
    const qtdAnterior = etapaAnterior ? (contagem[etapaAnterior] ?? 0) : null
    const taxaConversao = qtdAnterior !== null && qtdAnterior > 0
      ? Math.round((quantidade / qtdAnterior) * 100)
      : null

    return {
      etapa,
      label: ETAPA_LABELS[etapa],
      quantidade,
      percentual,
      taxaConversao,
    }
  })
}

// ─── Seção 5: Produtividade ──────────────────────────────────────────────────

export async function producaoGestao(
  agrupamento: 'daily' | 'weekly' | 'monthly',
  filtros?: GestaoFiltros
): Promise<GestaoProducaoSerie[]> {
  const supabase = await createSupabaseServerClient()
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)
  const corretorFiltro = filtros?.corretorId

  let query = supabase.from('producao_diaria')
    .select('*')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true })

  if (corretorFiltro) query = query.eq('usuario_id', corretorFiltro)

  const { data: producao } = await query
  const rows = producao ?? []

  if (agrupamento === 'daily') {
    return rows.map((p) => ({
      data: p.data,
      ligacoes: p.ligacoes,
      whatsapps: p.whatsapp,
      followUps: p.follow_ups,
      agendamentos: p.agendamentos,
      comparecimentos: p.comparecimentos,
      aprovacoes: p.aprovacoes,
      vendas: p.vendas,
      pontuacao: p.pontuacao_gamificacao,
    }))
  }

  // Agrupa por semana (ISO week) ou mês
  const grupos: Record<string, GestaoProducaoSerie> = {}

  for (const p of rows) {
    let key: string
    if (agrupamento === 'weekly') {
      const d = new Date(p.data + 'T00:00:00')
      const seg = new Date(d)
      seg.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      key = seg.toISOString().slice(0, 10)
    } else {
      key = p.data.slice(0, 7) // YYYY-MM
    }

    if (!grupos[key]) {
      grupos[key] = { data: key, ligacoes: 0, whatsapps: 0, followUps: 0, agendamentos: 0, comparecimentos: 0, aprovacoes: 0, vendas: 0, pontuacao: 0 }
    }
    grupos[key].ligacoes += p.ligacoes
    grupos[key].whatsapps += p.whatsapp
    grupos[key].followUps += p.follow_ups
    grupos[key].agendamentos += p.agendamentos
    grupos[key].comparecimentos += p.comparecimentos
    grupos[key].aprovacoes += p.aprovacoes
    grupos[key].vendas += p.vendas
    grupos[key].pontuacao += p.pontuacao_gamificacao
  }

  return Object.values(grupos).sort((a, b) => a.data.localeCompare(b.data))
}

// ─── Seção 6: Alertas ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface comum; os alertas sao globais independente de filtro
export async function alertasGestao(filtros?: GestaoFiltros): Promise<GestaoAlertas> {
  const supabase = await createSupabaseServerClient()
  const tresDiasAtras = new Date(Date.now() - 3 * 86400000).toISOString()

  const [
    { data: semContato },
    { data: perdidos },
    { data: docs },
    { data: paradosFunil },
    { data: aguardando },
  ] = await Promise.all([
    // Clientes sem contato há mais de 3 dias (etapas ativas)
    supabase.from('clientes')
      .select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)')
      .in('etapa_atual', ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS'])
      .lt('ultima_atividade_em', tresDiasAtras)
      .is('deleted_at', null)
      .order('ultima_atividade_em', { ascending: true })
      .limit(20),

    // Agendamentos perdidos (CANCELADO ou REMARCADO nos últimos 7 dias)
    supabase.from('agendamentos')
      .select('id, data_hora, status, clientes(nome), usuarios!inner(nome)')
      .in('status', ['CANCELADO'])
      .gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(20),

    // Pendências documentais
    supabase.from('documentos')
      .select('cliente_id, clientes!inner(nome, etapa_atual)')
      .eq('status_validacao', 'PENDENTE')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),

    // Clientes parados no funil (>7 dias na mesma etapa ativa)
    supabase.from('clientes')
      .select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)')
      .in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS'])
      .lt('ultima_atividade_em', new Date(Date.now() - 7 * 86400000).toISOString())
      .is('deleted_at', null)
      .order('ultima_atividade_em', { ascending: true })
      .limit(20),

    // Aguardando retorno (proxima_acao_em vencida ou próxima)
    supabase.from('clientes')
      .select('id, nome, proxima_acao, proxima_acao_em, corretor_responsavel_id, usuarios!inner(nome)')
      .not('proxima_acao_em', 'is', null)
      .lte('proxima_acao_em', new Date(Date.now() + 2 * 86400000).toISOString())
      .gte('proxima_acao_em', new Date(Date.now() - 7 * 86400000).toISOString())
      .is('deleted_at', null)
      .order('proxima_acao_em', { ascending: true })
      .limit(20),
  ])

  // Agrupa docs por cliente
  const docsPorCliente: Record<string, { nome: string; etapa: EtapaFunil; qtd: number }> = {}
  for (const d of docs ?? []) {
    const c = d.clientes as unknown as { nome: string; etapa_atual: EtapaFunil } | null
    if (!c) continue
    if (!docsPorCliente[d.cliente_id]) {
      docsPorCliente[d.cliente_id] = { nome: c.nome, etapa: c.etapa_atual, qtd: 0 }
    }
    docsPorCliente[d.cliente_id].qtd++
  }

  return {
    clientesSemContato3dias: (semContato ?? []).map((c) => ({
      clienteId: c.id,
      nome: c.nome,
      etapa: c.etapa_atual as EtapaFunil,
      diasSemContato: Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000),
      corretorNome: (c.usuarios as unknown as { nome: string })?.nome ?? '',
    })),
    agendamentosPerdidos: (perdidos ?? []).map((a) => ({
      agendamentoId: a.id,
      clienteNome: (a.clientes as unknown as { nome: string })?.nome ?? '',
      dataHora: a.data_hora,
      status: a.status as 'CANCELADO',
      corretorNome: (a.usuarios as unknown as { nome: string })?.nome ?? '',
    })),
    pendenciasDocumentais: Object.entries(docsPorCliente).map(([clienteId, d]) => ({
      clienteId,
      clienteNome: d.nome,
      qtdDocumentosPendentes: d.qtd,
      etapa: d.etapa,
    })),
    clientesParadosFunil: (paradosFunil ?? []).map((c) => ({
      clienteId: c.id,
      nome: c.nome,
      etapa: c.etapa_atual as EtapaFunil,
      diasNaEtapa: Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000),
      corretorNome: (c.usuarios as unknown as { nome: string })?.nome ?? '',
    })),
    aguardandoRetorno: (aguardando ?? []).map((c) => ({
      clienteId: c.id,
      nome: c.nome,
      proximaAcao: c.proxima_acao ?? '',
      proximaAcaoEm: c.proxima_acao_em ?? '',
      corretorNome: (c.usuarios as unknown as { nome: string })?.nome ?? '',
    })),
  }
}

// ─── Seção 7: Metas ──────────────────────────────────────────────────────────

export async function metasGestao(filtros?: GestaoFiltros): Promise<GestaoMeta> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)

  // Busca todos os corretores ativos
  const { data: corretores } = await supabase.from('usuarios').select('id').eq('ativo', true)
  const todosIds = (corretores ?? []).map((c) => c.id)

  // Produção agregada de todos no período
  const { data: prodTodos } = await supabase
    .from('producao_diaria')
    .select('*')
    .in('usuario_id', todosIds)
    .gte('data', dataInicio)
    .lte('data', dataFim)

  // Produção individual
  const { data: prodIndividual } = await supabase
    .from('producao_diaria')
    .select('*')
    .eq('usuario_id', user!.id)
    .gte('data', dataInicio)
    .lte('data', dataFim)

  const soma = (rows: typeof prodTodos) =>
    (rows ?? []).reduce((acc, p) => {
      acc.vendas += p.vendas
      acc.aprovacoes += p.aprovacoes
      acc.agendamentos += p.agendamentos
      acc.comparecimentos += p.comparecimentos
      acc.pastas += p.pastas
      return acc
    }, { vendas: 0, aprovacoes: 0, agendamentos: 0, comparecimentos: 0, pastas: 0 })

  const realizadoEquipe = soma(prodTodos)
  const realizadoIndividual = soma(prodIndividual)

  // Meta: proporcional aos dias do período vs dias do mês
  const diasPeriodo = Math.max(1, Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / 86400000) + 1)
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const fator = diasPeriodo / diasMes

  // Metas mensais por corretor
  const metaBase = { vendas: 4, aprovacoes: 8, agendamentos: 40, comparecimentos: 30, pastas: 20 }
  const numCorretores = todosIds.length || 1

  const metaEquipe = {
    vendas: Math.round(metaBase.vendas * numCorretores * fator),
    aprovacoes: Math.round(metaBase.aprovacoes * numCorretores * fator),
    agendamentos: Math.round(metaBase.agendamentos * numCorretores * fator),
    comparecimentos: Math.round(metaBase.comparecimentos * numCorretores * fator),
    pastas: Math.round(metaBase.pastas * numCorretores * fator),
  }

  const metaIndividual = {
    vendas: Math.round(metaBase.vendas * fator),
    aprovacoes: Math.round(metaBase.aprovacoes * fator),
    agendamentos: Math.round(metaBase.agendamentos * fator),
    comparecimentos: Math.round(metaBase.comparecimentos * fator),
    pastas: Math.round(metaBase.pastas * fator),
  }

  // Percentuais (média dos % de cada métrica)
  const calcPct = (real: typeof realizadoEquipe, meta: typeof metaEquipe) => {
    const pcts = [
      meta.vendas > 0 ? Math.min(100, (real.vendas / meta.vendas) * 100) : 0,
      meta.aprovacoes > 0 ? Math.min(100, (real.aprovacoes / meta.aprovacoes) * 100) : 0,
      meta.agendamentos > 0 ? Math.min(100, (real.agendamentos / meta.agendamentos) * 100) : 0,
      meta.comparecimentos > 0 ? Math.min(100, (real.comparecimentos / meta.comparecimentos) * 100) : 0,
      meta.pastas > 0 ? Math.min(100, (real.pastas / meta.pastas) * 100) : 0,
    ]
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  }

  const percentualEquipe = calcPct(realizadoEquipe, metaEquipe)
  const percentualIndividual = calcPct(realizadoIndividual, metaIndividual)

  // Projeção: ritmo atual * dias restantes
  const diasRestantes = diasRestantesNoMes()
  const ritmoDiarioVendas = diasPeriodo > 0 ? realizadoEquipe.vendas / diasPeriodo : 0
  const ritmoDiarioVGV = diasPeriodo > 0
    ? ((prodTodos ?? []).reduce((s, p) => s + p.pontuacao_gamificacao, 0) / diasPeriodo) * 1000 // estimativa
    : 0

  return {
    metaEquipe,
    metaIndividual,
    realizadoEquipe,
    realizadoIndividual,
    percentualEquipe,
    percentualIndividual,
    diasRestantes,
    projecaoFechamento: {
      vendas: Math.round(realizadoEquipe.vendas + ritmoDiarioVendas * diasRestantes),
      vgv: Math.round(ritmoDiarioVGV * diasRestantes),
    },
  }
}