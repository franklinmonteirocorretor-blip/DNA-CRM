import { PipelineKPIs as PipelineKPIsType } from '@/src/types'
import KpiCard from '@/src/components/ui/KpiCard'
import { formatarMoedaCompacta, formatarHoras } from '@/src/lib/formatters'

export default function PipelineKPIs({ kpis }: { kpis: PipelineKPIsType }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">KPIs do Pipeline</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <KpiCard label="Clientes ativos" value={kpis.clientesAtivos.toLocaleString('pt-BR')} color="sky" />
        <KpiCard label="Tempo médio" value={formatarHoras(kpis.tempoMedioGeralHoras)} color="amber" />
        <KpiCard label="Conversão" value={`${kpis.conversaoGeral}%`} color="emerald" />
        <KpiCard label="VGV negociação" value={formatarMoedaCompacta(kpis.vgvTotalNegociacao)} color="teal" />
        <KpiCard label="VGV previsto" value={formatarMoedaCompacta(kpis.vgvPrevisto)} color="cyan" />
        <KpiCard label="Comissão prev." value={formatarMoedaCompacta(kpis.comissaoPrevista)} color="rose" />
      </div>

      {/* Tempo por etapa */}
      {kpis.tempoPorEtapa.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tempo médio por etapa</p>
          <div className="space-y-1">
            {kpis.tempoPorEtapa.map((t) => (
              <div key={t.etapa} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{t.label}</span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded"
                    style={{ width: `${Math.min(100, (t.tempoMedioHoras / 168) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-gray-600 dark:text-gray-400">{formatarHoras(t.tempoMedioHoras)}</span>
                <span className="w-8 text-right text-gray-400 dark:text-gray-500">{t.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}