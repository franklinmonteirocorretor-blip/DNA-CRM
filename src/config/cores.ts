// ─── Paletas de Cores Centralizadas v2.0 ──────────────────────────────────────
// Design System unificado — baseado em tokens CSS semânticos.
// Referencias: Linear, Vercel, Stripe, Clerk, GitHub, Raycast.
// Cores anteriormente: sky, amber, emerald, teal, cyan, rose, violet, indigo → agora 4 semânticas.

/** 
 * Paleta semântica para KPI cards (4 variantes máximas).
 * Usa tokens do design system: accent, success, warning, danger, info.
 * Compatível com o KpiCard existente — mapeia cores antigas para semânticas.
 */
export const PALETA_KPI_CARD: Record<string, string> = {
  // ── Semânticas (novas) ──
  accent:   'border-sky-200/40 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
  success:  'border-emerald-200/40 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
  warning:  'border-amber-200/40 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
  danger:   'border-red-200/40 bg-red-50 dark:bg-red-950/40 dark:border-red-800/40 text-red-700 dark:text-red-300',
  // ── Retro-compatibilidade (cores antigas mapeadas) ──
  sky:      'border-sky-200/40 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
  blue:     'border-sky-200/40 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
  green:    'border-emerald-200/40 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
  emerald:  'border-emerald-200/40 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
  amber:    'border-amber-200/40 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
  red:      'border-red-200/40 bg-red-50 dark:bg-red-950/40 dark:border-red-800/40 text-red-700 dark:text-red-300',
  rose:     'border-red-200/40 bg-red-50 dark:bg-red-950/40 dark:border-red-800/40 text-red-700 dark:text-red-300',
  teal:     'border-sky-200/40 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
  cyan:     'border-sky-200/40 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
  violet:   'border-violet-200/40 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-800/40 text-violet-700 dark:text-violet-300',
  indigo:   'border-violet-200/40 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-800/40 text-violet-700 dark:text-violet-300',
  purple:   'border-violet-200/40 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-800/40 text-violet-700 dark:text-violet-300',
  orange:   'border-amber-200/40 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
}

/**
 * Paleta simplificada — alias backward-compatível para PALETA_KPI_CARD.
 * O Dashboard principal passava 'blue', 'green', 'purple', 'orange'.
 */
export const PALETA_METRICA_SIMPLES = PALETA_KPI_CARD

/**
 * Paleta para blocos de alerta (PainelClientePipeline, Lembretes, SecaoAlertas).
 * Backward-compatível: ainda aceita red, blue, amber, indigo.
 */
export const PALETA_ALERTA_BLOCO: Record<string, string> = {
  red:    'border-red-200/40 bg-red-50/60 dark:bg-red-950/30 dark:border-red-800/40',
  blue:   'border-sky-200/40 bg-sky-50/60 dark:bg-sky-950/30 dark:border-sky-800/40',
  amber:  'border-amber-200/40 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-800/40',
  indigo: 'border-violet-200/40 bg-violet-50/60 dark:bg-violet-950/30 dark:border-violet-800/40',
  purple: 'border-violet-200/40 bg-violet-50/60 dark:bg-violet-950/30 dark:border-violet-800/40',
  orange: 'border-amber-200/40 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-800/40',
}

/** Texto de título para blocos de alerta */
export const PALETA_ALERTA_TITULO: Record<string, string> = {
  red:    'text-red-800 dark:text-red-300',
  blue:   'text-sky-800 dark:text-sky-300',
  amber:  'text-amber-800 dark:text-amber-300',
  indigo: 'text-violet-800 dark:text-violet-300',
  purple: 'text-violet-800 dark:text-violet-300',
  orange: 'text-amber-800 dark:text-amber-300',
}