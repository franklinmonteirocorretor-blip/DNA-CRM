// ─── Componente KpiCard Unificado ──────────────────────────────────────────────
// Sprint 10 — substitui 5+ variantes de Card/KpiCard/MetricaCard duplicadas
// Usa as paletas centralizadas de @/src/config/cores

import { PALETA_KPI_CARD, PALETA_METRICA_SIMPLES } from '@/src/config/cores'

export type KpiCardColor = 'sky' | 'amber' | 'emerald' | 'teal' | 'cyan' | 'rose' | 'violet' | 'indigo' | 'red' | 'blue' | 'green' | 'purple' | 'orange'

export interface KpiCardProps {
  label: string
  value: string | number
  /** Cor do card. 'blue'|'green'|'purple'|'orange' usam paleta simples, demais usam paleta completa */
  color?: KpiCardColor
  /** Tamanho do valor: 'sm' (text-lg), 'md' (text-2xl), 'lg' (text-3xl). Default 'sm' */
  size?: 'sm' | 'md' | 'lg'
  /** Padding: 'compact' (p-3) ou 'normal' (p-4). Default 'compact' */
  padding?: 'compact' | 'normal'
  /** Classe de destaque opcional para o valor (ex: 'text-red-600') */
  highlightClass?: string
  /** Classe extra para o container */
  className?: string
}

export default function KpiCard({
  label,
  value,
  color = 'sky',
  size = 'sm',
  padding = 'compact',
  highlightClass,
  className = '',
}: KpiCardProps) {
  const isSimplePalette = ['blue', 'green', 'purple', 'orange'].includes(color)
  const palette = isSimplePalette ? PALETA_METRICA_SIMPLES : PALETA_KPI_CARD
  const bgClass = palette[color] ?? 'bg-gray-50 text-gray-700 border-gray-200'

  const sizeClass = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size]

  const paddingClass = padding === 'compact' ? 'p-3' : 'p-4'
  const labelSize = padding === 'compact' ? 'text-[10px]' : 'text-xs'

  const displayValue =
    typeof value === 'number' ? value.toLocaleString('pt-BR') : value

  return (
    <div className={`rounded-lg border ${paddingClass} ${bgClass} ${className}`}>
      <p className={`${labelSize} font-medium uppercase tracking-wide opacity-70`}>
        {label}
      </p>
      <p className={`mt-0.5 font-bold ${sizeClass} ${highlightClass ?? ''}`}>
        {displayValue}
      </p>
    </div>
  )
}