import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Cliente, Conjuge, Atividade, Documento, Agendamento, Comparecimento, EtapaFunil, TipoAtividade } from '@/src/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import FormAtividade from '@/src/components/clients/FormAtividade'
import FormAgendamento from '@/src/components/clients/FormAgendamento'
import SecaoDocumentos from '@/src/components/clients/SecaoDocumentos'
import SecaoComparecimento from '@/src/components/clients/SecaoComparecimento'
import FormAnalise from '@/src/components/clients/FormAnalise'
import FormFechamento from '@/src/components/clients/FormFechamento'
import FormPosVenda from '@/src/components/clients/FormPosVenda'

// Labels das etapas do funil em português
const ETAPA_LABEL: Record<EtapaFunil, string> = {
  NOVO_LEAD: 'Novo Lead',
  CONTATOS: 'Contatos',
  AGENDAMENTO: 'Agendamento',
  COMPARECIMENTO: 'Comparecimento',
  ANALISE: 'Análise',
  RESTRICOES: 'Restrições',
  CONDICIONADOS: 'Condicionados',
  APROVADOS: 'Aprovados',
  FECHAMENTOS: 'Fechamentos',
  POS_VENDA: 'Pós-Venda',
}

// Cores dos badges por etapa
const ETAPA_COR: Record<EtapaFunil, string> = {
  NOVO_LEAD: 'bg-gray-100 text-gray-700',
  CONTATOS: 'bg-yellow-100 text-yellow-700',
  AGENDAMENTO: 'bg-blue-100 text-blue-700',
  COMPARECIMENTO: 'bg-purple-100 text-purple-700',
  ANALISE: 'bg-orange-100 text-orange-700',
  RESTRICOES: 'bg-red-100 text-red-700',
  CONDICIONADOS: 'bg-pink-100 text-pink-700',
  APROVADOS: 'bg-teal-100 text-teal-700',
  FECHAMENTOS: 'bg-green-100 text-green-700',
  POS_VENDA: 'bg-indigo-100 text-indigo-700',
}

// Labels e ícones dos tipos de atividade
const ATIVIDADE_LABEL: Record<TipoAtividade, { label: string; icone: string }> = {
  LIGACAO: { label: 'Ligação', icone: '📞' },
  WHATSAPP: { label: 'WhatsApp', icone: '💬' },
  FOLLOW_UP: { label: 'Follow-up', icone: '🔄' },
}

// Props da página dinâmica — Next.js injeta { params } com o id da URL
interface Props {
  params: Promise<{ id: string }>
}

