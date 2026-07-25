import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Cliente, EtapaFunil } from '@/src/types'
import Link from 'next/link'
import BarraBuscaFiltros from '@/src/components/clients/BarraBuscaFiltros'
import { ETAPA_LABEL_PLURAL, ETAPA_ORDEM, ETAPA_BADGE_COLORS } from '@/src/config/pipeline'

// Valida se uma string é um EtapaFunil válido
const ETAPAS_VALIDAS = new Set<string>(ETAPA_ORDEM)

function isEtapaValida(valor: string): valor is EtapaFunil {
  return ETAPAS_VALIDAS.has(valor)
}

interface Props {
  searchParams: Promise<{ q?: string; etapa?: string; ordem?: string; empreendimento?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams
  const termoBusca = params.q?.trim() ?? ''
  const etapaFiltro = params.etapa ?? ''
  const ordem = params.ordem ?? 'recentes'
  const empreendimentoFiltro = params.empreendimento ?? ''

  const temFiltro = Boolean(termoBusca || etapaFiltro || empreendimentoFiltro)

  const supabase = await createSupabaseServerClient()

  // Constrói a query base
  let query = supabase.from('clientes').select('*')

  // Filtro por etapa (dropdown)
  if (etapaFiltro && isEtapaValida(etapaFiltro)) {
    query = query.eq('etapa_atual', etapaFiltro)
  }

  // Filtro por empreendimento (dropdown)
  if (empreendimentoFiltro) {
    query = query.eq('empreendimento_id', empreendimentoFiltro)
  }

  // Filtro por busca (nome ou CPF)
  if (termoBusca) {
    // Remove caracteres não numéricos para busca de CPF
    const cpfLimpo = termoBusca.replace(/\D/g, '')
    if (cpfLimpo.length >= 3) {
      // Busca por nome (case insensitive) OU CPF
      query = query.or(`nome.ilike.%${termoBusca}%,cpf.ilike.%${cpfLimpo}%`)
    } else {
      // Só busca por nome
      query = query.ilike('nome', `%${termoBusca}%`)
    }
  }

  // Ordenação
  switch (ordem) {
    case 'antigos':
      query = query.order('created_at', { ascending: true })
      break
    case 'nome':
      query = query.order('nome', { ascending: true })
      break
    case 'atividade':
      query = query.order('ultima_atividade_em', { ascending: false })
      break
    default: // 'recentes'
      query = query.order('updated_at', { ascending: false })
  }

  const { data: clientes, error } = await query.returns<Cliente[]>()

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-semibold">Erro ao carregar clientes</h2>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  const clientesFiltrados = clientes ?? []

  // Agrupa clientes por etapa do funil (para visualização sem filtro)
  const clientesPorEtapa = ETAPA_ORDEM.reduce(
    (acc, etapa) => {
      const naEtapa = clientesFiltrados.filter((c) => c.etapa_atual === etapa)
      acc[etapa] = naEtapa
      return acc
    },
    {} as Record<EtapaFunil, Cliente[]>
  )

  const totalClientes = clientesFiltrados.length

  return (
    <div className="space-y-6">
      {/* Cabeçalho com título e botão */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {temFiltro
              ? `${totalClientes} cliente${totalClientes !== 1 ? 's' : ''} encontrado${totalClientes !== 1 ? 's' : ''}`
              : `${totalClientes} cliente${totalClientes !== 1 ? 's' : ''} no seu funil`
            }
          </p>
        </div>
        <Link
          href="/dashboard/clientes/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          + Novo Cliente
        </Link>
      </div>

      {/* Barra de busca e filtros */}
      <BarraBuscaFiltros />

      {/* Se não tem nenhum cliente cadastrado (sem filtro) */}
      {!temFiltro && totalClientes === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-500">
            Você ainda não tem clientes cadastrados.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Clique em &quot;+ Novo Cliente&quot; para adicionar seu primeiro lead.
          </p>
        </div>
      )}

      {/* Se tem filtro mas nenhum resultado */}
      {temFiltro && totalClientes === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-500">
            Nenhum cliente encontrado.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Tente ajustar os filtros ou limpar a busca.
          </p>
        </div>
      )}

      {/* Visualização com filtro ativo: lista plana */}
      {temFiltro && totalClientes > 0 && (
        <div className="rounded-lg bg-white shadow-sm">
          {clientesFiltrados.map((cliente) => (
            <ClienteCardLinha key={cliente.id} cliente={cliente} />
          ))}
        </div>
      )}

      {/* Visualização sem filtro: agrupado por etapa (colunas do funil) */}
      {!temFiltro && totalClientes > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ETAPA_ORDEM.map((etapa) => {
            const clientesNaEtapa = clientesPorEtapa[etapa]

            // Etapas vazias: esconde colunas inteiras quando não há clientes nelas
            if (clientesNaEtapa.length === 0) return null

            return (
              <div key={etapa} className="min-w-0 rounded-lg bg-white p-4 shadow-sm">
                {/* Cabeçalho da coluna: badge da etapa + contagem */}
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ETAPA_BADGE_COLORS[etapa]}`}>
                    {ETAPA_LABEL_PLURAL[etapa]}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">
                    {clientesNaEtapa.length}
                  </span>
                </div>

                {/* Cards de cliente dentro da coluna */}
                <div className="space-y-2">
                  {clientesNaEtapa.map((cliente) => (
                    <ClienteCard key={cliente.id} cliente={cliente} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Card individual de cliente — renderiza nome, telefone e informações rápidas
function ClienteCard({ cliente }: { cliente: Cliente }) {
  // Formata telefone no padrão (XX) XXXXX-XXXX
  const telefoneFormatado = cliente.telefone.length === 11
    ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 7)}-${cliente.telefone.slice(7)}`
    : cliente.telefone.length === 10
      ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 6)}-${cliente.telefone.slice(6)}`
      : cliente.telefone

  // Calcula dias desde a última atividade
  const diasSemContato = Math.floor(
    (new Date().getTime() - new Date(cliente.ultima_atividade_em).getTime()) / 86400000
  )

  // Alerta se está parado há ≥ 5 dias (exceto etapas finais)
  const etapasAtivas: EtapaFunil[] = ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO']
  const precisaAcao = etapasAtivas.includes(cliente.etapa_atual) && diasSemContato >= 5

  return (
    <Link
      href={`/dashboard/clientes/${cliente.id}`}
      className={`block rounded-lg border p-3 transition hover:shadow-md ${
        precisaAcao ? 'border-orange-300 bg-orange-50 hover:border-orange-400' : 'border-gray-100 bg-gray-50 hover:border-gray-300'
      }`}
    >
      {/* Nome */}
      <p className="text-sm font-semibold text-gray-900 truncate">{cliente.nome}</p>

      {/* Telefone */}
      <p className="mt-0.5 text-xs text-gray-500">{telefoneFormatado}</p>

      {/* Indicadores extras */}
      <div className="mt-2 flex flex-wrap gap-1">
        {/* Empreendimento de interesse */}
        {cliente.empreendimento_interesse && (
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm">
            {cliente.empreendimento_interesse.slice(0, 20)}
            {cliente.empreendimento_interesse.length > 20 ? '…' : ''}
          </span>
        )}

        {/* Casado */}
        {cliente.eh_casado && (
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-medium text-purple-600">
            Casado
          </span>
        )}

        {/* Pasta completa */}
        {cliente.pasta_completa_em && (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-600">
            📁 Pasta OK
          </span>
        )}

        {/* Alerta: sem contato há X dias */}
        {precisaAcao && (
          <span className="rounded bg-orange-200 px-1.5 py-0.5 text-xs font-medium text-orange-700">
            ⚠ {diasSemContato}d sem contato
          </span>
        )}
      </div>
    </Link>
  )
}

// Card de cliente em linha horizontal (usado na visualização com filtro)
function ClienteCardLinha({ cliente }: { cliente: Cliente }) {
  const telefoneFormatado = cliente.telefone.length === 11
    ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 7)}-${cliente.telefone.slice(7)}`
    : cliente.telefone.length === 10
      ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 6)}-${cliente.telefone.slice(6)}`
      : cliente.telefone

return (
    <Link
      href={`/dashboard/clientes/${cliente.id}`}
      className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 transition hover:bg-gray-50 last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-gray-900 truncate">
          {cliente.nome}
        </span>
        <span className="text-xs text-gray-400">{telefoneFormatado}</span>
        {cliente.empreendimento_interesse && (
          <span className="hidden sm:inline text-xs text-gray-500">
            &middot; {cliente.empreendimento_interesse.slice(0, 25)}
            {cliente.empreendimento_interesse.length > 25 ? '…' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {cliente.pasta_completa_em && (
          <span className="text-[11px] text-green-600 font-medium">📁</span>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ETAPA_BADGE_COLORS[cliente.etapa_atual]}`}>
          {ETAPA_LABEL_PLURAL[cliente.etapa_atual]}
        </span>
      </div>
    </Link>
  )
}