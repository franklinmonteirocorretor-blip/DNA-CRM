// React — RC1: Skeleton para Kanban board

export default function SkeletonKanban({ columns = 4 }: { columns?: number }) {
  return (
    <div className="animate-pulse flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, c) => (
        <div key={c} className="min-w-[240px] space-y-3 flex-shrink-0">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}