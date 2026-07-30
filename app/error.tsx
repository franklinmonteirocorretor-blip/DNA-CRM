'use client'

// DNA CRM — RC1: Error Boundary raiz
// Cobre rotas fora do /dashboard (ex: /login, /test-supabase)

import { useEffect } from 'react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Root Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">Erro inesperado</h1>
        <p className="text-sm text-gray-500">
          {error.message || 'Ocorreu um erro ao carregar a aplicação.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}