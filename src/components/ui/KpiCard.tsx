// ─── KpiCard v2.0 — SaaS Premium (Fase 3) ──────────────────────────────────
// Referências: Vercel, Linear, Stripe.
// Menor densidade. Delta percentual. Loading state. Dark mode nativo.
// API backward-compatível — mesmas props, mesmo comportamento.

export type KpiCardColor = 'sky' | 'amber' | 'emerald' | 'teal' | 'cyan' | 'rose' | 'violet' | 'indigo' | 'red' | 'blue' | 'green' | 'purple' | 'orange'

export interface KpiCardProps {
  label: string
  value: string | number
  /** Cor do card. Ignorada visualmente (usamos semântica), mantida por compat. */
  color?: KpiCardColor
  /** Tamanho do valor: 'sm' (text-lg), 'md' (text-2xl), 'lg' (text-3xl). Default 'sm' */
  size?: 'sm' | 'md' | 'lg'
  /** Padding: 'compact' (p-2.5) ou 'normal' (p-3). Default 'compact' */
  padding?: 'compact' | 'normal'
  /** Classe extra no container */
  className?: string
  /** Delta: string opcional. Ex: "+12%", "-3%". Renderiza ▲ ou ▼. */
  delta?: string
  /** Se delta é positivo (verde) ou negativo (vermelho) */
  deltaPositive?: boolean
  /** Classe de highlight no valor (ex: 'text-red-600') */
  highlightClass?: string
  /** Ícone opcional (ReactNode, ex: lucide-react) */
  icon?: React.ReactNode
  /** Se true, mostra skeleton pulsando */
  loading?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cn(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(' ')
}

export default function KpiCard({
  label,
  value,
  color: _color,
  size = 'sm',
  padding = 'compact',
  className,
  delta,
  deltaPositive = true,
  highlightClass,
  icon,
  loading = false,
}: KpiCardProps) {
  const sizeClass = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size]

  const actualPadding = padding === 'compact' ? 'p-2.5' : 'p-3.5'
  const actualLabel = padding === 'compact' ? 'text-[10px]' : 'text-[11px]'
  const displayValue = typeof value === 'number' ? value.toLocaleString('pt-BR') : value

  // Skeleton
  if (loading) {
    return (
      <div
        role="status"
        aria-label={`Carregando ${label}`}
        aria-busy="true"
        className={`rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${actualPadding} ${className ?? ''}`}
      >
        <div className="h-3 w-14 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="mt-1.5 h-6 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    )
  }

  return (
    <div
      role="metric"
      aria-label={`${label}: ${displayValue}`}
      className={cn(
      `group rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${actualPadding}`,
      'transition-all duration-150 ease-out hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm',
      className,
    )}>
      {/* Label + Ícone */}
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
        <p className={cn(actualLabel, 'font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate')}>
          {label}
        </p>
      </div>

      {/* Valor + Delta */}
      <div className={`flex items-baseline gap-1.5 ${icon ? 'mt-0.5' : 'mt-1'}`}>
        <p className={cn('font-semibold tabular-nums text-gray-900 dark:text-gray-100', sizeClass, highlightClass ?? '')}>
          {displayValue}
        </p>

        {delta && (
          <span className={cn(
            'text-[11px] font-medium tabular-nums',
            deltaPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500 dark:text-red-400',
          )}>
            {deltaPositive ? '▲' : '▼'} {delta}
          </span>
        )}
      </div>
    </div>
  )
}