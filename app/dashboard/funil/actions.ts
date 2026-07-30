'use server'

import { requireAuth } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import {
  PipelineClienteCard,
  PipelineClienteDetalhe,
  PipelineKPIs,
  PipelineAlertas,
  PipelineFiltros,
  EtapaFunil,
  PipelineTempoEtapa,
} from '@/src/types'
import { ETAPA_LABEL_SINGULAR, ETAPA_ORDEM } from '@/src/config/pipeline'

// ─── Listar clientes do pipeline por etapa ───────────────────────────────────

export async function listarClientesPipeline(filtros?: PipelineFiltros): Promise<Record<EtapaFunil, PipelineClienteCard[]>> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  let query = supabase.from('clientes')
    .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
    .is('deleted_at', null)
    .order('entrou_etapa_em', { ascending: true })

  if (filtros?.corretorId) query = query.eq('corretor_responsavel_id', filtros.corretorId)
  if (filtros?.empreendimentoId) query = query.eq('empreendimento_id', filtros.empreendimentoId)
  if (filtros?.etapa) query = query.eq('etapa_atual', filtros.etapa)
  if (filtros?.busca) query = query.or(`nome.ilike.%${filtros.busca}%,telefone.ilike.%${filtros.busca}%`)

  const { data: clientes } = await query

  // Busca pendências documentais em batch
  const ids = (clientes ?? []).map((c) => c.id)
  const { data: docsPendentes } = ids.length > 0
    ? await supabase.from('documentos').select('cliente_id').eq('status_validacao', 'PENDENTE').is('deleted_at', null).in('cliente_id', ids)
    : { data: [] }
  const clientesComDocPendente = new Set((docsPendentes ?? []).map((d) => d.cliente_id))

  // Busca próximos agendamentos
  const { data: agendamentos } = ids.length > 0
    ? await supabase.from('agendamentos')
        .select('cliente_id, data_hora, status')
        .in('cliente_id', ids)
        .gte('data_hora', new Date().toISOString())
        .in('status', ['AGENDADO', 'CONFIRMADO', 'REMARCADO'])
        .order('data_hora', { ascending: true })
    : { data: [] }
  const agendPorCliente: Record<string, { dataHora: string; status: string }> = {}
  for (const a of agendamentos ?? []) {
    if (!agendPorCliente[a.cliente_id]) {
      agendPorCliente[a.cliente_id] = { dataHora: a.data_hora, status: a.status }
    }
  }

  const hoje = Date.now()
  const resultado: Record<EtapaFunil, PipelineClienteCard[]> = {} as Record<EtapaFunil, PipelineClienteCard[]>
  for (const e of ETAPA_ORDEM) resultado[e] = []

  for (const c of clientes ?? []) {
    const etapa = c.etapa_atual as EtapaFunil
    const card: PipelineClienteCard = {
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      etapaAtual: etapa,
      entrouEtapaEm: c.entrou_etapa_em,
      diasNaEtapa: c.entrou_etapa_em
        ? Math.floor((hoje - new Date(c.entrou_etapa_em).getTime()) / 86400000)
        : 0,
      ultimaAtividadeEm: c.ultima_atividade_em,
      proximaAcao: c.proxima_acao,
      proximaAcaoEm: c.proxima_acao_em,
      vgv: c.vgv,
      empreendimentoInteresse: c.empreendimento_interesse,
      corretorNome: (c.usuarios as unknown as { nome: string })?.nome ?? '',
      pendenciaDoc: clientesComDocPendente.has(c.id),
      agendamentoProximo: agendPorCliente[c.id] ?? null,
      diasSemContato: c.ultima_atividade_em
        ? Math.floor((hoje - new Date(c.ultima_atividade_em).getTime()) / 86400000)
        : 999,
    }
    resultado[etapa].push(card)
  }

  return resultado
}

// ─── Mover cliente entre etapas ─────────────────────────────────────────────

