import { PainelDocumentos as PainelDocumentosType } from '@/src/types'
import Link from 'next/link'

function formatarTempo(h: number): string {
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)} dias`
}

export default function PainelDocumentos({ dados }: { dados: PainelDocumentosType }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <KpiCard label="Clientes" value={dados.totalClientes} cor="sky" />
        <KpiCard label="Completo" value={dados.clientesCompleto} cor="emerald" />
        <KpiCard label="Pendentes" value={dados.clientesPendentes} cor="amber" />
        <KpiCard label="Rejeitados" value={dados.documentosRejeitados} cor="red" />
        <KpiCard label="Tempo médio" value={formatarTempo(dados.tempoMedioConferenciaHoras)} cor="violet" />
      </div>

      {/* Lista de clientes */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
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
              <tr key={c.clienteId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="py-2">
                  <Link href={`/dashboard/clientes/${c.clienteId}`} className="font-medium text-blue-600 hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="py-2 text-gray-500">{c.corretorNome}</td>
                <td className="py-2 text-gray-500 text-xs">{c.etapaAtual}</td>
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
                <td className="py-2 text-xs text-gray-400">
                  {c.ultimaAtualizacao ? new Date(c.ultimaAtualizacao).toLocaleDateString('pt-BR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dados.clientesResumo.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-400">Nenhum cliente em etapas que exigem documentação.</p>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, cor }: { label: string; value: string | number; cor: string }) {
  const pals: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-700 border-sky-200', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200', red: 'bg-red-50 text-red-700 border-red-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return (
    <div className={`rounded-lg border p-3 ${pals[cor]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
    </div>
  )
}