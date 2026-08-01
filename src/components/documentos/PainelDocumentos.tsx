import { PainelDocumentos as PainelDocumentosType } from '@/src/types'
import Link from 'next/link'
import KpiCard from '@/src/components/ui/KpiCard'

function formatarTempo(h: number): string {
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)} dias`
}

export default function PainelDocumentos({ dados }: { dados: PainelDocumentosType }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <KpiCard label="Clientes" value={dados.totalClientes} color="sky" />
        <KpiCard label="Completo" value={dados.clientesCompleto} color="emerald" />
        <KpiCard label="Pendentes" value={dados.clientesPendentes} color="amber" />
        <KpiCard label="Rejeitados" value={dados.documentosRejeitados} color="red" />
        <KpiCard label="Tempo médio" value={formatarTempo(dados.tempoMedioConferenciaHoras)} color="violet" />
      </div>

      {/* Lista de clientes */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <th className="pb-3">Cliente</th>
              <th className="pb-3">Corretor</th>
              <th className="pb-3">Etapa</th>
              <th className="pb-3 text-right">Aprovados</th>
              <th className="pb-3 text-right">Pendentes</th>
              <th className="pb-3 text-right">Rejeitados</th>
              <th className="pb-3">Checklist</th>
              <th className="pb-3">Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {dados.clientesResumo.map((c) => (
              <tr key={c.clienteId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <td className="py-2">
                  <Link href={`/dashboard/clientes/${c.clienteId}`} className="font-medium text-blue-600 hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{c.corretorNome}</td>
                <td className="py-2 text-gray-500 dark:text-gray-400 text-xs">{c.etapaAtual}</td>
                <td className="py-2 text-right tabular-nums text-emerald-600 font-semibold">{c.docsAprovados}</td>
                <td className="py-2 text-right tabular-nums text-amber-600">{c.docsPendentes}</td>
                <td className="py-2 text-right tabular-nums text-red-500">{c.docsRejeitados}</td>
                <td className="py-2">
                  {c.checklistCompleto ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">✓ Completo</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pendente</span>
                  )}
                </td>
                <td className="py-2 text-xs text-gray-400 dark:text-gray-500">
                  {c.ultimaAtualizacao ? new Date(c.ultimaAtualizacao).toLocaleDateString('pt-BR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dados.clientesResumo.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum cliente em etapas que exigem documentação.</p>
        </div>
      )}
    </div>
  )
}