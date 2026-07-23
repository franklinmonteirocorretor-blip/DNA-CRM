import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import {
  resumoOperacao,
  kpisDiarios,
  rankingGestao,
  funilGerencial,
  producaoGestao,
  alertasGestao,
  metasGestao,
} from './actions'
import ResumoOperacao from '@/src/components/gestao/ResumoOperacao'
import TabelaKPIs from '@/src/components/gestao/TabelaKPIs'
import Ranking from '@/src/components/gestao/Ranking'
import FunilGerencial from '@/src/components/gestao/FunilGerencial'
import Produtividade from '@/src/components/gestao/Produtividade'
import AlertasGestao from '@/src/components/gestao/AlertasGestao'
import SecaoMetas from '@/src/components/gestao/SecaoMetas'

export const dynamic = 'force-dynamic'

export default async function GestaoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Você precisa estar autenticado.</p>
      </div>
    )
  }

  // Busca todos os dados em paralelo
  const [
    resumo,
    kpis,
    ranking,
    funil,
    producao,
    alertas,
    metas,
  ] = await Promise.all([
    resumoOperacao(),
    kpisDiarios(),
    rankingGestao(),
    funilGerencial(),
    producaoGestao('daily'),
    alertasGestao(),
    metasGestao(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão Comercial</h1>
        <p className="mt-1 text-sm text-gray-500">
          Centro de comando da DNA Imóveis. Dados em tempo real.
        </p>
      </div>

      {/* Seção 1: Resumo da Operação */}
      <ResumoOperacao dados={resumo} />

      {/* Seção 2: KPIs Diários */}
      <TabelaKPIs kpis={kpis} />

      {/* Seção 3: Ranking */}
      <Ranking itens={ranking} />

      {/* Seção 4: Funil Gerencial */}
      <FunilGerencial etapas={funil} />

      {/* Seção 5: Produtividade */}
      <Produtividade series={producao} agrupamento="daily" />

      {/* Seção 6: Alertas */}
      <AlertasGestao dados={alertas} />

      {/* Seção 7: Metas */}
      <SecaoMetas dados={metas} />
    </div>
  )
}