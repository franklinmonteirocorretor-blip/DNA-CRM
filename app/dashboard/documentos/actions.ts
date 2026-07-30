'use server'

import { requireAuth } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'
import {
  PainelDocumentos,
  ClienteDossie,
  EtapaFunil,
  TipoDocumento,
  StatusValidacaoDoc,
  CHECKLIST_OBRIGATORIO,
} from '@/src/types'
import { dispatchAutomation } from '@/src/lib/automation/engine'

// ─── Painel gerencial de documentos ──────────────────────────────────────────

export async function painelDocumentos(): Promise<PainelDocumentos> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  // Todos os clientes ativos
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)')
    .is('deleted_at', null)
    .in('etapa_atual', ['ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS'])

  const ids = (clientes ?? []).map((c) => c.id)

  // Todos os documentos desses clientes
  const { data: docs } = ids.length > 0
    ? await supabase.from('documentos').select('*').in('cliente_id', ids).is('deleted_at', null)
    : { data: [] }

  const docsPorCliente: Record<string, { aprovados: number; pendentes: number; rejeitados: number; ultimo: string | null }> = {}
  for (const d of docs ?? []) {
    if (!docsPorCliente[d.cliente_id]) docsPorCliente[d.cliente_id] = { aprovados: 0, pendentes: 0, rejeitados: 0, ultimo: null }
    if (d.status_validacao === 'VALIDADO') docsPorCliente[d.cliente_id].aprovados++
    else if (d.status_validacao === 'REJEITADO') docsPorCliente[d.cliente_id].rejeitados++
    else docsPorCliente[d.cliente_id].pendentes++
    if (!docsPorCliente[d.cliente_id].ultimo || d.created_at > docsPorCliente[d.cliente_id].ultimo!) {
      docsPorCliente[d.cliente_id].ultimo = d.created_at
    }
  }

  const clientesResumo = (clientes ?? []).map((c) => {
    const etapa = c.etapa_atual as EtapaFunil
    const obrigatorios = CHECKLIST_OBRIGATORIO[etapa] ?? []
    const dc = docsPorCliente[c.id] ?? { aprovados: 0, pendentes: 0, rejeitados: 0, ultimo: null }
    const docsCliente = (docs ?? []).filter((d) => d.cliente_id === c.id)
    const aprovadosTipos = new Set(docsCliente.filter((d) => d.status_validacao === 'VALIDADO').map((d) => d.tipo))
    const checklistCompleto = obrigatorios.length === 0 || obrigatorios.every((t) => aprovadosTipos.has(t))

    return {
      clienteId: c.id,
      nome: c.nome,
      corretorNome: (c.usuarios as unknown as { nome: string })?.nome ?? '',
      etapaAtual: etapa,
      docsAprovados: dc.aprovados,
      docsPendentes: dc.pendentes,
      docsRejeitados: dc.rejeitados,
      checklistCompleto,
      ultimaAtualizacao: dc.ultimo,
    }
  })

  const totalClientes = clientesResumo.length
  const clientesCompleto = clientesResumo.filter((c) => c.checklistCompleto).length
  const documentosRejeitados = clientesResumo.reduce((s, c) => s + c.docsRejeitados, 0)

  // Tempo médio: do primeiro doc PENDENTE ao último VALIDADO (simplificado)
  const { data: tempos } = await supabase.rpc('fn_tempo_medio_etapas')
  const tempoDocs = (tempos ?? []).filter((t: { etapa: string }) =>
    ['ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS'].includes(t.etapa)
  )
  const tempoMedioConferenciaHoras = tempoDocs.length > 0
    ? Math.round(tempoDocs.reduce((s: number, t: { tempo_medio_horas: number }) => s + t.tempo_medio_horas, 0) / tempoDocs.length)
    : 0

  return {
    totalClientes,
    clientesCompleto,
    clientesPendentes: totalClientes - clientesCompleto,
    documentosRejeitados,
    tempoMedioConferenciaHoras,
    clientesResumo,
  }
}

// ─── Dossiê completo de um cliente ──────────────────────────────────────────

