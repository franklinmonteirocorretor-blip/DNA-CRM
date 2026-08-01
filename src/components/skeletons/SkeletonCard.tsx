// DNA CRM — RC1: Skeleton para card genérico

export default function SkeletonCard() {
  return (
    <div className="animate-pulse border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-600 rounded" />
      <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
    </div>
  )
}