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
  NOVO_LEAD:       { label: 'Novo Lead',      cor: '#6B7280', corBg: '#F9FAFB', icone: '🆕', desc: 'Leads recém-captados, sem contato ainda.' },
  CONTATOS:        { label: 'Contatos',        cor: '#D97706', corBg: '#FFFBEB', icone: '📞', desc: 'Primeiro contato realizado com sucesso.' },
  AGENDAMENTO:     { label: 'Agendamento',     cor: '#2563EB', corBg: '#EFF6FF', icone: '📅', desc: 'Visita ao empreendimento agendada.' },
  COMPARECIMENTO:  { label: 'Comparecimento',  cor: '#7C3AED', corBg: '#F5F3FF', icone: '🏠', desc: 'Cliente compareceu à visita.' },
  ANALISE:         { label: 'Análise',         cor: '#F59E0B', corBg: '#FFFBEB', icone: '🔍', desc: 'Análise financeira em andamento.' },
  RESTRICOES:      { label: 'Restrições',      cor: '#DC2626', corBg: '#FEF2F2', icone: '🚫', desc: 'Restrições encontradas na análise.' },
  CONDICIONADOS:   { label: 'Condicionados',   cor: '#F59E0B', corBg: '#FFFBEB', icone: '⏳', desc: 'Aguardando aprovação condicional.' },
  APROVADOS:       { label: 'Aprovados',       cor: '#059669', corBg: '#ECFDF5', icone: '✅', desc: 'Crédito aprovado pelo banco.' },
  FECHAMENTOS:     { label: 'Fechamentos',     cor: '#059669', corBg: '#ECFDF5', icone: '📝', desc: 'Documentação e contrato em andamento.' },
  POS_VENDA:       { label: 'Pós-Venda',       cor: '#2563EB', corBg: '#EFF6FF', icone: '🤝', desc: 'Cliente fechado. Pós-venda e fidelização.' },
}

/** Cores de badge Tailwind por etapa (usado em listagens como clientes/page.tsx) */
export const ETAPA_BADGE_COLORS: Record<EtapaFunil, string> = {
  NOVO_LEAD:       'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  CONTATOS:        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  AGENDAMENTO:     'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  COMPARECIMENTO:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  ANALISE:         'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  RESTRICOES:      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  CONDICIONADOS:   'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  APROVADOS:       'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  FECHAMENTOS:     'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  POS_VENDA:       'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
}