import { GestaoResumoOperacao } from '@/src/types'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CardMetrica({
  label,
  value,
  isCurrency = false,
  color,
}: {
  label: string
  value: number
  isCurrency?: boolean
  color: 'emerald' | 'sky' | 'violet' | 'rose' | 'amber' | 'indigo' | 'cyan' | 'teal'
}) {
  const palettes = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${palettes[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {isCurrency ? formatarMoeda(value) : value.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

export default function ResumoOperacao({ dados }: { dados: GestaoResumoOperacao }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">Resumo da Operação</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <CardMetrica label="Leads Ativos" value={dados.leadsAtivos} color="sky" />
        <CardMetrica label="Em Atendimento" value={dados.clientesAtendimento} color="violet" />
        <CardMetrica label="Agend. Hoje" value={dados.agendamentosHoje} color="amber" />
        <CardMetrica label="Comparec. Hoje" value={dados.comparecimentosHoje} color="emerald" />
        <CardMetrica label="Aprovações Mês" value={dados.aprovacoesMes} color="indigo" />
        <CardMetrica label="Vendas Mês" value={dados.vendasMes} color="teal" />
        <CardMetrica label="VGV Mês" value={dados.vgvMes} isCurrency color="cyan" />
        <CardMetrica label="Comissão Prev." value={dados.comissaoPrevista} isCurrency color="rose" />
      </div>
    </section>
  )
}