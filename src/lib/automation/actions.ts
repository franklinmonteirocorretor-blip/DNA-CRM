// DNA CRM â€” Sprint 13: Executor de aÃ§Ãµes do motor de automaÃ§Ãµes
// Cada aÃ§Ã£o Ã© executada via Supabase no lado servidor.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import type { AutomationAction, AutomationEventPayload } from './types'

/**
 * FunÃ§Ã£o principal chamada pelo engine.ts via lazy import.
 * Roteia a aÃ§Ã£o para o handler correspondente.
 */
export async function executarAcao(
  acaoNome: string,
  acao: { acao: string; params: Record<string, unknown> },
  dados: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  const handlers: Record<string, (params: Record<string, unknown>, payload: AutomationEventPayload) => Promise<{ sucesso: boolean; erro?: string }>> = {
    criar_tarefa: handleCriarTarefa,
    criar_alerta: handleCriarAlerta,
    atualizar_proxima_acao: handleAtualizarProximaAcao,
    atualizar_prioridade: handleAtualizarPrioridade,
    atualizar_score: handleAtualizarScore,
    atualizar_dashboard: handleAtualizarDashboard,
    atualizar_gestao: handleAtualizarGestao,
    atualizar_operacao: handleAtualizarOperacao,
    atualizar_timeline: handleAtualizarTimeline,
    atualizar_kpis: handleAtualizarKPIs,
    registrar_auditoria: handleRegistrarAuditoria,
  }

  const handler = handlers[acao.acao]
  if (!handler) {
    return { sucesso: false, erro: `AÃ§Ã£o nÃ£o suportada: ${acao.acao}` }
  }

  return handler(acao.params, dados)
}

// â”€â”€â”€ Handlers de AÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Cria uma tarefa associada Ã  entidade do evento.
 * Params: { titulo, descricao, prazo_em, responsavel_id? }
 */
async function handleCriarTarefa(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from('automacao_tarefas').insert({
    titulo: (params.titulo as string) ?? `Tarefa automÃ¡tica: ${payload.evento}`,
    descricao: (params.descricao as string) ?? 'Tarefa criada pelo motor de automaÃ§Ãµes.',
    tipo: 'TAREFA',
    status: 'PENDENTE',
    entidade: payload.entidade,
    entidade_id: payload.entidade_id,
    responsavel_id: (params.responsavel_id as string) ?? null,
    prazo_em: (params.prazo_em as string) ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    origem: 'automacao',
    dados: payload.dados,
  })

  if (error) return { sucesso: false, erro: error.message }
  return { sucesso: true }
}

/**
 * Cria um alerta na tabela atividades com tipo 'ALERTA'.
 * Params: { titulo, mensagem, urgencia ('BAIXA'|'MEDIA'|'ALTA'), enviar_notificacao? }
 */
