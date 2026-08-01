'use server'

import { requireAuth } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { hoje, inicioDoMes, ultimoDiaDoMes } from '@/src/lib/analytics'
import { queryResumoOperacao, queryKPIsDiarios, queryRanking, queryFunilGerencial, queryAlertas, queryMetas } from '@/src/lib/server/queries-compartilhadas'
import type {
  GestaoResumoOperacao,
  GestaoKPI,
  GestaoRankingItem,
  GestaoFunilEtapa,
  GestaoAlertas,
  GestaoMeta,
} from '@/src/types'

export interface OperacaoDadosIniciais {
  resumo: GestaoResumoOperacao
  atividadesRecentes: {
    id: string
    created_at: string
    tipo: string
    resultado: string | null
    usuarioNome: string
    clienteNome: string
    clienteId: string
    etapaAtual: string | null
    empreendimentoInteresse: string | null
  }[]
  kpis: GestaoKPI[]
  ranking: GestaoRankingItem[]
  funil: GestaoFunilEtapa[]
  alertas: GestaoAlertas
  metas: GestaoMeta
  corretoresMonitor: {
    id: string
    nome: string
    avatarUrl: string | null
    statusUsuario: string
    ultimaAtividade: string | null
    minutosSemAtividade: number
    ligacoes: number
    whatsapps: number
    followUps: number
    agendamentos: number
    comparecimentos: number
    pastas: number
    percentualMeta: number
  }[]
  // Sprint 14 — novos dados
  heatmap: HeatmapDados[]
  produtividadeEquipe: ProdutividadeSeries[]
}

export async function operacaoDadosIniciais(): Promise<OperacaoDadosIniciais> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const iniMes = inicioDoMes()
  const fimMes = ultimoDiaDoMes()

  // ─── Resumo, KPIs, Ranking, Funil, Alertas, Metas (compartilhados) ───
  const resumo = await queryResumoOperacao({ inicio: iniMes, fim: fimMes })

  const { data: corretores } = await supabase.from('usuarios').select('id').eq('status_usuario', 'ATIVO').is('deleted_at', null)
  const ids = (corretores ?? []).map((c) => c.id)

  const [kpis, ranking, funil, alertas] = await Promise.all([
    queryKPIsDiarios(ids, hojeStr),
    queryRanking(),
    queryFunilGerencial(),
    queryAlertas(),
  ])
  const metas = await queryMetas({ corretoresIds: ids, inicio: iniMes, fim: fimMes, vgvMes: resumo.vgvMes })

  // ─── Atividades recentes (últimas 50 para timeline) ───
  const { data: atividades } = await supabase
    .from('atividades')
    .select('id, created_at, tipo, resultado, usuarios!inner(nome), clientes!inner(nome, id, etapa_atual, empreendimento_interesse)')
    .order('created_at', { ascending: false })
    .limit(50)

  const atividadesRecentes = (atividades ?? []).map((a) => ({
    id: a.id,
    created_at: a.created_at,
    tipo: a.tipo,
    resultado: a.resultado,
    usuarioNome: (a.usuarios as unknown as { nome: string })?.nome ?? '',
    clienteNome: (a.clientes as unknown as { nome: string })?.nome ?? '',
    clienteId: (a.clientes as unknown as { id: string })?.id ?? '',
    etapaAtual: (a.clientes as unknown as { etapa_atual: string })?.etapa_atual ?? null,
    empreendimentoInteresse: (a.clientes as unknown as { empreendimento_interesse: string })?.empreendimento_interesse ?? null,
  }))

  // ─── Monitor da equipe ───
  const { data: prodHoje } = ids.length > 0 ? await supabase.from('producao_diaria').select('*').in('usuario_id', ids).eq('data', hojeStr) : { data: [] }
  const { data: corretoresFull } = await supabase.from('usuarios').select('id, nome, avatar_url, status_usuario, ultima_atividade_em').eq('status_usuario', 'ATIVO').is('deleted_at', null)
  const agora = Date.now()
  const corretoresMonitor = (corretoresFull ?? []).map((c) => {
    const p = (prodHoje ?? []).find((x) => x.usuario_id === c.id)
    const lig = p?.ligacoes ?? 0; const wha = p?.whatsapp ?? 0; const fol = p?.follow_ups ?? 0
    const age = p?.agendamentos ?? 0; const comp = p?.comparecimentos ?? 0; const pas = p?.pastas ?? 0
    const pcts = [Math.min(100, (lig / 80) * 100), Math.min(100, (wha / 40) * 100), Math.min(100, (fol / 20) * 100), Math.min(100, (age / 2) * 100), Math.min(100, (comp / 2) * 100), Math.min(100, (pas / 1) * 100)]
    const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    const minSemAtividade = c.ultima_atividade_em ? Math.floor((agora - new Date(c.ultima_atividade_em as string).getTime()) / 60000) : 999
    return { id: c.id, nome: c.nome, avatarUrl: c.avatar_url, statusUsuario: c.status_usuario, ultimaAtividade: c.ultima_atividade_em as string | null, minutosSemAtividade: minSemAtividade, ligacoes: lig, whatsapps: wha, followUps: fol, agendamentos: age, comparecimentos: comp, pastas: pas, percentualMeta: pct }
  })

  // ─── Sprint 14: Heatmap e Produtividade ───
  const [heatmap, produtividadeEquipe] = await Promise.all([
    queryHeatmapProducao(),
    queryProdutividadeEquipe(),
  ])

  return { resumo, atividadesRecentes, kpis, ranking, funil, alertas, metas, corretoresMonitor, heatmap, produtividadeEquipe }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sprint 14 — Queries adicionais: Heatmap, Fila de Trabalho, Produtividade
