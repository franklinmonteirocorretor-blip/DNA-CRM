// DNA CRM — RC1: Skeleton genérico para qualquer seção de página
// Usado em loading.tsx de cada rota do dashboard

interface SectionSkeletonProps {
  title?: string
  rows?: number
  cards?: number
}

export default function SectionSkeleton({ title, rows = 5, cards = 4 }: SectionSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse p-4">
      {/* Cabeçalho */}
      <div className="space-y-2">
        {title && <div className="h-7 w-56 bg-gray-200 dark:bg-gray-600 rounded" />}
        <div className="h-4 w-96 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>

      {/* Tabela / conteúdo principal */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-600 rounded" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  )
}