// ─── LoadingIndicator v1 — estado de carregamento ──────────────────────
// Substitui 7 divs inline com animate-pulse + texto "Carregando...".

type LoadingSize = 'sm' | 'md'

interface LoadingIndicatorProps {
  text?: string
  size?: LoadingSize
  className?: string
}

const sizeClasses: Record<LoadingSize, string> = {
  sm: 'text-xs py-8',
  md: 'text-sm py-12',
}

export function LoadingIndicator({ text = 'Carregando...', size = 'md', className = '' }: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className={`text-center animate-pulse text-gray-400 dark:text-gray-500 ${sizeClasses[size]} ${className}`.trim()}
    >
      <div className="inline-flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {text}
      </div>
    </div>
  )
}