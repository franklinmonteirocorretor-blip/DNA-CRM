import { GestaoResumoOperacao } from '@/src/types'
import KpiCard from '@/src/components/ui/KpiCard'
import { SectionHeader } from '@/src/components/ui/SectionHeader'
import { formatarMoeda } from '@/src/lib/formatters'



export default function ResumoOperacao({ dados }: { dados: GestaoResumoOperacao }) {
  return (
    <section>
      <SectionHeader title="Resumo da Operação" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <KpiCard label="Leads Ativos" value={dados.leadsAtivos.toLocaleString('pt-BR')} color="sky" size="md" padding="normal" />
        <KpiCard label="Em Atendimento" value={dados.clientesAtendimento.toLocaleString('pt-BR')} color="violet" size="md" padding="normal" />
        <KpiCard label="Agend. Hoje" value={dados.agendamentosHoje.toLocaleString('pt-BR')} color="amber" size="md" padding="normal" />
        <KpiCard label="Comparec. Hoje" value={dados.comparecimentosHoje.toLocaleString('pt-BR')} color="emerald" size="md" padding="normal" />
        <KpiCard label="Aprovações Mês" value={dados.aprovacoesMes.toLocaleString('pt-BR')} color="indigo" size="md" padding="normal" />
        <KpiCard label="Vendas Mês" value={dados.vendasMes.toLocaleString('pt-BR')} color="teal" size="md" padding="normal" />
        <KpiCard label="VGV Mês" value={formatarMoeda(dados.vgvMes)} color="cyan" size="md" padding="normal" />
        <KpiCard label="Comissão Prev." value={formatarMoeda(dados.comissaoPrevista)} color="rose" size="md" padding="normal" />
      </div>
    </section>
  )
}