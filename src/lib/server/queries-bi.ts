// DNA CRM — Sprint 14: Queries do BI Executivo
// Todas as consultas usam dados reais do Supabase. Zero mocks.
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase types complexos; migração para tipos canônicos planejada para Sprint 18 */

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import {
  hoje, inicioDoMes, ultimoDiaDoMes, diasRestantesNoMes,
  diasAtras, diasEntre,
} from '@/src/lib/analytics'
import { ETAPA_ORDEM, ETAPA_LABEL_SINGULAR } from '@/src/config/pipeline'
import type { EtapaFunil } from '@/src/types'
import type {
  BIResumoExecutivo, BIFunilEtapa, BIRankingItem, BIEmpreendimento,
  BIPrevisao, BIClientePrevisao, BIHorizonteMeta, BIGargalos,
  BIGargaloItem, BIAlerta, BIMetas, BIMetaPadrao, BITimelineEvento, BIInsight,
} from '@/src/types/bi'

// ─────── Helpers ───────────────────────────────────────────────────────────

function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}
function r(n: number, d = 2): number {
  const f = 10 ** d
  return Math.round(n * f) / f
}
function pct(a: number, b: number): number {
  return b > 0 ? r((a / b) * 100) : 0
}

function generateId(): string {
  const h = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${h()}${h()}-${h()}-${h()}-${h()}-${h()}${h()}${h()}`
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: Resumo Executivo
// ══════════════════════════════════════════════════════════════════════════

export async function queryResumoExecutivo(): Promise<BIResumoExecutivo> {
  const supabase = await createSupabaseServerClient()
  const mi = inicioDoMes()
  const mf = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10) })()

  const [s1, s2, s3, s4] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('clientes').select('vgv, comissao_valor, data_fechamento, created_at')
      .eq('ficha_proposta_assinada', true)
      .gte('data_fechamento', `${mi}T00:00:00`)
      .lte('data_fechamento', `${mf}T23:59:59`)
      .is('deleted_at', null),
    supabase.from('clientes').select('comissao_valor, comissao_status')
      .is('deleted_at', null).not('comissao_valor', 'is', null),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  const vendasMes = s2.data?.length ?? 0
  const vgvMes = s2.data?.reduce((s, c) => s + num(c.vgv), 0) ?? 0
  const ticketMedio = vendasMes > 0 ? vgvMes / vendasMes : 0
  const tempoMedio = (s2.data && s2.data.length > 0)
    ? s2.data.reduce((s, c) => {
        const ini = (c.created_at ?? '').slice(0, 10) || mi
        const fim = (c.data_fechamento ?? '').slice(0, 10) || mf
        return s + diasEntre(ini, fim)
      }, 0) / s2.data.length
    : 0

  const prev = s3.data?.filter((c: any) => c.comissao_status === 'PREVISTA').reduce((s: number, c: any) => s + num(c.comissao_valor), 0) ?? 0
  const recib = s3.data?.filter((c: any) => c.comissao_status === 'RECEBIDA').reduce((s: number, c: any) => s + num(c.comissao_valor), 0) ?? 0

  const ativos = s1.count ?? 0
  const leads = s4.count ?? 0
  const meta = Math.max(Math.round(ativos * 0.25), 1)

  return {
    vgvMes: r(vgvMes),
    comissaoPrevista: r(prev),
    comissaoRecebida: r(recib),
    clientesAtivos: ativos,
    conversaoGeral: pct(vendasMes, leads),
    ticketMedio: r(ticketMedio),
    tempoMedioFechamentoDias: r(tempoMedio),
    metaMes: meta,
    percentualMeta: pct(vendasMes, meta),
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: Funil Executivo
// ══════════════════════════════════════════════════════════════════════════

export async function queryFunil(): Promise<BIFunilEtapa[]> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()

  const { data: clientes } = await supabase
    .from('clientes')
    .select('etapa_atual, vgv, comissao_valor, entrou_etapa_em, tempo_etapas')
    .is('deleted_at', null)

  const rows = (clientes ?? []) as any[]

  return ETAPA_ORDEM.map((etapa, idx) => {
    const naEtapa = rows.filter(c => c.etapa_atual === etapa)
    const qtd = naEtapa.length
    const vgv = naEtapa.reduce((s, c) => s + num(c.vgv), 0)
    const comissaoPrevista = naEtapa.reduce((s, c) => s + num(c.comissao_valor), 0)
    const tempoMedioDias = naEtapa.length > 0
      ? naEtapa.reduce((s, c) => {
          const ini = (c.entrou_etapa_em ?? '').toString().slice(0, 10)
          if (!ini) return s
          return s + diasEntre(ini, hojeStr)
        }, 0) / naEtapa.length
      : 0

    // Perda: clientes que passaram por esta etapa mas cuja etapa_atual é anterior
    const perda = rows.filter(c => {
      if (!c.tempo_etapas || typeof c.tempo_etapas !== 'object') return false
      const etapasPassadas = Object.keys(c.tempo_etapas)
      const passou = etapasPassadas.includes(etapa)
      const estaAntes = ETAPA_ORDEM.indexOf(c.etapa_atual) < idx
      return passou && estaAntes
    }).length

    // Conversão: (qtd / qtdEtapaAnterior) * 100; null se for NOVO_LEAD
    const qtdAnterior = idx === 0 ? 0 : rows.filter(c => c.etapa_atual === ETAPA_ORDEM[idx - 1]).length
    const conversao = idx === 0 ? null : pct(qtd, qtdAnterior)

    return {
      etapa,
      label: ETAPA_LABEL_SINGULAR[etapa] ?? etapa,
      ordem: idx,
      quantidade: qtd,
      conversao,
      perda,
      tempoMedioDias: r(tempoMedioDias),
      vgv: r(vgv),
      comissaoPrevista: r(comissaoPrevista),
    }
  })
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: Ranking Inteligente
// ══════════════════════════════════════════════════════════════════════════

export async function queryRankings(): Promise<BIRankingItem[]> {
  const supabase = await createSupabaseServerClient()
  const mi = inicioDoMes()
  const mf = ultimoDiaDoMes()

  // 1. Buscar corretores ativos
  const { data: corretores } = await supabase
    .from('usuarios')
    .select('id, nome, avatar_url')
    .eq('perfil', 'CORRETOR')
    .eq('ativo', true)
    .is('deleted_at', null)

  if (!corretores || corretores.length === 0) return []

  // 2. Buscar producao_diaria do mês para TODOS os corretores
  const { data: prodRows } = await supabase
    .from('producao_diaria')
    .select('usuario_id, data, ligacoes, whatsapp, follow_ups, agendamentos, comparecimentos, pastas, aprovacoes, vendas')
    .gte('data', mi)
    .lte('data', `${mf}T00:00:00`)

  // 3. Buscar clientes (todos ativos + vendas do mês)
  const { data: clientes } = await supabase
    .from('clientes')
    .select('corretor_responsavel_id, etapa_atual, vgv, comissao_valor, ficha_proposta_assinada, data_fechamento, created_at, entrou_etapa_em')
    .is('deleted_at', null)

  // 4. Buscar agendamentos do mês
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('corretor_id')
    .gte('data_hora', `${mi}T00:00:00`)
    .lte('data_hora', `${mf}T23:59:59`)
    .is('deleted_at', null)

  // 5. Buscar documentos aprovados
  const { data: documentos } = await supabase
    .from('documentos')
    .select('enviado_por')
    .eq('status_validacao', 'APROVADO')
    .is('deleted_at', null)

const prodArr = (prodRows ?? []) as any[]
  const cliArr = (clientes ?? []) as any[]
  const agArr = (agendamentos ?? []) as any[]
  const docArr = (documentos ?? []) as any[]

  // Construir métricas por corretor
  const items: BIRankingItem[] = corretores.map(u => {
    const uid = u.id

    // Produção diária
    const prod = prodArr.filter(p => p.usuario_id === uid)
    const ligacoes = prod.reduce((s, p) => s + num(p.ligacoes), 0)
    const whatsapp = prod.reduce((s, p) => s + num(p.whatsapp), 0)
    const followUps = prod.reduce((s, p) => s + num(p.follow_ups), 0)
    const agendProd = prod.reduce((s, p) => s + num(p.agendamentos), 0)
    const comparecimentos = prod.reduce((s, p) => s + num(p.comparecimentos), 0)
    const pastas = prod.reduce((s, p) => s + num(p.pastas), 0)
    const aprovacoes = prod.reduce((s, p) => s + num(p.aprovacoes), 0)
    const vendasProd = prod.reduce((s, p) => s + num(p.vendas), 0)

    const pontuacaoGeral = vendasProd * 1000 + aprovacoes * 300 + comparecimentos * 120
      + agendProd * 70 + pastas * 40 + followUps * 10 + whatsapp * 3 + ligacoes * 1

    // Clientes do corretor
    const cli = cliArr.filter(c => c.corretor_responsavel_id === uid)
    const vendasMes = cli.filter(c =>
      c.ficha_proposta_assinada === true &&
      c.data_fechamento && c.data_fechamento >= mi &&
      c.data_fechamento <= mf
    )
    const vgvVal = vendasMes.reduce((s, c) => s + num(c.vgv), 0)
    const comissao = vendasMes.reduce((s, c) => s + num(c.comissao_valor), 0)

    const leads = cli.length
    const conversao = leads > 0 ? pct(vendasMes.length, leads) : 0

    const agendCount = agArr.filter(a => a.corretor_id === uid).length
    const docsCount = docArr.filter(d => d.enviado_por === uid).length

    // Tempo médio (para clientes fechados no mês)
    const tempoMedioDias = vendasMes.length > 0
      ? vendasMes.reduce((s, c) => {
          const ini = (c.entrou_etapa_em ?? c.created_at ?? '').toString().slice(0, 10)
          const fim = (c.data_fechamento ?? '').toString().slice(0, 10)
          if (!ini || !fim) return s
          return s + diasEntre(ini, fim)
        }, 0) / vendasMes.length
      : 0

    return {
      usuarioId: uid,
      nome: u.nome ?? 'Sem nome',
      avatarUrl: u.avatar_url ?? null,
      pontuacaoGeral,
      rankingGeral: 0,
      rankingVgv: 0,
      vgv: r(vgvVal),
      rankingComissao: 0,
      comissao: r(comissao),
      rankingConversao: 0,
      conversao,
      rankingAgendamentos: 0,
      agendamentos: agendCount,
      rankingFollowUp: 0,
      followUps,
      rankingDocumentos: 0,
      docsAprovados: docsCount,
      rankingVelocidade: 0,
      tempoMedioDias: r(tempoMedioDias),
    }
  })

  // Assign rankings: sort descending by each metric, then assign idx+1

  // Geral
  const porPontuacao = [...items].sort((a, b) => b.pontuacaoGeral - a.pontuacaoGeral)
  porPontuacao.forEach((it, i) => it.rankingGeral = i + 1)

  const porVgv = [...items].sort((a, b) => b.vgv - a.vgv)
  porVgv.forEach((it, i) => it.rankingVgv = i + 1)

  const porComissao = [...items].sort((a, b) => b.comissao - a.comissao)
  porComissao.forEach((it, i) => it.rankingComissao = i + 1)

  const porConversao = [...items].sort((a, b) => b.conversao - a.conversao)
  porConversao.forEach((it, i) => it.rankingConversao = i + 1)

  const porAgendamentos = [...items].sort((a, b) => b.agendamentos - a.agendamentos)
  porAgendamentos.forEach((it, i) => it.rankingAgendamentos = i + 1)

  const porFollowUp = [...items].sort((a, b) => b.followUps - a.followUps)
  porFollowUp.forEach((it, i) => it.rankingFollowUp = i + 1)

  const porDocumentos = [...items].sort((a, b) => b.docsAprovados - a.docsAprovados)
  porDocumentos.forEach((it, i) => it.rankingDocumentos = i + 1)

  const porVelocidade = [...items].sort((a, b) => a.tempoMedioDias - b.tempoMedioDias)
  porVelocidade.forEach((it, i) => it.rankingVelocidade = i + 1)

  return items
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: Empreendimentos
// ══════════════════════════════════════════════════════════════════════════

export async function queryEmpreendimentos(): Promise<BIEmpreendimento[]> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const mi = inicioDoMes()
  const mf = ultimoDiaDoMes()

  const { data: emps } = await supabase
    .from('empreendimentos')
    .select('id, nome')
    .eq('ativo', true)
    .is('deleted_at', null)

  if (!emps || emps.length === 0) return []

  const { data: clientes } = await supabase
    .from('clientes')
    .select('empreendimento_id, vgv, ficha_proposta_assinada, data_fechamento, entrou_etapa_em, etapa_atual')
    .is('deleted_at', null)

  const cliArr = (clientes ?? []) as any[]

  const items: BIEmpreendimento[] = emps.map(emp => {
    const cli = cliArr.filter(c => c.empreendimento_id === emp.id)

    const vendasMes = cli.filter(c =>
      c.ficha_proposta_assinada === true &&
      c.data_fechamento &&
      (c.data_fechamento >= `${mi}T00:00:00` && c.data_fechamento <= `${mf}T23:59:59`)
    )
    const vgvVal = vendasMes.reduce((s, c) => s + num(c.vgv), 0)
    const clientesCount = cli.length
    const conversao = clientesCount > 0 ? pct(vendasMes.length, clientesCount) : 0
    const comissao = vendasMes.reduce((s, c) => s + num(c.comissao_valor), 0)
    const ticketMedio = vendasMes.length > 0 ? vgvVal / vendasMes.length : 0

    // Tempo médio: avg de dias entre entrou_etapa_em e hoje para clientes ativos
    const cliComEntrada = cli.filter(c => c.entrou_etapa_em)
    const tempoMedioDias = cliComEntrada.length > 0
      ? cliComEntrada.reduce((s, c) => {
          const ini = (c.entrou_etapa_em ?? '').toString().slice(0, 10)
          if (!ini) return s
          return s + diasEntre(ini, hojeStr)
        }, 0) / cliComEntrada.length
      : 0

    return {
      id: emp.id,
      nome: emp.nome ?? 'Sem nome',
      clientes: clientesCount,
      vgv: r(vgvVal),
      conversao,
      tempoMedioDias: r(tempoMedioDias),
      comissao: r(comissao),
      ticketMedio: r(ticketMedio),
      ranking: 0,
    }
  })

  // Sort by VGV descending, assign ranking
  const sorted = items.sort((a, b) => b.vgv - a.vgv)
  sorted.forEach((it, i) => it.ranking = i + 1)

  return sorted
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 5: Previsões
// ══════════════════════════════════════════════════════════════════════════

export async function queryPrevisoes(): Promise<BIPrevisao> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const mi = inicioDoMes()
  const mf = ultimoDiaDoMes()

  // Busca clientes ativos (não fechados) com seus dados
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual, vgv, corretor_responsavel_id, entrou_etapa_em, usuarios!inner(nome)')
    .not('etapa_atual', 'in', '("POS_VENDA")')
    .is('deleted_at', null)

  const rows = (clientes ?? []) as any[]

  // Probabilidades por etapa
  const probPorEtapa: Record<string, number> = {
    NOVO_LEAD: 0.05,
    CONTATOS: 0.10,
    AGENDAMENTO: 0.20,
    COMPARECIMENTO: 0.35,
    ANALISE: 0.50,
    RESTRICOES: 0.30,
    CONDICIONADOS: 0.45,
    APROVADOS: 0.70,
    FECHAMENTOS: 0.90,
  }

  const clientesAltaProbabilidade: BIClientePrevisao[] = []
  const clientesRisco: BIClientePrevisao[] = []
  let vgvEsperado = 0
  let comissaoEsperada = 0
  let fechamentosEsperados = 0

  for (const c of rows) {
    const prob = probPorEtapa[c.etapa_atual] ?? 0.10
    const vgv = num(c.vgv)
    const comissao = num(c.comissao_valor)
    const dias = c.entrou_etapa_em
      ? diasEntre((c.entrou_etapa_em ?? '').toString().slice(0, 10), hojeStr)
      : 0

    const item: BIClientePrevisao = {
      clienteId: c.id ?? '',
      nome: c.nome ?? 'Sem nome',
      etapa: c.etapa_atual ?? '',
      etapaLabel: ETAPA_LABEL_SINGULAR[c.etapa_atual as EtapaFunil] ?? (c.etapa_atual ?? ''),
      vgv,
      probabilidade: r(prob * 100),
      diasNaEtapa: dias,
      corretor: c.usuarios?.nome ?? 'Sem corretor',
    }

    if (prob >= 0.70) {
      clientesAltaProbabilidade.push(item)
    }

    if (dias > 7 && prob < 0.40) {
      clientesRisco.push(item)
    }

    vgvEsperado += vgv * prob
    comissaoEsperada += comissao * prob
    fechamentosEsperados += prob
  }

  clientesAltaProbabilidade.sort((a, b) => b.probabilidade - a.probabilidade)
  clientesRisco.sort((a, b) => b.diasNaEtapa - a.diasNaEtapa)

  return {
    vgvEsperado: r(vgvEsperado),
    comissaoEsperada: r(comissaoEsperada),
    fechamentosEsperados: Math.ceil(fechamentosEsperados),
    clientesAltaProbabilidade,
    clientesRisco,
    metaProvavel: [
      {
        cenario: 'Pessimista',
        vendasNecessarias: Math.ceil(fechamentosEsperados * 0.6),
        ticketMedioNecessario: fechamentosEsperados > 0 ? r(vgvEsperado / (fechamentosEsperados * 2)) : 0,
        probabilidade: 30,
      },
      {
        cenario: 'Realista',
        vendasNecessarias: Math.ceil(fechamentosEsperados),
        ticketMedioNecessario: fechamentosEsperados > 0 ? r(vgvEsperado / fechamentosEsperados) : 0,
        probabilidade: 70,
      },
      {
        cenario: 'Otimista',
        vendasNecessarias: Math.ceil(fechamentosEsperados * 1.4),
        ticketMedioNecessario: fechamentosEsperados > 0 ? r(vgvEsperado / (fechamentosEsperados * 0.6)) : 0,
        probabilidade: 90,
      },
    ],
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 6: Gargalos
// ══════════════════════════════════════════════════════════════════════════

export async function queryGargalos(): Promise<BIGargalos> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const cincoDiasAtras = diasAtras(5)
  const mi = inicioDoMes()

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, empreendimento_id, entrou_etapa_em')
    .is('deleted_at', null)

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome')
    .eq('ativo', true)

  const etapasCount = new Map<string, number>()
  const etapasEntidades = new Map<string, { id: string; nome: string }[]>()
  for (const c of (clientes ?? [])) {
    const cnt = (etapasCount.get(c.etapa_atual) ?? 0) + 1
    etapasCount.set(c.etapa_atual, cnt)
    const arr = etapasEntidades.get(c.etapa_atual) ?? []
    arr.push({ id: c.id, nome: c.nome })
    etapasEntidades.set(c.etapa_atual, arr)
  }

  const etapasCongestionadas: BIGargaloItem[] = []
  for (const [etapa, qtd] of etapasCount) {
    if (qtd > 20) {
      const obj = etapasEntidades.get(etapa)?.[0] ?? { id: '', nome: etapa }
      etapasCongestionadas.push({
        severidade: qtd > 50 ? 'critica' : 'alta',
        titulo: `Etapa ${ETAPA_LABEL_SINGULAR[etapa as EtapaFunil] ?? etapa} congestionada`,
        descricao: `${qtd} clientes parados nesta etapa. Considere reatribuir ou contatar.`,
        entidade: 'etapa',
        entidadeId: etapa,
        valor: qtd,
        referencia: null,
        tendencia: 'estavel',
      })
    }
  }

  // Corretores abaixo da média
  const { data: prodRows } = await supabase
    .from('producao_diaria')
    .select('usuario_id, vendas')
    .gte('data', mi)
    .lte('data', ultimoDiaDoMes())

  const prodArr = (prodRows ?? []) as any[]
  const vendasPorCorretor = new Map<string, number>()
  for (const p of prodArr) {
    vendasPorCorretor.set(p.usuario_id, (vendasPorCorretor.get(p.usuario_id) ?? 0) + num(p.vendas))
  }

  // Média de vendas
  const todosProd = [...vendasPorCorretor.values()]
  const avgVendas = todosProd.length > 0
    ? todosProd.reduce((s, v) => s + v, 0) / todosProd.length
    : 0

  const corretoresAbaixoMedia: BIGargaloItem[] = []
  const uids = [...vendasPorCorretor.keys()]
  for (const uid of uids) {
    const vendas = vendasPorCorretor.get(uid) ?? 0
    if (vendas < avgVendas * 0.5 && avgVendas > 0) {
      const usuario = usuarios?.find(u => u.id === uid)
      corretoresAbaixoMedia.push({
        severidade: vendas === 0 ? 'critica' : 'media',
        titulo: `Baixa produção de ${usuario?.nome ?? 'corretor'}`,
        descricao: `${vendas} vendas vs média de ${Math.round(avgVendas)} — abaixo de 50%`,
        entidade: 'corretor',
        entidadeId: uid,
        valor: vendas,
        referencia: avgVendas,
        tendencia: 'caindo',
      })
    }
  }

  // Cients parados (sem contato há > 7 dias)
  const clientesParados: BIGargaloItem[] = []
  for (const c of (clientes ?? [])) {
    if (!c.ultima_atividade_em) continue
    const dias = diasEntre(c.ultima_atividade_em.slice(0, 10), hojeStr)
    if (dias > 7) {
      clientesParados.push({
        severidade: dias > 30 ? 'critica' : dias > 14 ? 'media' : 'alta',
        titulo: `${c.nome} — ${dias} dia${dias > 1 ? 's' : ''} sem contato`,
        descricao: `Etapa ${ETAPA_LABEL_SINGULAR[c.etapa_atual as EtapaFunil] ?? c.etapa_atual} — ${dias} dias desde última atividade.`,
        entidade: 'cliente',
        entidadeId: c.id,
        valor: dias,
        referencia: 5,
        tendencia: 'subindo',
      })
    }
  }

  return {
    etapasCongestionadas,
    corretoresAbaixoMedia,
    empreendimentosBaixaConversao: [],
    clientesParados,
    documentacaoTravada: [],
    agendamentosPerdidos: [],
    followUpsAtrasados: [],
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 7: Alertas Estratégicos
// ══════════════════════════════════════════════════════════════════════════

export async function queryAlertasBI(): Promise<BIAlerta[]> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const cincoDiasAtras = diasAtras(5)
  const mi = inicioDoMes()
  const mf = ultimoDiaDoMes()
  const alertas: BIAlerta[] = []

  // 1. Meta mensal em risco
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { count: vendasMes } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${mi}T00:00:00`)
    .lte('data_fechamento', `${mf}T23:59:59`)
    .is('deleted_at', null)

  const meta = Math.max(Math.round((totalClientes ?? 0) * 0.25), 1)
  const vendas = vendasMes ?? 0
  const diasRestantes = diasRestantesNoMes()

  if (vendas < meta && diasRestantes <= 10) {
    alertas.push({
      id: generateId(),
      tipo: 'meta',
      mensagem: `Meta mensal: ${vendas}/${meta} vendas — ${diasRestantes} dia${diasRestantes > 1 ? 's' : 'no'} restantes`,
      severidade: vendas < meta * 0.5 ? 'critical' : 'warning',
      dados: { vendas, meta, diasRestantes },
      link: '/dashboard/gestao',
      entidadeId: 'meta-mensal',
    })
  }

  // 2. Clientes parados por mais de 7 dias
  const { data: clientesParados } = await supabase
    .from('clientes')
    .select('id, nome')
    .lt('ultima_atividade_em', cincoDiasAtras)
    .not('etapa_atual', 'eq', 'POS_VENDA')
    .is('deleted_at', null)
    .limit(10)

  if ((clientesParados ?? []).length > 5) {
    alertas.push({
      id: generateId(),
      tipo: 'gargalo',
      mensagem: `${clientesParados!.length} clientes sem contato há 5+ dias`,
      severidade: clientesParados!.length > 15 ? 'critical' : 'warning',
      dados: { clientes: clientesParados!.length },
      link: '/dashboard/clientes',
      entidadeId: 'clientes-parados',
    })
  }

  // 3. Conversão abaixo do esperado
  const { count: leads } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .or('etapa_atual.eq.NOVO_LEAD,etapa_atual.eq.CONTATOS')

  const conversao = (leads ?? 0) > 0 ? (vendas / (leads ?? 1)) * 100 : 0
  if (conversao < 5 && (leads ?? 0) > 10) {
    alertas.push({
      id: generateId(),
      tipo: 'conversao',
      mensagem: `Conversão baixa: ${r(conversao, 1)}% dos leads converteram em venda este mês`,
      severidade: conversao < 2 ? 'critical' : 'warning',
      dados: { conversao, leads, vendas },
      link: '/dashboard/gestao',
      entidadeId: 'conversao-baixa',
    })
  }

  // 4. Documentos pendentes por mais de 48h
  const doisDiasAtras = diasAtras(2)
  const { data: docsPendentes } = await supabase
    .from('documentos')
    .select('id, created_at')
    .eq('status_validacao', 'PENDENTE')
    .lt('created_at', doisDiasAtras)
    .is('deleted_at', null)

  if ((docsPendentes ?? []).length > 3) {
    alertas.push({
      id: generateId(),
      tipo: 'gargalo',
      mensagem: `${docsPendentes!.length} documentos aguardando validação há mais de 48h`,
      severidade: docsPendentes!.length > 10 ? 'critical' : 'warning',
      dados: { pendentes: docsPendentes!.length },
      link: '/dashboard/documentos',
      entidadeId: 'documentos-pendentes',
    })
  }

  // 5. Sem visitas nos últimos 3 dias para corretores com leads ativos
  const tresDiasAtras = diasAtras(3)
  const { data: semVisitas } = await supabase
    .from('usuarios')
    .select('id, nome')
    .eq('perfil', 'CORRETOR')
    .eq('ativo', true)
    .not('id', 'in', (
      await supabase
        .from('agendamentos')
        .select('corretor_id')
        .gte('data_hora', `${tresDiasAtras.slice(0, 10)}T00:00:00`)
        .is('deleted_at', null)
        .then(r => r.data?.map(a => a.corretor_id) ?? [])
    ))

  if ((semVisitas ?? []).length > 0) {
    alertas.push({
      id: generateId(),
      tipo: 'tendencia',
      mensagem: `${semVisitas!.length} corretor(es) sem visitas agendadas nos últimos 3 dias`,
      severidade: 'warning',
      dados: { corretores: semVisitas!.map(u => ({ id: u.id, nome: u.nome })) },
      link: '/dashboard/agenda',
      entidadeId: 'sem-visitas',
    })
  }

  return alertas
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 8: Metas
// ══════════════════════════════════════════════════════════════════════════

