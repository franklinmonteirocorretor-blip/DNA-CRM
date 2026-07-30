// DNA CRM — Sprint 14: Agregador BI Executivo
// Junta todas as 10 queries BI numa única chamada BIDadosCompletos.
// Usa Promise.allSettled para resiliência — uma query falhando não derruba as outras.

import {
  queryResumoExecutivo,
  queryFunil,
  queryRankings,
  queryEmpreendimentos,
  queryPrevisoes,
  queryGargalos,
  queryAlertasBI,
  queryMetasBI,
  queryTimelineBI,
  queryInsightsBI,
} from './queries-bi'
import type {
  BIResumoExecutivo,
  BIFunilEtapa,
  BIRankingItem,
  BIEmpreendimento,
  BIPrevisao,
  BIGargalos,
  BIAlerta,
  BIMetas,
  BITimelineEvento,
  BIInsight,
  BIDadosCompletos,
} from '@/src/types/bi'

function fallback<T>(result: PromiseSettledResult<T>): T | undefined {
  return result.status === 'fulfilled' ? result.value : undefined
}

/**
 * Retorna o dataset completo do BI Executivo.
 * Uma query falhando retorna fallback vazio para aquela seção.
 */
export async function queryBIDadosCompletos(): Promise<BIDadosCompletos> {
  const [
    rResumo,
    rFunil,
    rRanking,
    rEmpreendimentos,
    rPrevisoes,
    rGargalos,
    rAlertas,
    rMetas,
    rTimeline,
    rInsights,
  ] = await Promise.allSettled([
    queryResumoExecutivo(),
    queryFunil(),
    queryRankings(),
    queryEmpreendimentos(),
    queryPrevisoes(),
    queryGargalos(),
    queryAlertasBI(),
    queryMetasBI(),
    queryTimelineBI(),
    queryInsightsBI(),
  ])

  return {
    resumo: fallback<BIResumoExecutivo>(rResumo) ?? {
      vgvMes: 0, comissaoPrevista: 0, comissaoRecebida: 0, clientesAtivos: 0,
      conversaoGeral: 0, ticketMedio: 0, tempoMedioFechamentoDias: 0, metaMes: 0, percentualMeta: 0,
    },
    funil: fallback<BIFunilEtapa[]>(rFunil) ?? [],
    ranking: fallback<BIRankingItem[]>(rRanking) ?? [],
    empreendimentos: fallback<BIEmpreendimento[]>(rEmpreendimentos) ?? [],
    previsões: fallback<BIPrevisao>(rPrevisoes) ?? {
      vgvEsperado: 0, comissaoEsperada: 0, fechamentosEsperados: 0,
      clientesAltaProbabilidade: [], clientesRisco: [], metaProvavel: [],
    },
    gargalos: fallback<BIGargalos>(rGargalos) ?? {
      etapasCongestionadas: [], corretoresAbaixoMedia: [], empreendimentosBaixaConversao: [],
      clientesParados: [], documentacaoTravada: [], agendamentosPerdidos: [], followUpsAtrasados: [],
    },
    alertas: fallback<BIAlerta[]>(rAlertas) ?? [],
    metas: fallback<BIMetas>(rMetas) ?? {
      diaria: { meta: 0, realizado: 0, previsto: 0, desvio: 0, projecao: 0 },
      semanal: { meta: 0, realizado: 0, previsto: 0, desvio: 0, projecao: 0 },
      mensal: { meta: 0, realizado: 0, previsto: 0, desvio: 0, projecao: 0 },
      anual: { meta: 0, realizado: 0, previsto: 0, desvio: 0, projecao: 0 },
    },
    timeline: fallback<BITimelineEvento[]>(rTimeline) ?? [],
    insights: fallback<BIInsight[]>(rInsights) ?? [],
    atualizadoEm: new Date().toISOString(),
  }
}