import { cliente360 } from './actions'
import { notFound } from 'next/navigation'
import Cliente360Cabecalho from '@/src/components/clients/Cliente360Cabecalho'
import Cliente360Timeline from '@/src/components/clients/Cliente360Timeline'
import Cliente360Pipeline from '@/src/components/clients/Cliente360Pipeline'
import Cliente360Financeiro from '@/src/components/clients/Cliente360Financeiro'
import Cliente360PainelGerencial from '@/src/components/clients/Cliente360PainelGerencial'
import Cliente360Comunicacao from '@/src/components/clients/Cliente360Comunicacao'

// Reaproveitamento de componentes Sprint 1-7
import FormEdicaoCliente from '@/src/components/clients/FormEdicaoCliente'
import FormAtividade from '@/src/components/clients/FormAtividade'
import FormAgendamento from '@/src/components/clients/FormAgendamento'
import SecaoDocumentos from '@/src/components/clients/SecaoDocumentos'
import SecaoComparecimento from '@/src/components/clients/SecaoComparecimento'
import FormAnalise from '@/src/components/clients/FormAnalise'
import FormFechamento from '@/src/components/clients/FormFechamento'
import FormPosVenda from '@/src/components/clients/FormPosVenda'
import ChecklistDocumentos from '@/src/components/documentos/ChecklistDocumentos'
import { ETAPA_LABEL_SINGULAR } from '@/src/config/pipeline'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CentralClientePage({ params }: Props) {
  const { id } = await params
  const data = await cliente360(id)

  if (!data) {
    notFound()
  }

  const { cliente, conjuge, corretorNome, empreendimentoNome, timeline, pipeline, documentos, financeiro, analiseFinanceira, painelGerencial, diasSemContato, diasNaEtapa } = data

  const docsAtivos = documentos ?? []

  const cpfFormatado = cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  const telFormatado = cliente.telefone.length === 11
    ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 7)}-${cliente.telefone.slice(7)}`
    : `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 6)}-${cliente.telefone.slice(6)}`
  const rendaFormatada = cliente.renda != null
    ? `R$ ${cliente.renda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'
  const fgtsFormatado = `R$ ${cliente.saldo_fgts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const criadoEm = new Date(cliente.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const ultimaAtividade = new Date(cliente.ultima_atividade_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const tiposPresentes = docsAtivos.map(d => d.tipo)
  const temIdentidade = tiposPresentes.includes('RG') || tiposPresentes.includes('CNH')
  const pastaCompleta = temIdentidade && tiposPresentes.includes('CPF') && tiposPresentes.includes('COMPROVANTE_RENDA')

  const vgvFormatado = cliente.vgv != null
    ? `R$ ${cliente.vgv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

  return (
    <div className="space-y-6">
      {/* ═══ SEÇÃO 1: Cabeçalho ═══ */}
      <Cliente360Cabecalho
        cliente={cliente}
        corretorNome={corretorNome}
        empreendimentoNome={empreendimentoNome}
        cpfFormatado={cpfFormatado}
        telFormatado={telFormatado}
        rendaFormatada={rendaFormatada}
        fgtsFormatado={fgtsFormatado}
        diasSemContato={diasSemContato}
        diasNaEtapa={diasNaEtapa}
        etapaAtualLabel={ETAPA_LABEL_SINGULAR[cliente.etapa_atual] ?? cliente.etapa_atual}
      />

      {/* ═══ SEÇÃO 2: Timeline completa ═══ */}
      <Cliente360Timeline timeline={timeline} />

      {/* ═══ SEÇÃO 3: Pipeline visual ═══ */}
      <Cliente360Pipeline pipeline={pipeline} />

      {/* ═══ SEÇÃO 4: Agenda (comparecimentos reaproveitado) ═══ */}
      <SecaoComparecimento
        clienteId={cliente.id}
        agendamentos={data.agendamentos.map(a => ({
          agendamento: { id: a.id, data_hora: a.dataHora, status: a.status as string } as unknown as import('@/src/types').Agendamento,
          comparecimento: a.comparecimentoResultado ? { resultado: a.comparecimentoResultado } as unknown as import('@/src/types').Comparecimento : null,
        }))}
      />

      {/* ═══ SEÇÃO 5: Documentos (Checklist + SecaoDocumentos reaproveitados) ═══ */}
      <ChecklistDocumentos clienteId={cliente.id} />
      <SecaoDocumentos clienteId={cliente.id} documentos={docsAtivos} pastaCompleta={pastaCompleta} />

      {/* ═══ SEÇÃO 6: Financeiro ═══ */}
      <Cliente360Financeiro financeiro={financeiro} vgvFormatado={vgvFormatado} />

      {/* ═══ SEÇÃO 7: Análise Financeira (reaproveitado) ═══ */}
      <FormAnalise clienteId={cliente.id} resultadoAtual={cliente.resultado_analise} />

      {/* Renda e informações da análise financeira */}
      {analiseFinanceira.renda && (
        <div className="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Detalhes da Análise</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CardAnalise label="Renda" value={rendaFormatada} />
            <CardAnalise label="Dependentes" value={`${analiseFinanceira.dependentes}`} />
            <CardAnalise label="Tempo CLT" value={analiseFinanceira.tempoCltMeses ? `${analiseFinanceira.tempoCltMeses} meses` : '—'} />
            <CardAnalise label="Resultado" value={analiseFinanceira.resultado ?? '—'} destaque={analiseFinanceira.resultado === 'APROVADO' ? 'text-emerald-600 font-bold' : analiseFinanceira.resultado === 'RESTRICAO' ? 'text-red-500 font-bold' : undefined} />
          </div>
          {analiseFinanceira.restricoes && (
            <p className="mt-2 text-xs text-red-500">{analiseFinanceira.restricoes}</p>
          )}
        </div>
      )}

      {/* ═══ SEÇÃO 8: Comunicação rápida ═══ */}
      <Cliente360Comunicacao cliente={cliente} />

      {/* ═══ SEÇÃO 9: Ações rápidas (reaproveitados) ═══ */}
      <FormEdicaoCliente
        cliente={cliente}
        conjuge={conjuge ?? null}
        cpfFormatado={cpfFormatado}
        telFormatado={telFormatado}
        rendaFormatada={rendaFormatada}
        fgtsFormatado={fgtsFormatado}
        criadoEm={criadoEm}
        ultimaAtividade={ultimaAtividade}
        diasSemContato={diasSemContato}
        pastaCompleta={pastaCompleta}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormAtividade clienteId={cliente.id} />
        <FormAgendamento clienteId={cliente.id} />
      </div>

      {/* Fechamento e Pós-venda (condicionais, reaproveitados) */}
      <FormFechamento
        clienteId={cliente.id}
        fichaPropostaAssinada={cliente.ficha_proposta_assinada}
        etapaAtual={cliente.etapa_atual}
        resultadoAnalise={cliente.resultado_analise}
      />
      <FormPosVenda
        clienteId={cliente.id}
        etapaAtual={cliente.etapa_atual}
        imovelEntregueEm={cliente.imovel_entregue_em}
        proximaAcao={cliente.proxima_acao}
        proximaAcaoEm={cliente.proxima_acao_em}
      />

      {/* ═══ SEÇÃO 10: Painel Gerencial ═══ */}
      <Cliente360PainelGerencial painel={painelGerencial} />
    </div>
  )
}

function CardAnalise({ label, value, destaque }: { label: string; value: string; destaque?: string }) {
  return (
    <div className="rounded-md bg-gray-50 dark:bg-gray-700 p-3">
      <span className="text-[11px] font-medium uppercase text-gray-400 dark:text-gray-500">{label}</span>
      <p className={`mt-1 text-sm font-semibold ${destaque ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}