// ──────────────────────────────────────────────────────────────────────────────

export interface HeatmapDados {
  corretorId: string
  nome: string
  horas: { hora: number; valor: number }[]
}

export interface FilaTrabalhoItem {
  clienteId: string
  clienteNome: string
  acao: string
  motivo: string
  score: number
  prazo: string | null
  etapa: string
  corretor: string
}

export interface ProdutividadeSeries {
  label: string
  data: { dia: string; valor: number }[]
}

/**
 * Query do heatmap: produção por corretor × hora do dia (últimos 7 dias)
 */
export async function queryHeatmapProducao(): Promise<HeatmapDados[]> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: atividades } = await supabase
    .from('atividades')
    .select('usuario_id, created_at')
    .gte('created_at', seteDiasAtras)
    .order('created_at', { ascending: false })

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome')
    .eq('ativo', true)
    .is('deleted_at', null)

  if (!atividades || !usuarios) return []

  // Grupo por corretor × hora
  const mapa = new Map<string, Map<number, number>>()
  for (const a of atividades) {
    const hora = new Date(a.created_at).getHours()
    const uid = a.usuario_id
    if (!mapa.has(uid)) mapa.set(uid, new Map())
    const hMap = mapa.get(uid)!
    hMap.set(hora, (hMap.get(hora) ?? 0) + 1)
  }

  return usuarios.map((u) => {
    const hMap = mapa.get(u.id) ?? new Map()
    const horas: { hora: number; valor: number }[] = []
    for (let h = 0; h < 24; h++) {
      horas.push({ hora: h, valor: hMap.get(h) ?? 0 })
    }
    return { corretorId: u.id, nome: u.nome, horas }
  })
    .sort((a, b) => b.horas.reduce((s, h) => s + h.valor, 0) - a.horas.reduce((s, h) => s + h.valor, 0))
    .slice(0, 10)
}

/**
 * Fila de trabalho inteligente — clientes prioritários para o corretor logado
 */
export async function queryFilaTrabalho(corretorId: string): Promise<FilaTrabalhoItem[]> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual, ultima_atividade_em, proxima_acao, proxima_acao_em, corretor_responsavel_id, tempo_etapas, entrou_etapa_em, usuarios!inner(nome)')
    .eq('corretor_responsavel_id', corretorId)
    .not('etapa_atual', 'eq', 'POS_VENDA')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!clientes) return []

  const hojeStr = new Date().toISOString().slice(0, 10)

  const items: FilaTrabalhoItem[] = []

  for (const c of clientes) {
    const diasSemContato = c.ultima_atividade_em
      ? Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000)
      : 99

    // Score simplificado
    let score = 0
    if (diasSemContato >= 5) score += 300
    else if (diasSemContato >= 2) score += 150

    if (c.proxima_acao_em) {
      const diasAtePrazo = Math.floor((new Date(c.proxima_acao_em).getTime() - Date.now()) / 86400000)
      if (diasAtePrazo <= 0) score += 400
      else if (diasAtePrazo <= 2) score += 250
    }

    const etapaIdx = ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS'].indexOf(c.etapa_atual)
    if (etapaIdx >= 6) score += 200
    else if (etapaIdx >= 4) score += 100

    // Ação sugerida
    let acao = 'Contatar'
    let motivo = 'Cliente precisa de contato'
    if (c.proxima_acao_em) {
      const dias = Math.floor((new Date(c.proxima_acao_em).getTime() - Date.now()) / 86400000)
      if (dias <= 0) { acao = 'Ação vencida'; motivo = `"${c.proxima_acao ?? 'follow-up'}" vencido há ${Math.abs(dias)}d` }
      else if (dias <= 1) { acao = 'Agendamento próximo'; motivo = `"${c.proxima_acao ?? 'ação'}" em ${dias}d` }
    }
    if (diasSemContato >= 3) { motivo = `${diasSemContato}d sem contato` }

    items.push({
      clienteId: c.id,
      clienteNome: c.nome,
      acao,
      motivo,
      score,
      prazo: c.proxima_acao_em,
      etapa: c.etapa_atual,
      corretor: ((c.usuarios as unknown as { nome: string })?.nome) ?? 'Sem corretor',
    })
  }

  return items.sort((a, b) => b.score - a.score).slice(0, 10)
}

/**
 * Produtividade por equipe/turno — séries temporais dos últimos 30 dias
 */
export async function queryProdutividadeEquipe(): Promise<ProdutividadeSeries[]> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  const dias30Atras = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  // Busca equipes
  const { data: equipes } = await supabase
    .from('equipes')
    .select('id, nome, corretores:usuarios(id)')
    .is('deleted_at', null)

  // Busca produção
  const { data: prod } = await supabase
    .from('producao_diaria')
    .select('usuario_id, data, ligacoes, whatsapp, follow_ups')
    .gte('data', dias30Atras)

  const prodArr = (prod ?? []) as { usuario_id: string; ligacoes: number; whatsapp: number; follow_ups: number; data: string }[]

  return (equipes ?? []).map((eq) => {
    const corretorIds = (eq.corretores as { id: string }[]).map(c => c.id)
    const dailyMap = new Map<string, number>()

    for (const p of prodArr) {
      if (corretorIds.includes(p.usuario_id)) {
        const key = p.data
        const total = (p.ligacoes ?? 0) + (p.whatsapp ?? 0) + (p.follow_ups ?? 0)
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + total)
      }
    }

    // Preenche todos os últimos 30 dias (zero se sem produção)
    const data: { dia: string; valor: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      data.push({ dia: d, valor: dailyMap.get(d) ?? 0 })
    }

    return { label: eq.nome ?? `Equipe ${eq.id}`, data }
  })
}