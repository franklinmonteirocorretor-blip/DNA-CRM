'use server'

import { requirePermission } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { FollowUpItem, FollowUpProximaAcao, FollowUpSugestao, FollowUpData, EtapaFunil } from '@/src/types'
import { ETAPA_LABEL_SINGULAR } from '@/src/config/pipeline'

/**
 * Calcula o score de prioridade para um item da caixa de entrada
 * Base: Faixa 0–1000
 */
function calcularPrioridade(item: {
  etapa_atual: string
  ultima_atividade_em: string
  proxima_acao_em: string | null
  created_at: string
  documentos_pendentes: number
}): number {
  let score = 0
  const diasSemContato = Math.floor((Date.now() - new Date(item.ultima_atividade_em).getTime()) / 86400000)

  // Sem contato há 5+ dias: +100 por dia
  if (diasSemContato >= 5) {
    score += Math.min(100 * (diasSemContato - 4), 500)
  }

  // Cliente aprovado (pronto pra fechar): +80
  if (item.etapa_atual === 'APROVADOS') score += 80

  // Fechamento: +90
  if (item.etapa_atual === 'FECHAMENTOS') score += 90

  // Visita hoje (proxima_acao_em): +70
  if (item.proxima_acao_em) {
    const hoje = new Date().toISOString().slice(0, 10)
    if (item.proxima_acao_em.slice(0, 10) === hoje) score += 70
  }

  // Documentação pendente: +60
  if (item.documentos_pendentes > 0) score += 60

  // Novo Lead: +50
  if (item.etapa_atual === 'NOVO_LEAD') score += 50

  // Atrasado (proxima_acao vencida): +120
  if (item.proxima_acao_em && new Date(item.proxima_acao_em) < new Date()) score += 120

  // Aguardando retorno sem ação: +30
  if (!item.proxima_acao_em && diasSemContato > 2) score += 30

  return Math.min(1000, score)
}

