'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { hoje, inicioDoMes, ultimoDiaDoMes, diasRestantesNoMes } from '@/src/lib/analytics'
import { queryResumoOperacao, queryKPIsDiarios, queryRanking, queryFunilGerencial, queryAlertas, queryMetas } from '@/src/lib/server/queries-compartilhadas'
import {
  GestaoResumoOperacao,
  GestaoKPI,
  GestaoRankingItem,
  GestaoFunilEtapa,
  GestaoProducaoSerie,
  GestaoAlertas,
  GestaoMeta,
  GestaoFiltros,
} from '@/src/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function aplicarFiltrosPeriodo(filtros?: GestaoFiltros): { dataInicio: string; dataFim: string } {
  if (filtros?.periodo === 'personalizado' && filtros.dataInicio && filtros.dataFim) {
    return { dataInicio: filtros.dataInicio, dataFim: filtros.dataFim }
  }
  if (filtros?.periodo === 'semana') {
    const hojeDate = new Date()
    const diaSemana = hojeDate.getDay()
    const diff = diaSemana === 0 ? 6 : diaSemana - 1
    const seg = new Date(hojeDate)
    seg.setDate(hojeDate.getDate() - diff)
    seg.setHours(0, 0, 0, 0)
    const dom = new Date(seg)
    dom.setDate(seg.getDate() + 6)
    dom.setHours(23, 59, 59, 999)
    return { dataInicio: seg.toISOString().slice(0, 10), dataFim: dom.toISOString().slice(0, 10) }
  }
  if (filtros?.periodo === 'hoje') {
    return { dataInicio: hoje(), dataFim: hoje() }
  }
  return { dataInicio: inicioDoMes(), dataFim: ultimoDiaDoMes() }
}

// ─── Seção 1: Resumo da Operação ─────────────────────────────────────────────

export async function resumoOperacao(filtros?: GestaoFiltros): Promise<GestaoResumoOperacao> {
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)
  return queryResumoOperacao({ inicio: dataInicio, fim: dataFim })
}

// ─── Seção 2: KPIs Diários ───────────────────────────────────────────────────

export async function kpisDiarios(filtros?: GestaoFiltros): Promise<GestaoKPI[]> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: usuario } = await supabase.from('usuarios').select('perfil').eq('id', user!.id).single()

  let corretorIds: string[]
  if (usuario?.perfil === 'CORRETOR') {
    corretorIds = [user!.id]
  } else {
    const { data: corretores } = await supabase.from('usuarios').select('id').eq('ativo', true)
    corretorIds = (corretores ?? []).map((c) => c.id)
  }

  if (filtros?.corretorId) {
    corretorIds = corretorIds.filter((id) => id === filtros.corretorId)
  }

  return queryKPIsDiarios(corretorIds, hoje())
}

// ─── Seção 3: Ranking ────────────────────────────────────────────────────────

export async function rankingGestao(filtros?: GestaoFiltros): Promise<GestaoRankingItem[]> {
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)
  return queryRanking({ dataInicio, dataFim })
}

// ─── Seção 4: Funil Gerencial ────────────────────────────────────────────────

export async function funilGerencial(filtros?: GestaoFiltros): Promise<GestaoFunilEtapa[]> {
  return queryFunilGerencial({
    corretorId: filtros?.corretorId ?? null,
    empreendimentoId: filtros?.empreendimentoId ?? null,
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

  const grupos: Record<string, GestaoProducaoSerie> = {}

  for (const p of rows) {
    let key: string
    if (agrupamento === 'weekly') {
      const d = new Date(p.data + 'T00:00:00')
      const seg = new Date(d)
      seg.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      key = seg.toISOString().slice(0, 10)
    } else {
      key = p.data.slice(0, 7)
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function alertasGestao(filtros?: GestaoFiltros): Promise<GestaoAlertas> {
  return queryAlertas()
}

// ─── Seção 7: Metas ──────────────────────────────────────────────────────────

export async function metasGestao(filtros?: GestaoFiltros): Promise<GestaoMeta> {
  const supabase = await createSupabaseServerClient()
  const { dataInicio, dataFim } = aplicarFiltrosPeriodo(filtros)

  const { data: corretores } = await supabase.from('usuarios').select('id').eq('ativo', true)
  const todosIds = (corretores ?? []).map((c) => c.id)

  const { data: vendasMes } = await supabase
    .from('clientes')
    .select('vgv')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${dataInicio}T00:00:00`)
    .lte('data_fechamento', `${dataFim}T23:59:59`)
    .is('deleted_at', null)
  const vgvMes = (vendasMes ?? []).reduce((s, v) => s + (v.vgv ?? 0), 0)

  return queryMetas({ corretoresIds: todosIds, inicio: dataInicio, fim: dataFim, vgvMes })
}