'use server'

// DNA CRM — Sprint 13: Server Actions para CRUD de Automações
// Permite criar, editar, ativar/desativar e excluir regras de automação.

import { requireRole } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'
import type { AutomationEvent, AutomationCondition, AutomationActionSpec } from '@/src/lib/automation/types'

export interface NovaAutomacaoInput {
  nome: string
  descricao: string
  evento: AutomationEvent
  condicoes: AutomationCondition[]
  acoes: AutomationActionSpec[]
  status: 'ATIVA' | 'INATIVA'
  prioridade: number
}

export interface EditarAutomacaoInput extends Partial<NovaAutomacaoInput> {
  id: string
}

/**
 * Cria uma nova regra de automação.
 */
export async function criarAutomacao(input: NovaAutomacaoInput) {
  await requireRole('GERENTE')
  const supabase = await createSupabaseServerClient()

  if (!input.nome || !input.evento) {
    return { sucesso: false, erro: 'Nome e evento são obrigatórios' }
  }

  const { error } = await supabase.from('automacoes').insert({
    nome: input.nome,
    descricao: input.descricao,
    evento: input.evento,
    condicoes: input.condicoes,
    acoes: input.acoes,
    status: input.status,
    prioridade: input.prioridade,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  })

  if (error) {
    return { sucesso: false, erro: error.message }
  }

  revalidatePath('/dashboard/automacoes')
  return { sucesso: true }
}

/**
 * Atualiza uma automação existente.
 */
export async function editarAutomacao(input: EditarAutomacaoInput) {
  await requireRole('GERENTE')
  const supabase = await createSupabaseServerClient()

  const update: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if (input.nome !== undefined) update.nome = input.nome
  if (input.descricao !== undefined) update.descricao = input.descricao
  if (input.evento !== undefined) update.evento = input.evento
  if (input.condicoes !== undefined) update.condicoes = input.condicoes
  if (input.acoes !== undefined) update.acoes = input.acoes
  if (input.prioridade !== undefined) update.prioridade = input.prioridade

  const { error } = await supabase
    .from('automacoes')
    .update(update)
    .eq('id', input.id)

  if (error) return { sucesso: false, erro: error.message }

  revalidatePath('/dashboard/automacoes')
  return { sucesso: true }
}

/**
 * Altera o status de uma automação (ATIVA/INATIVA).
 */
export async function alterarStatusAutomacao(id: string, novoStatus: 'ATIVA' | 'INATIVA') {
  await requireRole('GERENTE')
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('automacoes')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return { sucesso: false, erro: error.message }

  revalidatePath('/dashboard/automacoes')
  return { sucesso: true }
}

/**
 * Exclusão lógica de uma automação.
 */
export async function excluirAutomacao(id: string) {
  await requireRole('GERENTE')
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('automacoes')
    .update({ deleted_at: new Date().toISOString(), status: 'INATIVA', atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return { sucesso: false, erro: error.message }

  revalidatePath('/dashboard/automacoes')
  return { sucesso: true }
}

/**
 * Processa a fila manualmente (dispara o motor).
 */
export async function processarFilaAgora() {
  await requireRole('GERENTE')
  const { dispatchProcessarFila } = await import('@/src/lib/automation/engine')

  try {
    const resultado = await dispatchProcessarFila()
    revalidatePath('/dashboard/automacoes')
    return { sucesso: true, ...resultado }
  } catch (err: unknown) {
    return { sucesso: false, erro: err instanceof Error ? err.message : 'Erro ao processar fila' }
  }
}