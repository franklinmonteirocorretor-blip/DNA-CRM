// ─── Actions do Módulo Financeiro (Sprint 11) ────────────────────────────────

'use server'

import { requirePermission } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { throwOnError } from '@/src/lib/server/safeQuery'
import { hoje, inicioDoMes, ultimoDiaDoMes } from '@/src/lib/analytics'
import { dispatchAutomation } from '@/src/lib/automation/engine'
import type {
  ComissaoItem,
  ComissaoStatus,
  FinanceiroFiltros,
  FinanceiroResumo,
  FinanceiroProducao,
  FinanceiroRankingItem,
  FinanceiroEmpreendimento,
  FinanceiroPrevisao,
} from '@/src/types/financeiro'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolverPeriodo(filtros?: FinanceiroFiltros): { inicio: string; fim: string } {
  if (filtros?.periodo === 'personalizado' && filtros.dataInicio && filtros.dataFim) {
    return { inicio: filtros.dataInicio, fim: filtros.dataFim }
  }
  if (filtros?.periodo === 'semana') {
    const d = new Date()
    const dia = d.getDay()
    const diff = dia === 0 ? 6 : dia - 1
    const seg = new Date(d); seg.setDate(d.getDate() - diff); seg.setHours(0, 0, 0, 0)
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999)
    return { inicio: seg.toISOString().slice(0, 10), fim: dom.toISOString().slice(0, 10) }
  }
  if (filtros?.periodo === 'ano') {
    const ano = new Date().getFullYear()
    return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }
  }
  return { inicio: inicioDoMes(), fim: ultimoDiaDoMes() }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder type
function aplicarFiltrosBase(query: any, filtros?: FinanceiroFiltros) {
  if (filtros?.corretorId) query = query.eq('corretor_responsavel_id', filtros.corretorId)
  if (filtros?.empreendimentoId) query = query.eq('empreendimento_id', filtros.empreendimentoId)
  if (filtros?.status && filtros.status !== 'TODOS') query = query.eq('comissao_status', filtros.status)
  return query
}

// ─── SEÇÃO 1: Resumo ─────────────────────────────────────────────────────────

export async function financeiroResumo(filtros?: FinanceiroFiltros): Promise<FinanceiroResumo> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { inicio, fim } = resolverPeriodo(filtros)

  let query = supabase.from('clientes')
    .select('vgv, comissao_valor, comissao_status')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${inicio}T00:00:00`)
    .lte('data_fechamento', `${fim}T23:59:59`)
    .is('deleted_at', null)
  query = aplicarFiltrosBase(query, filtros)
  const data = await throwOnError(query)

  const vendas = data ?? []
  const vgvTotal = vendas.reduce((s, v) => s + (v.vgv ?? 0), 0)
  const comissaoPrevista = vendas
    .filter((v) => v.comissao_status === 'PREVISTA')
    .reduce((s, v) => s + (v.comissao_valor ?? 0), 0)
  const comissaoRecebida = vendas
    .filter((v) => v.comissao_status === 'RECEBIDA')
    .reduce((s, v) => s + (v.comissao_valor ?? 0), 0)
  const comissaoTotal = vendas.reduce((s, v) => s + (v.comissao_valor ?? 0), 0)

  return {
    vgvMes: vgvTotal,
    comissaoPrevista,
    comissaoRecebida,
    comissaoPendente: comissaoTotal - comissaoRecebida,
    ticketMedio: vendas.length > 0 ? Math.round(vgvTotal / vendas.length) : 0,
    totalVendas: vendas.length,
  }
}

// ─── SEÇÃO 2: Tabela de Comissões ────────────────────────────────────────────

export async function listarComissoes(filtros?: FinanceiroFiltros): Promise<ComissaoItem[]> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { inicio, fim } = resolverPeriodo(filtros)

  let query = supabase.from('clientes')
    .select(`
      id, nome, vgv, comissao_percentual, comissao_valor, comissao_status,
      comissao_data_prevista, comissao_data_recebimento, data_fechamento,
      empreendimentos (nome), usuarios!inner (nome)
    `)
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${inicio}T00:00:00`)
    .lte('data_fechamento', `${fim}T23:59:59`)
    .is('deleted_at', null)
    .order('data_fechamento', { ascending: false })

  query = aplicarFiltrosBase(query, filtros)
  const data = await throwOnError(query)

  return (data ?? []).map((c) => {
    const item = c as unknown as {
      id: string; nome: string; vgv: number; comissao_percentual: number | null; comissao_valor: number | null;
      comissao_status: ComissaoStatus; comissao_data_prevista: string | null; comissao_data_recebimento: string | null;
      data_fechamento: string | null; empreendimentos: { nome: string } | null; usuarios: { nome: string } | null
    }
    return {
      clienteId: item.id,
      clienteNome: item.nome,
      empreendimentoNome: item.empreendimentos?.nome ?? null,
      corretorNome: item.usuarios?.nome ?? '',
      vgv: item.vgv ?? 0,
      percentual: item.comissao_percentual ?? null,
      valor: item.comissao_valor ?? null,
      status: item.comissao_status,
      dataPrevista: item.comissao_data_prevista ?? null,
      dataRecebimento: item.comissao_data_recebimento ?? null,
      dataFechamento: item.data_fechamento ?? null,
    }
  })
}