export async function clienteDossie(clienteId: string): Promise<ClienteDossie | null> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('nome, telefone, etapa_atual, empreendimento_interesse, corretor_responsavel_id, usuarios!inner(nome)')
    .eq('id', clienteId)
    .single()

  if (!cliente) return null

  const etapa = cliente.etapa_atual as EtapaFunil
  const obrigatorios = CHECKLIST_OBRIGATORIO[etapa] ?? []

  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const aprovadosTipos = new Set((documentos ?? []).filter((d) => d.status_validacao === 'VALIDADO').map((d) => d.tipo))
  const faltantes = obrigatorios.filter((t) => !aprovadosTipos.has(t))
  const checklistCompleto = obrigatorios.length === 0 || faltantes.length === 0

  const ultimaAtualizacao = documentos?.length ? documentos[0].created_at : null

  return {
    clienteId,
    clienteNome: cliente.nome,
    clienteTelefone: cliente.telefone,
    corretorNome: (cliente.usuarios as unknown as { nome: string })?.nome ?? '',
    etapaAtual: etapa,
    empreendimentoInteresse: cliente.empreendimento_interesse,
    checklistObrigatorio: obrigatorios,
    documentos: (documentos ?? []) as unknown as ClienteDossie['documentos'],
    faltantes,
    checklistCompleto,
    ultimaAtualizacao,
  }
}

// ─── Aprovar documento ───────────────────────────────────────────────────────

export async function aprovarDocumento(docId: string, observacoes?: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  // Busca dados do documento para o dispatch
  const { data: docAntes } = await supabase
    .from('documentos')
    .select('cliente_id, tipo')
    .eq('id', docId)
    .single()

  const { error } = await supabase
    .from('documentos')
    .update({ status_validacao: 'VALIDADO' as StatusValidacaoDoc, observacoes: observacoes ?? null, data_aprovacao: new Date().toISOString() })
    .eq('id', docId)
  if (error) return { success: false, error: error.message }

  dispatchAutomation('documento_aprovado', 'documento', docId, {
    documento_id: docId,
    cliente_id: docAntes?.cliente_id ?? null,
    tipo: docAntes?.tipo ?? null,
  })

  revalidatePath('/dashboard/documentos')
  return { success: true }
}

// ─── Rejeitar documento ──────────────────────────────────────────────────────

export async function rejeitarDocumento(docId: string, observacoes: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  // Busca dados do documento para o dispatch
  const { data: docAntes } = await supabase
    .from('documentos')
    .select('cliente_id, tipo')
    .eq('id', docId)
    .single()

  const { error } = await supabase
    .from('documentos')
    .update({ status_validacao: 'REJEITADO' as StatusValidacaoDoc, observacoes })
    .eq('id', docId)
  if (error) return { success: false, error: error.message }

  dispatchAutomation('documento_rejeitado', 'documento', docId, {
    documento_id: docId,
    cliente_id: docAntes?.cliente_id ?? null,
    tipo: docAntes?.tipo ?? null,
    motivo: observacoes,
  })

  revalidatePath('/dashboard/documentos')
  return { success: true }
}

// ─── Reenviar documento (upload de nova versão) ──────────────────────────────

export async function reenviarDocumento(docId: string, novaUrl: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('documentos')
    .update({ arquivo_url: novaUrl, status_validacao: 'PENDENTE' as StatusValidacaoDoc })
    .eq('id', docId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

// ─── Verificar checklist obrigatório (para bloqueio no Pipeline) ─────────────

export async function verificarChecklist(clienteId: string, etapa: EtapaFunil): Promise<{ completo: boolean; faltantes: TipoDocumento[] }> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  const obrigatorios = CHECKLIST_OBRIGATORIO[etapa] ?? []

  if (obrigatorios.length === 0) return { completo: true, faltantes: [] }

  const { data: docs } = await supabase
    .from('documentos')
    .select('tipo, status_validacao')
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)

  const aprovadosTipos = new Set((docs ?? []).filter((d) => d.status_validacao === 'VALIDADO').map((d) => d.tipo))
  const faltantes = obrigatorios.filter((t) => !aprovadosTipos.has(t))

  return { completo: faltantes.length === 0, faltantes }
}