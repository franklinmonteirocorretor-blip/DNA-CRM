import { PipelineKPIs as PipelineKPIsType } from '@/src/types'

function formatarMoeda(valor: number): string {
  if (valor >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)}M`
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(0)}k`
  return `R$ ${valor}`
}

function formatarHoras(horas: number): string {
  if (horas < 24) return `${horas}h`
  if (horas < 168) return `${Math.round(horas / 24)} dias`
  return `${Math.round(horas / 168)} sem`
}

export default function PipelineKPIs({ kpis }: { kpis: PipelineKPIsType }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">KPIs do Pipeline</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <KpiCard label="Clientes ativos" value={kpis.clientesAtivos.toLocaleString('pt-BR')} cor="sky" />
        <KpiCard label="Tempo médio" value={formatarHoras(kpis.tempoMedioGeralHoras)} cor="amber" />
        <KpiCard label="Conversão" value={`${kpis.conversaoGeral}%`} cor="emerald" />
        <KpiCard label="VGV negociação" value={formatarMoeda(kpis.vgvTotalNegociacao)} cor="teal" />
        <KpiCard label="VGV previsto" value={formatarMoeda(kpis.vgvPrevisto)} cor="cyan" />
        <KpiCard label="Comissão prev." value={formatarMoeda(kpis.comissaoPrevista)} cor="rose" />
      </div>

      {/* Tempo por etapa */}
      {kpis.tempoPorEtapa.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Tempo médio por etapa</p>
          <div className="space-y-1">
            {kpis.tempoPorEtapa.map((t) => (
              <div key={t.etapa} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 text-gray-500">{t.label}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded"
                    style={{ width: `${Math.min(100, (t.tempoMedioHoras / 168) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-gray-600">{formatarHoras(t.tempoMedioHoras)}</span>
                <span className="w-8 text-right text-gray-400">{t.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function KpiCard({ label, value, cor }: { label: string; value: string; cor: string }) {
  const palettes: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  return (
    <div className={`rounded-lg border p-3 ${palettes[cor] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  )
}