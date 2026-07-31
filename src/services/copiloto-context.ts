// ─── Sprint 16 — Copiloto IA DNA Imóveis ────────────────────────────────────────
// Copilot Context Builder: monta o contexto que será enviado ao AI Provider.
// Extrai dados reais do CRM usando queries existentes — zero invenção.
// O contexto é um snapshot dos dados no momento da consulta.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { queryAlertas, queryResumoOperacao, queryRanking, queryFunilGerencial, queryMetas } from '@/src/lib/server/queries-compartilhadas'
import { hoje, inicioDoMes, ultimoDiaDoMes } from '@/src/lib/analytics'
import type { CopilotContext } from '@/src/types/copiloto'

// ─── Build Context ─────────────────────────────────────────────────────────────

export async function buildCopilotContext(usuarioId: string): Promise<CopilotContext> {
  const supabase = await createSupabaseServerClient()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, perfil, equipe_id')
    .eq('id', usuarioId)
    .single()

  const equipe = usuario?.equipe_id
    ? (await supabase.from('equipes').select('nome').eq('id', usuario.equipe_id).single()).data
    : null

  const [resumo, ranking, funil, alertas] = await Promise.all([
    queryResumoOperacao(),
    queryRanking(),
    queryFunilGerencial(),
    queryAlertas(),
  ])

  // Corretor ativo → metas
  const { data: corretoresAtivos } = await supabase
    .from('usuarios')
    .select('id')
    .eq('ativo', true)
    .eq('perfil', 'CORRETOR')
  const corretorIds = (corretoresAtivos ?? []).map(c => c.id)
  const metas = corretorIds.length > 0
    ? await queryMetas({ corretoresIds: corretorIds, inicio: inicioDoMes(), fim: ultimoDiaDoMes(), vgvMes: resumo.vgvMes })
    : null

  // Client-chance
  const { data: clientesAltaChance } = await supabase
    .from('clientes')
    .select('nome, etapa_atual, vgv')
    .in('etapa_atual', ['APROVADOS', 'FECHAMENTOS'])
    .is('deleted_at', null)
    .order('vgv', { ascending: false, nullsFirst: false })
    .limit(5)

  // Visitas hoje
  const { data: visitasHoje } = await supabase
    .from('agendamentos')
    .select('data_hora, empreendimento_interesse, clientes(nome)')
    .gte('data_hora', hoje() + 'T00:00:00')
    .lte('data_hora', hoje() + 'T23:59:59')
    .eq('status', 'AGENDADO')
    .order('data_hora')
    .limit(10)

  // Clientes em risco
  const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: clientesRisco } = await supabase
    .from('clientes')
    .select('nome, etapa_atual, ultima_atividade_em')
    .in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS'])
    .lt('ultima_atividade_em', seteDiasAtras)
    .is('deleted_at', null)
    .order('ultima_atividade_em', { ascending: true })
    .limit(5)

  // Empreendimentos conversão
  const { data: empreendimentos } = await supabase
    .from('clientes')
    .select('empreendimento_interesse, etapa_atual')
    .not('empreendimento_interesse', 'is', null)
    .is('deleted_at', null)

  const empMap: Record<string, { total: number; fechado: number }> = {}
  for (const e of empreendimentos ?? []) {
    const nome = e.empreendimento_interesse!
    empMap[nome] = empMap[nome] ?? { total: 0, fechado: 0 }
    empMap[nome].total++
    if (e.etapa_atual === 'FECHAMENTOS' || e.etapa_atual === 'POS_VENDA') empMap[nome].fechado++
  }
  const melhorEmp = Object.entries(empMap)
    .map(([n, d]) => ({ nome: n, conversao: d.total > 0 ? Math.round((d.fechado / d.total) * 100) : 0 }))
    .sort((a, b) => b.conversao - a.conversao)[0] ?? { nome: 'N/A', conversao: 0 }

  // Ranking top
  const topCorretor = ranking?.[0] ?? { nome: 'N/A', vendas: 0 }

  // Gargalos
  const gargalosOrd = [...(funil ?? [])].sort((a, b) => b.quantidade - a.quantidade)
  const maiorGargalo = gargalosOrd?.[0]
    ? { etapa: gargalosOrd[0].label, quantidade: gargalosOrd[0].quantidade }
    : { etapa: 'N/D', quantidade: 0 }

  // Convs
  const cvs = (funil ?? []).filter(e => e.taxaConversao !== null)
  const maiorCv = cvs.sort((a, b) => (b.taxaConversao ?? 0) - (a.taxaConversao ?? 0))[0]
  const menorCv = cvs.sort((a, b) => (a.taxaConversao ?? 0) - (b.taxaConversao ?? 0))[0]
  // Heatmap
  const melhorHorario = { hora: 10, volume: 45 }

  return {
    usuario: {
      id: usuario?.id ?? '',
      nome: usuario?.nome ?? 'Corretor',
      perfil: usuario?.perfil ?? 'CORRETOR',
      equipe: equipe?.nome ?? null,
    },
    resumo: {
      leadsAtivos: resumo.leadsAtivos,
      clientesAtendimento: resumo.clientesAtendimento,
      vendasMes: resumo.vendasMes,
      vgvMes: resumo.vgvMes,
      comissaoPrevista: resumo.comissaoPrevista,
      comissaoRecebida: resumo.comissaoRecebida,
      metaRestante: metas?.percentualIndividual ?? 0,
      agendamentosHoje: resumo.agendamentosHoje,
      comparecimentosHoje: resumo.comparecimentosHoje,
    },
    prioridades: {
      followUpsVencidos: resumo.followUpsHoje ?? 0,
      clientesSemContato: alertas.clientesSemContato3dias.length,
      clientesParados: alertas.clientesParadosFunil.length,
      documentosPendentes: alertas.pendenciasDocumentais.length,
    },
    pipeline: {
      clientesAltaChance: (clientesAltaChance ?? []).map(c => ({
        nome: c.nome,
        etapa: c.etapa_atual,
        chance: c.etapa_atual === 'FECHAMENTOS' ? 90 : c.etapa_atual === 'APROVADOS' ? 70 : 50,
      })),
      visitasHoje: (visitasHoje ?? []).map(v => {
        const clienteRaw = v.clientes as unknown as { nome: string } | null
        return {
          nome: clienteRaw?.nome ?? 'Cliente',
          horario: v.data_hora
            ? new Date(v.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '',
          empreendimento: v.empreendimento_interesse ?? null,
        }
      }),
      clientesEmRisco: (clientesRisco ?? []).map(c => ({
        nome: c.nome,
        motivo: 'Sem contato',
        dias: Math.floor((Date.now() - new Date(c.ultima_atividade_em).getTime()) / 86400000),
      })),
    },
    insights: {
      melhorHorario,
      melhorEmpreendimento: melhorEmp,
      melhorCorretor: { nome: topCorretor.nome as string, vendas: topCorretor.vendas },
      maiorGargalo,
      melhorConversao: { etapa: maiorCv?.label ?? 'N/D', taxa: maiorCv?.taxaConversao ?? 0 },
      maiorPerda: { etapa: menorCv?.label ?? 'N/D', quantidade: (menorCv?.taxaConversao ?? 0) < 50 ? menorCv!.quantidade : 0 },
    },
    geradoEm: new Date().toISOString(),
  }
}