export default async function FichaClientePage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  // 1. Busca o cliente — RLS garante que só o dono/gerente/admin vê
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single<Cliente>()

  if (error || !cliente) {
    notFound()
  }

  // 2. Busca o cônjuge (se o cliente for casado)
  const { data: conjuge } = await supabase
    .from('conjuges')
    .select('*')
    .eq('cliente_id', id)
    .single<Conjuge>()

  // 3. Busca as últimas 5 atividades
  const { data: atividades } = await supabase
    .from('atividades')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<Atividade[]>()

  // 4. Busca todos os documentos do cliente
  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .eq('cliente_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<Documento[]>()

  const docsAtivos = documentos ?? []

  // Verifica se a pasta está completa (RG ou CNH + CPF + Comprovante de Renda)
  const tiposPresentes = docsAtivos.map((d) => d.tipo)
  const temIdentidade = tiposPresentes.includes('RG') || tiposPresentes.includes('CNH')
  const pastaCompleta = temIdentidade && tiposPresentes.includes('CPF') && tiposPresentes.includes('COMPROVANTE_RENDA')

  // 5. Busca agendamentos do cliente (últimos 10) + seus comparecimentos
  const { data: agendamentosRaw } = await supabase
    .from('agendamentos')
    .select('*, comparecimentos(*)')
    .eq('cliente_id', id)
    .order('data_hora', { ascending: false })
    .limit(10)
    .returns<
      (Agendamento & { comparecimentos: Comparecimento[] })[]
    >()

  const agendamentosComComparecimento = (agendamentosRaw ?? []).map((a) => ({
    agendamento: a as Agendamento,
    comparecimento: a.comparecimentos?.[0] ?? null,
  }))

  // Formata CPF: 12345678901 → 123.456.789-01
  const cpfFormatado = cliente.cpf.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    '$1.$2.$3-$4'
  )

  // Formata telefone
  const telFormatado = cliente.telefone.length === 11
    ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 7)}-${cliente.telefone.slice(7)}`
    : `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 6)}-${cliente.telefone.slice(6)}`

  // Formata renda: 3500.50 → R$ 3.500,50
  const rendaFormatada = cliente.renda != null
    ? `R$ ${cliente.renda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

  // Formata FGTS
  const fgtsFormatado = `R$ ${cliente.saldo_fgts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Datas
  const criadoEm = new Date(cliente.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const ultimaAtividade = new Date(cliente.ultima_atividade_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const diasSemContato = Math.floor(
    (Date.now() - new Date(cliente.ultima_atividade_em).getTime()) / 86400000
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{cliente.nome}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ETAPA_COR[cliente.etapa_atual]}`}>
              {ETAPA_LABEL[cliente.etapa_atual]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Cliente desde {criadoEm} · Última atividade: {ultimaAtividade}
            {diasSemContato >= 3 && (
              <span className="ml-2 text-orange-500 font-medium">
                ({diasSemContato}d sem contato)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/clientes"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          ← Voltar
        </Link>
      </div>

      {/* Grid de 2 colunas: Dados principais + Conjuge e complementares */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coluna Esquerda — Dados pessoais e financeiros */}
        <div className="space-y-6">
          {/* Card: Dados pessoais */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Dados pessoais
            </h2>
            <dl className="mt-3 space-y-3">
              <InfoItem label="CPF" value={cpfFormatado} />
              <InfoItem label="Telefone" value={telFormatado} />
              {cliente.email && <InfoItem label="E-mail" value={cliente.email} />}
              <InfoItem label="Dependentes" value={String(cliente.dependentes)} />
            </dl>
          </div>

          {/* Card: Informações financeiras */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Informações financeiras
            </h2>
            <dl className="mt-3 space-y-3">
              <InfoItem label="Renda mensal" value={rendaFormatada} />
              <InfoItem label="Saldo FGTS" value={fgtsFormatado} />
              {cliente.tempo_clt_meses != null && (
                <InfoItem label="Tempo CLT" value={`${cliente.tempo_clt_meses} meses`} />
              )}
            </dl>
          </div>

          {/* Card: Observações */}
          {cliente.observacoes && (
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Observações
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {cliente.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita — Cônjuge + Status do funil */}
        <div className="space-y-6">
          {/* Card: Cônjuge */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Cônjuge
            </h2>
            {cliente.eh_casado && conjuge ? (
              <dl className="mt-3 space-y-3">
                <InfoItem label="Nome" value={conjuge.nome || 'Não informado'} />
                {conjuge.cpf && (
                  <InfoItem
                    label="CPF"
                    value={conjuge.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                  />
                )}
                {conjuge.renda != null && (
                  <InfoItem
                    label="Renda mensal"
                    value={`R$ ${conjuge.renda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                )}
                <InfoItem
                  label="Saldo FGTS"
                  value={`R$ ${conjuge.saldo_fgts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                {conjuge.tempo_clt_meses != null && (
                  <InfoItem label="Tempo CLT" value={`${conjuge.tempo_clt_meses} meses`} />
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-gray-400">Cliente não é casado.</p>
            )}
          </div>

          {/* Card: Status no funil */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Status no funil
            </h2>
            <dl className="mt-3 space-y-3">
              <InfoItem label="Etapa atual" value={ETAPA_LABEL[cliente.etapa_atual]} />
              {cliente.empreendimento_interesse && (
                <InfoItem label="Empreendimento" value={cliente.empreendimento_interesse} />
              )}
              {cliente.resultado_analise && (
                <InfoItem label="Resultado análise" value={cliente.resultado_analise} />
              )}
              {cliente.data_fechamento && (
                <InfoItem
                  label="Data fechamento"
                  value={new Date(cliente.data_fechamento).toLocaleDateString('pt-BR')}
                />
              )}
              {cliente.ficha_proposta_assinada && (
                <InfoItem label="Ficha proposta" value="Assinada ✅" />
              )}
              {cliente.pasta_completa_em && (
                <InfoItem
                  label="Pasta completa"
                  value={`${new Date(cliente.pasta_completa_em).toLocaleDateString('pt-BR')} 📁`}
                />
              )}
              {cliente.proxima_acao && (
                <InfoItem label="Próxima ação" value={cliente.proxima_acao} />
              )}
              {cliente.proxima_acao_em && (
                <InfoItem
                  label="Prazo próxima ação"
                  value={new Date(cliente.proxima_acao_em).toLocaleDateString('pt-BR')}
                />
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Seção: Comparecimentos (agendamentos e resultados) */}
      <SecaoComparecimento
        clienteId={cliente.id}
        agendamentos={agendamentosComComparecimento}
      />

      {/* Seção: Análise de Crédito */}
      <FormAnalise
        clienteId={cliente.id}
        resultadoAtual={cliente.resultado_analise}
      />

      {/* Seção: Fechamento (só aparece se aprovado) */}
      <FormFechamento
        clienteId={cliente.id}
        fichaPropostaAssinada={cliente.ficha_proposta_assinada}
        etapaAtual={cliente.etapa_atual}
        resultadoAnalise={cliente.resultado_analise}
      />

      {/* Seção: Pós-Venda (só aparece se fechado) */}
      <FormPosVenda
        clienteId={cliente.id}
        etapaAtual={cliente.etapa_atual}
        imovelEntregueEm={cliente.imovel_entregue_em}
        proximaAcao={cliente.proxima_acao}
        proximaAcaoEm={cliente.proxima_acao_em}
      />

      {/* Seção: Registrar atividade */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormAtividade clienteId={cliente.id} />
        <FormAgendamento clienteId={cliente.id} />
      </div>

      {/* Seção: Documentos */}
      <SecaoDocumentos
        clienteId={cliente.id}
        documentos={docsAtivos}
        pastaCompleta={pastaCompleta}
      />

      {/* Seção: Últimas atividades */}
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Últimas atividades
        </h2>
        {atividades && atividades.length > 0 ? (
          <div className="mt-3 divide-y divide-gray-100">
            {atividades.map((ativ) => (
              <div key={ativ.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                {/* Ícone do tipo */}
                <span className="mt-0.5 text-base">
                  {ATIVIDADE_LABEL[ativ.tipo].icone}
                </span>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {ATIVIDADE_LABEL[ativ.tipo].label}
                    {ativ.resultado && (
                      <span className="ml-1 font-normal text-gray-500">
                        — {ativ.resultado}
                      </span>
                    )}
                  </p>
                  {ativ.observacao && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {ativ.observacao}
                    </p>
                  )}
                </div>

                {/* Data */}
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(ativ.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">
            Nenhuma atividade registrada ainda.
          </p>
        )}
      </div>
    </div>
  )
}

// Micro-componente para pares label → valor nos cards
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900 text-right">{value}</dd>
    </div>
  )
}