// ─── Sprint 16 — Copiloto IA DNA Imóveis ────────────────────────────────────────
// Copilot Engine: orquestra contexto + provider + ações.
// Gera Resumo Inteligente, Recomendações, processa Perguntas e Comandos.

import { buildCopilotContext } from './copiloto-context'
import { criarAIProvider, buildSystemPrompt, completarComProvider } from '@/src/ai'
import type {
  AIProviderConfig,
  CopilotResumoInteligente,
  CopilotRecomendacao,
} from '@/src/types/copiloto'

const DEFAULT_PROVIDER_CONFIG: AIProviderConfig = {
  tipo: 'mock',
  apiKey: 'mock-key',
  model: 'mock-model',
  temperature: 0.3,
  maxTokens: 2000,
}

async function getContext(usuarioId: string) {
  try {
    return await buildCopilotContext(usuarioId)
  } catch (e) {
    console.error('[Copilot Engine] Erro ao montar contexto:', e)
    throw new Error('Não foi possível carregar os dados do CRM. Tente novamente.')
  }
}

// ─── SEÇÃO 1 — Resumo Inteligente ──────────────────────────────────────────────

export async function gerarResumoInteligente(usuarioId: string): Promise<CopilotResumoInteligente> {
  const ctx = await getContext(usuarioId)
  const agora = new Date()
  const hora = agora.getHours()

  let saudacao: string
  if (hora < 12) saudacao = `Bom dia, ${ctx.usuario.nome}!`
  else if (hora < 18) saudacao = `Boa tarde, ${ctx.usuario.nome}!`
  else saudacao = `Boa noite, ${ctx.usuario.nome}!`

  const prioridades: {
    label: string
    valor: number
    cor: 'red' | 'amber' | 'green'
    descricao: string
  }[] = [
    {
      label: 'Follow-ups Vencidos',
      valor: ctx.prioridades.followUpsVencidos,
      cor: ctx.prioridades.followUpsVencidos > 3 ? 'red' : 'amber',
      descricao: ctx.prioridades.followUpsVencidos === 0 ? 'Nenhum pendente' : `${ctx.prioridades.followUpsVencidos} vencidos!`,
    },
    {
      label: 'Clientes Sem Contato',
      valor: ctx.prioridades.clientesSemContato,
      cor: ctx.prioridades.clientesSemContato > 5 ? 'red' : 'amber',
      descricao: `${ctx.prioridades.clientesSemContato} sem contato há 3+ dias`,
    },
    {
      label: 'Comissão Prevista',
      valor: 0,
      cor: 'green',
      descricao: ctx.resumo.comissaoPrevista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    {
      label: 'Meta',
      valor: ctx.resumo.metaRestante,
      cor: ctx.resumo.metaRestante >= 80 ? 'green' : ctx.resumo.metaRestante >= 50 ? 'amber' :'red',
      descricao: `${ctx.resumo.metaRestante}% atingida`,
    },
  ]

  const fecham = ctx.pipeline.clientesAltaChance.slice(0, 3).map(c => ({
    nome: c.nome,
    etapa: c.etapa,
    chance: c.chance,
    acao: c.etapa === 'FECHAMENTOS' ? 'Fechar proposta' : 'Preparar documentação',
  }))

  return {
    titulo: 'Resumo do Dia',
    saudacao,
    prioridades,
    fechamentosProvaveis: fecham,
  }
}

// ─── SEÇÃO 2 — Recomendações ───────────────────────────────────────────────────

export async function gerarRecomendacoes(usuarioId: string): Promise<CopilotRecomendacao[]> {
  const c = await getContext(usuarioId)
  const recs: CopilotRecomendacao[] = []

  if (c.prioridades.followUpsVencidos > 0) recs.push({
    id: 'rc-fu', icone: '\u{1F534}', titulo: 'Follow-ups vencidos',
    descricao: `${c.prioridades.followUpsVencidos} atrasados. Resolva agora.`,
    acao: 'Ir para Follow-up', rota: '/dashboard/followup', prioridade: 'ALTISSIMA',
  })

  if (c.pipeline.clientesAltaChance.length > 0) {
    const top = c.pipeline.clientesAltaChance[0]
    recs.push({
      id: 'rc-fech', icone: '\u{1F525}', titulo: `${top.nome} — alta chance`,
      descricao: `${top.etapa} — ${top.chance}% de fechar. Priorize.`,
      acao: 'Ver pipeline', rota: '/dashboard/funil', prioridade: 'ALTA',
    })
  }

  if (c.insights.melhorEmpreendimento?.nome !== 'N/A') recs.push({
    id: 'rc-emp', icone: '\u{1F3D7} EF', titulo: `${c.insights.melhorEmpreendimento.nome} converte mais`,
    descricao: `Taxa: ${c.insights.melhorEmpreendimento.conversao}%. Ofereça para leads quentes.`,
    acao: 'Ver empreendimento', rota: '/dashboard/empreendimentos', prioridade: 'MEDIA',
  })

  if (c.prioridades.documentosPendentes > 0) recs.push({
    id: 'rc-docs', icone: '\u{1F4CE}', titulo: 'Documentos pendentes',
    descricao: `${c.prioridades.documentosPendentes} aguardando validação.`,
    acao: 'Ir para Documentos', rota: '/dashboard/documentos', prioridade: 'MEDIA',
  })

  if (c.pipeline.visitasHoje.length > 0) recs.push({
    id: 'rc-visitas', icone: '\u{1F4C5}', titulo: `${c.pipeline.visitasHoje.length} visitas hoje`,
    descricao: 'Confirme as visits and prepare material.',
    acao: 'Ver Agenda', rota: '/dashboard/agenda', prioridade: 'ALTA',
  })

  if (c.insights.maiorGargalo.quantidade > 5) recs.push({
    id: 'rc-garg', icone: '\u{26A0} EF', titulo: `${c.insights.maiorGargalo.etapa} congested`,
    descricao: `${c.insights.maiorGargalo.quantidade} clientes parados. Destrave esta etapa.`,
    acao: 'Ver Funil', rota: '/dashboard/funil', prioridade: 'ALTA',
  })

  return recs
}

// ─── SEÇÃO 3 — Processar Pergunta ──────────────────────────────────────────────

export async function processarPergunta(_usuarioId: string, pergunta: string): Promise<string> {
  // FASE 1 (mock): respostas deterministicas baseadas em palavras-chave
  const p = pergunta.toLowerCase()

  if (p.includes('quem') && (p.includes('atender') || p.includes('prioridade'))) {
    return 'Priorize os clientes com follow-ups vencidos e visitas confirmadas para hoje. Consulte a seção Follow-up para a lista completa.'
  }
  if (p.includes('meta') || p.includes('falta')) {
    return 'Para visualizar sua meta detalhada, acesse /dashboard/gestao. Lá você encontra metas diárias, mensais e anuais com gráficos de progresso.'
  }
  if (p.includes('vendeu') || p.includes('ranking')) {
    return 'Para ver o ranking completo de corretores, acesse /dashboard/rankings. Lá você terá métricas detalhadas de vendas por corretor.'
  }
  if (p.includes('fechar') || p.includes('chance')) {
    return 'Verifique os clientes em FECHAMENTOS e APROVADOS — estes têm as maiores probabilidades de conversão. Acesse /dashboard/funil para ver o status de cada um.'
  }
  if (p.includes('documento') || p.includes('documentação')) {
    return 'O módulo Documentos em /dashboard/documentos mostra a documentação pendente de cada cliente, com status de validação.'
  }
  if (p.includes('parado') || p.includes('sem') || p.includes('estagnado')) {
    return 'No módulo Gestão > Alertas, você encontra os clientes mais parados e há quanto tempo estão sem contato.'
  }

  return `Você perguntou: "${pergunta}". Consulte as telas do CRM — Follow-up, Pipeline, Gestão, Documentos — para obter os dados detalhados. Para perguntas específicas sobre nomes, datas ou números, acesse a seção correspondente.`
}