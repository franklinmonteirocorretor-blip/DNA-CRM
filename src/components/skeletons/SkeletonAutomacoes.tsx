// DNA CRM — RC1: Skeleton para tela de automações

export default function SkeletonAutomacoes() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-4 w-96 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>

      {/* Table 1 */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-600 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-50 dark:bg-gray-700 rounded" />
        ))}
      </div>

      {/* Table 2 */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-5 w-36 bg-gray-200 dark:bg-gray-600 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-50 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  )
}