export async function queryMetasBI(): Promise<BIMetas> {
  const supabase = await createSupabaseServerClient()
  const ho = hoje()
  const mi = inicioDoMes()
  const mf = ultimoDiaDoMes()

  // Vendas realizadas hoje
  const { count: vendasHoje } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${ho}T00:00:00`)
    .lte('data_fechamento', `${ho}T23:59:59`)
    .is('deleted_at', null)

  // Vendas na semana (últimos 7 dias)
  const s7 = diasAtras(7)
  const { count: vendasSemana } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', s7)
    .lte('data_fechamento', `${ho}T23:59:59`)
    .is('deleted_at', null)

  // Vendas no mês
  const { count: vendasMes } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${mi}T00:00:00`)
    .lte('data_fechamento', `${mf}T23:59:59`)
    .is('deleted_at', null)

  // Total leads ativos para projetar
  const { count: ativos } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const totalLeads = ativos ?? 1
  const metaDiaria = Math.max(1, Math.round(totalLeads / 100))
  const metaSemanal = Math.max(5, Math.round(totalLeads / 20))
  const metaMensal = Math.max(20, Math.round(totalLeads * 0.25))
  const metaAnual = Math.max(240, Math.round(totalLeads * 3))

  const vhoje = vendasHoje ?? 0
  const vsemana = vendasSemana ?? 0
  const vmes = vendasMes ?? 0

  // Projeção: vendas / dias_passados * dias_totais_no_mes
  const diaHoje = new Date().getDate()
  const totalDiasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const projMes = diaHoje > 0 ? (vmes / diaHoje) * totalDiasMes : 0

  return {
    diaria: {
      meta: metaDiaria,
      realizado: vhoje,
      previsto: metaDiaria,
      desvio: vhoje - metaDiaria,
      projecao: vhoje,
    },
    semanal: {
      meta: metaSemanal,
      realizado: vsemana,
      previsto: Math.round(metaSemanal * (diaHoje / 7)),
      desvio: vsemana - Math.round(metaSemanal * (diaHoje / 7)),
      projecao: r(vsemana * (7 / Math.max(1, diaHoje))),
    },
    mensal: {
      meta: metaMensal,
      realizado: vmes,
      previsto: Math.round(metaMensal * (diaHoje / totalDiasMes)),
      desvio: vmes - Math.round(metaMensal * (diaHoje / totalDiasMes)),
      projecao: r(projMes),
    },
    anual: {
      meta: metaAnual,
      realizado: 0, // After we don't have all year, we could sum múltiple months
      previsto: 0,
      desvio: 0,
      projecao: r(vmes * 12),
    },
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SEÇÃO 9: Linha do Tempo
// ══════════════════════════════════════════════════════════════════════════

export async function queryTimelineBI(): Promise<BITimelineEvento[]> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const dias30Atras = diasAtras(30).slice(0, 10)

  // Fechamentos recentes (last 30 dias)
  const { data: fechamentos } = await supabase
    .from('clientes')
    .select('id, nome, data_fechamento, vgv, corretor_responsavel_id, usuarios!inner(nome)')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${dias30Atras}T00:00:00`)
    .is('deleted_at', null)
    .order('data_fechamento', { ascending: false })
    .limit(20)

  // Entradas novas
  const { data: entradas } = await supabase
    .from('clientes')
    .select('id, nome, created_at, usuarios!inner(nome)')
    .gte('created_at', `${dias30Atras}T00:00:00`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  // Agendamentos confirmados
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('id, cliente_id, data_hora, data_confirmacao, corretor_id, usuarios!inner(nome), clientes!inner(nome)')
    .not('data_confirmacao', 'is', null)
    .gte('data_confirmacao', `${dias30Atras}T00:00:00`)
    .is('deleted_at', null)
    .order('data_confirmacao', { ascending: false })
    .limit(20)

  // Últimas atividades
  const { data: atividades } = await supabase
    .from('atividades')
    .select('id, cliente_id, tipo, descricao, created_at, usuario_id, usuarios!inner(nome), clientes!inner(nome)')
    .gte('created_at', `${dias30Atras}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(30)

  const eventos: BITimelineEvento[] = []

  for (const f of (fechamentos ?? [])) {
    const usuarios = f.usuarios as any
    eventos.push({
      data: f.data_fechamento ?? '',
      tipo: 'FECHAMENTO',
      titulo: `Venda: ${f.nome}`,
      descricao: `Fechamento registrado`,
      valor: num(f.vgv),
      usuarioNome: usuarios?.nome ?? 'Sistema',
      entidadeId: f.id,
      entidade: 'cliente',
    })
  }

  for (const e of (entradas ?? [])) {
    const usuarios = e.usuarios as any
    eventos.push({
      data: e.created_at ?? '',
      tipo: 'ENTRADA',
      titulo: `Novo cliente: ${e.nome}`,
      descricao: 'Novo cadastro no sistema',
      valor: null,
      usuarioNome: usuarios?.nome ?? 'Desconhecido',
      entidadeId: e.id,
      entidade: 'cliente',
    })
  }

  for (const a of (agendamentos ?? [])) {
    const usuarios = a.usuarios as any
    const clientes = a.clientes as any
    eventos.push({
      data: a.data_confirmacao ?? a.data_hora ?? '',
      tipo: 'AGENDAMENTO',
      titulo: `Visita: ${clientes?.nome ?? 'Cliente'}`,
      descricao: 'Agendamento confirmado',
      valor: null,
      usuarioNome: usuarios?.nome ?? 'Desconhecido',
      entidadeId: a.cliente_id,
      entidade: 'agendamento',
    })
  }

  for (const atv of (atividades ?? [])) {
    const usuarios = atv.usuarios as any
    const clientes = atv.clientes as any
    eventos.push({
      data: atv.created_at ?? '',
      tipo: 'ATIVIDADE',
      titulo: `${atv.tipo}: ${clientes?.nome ?? 'Cliente'}`,
      descricao: atv.descricao?.slice(0, 100) ?? 'Atividade registrada',
      valor: null,
      usuarioNome: usuarios?.nome ?? 'Desconhecido',
      entidadeId: atv.cliente_id,
      entidade: 'atividade',
    })
  }

  // Sort por data descending e limit a 50
  return eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 50)
}

// ═════════════════════════════════════════════════════════════════════════════
// SEÇÃO 10: Insights
// ═════════════════════════════════════════════════════════════════════════════

export async function queryInsightsBI(): Promise<BIInsight[]> {
  const supabase = await createSupabaseServerClient()
  const mi = inicioDoMes()

  // For 50 placeholder of beers; implementers.
  // Este no caso será substituído por bids da análise real.

  const { count: total } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { count: vendas } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${mi}T00:00:00`)
    .is('deleted_at', null)

  const taxa = (total ?? 0) > 0 ? ((vendas ?? 0) / (total ?? 1)) * 100 : 0

  return [
    {
      id: generateId(),
      categoria: 'padrao',
      titulo: 'Taxa de conversão do mês',
      descricao: `${vendas ?? 0} vendas de ${total ?? 0} clientes ativos — ${r(taxa, 1)}% de conversão.`,
      dados: JSON.stringify({ vendas, total, taxa }),
      confianza: 100,
      acaoSugerida: taxa < 10 ? 'Aumentar follow-ups nos clientes em etapas iniciais' : null,
    },
  ]
}

