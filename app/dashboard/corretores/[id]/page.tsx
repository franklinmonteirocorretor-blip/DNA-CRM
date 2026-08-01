import { perfilCorretor } from '../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import KpiCard from '@/src/components/ui/KpiCard'

export const dynamic = 'force-dynamic'

import { formatarMoeda } from '@/src/lib/formatters'

export default async function PerfilCorretorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dados = await perfilCorretor(id)

  if (!dados) {
    notFound()
  }

  const u = dados.usuario

  return (
    <div className="space-y-8">
      {/* Cabeçalho do perfil */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            {u.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{u.nome}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{u.cargo ?? u.perfil}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              {u.creci && <span>CRECI: {u.creci}</span>}
              {dados.equipeNome && <span>· {dados.equipeNome}</span>}
              {dados.supervisorNome && <span>· Supervisor: {dados.supervisorNome}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/corretores/${id}/editar`}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Editar
          </Link>
          <Link
            href="/dashboard/corretores"
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Cards de KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <KpiCard label="Ranking" value={`#${dados.ranking.posicao} · ${dados.ranking.pontuacao} pts`} color="amber" />
        <KpiCard label="Vendas Mês" value={dados.producaoMensal[dados.producaoMensal.length - 1]?.vendas.toString() ?? '0'} color="teal" />
        <KpiCard label="VGV Mês" value={formatarMoeda(dados.producaoMensal[dados.producaoMensal.length - 1]?.vgv ?? 0)} color="cyan" />
        <KpiCard label="Comissão" value={formatarMoeda(dados.producaoMensal[dados.producaoMensal.length - 1]?.comissao ?? 0)} color="rose" />
        <KpiCard label="Clientes" value={dados.clientes.length.toString()} color="blue" />
        <KpiCard label="Agend. Futuros" value={dados.proximosAgendamentos.length.toString()} color="violet" />
      </div>

      {/* Dados pessoais */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Informações Pessoais</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <InfoItem label="E-mail" value={u.email} />
          <InfoItem label="Telefone" value={u.telefone ?? '—'} />
          <InfoItem label="CPF" value={u.cpf ?? '—'} />
          <InfoItem label="CRECI" value={u.creci ?? '—'} />
          <InfoItem label="Admissão" value={u.data_admissao ? new Date(u.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
          <InfoItem label="Status" value={u.status_usuario} />
          <InfoItem label="Equipe" value={dados.equipeNome ?? '—'} />
          <InfoItem label="Supervisor" value={dados.supervisorNome ?? '—'} />
        </div>
      </section>

      {/* Clientes */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Clientes</h2>
        {dados.clientes.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Nenhum cliente atribuído.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dados.clientes.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/clientes/${c.id}`}
                className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.nome}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{c.etapa}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Próximos agendamentos */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Próximos Agendamentos</h2>
        {dados.proximosAgendamentos.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Nenhum agendamento futuro.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dados.proximosAgendamentos.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-600 p-3 text-sm">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{a.clienteNome}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(a.dataHora).toLocaleString('pt-BR')}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ a.status === 'CONFIRMADO' ? 'bg-emerald-100 text-emerald-700' : a.status === 'REMARCADO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700' }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Produção mensal (tabela simplificada) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Produção Mensal</h2>
        {dados.producaoMensal.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Nenhum dado de produção.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  <th className="pb-2">Mês</th>
                  <th className="pb-2 text-right">Vendas</th>
                  <th className="pb-2 text-right">VGV</th>
                  <th className="pb-2 text-right">Comissão</th>
                  <th className="pb-2 text-right">Aprovações</th>
                  <th className="pb-2 text-right font-bold">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {dados.producaoMensal.map((m) => {
                  const [ano, mes] = m.mes.split('-')
                  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                  return (
                    <tr key={m.mes} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{meses[Number(mes) - 1]} {ano}</td>
                      <td className="py-2 text-right tabular-nums text-teal-600">{m.vendas}</td>
                      <td className="py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatarMoeda(m.vgv)}</td>
                      <td className="py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatarMoeda(m.comissao)}</td>
                      <td className="py-2 text-right tabular-nums text-indigo-600">{m.aprovacoes}</td>
                      <td className="py-2 text-right tabular-nums font-bold text-blue-600">{m.pontuacao.toLocaleString('pt-BR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 dark:bg-gray-700 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{value}</p>
    </div>
  )
}