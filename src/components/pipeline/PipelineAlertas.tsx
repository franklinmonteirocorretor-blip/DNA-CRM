import { PipelineAlertas as PipelineAlertasType } from '@/src/types'
import Link from 'next/link'
import { SectionHeader } from '@/src/components/ui/SectionHeader'

function AlertaBloco({
  titulo,
  icone,
  cor,
  itens,
  vazio,
}: {
  titulo: string
  icone: string
  cor: 'red' | 'amber' | 'blue' | 'purple' | 'orange' | 'teal'
  itens: PipelineAlertasType[keyof PipelineAlertasType]
  vazio: string
}) {
  const palettes = {
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50',
    teal: 'border-teal-200 bg-teal-50',
  }
  const badges = {
    red: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    amber: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    teal: 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
  }

  return (
    <div className={`rounded-lg border p-4 ${palettes[cor]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800">
          <span className="mr-1.5">{icone}</span>
          {titulo}
        </h3>
        {itens.length > 0 && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${badges[cor]}`}>
            {itens.length}
          </span>
        )}
      </div>
      {itens.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{vazio}</p>
      ) : (
        <ul className="space-y-1.5">
          {itens.slice(0, 10).map((item) => (
            <li key={item.id} className="text-xs">
              <Link href={`/dashboard/clientes/${item.id}`} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition">
                {item.nome}
              </Link>
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                {item.corretorNome} · {item.diasNaEtapa}d na etapa
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PipelineAlertas({ alertas }: { alertas: PipelineAlertasType }) {
  return (
    <section>
      <SectionHeader title="Alertas" />
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <AlertaBloco titulo="Sem contato +3 dias" icone="📞" cor="red" itens={alertas.semContato} vazio="Todos foram contatados recentemente." />
        <AlertaBloco titulo="Parados na etapa +7d" icone="⏸️" cor="amber" itens={alertas.paradosNaEtapa} vazio="Nenhum cliente parado." />
        <AlertaBloco titulo="Aguardando documentos" icone="📄" cor="purple" itens={alertas.aguardandoDocumentos} vazio="Nenhum cliente aguardando documentos." />
        <AlertaBloco titulo="Aguardando aprovação" icone="⏳" cor="orange" itens={alertas.aguardandoAprovacao} vazio="Nenhum cliente aguardando aprovação." />
        <AlertaBloco titulo="Sem próxima ação" icone="⚠️" cor="red" itens={alertas.semProximaAcao} vazio="Todos possuem próxima ação definida." />
        <AlertaBloco titulo="Com visita marcada" icone="📅" cor="teal" itens={alertas.comVisitaMarcada} vazio="Nenhuma visita marcada." />
      </div>
    </section>
  )
}