import { GestaoKPI } from '@/src/types'
import BarraProgresso from './BarraProgresso'
import { SectionHeader } from '@/src/components/ui/SectionHeader'

export default function TabelaKPIs({ kpis }: { kpis: GestaoKPI[] }) {
  if (kpis.length === 0) {
    return (
      <section>
        <SectionHeader title="KPIs Diários" />
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Nenhum corretor encontrado.</p>
      </section>
    )
  }

  return (
    <section>
      <SectionHeader title="KPIs Diários" />
      <div className="mt-3 space-y-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.usuarioId}
            className={`rounded-lg border p-4 ${ kpi.status === 'META_BATIDA' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white' }`}
          >
            {/* Cabeçalho do corretor */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {kpi.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{kpi.nome}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Meta diária</p>
                </div>
              </div>
              {kpi.status === 'META_BATIDA' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  ✓ Meta batida
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  ○ Meta pendente
                </span>
              )}
            </div>

            {/* Barras de progresso */}
            <div className="space-y-1.5">
              <BarraProgresso valor={kpi.ligacoes} meta={80} label="Ligações" />
              <BarraProgresso valor={kpi.whatsapps} meta={40} label="WhatsApp" />
              <BarraProgresso valor={kpi.followUps} meta={20} label="Follow-ups" />
              <BarraProgresso valor={kpi.agendamentos} meta={2} label="Agendamentos" />
              <BarraProgresso valor={kpi.comparecimentos} meta={2} label="Comparec." />
              <BarraProgresso valor={kpi.pastas} meta={1} label="Pastas" />
            </div>

            {/* Percentual geral */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${ kpi.percentualDiario >= 100 ? 'bg-emerald-500' : kpi.percentualDiario >= 70 ? 'bg-amber-500' : 'bg-red-500' }`}
                  style={{ width: `${kpi.percentualDiario}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{kpi.percentualDiario}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}