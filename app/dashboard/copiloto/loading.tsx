export default function CopilotLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-600 border-t-indigo-600" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Preparando seu Copiloto IA...</span>
      </div>
    </div>
  )
}