// ─── Configuração centralizada do Pipeline ────────────────────────────────────
// Sprint 10 — single source of truth para labels, cores e ordem do funil
// Substitui ETAPA_LABELS duplicadas em 8+ arquivos

import type { EtapaFunil } from '@/src/types'

/** Label padrão de cada etapa (singular, descritivo) — usado em cards, painéis, detalhes */
export const ETAPA_LABEL_SINGULAR: Record<EtapaFunil, string> = {
  NOVO_LEAD:       'Novo Contato',
  CONTATOS:        'Contato Realizado',
  AGENDAMENTO:     'Visita Agendada',
  COMPARECIMENTO:  'Visita',
  ANALISE:         'Análise',
  RESTRICOES:      'Restrições',
  CONDICIONADOS:   'Condicionado',
  APROVADOS:       'Aprovado',
  FECHAMENTOS:     'Documentação/Contrato',
  POS_VENDA:       'Pós-venda',
}

/** Label no plural para dropdowns e listagens (ex: "Novo Lead", "Contatos") */
export const ETAPA_LABEL_PLURAL: Record<EtapaFunil, string> = {
  NOVO_LEAD:       'Novo Lead',
  CONTATOS:        'Contatos',
  AGENDAMENTO:     'Agendamento',
  COMPARECIMENTO:  'Comparecimento',
  ANALISE:         'Análise',
  RESTRICOES:      'Restrições',
  CONDICIONADOS:   'Condicionados',
  APROVADOS:       'Aprovados',
  FECHAMENTOS:     'Fechamentos',
  POS_VENDA:       'Pós-Venda',
}

/** Ordem canônica do funil (usada em todas as iterações e gráficos) */
export const ETAPA_ORDEM: EtapaFunil[] = [
  'NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO',
  'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS',
  'FECHAMENTOS', 'POS_VENDA',
]

/** Próximas etapas válidas para cada etapa (regra de avanço no pipeline) */
export const PROXIMAS_ETAPAS: Record<EtapaFunil, EtapaFunil[]> = {
  NOVO_LEAD:       ['CONTATOS'],
  CONTATOS:        ['AGENDAMENTO'],
  AGENDAMENTO:     ['COMPARECIMENTO'],
  COMPARECIMENTO:  ['ANALISE'],
  ANALISE:         ['RESTRICOES', 'CONDICIONADOS', 'APROVADOS'],
  RESTRICOES:      ['CONTATOS', 'ANALISE'],
  CONDICIONADOS:   ['APROVADOS', 'RESTRICOES'],
  APROVADOS:       ['AGENDAMENTO', 'FECHAMENTOS'],
  FECHAMENTOS:     ['POS_VENDA'],
  POS_VENDA:       [],
}

/** Aliases para backward-compat — código existente que usa arrays de objetos */
export const ETAPA_OPTIONS_DROPDOWN = ETAPA_ORDEM.map((v) => ({
  valor: v,
  rotulo: ETAPA_LABEL_PLURAL[v],
}))

/** Configuração completa de cada etapa (label + cor + ícone + descrição) */
export interface PipelineEtapaFullConfig {
  label: string
  cor: string
  corBg: string
  icone: string
  desc: string
}

export const ETAPA_FULL_CONFIG: Record<EtapaFunil, PipelineEtapaFullConfig> = {
  NOVO_LEAD:       { label: 'Novo Lead',      cor: '#6b7280', corBg: '#f3f4f6', icone: '🆕', desc: 'Leads recém-captados, sem contato ainda.' },
  CONTATOS:        { label: 'Contatos',        cor: '#eab308', corBg: '#fef9c3', icone: '📞', desc: 'Primeiro contato realizado com sucesso.' },
  AGENDAMENTO:     { label: 'Agendamento',     cor: '#3b82f6', corBg: '#dbeafe', icone: '📅', desc: 'Visita ao empreendimento agendada.' },
  COMPARECIMENTO:  { label: 'Comparecimento',  cor: '#8b5cf6', corBg: '#ede9fe', icone: '🏠', desc: 'Cliente compareceu à visita.' },
  ANALISE:         { label: 'Análise',         cor: '#f97316', corBg: '#ffedd5', icone: '🔍', desc: 'Análise financeira em andamento.' },
  RESTRICOES:      { label: 'Restrições',      cor: '#ef4444', corBg: '#fee2e2', icone: '🚫', desc: 'Restrições encontradas na análise.' },
  CONDICIONADOS:   { label: 'Condicionados',   cor: '#ec4899', corBg: '#fce7f3', icone: '⏳', desc: 'Aguardando aprovação condicional.' },
  APROVADOS:       { label: 'Aprovados',       cor: '#14b8a6', corBg: '#ccfbf1', icone: '✅', desc: 'Crédito aprovado pelo banco.' },
  FECHAMENTOS:     { label: 'Fechamentos',     cor: '#22c55e', corBg: '#dcfce7', icone: '📝', desc: 'Documentação e contrato em andamento.' },
  POS_VENDA:       { label: 'Pós-Venda',       cor: '#6366f1', corBg: '#e0e7ff', icone: '🤝', desc: 'Cliente fechado. Pós-venda e fidelização.' },
}

/** Cores de badge Tailwind por etapa (usado em listagens como clientes/page.tsx) */
export const ETAPA_BADGE_COLORS: Record<EtapaFunil, string> = {
  NOVO_LEAD:       'bg-gray-100 text-gray-700',
  CONTATOS:        'bg-yellow-100 text-yellow-700',
  AGENDAMENTO:     'bg-blue-100 text-blue-700',
  COMPARECIMENTO:  'bg-purple-100 text-purple-700',
  ANALISE:         'bg-orange-100 text-orange-700',
  RESTRICOES:      'bg-red-100 text-red-700',
  CONDICIONADOS:   'bg-pink-100 text-pink-700',
  APROVADOS:       'bg-teal-100 text-teal-700',
  FECHAMENTOS:     'bg-green-100 text-green-700',
  POS_VENDA:       'bg-indigo-100 text-indigo-700',
}