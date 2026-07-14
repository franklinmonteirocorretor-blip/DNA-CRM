import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { EtapaFunil } from '@/src/types'
import Link from 'next/link'

// Configuração visual de cada etapa
const ETAPA_CONFIG: Record<EtapaFunil, { label: string; cor: string; corBg: string; corTexto: string }> = {
  NOVO_LEAD:       { label: 'Novo Lead',      cor: '#6b7280', corBg: '#f3f4f6', corTexto: '#374151' },
  CONTATOS:        { label: 'Contatos',        cor: '#eab308', corBg: '#fef9c3', corTexto: '#854d0e' },
  AGENDAMENTO:     { label: 'Agendamento',     cor: '#3b82f6', corBg: '#dbeafe', corTexto: '#1e40af' },
  COMPARECIMENTO:  { label: 'Comparecimento',  cor: '#8b5cf6', corBg: '#ede9fe', corTexto: '#5b21b6' },
  ANALISE:         { label: 'Análise',         cor: '#f97316', corBg: '#ffedd5', corTexto: '#9a3412' },
  RESTRICOES:      { label: 'Restrições',      cor: '#ef4444', corBg: '#fee2e2', corTexto: '#991b1b' },
  CONDICIONADOS:   { label: 'Condicionados',   cor: '#ec4899', corBg: '#fce7f3', corTexto: '#9d174d' },
  APROVADOS:       { label: 'Aprovados',       cor: '#14b8a6', corBg: '#ccfbf1', corTexto: '#115e59' },
  FECHAMENTOS:     { label: 'Fechamentos',     cor: '#22c55e', corBg: '#dcfce7', corTexto: '#166534' },
  POS_VENDA:       { label: 'Pós-Venda',       cor: '#6366f1', corBg: '#e0e7ff', corTexto: '#3730a3' },
}

// Ordem do funil (topo → fundo)
const ORDEM_FUNIL: EtapaFunil[] = [
  'NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO',
  'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS',
  'FECHAMENTOS', 'POS_VENDA',
]

export default async function FunilPage() {
  const supabase = await createSupabaseServerClient()

  // Busca todos os clientes do usuário (RLS garante escopo)
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('etapa_atual')
    .order('updated_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-semibold">Erro ao carregar dados</h2>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  // Agrupa por etapa
  const total = clientes?.length ?? 0

  const contagem = ORDEM_FUNIL.reduce(
    (acc, etapa) => {
      acc[etapa] = (clientes ?? []).filter((c) => c.etapa_atual === etapa).length
      return acc
    },
    {} as Record<EtapaFunil, number>
  )

  // Encontra o maior valor para dimensionar as barras
  const maximo = Math.max(...Object.values(contagem), 1)

  // Calcula a taxa de conversão entre etapas consecutivas
  function taxaConversao(atual: number, anterior: number): string {
    if (anterior === 0) return '—'
    return `${((atual / anterior) * 100).toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funil de Vendas</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} cliente{total !== 1 ? 's' : ''} no funil
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Visual do funil */}
      {total === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-400">Nenhum cliente no funil ainda</p>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre leads em{' '}
            <Link href="/dashboard/clientes/novo" className="text-blue-600 hover:text-blue-500">
              + Novo Cliente
            </Link>{' '}
            para começar
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {ORDEM_FUNIL.map((etapa, index) => {
            const qtd = contagem[etapa]
            const config = ETAPA_CONFIG[etapa]
            const pct = total > 0 ? ((qtd / total) * 100).toFixed(1) : '0'
            const largura = (qtd / maximo) * 100 // % em relação ao maior

            // Taxa de conversão da etapa anterior para esta
            const anterior = index > 0 ? contagem[ORDEM_FUNIL[index - 1]] : qtd
            const conversao = taxaConversao(qtd, anterior)

            // Etapas sem clientes ficam em cinza claro
            const ativa = qtd > 0

            return (
              <div key={etapa} className="group">
                {/* Seta de conversão entre etapas */}
                {index > 0 && ativa && (
                  <div className="flex items-center gap-1 pb-1 pt-0.5">
                    <span className="text-[11px] text-gray-400 ml-2">
                      → Conversão: {conversao}
                    </span>
                  </div>
                )}

                {/* Barra da etapa */}
                <div
                  className="flex items-center gap-3"
                  style={{ opacity: ativa ? 1 : 0.45 }}
                >
                  {/* Label + badge */}
                  <div className="flex w-36 shrink-0 items-center gap-2">
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: config.corBg,
                        color: config.corTexto,
                      }}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Barra horizontal proporcional */}
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-8 rounded transition-all group-hover:brightness-110"
                      style={{
                        width: `${Math.max(largura, qtd > 0 ? 2 : 0)}%`,
                        backgroundColor: config.cor,
                        minWidth: qtd > 0 ? '4px' : '0px',
                      }}
                    />

                    {/* Número + porcentagem */}
                    <div className="shrink-0 flex items-center gap-1 min-w-[56px] text-right">
                      <span
                        className="text-sm font-bold"
                        style={{ color: config.cor }}
                      >
                        {qtd}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cards de resumo rápidos */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ResumoCard
          label="Topo do funil"
          valor={contagem.NOVO_LEAD + contagem.CONTATOS}
          cor="#6b7280"
        />
        <ResumoCard
          label="Em negociação"
          valor={contagem.AGENDAMENTO + contagem.COMPARECIMENTO + contagem.ANALISE}
          cor="#8b5cf6"
        />
        <ResumoCard
          label="Em análise"
          valor={contagem.RESTRICOES + contagem.CONDICIONADOS + contagem.APROVADOS}
          cor="#f97316"
        />
        <ResumoCard
          label="Convertidos"
          valor={contagem.FECHAMENTOS + contagem.POS_VENDA}
          cor="#22c55e"
        />
      </div>
    </div>
  )
}

function ResumoCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold" style={{ color: cor }}>
        {valor}
      </p>
    </div>
  )
}