// ─── SEÇÃO 3: Produção Financeira ─────────────────────────────────────────────

export async function producaoFinanceira(
  agrupamento: 'monthly' | 'weekly' | 'annual',
  filtros?: FinanceiroFiltros,
): Promise<FinanceiroProducao[]> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { inicio, fim } = resolverPeriodo(filtros)

  let query = supabase.from('clientes')
    .select('data_fechamento, vgv, comissao_valor')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${inicio}T00:00:00`)
    .lte('data_fechamento', `${fim}T23:59:59`)
    .is('deleted_at', null)
    .order('data_fechamento', { ascending: true })
  query = aplicarFiltrosBase(query, filtros)
  const data = await throwOnError(query)

  const rows = data ?? []
  const grupos: Record<string, FinanceiroProducao> = {}

  for (const r of rows) {
    const d = r.data_fechamento ? r.data_fechamento.slice(0, 10) : ''
    let key: string
    if (agrupamento === 'monthly') {
      key = d.slice(0, 7)
    } else if (agrupamento === 'weekly') {
      const date = new Date(d + 'T00:00:00')
      const seg = new Date(date)
      seg.setDate(date.getDate() - ((date.getDay() + 6) % 7))
      key = seg.toISOString().slice(0, 10)
    } else {
      key = d.slice(0, 4)
    }
    if (!grupos[key]) {
      grupos[key] = { periodo: key, vgv: 0, comissoes: 0, vendas: 0 }
    }
    grupos[key].vgv += r.vgv ?? 0
    grupos[key].comissoes += r.comissao_valor ?? 0
    grupos[key].vendas += 1
  }

  return Object.values(grupos).sort((a, b) => a.periodo.localeCompare(b.periodo))
}

// ─── SEÇÃO 4: Ranking Financeiro ─────────────────────────────────────────────

export async function rankingFinanceiro(filtros?: FinanceiroFiltros): Promise<FinanceiroRankingItem[]> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { inicio, fim } = resolverPeriodo(filtros)

  let query = supabase.from('clientes')
    .select('id, corretor_responsavel_id, vgv, comissao_valor, etapa_atual, usuarios (nome)')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${inicio}T00:00:00`)
    .lte('data_fechamento', `${fim}T23:59:59`)
    .is('deleted_at', null)
  query = aplicarFiltrosBase(query, filtros)
  const data = await throwOnError(query)

  type AccItem = { nome: string; vgv: number; comissoes: number; vendas: Set<string> }
  const porCorretor: Record<string, AccItem> = {}
  for (const c of data ?? []) {
    const id = c.corretor_responsavel_id
    if (!porCorretor[id]) {
      porCorretor[id] = {
        nome: (c.usuarios as unknown as { nome: string } | null)?.nome ?? 'Desconhecido',
        vgv: 0, comissoes: 0, vendas: new Set(),
      }
    }
    porCorretor[id].vgv += c.vgv ?? 0
    porCorretor[id].comissoes += c.comissao_valor ?? 0
    porCorretor[id].vendas.add(c.id)
  }

  const corretorIds = Object.keys(porCorretor)
  const totalClientes = corretorIds.length > 0
    ? await throwOnError(supabase.from('clientes')
        .select('corretor_responsavel_id')
        .in('corretor_responsavel_id', corretorIds)
        .is('deleted_at', null))
    : []

  const totalPorCorretor: Record<string, number> = {}
  for (const c of totalClientes ?? []) {
    totalPorCorretor[c.corretor_responsavel_id] = (totalPorCorretor[c.corretor_responsavel_id] ?? 0) + 1
  }

  return Object.entries(porCorretor)
    .sort(([, a], [, b]) => b.vgv - a.vgv)
    .map(([id, d]) => ({
      corretorId: id,
      corretorNome: d.nome,
      vgv: d.vgv,
      comissoes: d.comissoes,
      ticketMedio: Math.round(d.vgv / Math.max(1, d.vendas.size)),
      conversao: totalPorCorretor[id]
        ? Math.round((d.vendas.size / totalPorCorretor[id]) * 100)
        : 0,
      vendas: d.vendas.size,
    }))
}

