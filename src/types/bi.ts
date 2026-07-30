// DNA CRM — Sprint 14: BI Executivo — Types

import type { EtapaFunil } from './index'

// ─── SEÇÃO 1: Resumo Executivo ─────────────────────────────────────────────────
export interface BIResumoExecutivo {
  vgvMes: number
  comissaoPrevista: number
  comissaoRecebida: number
  clientesAtivos: number
  conversaoGeral: number // % leads→fechamentos
  ticketMedio: number
  tempoMedioFechamentoDias: number
  metaMes: number
  percentualMeta: number
}

// ─── SEÇÃO 2: Funil Executivo ───────────────────────────────────────────────────
export interface BIFunilEtapa {
  etapa: string
  label: string
  ordem: number
  quantidade: number
  conversao: number | null // % que avançou para próxima etapa
  perda: number // saiu do funil nesta etapa
  tempoMedioDias: number
  vgv: number
  comissaoPrevista: number
}

// ─── SEÇÃO 3: Ranking Inteligente ───────────────────────────────────────────────
export interface BIRankingItem {
  usuarioId: string
  nome: string
  avatarUrl: string | null
  pontuacaoGeral: number
  rankingGeral: number
  rankingVgv: number
  vgv: number
  rankingComissao: number
  comissao: number
  rankingConversao: number
  conversao: number
  rankingAgendamentos: number
  agendamentos: number
  rankingFollowUp: number
  followUps: number
  rankingDocumentos: number
  docsAprovados: number
  rankingVelocidade: number
  tempoMedioDias: number
}

// ─── SEÇÃO 4: Empreendimentos ────────────────────────────────────────────────────
export interface BIEmpreendimento {
  id: string
  nome: string
  clientes: number
  vgv: number
  conversao: number
  tempoMedioDias: number
  comissao: number
  ticketMedio: number
  ranking: number
}

// ─── SEÇÃO 5: Previsões ──────────────────────────────────────────────────────────
export interface BIPrevisao {
  vgvEsperado: number
  comissaoEsperada: number
  fechamentosEsperados: number
  clientesAltaProbabilidade: BIClientePrevisao[]
  clientesRisco: BIClientePrevisao[]
  metaProvavel: BIHorizonteMeta[]
}

export interface BIClientePrevisao {
  clienteId: string
  nome: string
  etapa: string
  etapaLabel: string
  vgv: number | null
  probabilidade: number
  diasNaEtapa: number
  corretor: string
}

export interface BIHorizonteMeta {
  cenario: string
  vendasNecessarias: number
  ticketMedioNecessario: number
  probabilidade: number
}

// ─── SEÇÃO 6: Gargalos ───────────────────────────────────────────────────────────
export interface BIGargalos {
  etapasCongestionadas: BIGargaloItem[]
  corretoresAbaixoMedia: BIGargaloItem[]
  empreendimentosBaixaConversao: BIGargaloItem[]
  clientesParados: BIGargaloItem[]
  documentacaoTravada: BIGargaloItem[]
  agendamentosPerdidos: BIGargaloItem[]
  followUpsAtrasados: BIGargaloItem[]
}

export interface BIGargaloItem {
  severidade: 'baixa' | 'media' | 'alta' | 'critica'
  titulo: string
  descricao: string
  entidade: string
  entidadeId: string
  valor: number
  referencia: number | null
  tendencia: 'subindo' | 'estavel' | 'caindo' | null
}

// ─── SEÇÃO 7: Alertas Estratégicos ───────────────────────────────────────────────
export interface BIAlerta {
  id: string
  tipo: 'meta' | 'conversao' | 'gargalo' | 'tendencia' | 'oportunidade'
  mensagem: string
  severidade: 'info' | 'warning' | 'critical'
  dados: Record<string, unknown>
  link: string
  entidadeId: string
}

// ─── SEÇÃO 8: Metas ──────────────────────────────────────────────────────────────
export interface BIMetas {
  diaria: BIMetaPadrao
  semanal: BIMetaPadrao
  mensal: BIMetaPadrao
  anual: BIMetaPadrao
}

export interface BIMetaPadrao {
  meta: number
  realizado: number
  previsto: number
  desvio: number
  projecao: number
}

// ─── SEÇÃO 9: Linha do Tempo ─────────────────────────────────────────────────────
export interface BITimelineEvento {
  data: string
  tipo: 'FECHAMENTO' | 'ENTRADA' | 'APROVACAO' | 'DOCUMENTO' | 'COMISSAO' | 'ATIVIDADE' | 'AGENDAMENTO'
  titulo: string
  descricao: string
  valor: number | null
  usuarioNome: string
  entidadeId: string
  entidade: string
}

// ─── SEÇÃO 10: Insights ──────────────────────────────────────────────────────────
export interface BIInsight {
  id: string
  categoria: 'tendencia' | 'oportunidade' | 'alerta' | 'padrao' | 'comparativo'
  titulo: string
  descricao: string
  dados: string
  confianza: number // 0-100
  acaoSugerida: string | null
}

// ─── Agregado principal ──────────────────────────────────────────────────────────
export interface BIDadosCompletos {
  resumo: BIResumoExecutivo
  funil: BIFunilEtapa[]
  ranking: BIRankingItem[]
  empreendimentos: BIEmpreendimento[]
  previsões: BIPrevisao
  gargalos: BIGargalos
  alertas: BIAlerta[]
  metas: BIMetas
  timeline: BITimelineEvento[]
  insights: BIInsight[]
  atualizadoEm: string
}