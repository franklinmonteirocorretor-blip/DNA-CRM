// DNA CRM — RC1: Skeleton reutilizável para Dashboard principal
// Usado em: /app/dashboard/loading.tsx

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-100 rounded" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg" />
        ))}
      </div>

      {/* Tabela principal */}
      <div className="space-y-3">
        <div className="h-6 w-40 bg-gray-200 rounded" />
        <div className="border border-gray-100 rounded-lg p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded" />
          ))}
        </div>
      </div>

      {/* Seção secundária */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}