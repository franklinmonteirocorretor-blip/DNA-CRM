import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Cliente, Conjuge, Atividade, Documento, Agendamento, Comparecimento, TipoAtividade } from '@/src/types'
import { notFound } from 'next/navigation'
import FormEdicaoCliente from '@/src/components/clients/FormEdicaoCliente'
import FormAtividade from '@/src/components/clients/FormAtividade'
import FormAgendamento from '@/src/components/clients/FormAgendamento'
import SecaoDocumentos from '@/src/components/clients/SecaoDocumentos'
import SecaoComparecimento from '@/src/components/clients/SecaoComparecimento'
import FormAnalise from '@/src/components/clients/FormAnalise'
import FormFechamento from '@/src/components/clients/FormFechamento'
import FormPosVenda from '@/src/components/clients/FormPosVenda'

// Labels e ícones dos tipos de atividade (usados na seção de últimas atividades)
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
    (new Date().getTime() - new Date(cliente.ultima_atividade_em).getTime()) / 86400000
  )

  return (
    <div className="space-y-6">
      {/* SPRINT 1 — Feature 01: Bloco editável de dados do cliente */}
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