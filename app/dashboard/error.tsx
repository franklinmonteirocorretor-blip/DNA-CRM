'use client'

// DNA CRM — RC1: Error Boundary base para todo /dashboard
// Next.js carrega automaticamente este componente quando uma rota filha falha.

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Algo deu errado</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error.message || 'Um erro inesperado ocorreu ao carregar esta página.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  )
}