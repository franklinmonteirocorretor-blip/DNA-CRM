// DNA CRM — Sprint 13: Dispatch de eventos. Este é o entry point chamado
// por todas as actions da aplicação. Desacoplado do processamento.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import type { AutomationEvent, AutomationEventPayload } from './types'
import { logger } from '@/src/utils/logger'

/**
 * Dispara um evento no motor de automações.
 * Apenas insere na fila — não executa nada síncrono.
 *
 * Exemplo:
 *   await dispatchAutomation('cliente_criado', 'cliente', novoCliente.id, { nome: '...' })
 */
export async function dispatchAutomation(
  evento: AutomationEvent,
  entidade: string,
  entidadeId: string,
  dados: Record<string, unknown>,
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const supabase = await createSupabaseServerClient()

    const payload: AutomationEventPayload = {
      evento,
      entidade,
      entidade_id: entidadeId,
      dados,
      timestamp: new Date().toISOString(),
    }

    const { error } = await supabase.rpc('fn_automacao_dispatch', {
      p_evento: evento,
      p_entidade: entidade,
      p_entidade_id: entidadeId,
      p_payload: payload,
    })

    if (error) {
      logger.error(`Erro ao disparar evento ${evento}`, {
        event: evento,
        entity: entidade,
        entityId: entidadeId,
        error: error.message,
      })
      return { sucesso: false, erro: error.message }
    }

    return { sucesso: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no dispatch'
    logger.error(`Falha crítica ao disparar ${evento}`, { error: message, event: evento })
    return { sucesso: false, erro: message }
  }
}

/**
 * Processa toda a fila pendente (a ser chamado por cron job ou endpoint).
 */
