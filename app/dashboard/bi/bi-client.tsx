'use client'

// DNA CRM — Sprint 14: Dashboard BI Executivo (Client Component)
// Recebe os dados pré-carregados do servidor e renderiza a interface com gráficos.

import type { BIDadosCompletos } from '@/src/types/bi'
import ResumoExecutivoBI from '@/src/components/bi/ResumoExecutivoBI'
import FunilBIChart from '@/src/components/bi/FunilBIChart'
import RankingBIChart from '@/src/components/bi/RankingBIChart'
import EmpreendimentosBICard from '@/src/components/bi/EmpreendimentosBICard'
import PrevisoesBIPanel from '@/src/components/bi/PrevisoesBIPanel'
import GargalosBIPanel from '@/src/components/bi/GargalosBIPanel'
import AlertasBIPanel from '@/src/components/bi/AlertasBIPanel'
import TimelineBIPanel from '@/src/components/bi/TimelineBIPanel'
import MetasBIChart from '@/src/components/bi/MetasBIChart'
import InsightsBICard from '@/src/components/bi/InsightsBICard'

export default function BIDashboardClient({ dados }: { dados: BIDadosCompletos }) {
  const temFunil = dados.funil.length > 0
  const temRanking = dados.ranking.length > 0
  const temEmpreendimentos = dados.empreendimentos.length > 0
  const temTimeline = dados.timeline.length > 0
  const temInsights = dados.insights.length > 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BI Executivo</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visão estratégica da DNA Imóveis. Dados em tempo real.
          </p>
        </div>
        <span className="text-xs text-gray-400">
          Atualizado: {new Date(dados.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Seção 1: Resumo Executivo */}
      <ResumoExecutivoBI resumo={dados.resumo} />

      {/* Seção 2: Funil + Metas lado a lado */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {temFunil && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Funil de Vendas</h2>
            <FunilBIChart etapas={dados.funil} />
          </div>
        )}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Metas</h2>
          <MetasBIChart metas={dados.metas} />
        </div>
      </div>

      {/* Seção 3: Previsões + Gargalos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Previsões</h2>
          <PrevisoesBIPanel previsoes={dados.previsões} />
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gargalos</h2>
          <GargalosBIPanel gargalos={dados.gargalos} />
        </div>
      </div>

      {/* Seção 4: Alertas Estratégicos */}
      {dados.alertas.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas Estratégicos</h2>
          <AlertasBIPanel alertas={dados.alertas} />
        </div>
      )}

      {/* Seção 5: Ranking */}
      {temRanking && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ranking de Corretores</h2>
          <RankingBIChart items={dados.ranking} />
        </div>
      )}

      {/* Seção 6: Empreendimentos */}
      {temEmpreendimentos && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Empreendimentos</h2>
          <EmpreendimentosBICard empreendimentos={dados.empreendimentos} />
        </div>
      )}

      {/* Seção 7: Timeline */}
      {temTimeline && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Linha do Tempo</h2>
          <TimelineBIPanel eventos={dados.timeline} />
        </div>
      )}

      {/* Seção 8: Insights */}
      {temInsights && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights</h2>
          <InsightsBICard insights={dados.insights} />
        </div>
      )}
    </div>
  )
}