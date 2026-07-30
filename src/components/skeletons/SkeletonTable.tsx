// DNA CRM — RC1: Skeleton para tabelas genéricas

export default function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${100 / cols}%` }} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-gray-100 rounded" style={{ width: `${100 / cols}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}