// ─── SEÇÃO 5: Empreendimentos ─────────────────────────────────────────────────

export async function empreendimentosFinanceiro(
  filtros?: FinanceiroFiltros,
): Promise<FinanceiroEmpreendimento[]> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { inicio, fim } = resolverPeriodo(filtros)

  let query = supabase.from('clientes')
    .select('id, empreendimento_id, vgv, comissao_valor, empreendimentos (nome)')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${inicio}T00:00:00`)
    .lte('data_fechamento', `${fim}T23:59:59`)
    .is('deleted_at', null)
  query = aplicarFiltrosBase(query, filtros)
  const data = await throwOnError(query)

  type EmpAcc = { nome: string; vgv: number; comissoes: number; clientes: Set<string> }
  const porEmpreendimento: Record<string, EmpAcc> = {}
  const CHAVE_SEM_EMPREENDIMENTO = '__sem_empreendimento'

  for (const c of data ?? []) {
    const eid = c.empreendimento_id ?? CHAVE_SEM_EMPREENDIMENTO
    if (!porEmpreendimento[eid]) {
      porEmpreendimento[eid] = {
        nome: ((c.empreendimentos as unknown) as { nome: string })?.nome ?? 'Sem empreendimento',
        vgv: 0, comissoes: 0, clientes: new Set(),
      }
    }
    porEmpreendimento[eid].vgv += c.vgv ?? 0
    porEmpreendimento[eid].comissoes += c.comissao_valor ?? 0
    porEmpreendimento[eid].clientes.add(c.id)
  }

  return Object.entries(porEmpreendimento)
    .sort(([, a], [, b]) => b.vgv - a.vgv)
    .map(([id, d]) => ({
      empreendimentoId: id === CHAVE_SEM_EMPREENDIMENTO ? null : id,
      empreendimentoNome: d.nome,
      vgv: d.vgv,
      comissoes: d.comissoes,
      clientes: d.clientes.size,
      conversao: 0,
    }))
}

// ─── SEÇÃO 6: Previsão ───────────────────────────────────────────────────────

export async function previsaoComissoes(
  filtros?: FinanceiroFiltros,
): Promise<FinanceiroPrevisao> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const now = new Date()
  const mais7 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)
  const mais30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)
  const mais90 = new Date(now.getTime() + 90 * 86400000).toISOString().slice(0, 10)

  let query = supabase.from('clientes')
    .select('id, nome, comissao_valor, comissao_data_prevista')
    .eq('ficha_proposta_assinada', true)
    .eq('comissao_status', 'PREVISTA')
    .is('deleted_at', null)
    .not('comissao_data_prevista', 'is', null)
    .order('comissao_data_prevista', { ascending: true })
  query = aplicarFiltrosBase(query, filtros)
  const data = await throwOnError(query)

  let p7 = 0; let p30 = 0; let p90 = 0
  const detalhes: { clienteId: string; clienteNome: string; valor: number; dataPrevista: string }[] = []

  for (const c of data ?? []) {
    const valor = c.comissao_valor ?? 0
    const data = c.comissao_data_prevista ?? ''
    if (!data) continue

    if (data <= mais7) p7 += valor
    if (data <= mais30) p30 += valor
    if (data <= mais90) p90 += valor

    if (data <= mais90) {
      detalhes.push({ clienteId: c.id, clienteNome: c.nome, valor, dataPrevista: data })
    }
  }

  return { proximos7Dias: p7, proximos30Dias: p30, proximos90Dias: p90, detalhes }
}

// ─── Mutação: Atualizar status da comissão (legado, mantido para compatibilidade) ─

/** @deprecated Use registrarRecebimento, cancelarComissao ou reativarComissao */
export async function atualizarComissao(
  clienteId: string,
  novoStatus: ComissaoStatus,
  dataRecebimento?: string,
): Promise<{ success: boolean; error?: string }> {
  await requirePermission('financeiro', 'editar')
  const supabase = await createSupabaseServerClient()

  const update: Record<string, string | null> = { comissao_status: novoStatus }
  if (novoStatus === 'RECEBIDA') {
    update.comissao_data_recebimento = dataRecebimento || hoje()
  }

  const { error } = await supabase
    .from('clientes')
    .update(update)
    .eq('id', clienteId)

  if (error) return { success: false, error: error.message }

  if (novoStatus === 'RECEBIDA') {
    dispatchAutomation('comissao_recebida', 'cliente', clienteId, {
      cliente_id: clienteId,
      data_recebimento: dataRecebimento || hoje(),
    })
  }

  return { success: true }
}

// ─── SEÇÃO 8: Ações de Gestão (Sprint 13) ────────────────────────────────────

import { gestaoComissaoDB } from '@/src/services/financeiro'

type GestaoResultado = { sucesso: boolean; erro?: string }

export async function registrarRecebimento(
  clienteId: string,
  _observacao?: string,
): Promise<GestaoResultado> {
  await requirePermission('financeiro', 'confirmar_recebimento')

  const resultado = await gestaoComissaoDB(clienteId, 'RECEBIDA')
  if (!resultado.sucesso) return resultado

  // Gatilho de automação
  dispatchAutomation('comissao_recebida', 'cliente', clienteId, {
    cliente_id: clienteId,
    data_recebimento: new Date().toISOString().slice(0, 10),
  })

  return { sucesso: true }
}

export async function cancelarComissao(
  clienteId: string,
  _observacao?: string,
): Promise<GestaoResultado> {
  await requirePermission('financeiro', 'editar')

  const resultado = await gestaoComissaoDB(clienteId, 'CANCELADA')
  if (!resultado.sucesso) return resultado

  return { sucesso: true }
}

export async function reativarComissao(
  clienteId: string,
  _observacao?: string,
): Promise<GestaoResultado> {
  await requirePermission('financeiro', 'editar')

  const resultado = await gestaoComissaoDB(clienteId, 'REATIVADA')
  if (!resultado.sucesso) return resultado

  return { sucesso: true }
}

// ─── Dados completos do dashboard ─────────────────────────────────────────────

export interface FinanceiroDadosCompletos {
  resumo: FinanceiroResumo
  comissoes: ComissaoItem[]
  producao: FinanceiroProducao[]
  ranking: FinanceiroRankingItem[]
  empreendimentos: FinanceiroEmpreendimento[]
  previsao: FinanceiroPrevisao
  corretores: { id: string; nome: string }[]
  empreendimentosList: { id: string; nome: string }[]
}

export async function financeiroDadosIniciais(
  filtros?: FinanceiroFiltros,
): Promise<FinanceiroDadosCompletos> {
  await requirePermission('financeiro', 'visualizar')
  const supabase = await createSupabaseServerClient()

  const [
    resumo,
    comissoes,
    producao,
    ranking,
    empreendimentos,
    previsao,
    { data: corretores },
    { data: emps },
  ] = await Promise.all([
    financeiroResumo(filtros),
    listarComissoes(filtros),
    producaoFinanceira('monthly', filtros),
    rankingFinanceiro(filtros),
    empreendimentosFinanceiro(filtros),
    previsaoComissoes(filtros),
    supabase.from('usuarios').select('id, nome').eq('ativo', true).is('deleted_at', null),
    supabase.from('empreendimentos').select('id, nome').eq('ativo', true).is('deleted_at', null),
  ])

  return {
    resumo,
    comissoes,
    producao,
    ranking,
    empreendimentos,
    previsao,
    corretores: (corretores ?? []).map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })),
    empreendimentosList: (emps ?? []).map((e: { id: string; nome: string }) => ({ id: e.id, nome: e.nome })),
  }
}