export async function moverEtapa(clienteId: string, novaEtapa: EtapaFunil): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  // O trigger fn_pipeline_mudanca_etapa cuida de:
  // - Registrar tempo_etapas (saída da etapa anterior + entrada na nova)
  // - Atualizar entrou_etapa_em
  // - Auto-definir proxima_acao e proxima_acao_em

  const { error } = await supabase
    .from('clientes')
    .update({ etapa_atual: novaEtapa })
    .eq('id', clienteId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

// ─── Buscar detalhes do cliente para painel lateral ─────────────────────────

export async function buscarClienteDetalhe(id: string): Promise<PipelineClienteDetalhe | null> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: c } = await supabase
    .from('clientes')
    .select('*, usuarios!inner(nome), empreendimentos(nome)')
    .eq('id', id)
    .single()

  if (!c) return null

  const hoje = Date.now()

  const [docs, agends, ativs] = await Promise.all([
    supabase.from('documentos').select('id, tipo, status_validacao').eq('cliente_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
    supabase.from('agendamentos').select('id, data_hora, status').eq('cliente_id', id).order('data_hora', { ascending: false }).limit(10),
    supabase.from('atividades').select('tipo, resultado, created_at').eq('cliente_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  const tempoEtapas: PipelineTempoEtapa[] = Array.isArray(c.tempo_etapas)
    ? c.tempo_etapas.filter((t: unknown) => t && typeof t === 'object')
    : []

  const emp = c.empreendimentos as unknown as { nome: string } | null
  const usr = c.usuarios as unknown as { nome: string }

  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    etapaAtual: c.etapa_atual,
    entrouEtapaEm: c.entrou_etapa_em,
    diasNaEtapa: c.entrou_etapa_em ? Math.floor((hoje - new Date(c.entrou_etapa_em).getTime()) / 86400000) : 0,
    ultimaAtividadeEm: c.ultima_atividade_em,
    diasSemContato: Math.floor((hoje - new Date(c.ultima_atividade_em).getTime()) / 86400000),
    proximaAcao: c.proxima_acao,
    proximaAcaoEm: c.proxima_acao_em,
    vgv: c.vgv,
    comissaoValor: c.comissao_valor,
    empreendimentoInteresse: c.empreendimento_interesse,
    empreendimentoNome: emp?.nome ?? null,
    corretorNome: usr.nome,
    historicoEtapas: tempoEtapas,
    agendamentos: (agends.data ?? []).map((a) => ({ id: a.id, dataHora: a.data_hora, status: a.status })),
    documentos: (docs.data ?? []).map((d) => ({ id: d.id, tipo: d.tipo, status: d.status_validacao })),
    atividadesRecentes: (ativs.data ?? []).map((a) => ({ tipo: a.tipo, resultado: a.resultado, created_at: a.created_at })),
    pendenciaDoc: (docs.data ?? []).some((d) => d.status_validacao === 'PENDENTE'),
    pendenciaAcao: !c.proxima_acao || !c.proxima_acao_em || new Date(c.proxima_acao_em).getTime() < hoje,
  }
}

// ─── KPIs do Pipeline ────────────────────────────────────────────────────────

export async function pipelineKPIs(): Promise<PipelineKPIs> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const [
    { data: clientes },
    { data: tempoEtapas },
    { data: vgvEtapas },
  ] = await Promise.all([
    supabase.from('clientes').select('etapa_atual, vgv').is('deleted_at', null),
    supabase.rpc('fn_tempo_medio_etapas'),
    supabase.rpc('fn_vgv_por_etapa'),
  ])

  const totalClientes = (clientes ?? []).length
  const fechamentos = (clientes ?? []).filter((c) => c.etapa_atual === 'FECHAMENTOS').length
  const conversaoGeral = totalClientes > 0 ? Math.round((fechamentos / totalClientes) * 100) : 0

  const vgvTotal = (clientes ?? []).reduce((s, c) => s + (c.vgv ?? 0), 0)
  const vgvPrevisto = vgvTotal * 0.7 // 70% de fechamento estimado
  const comissaoPrevista = vgvPrevisto * 0.05 // ~5% de comissão média

  const tempoPorEtapa = (tempoEtapas ?? []).map((t: { etapa: string; tempo_medio_horas: number; quantidade: number }) => ({
    etapa: t.etapa as EtapaFunil,
    label: ETAPA_LABEL_SINGULAR[t.etapa as EtapaFunil] ?? t.etapa,
    tempoMedioHoras: t.tempo_medio_horas,
    quantidade: t.quantidade,
  }))

  const vgvPorEtapa = (vgvEtapas ?? []).map((v: { etapa: string; vgv_total: number; comissao_total: number; quantidade: number }) => ({
    etapa: v.etapa as EtapaFunil,
    label: ETAPA_LABEL_SINGULAR[v.etapa as EtapaFunil] ?? v.etapa,
    vgvTotal: v.vgv_total,
    comissaoTotal: v.comissao_total,
    quantidade: v.quantidade,
  }))

  const tempoMedioGeral = tempoPorEtapa.length > 0
    ? Math.round(tempoPorEtapa.reduce((s: number, t: { tempoMedioHoras: number }) => s + t.tempoMedioHoras, 0) / tempoPorEtapa.length)
    : 0

  return {
    clientesAtivos: totalClientes,
    tempoMedioGeralHoras: tempoMedioGeral,
    conversaoGeral,
    vgvTotalNegociacao: vgvTotal,
    vgvPrevisto,
    comissaoPrevista,
    tempoPorEtapa,
    vgvPorEtapa,
  }
}

// ─── Alertas do Pipeline ─────────────────────────────────────────────────────

export async function pipelineAlertas(): Promise<PipelineAlertas> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  const tresDias = new Date(Date.now() - 3 * 86400000).toISOString()
  const seteDias = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { data: semContato },
    { data: parados },
    { data: docsPend },
    { data: aprovadosSemVisita },
    { data: semAcao },
    { data: comVisita },
  ] = await Promise.all([
    // Sem contato há +3 dias
    supabase.from('clientes')
      .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
      .lt('ultima_atividade_em', tresDias)
      .is('deleted_at', null)
      .order('ultima_atividade_em', { ascending: true })
      .limit(20),

    // Parados na etapa há +7 dias (etapas ativas)
    supabase.from('clientes')
      .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
      .lt('entrou_etapa_em', seteDias)
      .in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS'])
      .is('deleted_at', null)
      .order('entrou_etapa_em', { ascending: true })
      .limit(20),

    // Aguardando documentos (etapas ANALISE, RESTRICOES, CONDICIONADOS, APROVADOS)
    supabase.from('clientes')
      .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
      .in('etapa_atual', ['ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS'])
      .is('deleted_at', null)
      .order('entrou_etapa_em', { ascending: true })
      .limit(20),

    // Aguardando aprovação (CONDICIONADOS)
    supabase.from('clientes')
      .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
      .eq('etapa_atual', 'CONDICIONADOS')
      .is('deleted_at', null)
      .order('entrou_etapa_em', { ascending: true })
      .limit(20),

    // Sem próxima ação definida
    supabase.from('clientes')
      .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
      .is('proxima_acao', null)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(20),

    // Com visita marcada
    supabase.from('clientes')
      .select('id, nome, telefone, etapa_atual, entrou_etapa_em, ultima_atividade_em, proxima_acao, proxima_acao_em, vgv, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
      .in('etapa_atual', ['AGENDAMENTO', 'COMPARECIMENTO'])
      .is('deleted_at', null)
      .order('entrou_etapa_em', { ascending: true })
      .limit(20),
  ])

  function toCard(c: Record<string, unknown>): PipelineClienteCard {
    return {
      id: c.id as string,
      nome: c.nome as string,
      telefone: c.telefone as string,
      etapaAtual: c.etapa_atual as EtapaFunil,
      entrouEtapaEm: c.entrou_etapa_em as string | null,
      diasNaEtapa: (c.entrou_etapa_em as string)
        ? Math.floor((Date.now() - new Date(c.entrou_etapa_em as string).getTime()) / 86400000)
        : 0,
      ultimaAtividadeEm: c.ultima_atividade_em as string | null,
      proximaAcao: c.proxima_acao as string | null,
      proximaAcaoEm: c.proxima_acao_em as string | null,
      vgv: c.vgv as number | null,
      empreendimentoInteresse: c.empreendimento_interesse as string | null,
      corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '',
      pendenciaDoc: false,
      agendamentoProximo: null,
      diasSemContato: (c.ultima_atividade_em as string)
        ? Math.floor((Date.now() - new Date(c.ultima_atividade_em as string).getTime()) / 86400000)
        : 999,
    }
  }

  return {
    semContato: (semContato ?? []).map(toCard),
    paradosNaEtapa: (parados ?? []).map(toCard),
    aguardandoDocumentos: (docsPend ?? []).map(toCard),
    aguardandoAprovacao: (aprovadosSemVisita ?? []).map(toCard),
    semProximaAcao: (semAcao ?? []).map(toCard),
    comVisitaMarcada: (comVisita ?? []).map(toCard),
  }
}