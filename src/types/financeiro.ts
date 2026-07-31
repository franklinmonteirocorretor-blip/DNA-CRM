// ─── Tipos Financeiro Comercial (Sprint 11) ───────────────────────────────────

/** Status de uma comissão */
export type ComissaoStatus = 'PREVISTA' | 'RECEBIDA' | 'CANCELADA'

/** Item da tabela de comissões */
export interface ComissaoItem {
  clienteId: string
  clienteNome: string
  empreendimentoNome: string | null
  corretorNome: string
  vgv: number
  percentual: number | null
  valor: number | null
  status: ComissaoStatus
  dataPrevista: string | null
  dataRecebimento: string | null
  dataFechamento: string | null
}

/** Filtros do financeiro */
export interface FinanceiroFiltros {
  corretorId: string | null
  empreendimentoId: string | null
  periodo: 'mes' | 'semana' | 'ano' | 'personalizado'
  dataInicio: string | null
  dataFim: string | null
  status: ComissaoStatus | 'TODOS' | null
}

/** Resumo financeiro */
export interface FinanceiroResumo {
  vgvMes: number
  comissaoPrevista: number
  comissaoRecebida: number
  comissaoPendente: number
  ticketMedio: number
  totalVendas: number
}

/** Produção financeira (gráfico mensal/semanal/anual) */
export interface FinanceiroProducao {
  periodo: string
  vgv: number
  comissoes: number
  vendas: number
}

/** Item do ranking financeiro */
export interface FinanceiroRankingItem {
  corretorId: string
  corretorNome: string
  vgv: number
  comissoes: number
  ticketMedio: number
  conversao: number
  vendas: number
}

/** Desempenho por empreendimento */
export interface FinanceiroEmpreendimento {
  empreendimentoId: string | null
  empreendimentoNome: string
  vgv: number
  comissoes: number
  clientes: number
  conversao: number
}

/** Previsão de comissões futuras */
export interface FinanceiroPrevisao {
  proximos7Dias: number
  proximos30Dias: number
  proximos90Dias: number
  detalhes: {
    clienteId: string
    clienteNome: string
    valor: number
    dataPrevista: string
  }[]
}

/** Dados completos do dashboard financeiro */
export interface FinanceiroDados {
  resumo: FinanceiroResumo
  comissoes: ComissaoItem[]
  producao: FinanceiroProducao[]
  ranking: FinanceiroRankingItem[]
  empreendimentos: FinanceiroEmpreendimento[]
  previsao: FinanceiroPrevisao
  corretores: { id: string; nome: string }[]
  empreendimentosList: { id: string; nome: string }[]
}