// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Widget de Métricas: KPIs de WhatsApp (conversas abertas, enviadas, recebidas,
// tempo médio, templates usados).

import type { WhatsAppMetricas } from '@/src/types/whatsapp'

interface MetricasProps {
  metricas: WhatsAppMetricas
}

export function WidgetMetricas({ metricas }: MetricasProps) {
  const cards = [
    { label: 'Conversas Abertas', value: metricas.conversasAbertas, cor: 'bg-blue-100 text-blue-800' },
    { label: 'Conversas Hoje', value: metricas.conversasHoje, cor: 'bg-green-100 text-green-800' },
    { label: 'Enviadas Hoje', value: metricas.mensagensEnviadasHoje, cor: 'bg-purple-100 text-purple-800' },
    { label: 'Recebidas Hoje', value: metricas.mensagensRecebidasHoje, cor: 'bg-amber-100 text-amber-800' },
  ]

  const totalStatus = metricas.conversasPorStatus.aberta +
    metricas.conversasPorStatus.finalizada +
    metricas.conversasPorStatus.arquivada || 1

  return (
    <div className="flex flex-col">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Métricas</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg p-3 ${c.cor}`}>
            <p className="text-xs font-medium opacity-80">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Templates mais usados */}
      {metricas.templatesMaisUsados.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Templates mais usados</p>
          <div className="space-y-1">
            {metricas.templatesMaisUsados.map(t => (
              <div key={t.nome} className="flex justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300">{t.nome}</span>
                <span className="font-medium text-gray-500 dark:text-gray-400">{t.contagem}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status das conversas */}
      <div className="border-t px-4 py-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status das Conversas</p>
        <div className="space-y-1 text-xs">
          <StatusBar
            label="Abertas"
            value={metricas.conversasPorStatus.aberta}
            max={totalStatus}
            cor="bg-blue-500"
          />
          <StatusBar
            label="Finalizadas"
            value={metricas.conversasPorStatus.finalizada}
            max={totalStatus}
            cor="bg-green-500"
          />
          <StatusBar
            label="Arquivadas"
            value={metricas.conversasPorStatus.arquivada}
            max={totalStatus}
            cor="bg-yellow-500"
          />
        </div>
      </div>
    </div>
  )
}

function StatusBar({ label, value, max, cor }: { label: string; value: number; max: number; cor: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}