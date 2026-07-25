// ─── Paletas de Cores Centralizadas ────────────────────────────────────────────
// Sprint 10 — single source of truth para todas as paletas de cores Tailwind
// Substitui os objetos "palettes", "colors", "pals" duplicados em 5+ componentes

/** Paleta completa para KPI cards (8 cores — usada no ResumoOperacao e Gestão) */
export const PALETA_KPI_CARD: Record<string, string> = {
  sky:     'bg-sky-50 text-sky-700 border-sky-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200',
  rose:    'bg-rose-50 text-rose-700 border-rose-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  red:     'bg-red-50 text-red-700 border-red-200',
}

/** Paleta simplificada (4 cores) — usada no dashboard principal (MetricaCard) */
export const PALETA_METRICA_SIMPLES: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
}

/** Paleta para blocos de alerta (PainelClientePipeline, Lembretes) */
export const PALETA_ALERTA_BLOCO: Record<string, string> = {
  red:    'border-red-200 bg-red-50/50',
  blue:   'border-blue-200 bg-blue-50/50',
  amber:  'border-amber-200 bg-amber-50/50',
  indigo: 'border-indigo-200 bg-indigo-50/50',
}

/** Texto de título para blocos de alerta */
export const PALETA_ALERTA_TITULO: Record<string, string> = {
  red:    'text-red-800',
  blue:   'text-blue-800',
  amber:  'text-amber-800',
  indigo: 'text-indigo-800',
}