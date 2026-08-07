import { GestaoAlertas } from '@/src/types'
import Link from 'next/link'
import { SectionHeader } from '@/src/components/ui/SectionHeader'

function PainelAlerta({
  titulo,
  cor,
  icone,
  itens,
  vazio,
  renderItem,
}: {
  titulo: string
  cor: 'red' | 'amber' | 'blue' | 'purple'
  icone: string
  itens: unknown[]
  vazio: string
  renderItem: (item: unknown, idx: number) => React.ReactNode
}) {
  const palettes = {
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
  }

  const badges = {
    red: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    amber: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
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
          {itens.map((item, idx) => renderItem(item, idx))}
        </ul>
      )}
    </div>
  )
}

export default function AlertasGestao({ dados }: { dados: GestaoAlertas }) {
  return (
    <section>
      <SectionHeader title="Alertas" />
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <PainelAlerta
          titulo="Sem contato +3 dias"
          cor="red"
          icone="📞"
          itens={dados.clientesSemContato3dias}
          vazio="Todos os clientes foram contatados recentemente."
          renderItem={(item) => {
            const i = item as GestaoAlertas['clientesSemContato3dias'][0]
            return (
              <li key={i.clienteId} className="text-xs">
                <Link href={`/dashboard/clientes/${i.clienteId}`} className="text-gray-700 dark:text-gray-300 hover:text-red-600 transition">
                  {i.nome}
                </Link>
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  {i.diasSemContato}d · {i.corretorNome} · {i.etapa}
                </span>
              </li>
            )
          }}
        />

        <PainelAlerta
          titulo="Agendamentos perdidos"
          cor="amber"
          icone="⚠️"
          itens={dados.agendamentosPerdidos}
          vazio="Nenhum agendamento perdido."
          renderItem={(item) => {
            const i = item as GestaoAlertas['agendamentosPerdidos'][0]
            const data = new Date(i.dataHora).toLocaleDateString('pt-BR')
            return (
              <li key={i.agendamentoId} className="text-xs">
                <span className="text-gray-700 dark:text-gray-300">{i.clienteNome}</span>
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  {data} · {i.corretorNome} · Cancelado
                </span>
              </li>
            )
          }}
        />

        <PainelAlerta
          titulo="Pendências documentais"
          cor="blue"
          icone="📄"
          itens={dados.pendenciasDocumentais}
          vazio="Nenhum documento pendente."
          renderItem={(item) => {
            const i = item as GestaoAlertas['pendenciasDocumentais'][0]
            return (
              <li key={i.clienteId} className="text-xs">
                <Link href={`/dashboard/clientes/${i.clienteId}`} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition">
                  {i.clienteNome}
                </Link>
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  {i.qtdDocumentosPendentes} doc(s) · {i.etapa}
                </span>
              </li>
            )
          }}
        />

        <PainelAlerta
          titulo="Parados no funil +7d"
          cor="purple"
          icone="⏸️"
          itens={dados.clientesParadosFunil}
          vazio="Nenhum cliente parado no funil."
          renderItem={(item) => {
            const i = item as GestaoAlertas['clientesParadosFunil'][0]
            return (
              <li key={i.clienteId} className="text-xs">
                <Link href={`/dashboard/clientes/${i.clienteId}`} className="text-gray-700 dark:text-gray-300 hover:text-purple-600 transition">
                  {i.nome}
                </Link>
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  {i.diasNaEtapa}d · {i.etapa} · {i.corretorNome}
                </span>
              </li>
            )
          }}
        />
      </div>

      {/* Aguardando retorno (linha extra) */}
      {dados.aguardandoRetorno.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">
              <span className="mr-1.5">📅</span>
              Aguardando retorno
            </h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {dados.aguardandoRetorno.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {dados.aguardandoRetorno.map((i) => (
              <li key={i.clienteId} className="text-xs">
                <Link href={`/dashboard/clientes/${i.clienteId}`} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 transition">
                  {i.nome}
                </Link>
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  {i.proximaAcao} · {i.corretorNome}
                </span>
                <span className="ml-2 text-amber-500">
                  {new Date(i.proximaAcaoEm).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}