async function handleCriarAlerta(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  const supabase = await createSupabaseServerClient()

  const urgencia = (params.urgencia as string) ?? 'MEDIA'
  const titulo = (params.titulo as string) ?? `Alerta: ${payload.evento}`
  const mensagem = (params.mensagem as string) ?? `Evento ${payload.evento} disparado na entidade ${payload.entidade}/${payload.entidade_id}`

  try {
    const { error } = await supabase.from('automacao_tarefas').insert({
      titulo,
      descricao: mensagem,
      tipo: 'ALERTA',
      status: 'PENDENTE',
      entidade: payload.entidade,
      entidade_id: payload.entidade_id,
      prioridade: urgenciaParaNumero(urgencia),
      criado_em: new Date().toISOString(),
      origem: 'automacao',
      dados: payload.dados,
    })

    if (error) return { sucesso: false, erro: error.message }
    return { sucesso: true }
  } catch (err: unknown) {
    return { sucesso: false, erro: (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

/**
 *a Atualiza prÃ³xima aÃ§Ã£o do cliente.
 * Params: { acao, prazo_em }
 */
async function handleAtualizarProximaAcao(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  if (payload.entidade !== 'cliente') {
    return { sucesso: false, erro: 'Entidade nÃ£o Ã© cliente' }
  }

  const supabase = await createSupabaseServerClient()

  const update: Record<string, unknown> = {}
  if (params.acao) update.proxima_acao = params.acao as string
  if (params.prazo_em) update.proxima_acao_em = params.prazo_em as string

  const { error } = await supabase
    .from('clientes')
    .update(update)
    .eq('id', payload.entidade_id)

  if (error) return { sucesso: false, erro: error.message }
  return { sucesso: true }
}

/**
 *a Pioridade nÃ£o Ã© coluna persistida. Esta aÃ§Ã£o atualmente Ã© no-op
 * mas atualiza a coluna `proxima_acao_em` como proxy para deadline de
 * visibilidade nos alertas. */
async function handleAtualizarPrioridade(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  if (payload.entidade !== 'cliente') {
    return { sucesso: false, erro: 'Prioridade sÃ³ aplicÃ¡vel a cliente' }
  }

  const supabase = await createSupabaseServerClient()
  const prioridadeHoras = Number(params.prazo_horas) || 24

  const { error } = await supabase
    .from('clientes')
    .update({ proxima_acao_em: new Date(Date.now() + prioridadeHoras * 3600000).toISOString() })
    .eq('id', payload.entidade_id)

  if (error) return { sucesso: false, erro: error.message }
  return { sucesso: true }
}

/**
 *U Score nÃ£o Ã© coluna, mas podemos registrar no histÃ³rico ou log como mÃ©trica.
 * Atualiza Ãºltimo_contato_em para marcar atividade recent (proxy de engajamento).
 */
async function handleAtualizarScore(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  if (payload.entidade !== 'cliente') {
    return { sucesso: false, erro: 'Score sÃ³ aplicÃ¡vel a cliente' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('clientes')
    .update({ ultima_atividade_em: new Date().toISOString() })
    .eq('id', payload.entidade_id)

  if (error) return { sucesso: false, erro: error.message }
  return { sucesso: true }
}

/**
 * ForÃ§a revalidaÃ§Ã£o do dashboard via Next.js.
 */
async function handleAtualizarDashboard(
  _params: Record<string, unknown>,
  _payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    // revalidatePath a ser chamado via import { revalidatePath } organisado na execucao
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard')
    return { sucesso: true }
  } catch (err: unknown) {
    return { sucesso: false, erro: (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

/**
 * ForÃ§a revalidaÃ§Ã£o do painel de gestÃ£o.
 */
async function handleAtualizarGestao(
  _params: Record<string, unknown>,
  _payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard/gestao')
    return { sucesso: true }
  } catch (err: unknown) {
    return { sucesso: false, erro: (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

/**
 * ForÃ§a revalidaÃ§Ã£o do painel de operaÃ§Ã£o.
 */
async function handleAtualizarOperacao(
  _params: Record<string, unknown>,
  _payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard/operacao')
    return { sucesso: true }
  } catch (err: unknown) {
    return { sucesso: false, erro: (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

/**
 * Atualiza a timeline (historico_acoes) com entrada via stored procedure em vez de trigger.
 * Nota: O sistema normalemnete usa triggers para AUTOINSERT. Este Ã© um complemento manual.
 */
async function handleAtualizarTimeline(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  const supabase = await createSupabaseServerClient()
  const observacao = (params.observacao as string) ?? `AutomaÃ§Ã£o: ${payload.evento}`

  const { error } = await supabase.rpc('registrar_auditoria_auto', {
    p_entidade: payload.entidade,
    p_entidade_id: payload.entidade_id,
    p_acao: 'CRIACAO',
    p_observacao: observacao,
    p_dados_novos: payload.dados,
  })

  if (error) return { sucesso: false, erro: error.message }
  return { sucesso: true }
}

/**
 * Se nÃ£o hÃºm alteraÃ§Ã£o concreta que modifique KPIs, apenas forÃ§a revalidate dos paths relevantes.
 */
async function handleAtualizarKPIs(
  _params: Record<string, unknown>,
  _payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard/gestao')
    revalidatePath('/dashboard/operacao')
    return { sucesso: true }
  } catch (err: unknown) {
    return { sucesso: false, erro: (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

/**
 * Registra uma auditoria manual sem depender dos triggers.
 * Usa stored proc definida em migration para bypassing RLS.
 */
async function handleRegistrarAuditoria(
  params: Record<string, unknown>,
  payload: AutomationEventPayload,
): Promise<{ sucesso: boolean; erro?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('registrar_auditoria_auto', {
   p_entidade: payload.entidade,
   p_entidade_id: payload.entidade_id,
   p_acao: params.acao as string ?? 'ATUALIZACAO',
   p_observacao: (params.observacao as string) ?? `Motor de automaÃ§Ã£o: ${payload.evento}`,
   p_dados_novos: payload.dados,
  })

  if (error) return { sucesso: false, erro: error.message }
  return { sucesso: true }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ UtilitÃ¡rios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function urgenciaParaNumero(urgencia: string): number {
  switch (urgencia) {
    case 'ALTA': return 1
    case 'MEDIA': return 2
    case 'BAIXA': return 3
    default: return 2
  }
}

// AÃ§Ã£o(tipo) prioridade
// 1 = ALTA, 2 = MÃ‰DIA, 3 = BAIXA â€” nÃºmeros beneficiaries fixos
