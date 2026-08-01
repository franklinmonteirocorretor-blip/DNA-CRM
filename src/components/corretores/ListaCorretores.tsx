import { CorretorGestao } from '@/src/types'
import Link from 'next/link'
import { formatarMoeda } from '@/src/lib/formatters'

function StatusBadge({ status }: { status: string }) {
  const mapa: Record<string, { cor: string; label: string }> = {
    ATIVO: { cor: 'bg-emerald-100 text-emerald-700', label: 'Ativo' },
    FERIAS: { cor: 'bg-amber-100 text-amber-700', label: 'Férias' },
    AFASTADO: { cor: 'bg-red-100 text-red-700', label: 'Afastado' },
    DESLIGADO: { cor: 'bg-gray-100 text-gray-500', label: 'Desligado' },
  }
  const info = mapa[status] ?? { cor: 'bg-gray-100 text-gray-500', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${info.cor}`}>
      {info.label}
    </span>
  )
}

export default function ListaCorretores({ corretores }: { corretores: CorretorGestao[] }) {
  if (corretores.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum corretor encontrado.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <th className="pb-3">Corretor</th>
            <th className="pb-3">Equipe</th>
            <th className="pb-3">Status</th>
            <th className="pb-3 text-right">Meta D.</th>
            <th className="pb-3 text-right">Meta M.</th>
            <th className="pb-3 text-right">Vendas</th>
            <th className="pb-3 text-right">VGV</th>
            <th className="pb-3 text-right">Conv.</th>
            <th className="pb-3 text-right">Clientes</th>
          </tr>
        </thead>
        <tbody>
          {corretores.map((c) => (
            <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <td className="py-3">
                <Link href={`/dashboard/corretores/${c.id}`} className="flex items-center gap-2 hover:text-blue-600 transition">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{c.email}</p>
                  </div>
                </Link>
              </td>
              <td className="py-3 text-gray-500 dark:text-gray-400">{c.equipeNome ?? '—'}</td>
              <td className="py-3"><StatusBadge status={c.status_usuario} /></td>
              <td className="py-3 text-right">
                <span className={`font-semibold ${c.metaDiaria >= 100 ? 'text-emerald-600' : c.metaDiaria >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {c.metaDiaria}%
                </span>
              </td>
              <td className="py-3 text-right">
                <span className={`font-semibold ${c.metaMensal >= 100 ? 'text-emerald-600' : c.metaMensal >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {c.metaMensal}%
                </span>
              </td>
              <td className="py-3 text-right tabular-nums font-semibold text-teal-600">
                {c.kpisMensais.vendas}
              </td>
              <td className="py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                {formatarMoeda(c.kpisMensais.vgv)}
              </td>
              <td className="py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {c.kpisMensais.conversao}%
              </td>
              <td className="py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {c.clientesAtivos}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}