export async function followupData() {
  await requirePermission('dashboard', 'visualizar')
  const supabase = await createSupabaseServerClient()

  // Obtém perfil do usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const ehGerente = perfil?.perfil === 'GERENTE' || perfil?.perfil === 'ADMINISTRADOR'

  // Busca todos os clientes ativos + documentos pendentes via RPC ou subquery
  let query = supabase
    .from('clientes')
    .select('id, nome, telefone, etapa_atual, ultima_atividade_em, proxima_acao, proxima_acao_em, created_at, corretor_responsavel_id, usuarios!corretor_responsavel_id(nome)')
    .is('deleted_at', null)
    .order('ultima_atividade_em', { ascending: true })

  if (!ehGerente) {
    query = query.eq('corretor_responsavel_id', user.id)
  }

  const { data: clientes } = await query

  if (!clientes || clientes.length === 0) {
    return {
      caixaEntrada: [] as FollowUpItem[],
      proximasAcoes: [] as FollowUpProximaAcao[],
      painelCorretor: { minhasTarefas: 0, meusClientes: 0, followUpsHoje: 0, followUpsAtrasados: 0, tempoMedioRespostaMinutos: 0 },
      painelGerente: { clientesEsquecidos: [], corretoresSemFollowUp: [], followUpsHoje: 0, followUpsAtrasados: 0, tempoMedioRespostaMinutos: 0 },
      sugestoes: [] as FollowUpSugestao[],
    } satisfies FollowUpData
  }

  // Busca documentos pendentes por cliente (batch)
  const clienteIds = clientes.map(c => c.id)
  const { data: docsPendentes } = await supabase
    .from('documentos')
    .select('cliente_id')
    .in('cliente_id', clienteIds)
    .is('deleted_at', null)
    .neq('status_validacao', 'VALIDADO')

  const pendentesPorCliente = new Map<string, number>()
  for (const d of docsPendentes ?? []) {
    pendentesPorCliente.set(d.cliente_id, (pendentesPorCliente.get(d.cliente_id) ?? 0) + 1)
  }

  // ═══ Monta Caixa de Entrada ═══
  const caixaEntrada: FollowUpItem[] = []
  const hoje = new Date().toISOString().slice(0, 10)

  for (const c of clientes) {
    const diasSemContato = Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000)
    const docsPend = pendentesPorCliente.get(c.id) ?? 0
    const prioridade = calcularPrioridade({
      etapa_atual: c.etapa_atual,
      ultima_atividade_em: c.ultima_atividade_em,
      proxima_acao_em: c.proxima_acao_em,
      created_at: c.created_at,
      documentos_pendentes: docsPend,
    })

    // Categoriza
    let categoria: FollowUpItem['categoria'] = 'AGUARDANDO_RETORNO'
    let statusEmoji = '🟡'
    let alerta: string | null = null

    if (c.etapa_atual === 'NOVO_LEAD' && diasSemContato < 1) {
      categoria = 'NOVO_LEAD'
      statusEmoji = '🆕'
    } else if (c.etapa_atual !== 'NOVO_LEAD' && diasSemContato < 1) {
      categoria = 'AGUARDANDO_RETORNO'
    } else if (diasSemContato >= 1 && diasSemContato <= 3) {
      categoria = 'SEM_CONTATO'
      statusEmoji = '🟠'
    } else if (diasSemContato > 3 && diasSemContato <= 6) {
      categoria = 'VENCIDO'
      statusEmoji = '🔴'
      alerta = `Sem contato há ${diasSemContato} dias`
    } else if (diasSemContato > 6) {
      categoria = 'ESQUECIDO'
      statusEmoji = '💀'
      alerta = `Cliente esquecido — ${diasSemContato} dias sem contato`
    }

    // Se tem próxima ação e está dentro do prazo, reduz severidade
    if (c.proxima_acao_em && new Date(c.proxima_acao_em) >= new Date()) {
      if (categoria === 'VENCIDO') categoria = 'AGUARDANDO_RETORNO'
      if (categoria === 'ESQUECIDO') categoria = 'VENCIDO'
      statusEmoji = categoria === 'VENCIDO' ? '🔴' : '🟡'
    }

    caixaEntrada.push({
      id: c.id,
      clienteId: c.id,
      nome: c.nome,
      telefone: c.telefone,
      etapa: c.etapa_atual,
      etapaLabel: ETAPA_LABEL_SINGULAR[c.etapa_atual as EtapaFunil] ?? c.etapa_atual,
      corretorNome: (c.usuarios as unknown as { nome: string })?.nome ?? '',
      categoria,
      diasSemContato,
      proximaAcao: c.proxima_acao,
      proximaAcaoEm: c.proxima_acao_em,
      prioridade,
      statusEmoji,
      alerta,
    })
  }

  // Ordena por prioridade decrescente
  caixaEntrada.sort((a, b) => b.prioridade - a.prioridade)

  // ═══ Próximas Ações ═══
  const proximasAcoes: FollowUpProximaAcao[] = []
  const agora = new Date()

  for (const c of clientes) {
    if (!c.proxima_acao || !c.proxima_acao_em) continue

    const dataHora = new Date(c.proxima_acao_em)
    const tempoRestante = Math.floor((dataHora.getTime() - agora.getTime()) / 60000)

    let prioridade: FollowUpProximaAcao['prioridade'] = 'BAIXA'
    if (tempoRestante < 60) prioridade = 'ALTA'
    else if (tempoRestante < 240) prioridade = 'MEDIA'
    if (tempoRestante < 0) prioridade = 'ALTA' // vencida

    proximasAcoes.push({
      clienteId: c.id,
      nome: c.nome,
      acao: c.proxima_acao,
      dataHora: c.proxima_acao_em,
      prioridade,
      responsavel: (c.usuarios as unknown as { nome: string })?.nome ?? '',
      tempoRestanteMinutos: tempoRestante,
      etapa: ETAPA_LABEL_SINGULAR[c.etapa_atual as EtapaFunil] ?? c.etapa_atual,
    })
  }

  proximasAcoes.sort((a, b) => a.tempoRestanteMinutos - b.tempoRestanteMinutos)

  // ═══ Sugestões Inteligentes ═══
  const sugestoes: FollowUpSugestao[] = []

  for (const c of clientes) {
    const diasSemContato = Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000)
    const docsPend = pendentesPorCliente.get(c.id) ?? 0

    // Cliente parado há 4 dias → sugerir ligação
    if (diasSemContato >= 4 && c.etapa_atual !== 'POS_VENDA' && c.etapa_atual !== 'FECHAMENTOS') {
      sugestoes.push({
        clienteId: c.id,
        nome: c.nome,
        motivo: `Cliente parado há ${diasSemContato} dias`,
        sugestao: 'Realizar ligação de follow-up',
        prioridade: Math.min(diasSemContato * 25, 300),
      })
    }

    // Documentação quase completa (1 pendente)
    if (docsPend === 1) {
      sugestoes.push({
        clienteId: c.id,
        nome: c.nome,
        motivo: 'Documentação quase completa',
        sugestao: 'Solicitar documento pendente para completar pasta',
        prioridade: 200,
      })
    }

    // Cliente aprovado → agendar visita
    if (c.etapa_atual === 'APROVADOS' || c.etapa_atual === 'CONDICIONADOS') {
      sugestoes.push({
        clienteId: c.id,
        nome: c.nome,
        motivo: `Cliente ${c.etapa_atual === 'APROVADOS' ? 'aprovado' : 'condicionado'}`,
        sugestao: 'Agendar visita para fechamento',
        prioridade: 250,
      })
    }

    // Etapa inicial sem contato
    if (c.etapa_atual === 'NOVO_LEAD' && diasSemContato >= 1) {
      sugestoes.push({
        clienteId: c.id,
        nome: c.nome,
        motivo: 'Lead novo sem primeiro contato',
        sugestao: 'Realizar primeiro contato (ligação ou WhatsApp)',
        prioridade: 280,
      })
    }
  }

  sugestoes.sort((a, b) => b.prioridade - a.prioridade)

  // ═══ Painel Corretor ═══
  const hojeInicio = new Date(hoje + 'T00:00:00').toISOString()
  const hojeFim = new Date(hoje + 'T23:59:59').toISOString()

  const { count: followUpsHojeCount } = await supabase
    .from('atividades')
    .select('id', { count: 'exact', head: true })
    .in('cliente_id', clienteIds)
    .gte('created_at', hojeInicio)
    .lte('created_at', hojeFim)

  const followUpsAtrasadosCount = proximasAcoes.filter(a => a.tempoRestanteMinutos < 0).length

  // Tempo médio de resposta
  let tempoMedioResposta = 0
  if (clientes.length > 0) {
    const totalDias = clientes.reduce((sum, c) => {
      const dias = Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000)
      return sum + Math.min(dias, 30) // cap em 30 dias
    }, 0)
    tempoMedioResposta = Math.round((totalDias / clientes.length) * 24 * 60)
  }

  // ═══ Painel Gerente ═══
  const clientesEsquecidos = caixaEntrada.filter(c => c.categoria === 'ESQUECIDO').slice(0, 20)

  // Corretores sem follow-up: busca todos os corretores e cruza
  const { data: corretores } = await supabase.from('usuarios').select('id, nome').in('perfil', ['CORRETOR', 'SUPERVISOR'])
  const corretoresComAtividade = new Set<string>()
  for (const c of clientes) {
    if (c.corretor_responsavel_id) corretoresComAtividade.add(c.corretor_responsavel_id)
  }
  const corretoresSemFollowUp = (corretores ?? [])
    .filter(cr => !corretoresComAtividade.has(cr.id))
    .map(cr => cr.nome)

  return {
    caixaEntrada,
    proximasAcoes,
    painelCorretor: {
      minhasTarefas: proximasAcoes.length,
      meusClientes: clientes.length,
      followUpsHoje: followUpsHojeCount ?? 0,
      followUpsAtrasados: followUpsAtrasadosCount,
      tempoMedioRespostaMinutos: tempoMedioResposta,
    },
    painelGerente: {
      clientesEsquecidos,
      corretoresSemFollowUp,
      followUpsHoje: followUpsHojeCount ?? 0,
      followUpsAtrasados: followUpsAtrasadosCount,
      tempoMedioRespostaMinutos: tempoMedioResposta,
    },
    sugestoes,
  } satisfies FollowUpData
}