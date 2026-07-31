// ─── KPI Card para Operação (Sprint 14) ─────────────────────────────────────
// Versão compacta e colorida usada nos dashboards operacionais.
// Integrado com dark mode via Tailwind `dark:` classes.

import { formatarMoeda } from '@/src/lib/formatters'

interface KpiOperacaoCardProps {
  label: string
  value: number
  color: 'sky' | 'violet' | 'amber' | 'emerald' | 'indigo' | 'teal' | 'cyan' | 'rose' | 'blue' | 'green' | 'orange' | 'purple'
  monetario?: boolean
  className?: string
}

const PALETA: Record<string, string> = {
  sky:     'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  violet:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  amber:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
  teal:    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
  rose:    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  blue:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  green:   'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  orange:  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  red:     'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
}

export default function KpiOperacaoCard({ label, value, color, monetario, className = '' }: KpiOperacaoCardProps) {
  return (
    <div className={`rounded-lg border p-3 transition-colors ${PALETA[color] ?? PALETA.sky} ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">
        {monetario ? formatarMoeda(value) : value.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}