export async function dispatchProcessarFila(): Promise<{
  processados: number
  erros: number
}> {
  const supabase = await createSupabaseServerClient()

  // Claim itens pendentes com row lock (race-condition safe)
  const { data: fila, error } = await supabase
    .rpc('fn_automacao_claim_fila', { p_limit: 50 })

  if (error || !fila || (fila as unknown[]).length === 0) return { processados: 0, erros: 0 }

  let processados = 0
  let erros = 0

  for (const item of fila as unknown as Record<string, unknown>[]) {
    try {
      const payload = item.payload as AutomationEventPayload
      const resultado = await processarEvento(payload, item.id as string)

      if (resultado.erro) {
        const maxTentativas = item.max_tentativas || 3
        const tentativasFeitas = item.tentativas || 0
        if (tentativasFeitas >= maxTentativas) {
          await supabase
            .from('automacoes_fila')
            .update({ status: 'FALHA', erro: resultado.erro, processado_em: new Date().toISOString() })
            .eq('id', item.id)
        } else {
          await supabase
            .from('automacoes_fila')
            .update({ status: 'PENDENTE', erro: resultado.erro })
            .eq('id', item.id)
        }
        erros++
      } else {
        await supabase
          .from('automacoes_fila')
          .update({ status: 'CONCLUIDO', processado_em: new Date().toISOString() })
          .eq('id', item.id)
        processados++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      await supabase
        .from('automacoes_fila')
        .update({ status: 'FALHA', erro: message, processado_em: new Date().toISOString() })
        .eq('id', item.id)
      erros++
    }
  }

  return { processados, erros }
}

/**
 * Processa um único evento contra todas as automações ativas.
 */
async function processarEvento(
  payload: AutomationEventPayload,
  _filaId: string,
): Promise<{ data?: unknown; erro?: string }> {
  const supabase = await createSupabaseServerClient()
  const inicio = Date.now()

  // Busca automações ativas para o evento
  const { data: automacoes } = await supabase
    .from('automacoes')
    .select('*')
    .eq('evento', payload.evento)
    .eq('status', 'ATIVA')
    .order('prioridade', { ascending: false })

  if (!automacoes || automacoes.length === 0) {
    return { data: undefined, erro: undefined }
  }

  let algumFalhou = false
  let ultimoErro: string | null = null

  for (const automa of automacoes) {
    const condicoes = automa.condicoes || []
    const acoesSpec = automa.acoes || []

    // Verifica condições
    const condicoesAtendidas = avaliarCondicoes(condicoes, payload.dados)

    // Cria log
    const { data: log } = await supabase
      .from('automacoes_log')
      .insert({
        automacao_id: automa.id,
        evento_disparador: payload.evento,
        entidade_contexto: payload.entidade,
        entidade_id: payload.entidade_id,
        payload,
        condicoes_atendidas: condicoesAtendidas,
        acoes_executadas: [],
        status: 'PROCESSANDO',
        criado_em: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!condicoesAtendidas) {
      if (log) {
        await supabase
          .from('automacoes_log')
          .update({ status: 'SUCESSO', duracao_ms: Date.now() - inicio })
          .eq('id', log.id)
      }
      continue
    }

    // Executa ações
    const acoesExecutadas: { acao: string; sucesso: boolean; erro?: string }[] = []
    for (const acao of acoesSpec as Array<{ acao: string; params: Record<string, unknown> }>) {
      const resultado = await executarAca(acao.acao, acao, payload)
      acoesExecutadas.push({
        acao: acao.acao,
        sucesso: resultado.sucesso,
        erro: resultado.erro,
      })
      if (!resultado.sucesso) {
        algumFalhou = true
        ultimoErro = resultado.erro ?? null
      }
    }

    // Atualiza log
    if (log) {
      const statusLog = algumFalhou ? 'FALHA_PARCIAL' : 'SUCESSO'
      await supabase
        .from('automacoes_log')
        .update({ acoes_executadas: acoesExecutadas, status: statusLog, duracao_ms: Date.now() - inicio })
        .eq('id', log.id)
    }

    // Atualiza métricas da automação
    await supabase
      .from('automacoes')
      .update({
        ultima_execucao: new Date().toISOString(),
        qtd_executada: automa.qtd_executada + 1,
        qtd_falhas: algumFalhou ? automa.qtd_falhas + 1 : automa.qtd_falhas,
      })
      .eq('id', automa.id)
  }

  if (algumFalhou) {
    return { data: undefined, erro: ultimoErro ?? undefined }
  }
  return { data: undefined, erro: undefined }
}

// Placeholder — importação dinâmica do executor real
let _executarAca: ((acaoNome: string, acao: { acao: string; params: Record<string, unknown> }, dados: AutomationEventPayload) => Promise<{ sucesso: boolean; erro?: string }>) | null = null

async function executarAca(acaoNome: string, acao: { acao: string; params: Record<string, unknown> }, dados: AutomationEventPayload): Promise<{ sucesso: boolean; erro?: string }> {
  if (!_executarAca) {
    try {
      const mod = await import('./actions')
      _executarAca = mod.executarAcao
    } catch {
      return { sucesso: false, erro: 'Module actions not loaded' }
    }
  }
  return _executarAca(acaoNome, acao, dados)
}

/**
 * Avalia se as condições de uma automação são atendidas.
 */
function avaliarCondicoes(
  condicoes: Array<{
    tipo: string
    operador: string
    valor: string | number | null
    referencia?: string
  }>,
  dados: Record<string, unknown>,
): boolean {
  if (!condicoes || condicoes.length === 0) return true

  for (const cond of condicoes) {
    const valorCampo = dados[cond.tipo] ?? null
    if (!avaliarUmaCond(valorCampo, cond.operador, cond.valor)) {
      return false
    }
  }

  return true
}

function avaliarUmaCond(
  valorCampo: unknown,
  operador: string,
  valorEsperado: string | number | null,
): boolean {
  if (operador === 'vazio') return valorCampo === null || valorCampo === undefined || valorCampo === ''
  if (operador === 'nao_vazio') return valorCampo !== null && valorCampo !== undefined && valorCampo !== ''

  if (valorCampo === null || valorCampo === undefined) return false

  const valStr = String(valorCampo)
  const espStr = String(valorEsperado)

  switch (operador) {
    case 'igual': return valStr === espStr
    case 'diferente': return valStr !== espStr
    case 'contem': return valStr.includes(espStr)
    case 'maior': return Number(valorCampo) > Number(valorEsperado)
    case 'menor': return Number(valorCampo) < Number(valorEsperado)
    default: return false
  }
}